import { useGameStore } from '../store.js';

export function LobbyPage() {
  const room = useGameStore((s) => s.room);
  const session = useGameStore((s) => s.session);
  const startGame = useGameStore((s) => s.startGame);
  const leaveRoom = useGameStore((s) => s.leaveRoom);

  if (!room || !session) {
    return (
      <div className="felt-bg flex min-h-screen items-center justify-center text-white">
        Loading lobby…
      </div>
    );
  }

  const isHost = room.hostPlayerId === session.playerId;
  const filledSeats = room.seats.filter((s) => s.playerId !== null).length;
  const ready = filledSeats === room.size;
  const meName = room.seats.find((s) => s.playerId === session.playerId)?.name ?? '?';
  const teamA = room.seats.filter((s) => s.team === 'A');
  const teamB = room.seats.filter((s) => s.team === 'B');

  return (
    <div className="felt-bg min-h-screen text-white">
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <header className="rounded-xl bg-black/30 px-5 py-4 backdrop-blur-sm border border-white/10 flex items-center justify-between animate-slide-down">
          <div>
            <h1 className="font-display text-3xl font-bold text-gold">Lobby</h1>
            <p className="mt-1 text-sm text-white/70">
              You are <span className="font-semibold text-white">{meName}</span>
            </p>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-widest text-white/50">Room code</div>
            <div className="font-mono text-3xl tracking-[0.3em] text-gold-light">{room.roomId}</div>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-4">
          <TeamColumn label="Team A" team="A" seats={teamA} myId={session.playerId} hostId={room.hostPlayerId} />
          <TeamColumn label="Team B" team="B" seats={teamB} myId={session.playerId} hostId={room.hostPlayerId} />
        </div>

        <div className="rounded-xl bg-black/30 backdrop-blur-sm border border-white/10 px-5 py-4 flex items-center justify-between">
          <p className="text-sm text-white/80">
            <span className="font-semibold text-gold">{filledSeats}</span>
            <span className="text-white/50"> / {room.size} players seated</span>
          </p>
          <div className="flex gap-2">
            <button
              className="rounded-lg border border-white/20 px-4 py-2 text-sm hover:bg-white/10 transition-colors"
              onClick={() => leaveRoom()}
            >
              Leave
            </button>
            {isHost && (
              <button
                className="rounded-lg bg-gold px-5 py-2 text-sm font-semibold text-slate-900 shadow hover:bg-gold-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                disabled={!ready}
                onClick={() => startGame()}
              >
                {ready ? 'Start game' : 'Waiting for players…'}
              </button>
            )}
          </div>
        </div>

        {!isHost && (
          <p className="text-center text-xs italic text-white/50">
            Waiting for the host to start the game…
          </p>
        )}
      </div>
    </div>
  );
}

function TeamColumn({
  label,
  team,
  seats,
  myId,
  hostId,
}: {
  label: string;
  team: 'A' | 'B';
  seats: { seat: number; team: 'A' | 'B'; playerId: string | null; name: string | null }[];
  myId: string;
  hostId: string;
}) {
  const accent =
    team === 'A'
      ? 'border-blue-400/40 from-blue-500/20 to-blue-700/10 text-blue-200'
      : 'border-red-400/40 from-red-500/20 to-red-700/10 text-red-200';
  return (
    <div className={`rounded-xl bg-gradient-to-br ${accent} border-2 p-4 backdrop-blur-sm`}>
      <h2 className="mb-3 text-sm font-bold uppercase tracking-widest">{label}</h2>
      <ul className="space-y-2">
        {seats.map((s, i) => {
          const filled = s.playerId !== null;
          const isMe = s.playerId === myId;
          const isHost = s.playerId === hostId;
          return (
            <li
              key={s.seat}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 transition-all ${
                filled
                  ? 'border-white/20 bg-white/95 text-slate-900'
                  : 'border-white/10 bg-white/5 text-white/40 border-dashed'
              } ${isMe ? 'ring-2 ring-amber-400' : ''}`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-baseline gap-2">
                <span className={`text-[10px] uppercase ${filled ? 'text-slate-400' : 'text-white/30'}`}>
                  Seat {s.seat + 1}
                </span>
                <span className={`font-semibold ${filled ? '' : 'italic'}`}>
                  {s.name ?? 'empty'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {isHost && (
                  <span className="rounded-full bg-gold px-2 py-0.5 text-[9px] font-bold uppercase text-slate-900">
                    Host
                  </span>
                )}
                {isMe && (
                  <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[9px] font-bold uppercase text-slate-900">
                    You
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
