export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // AssemblyAI API key for speech-to-text transcription
  assemblyaiApiKey: process.env.ASSEMBLYAI_API_KEY ?? "",
  // Storage configuration - AWS S3
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  awsRegion: process.env.AWS_REGION ?? "",
  awsS3Bucket: process.env.AWS_S3_BUCKET ?? "",
  awsS3PublicUrl: process.env.AWS_S3_PUBLIC_URL ?? "", // Optional: custom public URL (e.g., CloudFront)
  // Storage configuration - Cloudflare R2 (S3-compatible, free 10GB)
  cloudflareAccountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? "",
  cloudflareAccessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID ?? "",
  cloudflareSecretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY ?? "",
  cloudflareR2Bucket: process.env.CLOUDFLARE_R2_BUCKET ?? "",
  cloudflareR2PublicUrl: process.env.CLOUDFLARE_R2_PUBLIC_URL ?? "", // Optional: custom domain
  // Storage configuration - Backblaze B2 (S3-compatible, free 10GB)
  backblazeKeyId: process.env.BACKBLAZE_KEY_ID ?? "",
  backblazeApplicationKey: process.env.BACKBLAZE_APPLICATION_KEY ?? "",
  backblazeBucketName: process.env.BACKBLAZE_BUCKET_NAME ?? "",
  backblazeRegion: process.env.BACKBLAZE_REGION ?? "us-west-004",
  backblazeEndpoint: process.env.BACKBLAZE_ENDPOINT ?? "", // Optional: custom endpoint
  backblazePublicUrl: process.env.BACKBLAZE_PUBLIC_URL ?? "", // Optional: custom public URL
  // Google Gemini API for LLM (content analysis)
  googleGeminiApiKey: process.env.GOOGLE_GEMINI_API_KEY ?? "",
  // Google OAuth (optional, for Google login)
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI ?? "",
  // Manus Forge API (legacy, optional)
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
};
