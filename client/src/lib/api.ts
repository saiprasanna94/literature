import { HistoryGameDetail, HistoryGameSummary } from '@literature/shared';

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ?? `http://${window.location.hostname}:4000`;

export async function fetchGames(limit = 50): Promise<HistoryGameSummary[]> {
  const res = await fetch(`${SERVER_URL}/api/games?limit=${limit}`);
  if (!res.ok) throw new Error(`fetchGames: ${res.status}`);
  const body = (await res.json()) as { games: HistoryGameSummary[] };
  return body.games;
}

export async function fetchGame(id: string): Promise<HistoryGameDetail> {
  const res = await fetch(`${SERVER_URL}/api/games/${encodeURIComponent(id)}`);
  if (res.status === 404) throw new Error('not_found');
  if (!res.ok) throw new Error(`fetchGame: ${res.status}`);
  return (await res.json()) as HistoryGameDetail;
}
