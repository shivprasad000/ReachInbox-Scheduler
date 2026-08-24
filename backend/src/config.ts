import dotenv from "dotenv";
dotenv.config();

function req(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  frontendUrl: req("FRONTEND_URL", "http://localhost:5173"),
  sessionSecret: req("SESSION_SECRET", "dev_session_secret"),
  jwtSecret: req("JWT_SECRET", "dev_jwt_secret"),

  databaseUrl: req("DATABASE_URL"),
  redisUrl: req("REDIS_URL", "redis://localhost:6379"),

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    callbackUrl: req("GOOGLE_CALLBACK_URL", "http://localhost:4000/auth/google/callback"),
  },

  ethereal: {
    user: process.env.ETHEREAL_USER || "",
    pass: process.env.ETHEREAL_PASS || "",
  },

  // Every scheduling knob is configurable via env, per the assignment spec.
  workerConcurrency: parseInt(process.env.WORKER_CONCURRENCY || "5", 10),
  minDelayMsBetweenSends: parseInt(process.env.MIN_DELAY_MS_BETWEEN_SENDS || "2000", 10),
  maxEmailsPerHourPerSender: parseInt(process.env.MAX_EMAILS_PER_HOUR_PER_SENDER || "200", 10),
  defaultSenders: (process.env.DEFAULT_SENDERS || "sender1@reachinbox.test")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
};
