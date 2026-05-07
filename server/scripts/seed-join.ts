/**
 * Joins N fake players to an existing room. Keeps the connections open so
 * the room stays populated while you take screenshots.
 *
 * Usage: pnpm tsx server/scripts/seed-join.ts <ROOM_CODE> [count]
 *   default count = 5 (so a 6-player room with 1 real host fills up)
 */
import { ClientToServer, ServerToClient } from '@literature/shared';
import { io, Socket } from 'socket.io-client';

const URL = process.env.URL ?? 'http://localhost:4000';
const ROOM = (process.argv[2] ?? '').toUpperCase();
const COUNT = Number(process.argv[3] ?? 5);

if (!ROOM) {
  console.error('Usage: pnpm tsx server/scripts/seed-join.ts <ROOM_CODE> [count]');
  process.exit(1);
}

const NAMES = ['Bob', 'Carol', 'Dan', 'Eve', 'Frank', 'Grace', 'Henry'];

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
  console.log(`Joining ${COUNT} fake players to room ${ROOM} at ${URL}…`);
  const sockets: S[] = [];
  for (let i = 0; i < COUNT; i++) {
    const s = await newSocket();
    const name = NAMES[i] ?? `P${i + 2}`;
    const r = await emit(s, 'room:join', { roomId: ROOM, name });
    if (!r.ok) {
      console.error(`Join failed for ${name}: ${r.error}`);
      process.exit(1);
    }
    sockets.push(s);
    console.log(`  joined as ${name} (id=${r.playerId.slice(0, 6)}…)`);
  }
  console.log('\nFake players connected. Press Ctrl+C to disconnect them and clean up.');

  // Keep alive
  process.on('SIGINT', () => {
    for (const s of sockets) s.disconnect();
    process.exit(0);
  });
  await new Promise(() => {}); // park forever
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
