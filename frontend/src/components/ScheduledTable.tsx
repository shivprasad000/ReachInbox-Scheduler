import { ScheduledEmail } from "../types";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    scheduled: "bg-slate-100 text-slate-700",
    queued: "bg-blue-100 text-blue-700",
    rescheduled: "bg-amber-100 text-amber-700",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || "bg-slate-100 text-slate-700"}`}>
      {status}
    </span>
  );
}

export default function ScheduledTable({
  rows,
  loading,
}: {
  rows: ScheduledEmail[];
  loading: boolean;
}) {
  if (loading) {
    return <div className="py-16 text-center text-slate-400 text-sm">Loading scheduled emails…</div>;
  }
  if (rows.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-slate-500 text-sm">No scheduled emails yet.</p>
        <p className="text-slate-400 text-xs mt-1">Click "Compose New Email" to schedule your first batch.</p>
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
            <th className="py-2 pr-4 font-medium">Scheduled time</th>
            <th className="py-2 pr-4 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-slate-100 last:border-0">
              <td className="py-2.5 pr-4">{r.email}</td>
              <td className="py-2.5 pr-4 text-slate-600">{r.subject}</td>
              <td className="py-2.5 pr-4 text-slate-600">
                {new Date(r.scheduledTime).toLocaleString()}
              </td>
              <td className="py-2.5 pr-4">
                <StatusBadge status={r.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
