import { Card, parseCardId } from '@literature/shared';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGameStore } from '../store.js';
import { CardView } from './Card.js';

type Transfer = {
  id: number;
  card: Card;
  fromX: number;
  fromY: number;
  dx: number;
  dy: number;
};

const DURATION_MS = 800;

/**
 * Watches the game's ask log. Whenever a new successful ask appears, finds
 * the source/target player cards in the DOM (via data-player-id) and
 * launches a "flying card" animation from target → asker.
 *
 * Cards in the ghost layer are pure decoration — the actual hand state has
 * already been updated server-side, so the asker's hand count grows
 * simultaneously. The flying card overlays that and lands as the count
 * settles.
 */
export function CardTransferLayer() {
  const game = useGameStore((s) => s.game);
  const lastSeenSeq = useRef<number>(-1);
  const idCounter = useRef(0);
  const [transfers, setTransfers] = useState<Transfer[]>([]);

  useEffect(() => {
    if (!game) {
      lastSeenSeq.current = -1;
      return;
    }
    // First effect run after the game (re)loads: snap to latest seq without
    // animating historical events.
    if (lastSeenSeq.current === -1) {
      lastSeenSeq.current =
        game.asks.length > 0 ? game.asks[game.asks.length - 1]!.seq : 0;
      return;
    }

    const newTransfers: Transfer[] = [];
    let highestSeq = lastSeenSeq.current;
    for (const ask of game.asks) {
      if (ask.seq <= lastSeenSeq.current) continue;
      highestSeq = Math.max(highestSeq, ask.seq);
      if (!ask.success) continue;
      const fromEl = document.querySelector(
        `[data-player-id="${ask.targetId}"]`,
      ) as HTMLElement | null;
      const toEl = document.querySelector(
        `[data-player-id="${ask.askerId}"]`,
      ) as HTMLElement | null;
      if (!fromEl || !toEl) continue;
      const fr = fromEl.getBoundingClientRect();
      const tr = toEl.getBoundingClientRect();
      newTransfers.push({
        id: ++idCounter.current,
        card: parseCardId(ask.cardId),
        fromX: fr.left + fr.width / 2,
        fromY: fr.top + fr.height / 2,
        dx: tr.left + tr.width / 2 - (fr.left + fr.width / 2),
        dy: tr.top + tr.height / 2 - (fr.top + fr.height / 2),
      });
    }
    lastSeenSeq.current = highestSeq;

    if (newTransfers.length === 0) return;
    setTransfers((prev) => [...prev, ...newTransfers]);
    const timeout = window.setTimeout(() => {
      setTransfers((prev) =>
        prev.filter((t) => !newTransfers.some((nt) => nt.id === t.id)),
      );
    }, DURATION_MS + 50);
    return () => window.clearTimeout(timeout);
  }, [game?.asks]);

  if (transfers.length === 0) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-40">
      {transfers.map((t) => (
        <FlyingCard key={t.id} transfer={t} />
      ))}
    </div>,
    document.body,
  );
}

function FlyingCard({ transfer }: { transfer: Transfer }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.animate(
      [
        {
          transform: 'translate(-50%, -50%) scale(1) rotate(0deg)',
          opacity: 1,
          offset: 0,
        },
        {
          transform: `translate(calc(-50% + ${transfer.dx * 0.5}px), calc(-50% + ${transfer.dy * 0.5}px)) scale(1.25) rotate(540deg)`,
          opacity: 1,
          offset: 0.55,
        },
        {
          transform: `translate(calc(-50% + ${transfer.dx}px), calc(-50% + ${transfer.dy}px)) scale(0.85) rotate(900deg)`,
          opacity: 0,
          offset: 1,
        },
      ],
      { duration: DURATION_MS, easing: 'cubic-bezier(0.4, 0.0, 0.2, 1)', fill: 'forwards' },
    );
  }, [transfer]);

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left: transfer.fromX,
        top: transfer.fromY,
        transform: 'translate(-50%, -50%)',
        willChange: 'transform, opacity',
      }}
    >
      <CardView card={transfer.card} size="md" />
    </div>
  );
}
