import React from 'react';
import type { Piece, Player } from '../../../shared/types';
import { PieceIcon } from './PieceIcon';

interface Props {
  player: Player;
  pieces: Piece[];
  selectedPiece: Piece | null;
  role: Player;
  isCurrentTurn: boolean;
  displayMode: 'kanji' | 'symbols' | 'images';
  onSelect: (piece: Piece) => void;
}

export const Komadai: React.FC<Props> = ({ pieces, player, role, isCurrentTurn, displayMode, onSelect, selectedPiece }) => {
  const counts = pieces.reduce((acc, p) => {
    acc[p.type] = (acc[p.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const uniqueTypes = Array.from(new Set(pieces.map(p => p.type)));
  const isMyRole = player === role;
  
  return (
    <div className={`komadai ${isCurrentTurn ? 'active' : ''}`}>
      <div className="komadai-title">
        {player === 'sente' ? 'Schwarz' : 'Weiß'} Bank {isMyRole ? '(Du)' : ''}
      </div>
      <div className="komadai-pieces">
        {uniqueTypes.map(type => {
          const samplePiece = pieces.find(p => p.type === type)!;
          const count = counts[type];
          const isSelected = selectedPiece?.type === type && selectedPiece?.owner === player;

          return (
            <div 
              key={type} 
              className={`komadai-piece ${isSelected ? 'selected' : ''} ${player === 'gote' ? 'gote' : ''}`}
              onClick={() => isMyRole && isCurrentTurn && onSelect(samplePiece)}
              style={{ cursor: (isMyRole && isCurrentTurn) ? 'pointer' : 'not-allowed' }}
            >
              <div style={{ transform: 'none', display: 'flex', alignItems: 'center' }}>
                <PieceIcon type={type} color={player === 'sente' ? 'var(--theme-sente)' : 'var(--theme-gote)'} size={35} displayMode={displayMode} />
              </div>
              {count > 1 && (
                <div className="badge">{count}</div>
              )}
            </div>
          );
        })}
        {uniqueTypes.length === 0 && (
          <div style={{ color: 'var(--border)', fontStyle: 'italic', padding: '1rem', textAlign: 'center', width: '100%' }}>
            Leer
          </div>
        )}
      </div>
    </div>
  );
};
