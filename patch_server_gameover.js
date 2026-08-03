const fs = require('fs');
let code = fs.readFileSync('server/index.ts', 'utf8');

const targetStr = `  socket.on('updateState', (roomId: string, newState: any) => {`;
const replaceStr = `  socket.on('gameOver', (roomId: string) => {
    const room = rooms.get(roomId);
    if (room && room.timerInterval) {
      clearInterval(room.timerInterval);
      room.timerInterval = undefined;
    }
  });

  socket.on('updateState', (roomId: string, newState: any) => {`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('server/index.ts', code);
