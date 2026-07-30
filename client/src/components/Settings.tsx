import React, { useState } from 'react';
import type { ThemeConfig } from '../../../shared/types';

interface SettingsProps {
  onClose: () => void;
}

const DEFAULT_THEME: ThemeConfig = {
  id: 'default',
  name: 'Pastel Zen',
  kanjiMode: true,
  colors: {
    boardBg: '#eaddcf',
    boardLines: '#5c4d42',
    centerBg: 'rgba(0,0,0,0.03)',
    sentePrimary: '#4a5568',
    gotePrimary: '#9e7a7a'
  }
};

export const applyTheme = (theme: ThemeConfig) => {
  const root = document.documentElement;
  root.style.setProperty('--board-bg', theme.colors.boardBg);
  root.style.setProperty('--board-lines', theme.colors.boardLines);
  root.style.setProperty('--center-bg', theme.colors.centerBg);
  root.style.setProperty('--theme-sente', theme.colors.sentePrimary);
  root.style.setProperty('--theme-gote', theme.colors.gotePrimary);
  root.style.setProperty('--primary', theme.colors.sentePrimary);
  root.style.setProperty('--secondary', theme.colors.gotePrimary);
};

export const loadTheme = (): ThemeConfig => {
  const saved = localStorage.getItem('shogito_theme');
  return saved ? JSON.parse(saved) : DEFAULT_THEME;
};

export const getKanjiMode = (): boolean => {
  return loadTheme().kanjiMode;
};

export const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  const [theme, setTheme] = useState<ThemeConfig>(loadTheme());

  const saveTheme = (newTheme: ThemeConfig) => {
    setTheme(newTheme);
    localStorage.setItem('shogito_theme', JSON.stringify(newTheme));
    applyTheme(newTheme);
    window.dispatchEvent(new Event('themeChanged'));
  };

  const updateColor = (key: keyof ThemeConfig['colors'], value: string) => {
    saveTheme({
      ...theme,
      colors: { ...theme.colors, [key]: value }
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', width: '100%', textAlign: 'left' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ margin: 0 }}>Einstellungen</h2>
          <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }} onClick={onClose}>✖</button>
        </div>

        <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.05)', borderRadius: '8px' }}>
          <h3 style={{ marginBottom: '1rem' }}>🎨 Theme & Farben</h3>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <label>Figuren-Stil:</label>
            <button 
              className="btn btn-secondary" 
              onClick={() => saveTheme({ ...theme, kanjiMode: !theme.kanjiMode })}
            >
              {theme.kanjiMode ? '🈴 Kanji' : '♟️ Modern (Symbole)'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Brett (Hintergrund)</label>
              <input type="color" value={theme.colors.boardBg} onChange={e => updateColor('boardBg', e.target.value)} style={{ width: '100%', height: '40px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Brett (Linien)</label>
              <input type="color" value={theme.colors.boardLines} onChange={e => updateColor('boardLines', e.target.value)} style={{ width: '100%', height: '40px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Brett (Mittelzone)</label>
              <input type="color" value={theme.colors.centerBg} onChange={e => updateColor('centerBg', e.target.value)} style={{ width: '100%', height: '40px' }} />
            </div>
            <div></div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Sente Farbe (Blau)</label>
              <input type="color" value={theme.colors.sentePrimary} onChange={e => updateColor('sentePrimary', e.target.value)} style={{ width: '100%', height: '40px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Gote Farbe (Rot)</label>
              <input type="color" value={theme.colors.gotePrimary} onChange={e => updateColor('gotePrimary', e.target.value)} style={{ width: '100%', height: '40px' }} />
            </div>
          </div>
          
          <button 
            className="btn btn-secondary" 
            style={{ width: '100%', marginTop: '1.5rem' }}
            onClick={() => saveTheme(DEFAULT_THEME)}
          >
            Auf Standard zurücksetzen
          </button>
        </div>
      </div>
    </div>
  );
};
