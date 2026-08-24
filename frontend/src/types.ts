export interface Me {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface ScheduledEmail {
  id: string;
  email: string;
  subject: string;
  scheduledTime: string;
  status: "scheduled" | "queued" | "rescheduled";
}

export interface SentEmail {
  id: string;
  email: string;
  subject: string;
  sentTime: string | null;
  status: "sent" | "failed";
  lastError?: string | null;
}
