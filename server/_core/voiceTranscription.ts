/**
 * Voice transcription helper using OpenAI Whisper API
 *
 * Frontend implementation guide:
 * 1. Capture audio using MediaRecorder API
 * 2. Upload audio to storage (e.g., S3) to get URL
 * 3. Call transcription with the URL
 * 
 * Example usage:
 * ```tsx
 * // Frontend component
 * const transcribeMutation = trpc.voice.transcribe.useMutation({
 *   onSuccess: (data) => {
 *     console.log(data.text); // Full transcription
 *     console.log(data.language); // Detected language
 *     console.log(data.segments); // Timestamped segments
 *   }
 * });
 * 
 * // After uploading audio to storage
 * transcribeMutation.mutate({
 *   audioUrl: uploadedAudioUrl,
 *   language: 'en', // optional
 *   prompt: 'Transcribe the meeting' // optional
 * });
 * ```
 */
import OpenAI from "openai";

export type TranscribeOptions = {
  audioUrl: string; // URL to the audio file (e.g., S3 URL)
  language?: string; // Optional: specify language code (e.g., "en", "es", "zh")
  prompt?: string; // Optional: custom prompt for the transcription
};

// Native Whisper API segment format
export type WhisperSegment = {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
};

// Native Whisper API response format
export type WhisperResponse = {
  task: "transcribe";
  language: string;
  duration: number;
  text: string;
  segments: WhisperSegment[];
};

export type TranscriptionResponse = WhisperResponse; // Return native Whisper API response directly

export type TranscriptionError = {
  error: string;
  code: "FILE_TOO_LARGE" | "INVALID_FORMAT" | "TRANSCRIPTION_FAILED" | "UPLOAD_FAILED" | "SERVICE_ERROR";
  details?: string;
};

/**
 * Transcribe audio to text using the internal Speech-to-Text service
 * 
 * @param options - Audio data and metadata
 * @returns Transcription result or error
 */
// Custom fetch implementation with better error handling for Railway
const customFetch = async (url: string, options?: RequestInit): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes timeout
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      // Add keep-alive headers for better connection stability
      headers: {
        ...options?.headers,
        'Connection': 'keep-alive',
        'Keep-Alive': 'timeout=300',
      },
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

// Initialize OpenAI client with timeout and retry configuration
const getOpenAIClient = (): OpenAI => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  return new OpenAI({ 
    apiKey,
    timeout: 300000, // 5 minutes timeout for large audio files
    maxRetries: 0, // Disable SDK retries, we handle retries manually
    fetch: customFetch, // Use custom fetch with better error handling
  });
};

export async function transcribeAudio(
  options: TranscribeOptions
): Promise<TranscriptionResponse | TranscriptionError> {
  try {
    // Step 1: Validate environment configuration
    if (!process.env.OPENAI_API_KEY) {
      return {
        error: "OpenAI API key is not configured",
        code: "SERVICE_ERROR",
        details: "OPENAI_API_KEY environment variable is not set"
      };
    }

    // Step 2: Download audio from URL to server
    // We download to server first because OpenAI may not be able to access signed URLs
    let audioBuffer: Buffer;
    let mimeType: string;
    try {
      console.log(`[Whisper] Fetching audio from URL: ${options.audioUrl.substring(0, 100)}...`);
      const response = await fetch(options.audioUrl, {
        // Add timeout and headers
        signal: AbortSignal.timeout(120000), // 120 second timeout for large files
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PodcastMaker/1.0)',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        console.error(`[Whisper] Failed to download audio: HTTP ${response.status} ${response.statusText}`);
        console.error(`[Whisper] Error details: ${errorText.substring(0, 500)}`);
        return {
          error: "Failed to download audio file",
          code: "INVALID_FORMAT",
          details: `HTTP ${response.status}: ${response.statusText}. URL: ${options.audioUrl.substring(0, 100)}...`
        };
      }
      
      console.log(`[Whisper] Audio download successful, content-type: ${response.headers.get('content-type')}`);
      audioBuffer = Buffer.from(await response.arrayBuffer());
      mimeType = response.headers.get('content-type') || 'audio/mpeg';
      
      console.log(`[Whisper] Audio buffer size: ${(audioBuffer.length / (1024 * 1024)).toFixed(2)}MB`);
      
      // Check file size (25MB limit for OpenAI Whisper)
      const sizeMB = audioBuffer.length / (1024 * 1024);
      if (sizeMB > 25) {
        return {
          error: "Audio file exceeds maximum size limit",
          code: "FILE_TOO_LARGE",
          details: `File size is ${sizeMB.toFixed(2)}MB, maximum allowed is 25MB`
        };
      }
    } catch (error) {
      console.error(`[Whisper] Error fetching audio file:`, error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        error: "Failed to fetch audio file",
        code: "SERVICE_ERROR",
        details: `${errorMessage}. URL: ${options.audioUrl.substring(0, 100)}...`
      };
    }

    // Step 3: Create File object for OpenAI API
    // Use Blob instead of File for better Node.js compatibility
    const filename = `audio.${getFileExtension(mimeType)}`;
    const audioBlob = new Blob([audioBuffer], { type: mimeType });
    const audioFile = new File([audioBlob], filename, { type: mimeType });

    // Step 4: Call OpenAI Whisper API with retry logic
    console.log(`[Whisper] Calling OpenAI Whisper API with file upload (${(audioBuffer.length / (1024 * 1024)).toFixed(2)}MB)...`);
    const openai = getOpenAIClient();
    let transcription;
    
    // Retry configuration
    const maxRetries = 5; // Increase to 5 retries for network issues
    let lastError: any = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Whisper] Attempt ${attempt}/${maxRetries} (uploading file directly)...`);
        
        // Create a fresh File object for each attempt
        const fileForUpload = new File([audioBlob], filename, { type: mimeType });
        
        transcription = await openai.audio.transcriptions.create({
          file: fileForUpload,
          model: "whisper-1",
          response_format: "verbose_json",
          language: options.language || undefined,
          prompt: options.prompt || undefined,
        }, {
          timeout: 300000, // 5 minutes timeout per request
        });
        
        console.log(`[Whisper] Transcription successful, language: ${transcription.language}, duration: ${transcription.duration}s`);
        break; // Success, exit retry loop
      } catch (apiError: any) {
        lastError = apiError;
        const errorMsg = apiError?.message || apiError?.toString() || 'Unknown error';
        const errorCode = apiError?.code || apiError?.type || 'unknown';
        console.error(`[Whisper] Attempt ${attempt} failed:`, {
          message: errorMsg,
          code: errorCode,
          cause: apiError?.cause?.message,
        });
        
        // Check if it's a retryable error
        const isRetryable = 
          errorCode === 'ECONNRESET' ||
          errorCode === 'ETIMEDOUT' ||
          errorCode === 'ENOTFOUND' ||
          errorCode === 'ECONNREFUSED' ||
          errorMsg.includes('Connection error') ||
          errorMsg.includes('timeout') ||
          errorMsg.includes('ECONNRESET') ||
          errorMsg.includes('ETIMEDOUT') ||
          apiError?.type === 'system' ||
          (apiError?.cause && (
            apiError.cause.code === 'ECONNRESET' ||
            apiError.cause.code === 'ETIMEDOUT'
          ));
        
        // Don't retry on authentication or rate limit errors
        if (errorMsg.includes("API key") || 
            errorMsg.includes("authentication") ||
            errorMsg.includes("rate limit") ||
            errorMsg.includes("401") ||
            errorMsg.includes("429")) {
          console.error(`[Whisper] Non-retryable error detected, stopping retries`);
          break; // Exit retry loop for non-retryable errors
        }
        
        // If this is the last attempt or not retryable, break
        if (attempt === maxRetries || !isRetryable) {
          console.error(`[Whisper] ${attempt === maxRetries ? 'Max retries reached' : 'Non-retryable error'}, stopping`);
          break;
        }
        
        // Wait before retrying (exponential backoff with jitter)
        const baseWaitTime = 2000; // Start with 2 seconds
        const waitTime = Math.min(baseWaitTime * Math.pow(2, attempt - 1) + Math.random() * 1000, 15000); // Max 15 seconds
        console.log(`[Whisper] Retrying in ${Math.round(waitTime)}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    // If transcription is still undefined, handle the error
    if (!transcription) {
      console.error(`[Whisper] All ${maxRetries} attempts failed`);
      if (lastError instanceof Error) {
        if (lastError.message.includes("API key") || lastError.message.includes("authentication")) {
          return {
            error: "OpenAI API authentication failed",
            code: "SERVICE_ERROR",
            details: `Please check OPENAI_API_KEY: ${lastError.message}`
          };
        }
        if (lastError.message.includes("rate limit")) {
          return {
            error: "OpenAI API rate limit exceeded",
            code: "SERVICE_ERROR",
            details: "Please try again later"
          };
        }
        // Check for connection errors
        if (lastError.code === 'ECONNRESET' || 
            lastError.message?.includes('Connection error') ||
            lastError.type === 'system') {
          return {
            error: "OpenAI API connection failed",
            code: "SERVICE_ERROR",
            details: `Network error after ${maxRetries} attempts. Please check your internet connection and try again. Error: ${lastError.message}`
          };
        }
        return {
          error: "OpenAI API call failed",
          code: "SERVICE_ERROR",
          details: lastError.message
        };
      }
      return {
        error: "OpenAI API call failed",
        code: "SERVICE_ERROR",
        details: "Unknown error occurred after multiple retries"
      };
    }

    // Step 5: Convert OpenAI response to our format
    const whisperResponse: WhisperResponse = {
      task: "transcribe",
      language: transcription.language || "unknown",
      duration: transcription.duration || 0,
      text: transcription.text,
      segments: transcription.segments?.map((seg, idx) => ({
        id: idx,
        seek: seg.start || 0,
        start: seg.start || 0,
        end: seg.end || 0,
        text: seg.text || "",
        tokens: [],
        temperature: 0,
        avg_logprob: 0,
        compression_ratio: 0,
        no_speech_prob: 0,
      })) || [],
    };

    // Validate response structure
    if (!whisperResponse.text || typeof whisperResponse.text !== 'string') {
      return {
        error: "Invalid transcription response",
        code: "SERVICE_ERROR",
        details: "Transcription service returned an invalid response format"
      };
    }

    return whisperResponse;

  } catch (error) {
    // Handle unexpected errors
    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        return {
          error: "OpenAI API authentication failed",
          code: "SERVICE_ERROR",
          details: error.message
        };
      }
      if (error.message.includes("rate limit")) {
        return {
          error: "OpenAI API rate limit exceeded",
          code: "SERVICE_ERROR",
          details: "Please try again later"
        };
      }
    }
    return {
      error: "Voice transcription failed",
      code: "SERVICE_ERROR",
      details: error instanceof Error ? error.message : "An unexpected error occurred"
    };
  }
}

/**
 * Helper function to get file extension from MIME type
 */
function getFileExtension(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/mp3': 'mp3',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/wave': 'wav',
    'audio/ogg': 'ogg',
    'audio/m4a': 'm4a',
    'audio/mp4': 'm4a',
  };
  
  return mimeToExt[mimeType] || 'audio';
}

/**
 * Helper function to get full language name from ISO code
 */
function getLanguageName(langCode: string): string {
  const langMap: Record<string, string> = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'nl': 'Dutch',
    'pl': 'Polish',
    'tr': 'Turkish',
    'sv': 'Swedish',
    'da': 'Danish',
    'no': 'Norwegian',
    'fi': 'Finnish',
  };
  
  return langMap[langCode] || langCode;
}

/**
 * Example tRPC procedure implementation:
 * 
 * ```ts
 * // In server/routers.ts
 * import { transcribeAudio } from "./_core/voiceTranscription";
 * 
 * export const voiceRouter = router({
 *   transcribe: protectedProcedure
 *     .input(z.object({
 *       audioUrl: z.string(),
 *       language: z.string().optional(),
 *       prompt: z.string().optional(),
 *     }))
 *     .mutation(async ({ input, ctx }) => {
 *       const result = await transcribeAudio(input);
 *       
 *       // Check if it's an error
 *       if ('error' in result) {
 *         throw new TRPCError({
 *           code: 'BAD_REQUEST',
 *           message: result.error,
 *           cause: result,
 *         });
 *       }
 *       
 *       // Optionally save transcription to database
 *       await db.insert(transcriptions).values({
 *         userId: ctx.user.id,
 *         text: result.text,
 *         duration: result.duration,
 *         language: result.language,
 *         audioUrl: input.audioUrl,
 *         createdAt: new Date(),
 *       });
 *       
 *       return result;
 *     }),
 * });
 * ```
 */
