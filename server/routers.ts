import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createPodcastTask, updatePodcastTask, getUserPodcastTasks, getPodcastTask } from "./db";
import { isValidYoutubeUrl, processYoutubeToPodcast } from "./youtubeService";
import { generateChinesePodcast } from "./listenHubService";
import { AppError, ErrorCode, normalizeError, logError, getUserFriendlyMessage } from "./_core/errorHandler";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    
    // 註冊
    register: publicProcedure
      .input(z.object({
        username: z.string().min(3).max(64),
        password: z.string().min(6),
      }))
      .mutation(async ({ input, ctx }) => {
        const { username, password } = input;
        const { getUserByUsername, createPasswordUser } = await import('./db');
        const { hashPassword } = await import('./services/passwordService');
        const { signJWT } = await import('./_core/jwt');
        
        // 檢查使用者名是否已存在
        const existingUser = await getUserByUsername(username);
        if (existingUser) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: '使用者名已被使用',
          });
        }
        
        // 加密密碼
        const passwordHash = await hashPassword(password);
        
        // 建立使用者
        const userId = await createPasswordUser({
          username,
          email: `${username}@local.user`, // 生成一個假的 email 以滿足資料庫 unique 約束
          passwordHash,
          name: username,
        });
        
        // 生成 JWT token
        const token = await signJWT({ userId });
        
        // 設定 cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, cookieOptions);
        
        return {
          success: true,
          userId,
        };
      }),
    
    // 登入
    login: publicProcedure
      .input(z.object({
        username: z.string(),
        password: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { username, password } = input;
        const { getUserByUsername } = await import('./db');
        const { verifyPassword } = await import('./services/passwordService');
        const { signJWT } = await import('./_core/jwt');
        
        // 查找使用者
        const user = await getUserByUsername(username);
        if (!user || !user.passwordHash) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: '使用者名或密碼錯誤',
          });
        }
        
        // 驗證密碼
        const isValid = await verifyPassword(password, user.passwordHash);
        if (!isValid) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: '使用者名或密碼錯誤',
          });
        }
        
        // 生成 JWT token
        const token = await signJWT({ userId: user.id });
        
        // 設定 cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, cookieOptions);
        
        return {
          success: true,
          userId: user.id,
        };
      }),
  }),

  podcast: router({
    // 獲取 YouTube 影片資訊
    getVideoInfo: protectedProcedure
      .input(z.object({
        youtubeUrl: z.string().url(),
      }))
      .mutation(async ({ input }) => {
        const { youtubeUrl } = input;
        
        if (!isValidYoutubeUrl(youtubeUrl)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: '無效的 YouTube 網址',
          });
        }

        const { getYoutubeVideoInfo } = await import('./services/videoInfoService');
        const videoInfo = await getYoutubeVideoInfo(youtubeUrl);
        
        return videoInfo;
      }),
    // 建立新的 podcast 任務
    create: protectedProcedure
      .input(z.object({
        youtubeUrl: z.string().url().optional(),
        textContent: z.string().optional(),
        articleUrl: z.string().url().optional(),
        inputType: z.enum(['youtube', 'text', 'article']),
        voiceId1: z.string().optional(),
        voiceId2: z.string().optional(),
        mode: z.enum(['quick', 'medium', 'deep']).optional(),
        style: z.enum(['educational', 'casual', 'professional']).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { youtubeUrl, textContent, articleUrl, inputType, voiceId1, voiceId2, mode, style } = input;
        
        // 驗證輸入
        let inputContent = "";
        if (inputType === 'youtube') {
          if (!youtubeUrl || !isValidYoutubeUrl(youtubeUrl)) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: '無效的 YouTube 網址',
            });
          }
          inputContent = youtubeUrl;
        } else if (inputType === 'text') {
          if (!textContent || !textContent.trim()) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: '請輸入文字內容',
            });
          }
          inputContent = textContent;
        } else if (inputType === 'article') {
          if (!articleUrl) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: '請輸入文章網址',
            });
          }
          inputContent = articleUrl;
        }

        // 建立任務記錄（目前只儲存 youtubeUrl，之後需要更新 schema）
        const taskId = await createPodcastTask({
          userId: ctx.user.id,
          youtubeUrl: inputType === 'youtube' ? inputContent : `[${inputType}] ${inputContent.substring(0, 100)}`,
          status: 'pending',
        });

        // 儲存使用者的聲音偏好（如果有提供）
        if (voiceId1 && voiceId2) {
          const { saveVoicePreference } = await import('./db');
          await saveVoicePreference(ctx.user.id, voiceId1, voiceId2).catch(err => {
            console.error('Failed to save voice preference:', err);
          });
        }

        // 在背景處理任務（不阻塞回應）
        processPodcastTask(taskId, inputContent, mode || 'medium', voiceId1, voiceId2, inputType, style || 'casual').catch((error) => {
          console.error(`Task ${taskId} processing failed:`, error);
        });

        return { taskId };
      }),

    // 獲取使用者的所有任務
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getUserPodcastTasks(ctx.user.id);
    }),

    // 獲取單一任務詳情
    get: protectedProcedure
      .input(z.object({
        taskId: z.number(),
      }))
      .query(async ({ input, ctx }) => {
        const task = await getPodcastTask(input.taskId, ctx.user.id);
        if (!task) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '找不到該任務',
          });
        }
        return task;
      }),

    // 獲取任務進度
    getProgress: protectedProcedure
      .input(z.object({
        taskId: z.number(),
      }))
      .query(async ({ input, ctx }) => {
        const task = await getPodcastTask(input.taskId, ctx.user.id);
        if (!task) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '找不到該任務',
          });
        }
        return {
          taskId: task.id,
          status: task.status,
          stage: task.progressStage || 'queued',
          percent: task.progressPercent || 0,
          message: task.progressMessage || '準備中...',
          estimatedTimeRemaining: task.estimatedTimeRemaining || null,
        };
      }),

    // 獲取 ListenHub 聲音列表
    getVoices: protectedProcedure.query(async () => {
      const { getVoices } = await import("./listenHubService");
      return getVoices();
    }),
    
    // 獲取使用者的聲音偏好設定
    getVoicePreference: protectedProcedure.query(async ({ ctx }) => {
      const { getVoicePreference } = await import("./db");
      const pref = await getVoicePreference(ctx.user.id);
      if (!pref) return null;
      return {
        voiceId1: pref.host1VoiceId,
        voiceId2: pref.host2VoiceId,
      };
    }),

    // 生成精華片段
    generateHighlights: protectedProcedure
      .input(z.object({
        taskId: z.number(),
        targetDuration: z.number().optional().default(60), // 目標總長度（秒）
      }))
      .mutation(async ({ input, ctx }) => {
        const { taskId, targetDuration } = input;

        // 獲取任務資訊
        const task = await getPodcastTask(taskId, ctx.user.id);
        if (!task) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '找不到該任務',
          });
        }

        // 檢查任務是否完成
        if (task.status !== 'completed') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Podcast 還未生成完成，無法生成精華片段',
          });
        }

        // 檢查是否有音檔（優先使用 podcastAudioUrl，如果沒有則使用 audioUrl）
        const audioUrl = task.podcastAudioUrl || task.audioUrl;
        if (!audioUrl) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: '音檔不存在，無法生成精華片段',
          });
        }

        // 優先使用 podcastScripts，如果沒有則使用 transcription 或 summary
        let scripts;
        if (task.podcastScripts) {
          scripts = JSON.parse(task.podcastScripts);
        } else if (task.transcription) {
          // 如果沒有 podcastScripts，將 transcription 轉換為 scripts 格式
          scripts = [
            {
              speakerId: 'host1',
              speakerName: '主持人',
              content: task.transcription,
            },
          ];
        } else if (task.summary) {
          // 如果連 transcription 也沒有，使用 summary
          scripts = [
            {
              speakerId: 'host1',
              speakerName: '主持人',
              content: task.summary,
            },
          ];
        } else {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Podcast 文字資料不存在，無法生成精華片段',
          });
        }

        // 使用 AI 識別精華片段
        const { identifyHighlights } = await import('./services/highlightService');
        const highlights = await identifyHighlights(scripts, targetDuration);

        // 剪輯並上傳精華片段
        const { clipFromUrlAndUpload } = await import('./services/audioClipService');
        const { saveHighlight } = await import('./db');

        const results = [];
        for (const highlight of highlights) {
          try {
            console.log(`[Highlight] 開始剪輯精華片段: ${highlight.title}`);
            console.log(`[Highlight] 音檔 URL: ${audioUrl}`);
            console.log(`[Highlight] 開始時間: ${highlight.startTime}秒, 持續時間: ${highlight.duration}秒`);
            
            // 剪輯音訊
            const { url, fileKey } = await clipFromUrlAndUpload(
              audioUrl,
              highlight.startTime,
              highlight.duration,
              ctx.user.id,
              taskId
            );
            
            console.log(`[Highlight] 剪輯完成: ${url}`);

            // 儲存到資料庫
            const highlightId = await saveHighlight({
              taskId,
              userId: ctx.user.id,
              title: highlight.title,
              description: highlight.description,
              startTime: highlight.startTime,
              endTime: highlight.endTime,
              duration: highlight.duration,
              audioUrl: url,
              audioFileKey: fileKey,
              transcript: highlight.transcript,
            });
            
            console.log(`[Highlight] 儲存完成: ID=${highlightId}`);

            results.push({
              id: highlightId,
              title: highlight.title,
              description: highlight.description,
              audioUrl: url,
              duration: highlight.duration,
            });
          } catch (error) {
            console.error(`[Highlight] 精華片段處理失敗: ${highlight.title}`, error);
            // 音檔剪輯失敗，不儲存該精華片段，繼續處理下一個
            // 這樣可以確保所有儲存的精華片段都有音檔
          }
        }

        return { highlights: results };
      }),

    // 刪除 Podcast 任務
    delete: protectedProcedure
      .input(z.object({
        taskId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { taskId } = input;
        const { deletePodcastTask } = await import('./db');
        
        await deletePodcastTask(taskId, ctx.user.id);
        
        return { success: true };
      }),

    // 刪除精華片段
    deleteHighlight: protectedProcedure
      .input(z.object({
        highlightId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { highlightId } = input;
        const { deleteHighlight } = await import('./db');
        
        await deleteHighlight(highlightId, ctx.user.id);
        
        return { success: true };
      }),

    // 獲取任務的精華片段
    getHighlights: protectedProcedure
      .input(z.object({
        taskId: z.number(),
      }))
      .query(async ({ input, ctx }) => {
        const { getTaskHighlights } = await import('./db');
        return getTaskHighlights(input.taskId, ctx.user.id);
      }),

    // 生成虛擬主播影片（Kling AI Avatar）
    generateAvatarVideo: protectedProcedure
      .input(z.object({
        highlightId: z.number(),
        mode: z.enum(['std', 'pro']).optional(),
        prompt: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { highlightId, mode = 'std', prompt } = input;
        const { getHighlight, createAvatarVideoTask } = await import('./db');
        
        // 獲取精華片段
        const highlight = await getHighlight(highlightId, ctx.user.id);
        if (!highlight) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '精華片段不存在',
          });
        }

        if (!highlight.audioUrl) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: '精華片段沒有音訊檔',
          });
        }

        // 驗證音訊時長（Kling AI API 要求 2-60 秒）
        if (highlight.duration < 2) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: '音訊時長太短，必須至少 2 秒',
          });
        }
        if (highlight.duration > 60) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: '音訊時長超過 60 秒，無法生成虛擬主播影片。請重新生成精華片段。',
          });
        }

        // 使用預設虛擬主播圖片
        const avatarImageUrl = '/default-avatar.png';
        
        // 生成自定義任務 ID
        const externalTaskId = `avatar-${highlightId}-${Date.now()}`;
        
        // 創建任務記錄
        const taskId = await createAvatarVideoTask({
          userId: ctx.user.id,
          highlightId,
          avatarImageUrl,
          audioUrl: highlight.audioUrl,
          prompt: prompt || `Professional podcast host presenting: ${highlight.title}`,
          mode,
          externalTaskId,
          status: 'pending',
        });

        // 背景處理影片生成
        processAvatarVideoGeneration(taskId, avatarImageUrl, highlight.audioUrl, mode, prompt).catch(error => {
          console.error(`[AvatarVideo] Task ${taskId} failed:`, error);
        });

        return { 
          taskId,
          status: 'submitted',
          message: '虛擬主播影片生成任務已提交，請稍後查看進度',
        };
      }),

    // 查詢虛擬主播影片任務狀態
    getAvatarVideoStatus: protectedProcedure
      .input(z.object({
        taskId: z.number(),
      }))
      .query(async ({ input, ctx }) => {
        const { getAvatarVideoTask } = await import('./db');
        const task = await getAvatarVideoTask(input.taskId);
        
        if (!task || task.userId !== ctx.user.id) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '任務不存在',
          });
        }

        return task;
      }),

    // 獲取精華片段的所有虛擬主播影片
    getHighlightAvatarVideos: protectedProcedure
      .input(z.object({
        highlightId: z.number(),
      }))
      .query(async ({ input, ctx }) => {
        const { getHighlightAvatarVideos } = await import('./db');
        return getHighlightAvatarVideos(input.highlightId, ctx.user.id);
      }),

  }),

  // TODO: add feature routers here
  
  voice: router({
    // 獲取 ListenHub 聲音列表
    list: protectedProcedure.query(async () => {
      const { getVoices } = await import("./listenHubService");
      return getVoices();
    }),
    
    // 獲取使用者的聲音偏好設定
    getPreference: protectedProcedure.query(async ({ ctx }) => {
      const { getVoicePreference } = await import("./db");
      return getVoicePreference(ctx.user.id);
    }),
    
    // 儲存使用者的聲音偏好設定
    savePreference: protectedProcedure
      .input(z.object({
        host1VoiceId: z.string(),
        host2VoiceId: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { saveVoicePreference } = await import("./db");
        await saveVoicePreference(ctx.user.id, input.host1VoiceId, input.host2VoiceId);
        return { success: true };
      }),
  }),
});

/**
 * 背景處理 podcast 任務
 */
async function processPodcastTask(
  taskId: number, 
  inputContent: string, 
  mode: 'quick' | 'medium' | 'deep' = 'medium',
  voiceId1?: string,
  voiceId2?: string,
  inputType: 'youtube' | 'text' | 'article' = 'youtube',
  style: 'educational' | 'casual' | 'professional' = 'casual'
) {
  try {
    // 導入進度更新服務
    const { updateProgress } = await import('./services/progressService');
    
    // 驗證：從資料庫獲取任務資訊，確保使用正確的 URL
    const { getPodcastTask } = await import('./db');
    const dbTask = await getPodcastTask(taskId, -1); // 使用 -1 跳過 userId 檢查
    if (!dbTask) {
      throw new Error(`Task ${taskId} not found in database`);
    }
    
    // 驗證 URL 是否匹配（防止並發或參數錯誤）
    if (inputType === 'youtube') {
      const dbUrl = dbTask.youtubeUrl;
      // 提取 video ID 進行比較（因為 URL 格式可能不同）
      const extractVideoId = (url: string) => {
        const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
        return match ? match[1] : null;
      };
      
      const inputVideoId = extractVideoId(inputContent);
      const dbVideoId = extractVideoId(dbUrl);
      
      if (inputVideoId && dbVideoId && inputVideoId !== dbVideoId) {
        console.error(`[Task ${taskId}] URL mismatch detected!`);
        console.error(`[Task ${taskId}] Input URL: ${inputContent}`);
        console.error(`[Task ${taskId}] DB URL: ${dbUrl}`);
        console.error(`[Task ${taskId}] Using DB URL to ensure correctness`);
        // 使用資料庫中的 URL，確保正確性
        inputContent = dbUrl;
      } else if (!inputVideoId && dbVideoId) {
        // 如果輸入的 URL 無法解析，使用資料庫中的 URL
        console.warn(`[Task ${taskId}] Input URL cannot be parsed, using DB URL: ${dbUrl}`);
        inputContent = dbUrl;
      }
      
      console.log(`[Task ${taskId}] Processing YouTube URL: ${inputContent}`);
    }
    
    // 更新狀態為處理中
    await updatePodcastTask(taskId, { status: 'processing' });
    await updateProgress({
      taskId,
      stage: 'queued',
      percent: 0,
      message: '任務已加入佇列，準備開始處理...',
    });

    // 根據 inputType 處理不同類型的輸入
    let result;
    if (inputType === 'youtube') {
      // 處理 YouTube 影片
      await updateProgress({
        taskId,
        stage: 'analyzing',
        percent: 20,
        message: '正在使用 AI 分析 YouTube 影片內容...',
      });
      
      console.log(`[Task ${taskId}] Calling processYoutubeToPodcast with URL: ${inputContent}`);
      result = await processYoutubeToPodcast(inputContent);
      
      await updateProgress({
        taskId,
        stage: 'analyzing',
        percent: 60,
        message: '內容分析完成',
      });
    } else if (inputType === 'text') {
      // 處理文字輸入
      await updateProgress({
        taskId,
        stage: 'analyzing',
        percent: 50,
        message: '正在分析文字內容...',
      });
      const { processTextToPodcast } = await import('./textService');
      result = await processTextToPodcast(inputContent);
    } else if (inputType === 'article') {
      // 處理文章網址
      await updateProgress({
        taskId,
        stage: 'downloading',
        percent: 10,
        message: '正在擷取文章內容...',
      });
      const { processArticleToPodcast } = await import('./articleService');
      result = await processArticleToPodcast(inputContent);
    } else {
      throw new Error(`不支援的輸入類型: ${inputType}`);
    }

    // 任務資訊已在開頭獲取，這裡不需要再次獲取
    // 但為了確保一致性，我們再次驗證
    if (!dbTask) {
      throw new Error(`Task ${taskId} not found`);
    }
    const task = dbTask;

    // 決定使用哪個聲音：優先使用傳入的參數，否則使用使用者偏好
    let finalVoiceId1 = voiceId1;
    let finalVoiceId2 = voiceId2;
    
    if (!finalVoiceId1 || !finalVoiceId2) {
      const { getVoicePreference } = await import('./db');
      const voicePreference = await getVoicePreference(task.userId);
      if (voicePreference) {
        finalVoiceId1 = finalVoiceId1 || voicePreference.host1VoiceId || undefined;
        finalVoiceId2 = finalVoiceId2 || voicePreference.host2VoiceId || undefined;
      }
    }

    // 生成 ListenHub Podcast
    console.log(`[Task ${taskId}] Generating ListenHub podcast with mode: ${mode}...`);
    await updateProgress({
      taskId,
      stage: 'generating',
      percent: 70,
      message: '正在生成 Podcast 音檔...',
    });
    const customVoices = finalVoiceId1 && finalVoiceId2
      ? { host1: finalVoiceId1, host2: finalVoiceId2 }
      : undefined;
    
    const podcastEpisode = await generateChinesePodcast(result.summary, mode, customVoices);
    
    console.log(`[Task ${taskId}] Podcast generated: ${podcastEpisode.audioUrl}`);

    // 更新任務結果
    await updateProgress({
      taskId,
      stage: 'completed',
      percent: 100,
      message: 'Podcast 生成完成！',
    });
    await updatePodcastTask(taskId, {
      status: 'completed',
      title: result.title || null,
      transcription: result.transcription,
      summary: result.summary,
      podcastScript: result.podcastScript,
      audioUrl: result.audioUrl,
      audioFileKey: result.audioFileKey,
      listenHubEpisodeId: podcastEpisode.episodeId,
      podcastAudioUrl: podcastEpisode.audioUrl || null,
      podcastTitle: podcastEpisode.title || null,
      podcastScripts: podcastEpisode.scripts ? JSON.stringify(podcastEpisode.scripts) : null,
    });
  } catch (error) {
    // 使用統一的錯誤處理
    const appError = normalizeError(error);
    logError(appError, { taskId, inputType, mode });
    
    const { updateProgress } = await import('./services/progressService');
    const userMessage = getUserFriendlyMessage(appError);
    
    await updateProgress({
      taskId,
      stage: 'failed',
      percent: 0,
      message: userMessage,
    });
    await updatePodcastTask(taskId, {
      status: 'failed',
      errorMessage: userMessage,
    });
  }
}

/**
 * 背景處理虛擬主播影片生成任務（使用 HeyGen API）
 */
async function processAvatarVideoGeneration(
  taskId: number,
  avatarImageUrl: string,
  audioUrl: string,
  mode: 'std' | 'pro' = 'std',
  prompt?: string
) {
  try {
    const { updateAvatarVideoTask } = await import('./db');
    const { createAvatarVideo, pollVideoStatus } = await import('./services/heygenService');
    
    console.log(`[AvatarVideo] Task ${taskId}: Starting avatar video generation with HeyGen`);
    console.log(`[AvatarVideo] Audio URL: ${audioUrl}`);
    console.log(`[AvatarVideo] Test mode: ${mode === 'std'}`);
    
    // 更新狀態為 submitted
    await updateAvatarVideoTask(taskId, { status: 'submitted' });
    
    // 創建 HeyGen 影片任務
    // 注意：test: true 不消耗額度，但會有浮水印
    const response = await createAvatarVideo({
      audioUrl,
      test: mode === 'std', // std 模式使用測試模式（免費但有浮水印）
    });
    
    const heygenVideoId = response.data.video_id;
    console.log(`[AvatarVideo] Task ${taskId}: HeyGen video task created: ${heygenVideoId}`);
    
    // 更新 HeyGen 影片 ID 和狀態
    await updateAvatarVideoTask(taskId, {
      apiVideoId: heygenVideoId,
      status: 'processing',
    });
    
    // 輪詢任務狀態（最多 60 次，每 10 秒一次，共 10 分鐘）
    console.log(`[AvatarVideo] Task ${taskId}: Polling HeyGen video status...`);
    const result = await pollVideoStatus(heygenVideoId, 60, 10000);
    
    // 獲取影片 URL
    const videoUrl = result.data.video_url;
    const thumbnailUrl = result.data.thumbnail_url;
    const duration = result.data.duration;
    
    if (!videoUrl) {
      throw new Error('No video URL returned');
    }
    
    console.log(`[AvatarVideo] Task ${taskId}: Video generated successfully`);
    console.log(`[AvatarVideo] Video URL: ${videoUrl}`);
    console.log(`[AvatarVideo] Duration: ${duration}s`);
    
    // 更新任務狀態為完成
    await updateAvatarVideoTask(taskId, {
      status: 'completed',
      videoUrl,
      thumbnailUrl,
      duration,
      statusMessage: '影片生成成功',
    });
    
  } catch (error) {
    console.error(`[AvatarVideo] Task ${taskId} failed:`, error);
    const { updateAvatarVideoTask } = await import('./db');
    await updateAvatarVideoTask(taskId, {
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : '影片生成失敗',
      statusMessage: error instanceof Error ? error.message : '影片生成失敗',
    });
  }
}

export type AppRouter = typeof appRouter;
