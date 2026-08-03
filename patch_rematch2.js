const fs = require('fs');
let code = fs.readFileSync('server/index.ts', 'utf8');

const targetStr = `  socket.on('requestRematch', (roomId: string, boardId: string, timerConfig: number | null) => {
    const room = rooms.get(roomId);
    if (!room) return;
    
    // Store requested config temporarily in the room
    room.rematchConfig = { boardId, timerConfig };`;

const replacementStr = `  socket.on('requestRematch', (roomId: string, newState: any, timerConfig: number | null) => {
    const room = rooms.get(roomId);
    if (!room) return;
    
    // Store requested config temporarily in the room
    room.rematchConfig = { newState, timerConfig };`;

code = code.replace(targetStr, replacementStr);

const targetStr2 = `    if (opponent) {
      io.to(opponent).emit('chatMessage', { 
        role: 'system', 
        message: \`\${requester} möchte ein neues Spiel spielen! (Board: \${boardId}, Timer: \${timerConfig ? timerConfig + 's' : 'Keiner'})\`,
        options: [
          { label: 'Annehmen', value: 'accept_rematch' },
          { label: 'Ablehnen', value: 'decline_rematch' }
        ]
      });`;

const replacementStr2 = `    if (opponent) {
      io.to(opponent).emit('chatMessage', { 
        role: 'system', 
        message: \`\${requester} möchte ein neues Spiel spielen! (Timer: \${timerConfig ? timerConfig + 's' : 'Keiner'})\`,
        options: [
          { label: 'Annehmen', value: 'accept_rematch' },
          { label: 'Ablehnen', value: 'decline_rematch' }
        ]
      });`;

code = code.replace(targetStr2, replacementStr2);

const targetStr3 = `  socket.on('acceptRematch', (roomId: string) => {
     const room = rooms.get(roomId);
     if (!room || !room.rematchConfig) return;
     
     // Determine starting player
     room.gameState = {
       board: [], // We need to generate the board based on boardId! Wait! The server doesn't generate the board.
       turn: 'sente',
       captured: { sente: [], gote: [] },
       playerNames: room.gameState.playerNames, // Keep same names
     };
     // Actually, we should ask the frontend to send the initial board state when requesting the rematch!
  });`;

const replacementStr3 = `  socket.on('acceptRematch', (roomId: string) => {
     const room = rooms.get(roomId);
     if (!room || !room.rematchConfig) return;
     
     room.gameState = room.rematchConfig.newState;
     
     if (room.timerInterval) {
        clearInterval(room.timerInterval);
     }
     
     const seconds = room.rematchConfig.timerConfig;
     if (seconds === null) {
       room.gameState.timerEnabled = false;
       delete room.gameState.timeLeft;
       room.gameState.timerConfigured = true;
     } else {
       room.gameState.timerEnabled = true;
       room.gameState.timerConfigured = true;
       room.gameState.timeLeft = { sente: seconds, gote: seconds };
       
       room.lastTick = Date.now();
       room.timerInterval = setInterval(() => {
         if (!room.sentePlayer || !room.gotePlayer) return;
         const now = Date.now();
         const delta = (now - room.lastTick) / 1000;
         room.lastTick = now;
         
         const turn = room.gameState.turn;
         if (room.gameState.timeLeft && room.gameState.timeLeft[turn] > 0) {
           room.gameState.timeLeft[turn] -= delta;
           if (room.gameState.timeLeft[turn] <= 0) {
             room.gameState.timeLeft[turn] = 0;
             clearInterval(room.timerInterval);
             io.to(roomId).emit('timeExpired', turn);
           }
           io.to(roomId).emit('syncTime', room.gameState.timeLeft);
         }
       }, 1000);
     }
     
     io.to(roomId).emit('stateUpdated', room.gameState);
     io.to(roomId).emit('chatMessage', { role: 'system', message: 'Neues Spiel gestartet!' });
     delete room.rematchConfig;
  });

  socket.on('declineRematch', (roomId: string) => {
     const room = rooms.get(roomId);
     if (!room) return;
     const opponent = room.sentePlayer === socket.id ? room.gotePlayer : room.sentePlayer;
     if (opponent) {
        io.to(opponent).emit('chatMessage', { role: 'system', message: 'Dein Gegner hat die Anfrage auf ein neues Spiel abgelehnt.' });
     }
     if (room.rematchConfig) delete room.rematchConfig;
  });`;

code = code.replace(targetStr3, replacementStr3);
fs.writeFileSync('server/index.ts', code);
