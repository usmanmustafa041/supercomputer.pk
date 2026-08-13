import { recentAuditEntries } from "@/lib/auth/audit";

export default async function AuditPage() {
  const entries = await recentAuditEntries();
  return (
    <main className="shell py-8 admin-screen">
      <div className="admin-heading"><div><p className="admin-kicker">Security and changes</p><h1>Audit log</h1></div><span className="admin-count">{entries.length}</span></div>
      <div className="admin-table">
        <div className="admin-table-head"><span>When</span><span>Action</span><span>Actor</span><span>Target</span></div>
        {entries.map((entry) => <div className="admin-table-row" key={entry.id}>
          <span className="t-data text-[11px]">{new Date(entry.created_at).toLocaleString("en-PK")}</span>
          <strong>{entry.action}</strong>
          <span className="text-[12px] text-ink-2">{entry.actor_email ?? "System"}</span>
          <span className="text-[12px] text-ink-2">{entry.target ?? "-"}</span>
        </div>)}
      </div>
    </main>
  );
}
