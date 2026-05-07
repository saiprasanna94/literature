import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { App } from './App.js';
import { GamePage } from './pages/GamePage.js';
import { HomePage } from './pages/HomePage.js';
import { LobbyPage } from './pages/LobbyPage.js';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />}>
          <Route index element={<HomePage />} />
          <Route path="/room/:roomId/lobby" element={<LobbyPage />} />
          <Route path="/room/:roomId/game" element={<GamePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
