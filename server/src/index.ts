import { ClientToServer, ServerToClient } from '@literature/shared';
import cors from 'cors';
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { RoomManager } from './rooms/manager.js';
import { registerHandlers } from './sockets/handlers.js';

const PORT = Number(process.env.PORT ?? 4000);
const ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

const app = express();
app.use(cors({ origin: ORIGIN }));
app.get('/health', (_req, res) => res.json({ ok: true }));

const httpServer = createServer(app);
const io = new Server<ClientToServer, ServerToClient>(httpServer, {
  cors: { origin: ORIGIN },
});

const rooms = new RoomManager();
registerHandlers(io, rooms);

httpServer.listen(PORT, () => {
  console.log(`[literature] server listening on :${PORT}, accepting from ${ORIGIN}`);
});
