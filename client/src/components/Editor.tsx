import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { BoardState, Piece, PieceType, Player, CustomSetup } from '../../../shared/types';
import { createPiece } from '../../../shared/constants';
import { PieceIcon } from './PieceIcon';
import { socket } from './Lobby';

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

  const saveSetup = () => {
    const setup: CustomSetup = {
      id: `setup_${Date.now()}`,
      name,
      width,
      height,
      board,
      hands,
      promotionZoneSize
    };
    
    socket.emit('saveSetup', setup, () => {
      alert('Setup saved to server!');
      navigate('/');
    });
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 className="title" style={{ margin: 0 }}>Board Editor</h2>
        <button className="btn btn-secondary" onClick={() => navigate('/')}>🔙 Zurück zur Lobby</button>
      </div>

      <div className="lobby-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <label>Setup Name: </label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} style={{ padding: '0.5rem', marginLeft: '0.5rem' }} />
        </div>
        
        <div style={{ display: 'flex', gap: '2rem' }}>
          <div>
            <label>Breite (Width): {width}</label>
            <input type="range" min="3" max="15" value={width} onChange={e => updateSize(parseInt(e.target.value), height)} />
          </div>
          <div>
            <label>Höhe (Height): {height}</label>
            <input type="range" min="3" max="15" value={height} onChange={e => updateSize(width, parseInt(e.target.value))} />
          </div>
          <div>
            <label>Beförderungszone (Reihen): {promotionZoneSize}</label>
            <input type="range" min="0" max={Math.floor(height/2)} value={promotionZoneSize} onChange={e => setPromotionZoneSize(parseInt(e.target.value))} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '2rem' }}>
        {/* Palette */}
        <div className="lobby-card" style={{ flex: '0 0 200px' }}>
          <h3>Werkzeuge</h3>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <label>
              <input type="radio" checked={selectedOwner === 'sente'} onChange={() => setSelectedOwner('sente')} />
              Sente (Blau)
            </label>
            <label>
              <input type="radio" checked={selectedOwner === 'gote'} onChange={() => setSelectedOwner('gote')} />
              Gote (Rot)
            </label>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <button 
              className="btn"
              style={{ background: selectedType === 'eraser' ? '#475569' : '#1e293b' }}
              onClick={() => setSelectedType('eraser')}
            >
              🧹 Eraser
            </button>
            {PIECE_TYPES.map(pt => (
              <button 
                key={pt} 
                className="btn" 
                style={{ 
                  background: selectedType === pt ? '#475569' : '#1e293b',
                  display: 'flex', justifyContent: 'center' 
                }}
                onClick={() => setSelectedType(pt)}
              >
                <PieceIcon type={pt} color={selectedOwner === 'sente' ? 'var(--primary)' : 'var(--secondary)'} size={24} kanjiMode={true} />
              </button>
            ))}
          </div>
        </div>

        {/* Board Preview */}
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: '1rem' }}>
            <h4>Gote Hand (Rot)</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', minHeight: '40px', background: 'var(--surface)', padding: '0.5rem', borderRadius: '4px' }}>
              {hands.gote.map((p, i) => (
                <div key={p.id} onClick={() => removeHandPiece('gote', i)} style={{ cursor: 'pointer' }}>
                  <PieceIcon type={p.type} color="var(--secondary)" kanjiMode={true} />
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
                    className={(y >= promotionZoneSize && y < height - promotionZoneSize) ? 'center-zone' : ''}
                    style={{ 
                      backgroundColor: 'var(--board-bg)',
                      backgroundImage: (y >= promotionZoneSize && y < height - promotionZoneSize) ? 'linear-gradient(var(--center-bg), var(--center-bg))' : 'none',
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
            <h4>Sente Hand (Blau)</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', minHeight: '40px', background: 'var(--surface)', padding: '0.5rem', borderRadius: '4px' }}>
              {hands.sente.map((p, i) => (
                <div key={p.id} onClick={() => removeHandPiece('sente', i)} style={{ cursor: 'pointer' }}>
                  <PieceIcon type={p.type} color="var(--primary)" kanjiMode={true} />
                </div>
              ))}
              <button className="btn btn-secondary" style={{ padding: '0 0.5rem' }} onClick={() => addHandPiece('sente', selectedType !== 'eraser' ? selectedType : 'pawn')}>+</button>
            </div>
          </div>
          
          <button className="btn" style={{ marginTop: '2rem', width: '100%' }} onClick={saveSetup}>💾 Setup Speichern</button>
        </div>
      </div>
    </div>
  );
};
