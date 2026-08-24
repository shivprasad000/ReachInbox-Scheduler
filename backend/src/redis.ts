import IORedis from "ioredis";
import { config } from "./config";

// BullMQ requires maxRetriesPerRequest: null on the connection it manages.
// We reuse one connection for the queue and a second for the worker/rate
// limiter, which is the pattern BullMQ recommends.
export function createRedisConnection() {
  return new IORedis(config.redisUrl, {
    maxRetriesPerRequest: null,
  });
}

export const redis = createRedisConnection();
