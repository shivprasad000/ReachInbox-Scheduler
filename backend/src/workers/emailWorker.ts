import "dotenv/config";
import { Worker, DelayedError } from "bullmq";
import { createRedisConnection } from "../redis";
import { config } from "../config";
import { prisma } from "../db/prisma";
import { EMAIL_QUEUE_NAME, EmailJobData } from "../queues/emailQueue";
import { RateLimiter, nextHourWindowStart } from "../services/rateLimiter";
import { sendEmail } from "../services/mailer";

const workerConnection = createRedisConnection();
const rateLimiter = new RateLimiter(workerConnection);

/**
 * Enforces a minimum wall-clock gap between two sends handled by THIS
 * worker process. Combined with BullMQ's `limiter` option below (which
 * throttles job dispatch across the whole queue) this mimics provider
 * throttling. Documented choice: config.minDelayMsBetweenSends (default
 * 2000ms) — see README "Rate limiting & delay".
 */
let lastSendAt = 0;
async function respectMinDelay() {
  const elapsed = Date.now() - lastSendAt;
  const wait = config.minDelayMsBetweenSends - elapsed;
  if (wait > 0) {
    await new Promise((r) => setTimeout(r, wait));
  }
  lastSendAt = Date.now();
}

const worker = new Worker<EmailJobData>(
  EMAIL_QUEUE_NAME,
  async (job, token) => {
    const { emailJobId, sender, recipient, subject, body } = job.data;

    // Idempotency guard #1: if our DB already marked this job "sent",
    // a duplicate/retried BullMQ job must not send it again.
    const record = await prisma.emailJob.findUnique({ where: { id: emailJobId } });
    if (!record) {
      console.warn(`[worker] EmailJob ${emailJobId} no longer exists, skipping`);
      return;
    }
    if (record.status === "sent") {
      console.log(`[worker] EmailJob ${emailJobId} already sent, skipping (idempotent)`);
      return;
    }

    // Idempotency guard #2 / rate limit: reserve an hourly slot for this
    // sender. If the hour is full, push this job to the next hour window
    // instead of failing or dropping it, and preserve relative order by
    // keeping the same jobId (no duplicate is created).
    const reserved = await rateLimiter.tryReserve(sender);
    if (!reserved) {
      const nextWindow = nextHourWindowStart(new Date());
      await prisma.emailJob.update({
        where: { id: emailJobId },
        data: { status: "rescheduled", scheduledAt: new Date(nextWindow) },
      });
      console.log(
        `[worker] Hourly limit hit for ${sender}, rescheduling ${emailJobId} to ${new Date(
          nextWindow
        ).toISOString()}`
      );
      // Ask BullMQ to keep this exact job and re-run it at nextWindow,
      // rather than completing/duplicating it.
      await job.moveToDelayed(nextWindow, token);
      throw new DelayedError();
    }

    await respectMinDelay();

    try {
      const result = await sendEmail({
        from: sender,
        to: recipient,
        subject,
        html: body,
      });

      await prisma.emailJob.update({
        where: { id: emailJobId },
        data: {
          status: "sent",
          sentAt: new Date(),
          attempts: { increment: 1 },
          lastError: null,
        },
      });

      console.log(`[worker] Sent ${emailJobId} -> ${recipient} (${result.previewUrl})`);
    } catch (err: any) {
      await prisma.emailJob.update({
        where: { id: emailJobId },
        data: {
          status: "failed",
          attempts: { increment: 1 },
          lastError: String(err?.message ?? err),
        },
      });
      throw err; // let BullMQ's retry/backoff policy handle re-attempts
    }
  },
  {
    connection: workerConnection,
    concurrency: config.workerConcurrency, // configurable, no hardcoding
    limiter: {
      // A secondary, queue-wide throttle: at most 1 job dispatched per
      // minDelayMsBetweenSends, on top of the worker-local delay above.
      max: 1,
      duration: config.minDelayMsBetweenSends,
    },
  }
);

worker.on("failed", (job, err) => {
  console.error(`[worker] Job ${job?.id} failed:`, err.message);
});

worker.on("ready", () => {
  console.log(
    `[worker] Ready. concurrency=${config.workerConcurrency} minDelayMs=${config.minDelayMsBetweenSends} maxPerHourPerSender=${config.maxEmailsPerHourPerSender}`
  );
});

process.on("SIGTERM", async () => {
  await worker.close();
  process.exit(0);
});
