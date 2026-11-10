import { createHmac, randomInt } from "node:crypto";
import { config } from "../config";
import { redis } from "../redis";
import { sendEmail } from "./emailService";

function digest(email: string, otp: string): string {
  return createHmac("sha256", config.otpHashSecret)
    .update(`${email.toLowerCase()}:${otp}`).digest("hex");
}

function key(purpose: string, email: string): string {
  return `social:otp:${purpose}:${email.toLowerCase()}`;
}

export async function issueOtp(email: string, purpose: "verify-email" | "reset-password"): Promise<void> {
  const cooldownKey = key("cooldown", `${purpose}:${email}`);
  const ttl = await redis.ttl(cooldownKey);
  if (ttl > 0) throw new Error(`Please wait ${ttl} seconds before requesting another code.`);

  const otp = randomInt(100000, 1000000).toString();
  await redis.set(key(purpose, email), digest(email, otp), "EX", config.otpTtlSeconds);
  await redis.del(key("attempts", `${purpose}:${email}`));
  await redis.set(cooldownKey, "1", "EX", config.otpResendCooldownSeconds);

  try {
    await sendEmail(
      email,
      purpose === "verify-email" ? "Verify your Social App email" : "Reset your Social App password",
      `Your verification code is ${otp}. It expires in ${Math.ceil(config.otpTtlSeconds / 60)} minute(s). If you did not request it, ignore this email.`
    );
  } catch (error) {
    await redis.del(key(purpose, email), cooldownKey);
    throw error;
  }
}

export async function consumeOtp(
  email: string, otp: string, purpose: "verify-email" | "reset-password"
): Promise<boolean> {
  const otpKey = key(purpose, email);
  const attemptKey = key("attempts", `${purpose}:${email}`);
  const stored = await redis.get(otpKey);
  if (!stored) return false;

  const attempts = await redis.incr(attemptKey);
  if (attempts === 1) await redis.expire(attemptKey, config.otpTtlSeconds);
  if (attempts > config.otpMaxAttempts) {
    await redis.del(otpKey, attemptKey);
    return false;
  }

  if (!/^\d{6}$/.test(otp) || digest(email, otp) !== stored) {
    if (attempts >= config.otpMaxAttempts) await redis.del(otpKey, attemptKey);
    return false;
  }

  await redis.del(otpKey, attemptKey);
  return true;
}
