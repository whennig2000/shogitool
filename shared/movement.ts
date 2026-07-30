import type { BoardState, Position, PieceType, Player, Piece } from './types';

export const isOutOfBounds = (board: BoardState, x: number, y: number): boolean => {
  return x < 0 || x >= board[0].length || y < 0 || y >= board.length;
};

const getForwardDir = (player: Player) => player === 'sente' ? -1 : 1;

export const getPseudoLegalMoves = (board: BoardState, pos: Position): Position[] => {
  if (!board[pos.y]) return [];
  const piece = board[pos.y][pos.x];
  if (!piece) return [];

  const forward = getForwardDir(piece.owner);
  const moves: Position[] = [];

  const addMoveIfValid = (x: number, y: number): boolean => {
    if (isOutOfBounds(board, x, y)) return false;
    const targetCell = board[y][x];
    if (targetCell && targetCell.owner === piece.owner) return false;
    moves.push({ x, y });
    return !targetCell; 
  };

  const addLine = (dx: number, dy: number) => {
    let nx = pos.x + dx;
    let ny = pos.y + dy;
    while (!isOutOfBounds(board, nx, ny)) {
      if (!addMoveIfValid(nx, ny)) break;
      nx += dx;
      ny += dy;
    }
  };

  const { type } = piece;
  
  const kingMoves = () => {
    ([[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]] as [number, number][]).forEach(([dx, dy]) => addMoveIfValid(pos.x + dx, pos.y + dy));
  };
  const goldMoves = () => {
    ([[-1, forward], [0, forward], [1, forward], [-1, 0], [1, 0], [0, -forward]] as [number, number][]).forEach(([dx, dy]) => addMoveIfValid(pos.x + dx, pos.y + dy));
  };
  const silverMoves = () => {
    ([[-1, forward], [0, forward], [1, forward], [-1, -forward], [1, -forward]] as [number, number][]).forEach(([dx, dy]) => addMoveIfValid(pos.x + dx, pos.y + dy));
  };
  const rookMoves = () => {
    addLine(1, 0); addLine(-1, 0); addLine(0, 1); addLine(0, -1);
  };
  const bishopMoves = () => {
    addLine(1, 1); addLine(1, -1); addLine(-1, 1); addLine(-1, -1);
  };

  switch (type) {
    case 'pawn':
      addMoveIfValid(pos.x, pos.y + forward);
      break;
    case 'lance':
      addLine(0, forward);
      break;
    case 'knight':
      addMoveIfValid(pos.x - 1, pos.y + forward * 2);
      addMoveIfValid(pos.x + 1, pos.y + forward * 2);
      break;
    case 'silver':
      silverMoves();
      break;
    case 'gold':
    case 'promoted_silver':
    case 'promoted_knight':
    case 'promoted_lance':
    case 'promoted_pawn':
      goldMoves();
      break;
    case 'bishop':
      bishopMoves();
      break;
    case 'rook':
      rookMoves();
      break;
    case 'king':
      kingMoves();
      break;
    case 'promoted_bishop':
      bishopMoves();
      ([[-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][]).forEach(([dx, dy]) => addMoveIfValid(pos.x + dx, pos.y + dy));
      break;
    case 'promoted_rook':
      rookMoves();
      ([[-1, -1], [1, -1], [-1, 1], [1, 1]] as [number, number][]).forEach(([dx, dy]) => addMoveIfValid(pos.x + dx, pos.y + dy));
      break;
  }

  return moves;
};

export const getPseudoLegalDrops = (board: BoardState, pieceType: PieceType, player: Player): Position[] => {
  const moves: Position[] = [];
  const height = board.length;
  const width = board[0]?.length || 0;
  
  const forbiddenColumns = new Set<number>();
  if (pieceType === 'pawn') {
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const cell = board[y][x];
        if (cell && cell.owner === player && cell.type === 'pawn') {
          forbiddenColumns.add(x);
          break;
        }
      }
    }
  }

  for (let x = 0; x < width; x++) {
    if (pieceType === 'pawn' && forbiddenColumns.has(x)) continue;

    for (let y = 0; y < height; y++) {
      if (board[y][x] === null) {
        if (player === 'sente') {
          if ((pieceType === 'pawn' || pieceType === 'lance') && y === 0) continue;
          if (pieceType === 'knight' && y <= 1) continue;
        } else {
          if ((pieceType === 'pawn' || pieceType === 'lance') && y === height - 1) continue;
          if (pieceType === 'knight' && y >= height - 2) continue;
        }
        moves.push({ x, y });
      }
    }
  }
  return moves;
};

export const canPromote = (board: BoardState, zoneSize: number, y: number, player: Player): boolean => {
  const height = board.length;
  return player === 'sente' ? y < zoneSize : y >= height - zoneSize;
};

export const getPromotedType = (type: PieceType): PieceType | null => {
  switch (type) {
    case 'pawn': return 'promoted_pawn';
    case 'lance': return 'promoted_lance';
    case 'knight': return 'promoted_knight';
    case 'silver': return 'promoted_silver';
    case 'bishop': return 'promoted_bishop';
    case 'rook': return 'promoted_rook';
    default: return null;
  }
};

export const getDemotedType = (type: PieceType): PieceType => {
  switch (type) {
    case 'promoted_pawn': return 'pawn';
    case 'promoted_lance': return 'lance';
    case 'promoted_knight': return 'knight';
    case 'promoted_silver': return 'silver';
    case 'promoted_bishop': return 'bishop';
    case 'promoted_rook': return 'rook';
    default: return type;
  }
};

// --- Check and Checkmate Logic ---

const findKing = (board: BoardState, player: Player): Position | null => {
  const height = board.length;
  const width = board[0]?.length || 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = board[y][x];
      if (p && p.type === 'king' && p.owner === player) {
        return { x, y };
      }
    }
  }
  return null;
};

export const isKingInCheck = (board: BoardState, player: Player): boolean => {
  const kingPos = findKing(board, player);
  if (!kingPos) return true; // Treat missing king as checkmated/dead

  const opponent = player === 'sente' ? 'gote' : 'sente';
  const height = board.length;
  const width = board[0]?.length || 0;

  // Check all opponent pieces to see if any can move to kingPos
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const piece = board[y][x];
      if (piece && piece.owner === opponent) {
        const moves = getPseudoLegalMoves(board, { x, y });
        if (moves.some(m => m.x === kingPos.x && m.y === kingPos.y)) {
          return true;
        }
      }
    }
  }
  return false;
};

// Simulates a board move and returns the new board
const simulateMove = (board: BoardState, from: Position, to: Position): BoardState => {
  const newBoard = board.map(r => [...r]);
  newBoard[to.y][to.x] = newBoard[from.y][from.x];
  newBoard[from.y][from.x] = null;
  return newBoard;
};

const simulateDrop = (board: BoardState, pos: Position, pieceType: PieceType, player: Player): BoardState => {
  const newBoard = board.map(r => [...r]);
  // We mock a Piece object enough for movement simulation. 'id' doesn't matter for check simulation.
  newBoard[pos.y][pos.x] = { id: 'sim', type: pieceType, owner: player };
  return newBoard;
};

export const getValidMoves = (board: BoardState, pos: Position): Position[] => {
  const pseudoMoves = getPseudoLegalMoves(board, pos);
  const player = board[pos.y]?.[pos.x]?.owner;
  if (!player) return [];

  // Filter out moves that leave the king in check
  return pseudoMoves.filter(move => {
    const nextBoard = simulateMove(board, pos, move);
    return !isKingInCheck(nextBoard, player);
  });
};

export const getValidDrops = (board: BoardState, pieceType: PieceType, player: Player): Position[] => {
  const pseudoDrops = getPseudoLegalDrops(board, pieceType, player);
  
  // Filter out drops that leave the king in check
  return pseudoDrops.filter(drop => {
    const nextBoard = simulateDrop(board, drop, pieceType, player);
    return !isKingInCheck(nextBoard, player);
  });
};

export const hasAnyLegalMoves = (board: BoardState, player: Player, captured: Piece[]): boolean => {
  const height = board.length;
  const width = board[0]?.length || 0;
  
  // Check board moves
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const piece = board[y][x];
      if (piece && piece.owner === player) {
        if (getValidMoves(board, { x, y }).length > 0) return true;
      }
    }
  }
  
  // Check drops
  const uniqueDrops = new Set<string>();
  for (const piece of captured) {
    if (!uniqueDrops.has(piece.type)) {
      uniqueDrops.add(piece.type);
      if (getValidDrops(board, piece.type, player).length > 0) return true;
    }
  }

  return false;
};
