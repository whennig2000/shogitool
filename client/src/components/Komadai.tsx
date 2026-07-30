import React from 'react';
import type { Piece, Player } from '../../../shared/types';
import { PieceIcon } from './PieceIcon';

interface Props {
  player: Player;
  pieces: Piece[];
  selectedPiece: Piece | null;
  onSelect: (piece: Piece) => void;
  isCurrentTurn: boolean;
  isMyRole: boolean;
  kanjiMode: boolean;
}

export const Komadai: React.FC<Props> = ({ player, pieces, selectedPiece, onSelect, isCurrentTurn, isMyRole, kanjiMode }) => {
  const counts = pieces.reduce((acc, p) => {
    acc[p.type] = (acc[p.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const uniqueTypes = Array.from(new Set(pieces.map(p => p.type)));
  
  return (
    <div className={`komadai ${isCurrentTurn ? 'active' : ''}`}>
      <div className="komadai-title">
        {player === 'sente' ? 'Blau' : 'Rot'} Bank {isMyRole ? '(Du)' : ''}
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
              <div style={{ transform: player === 'gote' ? 'rotate(180deg)' : 'none', display: 'flex', alignItems: 'center' }}>
                <PieceIcon type={type} color={player === 'sente' ? '#3b82f6' : '#ef4444'} size={35} kanjiMode={kanjiMode} />
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
