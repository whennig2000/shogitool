import React from 'react';
import type { BoardState, Position, Player } from '../../../shared/types';
import { Cell } from './Cell';

interface Props {
  board: BoardState;
  selectedPos: Position | null;
  validMoves: Position[];
  role: Player;
  lastMove?: { from?: Position; to: Position } | null;
  hintMove?: { from?: Position; to: Position } | null;
  promotionZoneSize?: number;
  displayMode?: 'kanji' | 'symbols' | 'images';
  onSelectCell: (x: number, y: number) => void;
}

export const Board: React.FC<Props> = ({ board, selectedPos, validMoves, role, lastMove, hintMove, promotionZoneSize, displayMode = 'kanji', onSelectCell }) => {
  const actualPromotionZoneSize = promotionZoneSize ?? (board.length >= 9 ? 3 : 1);

  const renderArrow = (move: { from?: Position; to: Position } | null | undefined, color: string, idPrefix: string) => {
    if (!move) return null;
    
    const height = board.length;
    const width = board[0]?.length || 0;
    const viewBox = `0 0 ${width * 100} ${height * 100}`;
    
    // Using a 100x100 virtual cell size
    const getC = (val: number) => val * 100 + 50;

    if (move.from) {
      const x1 = getC(move.from.x);
      const y1 = getC(move.from.y);
      const x2 = getC(move.to.x);
      const y2 = getC(move.to.y);
      return (
        <svg viewBox={viewBox} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
          <defs>
            <marker id={`arrowhead-${idPrefix}`} markerWidth="3" markerHeight="3" refX="2.5" refY="1.5" orient="auto" overflow="visible">
              <polygon points="0 0, 3 1.5, 0 3" fill={color} stroke="rgba(0,0,0,0.6)" strokeWidth="0.5" strokeLinejoin="round" />
            </marker>
          </defs>
          {/* Outline */}
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(0,0,0,0.6)" strokeWidth="5" strokeLinecap="round" />
          {/* Main Arrow */}
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="3" strokeLinecap="round" markerEnd={`url(#arrowhead-${idPrefix})`} />
        </svg>
      );
    } else {
      // Drop: Just highlight the target cell with a circle
      const cx = getC(move.to.x);
      const cy = getC(move.to.y);
      return (
        <svg viewBox={viewBox} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
          {/* Outline */}
          <circle cx={cx} cy={cy} r="25" fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth="10" />
          {/* Main Circle */}
          <circle cx={cx} cy={cy} r="25" fill="none" stroke={color} strokeWidth="6" />
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
      {renderArrow(lastMove, "rgba(234, 179, 8, 0.8)", "last")}
      {renderArrow(hintMove, "rgba(255, 255, 255, 0.5)", "hint")}
      {board.map((row, y) => (
        <React.Fragment key={`row-${y}`}>
          {row.map((cell, x) => {
            const isSelected = selectedPos?.x === x && selectedPos?.y === y;
            const isValidMove = validMoves.some(m => m.x === x && m.y === y);
            
            const isPromotionZone = y < actualPromotionZoneSize || y >= board.length - actualPromotionZoneSize;

            return (
              <Cell 
                key={`${x}-${y}`} 
                cell={cell} 
                x={x} 
                y={y} 
                isSelected={isSelected} 
                isValidMove={isValidMove}
                displayMode={displayMode}
                isPromotionZone={isPromotionZone}
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
