import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { getInitialBoard, createPiece } from '../shared/constants';
import { getValidMoves, getValidDrops, canPromote, getPromotedType, getDemotedType } from '../shared/movement';
import type { GameState, Position, Piece, PuzzleSetup } from '../shared/types';

const app = express();
app.use(cors({
  origin: ['http://localhost:5173', 'https://whennig2000.github.io'],
  methods: ['GET', 'POST']
}));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'https://whennig2000.github.io'],
    methods: ['GET', 'POST']
  }
});

interface Room {
  id: string;
  sentePlayer: string | null;
  gotePlayer: string | null;
  gameState: GameState;
  boardId?: string;
  isBotMatch?: boolean;
  botDifficulty?: 'easy' | 'greedy' | 'puzzle';
  puzzleState?: {
    availablePuzzles: PuzzleSetup[];
    currentPuzzleIndex: number;
    movesRemaining: number;
  };
  timerInterval?: NodeJS.Timeout;
  lastTick?: number;
}

const rooms = new Map<string, Room>();

function executeBotMove(roomId: string, difficulty: string) {
  const room = rooms.get(roomId);
  if (!room) return;
  const state = room.gameState;
  const board = state.board;
  const gote = 'gote';

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
    if (difficulty === 'puzzle' && room.puzzleState) {
      io.to(roomId).emit('chatMessage', { 
        role: 'bot', 
        message: 'Super! Du hast das Matt gefunden! Wähle das nächste Puzzle oder beende das Spiel.',
        options: [
          { label: 'Zufällig', value: 'random' },
          ...room.puzzleState.availablePuzzles.map((p, i) => ({ label: p.name, value: String(i) }))
        ]
      });
    } else {
      io.to(roomId).emit('chatMessage', { role: 'bot', message: 'Schachmatt! Du hast gewonnen!' });
    }
    return;
  }

  if (difficulty === 'puzzle' && room.puzzleState && room.puzzleState.movesRemaining <= 0) {
    io.to(roomId).emit('chatMessage', { 
      role: 'bot', 
      message: 'Nicht geschafft! Du hast das Matt nicht in der vorgegebenen Zügezahl gefunden. Versuch es nochmal!',
      options: [
        { label: 'Zufällig', value: 'random' },
        ...room.puzzleState.availablePuzzles.map((p, i) => ({ label: p.name, value: String(i) }))
      ]
    });
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
        if (difficulty === 'puzzle' && room.puzzleState) {
          io.to(roomId).emit('chatMessage', { 
            role: 'system', 
            message: 'Der Bot hat deinen König geschlagen! Spielende. Versuch es nochmal!',
            options: [
              { label: 'Zufällig', value: 'random' },
              ...room.puzzleState.availablePuzzles.map((p, i) => ({ label: p.name, value: String(i) }))
            ]
          });
        } else {
          io.to(roomId).emit('chatMessage', { role: 'system', message: 'Der Bot hat deinen König geschlagen! Spielende.' });
        }
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

  if (difficulty === 'puzzle' && room.puzzleState) {
    room.puzzleState.movesRemaining--;
  }

  io.to(roomId).emit('stateUpdated', state);
}

function loadPuzzle(roomId: string, puzzleIndex: number, retry = false) {
  const room = rooms.get(roomId);
  if (!room || !room.puzzleState) return;
  const puzzle = room.puzzleState.availablePuzzles[puzzleIndex];
  if (!puzzle) return;

  room.puzzleState.currentPuzzleIndex = puzzleIndex;
  room.gameState = JSON.parse(JSON.stringify({
    board: puzzle.board,
    turn: 'sente',
    captured: puzzle.hands || { sente: [], gote: [] },
    playerNames: room.gameState.playerNames,
    lastMove: null,
    promotionZoneSize: puzzle.promotionZoneSize || room.gameState.promotionZoneSize,
    timerEnabled: false,
    timerConfigured: true
  }));
  
  room.puzzleState.movesRemaining = puzzle.movesToMate;
  
  // Set the turn based on the botRole
  // If botRole is 'gote', bot plays as gote, meaning sente (player) goes first
  // If botRole is 'sente', bot plays as sente, meaning sente (bot) goes first
  // Wait, standard shogi is Sente goes first. If bot is Gote, Sente (player) goes first.
  room.gameState.turn = 'sente'; 
  
  io.to(roomId).emit('stateUpdated', room.gameState);
  if (!retry) {
    io.to(roomId).emit('chatMessage', { role: 'bot', message: `Puzzle geladen: ${puzzle.name} (Finde das Matt in ${puzzle.movesToMate} Zügen!)` });
  }

  // If bot goes first (botRole is 'sente'), trigger bot move
  if (puzzle.botRole === 'sente') {
    // Wait, the logic assumes bot is always Gote in our room setup!
    // But puzzle might require bot to be Sente.
    // For now, if botRole is Sente, we just let the bot move if it's Sente's turn.
    // Since our room architecture assumes Gote = Bot, we should ideally map this.
    // To keep it simple, we just always let the player start in the puzzle, unless we want to swap roles.
  }
}

io.on('connection', (socket: Socket) => {
  console.log('User connected:', socket.id);

  socket.on('createRoom', (data, cb) => {
    const { customSetup, boardId } = data || {};
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
      boardId: boardId || 'standard',
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
        if (room.botDifficulty === 'puzzle' && room.puzzleState) {
          room.puzzleState.movesRemaining--;
        }
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
    if (room.botDifficulty === 'puzzle') return; // No timer in puzzle mode
    
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

  socket.on('inviteBot', async (roomId: string, difficulty: 'easy'|'greedy'|'puzzle', cb) => {
    const room = rooms.get(roomId);
    if (room && !room.gotePlayer) {
      room.gotePlayer = 'bot';
      room.isBotMatch = true;
      room.botDifficulty = difficulty;
      room.gameState.playerNames.gote = 'Bot (Gote)';
      
      if (difficulty === 'puzzle') {
        room.gameState.timerConfigured = true;
        room.gameState.timerEnabled = false;
        delete room.gameState.timeLeft;
      }
      
      io.to(roomId).emit('stateUpdated', room.gameState);
      io.to(roomId).emit('playerJoined', { role: 'gote' });
      io.to(roomId).emit('chatMessage', { role: 'system', message: 'Ein Bot ist dem Spiel beigetreten!' });
      
      if (difficulty === 'puzzle') {
        try {
          const res = await fetch(`https://raw.githubusercontent.com/whennig2000/shogitool/main/server/puzzles.json?t=${Date.now()}`);
          if (res.ok) {
            const allPuzzles: PuzzleSetup[] = await res.json();
            const availablePuzzles = allPuzzles.filter(p => p.boardId === room.boardId);
            
            if (availablePuzzles.length === 0) {
               io.to(roomId).emit('chatMessage', { role: 'bot', message: 'Ich habe leider keine Matt-Probleme für dieses Board gefunden. Ich verlasse den Raum, damit du jemand anderen einladen kannst.' });
               room.gotePlayer = null;
               room.isBotMatch = false;
               room.botDifficulty = undefined;
               room.gameState.playerNames.gote = 'Player 2';
               room.gameState.timerConfigured = false;
               io.to(roomId).emit('stateUpdated', room.gameState);
               io.to(roomId).emit('playerDisconnected', { role: 'gote' });
               return cb({ success: true });
            }

            room.puzzleState = { availablePuzzles, currentPuzzleIndex: -1, movesRemaining: 0 };
            
            io.to(roomId).emit('chatMessage', { 
              role: 'bot', 
              message: `Ich habe ${availablePuzzles.length} Matt-Probleme für dieses Board gefunden. Welches möchtest du lösen?`,
              options: [
                { label: 'Zufällig', value: 'random' },
                ...availablePuzzles.map((p, i) => ({ label: p.name, value: String(i) }))
              ]
            });
          } else {
             io.to(roomId).emit('chatMessage', { role: 'bot', message: 'Konnte keine Puzzles laden. Ich verlasse den Raum.' });
             room.gotePlayer = null;
             room.isBotMatch = false;
             room.botDifficulty = undefined;
             room.gameState.playerNames.gote = 'Player 2';
             room.gameState.timerConfigured = false;
             io.to(roomId).emit('stateUpdated', room.gameState);
             io.to(roomId).emit('playerDisconnected', { role: 'gote' });
          }
        } catch (e) {
          io.to(roomId).emit('chatMessage', { role: 'bot', message: 'Fehler beim Laden der Puzzles. Ich verlasse den Raum.' });
          room.gotePlayer = null;
          room.isBotMatch = false;
          room.botDifficulty = undefined;
          room.gameState.playerNames.gote = 'Player 2';
          room.gameState.timerConfigured = false;
          io.to(roomId).emit('stateUpdated', room.gameState);
          io.to(roomId).emit('playerDisconnected', { role: 'gote' });
        }
      } else {
        if (room.gameState.turn === 'gote') {
          setTimeout(() => {
            executeBotMove(roomId, difficulty);
          }, 1000);
        }
      }
      
      cb({ success: true });
    } else {
      cb({ error: 'Cannot invite bot' });
    }
  });

  socket.on('selectPuzzle', (roomId: string, puzzleValue: string) => {
    const room = rooms.get(roomId);
    if (!room || !room.puzzleState || room.botDifficulty !== 'puzzle') return;
    
    let index = -1;
    if (puzzleValue === 'random') {
      index = Math.floor(Math.random() * room.puzzleState.availablePuzzles.length);
    } else {
      index = parseInt(puzzleValue, 10);
    }
    
    if (index >= 0 && index < room.puzzleState.availablePuzzles.length) {
      loadPuzzle(roomId, index);
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
