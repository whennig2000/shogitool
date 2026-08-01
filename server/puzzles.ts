import { createPiece } from '../shared/constants';
import type { GameState, BoardState, Piece } from '../shared/types';

function createEmptyBoard(): BoardState {
  return Array(9).fill(null).map(() => Array(9).fill(null));
}

// Puzzle 1: Mate in 1
// Sente has a Gold in hand.
// Gote King at 4,0 is trapped by his own pawns.
// Sente drops Gold at 4,1 -> Checkmate.
function getPuzzle1(): GameState {
  const board = createEmptyBoard();
  board[0][4] = createPiece('king', 'gote');
  board[0][3] = createPiece('pawn', 'gote');
  board[0][5] = createPiece('pawn', 'gote');
  board[1][3] = createPiece('pawn', 'gote');
  board[1][5] = createPiece('pawn', 'gote');

  return {
    board,
    turn: 'sente',
    captured: {
      sente: [createPiece('gold', 'sente')],
      gote: []
    },
    playerNames: { sente: 'Player', gote: 'Puzzle Bot' },
    promotionZoneSize: 3
  };
}

// Puzzle 2: Mate in 3
// Sente has Rook in hand.
// Gote has a Pawn in hand.
// King trapped at 4,0.
// Sente drops Rook at 4,2. Check!
// Gote MUST block by dropping Pawn at 4,1.
// Sente moves Rook 4,2 -> 4,1 (captures Pawn, promotes to Dragon). Checkmate!
function getPuzzle2(): GameState {
  const board = createEmptyBoard();
  board[0][4] = createPiece('king', 'gote');
  board[0][3] = createPiece('pawn', 'gote');
  board[0][5] = createPiece('pawn', 'gote');
  board[1][3] = createPiece('pawn', 'gote');
  board[1][5] = createPiece('pawn', 'gote');

  return {
    board,
    turn: 'sente',
    captured: {
      sente: [createPiece('rook', 'sente')],
      gote: [createPiece('pawn', 'gote')]
    },
    playerNames: { sente: 'Player', gote: 'Puzzle Bot' },
    promotionZoneSize: 3
  };
}

export const PUZZLES = [
  {
    state: getPuzzle1(),
    movesToMate: 1, // 1 ply
    message: "Finde das Matt in 1 Zug!"
  },
  {
    state: getPuzzle2(),
    movesToMate: 3, // 3 plies (Sente, Gote, Sente)
    message: "Finde das Matt in 3 Zügen! (Sente, Gote, Sente)"
  }
];
