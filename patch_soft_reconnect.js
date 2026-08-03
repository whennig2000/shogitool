const fs = require('fs');

// Patch Server
let serverCode = fs.readFileSync('server/index.ts', 'utf8');

const targetServerStr = `  socket.on('joinRoom', (roomId: string, cb) => {
    const room = rooms.get(roomId);
    if (!room) {
      return cb({ error: 'Room not found' });
    }

    // Try to reconnect if there's a disconnected player timeout pending`;

const replaceServerStr = `  socket.on('joinRoom', (roomId: string, requestedRole: string | Function, cbObj?: Function) => {
    let cb: Function;
    let reqRole: string | undefined = undefined;
    
    if (typeof requestedRole === 'function') {
      cb = requestedRole as Function;
    } else {
      reqRole = requestedRole as string;
      cb = cbObj as Function;
    }

    const room = rooms.get(roomId);
    if (!room) {
      return cb({ error: 'Room not found' });
    }

    // Explicit force-reconnect if role is provided
    if (reqRole === 'sente' && room.sentePlayer !== socket.id) {
       room.sentePlayer = socket.id;
       if (room.disconnectTimeouts && room.disconnectTimeouts['sente']) {
           clearTimeout(room.disconnectTimeouts['sente']);
           delete room.disconnectTimeouts['sente'];
       }
       socket.join(roomId);
       io.to(roomId).emit('playerConnectionRestored', { role: 'sente' });
       return cb({ roomId, role: 'sente', gameState: room.gameState, opponentConnected: !!room.gotePlayer });
    }
    
    if (reqRole === 'gote' && room.gotePlayer !== socket.id) {
       room.gotePlayer = socket.id;
       if (room.disconnectTimeouts && room.disconnectTimeouts['gote']) {
           clearTimeout(room.disconnectTimeouts['gote']);
           delete room.disconnectTimeouts['gote'];
       }
       socket.join(roomId);
       io.to(roomId).emit('playerConnectionRestored', { role: 'gote' });
       return cb({ roomId, role: 'gote', gameState: room.gameState, opponentConnected: !!room.sentePlayer });
    }

    // Try to reconnect if there's a disconnected player timeout pending`;

serverCode = serverCode.replace(targetServerStr, replaceServerStr);
fs.writeFileSync('server/index.ts', serverCode);

// Patch Client
let clientCode = fs.readFileSync('client/src/components/Game.tsx', 'utf8');

const targetClientStr = `    const doJoin = () => {
      socket.emit('joinRoom', roomId, (res: any) => {`;

const replaceClientStr = `    const doJoin = () => {
      socket.emit('joinRoom', roomId, role, (res: any) => {`;

clientCode = clientCode.replace(targetClientStr, replaceClientStr);
fs.writeFileSync('client/src/components/Game.tsx', clientCode);
