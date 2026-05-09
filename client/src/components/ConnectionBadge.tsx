import { ConnectionState } from '../lib/connection.js';

export function ConnectionBadge({ state }: { state: ConnectionState }) {
  if (state === 'connected') return null;
  if (state === 'reconnecting') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800 animate-pulse">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        reconnecting
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
      slot open
    </span>
  );
}
