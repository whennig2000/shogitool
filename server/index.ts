import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { getInitialBoard, createPiece } from '../shared/constants';
import { getValidMoves, getValidDrops, canPromote, getPromotedType, getDemotedType } from '../shared/movement';
import type { GameState, Position, Piece } from '../shared/types';

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

interface Room {
  id: string;
  sentePlayer: string | null;
  gotePlayer: string | null;
  gameState: GameState;
  isBotMatch?: boolean;
  botDifficulty?: 'easy' | 'greedy' | 'puzzle';
  timerInterval?: NodeJS.Timeout;
  lastTick?: number;
}

const rooms = new Map<string, Room>();

const SETUPS_FILE = path.join(__dirname, 'setups.json');
let globalSetups: any[] = [];
try {
  if (fs.existsSync(SETUPS_FILE)) {
    globalSetups = JSON.parse(fs.readFileSync(SETUPS_FILE, 'utf-8'));
  }
} catch (err) {
  console.error('Failed to load setups.json', err);
}

function executeBotMove(roomId: string, difficulty: string) {
  const room = rooms.get(roomId);
  if (!room) return;
  const state = room.gameState;
  const board = state.board;
  const gote = 'gote';

  if (difficulty === 'puzzle') {
    io.to(roomId).emit('chatMessage', { role: 'bot', message: 'Puzzle-Modus: In dieser Demo agiere ich wie ein normaler Bot, versuche trotzdem zu gewinnen!' });
    difficulty = 'greedy'; 
  }

  // Collect all possible moves
  const possibleMoves: any[] = [];
  const height = board.length;
  const width = board[0].length;
  
  // 1. Board moves
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const piece = board[y][x];
      if (piece && piece.owner === gote) {
        const moves = getValidMoves(board, {x, y});
        for (const m of moves) {
          possibleMoves.push({
            type: 'move',
            from: {x, y},
            to: m,
            piece: piece,
            target: board[m.y][m.x]
          });
        }
      }
    }
  }

  // 2. Drops
  const captured = state.captured[gote];
  const uniqueDrops = new Set<string>(); 
  for (const piece of captured) {
    if (!uniqueDrops.has(piece.type)) {
      uniqueDrops.add(piece.type);
      const drops = getValidDrops(board, piece.type, gote);
      for (const d of drops) {
        possibleMoves.push({
          type: 'drop',
          to: d,
          piece: piece
        });
      }
    }
  }

  if (possibleMoves.length === 0) {
    io.to(roomId).emit('chatMessage', { role: 'bot', message: 'Schachmatt! Du hast gewonnen!' });
    return;
  }

  // Select move
  let selectedMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];

  if (difficulty === 'greedy') {
    const captures = possibleMoves.filter(m => m.type === 'move' && m.target !== null);
    if (captures.length > 0) {
      selectedMove = captures[Math.floor(Math.random() * captures.length)];
      io.to(roomId).emit('chatMessage', { role: 'bot', message: 'Lecker, eine Figur geschnappt!' });
    }
  }

  // Execute selected move
  const newBoard = board.map((r: any) => [...r]);
  const newCaptured = { ...state.captured };

  if (selectedMove.type === 'drop') {
    newBoard[selectedMove.to.y][selectedMove.to.x] = { ...selectedMove.piece, owner: gote };
    
    // Remove exactly one instance of this piece type from hand
    const idx = newCaptured[gote].findIndex((p: any) => p.type === selectedMove.piece.type);
    if (idx !== -1) {
      newCaptured[gote].splice(idx, 1);
    }
    state.lastMove = { to: selectedMove.to };
  } else {
    newBoard[selectedMove.from.y][selectedMove.from.x] = null;
    if (selectedMove.target) {
      if (selectedMove.target.type === 'king') {
        io.to(roomId).emit('chatMessage', { role: 'system', message: 'Der Bot hat deinen König geschlagen! Spielende.' });
      } else {
        const demoted = getDemotedType(selectedMove.target.type);
        newCaptured[gote].push(createPiece(demoted, gote));
      }
    }
    
    let finalPiece = selectedMove.piece;
    if (getPromotedType(finalPiece.type)) {
      // Auto promote for bot if possible
      const zone = state.promotionZoneSize || (board.length >= 9 ? 3 : 1);
      if (canPromote(board, zone, selectedMove.from.y, gote) || canPromote(board, zone, selectedMove.to.y, gote)) {
        finalPiece = { ...finalPiece, type: getPromotedType(finalPiece.type)! };
      }
    }
    newBoard[selectedMove.to.y][selectedMove.to.x] = finalPiece;
    state.lastMove = { from: selectedMove.from, to: selectedMove.to };
  }

  state.board = newBoard;
  state.captured = newCaptured;
  state.turn = 'sente';

  // Random tips
  if (difficulty !== 'puzzle' && Math.random() < 0.3) {
    const tips = [
      "Tipp: Achte auf Gabel-Angriffe mit dem Springer!",
      "Tipp: Behalte den gegnerischen Turm im Auge.",
      "Tipp: Ein König auf dem Rand ist oft sicherer.",
      "Tipp: Verliere keine Bauern unnötig."
    ];
    io.to(roomId).emit('chatMessage', { role: 'bot', message: tips[Math.floor(Math.random() * tips.length)] });
  }

  io.to(roomId).emit('stateUpdated', state);
}

io.on('connection', (socket: Socket) => {
  console.log('User connected:', socket.id);

  socket.on('getSetups', (cb) => {
    cb(globalSetups);
  });

  socket.on('saveSetup', (setup, cb) => {
    globalSetups.push(setup);
    try {
      fs.writeFileSync(SETUPS_FILE, JSON.stringify(globalSetups, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save setups.json', err);
    }
    io.emit('setupsUpdated', globalSetups);
    if (cb) cb({ success: true });
  });

  socket.on('createRoom', (data, cb) => {
    const { customSetup } = data || {};
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    let board = getInitialBoard();
    let captured = { sente: [], gote: [] };
    let promotionZoneSize = board.length >= 9 ? 3 : 1;
    
    if (customSetup && customSetup.board) {
      board = customSetup.board;
      captured = customSetup.hands || captured;
      if (customSetup.promotionZoneSize !== undefined) {
        promotionZoneSize = customSetup.promotionZoneSize;
      } else {
        promotionZoneSize = board.length >= 9 ? 3 : 1;
      }
    }

    const newRoom: Room = {
      id: roomId,
      sentePlayer: socket.id,
      gotePlayer: null,
      gameState: {
        board,
        turn: 'sente',
        captured,
        playerNames: { sente: 'Player 1', gote: 'Player 2' },
        lastMove: null,
        promotionZoneSize
      }
    };

    rooms.set(roomId, newRoom);
    
    socket.join(roomId);
    cb({ roomId, role: 'sente' });
    console.log(`Room ${roomId} created by ${socket.id} with customSetup: ${!!customSetup}`);
  });

  socket.on('joinRoom', (roomId: string, cb) => {
    const room = rooms.get(roomId);
    if (!room) {
      return cb({ error: 'Room not found' });
    }

    if (room.sentePlayer === socket.id || room.gotePlayer === socket.id) {
       const role = room.sentePlayer === socket.id ? 'sente' : 'gote';
       const opponentConnected = role === 'sente' ? !!room.gotePlayer : !!room.sentePlayer;
       cb({ roomId, role, gameState: room.gameState, opponentConnected });
       return;
    }

    if (room.gotePlayer) {
      return cb({ error: 'Room is full' });
    }

    room.gotePlayer = socket.id;
    socket.join(roomId);
    cb({ roomId, role: 'gote', gameState: room.gameState, opponentConnected: !!room.sentePlayer });
    
    io.to(roomId).emit('playerJoined', { role: 'gote' });
    console.log(`${socket.id} joined room ${roomId}`);
  });

  socket.on('updateState', (roomId: string, newState: any) => {
    const room = rooms.get(roomId);
    if (room) {
      if (room.gameState.timerEnabled) {
        newState.timerEnabled = true;
        newState.timeLeft = room.gameState.timeLeft;
      }
      room.gameState = newState;
      socket.to(roomId).emit('stateUpdated', newState);

      if (room.isBotMatch && newState.turn === 'gote') {
        setTimeout(() => {
          executeBotMove(roomId, room.botDifficulty || 'easy');
        }, 1000);
      }
    }
  });

  socket.on('setTimer', (roomId: string, seconds: number | null) => {
    const room = rooms.get(roomId);
    if (!room) return;
    if (room.gameState.timerConfigured) return; // Cannot change after it is configured
    
    room.gameState.timerConfigured = true;

    if (seconds === null) {
      room.gameState.timerEnabled = false;
      delete room.gameState.timeLeft;
    } else {
      room.gameState.timerEnabled = true;
      room.gameState.timeLeft = { sente: seconds, gote: seconds };
      
      // Start timer immediately!
      room.lastTick = Date.now();
      room.timerInterval = setInterval(() => {
        if (!room.sentePlayer || !room.gotePlayer) return; // Pause if someone disconnects
        const now = Date.now();
        const delta = (now - room.lastTick!) / 1000;
        room.lastTick = now;
        
        const turn = room.gameState.turn;
        if (room.gameState.timeLeft && room.gameState.timeLeft[turn] > 0) {
          room.gameState.timeLeft[turn] -= delta;
          if (room.gameState.timeLeft[turn] <= 0) {
            room.gameState.timeLeft[turn] = 0;
            clearInterval(room.timerInterval!);
            io.to(roomId).emit('timeExpired', turn);
          }
          io.to(roomId).emit('syncTime', room.gameState.timeLeft);
        }
      }, 1000);
    }
    
    io.to(roomId).emit('stateUpdated', room.gameState);
  });

  socket.on('inviteBot', (roomId: string, difficulty: 'easy'|'greedy'|'puzzle', cb) => {
    const room = rooms.get(roomId);
    if (room && !room.gotePlayer) {
      room.gotePlayer = 'bot';
      room.isBotMatch = true;
      room.botDifficulty = difficulty;
      room.gameState.playerNames.gote = 'Bot (Gote)';
      io.to(roomId).emit('stateUpdated', room.gameState);
      io.to(roomId).emit('playerJoined', { role: 'gote' });
      io.to(roomId).emit('chatMessage', { role: 'system', message: 'Ein Bot ist dem Spiel beigetreten!' });
      
      if (room.gameState.turn === 'gote') {
        setTimeout(() => {
          executeBotMove(roomId, difficulty);
        }, 1000);
      }
      
      cb({ success: true });
    } else {
      cb({ error: 'Cannot invite bot' });
    }
  });
  
  socket.on('sendMessage', (roomId: string, message: string, role: string) => {
    io.to(roomId).emit('chatMessage', { role, message });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    rooms.forEach((room, roomId) => {
      if (room.sentePlayer === socket.id || room.gotePlayer === socket.id) {
         io.to(room.id).emit('playerDisconnected', { 
           role: room.sentePlayer === socket.id ? 'sente' : 'gote'
         });
         
         if (room.sentePlayer === socket.id) room.sentePlayer = null;
         if (room.gotePlayer === socket.id && room.gotePlayer !== 'bot') room.gotePlayer = null;
         
         if (room.timerInterval && (!room.sentePlayer || !room.gotePlayer)) {
            clearInterval(room.timerInterval);
         }

         if (!room.sentePlayer && (!room.gotePlayer || room.gotePlayer === 'bot')) {
           rooms.delete(room.id);
         }
      }
    });
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
