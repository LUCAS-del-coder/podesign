/**
 * Voice transcription helper using AssemblyAI API
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
import { AssemblyAI } from 'assemblyai';

export type TranscribeOptions = {
  audioUrl: string; // URL to the audio file (e.g., S3 URL)
  language?: string; // Optional: specify language code (e.g., "en", "es", "zh")
  prompt?: string; // Optional: custom prompt for the transcription
};

// AssemblyAI segment format (compatible with Whisper format)
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

// Response format (compatible with Whisper format)
export type WhisperResponse = {
  task: "transcribe";
  language: string;
  duration: number;
  text: string;
  segments: WhisperSegment[];
};

export type TranscriptionResponse = WhisperResponse;

export type TranscriptionError = {
  error: string;
  code: "FILE_TOO_LARGE" | "INVALID_FORMAT" | "TRANSCRIPTION_FAILED" | "UPLOAD_FAILED" | "SERVICE_ERROR";
  details?: string;
};

/**
 * Initialize AssemblyAI client
 */
const getAssemblyAIClient = (): AssemblyAI => {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    throw new Error("ASSEMBLYAI_API_KEY is not set");
  }
  return new AssemblyAI({
    apiKey,
  });
};

/**
 * Map language code to AssemblyAI language code
 */
function mapLanguageCode(lang?: string): string | undefined {
  if (!lang) return undefined;
  
  // AssemblyAI uses different language codes than OpenAI
  const langMap: Record<string, string> = {
    'zh': 'zh', // Chinese
    'en': 'en', // English
    'es': 'es', // Spanish
    'fr': 'fr', // French
    'de': 'de', // German
    'it': 'it', // Italian
    'pt': 'pt', // Portuguese
    'ru': 'ru', // Russian
    'ja': 'ja', // Japanese
    'ko': 'ko', // Korean
  };
  
  return langMap[lang.toLowerCase()] || lang;
}

/**
 * Transcribe audio to text using AssemblyAI
 * 
 * @param options - Audio data and metadata
 * @returns Transcription result or error
 */
export async function transcribeAudio(
  options: TranscribeOptions
): Promise<TranscriptionResponse | TranscriptionError> {
  try {
    // Step 1: Validate environment configuration
    if (!process.env.ASSEMBLYAI_API_KEY) {
      return {
        error: "AssemblyAI API key is not configured",
        code: "SERVICE_ERROR",
        details: "ASSEMBLYAI_API_KEY environment variable is not set"
      };
    }

    console.log(`[AssemblyAI] Starting transcription for URL: ${options.audioUrl.substring(0, 100)}...`);
    
    // Step 2: Initialize AssemblyAI client
    const client = getAssemblyAIClient();
    
    // Step 3: Submit transcription job
    // AssemblyAI can directly accept URLs, so we don't need to download the file
    const transcriptParams: any = {
      audio: options.audioUrl,
      language_code: mapLanguageCode(options.language) || undefined,
    };
    
    // Add prompt if provided (AssemblyAI uses "prompt" parameter)
    if (options.prompt) {
      transcriptParams.prompt = options.prompt;
    }
    
    console.log(`[AssemblyAI] Submitting transcription job...`);
    const transcript = await client.transcripts.transcribe(transcriptParams);
    
    // Step 4: Poll for completion (AssemblyAI handles this internally, but we can check status)
    console.log(`[AssemblyAI] Transcription job submitted, ID: ${transcript.id}`);
    console.log(`[AssemblyAI] Status: ${transcript.status}`);
    
    // Wait for transcription to complete
    // The SDK should handle polling, but we'll wait for the result
    let finalTranscript = transcript;
    const maxWaitTime = 600000; // 10 minutes
    const startTime = Date.now();
    const pollInterval = 3000; // Poll every 3 seconds
    
    while (finalTranscript.status === 'queued' || finalTranscript.status === 'processing') {
      if (Date.now() - startTime > maxWaitTime) {
        return {
          error: "Transcription timeout",
          code: "SERVICE_ERROR",
          details: "Transcription took too long to complete"
        };
      }
      
      console.log(`[AssemblyAI] Polling... Status: ${finalTranscript.status}`);
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      
      // Get updated transcript
      finalTranscript = await client.transcripts.get(finalTranscript.id);
    }
    
    // Step 5: Check for errors
    if (finalTranscript.status === 'error') {
      const errorMsg = finalTranscript.error || 'Unknown error';
      console.error(`[AssemblyAI] Transcription failed: ${errorMsg}`);
      return {
        error: "Transcription failed",
        code: "TRANSCRIPTION_FAILED",
        details: errorMsg
      };
    }
    
    if (!finalTranscript.text) {
      return {
        error: "Invalid transcription response",
        code: "SERVICE_ERROR",
        details: "Transcription service returned an empty response"
      };
    }
    
    console.log(`[AssemblyAI] Transcription successful! Language: ${finalTranscript.language_code}, Duration: ${finalTranscript.audio_duration ? Math.round(finalTranscript.audio_duration / 1000) : 0}s`);
    
    // Step 6: Convert AssemblyAI response to our format
    const segments: WhisperSegment[] = (finalTranscript.words || []).map((word: any, idx: number) => ({
      id: idx,
      seek: word.start / 1000, // Convert ms to seconds
      start: word.start / 1000,
      end: word.end / 1000,
      text: word.text || '',
      tokens: [],
      temperature: 0,
      avg_logprob: 0,
      compression_ratio: 0,
      no_speech_prob: 0,
    }));
    
    // If we have utterances, use them for better segmentation
    if (finalTranscript.utterances && finalTranscript.utterances.length > 0) {
      const utteranceSegments: WhisperSegment[] = finalTranscript.utterances.map((utterance: any, idx: number) => ({
        id: idx,
        seek: utterance.start / 1000,
        start: utterance.start / 1000,
        end: utterance.end / 1000,
        text: utterance.text || '',
        tokens: [],
        temperature: 0,
        avg_logprob: 0,
        compression_ratio: 0,
        no_speech_prob: 0,
      }));
      
      // Use utterances if available (better segmentation)
      const whisperResponse: WhisperResponse = {
        task: "transcribe",
        language: finalTranscript.language_code || "unknown",
        duration: finalTranscript.audio_duration ? Math.round(finalTranscript.audio_duration / 1000) : 0,
        text: finalTranscript.text,
        segments: utteranceSegments,
      };
      
      return whisperResponse;
    }
    
    const whisperResponse: WhisperResponse = {
      task: "transcribe",
      language: finalTranscript.language_code || "unknown",
      duration: finalTranscript.audio_duration ? Math.round(finalTranscript.audio_duration / 1000) : 0,
      text: finalTranscript.text,
      segments: segments,
    };
    
    return whisperResponse;

  } catch (error) {
    // Handle unexpected errors
    console.error(`[AssemblyAI] Error:`, error);
    
    if (error instanceof Error) {
      if (error.message.includes("API key") || error.message.includes("authentication")) {
        return {
          error: "AssemblyAI API authentication failed",
          code: "SERVICE_ERROR",
          details: `Please check ASSEMBLYAI_API_KEY: ${error.message}`
        };
      }
      if (error.message.includes("rate limit")) {
        return {
          error: "AssemblyAI API rate limit exceeded",
          code: "SERVICE_ERROR",
          details: "Please try again later"
        };
      }
      if (error.message.includes("file size") || error.message.includes("too large")) {
        return {
          error: "Audio file exceeds maximum size limit",
          code: "FILE_TOO_LARGE",
          details: error.message
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
