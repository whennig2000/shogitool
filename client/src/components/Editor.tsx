import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { BoardState, Piece, PieceType, Player, CustomSetup } from '../../../shared/types';
import { createPiece } from '../../../shared/constants';
import { PieceIcon } from './PieceIcon';

const PIECE_TYPES: PieceType[] = ['pawn', 'lance', 'knight', 'silver', 'gold', 'bishop', 'rook', 'king'];

export const Editor: React.FC = () => {
  const navigate = useNavigate();
  
  const [name, setName] = useState('My Custom Setup');
  const [width, setWidth] = useState(9);
  const [height, setHeight] = useState(9);
  const [promotionZoneSize, setPromotionZoneSize] = useState(3);
  const [board, setBoard] = useState<BoardState>(Array(9).fill(null).map(() => Array(9).fill(null)));
  const [hands, setHands] = useState<{ sente: Piece[]; gote: Piece[] }>({ sente: [], gote: [] });
  
  const [selectedType, setSelectedType] = useState<PieceType | 'eraser'>('king');
  const [selectedOwner, setSelectedOwner] = useState<Player>('sente');

  const [showTokenPrompt, setShowTokenPrompt] = useState(false);
  const [githubToken, setGithubToken] = useState(localStorage.getItem('github_token') || '');
  const [isSaving, setIsSaving] = useState(false);

  const updateSize = (newWidth: number, newHeight: number) => {
    const newBoard = Array(newHeight).fill(null).map((_, y) => 
      Array(newWidth).fill(null).map((_, x) => {
        if (y < height && x < width) {
          return board[y][x];
        }
        return null;
      })
    );
    setBoard(newBoard);
    setWidth(newWidth);
    setHeight(newHeight);
  };

  const handleCellClick = (x: number, y: number) => {
    const newBoard = board.map(row => [...row]);
    if (selectedType === 'eraser') {
      newBoard[y][x] = null;
    } else {
      newBoard[y][x] = createPiece(selectedType, selectedOwner);
    }
    setBoard(newBoard);
  };

  const addHandPiece = (owner: Player, type: PieceType) => {
    setHands(prev => ({
      ...prev,
      [owner]: [...prev[owner], createPiece(type, owner)]
    }));
  };

  const removeHandPiece = (owner: Player, index: number) => {
    setHands(prev => {
      const newHand = [...prev[owner]];
      newHand.splice(index, 1);
      return { ...prev, [owner]: newHand };
    });
  };

  const pushToGithub = async (setup: CustomSetup, token: string) => {
    setIsSaving(true);
    try {
      // 1. Fetch current file to get SHA and existing setups
      const apiUrl = 'https://api.github.com/repos/whennig2000/shogitool/contents/server/setups.json';
      const getRes = await fetch(apiUrl, {
        headers: { 'Authorization': `token ${token}` }
      });
      
      let existingSetups: CustomSetup[] = [];
      let sha = '';
      if (getRes.ok) {
        const data = await getRes.json();
        sha = data.sha;
        const content = decodeURIComponent(escape(atob(data.content)));
        existingSetups = JSON.parse(content);
      }

      // 2. Append new setup
      if (existingSetups.some(s => s.name === setup.name)) {
        alert('Ein Setup mit diesem Namen existiert bereits auf GitHub.');
        setIsSaving(false);
        return;
      }
      existingSetups.push(setup);

      // 3. Encode new content (unicode safe)
      const newContent = btoa(unescape(encodeURIComponent(JSON.stringify(existingSetups, null, 2))));

      // 4. PUT to GitHub
      const putRes = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Add new setup: ${setup.name}`,
          content: newContent,
          sha: sha || undefined
        })
      });

      if (!putRes.ok) {
        throw new Error('Fehler beim Speichern (Token ungültig?)');
      }

      alert('Setup erfolgreich auf GitHub gespeichert!');
      localStorage.setItem('github_token', token);
      setShowTokenPrompt(false);
      navigate('/');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const saveSetup = () => {
    if (!githubToken) {
      setShowTokenPrompt(true);
      return;
    }
    executeSave(githubToken);
  };

  const executeSave = (token: string) => {
    const setup: CustomSetup = {
      id: `setup_${Date.now()}`,
      name,
      width,
      height,
      board,
      hands,
      promotionZoneSize
    };
    pushToGithub(setup, token);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 className="title" style={{ margin: 0 }}>Board Editor</h2>
        <button className="btn btn-secondary" onClick={() => navigate('/')}>🔙 Zurück zur Lobby</button>
      </div>

      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>Name der Aufstellung</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', padding: '0.5rem', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px' }} />
        </div>
        
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Breite (x)</label>
            <input type="number" min={3} max={15} value={width} onChange={e => updateSize(parseInt(e.target.value), height)} style={{ width: '100%', padding: '0.5rem', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Höhe (y)</label>
            <input type="number" min={5} max={15} value={height} onChange={e => updateSize(width, parseInt(e.target.value))} style={{ width: '100%', padding: '0.5rem', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Beförderungszone (Reihen)</label>
            <input type="number" min={0} max={5} value={promotionZoneSize} onChange={e => setPromotionZoneSize(parseInt(e.target.value))} style={{ width: '100%', padding: '0.5rem', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px' }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        {/* Sidebar */}
        <div className="lobby-card" style={{ flex: '1 1 200px' }}>
          <h3>Werkzeuge</h3>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <label>
                <input type="radio" checked={selectedOwner === 'sente'} onChange={() => setSelectedOwner('sente')} />
                Sente (Schwarz)
              </label>
              <label>
                <input type="radio" checked={selectedOwner === 'gote'} onChange={() => setSelectedOwner('gote')} />
                Gote (Weiß)
              </label>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <button 
                className="btn"
                style={{ 
                  background: selectedType === 'eraser' ? 'rgba(234, 179, 8, 0.3)' : 'var(--surface)', 
                  color: 'var(--text)',
                  border: selectedType === 'eraser' ? '1px solid #eab308' : '1px solid transparent'
                }} 
                onClick={() => setSelectedType('eraser')}
              >
              🧹 Eraser
            </button>
            {PIECE_TYPES.map(pt => (
              <button 
                key={pt} 
                className="btn"
                style={{ 
                  background: selectedType === pt ? 'rgba(234, 179, 8, 0.3)' : 'var(--surface)',
                  color: 'var(--text)',
                  border: selectedType === pt ? '1px solid #eab308' : '1px solid transparent',
                  display: 'flex', justifyContent: 'center'
                }}
                onClick={() => setSelectedType(pt)}
              >
                <PieceIcon type={pt} color={selectedOwner === 'sente' ? 'var(--theme-sente)' : 'var(--theme-gote)'} size={24} kanjiMode={true} />
              </button>
            ))}
          </div>
        </div>

        {/* Board Preview */}
        <div style={{ flex: '1 1 300px' }}>
          <div style={{ marginBottom: '1rem' }}>
            <h4>Gote Hand (Weiß)</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', minHeight: '40px', background: 'var(--surface)', padding: '0.5rem', borderRadius: '4px' }}>
              {hands.gote.map((p, i) => (
                <div key={p.id} onClick={() => removeHandPiece('gote', i)} style={{ cursor: 'pointer' }}>
                  <PieceIcon type={p.type} color="var(--theme-gote)" kanjiMode={true} />
                </div>
              ))}
              <button className="btn btn-secondary" style={{ padding: '0 0.5rem' }} onClick={() => addHandPiece('gote', selectedType !== 'eraser' ? selectedType : 'pawn')}>+</button>
            </div>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: `repeat(${width}, 1fr)`, 
            gridTemplateRows: `repeat(${height}, 1fr)`,
            gap: '2px', 
            background: 'var(--board-lines)', 
            padding: '2px', 
            borderRadius: '4px' 
          }}>
            {board.map((row, y) => (
              <React.Fragment key={`row-${y}`}>
                {row.map((cell, x) => (
                  <div 
                    key={`cell-${x}-${y}`} 
                    onClick={() => handleCellClick(x, y)}
                    className={(y < promotionZoneSize || y >= height - promotionZoneSize) ? 'center-zone' : ''}
                    style={{ 
                      backgroundColor: 'var(--board-bg)',
                      aspectRatio: '1',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    {cell && (
                      <div style={{ transform: cell.owner === 'gote' ? 'rotate(180deg)' : 'none' }}>
                        <PieceIcon type={cell.type} color={cell.owner === 'sente' ? 'var(--theme-sente)' : 'var(--theme-gote)'} kanjiMode={true} />
                      </div>
                    )}
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>

          <div style={{ marginTop: '1rem' }}>
            <h4>Sente Hand (Schwarz)</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', minHeight: '40px', background: 'var(--surface)', padding: '0.5rem', borderRadius: '4px' }}>
              {hands.sente.map((p, i) => (
                <div key={p.id} onClick={() => removeHandPiece('sente', i)} style={{ cursor: 'pointer' }}>
                  <PieceIcon type={p.type} color="var(--theme-sente)" kanjiMode={true} />
                </div>
              ))}
              <button className="btn btn-secondary" style={{ padding: '0 0.5rem' }} onClick={() => addHandPiece('sente', selectedType !== 'eraser' ? selectedType : 'pawn')}>+</button>
            </div>
          </div>
          
          <button className="btn" style={{ marginTop: '2rem', width: '100%' }} onClick={saveSetup} disabled={isSaving}>
            {isSaving ? '⏳ Speichere auf GitHub...' : '💾 Setup auf GitHub Speichern'}
          </button>
        </div>
      </div>

      {showTokenPrompt && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>GitHub Token benötigt</h3>
            <p style={{ opacity: 0.8, marginBottom: '1rem', fontSize: '0.9rem' }}>Um Boards direkt in deinem Repository (whennig2000/shogitool) zu speichern, wird ein Personal Access Token mit Repo-Rechten benötigt.</p>
            <input 
              type="password" 
              placeholder="ghp_xxxxxxxxxxxx" 
              value={githubToken}
              onChange={e => setGithubToken(e.target.value)}
              style={{ width: '100%', padding: '0.8rem', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px', marginBottom: '1rem' }}
            />
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => setShowTokenPrompt(false)}>Abbrechen</button>
              <button className="btn" onClick={() => executeSave(githubToken)}>Speichern</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
