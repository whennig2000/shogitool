import React from 'react';
import type { Cell as CellType } from '../../../shared/types';
import { PieceIcon } from './PieceIcon';

interface Props {
  cell: CellType;
  x: number;
  y: number;
  isSelected: boolean;
  isValidMove: boolean;
  kanjiMode: boolean;
  isCenterZone?: boolean;
  onPress: (x: number, y: number) => void;
}

export const Cell: React.FC<Props> = ({ cell, x, y, isSelected, isValidMove, kanjiMode, isCenterZone, onPress }) => {
  return (
    <div
      className={`cell ${isSelected ? 'selected' : ''} ${isValidMove ? 'valid-move' : ''} ${isCenterZone ? 'center-zone' : ''}`}
      onClick={() => onPress(x, y)}
    >
      {cell && (
        <div className={`piece ${cell.owner === 'gote' ? 'gote' : ''}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
          <PieceIcon type={cell.type} color={cell.owner === 'sente' ? 'var(--theme-sente)' : 'var(--theme-gote)'} size={40} kanjiMode={kanjiMode} />
        </div>
      )}
      {isValidMove && !cell && (
        <div className="valid-move-dot" />
      )}
    </div>
  );
};
