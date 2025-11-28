export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // OpenAI API key for Whisper transcription
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
};
