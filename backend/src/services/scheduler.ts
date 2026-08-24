import { config } from "../config";
import { hourWindowStart } from "./rateLimiter";

export interface PlannedSend {
  recipient: string;
  sender: string;
  scheduledAt: Date;
}

/**
 * Computes a scheduledAt for every recipient up front, so the dashboard
 * has a sensible "Scheduled time" to show immediately after Compose.
 *
 * Strategy: round-robin recipients across the configured senders. For
 * each sender, walk forward from `startTime` in steps of `delayMs`. If a
 * sender's hour window already holds `hourlyLimit` sends, jump that
 * sender straight to the start of the next hour window before continuing.
 * This is a planning-time estimate only — the actual authoritative
 * enforcement happens in the worker via Redis counters, since real send
 * timing can shift (retries, restarts, etc).
 */
export function planSendTimes(
  recipients: string[],
  startTime: Date,
  delayMs: number,
  hourlyLimit: number,
  senders: string[] = config.defaultSenders
): PlannedSend[] {
  const senderState = new Map<string, { nextAt: number; windowStart: number; windowCount: number }>();
  for (const s of senders) {
    senderState.set(s, {
      nextAt: startTime.getTime(),
      windowStart: hourWindowStart(startTime),
      windowCount: 0,
    });
  }

  const plan: PlannedSend[] = [];
  recipients.forEach((recipient, i) => {
    const sender = senders[i % senders.length];
    const state = senderState.get(sender)!;

    let candidate = new Date(state.nextAt);
    let windowStart = hourWindowStart(candidate);
    if (windowStart !== state.windowStart) {
      state.windowStart = windowStart;
      state.windowCount = 0;
    }
    if (state.windowCount >= hourlyLimit) {
      // This sender's current hour is full — jump to the next hour.
      state.windowStart += 3600000;
      candidate = new Date(state.windowStart);
      state.windowCount = 0;
    }

    plan.push({ recipient, sender, scheduledAt: candidate });

    state.windowCount += 1;
    state.nextAt = candidate.getTime() + delayMs;
  });

  return plan;
}
