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
    <BrowserRouter basename="/shogitool">
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Lobby />} />
          <Route path="/room/:roomId" element={<Game />} />
          <Route path="/editor" element={<Editor />} />
        </Routes>
        <footer style={{ marginTop: '3rem', textAlign: 'center', opacity: 0.6, fontSize: '0.9rem' }}>
          created by <a href="https://github.com/whennig2000" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>@whennig2000</a>, 
          assisted by <a href="https://deepmind.google/" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>Antigravity</a>, 
          powered by <a href="https://render.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>Render</a> and <a href="https://pages.github.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>GitHub Pages</a>, 
          credits to <a href="https://de.wikipedia.org/wiki/Shogi" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>Shogi</a> and variational board games (<a href="https://www.shogito.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>Shogito</a>)
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
