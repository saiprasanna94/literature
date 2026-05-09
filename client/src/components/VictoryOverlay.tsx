import { ALL_SETS, PublicGameState, SET_LABELS, TeamId } from '@literature/shared';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';

const CONFETTI_COLORS = ['#d4af37', '#f1d77a', '#2563eb', '#dc2626', '#ffffff', '#10b981'];
const CONFETTI_COUNT = 60;

export function VictoryOverlay({
  game,
  onLeave,
}: {
  game: PublicGameState;
  onLeave: () => void;
}) {
  if (game.status !== 'finished' || !game.winner) return null;

  const winner: TeamId = game.winner;
  const setsA = game.claimedSets.filter((cs) => cs.team === 'A').length;
  const setsB = game.claimedSets.filter((cs) => cs.team === 'B').length;
  const winnerColor = winner === 'A' ? 'text-blue-300' : 'text-red-300';
  const winnerSets = game.claimedSets
    .filter((cs) => cs.team === winner)
    .map((cs) => cs.setId);
  const loserSets = game.claimedSets
    .filter((cs) => cs.team !== winner)
    .map((cs) => cs.setId);

  // Pre-generate confetti pieces with stable random positions
  const confetti = useMemo(
    () =>
      Array.from({ length: CONFETTI_COUNT }, () => ({
        left: Math.random() * 100,
        delay: Math.random() * 1.5,
        duration: 2.8 + Math.random() * 1.6,
        size: 6 + Math.random() * 8,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      })),
    [],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-fade-in backdrop-blur-md">
      {/* Confetti */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {confetti.map((p, i) => (
          <span
            key={i}
            style={{
              position: 'absolute',
              top: '-20px',
              left: `${p.left}%`,
              width: p.size,
              height: p.size * 1.6,
              backgroundColor: p.color,
              animation: `confetti ${p.duration}s ease-in ${p.delay}s forwards`,
              borderRadius: '2px',
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-gradient-to-b from-slate-900 to-slate-800 p-8 text-center shadow-2xl border border-gold/30 animate-scale-in">
        <div className="mb-2 text-6xl animate-trophy-bounce inline-block" aria-hidden>
          🏆
        </div>

        <h1 className="font-display text-5xl font-bold tracking-wide text-gold-shimmer mb-1">
          Victory!
        </h1>
        <p className={`text-3xl font-bold ${winnerColor} mb-6 font-display`}>
          Team {winner} wins
        </p>

        <div className="mb-6 grid grid-cols-2 gap-4">
          <ScorePanel
            team="A"
            score={setsA}
            isWinner={winner === 'A'}
          />
          <ScorePanel
            team="B"
            score={setsB}
            isWinner={winner === 'B'}
          />
        </div>

        <div className="mb-6 rounded-lg bg-black/40 p-4 text-left text-sm">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Sets won
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="mb-1 text-xs text-blue-300">Team A · {setsA}</p>
              <ul className="space-y-0.5 text-xs text-slate-300">
                {(winner === 'A' ? winnerSets : loserSets).map((s) => (
                  <li key={s}>· {SET_LABELS[s]}</li>
                ))}
                {(winner === 'A' ? winnerSets : loserSets).length === 0 && (
                  <li className="text-slate-500">— none —</li>
                )}
              </ul>
            </div>
            <div>
              <p className="mb-1 text-xs text-red-300">Team B · {setsB}</p>
              <ul className="space-y-0.5 text-xs text-slate-300">
                {(winner === 'B' ? winnerSets : loserSets).map((s) => (
                  <li key={s}>· {SET_LABELS[s]}</li>
                ))}
                {(winner === 'B' ? winnerSets : loserSets).length === 0 && (
                  <li className="text-slate-500">— none —</li>
                )}
              </ul>
            </div>
          </div>
          {ALL_SETS.length > game.claimedSets.length && (
            <p className="mt-2 text-xs italic text-slate-500">
              {ALL_SETS.length - game.claimedSets.length} set(s) unresolved (game ended early).
            </p>
          )}
        </div>

        <div className="flex justify-center gap-3">
          <button
            onClick={onLeave}
            className="rounded-lg bg-gold px-6 py-3 font-semibold text-slate-900 shadow-lg hover:bg-gold-light transition-colors"
          >
            Back to home
          </button>
          <Link
            to="/history"
            className="rounded-lg border border-white/30 px-6 py-3 font-semibold text-white hover:bg-white/10 transition-colors"
          >
            Review this game
          </Link>
        </div>
      </div>
    </div>
  );
}

function ScorePanel({
  team,
  score,
  isWinner,
}: {
  team: TeamId;
  score: number;
  isWinner: boolean;
}) {
  const teamCls =
    team === 'A'
      ? 'border-blue-500/40 bg-blue-500/10 text-blue-200'
      : 'border-red-500/40 bg-red-500/10 text-red-200';
  return (
    <div
      className={`relative rounded-xl border-2 p-4 ${teamCls} ${
        isWinner ? 'ring-2 ring-gold ring-offset-2 ring-offset-slate-900' : 'opacity-70'
      }`}
    >
      <div className="text-xs uppercase tracking-wide opacity-80">Team {team}</div>
      <div className="mt-1 text-4xl font-bold">{score}</div>
      <div className="text-xs opacity-70">{score === 1 ? 'set' : 'sets'}</div>
      {isWinner && (
        <div className="absolute -top-2 right-2 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold uppercase text-slate-900">
          Winner
        </div>
      )}
    </div>
  );
}
