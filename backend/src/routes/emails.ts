import { Router } from "express";
import type { EmailJob } from "@prisma/client";
import { prisma } from "../db/prisma";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";

export const emailsRouter = Router();

// GET /emails/scheduled — everything not yet sent (scheduled/queued/rescheduled/failed-pending-retry)
emailsRouter.get("/scheduled", requireAuth, async (req: AuthedRequest, res) => {
  const jobs = await prisma.emailJob.findMany({
    where: {
      status: { in: ["scheduled", "queued", "rescheduled"] },
      batch: { userId: req.userId },
    },
    orderBy: { scheduledAt: "asc" },
    take: 500,
  });
  res.json(
    jobs.map((j: EmailJob) => ({
      id: j.id,
      email: j.recipient,
      subject: j.subject,
      scheduledTime: j.scheduledAt,
      status: j.status,
    }))
  );
});

// GET /emails/sent — sent or failed (terminal states)
emailsRouter.get("/sent", requireAuth, async (req: AuthedRequest, res) => {
  const jobs = await prisma.emailJob.findMany({
    where: {
      status: { in: ["sent", "failed"] },
      batch: { userId: req.userId },
    },
    orderBy: { updatedAt: "desc" },
    take: 500,
  });
  res.json(
    jobs.map((j: EmailJob) => ({
      id: j.id,
      email: j.recipient,
      subject: j.subject,
      sentTime: j.sentAt,
      status: j.status,
      lastError: j.lastError,
    }))
  );
});
