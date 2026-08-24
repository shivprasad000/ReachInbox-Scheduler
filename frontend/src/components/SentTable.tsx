import { SentEmail } from "../types";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    sent: "bg-emerald-100 text-emerald-700",
    failed: "bg-red-100 text-red-700",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || "bg-slate-100 text-slate-700"}`}>
      {status}
    </span>
  );
}

export default function SentTable({ rows, loading }: { rows: SentEmail[]; loading: boolean }) {
  if (loading) {
    return <div className="py-16 text-center text-slate-400 text-sm">Loading sent emails…</div>;
  }
  if (rows.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-slate-500 text-sm">No emails sent yet.</p>
        <p className="text-slate-400 text-xs mt-1">Sent emails will show up here once the worker sends them.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500 border-b border-slate-200">
            <th className="py-2 pr-4 font-medium">Email</th>
            <th className="py-2 pr-4 font-medium">Subject</th>
            <th className="py-2 pr-4 font-medium">Sent time</th>
            <th className="py-2 pr-4 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-slate-100 last:border-0">
              <td className="py-2.5 pr-4">{r.email}</td>
              <td className="py-2.5 pr-4 text-slate-600">{r.subject}</td>
              <td className="py-2.5 pr-4 text-slate-600">
                {r.sentTime ? new Date(r.sentTime).toLocaleString() : "—"}
              </td>
              <td className="py-2.5 pr-4">
                <StatusBadge status={r.status} />
                {r.status === "failed" && r.lastError && (
                  <div className="text-xs text-red-500 mt-1 max-w-xs truncate" title={r.lastError}>
                    {r.lastError}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
