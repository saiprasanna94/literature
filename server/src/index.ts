import { ClientToServer, ServerToClient } from '@literature/shared';
import cors from 'cors';
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { getFinishedGame, listFinishedGames } from './db/persistence.js';
import { RoomManager } from './rooms/manager.js';
import { registerHandlers } from './sockets/handlers.js';

const PORT = Number(process.env.PORT ?? 4000);
const ORIGIN = (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim());

const app = express();
app.use(cors({ origin: ORIGIN }));
app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/api/games', (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit ?? 50), 1), 200);
  res.json({ games: listFinishedGames(limit) });
});

app.get('/api/games/:id', (req, res) => {
  const detail = getFinishedGame(req.params.id);
  if (!detail) return res.status(404).json({ error: 'not_found' });
  res.json(detail);
});

const httpServer = createServer(app);
const io = new Server<ClientToServer, ServerToClient>(httpServer, {
  cors: { origin: ORIGIN },
});

const rooms = new RoomManager();
registerHandlers(io, rooms);

httpServer.listen(PORT, () => {
  console.log(`[literature] server listening on :${PORT}, accepting from ${ORIGIN}`);
});
