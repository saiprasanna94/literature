import { cardId, PublicGameState, PublicPlayer, RoomSummary, TeamId } from '@literature/shared';
import { useEffect, useRef, useState } from 'react';
import { AskDialog } from '../components/AskDialog.js';
import { CardView } from '../components/Card.js';
import { CardTransferLayer } from '../components/CardTransferLayer.js';
import { ClaimDialog } from '../components/ClaimDialog.js';
import { ConnectionBadge } from '../components/ConnectionBadge.js';
import { DeductionPanel } from '../components/DeductionPanel.js';
import { EventLog } from '../components/EventLog.js';
import { VictoryOverlay } from '../components/VictoryOverlay.js';
import { findSeat, seatConnectionState } from '../lib/connection.js';
import { friendlyError } from '../lib/errors.js';
import { sounds } from '../lib/sounds.js';
import { useGameStore } from '../store.js';

export function GamePage() {
  const game = useGameStore((s) => s.game);
  const room = useGameStore((s) => s.room);
  const session = useGameStore((s) => s.session);
  const ask = useGameStore((s) => s.ask);
  const claim = useGameStore((s) => s.claim);
  const takeTurn = useGameStore((s) => s.takeTurn);
  const leaveRoom = useGameStore((s) => s.leaveRoom);
  const lastError = useGameStore((s) => s.lastError);

  const [showAsk, setShowAsk] = useState(false);
  const [showClaim, setShowClaim] = useState(false);

  // Sound-effects bookkeeping. Track the highest seen seq for asks, claims,
  // turn pointer, and game status so we only play on transitions.
  const lastAskSeq = useRef(-1);
  const lastClaimSeq = useRef(-1);
  const lastTurnPlayerId = useRef<string | null | undefined>(undefined);
  const lastStatus = useRef<'in_progress' | 'finished' | 'lobby' | undefined>(undefined);

  useEffect(() => {
    if (!game || !session) return;

    // First effect run: snap refs without emitting sounds for historical events.
    if (lastAskSeq.current === -1) {
      lastAskSeq.current =
        game.asks.length > 0 ? game.asks[game.asks.length - 1]!.seq : 0;
      lastClaimSeq.current =
        game.claims.length > 0 ? game.claims[game.claims.length - 1]!.seq : 0;
      lastTurnPlayerId.current = game.currentTurnPlayerId;
      lastStatus.current = game.status;
      return;
    }

    for (const a of game.asks) {
      if (a.seq <= lastAskSeq.current) continue;
      lastAskSeq.current = a.seq;
      if (a.success) sounds.askSuccess();
      else sounds.askFail();
    }
    for (const c of game.claims) {
      if (c.seq <= lastClaimSeq.current) continue;
      lastClaimSeq.current = c.seq;
      if (c.success) sounds.claimSuccess();
      else sounds.claimFail();
    }

    if (
      lastTurnPlayerId.current !== game.currentTurnPlayerId &&
      game.currentTurnPlayerId === session.playerId &&
      game.status === 'in_progress'
    ) {
      sounds.yourTurn();
    }
    lastTurnPlayerId.current = game.currentTurnPlayerId;

    if (lastStatus.current !== 'finished' && game.status === 'finished') {
      const me = game.players.find((p) => p.id === session.playerId);
      if (me && game.winner === me.team) sounds.victory();
      else sounds.defeat();
    }
    lastStatus.current = game.status;
  }, [game, session]);

  if (!game || !session || !room) {
    return (
      <div className="felt-bg flex min-h-screen items-center justify-center text-white">
        Loading game…
      </div>
    );
  }

  const me = game.players.find((p) => p.id === session.playerId);
  if (!me) {
    return (
      <div className="felt-bg flex min-h-screen items-center justify-center text-white">
        You aren't seated in this game.
      </div>
    );
  }

  const teamA = game.players.filter((p) => p.team === 'A');
  const teamB = game.players.filter((p) => p.team === 'B');
  const myTeam = me.team;
  const setsA = game.claimedSets.filter((cs) => cs.team === 'A').length;
  const setsB = game.claimedSets.filter((cs) => cs.team === 'B').length;
  const myTurn = game.currentTurnPlayerId === me.id;
  const pendingForMe =
    !!game.pendingTurnSelection &&
    game.pendingTurnSelection.eligibleTeam === myTeam &&
    (game.yourHand?.length ?? 0) > 0 &&
    game.status === 'in_progress';

  // Opposing team is always shown at the top, your team at the bottom.
  const opposingTeam = myTeam === 'A' ? teamB : teamA;
  const friendlyTeam = myTeam === 'A' ? teamA : teamB;

  return (
    <div className="felt-bg min-h-screen text-white">
      <div className="relative mx-auto max-w-6xl space-y-4 p-4">
        <header className="flex items-center justify-between rounded-xl bg-black/30 px-4 py-3 backdrop-blur-sm border border-white/10">
          <div className="flex items-baseline gap-3">
            <h1 className="font-display text-2xl font-bold tracking-wide text-gold">Literature</h1>
            <span className="font-mono text-xs uppercase tracking-widest text-white/60">
              {game.roomId}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ScoreBadge team="A" score={setsA} active={myTeam === 'A'} />
            <span className="text-sm text-white/40">vs</span>
            <ScoreBadge team="B" score={setsB} active={myTeam === 'B'} />
          </div>
          <div className="flex items-center gap-2">
            <MuteToggle />
            <button
              className="rounded-lg border border-white/20 px-3 py-1 text-xs hover:bg-white/10 transition-colors"
              onClick={() => leaveRoom()}
            >
              Leave
            </button>
          </div>
        </header>

        <TurnBanner game={game} myTurn={myTurn} pendingForMe={pendingForMe} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <TeamPanel
              label="Opposing Team"
              team={opposingTeam[0]?.team ?? 'B'}
              players={opposingTeam}
              game={game}
              room={room}
              myId={me.id}
            />

            <TeamPanel
              label="Your Team"
              team={myTeam}
              players={friendlyTeam}
              game={game}
              room={room}
              myId={me.id}
            />

            <YourHand
              game={game}
              myTurn={myTurn}
              pendingForMe={pendingForMe}
              onAsk={() => setShowAsk(true)}
              onClaim={() => setShowClaim(true)}
              onTakeTurn={() => takeTurn()}
            />
          </div>

          <aside className="space-y-4">
            <DeductionPanel game={game} />
            <EventLog game={game} />
            {lastError && (
              <div className="rounded-lg border border-red-400/40 bg-red-900/40 p-2 text-xs text-red-100">
                {friendlyError(lastError)}
              </div>
            )}
          </aside>
        </div>

        {showAsk && (
          <AskDialog
            game={game}
            onClose={() => setShowAsk(false)}
            onSubmit={ask}
          />
        )}
        {showClaim && (
          <ClaimDialog
            game={game}
            onClose={() => setShowClaim(false)}
            onSubmit={claim}
          />
        )}

        <VictoryOverlay game={game} onLeave={() => leaveRoom()} />
        <CardTransferLayer />
      </div>
    </div>
  );
}

function MuteToggle() {
  const muted = useGameStore((s) => s.muted);
  const toggleMute = useGameStore((s) => s.toggleMute);
  return (
    <button
      onClick={toggleMute}
      title={muted ? 'Unmute sounds' : 'Mute sounds'}
      className="rounded-lg border border-white/20 px-2 py-1 text-xs hover:bg-white/10 transition-colors"
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}

function TurnBanner({
  game,
  myTurn,
  pendingForMe,
}: {
  game: PublicGameState;
  myTurn: boolean;
  pendingForMe: boolean;
}) {
  if (game.status === 'finished') return null;

  if (game.pendingTurnSelection) {
    const team = game.pendingTurnSelection.eligibleTeam;
    const colorCls =
      team === 'A'
        ? 'from-blue-500/30 to-blue-700/30 border-blue-400/40'
        : 'from-red-500/30 to-red-700/30 border-red-400/40';
    return (
      <div
        className={`rounded-xl bg-gradient-to-r ${colorCls} border px-4 py-3 backdrop-blur-sm animate-slide-up`}
      >
        {pendingForMe ? (
          <p className="font-semibold">
            Your team's turn — anyone can take it.{' '}
            <span className="text-white/80">Click "Take turn" below to play.</span>
          </p>
        ) : (
          <p>
            Waiting for <span className="font-semibold">Team {team}</span> to pick who plays next…
          </p>
        )}
      </div>
    );
  }

  if (myTurn) {
    return (
      <div className="rounded-xl bg-gradient-to-r from-emerald-400/40 to-emerald-600/40 border border-emerald-300/50 px-4 py-3 backdrop-blur-sm animate-slide-up">
        <p className="font-semibold text-emerald-50">
          ✨ It's your turn — ask an opponent for a card or claim a set.
        </p>
      </div>
    );
  }

  const turnPlayer = game.players.find((p) => p.id === game.currentTurnPlayerId);
  return (
    <div className="rounded-xl bg-black/30 border border-white/10 px-4 py-3 backdrop-blur-sm">
      <p>
        Waiting for <span className="font-semibold text-gold">{turnPlayer?.name ?? '?'}</span>…
      </p>
    </div>
  );
}

function TeamPanel({
  label,
  team,
  players,
  game,
  room,
  myId,
}: {
  label: string;
  team: TeamId;
  players: PublicPlayer[];
  game: PublicGameState;
  room: RoomSummary;
  myId: string;
}) {
  const accent =
    team === 'A'
      ? 'border-blue-400/40 from-blue-500/10 to-blue-700/5'
      : 'border-red-400/40 from-red-500/10 to-red-700/5';
  const labelCls = team === 'A' ? 'text-blue-200' : 'text-red-200';
  return (
    <div
      className={`rounded-xl border bg-gradient-to-br ${accent} p-4 backdrop-blur-sm`}
    >
      <h2 className={`mb-3 text-xs font-semibold uppercase tracking-wide ${labelCls}`}>
        {label} · Team {team}
      </h2>
      <div className="flex flex-wrap gap-3">
        {players.map((p) => (
          <PlayerCard key={p.id} player={p} game={game} room={room} myId={myId} />
        ))}
      </div>
    </div>
  );
}

function PlayerCard({
  player,
  game,
  room,
  myId,
}: {
  player: PublicPlayer;
  game: PublicGameState;
  room: RoomSummary;
  myId: string;
}) {
  const isTurn = game.currentTurnPlayerId === player.id;
  const isMe = player.id === myId;
  const empty = player.handCount === 0;
  const canTakeTurnNow =
    !!game.pendingTurnSelection &&
    game.pendingTurnSelection.eligibleTeam === player.team &&
    player.handCount > 0;

  const seat = findSeat(room, player.id);
  const connState = seat ? seatConnectionState(seat, room.reclaimGraceMs) : 'connected';
  const disconnectedCls = connState !== 'connected' ? 'opacity-70' : '';

  const baseCls = `relative min-w-[140px] rounded-lg border bg-white/95 px-3 py-2 text-slate-900 transition-all`;
  const turnCls = isTurn ? 'ring-2 ring-gold animate-pulse-ring' : '';
  const meCls = isMe ? 'border-2 border-amber-500' : 'border-slate-200';
  const emptyCls = empty ? 'opacity-60' : '';

  return (
    <div
      data-player-id={player.id}
      className={`${baseCls} ${turnCls} ${meCls} ${emptyCls} ${disconnectedCls}`}
    >
      <div className="flex items-baseline justify-between gap-1">
        <div className="font-semibold text-sm truncate">{player.name}</div>
        {isMe && <span className="ml-2 text-[10px] uppercase text-amber-600">you</span>}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-slate-500">
        <span aria-hidden>🂠</span>
        <span>{player.handCount}</span>
        {empty && <span className="text-slate-400">— empty</span>}
        {connState !== 'connected' && <ConnectionBadge state={connState} />}
      </div>
      {canTakeTurnNow && (
        <span className="absolute -top-2 right-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
          Eligible
        </span>
      )}
    </div>
  );
}

function YourHand({
  game,
  myTurn,
  pendingForMe,
  onAsk,
  onClaim,
  onTakeTurn,
}: {
  game: PublicGameState;
  myTurn: boolean;
  pendingForMe: boolean;
  onAsk: () => void;
  onClaim: () => void;
  onTakeTurn: () => void;
}) {
  const hand = game.yourHand ?? [];
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-4 backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-white/70">
          Your hand · {hand.length}
        </h2>
        <div className="flex gap-2">
          <button
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            disabled={!myTurn || hand.length === 0}
            onClick={onAsk}
          >
            Ask
          </button>
          <button
            className="rounded-lg bg-purple-600 px-4 py-1.5 text-sm font-semibold text-white shadow hover:bg-purple-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            disabled={!myTurn}
            onClick={onClaim}
          >
            Claim
          </button>
          {pendingForMe && (
            <button
              className="rounded-lg bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-white shadow hover:bg-emerald-600 transition-colors animate-pulse-ring"
              onClick={onTakeTurn}
            >
              Take turn
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 min-h-[6rem] items-end">
        {hand.length === 0 ? (
          <p className="text-sm text-white/50 self-center">No cards remaining.</p>
        ) : (
          hand.map((c) => <CardView key={cardId(c)} card={c} size="md" />)
        )}
      </div>
    </div>
  );
}

function ScoreBadge({ team, score, active }: { team: TeamId; score: number; active: boolean }) {
  const cls =
    team === 'A'
      ? 'border-blue-400/60 bg-blue-500/20 text-blue-100'
      : 'border-red-400/60 bg-red-500/20 text-red-100';
  return (
    <div
      className={`flex items-baseline gap-2 rounded-lg border px-3 py-1 ${cls} ${active ? 'ring-1 ring-gold/60' : ''}`}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
        Team {team}
      </span>
      <span className="text-xl font-bold">{score}</span>
      <span className="text-[10px] opacity-70">/5</span>
    </div>
  );
}

