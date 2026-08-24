import { Router } from "express";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { prisma } from "../db/prisma";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { planSendTimes } from "../services/scheduler";
import { enqueueEmailSend } from "../queues/emailQueue";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

export const scheduleRouter = Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function extractEmails(fileBuffer: Buffer): string[] {
  const text = fileBuffer.toString("utf-8");
  // Works for both a plain newline-separated list and a CSV with an
  // "email" column — we just scan every cell/token for something
  // email-shaped, which is robust to whatever the lead file looks like.
  let rows: string[][];
  try {
    rows = parse(text, { skip_empty_lines: true, relax_column_count: true });
  } catch {
    rows = text.split(/\r?\n/).map((line) => [line]);
  }
  const found = new Set<string>();
  for (const row of rows) {
    for (const cell of row) {
      const trimmed = (cell || "").trim();
      if (EMAIL_REGEX.test(trimmed)) found.add(trimmed);
    }
  }
  return Array.from(found);
}

/**
 * POST /schedule
 * multipart/form-data:
 *   file: CSV/text of leads
 *   subject, body: strings
 *   startTime: ISO string
 *   delayMs: number (min delay between sends)
 *   hourlyLimit: number (per-sender cap)
 */
scheduleRouter.post(
  "/",
  requireAuth,
  upload.single("file"),
  async (req: AuthedRequest, res) => {
    try {
      const { subject, body, startTime, delayMs, hourlyLimit } = req.body;
      if (!req.file) return res.status(400).json({ error: "CSV/text file is required" });
      if (!subject || !body || !startTime) {
        return res.status(400).json({ error: "subject, body and startTime are required" });
      }

      const recipients = extractEmails(req.file.buffer);
      if (recipients.length === 0) {
        return res.status(400).json({ error: "No valid email addresses found in file" });
      }

      const delay = Math.max(0, parseInt(delayMs, 10) || 2000);
      const cap = Math.max(1, parseInt(hourlyLimit, 10) || 200);
      const start = new Date(startTime);
      if (isNaN(start.getTime())) {
        return res.status(400).json({ error: "startTime is not a valid date" });
      }

      const plan = planSendTimes(recipients, start, delay, cap);

      const batch = await prisma.emailBatch.create({
        data: {
          userId: req.userId!,
          subject,
          body,
          startTime: start,
          delayMs: delay,
          hourlyLimit: cap,
        },
      });

      // Create rows, then enqueue — jobId == row id makes re-running this
      // request safe (e.g. a client retry after a network blip on the
      // enqueue step below), since BullMQ dedupes by jobId.
      const created = await prisma.$transaction(
        plan.map((p) =>
          prisma.emailJob.create({
            data: {
              batchId: batch.id,
              recipient: p.recipient,
              subject,
              body,
              sender: p.sender,
              scheduledAt: p.scheduledAt,
              status: "queued",
            },
          })
        )
      );

      for (const job of created) {
        await enqueueEmailSend(
          {
            emailJobId: job.id,
            sender: job.sender,
            recipient: job.recipient,
            subject: job.subject,
            body: job.body,
          },
          job.scheduledAt
        );
      }

      res.status(201).json({
        batchId: batch.id,
        recipientsDetected: recipients.length,
        jobs: created.length,
      });
    } catch (err: any) {
      console.error("[schedule] error:", err);
      res.status(500).json({ error: "Failed to schedule batch", detail: String(err?.message ?? err) });
    }
  }
);
