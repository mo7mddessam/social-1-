import Redis from "ioredis";
import { config } from "./config";

export const redis = new Redis(config.redisUrl, {
  lazyConnect: true,
  maxRetriesPerRequest: 2
});

export async function connectRedis(): Promise<void> {
  if (redis.status === "wait") await redis.connect();
  await redis.ping();
}
