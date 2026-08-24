import { Redis } from "ioredis";
import { config } from "../config";

/**
 * Per-sender, per-hour-window rate limiting backed by Redis.
 *
 * Key shape: rate:{sender}:{hourWindowStartMs}
 * A Lua script does the "read current count, and only increment if under
 * the limit" check atomically, so it stays correct even with multiple
 * worker processes/instances pulling from the same BullMQ queue.
 */

const CHECK_AND_INCR_SCRIPT = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])
local current = tonumber(redis.call("GET", key) or "0")
if current >= limit then
  return 0
end
redis.call("INCR", key)
redis.call("EXPIRE", key, ttl)
return 1
`;

export function hourWindowStart(date: Date): number {
  const ms = date.getTime();
  return ms - (ms % 3600000);
}

export function nextHourWindowStart(date: Date): number {
  return hourWindowStart(date) + 3600000;
}

function rateKey(sender: string, windowStartMs: number): string {
  return `rate:${sender}:${windowStartMs}`;
}

export class RateLimiter {
  constructor(
    private redis: Redis,
    private limitPerHour: number = config.maxEmailsPerHourPerSender
  ) {}

  /**
   * Attempts to reserve one send slot for `sender` in the hour window
   * containing `at`. Returns true if the slot was reserved (caller may
   * proceed to send), false if the hourly cap is already reached.
   */
  async tryReserve(sender: string, at: Date = new Date()): Promise<boolean> {
    const windowStart = hourWindowStart(at);
    const key = rateKey(sender, windowStart);
    const result = (await this.redis.eval(
      CHECK_AND_INCR_SCRIPT,
      1,
      key,
      this.limitPerHour,
      3600 // TTL seconds, so stale window keys clean themselves up
    )) as number;
    return result === 1;
  }

  async currentCount(sender: string, at: Date = new Date()): Promise<number> {
    const windowStart = hourWindowStart(at);
    const val = await this.redis.get(rateKey(sender, windowStart));
    return val ? parseInt(val, 10) : 0;
  }
}
