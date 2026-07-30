import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Lobby } from './components/Lobby';
import { Game } from './components/Game';
import { Editor } from './components/Editor';
import { loadTheme, applyTheme } from './components/Settings';
import './index.css';

function App() {
  React.useEffect(() => {
    applyTheme(loadTheme());
  }, []);

  return (
    <BrowserRouter>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Lobby />} />
          <Route path="/room/:roomId" element={<Game />} />
          <Route path="/editor" element={<Editor />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
