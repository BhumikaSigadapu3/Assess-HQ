import Redis from "ioredis";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";

let client = null;

export const getRedis = () => {
  if (!env.redisUrl) return null;
  if (!client) {
    client = new Redis(env.redisUrl, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      lazyConnect: true
    });
    client.on("error", (err) => {
      logger.error("Redis connection error", err);
    });
  }
  return client;
};

export const closeRedis = async () => {
  if (client) {
    await client.quit();
    client = null;
  }
};
