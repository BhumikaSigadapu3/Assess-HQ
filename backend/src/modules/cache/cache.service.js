import { getRedis } from "./redis.client.js";
import { logger } from "../../config/logger.js";

export const cacheGet = async (key) => {
  const redis = getRedis();
  if (!redis) return null;
  try {
    return await redis.get(key);
  } catch (error) {
    logger.warn("cache get failed", { key, message: error.message });
    return null;
  }
};

export const cacheSet = async (key, value, ttlSeconds = 60) => {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(key, value, "EX", ttlSeconds);
  } catch (error) {
    logger.warn("cache set failed", { key, message: error.message });
  }
};

export const cacheDel = async (key) => {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(key);
  } catch (error) {
    logger.warn("cache del failed", { key, message: error.message });
  }
};
