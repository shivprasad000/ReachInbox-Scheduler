import { Queue } from "bullmq";
import { createRedisConnection } from "../redis";

export const EMAIL_QUEUE_NAME = "email-send";

export interface EmailJobData {
  emailJobId: string; // our Postgres EmailJob.id — used as the BullMQ jobId too
  sender: string;
  recipient: string;
  subject: string;
  body: string;
}

// Dedicated connection for the Queue producer side (separate from the
// worker's connection, per BullMQ's recommendation).
export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { age: 3600 * 24 * 7 }, // keep 7 days for dashboard/debug
    removeOnFail: false,
  },
});

/**
 * Schedules (or re-schedules) a send by adding a BullMQ delayed job.
 *
 * Idempotency: we use the EmailJob's own Postgres id as the BullMQ jobId.
 * BullMQ silently no-ops if a job with that id already exists in the
 * queue, so calling this twice for the same email (e.g. a retry on an
 * API error) can never create a duplicate send.
 */
export async function enqueueEmailSend(
  data: EmailJobData,
  scheduledAt: Date
): Promise<void> {
  const delay = Math.max(0, scheduledAt.getTime() - Date.now());
  await emailQueue.add(EMAIL_QUEUE_NAME, data, {
    jobId: data.emailJobId,
    delay,
  });
}
