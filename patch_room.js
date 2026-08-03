const fs = require('fs');
let code = fs.readFileSync('server/index.ts', 'utf8');

code = code.replace(
  "  timerInterval?: NodeJS.Timeout;",
  "  timerInterval?: NodeJS.Timeout;\n  disconnectTimeouts?: Record<string, NodeJS.Timeout>;"
);

// update joinRoom logic
const joinRoomTarget = `  socket.on('joinRoom', (roomId: string, cb) => {
    const room = rooms.get(roomId);
    if (!room) {
      return cb({ error: 'Room not found' });
    }

    if (room.sentePlayer === socket.id || room.gotePlayer === socket.id) {
       const role = room.sentePlayer === socket.id ? 'sente' : 'gote';
       const opponentConnected = role === 'sente' ? !!room.gotePlayer : !!room.sentePlayer;
       cb({ roomId, role, gameState: room.gameState, opponentConnected });
       return;
    }`;

const joinRoomReplacement = `  socket.on('joinRoom', (roomId: string, cb) => {
    const room = rooms.get(roomId);
    if (!room) {
      return cb({ error: 'Room not found' });
    }

    // Try to reconnect if there's a disconnected player timeout pending
    if (room.disconnectTimeouts) {
       if (room.disconnectTimeouts['sente'] && !room.sentePlayer) {
          clearTimeout(room.disconnectTimeouts['sente']);
          delete room.disconnectTimeouts['sente'];
          room.sentePlayer = socket.id;
          socket.join(roomId);
          io.to(roomId).emit('playerConnectionRestored', { role: 'sente' });
          return cb({ roomId, role: 'sente', gameState: room.gameState, opponentConnected: !!room.gotePlayer });
       }
       if (room.disconnectTimeouts['gote'] && !room.gotePlayer) {
          clearTimeout(room.disconnectTimeouts['gote']);
          delete room.disconnectTimeouts['gote'];
          room.gotePlayer = socket.id;
          socket.join(roomId);
          io.to(roomId).emit('playerConnectionRestored', { role: 'gote' });
          return cb({ roomId, role: 'gote', gameState: room.gameState, opponentConnected: !!room.sentePlayer });
       }
    }

    if (room.sentePlayer === socket.id || room.gotePlayer === socket.id) {
       const role = room.sentePlayer === socket.id ? 'sente' : 'gote';
       const opponentConnected = role === 'sente' ? !!room.gotePlayer : !!room.sentePlayer;
       cb({ roomId, role, gameState: room.gameState, opponentConnected });
       return;
    }`;

code = code.replace(joinRoomTarget, joinRoomReplacement);
fs.writeFileSync('server/index.ts', code);
