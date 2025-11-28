export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // OpenAI API key for Whisper transcription
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  // Storage configuration - AWS S3 (preferred)
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  awsRegion: process.env.AWS_REGION ?? "",
  awsS3Bucket: process.env.AWS_S3_BUCKET ?? "",
  awsS3PublicUrl: process.env.AWS_S3_PUBLIC_URL ?? "", // Optional: custom public URL (e.g., CloudFront)
  // Storage configuration - Manus Forge API (fallback/legacy)
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};
