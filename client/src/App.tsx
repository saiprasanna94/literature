import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { DisconnectOverlay } from './components/DisconnectOverlay.js';
import { useGameStore } from './store.js';

export function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const room = useGameStore((s) => s.room);
  const game = useGameStore((s) => s.game);
  const connect = useGameStore((s) => s.connect);
  const tryRejoin = useGameStore((s) => s.tryRejoin);

  useEffect(() => {
    connect();
    tryRejoin();
  }, [connect, tryRejoin]);

  useEffect(() => {
    // Drive routing from authoritative server state.
    if (!room) return;
    const target =
      room.status === 'in_progress' || room.status === 'finished'
        ? `/room/${room.roomId}/game`
        : `/room/${room.roomId}/lobby`;
    if (location.pathname !== target) navigate(target, { replace: true });
  }, [room, game?.status, location.pathname, navigate]);

  return (
    <div className="min-h-full">
      <Outlet />
      <DisconnectOverlay />
    </div>
  );
}
