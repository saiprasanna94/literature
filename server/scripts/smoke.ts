/**
 * Multi-client smoke test against a running server. Spins up 6 socket
 * clients, creates a room, joins, starts the game, and prints what each
 * player sees. Useful for sanity-checking the wire protocol end-to-end.
 *
 * Usage: pnpm tsx server/scripts/smoke.ts
 */
import { ClientToServer, PublicGameState, ServerToClient } from '@literature/shared';
import { io, Socket } from 'socket.io-client';

const URL = process.env.URL ?? 'http://localhost:4000';

type S = Socket<ServerToClient, ClientToServer>;

function newSocket(): Promise<S> {
  return new Promise((resolve, reject) => {
    const s: S = io(URL, { transports: ['websocket'] });
    s.once('connect', () => resolve(s));
    s.once('connect_error', reject);
  });
}

function emit<E extends keyof ClientToServer>(s: S, event: E, ...args: any[]): Promise<any> {
  return new Promise((resolve) => {
    (s.emit as any)(event, ...args, (res: any) => resolve(res));
  });
}

async function main() {
  const sockets: S[] = [];
  for (let i = 0; i < 6; i++) sockets.push(await newSocket());

  // Host creates
  const hostRes = await emit(sockets[0]!, 'room:create', { name: 'Alice', size: 6 });
  if (!hostRes.ok) throw new Error('create failed: ' + hostRes.error);
  const { roomId, playerId: hostId } = hostRes;
  console.log('Created room', roomId, 'host', hostId);

  const playerIds: string[] = [hostId];
  for (let i = 1; i < 6; i++) {
    const r = await emit(sockets[i]!, 'room:join', { roomId, name: `P${i + 1}` });
    if (!r.ok) throw new Error(`join ${i} failed: ${r.error}`);
    playerIds.push(r.playerId);
  }
  console.log('All players joined:', playerIds);

  // Listen for game updates on each socket
  const states: (PublicGameState | null)[] = sockets.map(() => null);
  sockets.forEach((s, i) => s.on('game:update', (g) => (states[i] = g)));

  const startRes = await emit(sockets[0]!, 'game:start');
  if (!startRes.ok) throw new Error('start failed: ' + startRes.error);

  // Wait briefly for state to propagate
  await new Promise((r) => setTimeout(r, 200));

  for (let i = 0; i < 6; i++) {
    const g = states[i]!;
    console.log(
      `Seat ${i} (${g.players[i]!.name}, team ${g.players[i]!.team}): ${g.yourHand!.length} cards | turn=${g.currentTurnPlayerId}`,
    );
  }

  console.log('OK');
  for (const s of sockets) s.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
