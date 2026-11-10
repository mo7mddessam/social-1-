import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 3000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  dbHost: process.env.DB_HOST ?? "127.0.0.1",
  dbPort: Number(process.env.DB_PORT ?? 3306),
  dbName: process.env.DB_NAME ?? "social_app",
  dbUser: process.env.DB_USER ?? "root",
  dbPassword: process.env.DB_PASSWORD ?? "",
  redisUrl: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
  accessSecret: process.env.ACCESS_TOKEN_SECRET ?? "",
  refreshSecret: process.env.REFRESH_TOKEN_SECRET ?? "",
  otpHashSecret: process.env.OTP_HASH_SECRET ?? "",
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL ?? "15m",
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 7),
  otpTtlSeconds: Number(process.env.OTP_TTL_SECONDS ?? 300),
  otpMaxAttempts: Number(process.env.OTP_MAX_ATTEMPTS ?? 5),
  otpResendCooldownSeconds: Number(process.env.OTP_RESEND_COOLDOWN_SECONDS ?? 60),
  smtpHost: process.env.SMTP_HOST ?? "smtp.gmail.com",
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpSecure: (process.env.SMTP_SECURE ?? "false") === "true",
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPass: process.env.SMTP_PASS ?? "",
  emailFrom: process.env.EMAIL_FROM ?? "",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? ""
};

export function validateConfig(): void {
  const required: Array<keyof typeof config> = [
    "accessSecret", "refreshSecret", "otpHashSecret",
    "smtpUser", "smtpPass", "emailFrom"
  ];
  for (const key of required) {
    if (!config[key]) throw new Error(`Missing environment configuration: ${key}`);
  }
}
