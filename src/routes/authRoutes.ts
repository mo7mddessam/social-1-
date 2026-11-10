import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createHash, randomBytes } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { User } from "../models/User";
import { RefreshToken } from "../models/RefreshToken";
import { config } from "../config";
import { issueOtp, consumeOtp } from "../services/otpService";

const router = Router();
const googleClient = new OAuth2Client(config.googleClientId);

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
function createAccessToken(user: User): string {
  return jwt.sign({ sub: String(user.id), email: user.email }, config.accessSecret, {
    expiresIn: config.accessTokenTtl as jwt.SignOptions["expiresIn"]
  });
}
async function createRefreshToken(user: User): Promise<string> {
  const raw = randomBytes(48).toString("base64url");
  await RefreshToken.create({
    userId: user.id,
    tokenHash: hashToken(raw),
    expiresAt: new Date(Date.now() + config.refreshTokenTtlDays * 86400000),
    revokedAt: null
  });
  return raw;
}

router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body ?? {};
    if (typeof name !== "string" || name.trim().length < 2 ||
        typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        typeof password !== "string" || password.length < 8) {
      res.status(400).json({ message: "Provide a name, valid email, and password of at least 8 characters." }); return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (await User.findOne({ where: { email: normalizedEmail }, attributes: ["id"] })) {
      res.status(409).json({ message: "An account with this email already exists." }); return;
    }
    const user = await User.create({
      name: name.trim(), email: normalizedEmail,
      passwordHash: await bcrypt.hash(password, 12),
      isEmailVerified: false, isPrivate: false, bio: null, googleId: null
    });
    await issueOtp(user.email, "verify-email");
    res.status(201).json({ message: "Account created. Check your email for a verification code." });
  } catch (error) { next(error); }
});

router.post("/verify-email", async (req, res, next) => {
  try {
    const { email, otp } = req.body ?? {};
    if (typeof email !== "string" || typeof otp !== "string") {
      res.status(400).json({ message: "Email and OTP are required." }); return;
    }
    const user = await User.unscoped().findOne({ where: { email: email.toLowerCase() } });
    if (!user || !(await consumeOtp(email, otp, "verify-email"))) {
      res.status(400).json({ message: "Invalid or expired verification code." }); return;
    }
    await user.update({ isEmailVerified: true });
    res.json({ message: "Email verified successfully." });
  } catch (error) { next(error); }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    if (typeof email !== "string" || typeof password !== "string") {
      res.status(400).json({ message: "Email and password are required." }); return;
    }
    const user = await User.scope("withPassword").findOne({ where: { email: email.toLowerCase() } });
    if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ message: "Invalid credentials." }); return;
    }
    if (!user.isEmailVerified) {
      res.status(403).json({ message: "Verify your email before logging in." }); return;
    }
    const accessToken = createAccessToken(user);
    const refreshToken = await createRefreshToken(user);
    res.json({ accessToken, refreshToken, tokenType: "Bearer", expiresIn: config.accessTokenTtl });
  } catch (error) { next(error); }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const { refreshToken } = req.body ?? {};
    if (typeof refreshToken !== "string") { res.status(400).json({ message: "Refresh token required." }); return; }
    const record = await RefreshToken.findOne({ where: { tokenHash: hashToken(refreshToken), revokedAt: null } });
    if (!record || record.expiresAt.getTime() <= Date.now()) {
      if (record) await record.update({ revokedAt: new Date() });
      res.status(401).json({ message: "Invalid or expired refresh token." }); return;
    }
    const user = await User.findByPk(record.userId);
    if (!user) { res.status(401).json({ message: "User no longer exists." }); return; }
    // Rotate refresh token: revoke the old one and issue a new one.
    await record.update({ revokedAt: new Date() });
    const nextRefreshToken = await createRefreshToken(user);
    res.json({ accessToken: createAccessToken(user), refreshToken: nextRefreshToken, tokenType: "Bearer" });
  } catch (error) { next(error); }
});

router.post("/logout", async (req, res, next) => {
  try {
    const { refreshToken } = req.body ?? {};
    if (typeof refreshToken === "string") {
      await RefreshToken.update(
        { revokedAt: new Date() },
        { where: { tokenHash: hashToken(refreshToken), revokedAt: null } }
      );
    }
    res.json({ message: "Logged out. Refresh token revoked if it was valid." });
  } catch (error) { next(error); }
});

router.post("/forgot-password", async (req, res, next) => {
  try {
    const { email } = req.body ?? {};
    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ message: "A valid email is required." }); return;
    }
    const user = await User.findOne({ where: { email: email.toLowerCase() }, attributes: ["id", "email"] });
    if (user) await issueOtp(user.email, "reset-password");
    res.json({ message: "If an account exists for this email, a reset code has been sent." });
  } catch (error) { next(error); }
});

router.post("/reset-password", async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body ?? {};
    if (typeof email !== "string" || typeof otp !== "string" ||
        typeof newPassword !== "string" || newPassword.length < 8) {
      res.status(400).json({ message: "Email, OTP, and a new password of at least 8 characters are required." }); return;
    }
    if (!(await consumeOtp(email, otp, "reset-password"))) {
      res.status(400).json({ message: "Invalid or expired reset code." }); return;
    }
    const user = await User.unscoped().findOne({ where: { email: email.toLowerCase() } });
    if (!user) { res.status(400).json({ message: "Invalid or expired reset code." }); return; }
    await user.update({ passwordHash: await bcrypt.hash(newPassword, 12) });
    await RefreshToken.update({ revokedAt: new Date() }, { where: { userId: user.id, revokedAt: null } });
    res.json({ message: "Password reset successfully. Please log in again." });
  } catch (error) { next(error); }
});

router.post("/google", async (req, res, next) => {
  try {
    const { idToken } = req.body ?? {};
    if (!config.googleClientId || typeof idToken !== "string") {
      res.status(400).json({ message: "Google sign-in is not configured or ID token is missing." }); return;
    }
    const ticket = await googleClient.verifyIdToken({ idToken, audience: config.googleClientId });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.email_verified || !payload.sub) {
      res.status(401).json({ message: "Google account email is not verified." }); return;
    }
    let user = await User.unscoped().findOne({ where: { googleId: payload.sub } });
    if (!user) {
      user = await User.unscoped().findOne({ where: { email: payload.email.toLowerCase() } });
      if (user) await user.update({ googleId: payload.sub, isEmailVerified: true });
      else user = await User.create({
        name: payload.name ?? payload.email.split("@")[0],
        email: payload.email.toLowerCase(), googleId: payload.sub,
        passwordHash: null, isEmailVerified: true, isPrivate: false, bio: null
      });
    }
    res.json({
      accessToken: createAccessToken(user),
      refreshToken: await createRefreshToken(user),
      tokenType: "Bearer"
    });
  } catch (error) { next(error); }
});

export default router;
