export type Player = 'sente' | 'gote'; // Sente (bottom, goes first), Gote (top, goes second)

export type PieceType = 
  | 'king'
  | 'rook'
  | 'bishop'
  | 'gold'
  | 'silver'
  | 'knight'
  | 'lance'
  | 'pawn'
  | 'promoted_rook'
  | 'promoted_bishop'
  | 'promoted_silver'
  | 'promoted_knight'
  | 'promoted_lance'
  | 'promoted_pawn';

export interface Piece {
  id: string; // Unique ID for React rendering and tracking
  type: PieceType;
  owner: Player;
}

export type Cell = Piece | null;

export type BoardState = Cell[][]; // 9x9 array, y is row (0-8, top to bottom), x is col (0-8, left to right)

export interface Position {
  x: number;
  y: number;
}

export interface GameState {
  board: BoardState;
  turn: Player;
  captured: {
    sente: Piece[];
    gote: Piece[];
  };
  playerNames: {
    sente: string;
    gote: string;
  };
  lastMove?: {
    from?: Position;
    to: Position;
  } | null;
  promotionZoneSize?: number;
  timerEnabled?: boolean;
  timerConfigured?: boolean;
  timeLeft?: { sente: number; gote: number };
}

export interface CustomSetup {
  id: string;
  name: string;
  width: number;
  height: number;
  board: BoardState;
  hands: {
    sente: Piece[];
    gote: Piece[];
  };
  promotionZoneSize?: number;
}

export interface ThemeConfig {
  id: string;
  name: string;
  displayMode: 'kanji' | 'symbols' | 'images';
  colors: {
    boardBg: string;
    boardLines: string;
    centerBg: string;
    sentePrimary: string;
    gotePrimary: string;
  };
}
