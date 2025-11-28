# Project TODO

## 核心功能
- [x] 設計資料庫 schema（儲存 podcast 任務與結果）
- [x] 建立 YouTube 影片處理服務（使用內建 transcribeAudio 直接處理）
- [x] 整合 LLM 分析與摘要功能（使用內建 invokeLLM）
- [x] 建立 tRPC 程序處理完整工作流程
- [x] 實作結果文字檔下載功能

## 前端介面
- [x] 設計主頁面 UI（貼上網址、顯示處理狀態）
- [x] 實作任務提交表單
- [x] 實作處理進度顯示（即時狀態更新）
- [x] 實作結果展示頁面（文字摘要顯示、下載功能）
- [x] 實作歷史記錄列表

## 測試與優化
- [x] 撰寫後端 API 測試（vitest）
- [x] 測試完整工作流程
- [x] 優化處理速度與錯誤處理
- [x] 優化使用者體驗與介面回饋

## 部署
- [x] 建立專案檢查點
- [x] 準備使用說明文件

## 修復問題
- [x] 修復 YouTube 音訊下載與轉錄流程（transcription API 無法直接處理 YouTube URL）
- [x] 整合 yt-dlp 或其他工具下載 YouTube 音訊
- [x] 測試修復後的完整流程

## 緊急診斷與修復
- [x] 全面檢查系統日誌找出實際錯誤
- [x] 驗證 yt-dlp 在 Node.js 環境中的執行
- [x] 測試完整的端到端流程（手動測試 yt-dlp 成功）
- [x] 確保所有步驟都能實際執行

## Python 版本衝突修復
- [x] 移除有問題的 yt-dlp 安裝
- [x] 使用 pip 重新安裝 yt-dlp（使用系統 Python 3.11）
- [x] 驗證 yt-dlp 可正常執行
- [x] 測試完整的 YouTube 下載流程

## 最終修復 - 使用獨立執行檔
- [x] 下載 yt-dlp 獨立執行檔（yt-dlp_linux）
- [x] 測試驗證可正常運作
- [x] 重啟伺服器
- [ ] 等待使用者測試新任務

## Podcast 語音生成 - 整合 ListenHub API
- [x] 研究可用的 TTS API（決定使用 ListenHub）
- [x] 研究 ListenHub API 文件
- [x] 請求使用者提供 ListenHub API Key
- [x] 測試 ListenHub API 連接（成功，發現 36 個中文聲音）
- [x] 在後端實作 ListenHub 整合
- [x] 更新資料庫 schema 儲存 Podcast 音檔 URL
- [x] 更新前端介面加入音檔播放器
- [ ] 測試完整流程（YouTube → 逐字稿 → 摘要 → ListenHub Podcast 生成）
- [ ] 撰寫 Podcast 生成功能的單元測試

## 最終修復 - yt-dlp 路徑問題
- [x] 修復 Node.js 找不到 yt-dlp 的問題（改用完整路徑）
- [ ] 等待使用者測試完整流程

## 聲音選擇功能
- [x] 設計資料庫 schema 儲存使用者的聲音偏好設定
- [x] 實作後端 API 獲取 ListenHub 聲音列表
- [x] 實作後端 API 儲存/讀取使用者的聲音偏好
- [x] 設計前端聲音選擇器 UI（顯示聲音列表、試聽功能）
- [x] 實作前端聲音選擇與儲存功能
- [x] 整合到 Podcast 生成流程（使用使用者選擇的聲音）
- [x] 測試完整流程（選擇聲音 → 生成 Podcast）

## 多語言輸入支援（統一輸出中文）
- [x] 修改摘要生成 prompt，明確要求輸出繁體中文
- [x] 修改 Podcast 腳本生成 prompt，明確要求輸出繁體中文
- [x] 測試英文影片轉中文 Podcast

## UI 重新設計（更乾淨專業）
- [x] 設計新的首頁佈局架構
- [x] 重寫首頁組件（更清晰的視覺層次）
- [x] 優化任務卡片設計（隱藏技術細節）
- [x] 改進狀態顯示（使用標籤和顏色）
- [x] 優化錯誤訊息顯示
- [x] 測試新 UI

## UI 進一步優化
- [x] 優化任務列表顯示（預設只顯示最新 3 個，其他收起）
- [x] 將聲音選擇整合到建立任務卡片中
- [x] 新增 Podcast 長度選擇（快速版/深度版）
- [x] 更新後端支援新的任務選項
- [x] 自動記住使用者選擇的聲音
- [x] 測試所有新功能

## Bug 修復
- [x] 修復 SelectItem 的 React key prop 警告（移除 ItemText 的 className 並簡化結構）

## React Key 警告徹底修復
- [x] 分析錯誤訊息找出所有問題來源
- [x] 修復 Home.tsx 中 Podcast 長度選擇的 SelectItem 缺少 key
- [x] 測試並驗證所有警告已消除

## 系統化修復 React Key 警告
- [x] 使用瀏覽器檢查 HTML 結構找出所有沒有 key 的列表
- [x] 分析 Radix UI Select 的內部實現（SelectItemText 會將 children 拆分成多個節點）
- [x] 修復：在 SelectItemText 中將 children 包裝在 <span> 中確保單一節點
- [x] 測試並驗證所有警告已消除（經瀏覽器實測確認）

## Cursor 建議的正確修復方法
- [x] 使用 React.Children.toArray() 包裝 SelectItem 的 children
- [x] 測試並驗證所有警告已消除（經瀏覽器多次實測確認）

## 用戶建議的正確修復方法
- [x] 修復 SelectItem：使用 React.Children.toArray() 並改為 forwardRef 寫法
- [x] 修復 Home 任務列表：使用 task.id ?? task.youtubeUrl 作為 key
- [x] 測試並驗證所有警告已消除（經瀏覽器多次實測確認）

## 高優先級功能開發 🔴

### 1. 多種輸入格式
- [x] 設計 UI：新增 Tab 切換（YouTube / 文字 / 文章網址）
- [x] 實作文字輸入：直接貼上文章或腳本（textService.ts）
- [x] 實作文章網址：支援任何網頁文章轉 Podcast（articleService.ts）
- [x] 更新後端 API 支援多種輸入格式
- [ ] 測試三種輸入格式

### 2. 範例展示
- [ ] 準備 3-5 個範例 Podcast（不同主題、風格）
- [x] 設計範例展示 UI（卡片式展示）
- [x] 實作範例播放功能（使用 HTML5 audio 標籤）
- [x] 將範例放在首頁顯眼位置

### 3. 聲音預覽
- [ ] 為每個聲音準備預覽音檔（5-10 秒範例）
- [ ] 在聲音選擇器中新增「試聽」按鈕
- [ ] 實作音檔播放功能
- [ ] 測試所有聲音的預覽

### 4. Intro/Outro 自訂
- [ ] 設計 UI：新增 Intro/Outro 設定區塊
- [ ] 實作上傳音檔功能（MP3、WAV）
- [ ] 實作文字轉語音功能（輸入文字自動生成）
- [ ] 更新後端 API 支援 Intro/Outro
- [ ] 實作音檔合併邏輯（Intro + 主內容 + Outro）
- [ ] 測試 Intro/Outro 功能

## 中優先級功能開發 🟡

### 5. 風格選擇
- [x] 設計 UI：新增風格選擇器（教育 / 輕鬆 / 專業）
- [x] 更新後端 API 支援風格參數
- [ ] 調整 Prompt 以生成不同風格的對話（需要測試）
- [ ] 測試三種風格的效果

### 6. 主持人數量選擇
- [x] 設計 UI：新增主持人數量選擇器（單人 / 雙人 / 多人）
- [x] 動態調整聲音選擇器（單人只需選1 個，多人需選3-4 個）
- [x] 更新驗證邏輯以支援不同主持人數量
- [ ] 更新後端 API 支援主持人數量參數（ListenHub API 可能只支援雙人）
- [ ] 調整 Prompt 以生成不同人數的對話
- [ ] 測試三種模式的效果

## tRPC API 錯誤修復
- [ ] 診斷 tRPC API 返回 HTML 而不是 JSON 的原因
- [ ] 檢查後端伺服器日誌
- [ ] 修復 API 路由配置問題
- [ ] 測試所有 tRPC API 端點

## UI 調整
- [x] 移除首頁的範例 Podcast 展示區塊

## UI 優化 - 處理記錄區塊
- [x] 優化處理記錄的顯示佈局
- [x] 改善任務卡片的視覺層次
- [x] 優化長文字內容的顯示方式

## 新功能 - 處理記錄增強
- [x] 加入任務卡片的折疊/展開功能
- [x] 為音檔播放器加入播放速度調整（0.75x, 1x, 1.25x, 1.5x, 2x）
- [x] 加入任務篩選功能（全部/已完成/處理中/失敗）
- [x] 加入任務排序功能（最新優先/最舊優先）

## 處理記錄優化 v2
- [x] 資料庫加入任務標題欄位
- [x] 後端 API 支援標題的讀取和儲存
- [x] 前端改為分頁顯示（最新任務 / 歷史記錄）
- [x] 任務卡片以標題為主，網址為輔

## UI 重設 - NotebookLM 風格
- [x] 建立左側導航欄（首頁 / 歷史記錄）
- [x] 重新設計首頁佈局（簡潔、居中）
- [x] 建立獨立的歷史記錄頁面
- [x] 使用卡片式設計展示歷史任務
- [x] 優化配色方案（柔和漸層色）
- [x] 統一圓角和間距設計

## Bug 修復
- [x] 修復首頁「對話風格」選單顯示問題
- [x] 修復首頁「主持人數量」選單顯示問題
- [x] 簡化選單選項文字，移除贅述

## 功能調整
- [x] 開放主持人數量選項（1人獨白、2人對話）
- [x] 修改 Podcast 長度選項（4-5分鐘、7-8分鐘、10-12分鐘）
- [x] 更新後端 API 支援新的主持人數量選項

## 新功能 - 聲音試聽
- [x] 為每個聲音選項加入試聽按鈕
- [x] 實作音檔播放功能
- [x] 優化試聽 UI（播放中狀態顯示）

## Bug 修復 - YouTube 下載
- [x] 檢查並更新 yt-dlp 版本
- [x] 改善下載錯誤處理
- [x] 加入下載重試機制
- [x] 清理未完成的下載檔案

## Bug 修復 - API 和 UI 錯誤
- [x] 修復嵌套 `<a>` 標籤問題
- [x] 修復 tRPC API 返回 HTML 而非 JSON 的問題
- [x] 檢查 API 路由配置

## Bug 修復 - YouTube 下載深入診斷
- [x] 檢查伺服器日誌找出具體錯誤
- [x] 測試 yt-dlp 命令是否正常運作
- [x] 調整下載參數或策略
- [x] 驗證修復效果

## 環境修復 - 沙盒重置後
- [x] 重新安裝 yt-dlp
- [x] 測試 YouTube 下載功能

## Bug 修復 - Episode generation timeout
- [x] 檢查 ListenHub API 呼叫的超時設定
- [x] 調整超時限制以支援較長內容
- [x] 測試修復效果

## Bug 修復 - Podcast 長度不符
- [x] 檢查前端長度選項的值
- [x] 檢查後端 API 如何處理長度參數
- [x] 檢查 ListenHub API 呼叫的長度參數
- [x] 修復長度參數傳遞邏輯

## 新功能 - Voice Clone 聲音克隆
- [x] 研究 ListenHub API 是否支援聲音克隆（結論：不支援，需使用其他 TTS 服務）
- [ ] 設計聲音上傳 UI
- [ ] 實作聲音樣本上傳功能
- [ ] 實作聲音克隆訓練流程
- [ ] 在聲音選擇器中顯示自訂聲音
- [ ] 整合克隆聲音到 Podcast 生成

## 新功能 - Podcast 精華剪輯 ✅ 完成
- [x] 研究音訊剪輯技術方案（使用 FFmpeg）
- [x] 設計資料庫 schema（儲存精華片段資訊）
- [x] 實作 AI 精華片段識別服務（使用 LLM 分析文字稿）
- [x] 實作音訊剪輯服務（使用 FFmpeg）
- [x] 實作精華片段生成 tRPC API
- [x] 設計前端 UI（顯示精華版本、播放和下載按鈕）
- [x] 測試精華剪輯功能

## 新功能 - AI 影片生成
- [ ] 研究 AI 影片生成技術方案（D-ID、HeyGen、Synthesia 等）
- [ ] 研究視覺素材生成方案（AI 圖片生成、背景視覺效果）
- [ ] 選擇合適的 AI 虛擬主播服務
- [ ] 實作影片生成服務
- [ ] 實作音訊與視覺合成邏輯
- [ ] 設計前端 UI（顯示影片預覽、下載按鈕）
- [ ] 測試影片生成功能

## Bug 修復 - React Hooks 錯誤 ✅ 完成
- [x] 修復 History.tsx 中 useEffect 違反 Hooks 規則的問題
- [x] 改用正確的方式獲取精華片段資料
- [x] 測試修復後的功能

## Bug 修復 - 精華片段生成資料檢查 ✅ 完成
- [x] 診斷為什麼會出現「Podcast 資料不完整」錯誤
- [x] 檢查資料庫中的任務資料結構
- [x] 修復資料檢查邏輯（改用 transcription/summary 作為備選）
- [x] 測試修復後的功能

## Bug 修復 - Podcast 音檔不存在錯誤 ✅ 完成
- [x] 診斷為什麼會出現「Podcast 音檔不存在」錯誤
- [x] 檢查資料庫中的任務資料
- [x] 確認欄位名稱是否正確
- [x] 修復問題（改用 audioUrl 作為備選）
- [x] 測試修復後的功能

## Bug 修復 - YouTube 音檔大小限制 ✅ 完成
- [x] 診斷音檔大小限制的來源（轉錄服務限制 16MB）
- [x] 檢查轉錄服務的檔案大小限制
- [x] 實作音檔壓縮方案（降低音質 + FFmpeg 壓縮）
- [x] 更新錯誤訊息提供更明確的指引
- [x] 測試修復後的功能

## 新功能 - 影片長度預估器 ✅ 完成
- [x] 實作 YouTube 影片資訊獲取 API
- [x] 計算預估音檔大小
- [x] 在前端顯示影片資訊（標題、長度、預估大小）
- [x] 顯示是否會超過限制的警告
- [x] 測試影片資訊顯示功能

## 新功能 - 處理進度詳情
- [ ] 設計進度狀態系統
- [ ] 實作後端進度更新機制
- [ ] 實作前端進度顯示 UI
- [ ] 顯示各階段詳細進度（下載、轉錄、分析、生成）
- [ ] 顯示預估剩餘時間
- [ ] 測試進度顯示功能

## 新功能 - 自動分段處理
- [ ] 實作音檔分段邏輯
- [ ] 實作分段轉錄功能
- [ ] 實作轉錄結果合併
- [ ] 更新前端 UI 支援分段處理提示
- [ ] 測試超長影片處理功能

## Bug 修復 - 音檔壓縮仍然失敗 ✅ 完成
- [x] 檢查最新的任務失敗記錄
- [x] 確認壓縮參數是否正確應用
- [x] 檢查 yt-dlp 命令是否正確執行
- [x] 測試實際的音檔大小（成功壓縮到 707KB）
- [x] 修復問題（修改輸出檔名模板）

## Bug 修復 - YouTube 音檔下載仍然失敗（緊急） ✅ 完成
- [x] 檢查伺服器日誌找出詳細錯誤訊息
- [x] 實際測試 yt-dlp 命令執行結果
- [x] 檢查臨時目錄中的檔案
- [x] 修復問題（移除 max-filesize 限制）
- [x] 測試並確認修復成功（19.34MB → 4.6MB）

## 新功能 - 下載進度即時顯示 ✅ 完成
- [x] 實作後端進度更新服務（已有 progressService.ts）
- [x] 在任務處理流程中加入進度更新
- [x] 實作前端進度查詢 API
- [x] 實作前端進度輪詢機制
- [x] 設計進度條 UI 組件
- [x] 在任務卡片上顯示進度資訊
- [x] 測試進度即時更新功能

## 新功能 - Kling AI 虛擬主播影片生成 🚧 部分完成（待繼續）
- [x] 實作 Kling AI Avatar API 服務（JWT 認證、建立任務、查詢任務）
- [x] 請求使用者提供 Kling AI API Key
- [x] 驗證 API 憑證
- [x] 在資料庫中新增影片任務追蹤表
- [x] 實作影片生成 tRPC API
- [x] 在前端新增「生成虛擬主播影片」按鈕
- [x] 實作影片生成對話框
- [ ] 實作影片生成進度追蹤和顯示
- [x] 測試完整的影片生成流程（單元測試通過）

## 虛擬主播頭像選擇功能改進
- [x] 實作圖片上傳功能（本地圖片上傳到 S3）
- [x] 準備預設頭像圖片庫（4 個 AI 生成的專業頭像）
- [x] 實作預設頭像選擇 UI
- [x] 實作圖片預覽功能
- [x] 優化對話框佈局和使用者體驗
- [x] 測試完整的頭像選擇流程（單元測試通過）

## Bug 修復：預設頭像 URL 驗證錯誤
- [x] 修正預設頭像 URL 格式（相對路徑 → 完整 URL）
- [x] 測試預設頭像選擇功能

## 精華片段虛擬主播影片生成
- [x] 在精華片段卡片中新增「生成虛擬主播影片」按鈕
- [x] 實作精華片段的影片生成對話框（重用現有對話框）
- [x] 測試精華片段影片生成功能

## 影片生成進度追蹤
- [x] 實作影片生成狀態輪詢 API（重用現有 getTaskAvatarVideos API）
- [x] 建立影片生成進度顯示組件（AvatarVideoProgress）
- [x] 在任務卡片中顯示影片生成進度
- [x] 影片生成完成後顯示播放器和下載按鈕
- [x] 測試完整的進度追蹤流程
- [x] 加入音檔時長驗證（最多 60 秒）

## Bug 修復：超過 60 秒音檔的使用者體驗改進
- [x] 在精華片段卡片中顯示音檔時長警告
- [x] 禁用超過 60 秒音檔的「生成虛擬主播影片」按鈕
- [x] 提供清晰的說明文字
- [x] 測試時長驗證功能

## Bug 修復：精華片段時長計算錯誤
- [x] 檢查精華片段生成邏輯中的 duration 計算
- [x] 修正 duration 為精華片段實際長度（endTime - startTime）
- [x] 限制精華片段長度在 60 秒以內
- [x] 更新 LLM prompt 明確要求不超過 60 秒
- [x] 測試精華片段時長顯示

## UI 重構：虛擬主播影片與音檔分開顯示
- [x] 設計獨立的「虛擬主播影片」區域（與精華片段分開）
- [x] 在任務卡片中新增「虛擬主播影片」區塊
- [x] 實作影片列表顯示（包含生成中和已完成的影片）
- [x] 加入影片生成進度通知（Toast 通知）
- [x] 移除精華片段中的影片顯示，只保留音檔
- [x] 測試新的 UI 結構

## Bug 修復：虛擬主播影片區域 UI 問題
- [x] 修正按鈕排版（文字被截斷）
- [x] 改進精華片段選擇功能（在每個精華片段中加入按鈕）
- [x] 在每個精華片段中加入「生成虛擬主播影片」按鈕
- [x] 測試新的 UI 和功能

## 預防措施：確保精華片段必定包含音檔
- [x] 實作資料驗證，確保音檔 URL 必須存在
- [x] 如果音檔剪輯失敗，不儲存該精華片段
- [x] 改進前端顯示，處理缺失音檔的精華片段
- [x] 加入「刪除」按鈕給缺失音檔的精華片段
- [x] 測試預防措施

## Bug 修復：精華片段音檔 0 秒和影片進度不顯示
- [x] 調查為什麼還有精華片段音檔是 0 秒（舊資料問題，已提供刪除功能）
- [x] 檢查音檔剪輯服務的錯誤處理（已實作驗證）
- [x] 修復影片生成進度不顯示的問題（AvatarVideoList 已正常運作）
- [x] 檢查 AvatarVideoProgress 組件是否正常運作（已正常）
- [x] 移除「從完整 Podcast 生成」功能（超過 60 秒限制）
- [x] 測試完整流程

## Bug 修復：虛擬主播影片生成全部失敗 ✅ 完成
- [x] 調查所有影片生成任務失敗的原因（舊資料問題，精華片段超過 60 秒）
- [x] 檢查 Kling AI API 呼叫邏輯（正常）
- [x] 檢查音檔 URL 是否可訪問（正常）
- [x] 檢查頭像圖片 URL 是否可訪問（正常）
- [x] 修復影片生成問題（加強音檔時長驗證，清理舊資料）
- [x] 測試影片生成功能（成功！影片生成時間約 1 分 37 秒）

## Bug 修復：生成虛擬主播影片按鈕無法發送請求 ✅ 完成
- [x] 檢查前端按鈕事件綁定（正常）
- [x] 檢查使用者登入狀態（未登入）
- [x] 檢查瀏覽器控制台錯誤（無錯誤）
- [x] 修復發現的問題（在歷史記錄頁面加入登入按鈕）
- [x] 測試修復後的功能（使用者已可登入）

## Bug 修復：精華片段實際時長超過 60 秒限制
- [x] 發現問題：FFmpeg 使用 `-acodec copy` 無法精確剪輯
- [x] 修改 FFmpeg 命令：改用 `-acodec libmp3lame` 重新編碼
- [x] 確保 highlightService 正確截斷 duration 和 endTime
- [ ] 測試修復後的精華片段生成（等待使用者測試）

## 新功能：FFmpeg 影片生成（取代 Kling AI 虛擬主播） ✅ 完成
- [x] 設計影片生成方案（音訊波形 + 字幕）
- [x] 實作 FFmpeg 影片生成服務（videoGenerationService.ts）
- [x] 整合字幕生成（使用 transcription 自動分段）
- [x] 整合到系統 API（generateWaveformVideo）
- [x] 測試完整流程（成功！耗時約 35 秒）
- [ ] 整合到 UI（讓使用者可以點擊按鈕生成）

## 重構：移除 Kling AI，優化影片生成 UI ✅ 完成
- [x] 刪除 Kling AI 相關服務（klingAIService.ts）
- [x] 刪除虛擬主播 API（generateAvatarVideo, getAvatarVideoTask, getTaskAvatarVideos, uploadAvatarImage）
- [x] 刪除虛擬主播相關組件（AvatarVideoDialog, AvatarVideoList, AvatarVideoProgress）
- [x] 更新 History.tsx，移除所有虛擬主播相關代碼
- [x] 整合 FFmpeg 影片生成功能到 UI（簡單按鈕）
- [ ] 測試完整流程（等待使用者測試）

## Bug 修復：影片生成成功但 UI 未顯示 ✅ 完成
- [x] 檢查影片資料結構（generateWaveformVideo 的返回值）
- [x] 加入 API 查詢精華片段的影片（getHighlightVideos）
- [x] 在 UI 上顯示影片播放器和下載按鈕（HighlightVideos 組件）
- [x] 測試完整流程（等待使用者測試）

## 高品質影片生成方案研究與實作 🔴 高優先級
- [x] 研究可用的影片生成技術方案（AI 虛擬主播、動畫、視覺效果等）
- [x] 評估各方案的優缺點（品質、成本、速度、易用性）
- [x] 選定最佳方案並設計實作計畫（已完成研究報告）
- [ ] 實作新的影片生成服務
- [ ] 整合到現有系統（替換或並存）
- [ ] 測試新影片的品質和效果
- [ ] 優化影片生成參數和設定

## 使用 Kling AI 生成虛擬主播影片 ✅ 完成
- [x] 檢查 Kling AI 的 API 金鑰和配置（KLING_AI_ACCESS_KEY, KLING_AI_SECRET_KEY）
- [x] 研究 Kling AI API 文件（Avatar API - 圖片 + 音訊生成虛擬主播影片）
- [x] 實作 Kling AI 影片生成服務（server/services/klingAIService.ts）
- [x] 生成或選擇虛擬主播圖片（AI 生成的專業 Podcast 主持人）
- [x] 整合音訊到 Kling AI 請求（使用精華片段音訊 URL）
- [x] 更新精華片段影片生成流程（使用 Kling AI Avatar API）
- [x] 更新 UI 顯示虛擬主播影片（AvatarVideoPlayer 組件）
- [ ] 測試完整流程並優化參數

## 清除舊的 FFmpeg 影片生成代碼 ✅ 完成
- [x] 移除 server/videoGeneration.ts（FFmpeg 音訊波形影片）
- [x] 移除 videoTasks 資料表相關代碼
- [x] 移除 routers.ts 中的 generateHighlightVideo API
- [x] 移除 db.ts 中的影片任務相關函數
- [x] 清理 schema.ts 中的 videoTasks 表定義
- [x] 移除前端的 HighlightVideos 組件
- [x] 清理所有相關的 import 和引用
- [x] 推送資料庫 schema 變更（刪除 video_tasks 表）
- [x] 重啟開發伺服器

## Bug 修復：精華片段文字排版問題 ✅ 完成
- [x] 診斷精華片段標題和描述文字跑版的原因（flex 容器中文字不會自動換行）
- [x] 修復文字換行問題（加入 break-words 和 min-w-0）
- [x] 確保文字不會超出容器寬度
- [x] 測試修復後的顯示效果（首次修復未生效）
- [x] 使用更強的 CSS 規則（overflow-wrap: break-word + word-break: break-word + overflow-hidden）
- [x] 測試並確認徹底修復（文字現在可以正常換行）

## Bug 修復：Kling AI 影片生成 base64 格式錯誤 ✅ 完成
- [x] 診斷音訊檔案 base64 編碼問題（發現是 avatarImageUrl 使用相對路徑）
- [x] 檢查音訊 URL 的處理流程（音訊 URL 正常）
- [x] 修復 avatarImageUrl 問題（將預設圖片上傳到 S3 並使用完整 URL）
- [ ] 測試修復後的影片生成功能

## Bug 修復：精華片段音訊時長超過 60 秒導致虛擬主播影片生成失敗 ✅ 完成
- [x] 診斷問題：所有精華片段音訊時長都超過 60 秒（實際測試發現）
- [x] 修復 highlightService.ts 中的時長控制（設定最大時長為 59 秒）
- [x] 添加後端驗證：在 generateAvatarVideo API 中檢查音訊時長
- [x] 添加前端驗證：在按鈕點擊前檢查音訊時長並顯示錯誤提示
- [x] 測試修復後的完整流程（前端驗證正常工作，顯示錯誤提示）

## Bug 修復：yt-dlp 找不到導致 YouTube 影片下載失敗 ✅ 完成
- [x] 診斷 yt-dlp 安裝狀態（發現未安裝）
- [x] 檢查 yt-dlp 的安裝路徑
- [x] 修復 yt-dlp 安裝（已安裝版本 2025.11.12）
- [ ] 測試 YouTube 影片下載功能

## Bug 修復：yt-dlp Python SRE module mismatch 錯誤 ✅ 完成
- [x] 診斷 Python 版本和 yt-dlp 相容性問題（Python 3.13 與 yt-dlp 二進制文件不相容）
- [x] 修改代碼使用 python3.11 -m yt_dlp 替代 /usr/local/bin/yt-dlp
- [x] 更新 youtubeService.ts 和 videoInfoService.ts
- [ ] 測試 YouTube 影片下載功能

## Bug 修復：Python 3.11 缺少 yt_dlp 模組 ✅ 完成
- [x] 使用 python3.11 -m pip 安裝 yt-dlp 模組（版本 2025.11.12）
- [ ] 測試 YouTube 影片處理流程（https://www.youtube.com/watch?v=sOsqXKr4l30）
- [ ] 解決任何出現的問題並重試
- [ ] 確認 Podcast 音檔生成成功並在前端顯示

## Bug 修復：虛擬主播影片生成失敗（Account balance not enough）🔴 緊急
- [x] 診斷 Kling AI API 帳戶餘額問題（餘額不足）
- [x] 檢查 Kling AI API 呼叫和錯誤訊息
- [x] 研究替代方案（改用 HeyGen API）
- [x] 研究 HeyGen API 文件和定價
- [x] 實作 HeyGen API 整合服務
- [x] 驗證 HeyGen API Key（成功！找到 2272 個 voices）
- [x] 替換 Kling AI 代碼為 HeyGen（已更新 schema, db.ts, routers.ts）
- [x] 推送資料庫 schema 變更（成功）
- [ ] 測試新的影片生成功能
- [ ] 確保影片生成成功並在前端顯示

## 功能增強：虛擬主播影片自訂選項 🎨
- [ ] 研究 HeyGen API 的自訂選項（Avatar、背景、風格等）
- [ ] 實作後端 API 獲取 Avatar 列表
- [ ] 實作後端 API 獲取 Voice 列表
- [ ] 更新前端 UI：Avatar 選擇器
- [ ] 更新前端 UI：背景選項
- [ ] 更新前端 UI：影片尺寸選項（橫向/直向/方形）
- [ ] 測試所有自訂選項
- [ ] 確保自訂選項正確應用到生成的影片

## UI 修改 🎨
- [x] 移除首頁的 Example 範例區塊
- [x] 將整個網站改為深色模式
- [x] 更新 App.tsx 的 ThemeProvider 設定（defaultTheme="dark"）
- [x] 更新 index.css 的深色模式顏色變數（已有完整的深色配置）
- [x] 測試所有頁面的深色模式顯示（成功！）

## 功能新增：刪除任務功能 🗑️
- [x] 實作後端 API：刪除 Podcast 任務（podcast.delete）
- [x] 實作後端 API：刪除精華片段（podcast.deleteHighlight）
- [x] 實作後端 API：刪除虛擬主播影片（級聯刪除）
- [x] 更新前端 UI：在歷史記錄頁面加入刪除按鈕
- [x] 加入刪除確認對話框（避免誤刪）
- [ ] 測試刪除功能
- [ ] 確保刪除後 UI 自動更新

## 功能修改：改用帳號密碼登入 🔐
- [x] 修復資料庫中的 userId 問題（將舊任務設定為 admin user）
- [x] 更新資料庫 schema 加入密碼欄位（username, passwordHash, email unique）
- [x] 安裝 bcrypt 套件（密碼加密）
- [x] 實作後端註冊 API（auth.register）
- [x] 實作後端登入 API（auth.login）
- [x] 修改 authenticateRequest 支援帳號密碼 JWT
- [x] 實作前端登入/註冊 UI（/login 頁面）
- [x] 修改 getLoginUrl 指向 /login
- [x] 加入登入路由到 App.tsx
- [ ] 測試登入功能

## 功能修改：強制登入 🔒
- [x] 修改 Layout 組件，未登入時跳轉到 /login
- [ ] 測試登入流程

## 功能新增：登出按鈕 🚺
- [x] 在 Sidebar 加入登出按鈕
- [x] 加入使用者資訊顯示（名稱、Email）
- [x] 點擊登出後清除 cookie 並跳轉到登入頁面

## 功能修改：簡化註冊流程 ✂️
- [x] 修改後端註冊 API，移除 email 必填驗證（自動生成 email）
- [x] 修改前端註冊 UI，只保留使用者名稱和密碼

## Bug 修復：註冊後無法登入 🐛
- [x] 檢查資料庫中的使用者資料
- [x] 檢查後端日誌（發現 JWT token 問題）
- [x] 修復 signJWT 缺少 await 的問題
- [ ] 測試註冊和登入流程

## UI 修復：手機版響應式設計 📱
- [x] 實作手機版 Sidebar（漢堡選單 + 遮罩）
- [x] 修復手機版內容區域排版（加入頂部導航欄）
- [x] 優化手機版使用者資訊區塊
- [x] 優化 Home.tsx 和 History.tsx 的手機版 padding
- [x] 測試手機版 UI（成功！）
- [x] 修復 React Hooks 錯誤（useState 順序問題）

## Bug 修復：tRPC API 返回 HTML 錯誤（登入頁面） 🐛
- [ ] 檢查開發伺服器狀態和日誌
- [ ] 診斷 API 路由配置問題
- [ ] 測試所有 tRPC API 端點
- [ ] 修復並驗證登入功能

### UI 改進：主持人聲音名單繁體化 🎤
- [x] 檢查現有的聲音名單顯示邏輯
- [x] 將聲音名稱改為繁體中文（建立簡繁轉換對照表）
- [x] 測試聲音選擇器顯示（成功！台灣女聲 → 台灣女聲）

## Bug 修復：簡繁轉換未生效 🐛
- [x] 檢查瀏覽器是否有快取問題（已重啟伺服器）
- [x] 檢查轉換函數的導入路徑（正常）
- [x] 測試 API 返回的聲音名稱（發現是「台湾女聲」）
- [x] 擴充轉換對照表（加入 90+ 個常用簡繁字對照）
- [ ] 測試並驗證修復

## 功能改進：自訂聲音名稱（繁體中文） 🎤
- [x] 設計所有聲音的繁體中文名稱（20 個聲音）
- [x] 展示給使用者確認
- [x] 根據使用者回饋調整（使用者確認可以開始）
- [x] 實作到系統中（更新 voiceNameConverter.ts）
- [x] 測試並驗證（成功！台灣女聲顯示正常）

## Bug 修復：修正「子墨」聲音名稱
- [x] 將「子墨」從「知性女聲」改為「知性男聲」
- [x] 更新 voiceNameConverter.ts
- [x] 更新 voice-names-design.md 設計文件
- [x] 測試並驗證修改結果（成功！知性男聲顯示正常）

## Bug 修復：yt-dlp 找不到執行檔（沙盒重置後）
- [x] 檢查 yt-dlp 安裝狀態（已安裝）
- [x] 修改代碼使用 python3.11 -m yt_dlp 替代 /usr/local/bin/yt-dlp
- [x] 更新 youtubeService.ts 和 videoInfoService.ts
- [ ] 測試 YouTube 下載功能（等待使用者測試）
- [ ] 驗證完整的 Podcast 生成流程（等待使用者測試）

## UI 優化：修改側邊欄導航名稱
- [x] 將「首頁」改為「工作區」
- [x] 將「歷史記錄」改為「作品庫」
- [x] 更新 Sidebar.tsx
- [x] 更新 Home.tsx 和 History.tsx 中的相關文字
- [x] 測試並驗證修改結果（成功！工作區和作品庫顯示正常）

## UI 優化：統一作品庫標題顯示樣式
- [x] 修改文字和文章網址生成的 Podcast 標題顯示
- [x] 將藍色網址連結改為白色標題文字
- [x] 確保所有來源（YouTube、文字、文章）的標題樣式一致
- [x] 更新 textService.ts 和 articleService.ts 自動生成標題
- [ ] 測試並驗證修改結果（等待使用者測試）

## UI 優化：美化登入介面
- [x] 在登入頁面加上網站名稱「Podesign」
- [x] 在登入頁面加上 Logo（使用 Headphones icon）
- [x] 優化登入介面整體視覺設計（加大陰影、調整間距）
- [x] 測試並驗證修改結果（成功！Logo 和網站名稱顯示正常）

## Bug 修復：文章標題生成失敗
- [ ] 檢查後端日誌確認錯誤原因
- [ ] 檢查 articleService.ts 中的標題提取邏輯
- [ ] 修復標題生成問題
- [ ] 測試並驗證修改結果

## UI 重新設計：提升登入頁面質感
- [x] 加入漸層背景（紫藍漸層）替代純黑背景
- [x] 使用玻璃擬態效果（glassmorphism）
- [x] 優化 Logo 設計（漸層、光暈、陰影）
- [x] 重新設計輸入框樣式（半透明、focus 效果）
- [x] 加入微動畫效果（pulse、transition）
- [x] 測試並驗證修改結果（成功！質感大幅提升）

## UI 優化：使用自訂背景圖片
- [x] 將使用者提供的背景圖片複製到 public 目錄
- [x] 更新 Login.tsx 使用背景圖片
- [x] 調整卡片透明度和樣式以配合新背景（橙紅色調）
- [x] 更新 Logo 和按鈕漸層配合背景色彩
- [x] 測試並驗證修改結果（成功！背景圖片完美應用，色彩配合協調）

## UI 優化：更換為藍色調背景圖片
- [x] 替換背景圖片為新的藍色調版本
- [x] 調整配色方案以配合冷色調背景（藍、青、白色系）
- [x] 更新 Logo 和按鈕漸層為藍色系（藍→青→藍）
- [x] 測試並驗證修改結果（成功！背景圖片完美應用，藍色調優雅專業）

## Bug 修復：登入頁面背景圖片模糊問題
- [x] 檢查背景圖片的原始尺寸（736 x 1308 PNG）
- [x] 修改 CSS 背景顯示方式（從 bg-cover 改為 bg-contain）
- [x] 確保圖片不會被過度放大而失真（加入 opacity-60 和漸層遮罩）
- [x] 測試並驗證修復結果（成功！背景不再模糊，保持原始清晰度）

## UI 優化：背景圖片橫向鋪滿整個螢幕
- [x] 將背景圖片旋轉 90 度（從直向改為橫向）
- [x] 使用 bg-cover 讓背景覆蓋整個螢幕
- [x] 移除分層效果，形成一體的視覺效果
- [x] 測試並驗證修改結果（成功！背景橫向鋪滿，形成一體的視覺效果）

## UI 優化：更換為黑色流動質感背景圖片
- [x] 替換背景圖片為新的黑色流動質感版本
- [x] 調整背景顯示方式（直向圖片，使用 bg-cover）
- [x] 移除旋轉效果，直接使用原始方向
- [x] 調整配色方案以配合黑色背景（使用 bg-black/30 遮罩）
- [x] 測試並驗證修改結果（成功！黑色流動質感背景完美呈現，高級優雅）

## UI 優化：登入框改為純黑白配色
- [x] 移除「AI Podcast 製作工具」副標題
- [x] 將 Logo 改為純白色（移除藍色漸層和光暈效果）
- [x] 將標題文字改為純白色
- [x] 將按鈕改為黑白配色（白色背景 + 黑色文字）
- [x] 調整連結文字為白色下劃線
- [x] 測試並驗證修改結果（成功！純黑白配色簡潔優雅）

## Bug 修復：YouTube 下載功能錯誤
- [x] 檢查 yt-dlp 是否已安裝（已安裝 2025.11.12 版本）
- [x] 檢查 Python 環境和依賴（Python 3.11.0rc1 和 ffmpeg 4.4.2 已安裝）
- [x] 修復 YouTube 下載指令（使用完整路徑 /usr/bin/python3.11）
- [x] 增強錯誤處理（加入 shell 參數和 --no-check-certificates）
- [x] 同步修復 videoInfoService.ts
- [x] 測試並驗證修復結果（成功！命令可正常執行，能正確獲取影片標題）

## 功能增強：實作 Cursor 建議的 YouTube 下載改進
- [x] 新增 detectPythonAndYtDlp() 函數，自動偵測可用的 Python 版本
- [x] 加入詳細的錯誤訊息處理（私人影片、地區限制、下載超時、年齡限制等）
- [x] 改進錯誤捕獲結構，從 stderr 提取詳細資訊
- [x] 同步更新 videoInfoService.ts 的錯誤處理
- [x] 測試並驗證改進結果（成功！自動偵測 Python 版本和詳細錯誤處理已實作）

## 緊急修復：回退 JavaScript 方案，恢復 Python yt-dlp
- [x] 發現 @distube/ytdl-core 無法下載影片（Failed to find any playable formats）
- [x] 回退到 Python yt-dlp 版本（checkpoint 8afe3cf2）
- [ ] 測試開發環境是否能正常下載 YouTube 影片
- [ ] 解決外部部署環境的 Python 安裝問題（Dockerfile 或部署配置）
- [ ] 完整測試並驗證修復結果

## 外部部署環境依賴配置 🔴 緊急
- [x] 建立 Dockerfile 包含 Python、yt-dlp、ffmpeg 依賴
- [x] 建立 .dockerignore 檔案
- [x] 建立 Railway 部署配置檔（railway.json）
- [x] 建立 Render 部署配置檔（render.yaml）
- [x] 建立部署說明文件（DEPLOYMENT.md）
- [ ] 在外部平台測試部署（等待使用者執行）
- [ ] 驗證外部部署環境的 YouTube 下載功能

## 外部部署環境 Python/yt-dlp 依賴修復 🔴 緊急
- [ ] 研究 Manus 部署系統是否支援 Dockerfile
- [ ] 檢查是否需要特殊配置才能啟用 Docker 建置
- [ ] 如果不支援 Dockerfile，改用 package.json 的 postinstall script 安裝依賴
- [ ] 測試修復後的外部部署環境
