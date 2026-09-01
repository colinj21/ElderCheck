export default function HistoryLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-7 w-32 rounded bg-paper-dim" />
        <div className="mt-2 h-4 w-56 rounded bg-paper-dim" />
      </div>
      <div className="flex gap-2">
        <div className="h-8 w-16 rounded-full bg-paper-dim" />
        <div className="h-8 w-24 rounded-full bg-paper-dim" />
      </div>
      <div className="space-y-2">
        <div className="h-20 rounded-2xl border border-line bg-white" />
        <div className="h-20 rounded-2xl border border-line bg-white" />
        <div className="h-20 rounded-2xl border border-line bg-white" />
      </div>
    </div>
  );
}
