import { PieceType, Player, BoardState, Piece } from './types';

let idCounter = 0;
export const createPiece = (type: PieceType, owner: Player): Piece => ({
  id: `piece_${idCounter++}`,
  type,
  owner,
});

export const getInitialBoard = (): BoardState => [
  // y = 0 (Gote)
  [
    createPiece('lance', 'gote'), createPiece('knight', 'gote'), createPiece('silver', 'gote'), createPiece('gold', 'gote'), createPiece('king', 'gote'), createPiece('gold', 'gote'), createPiece('silver', 'gote'), createPiece('knight', 'gote'), createPiece('lance', 'gote')
  ],
  // y = 1 (Gote)
  [
    null, createPiece('rook', 'gote'), null, null, null, null, null, createPiece('bishop', 'gote'), null
  ],
  // y = 2 (Gote Pawns)
  Array(9).fill(null).map(() => createPiece('pawn', 'gote')),
  // y = 3
  Array(9).fill(null),
  // y = 4
  Array(9).fill(null),
  // y = 5
  Array(9).fill(null),
  // y = 6 (Sente Pawns)
  Array(9).fill(null).map(() => createPiece('pawn', 'sente')),
  // y = 7 (Sente)
  [
    null, createPiece('bishop', 'sente'), null, null, null, null, null, createPiece('rook', 'sente'), null
  ],
  // y = 8 (Sente)
  [
    createPiece('lance', 'sente'), createPiece('knight', 'sente'), createPiece('silver', 'sente'), createPiece('gold', 'sente'), createPiece('king', 'sente'), createPiece('gold', 'sente'), createPiece('silver', 'sente'), createPiece('knight', 'sente'), createPiece('lance', 'sente')
  ]
];
