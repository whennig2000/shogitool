import React, { useState, useEffect } from 'react';
import type { BoardState, Position, Player } from '../../../shared/types';
import { Cell } from './Cell';
import { getKanjiMode } from './Settings';

interface Props {
  board: BoardState;
  selectedPos: Position | null;
  validMoves: Position[];
  role: Player;
  lastMove?: { from?: Position; to: Position } | null;
  promotionZoneSize?: number;
  onSelectCell: (x: number, y: number) => void;
}

export const Board: React.FC<Props> = ({ board, selectedPos, validMoves, role, lastMove, promotionZoneSize, onSelectCell }) => {
  const actualPromotionZoneSize = promotionZoneSize ?? (board.length >= 9 ? 3 : 1);
  const [kanjiMode, setKanjiMode] = useState(getKanjiMode());

  useEffect(() => {
    const handleTheme = () => setKanjiMode(getKanjiMode());
    window.addEventListener('themeChanged', handleTheme);
    return () => window.removeEventListener('themeChanged', handleTheme);
  }, []);

  const renderLastMoveArrow = () => {
    if (!lastMove) return null;
    
    const height = board.length;
    const width = board[0]?.length || 0;
    const viewBox = `0 0 ${width * 100} ${height * 100}`;
    
    // Using a 100x100 virtual cell size
    const getC = (val: number) => val * 100 + 50;

    if (lastMove.from) {
      const x1 = getC(lastMove.from.x);
      const y1 = getC(lastMove.from.y);
      const x2 = getC(lastMove.to.x);
      const y2 = getC(lastMove.to.y);
      return (
        <svg viewBox={viewBox} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
          <defs>
            <marker id="arrowhead" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto" overflow="visible">
              <polygon points="0 0, 4 2, 0 4" fill="rgba(234, 179, 8, 0.8)" stroke="rgba(0,0,0,0.6)" strokeWidth="0.5" strokeLinejoin="round" />
            </marker>
          </defs>
          {/* Outline */}
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(0,0,0,0.6)" strokeWidth="10" strokeLinecap="round" />
          {/* Main Arrow */}
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(234, 179, 8, 0.8)" strokeWidth="6" strokeLinecap="round" markerEnd="url(#arrowhead)" />
        </svg>
      );
    } else {
      // Drop: Just highlight the target cell with a circle
      const cx = getC(lastMove.to.x);
      const cy = getC(lastMove.to.y);
      return (
        <svg viewBox={viewBox} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
          {/* Outline */}
          <circle cx={cx} cy={cy} r="25" fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth="10" />
          {/* Main Circle */}
          <circle cx={cx} cy={cy} r="25" fill="none" stroke="rgba(234, 179, 8, 0.8)" strokeWidth="6" />
        </svg>
      );
    }
  };

  return (
    <div className="board-container">
      <div className="board" style={{ 
        transform: role === 'gote' ? 'rotate(180deg)' : 'none', 
        position: 'relative',
        gridTemplateColumns: `repeat(${board[0]?.length || 9}, 1fr)`,
        gridTemplateRows: `repeat(${board.length || 9}, 1fr)`,
        aspectRatio: `${board[0]?.length || 9} / ${board.length || 9}`
      }}>
      {renderLastMoveArrow()}
      {board.map((row, y) => (
        <React.Fragment key={`row-${y}`}>
          {row.map((cell, x) => {
            const isSelected = selectedPos?.x === x && selectedPos?.y === y;
            const isValidMove = validMoves.some(m => m.x === x && m.y === y);
            
            const isCenterZone = y >= actualPromotionZoneSize && y < board.length - actualPromotionZoneSize;
            
            return (
              <Cell 
                key={`cell-${x}-${y}`} 
                cell={cell} 
                x={x} 
                y={y} 
                isSelected={isSelected}
                isValidMove={isValidMove}
                kanjiMode={kanjiMode}
                isCenterZone={isCenterZone}
                onPress={onSelectCell}
              />
            );
          })}
        </React.Fragment>
      ))}
      </div>
    </div>
  );
};
