import { getRedis } from "../cache/redis.client.js";
import { logger } from "../../config/logger.js";

const memoryStore = new Map();

const UNIT_TO_SECONDS = {
  s: 1,
  m: 60,
  h: 60 * 60,
  d: 24 * 60 * 60
};

export const parseDurationToSeconds = (value, fallbackSeconds) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const match = String(value || "").trim().match(/^(\d+)([smhd])$/i);
  if (!match) return fallbackSeconds;
  return Number(match[1]) * UNIT_TO_SECONDS[match[2].toLowerCase()];
};

const namespacedKey = (namespace, key) => `${namespace}:${key}`;

const setMemoryValue = (key, value, ttlSeconds) => {
  memoryStore.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000
  });
};

const getMemoryValue = (key) => {
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value;
};

export const setTokenValue = async ({ namespace, key, value, ttlSeconds }) => {
  const storeKey = namespacedKey(namespace, key);
  const redis = getRedis();

  if (!redis) {
    setMemoryValue(storeKey, value, ttlSeconds);
    return;
  }

  try {
    await redis.set(storeKey, value, "EX", ttlSeconds);
  } catch (error) {
    logger.warn("Redis token write failed; falling back to memory", {
      namespace,
      message: error.message
    });
    setMemoryValue(storeKey, value, ttlSeconds);
  }
};

export const getTokenValue = async ({ namespace, key }) => {
  const storeKey = namespacedKey(namespace, key);
  const redis = getRedis();

  if (!redis) return getMemoryValue(storeKey);

  try {
    const value = await redis.get(storeKey);
    return value ?? getMemoryValue(storeKey);
  } catch (error) {
    logger.warn("Redis token read failed; using memory fallback", {
      namespace,
      message: error.message
    });
    return getMemoryValue(storeKey);
  }
};

export const deleteTokenValue = async ({ namespace, key }) => {
  const storeKey = namespacedKey(namespace, key);
  memoryStore.delete(storeKey);

  const redis = getRedis();
  if (!redis) return;

  try {
    await redis.del(storeKey);
  } catch (error) {
    logger.warn("Redis token delete failed", {
      namespace,
      message: error.message
    });
  }
};
