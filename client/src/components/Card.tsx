import { Card as CardT } from '@literature/shared';

const SUIT_GLYPH = { H: '♥', D: '♦', S: '♠', C: '♣' } as const;
const RED = new Set(['H', 'D']);

type Size = 'sm' | 'md' | 'lg';

const SIZES: Record<Size, { box: string; rank: string; suit: string; corner: string }> = {
  sm: { box: 'h-14 w-10', rank: 'text-sm', suit: 'text-base', corner: 'text-[10px]' },
  md: { box: 'h-24 w-16', rank: 'text-xl', suit: 'text-2xl', corner: 'text-xs' },
  lg: { box: 'h-28 w-20', rank: 'text-2xl', suit: 'text-3xl', corner: 'text-sm' },
};

export function CardView({
  card,
  selected,
  onClick,
  disabled,
  size = 'md',
}: {
  card: CardT;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  size?: Size;
}) {
  const sz = SIZES[size];
  const isRed = card.kind === 'standard' && RED.has(card.suit);
  const colorCls = isRed ? 'text-red-600' : 'text-slate-900';

  const ringCls = selected
    ? 'ring-4 ring-gold ring-offset-2 ring-offset-felt -translate-y-3'
    : '';
  const interactiveCls = disabled
    ? 'opacity-40 cursor-not-allowed'
    : onClick
      ? 'hover:-translate-y-2 hover:shadow-xl cursor-pointer'
      : '';

  if (card.kind === 'joker') {
    const isBig = card.color === 'big';
    return (
      <button
        type="button"
        onClick={disabled ? undefined : onClick}
        className={`card-face ${sz.box} relative flex flex-col items-center justify-center rounded-lg border border-slate-200 transition-all duration-150 ${ringCls} ${interactiveCls}`}
      >
        <span className={`${sz.corner} absolute left-1 top-1 font-bold ${isBig ? 'text-red-600' : 'text-slate-900'}`}>
          ★
        </span>
        <span className={`${sz.corner} absolute right-1 bottom-1 rotate-180 font-bold ${isBig ? 'text-red-600' : 'text-slate-900'}`}>
          ★
        </span>
        <span className={`${sz.suit} ${isBig ? 'text-red-600' : 'text-slate-900'}`}>★</span>
        <span className={`${sz.corner} mt-1 font-semibold uppercase ${isBig ? 'text-red-600' : 'text-slate-900'}`}>
          {isBig ? 'Joker' : 'joker'}
        </span>
      </button>
    );
  }

  const rank = card.rank;
  const suit = SUIT_GLYPH[card.suit];

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      className={`card-face ${sz.box} relative flex flex-col items-center justify-center rounded-lg border border-slate-200 font-bold transition-all duration-150 ${colorCls} ${ringCls} ${interactiveCls}`}
    >
      <span className={`${sz.corner} absolute left-1 top-1 leading-none`}>
        <span className="block">{rank}</span>
        <span className="block">{suit}</span>
      </span>
      <span className={`${sz.corner} absolute right-1 bottom-1 rotate-180 leading-none`}>
        <span className="block">{rank}</span>
        <span className="block">{suit}</span>
      </span>
      <span className={`${sz.suit}`}>{suit}</span>
    </button>
  );
}

export function CardBack({ size = 'md' }: { size?: Size }) {
  const sz = SIZES[size];
  return <div className={`card-face-back ${sz.box} rounded-lg border border-slate-300 shadow`} />;
}
