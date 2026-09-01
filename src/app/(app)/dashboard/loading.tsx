export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div>
        <div className="h-7 w-40 rounded bg-paper-dim" />
        <div className="mt-2 h-4 w-64 rounded bg-paper-dim" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-32 rounded-2xl border border-line bg-white" />
        <div className="h-32 rounded-2xl border border-line bg-white" />
      </div>
      <div className="space-y-2">
        <div className="h-5 w-32 rounded bg-paper-dim" />
        <div className="h-16 rounded-2xl border border-line bg-white" />
        <div className="h-16 rounded-2xl border border-line bg-white" />
      </div>
    </div>
  );
}
