import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";

export interface AuthRequest extends Request {
  userId?: number;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) {
    res.status(401).json({ message: "Access token required." });
    return;
  }
  try {
    const payload = jwt.verify(token, config.accessSecret) as { sub: string | number };
    req.userId = Number(payload.sub);
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired access token." });
  }
}
