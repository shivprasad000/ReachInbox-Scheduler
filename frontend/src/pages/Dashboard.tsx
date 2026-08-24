import { useEffect, useState, useCallback } from "react";
import { api } from "../api/client";
import { Me, ScheduledEmail, SentEmail } from "../types";
import Header from "../components/Header";
import ScheduledTable from "../components/ScheduledTable";
import SentTable from "../components/SentTable";
import ComposeModal from "../components/ComposeModal";

export default function Dashboard({ user }: { user: Me }) {
  const [tab, setTab] = useState<"scheduled" | "sent">("scheduled");
  const [scheduled, setScheduled] = useState<ScheduledEmail[]>([]);
  const [sent, setSent] = useState<SentEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [s, sn] = await Promise.all([
        api.get<ScheduledEmail[]>("/emails/scheduled"),
        api.get<SentEmail[]>("/emails/sent"),
      ]);
      setScheduled(s.data);
      setSent(sn.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    // Light polling so the dashboard reflects worker activity without a manual refresh.
    const id = setInterval(refresh, 10000);
    return () => clearInterval(id);
  }, [refresh]);

  return (
    <div className="min-h-screen">
      <Header user={user} />

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setTab("scheduled")}
              className={`px-4 py-1.5 text-sm rounded-md font-medium transition ${
                tab === "scheduled" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"
              }`}
            >
              Scheduled Emails
            </button>
            <button
              onClick={() => setTab("sent")}
              className={`px-4 py-1.5 text-sm rounded-md font-medium transition ${
                tab === "sent" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"
              }`}
            >
              Sent Emails
            </button>
          </div>

          <button
            onClick={() => setShowCompose(true)}
            className="px-4 py-2 text-sm rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600"
          >
            + Compose New Email
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          {tab === "scheduled" ? (
            <ScheduledTable rows={scheduled} loading={loading} />
          ) : (
            <SentTable rows={sent} loading={loading} />
          )}
        </div>
      </main>

      {showCompose && (
        <ComposeModal onClose={() => setShowCompose(false)} onScheduled={refresh} />
      )}
    </div>
  );
}
