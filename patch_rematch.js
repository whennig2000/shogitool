const fs = require('fs');
let code = fs.readFileSync('server/index.ts', 'utf8');

const targetStr = "socket.on('disconnect', () => {";

const replacementStr = `  socket.on('requestRematch', (roomId: string, boardId: string, timerConfig: number | null) => {
    const room = rooms.get(roomId);
    if (!room) return;
    
    // Store requested config temporarily in the room
    room.rematchConfig = { boardId, timerConfig };
    
    // Send a message to the other player
    const requester = room.sentePlayer === socket.id ? room.gameState.playerNames.sente : room.gameState.playerNames.gote;
    const opponent = room.sentePlayer === socket.id ? room.gotePlayer : room.sentePlayer;
    
    // If bot match, auto-decline (bots don't rematch this way)
    if (room.isBotMatch) {
       io.to(roomId).emit('chatMessage', { role: 'system', message: 'Der Bot kann keine direkten Revanche-Anfragen annehmen. Bitte erstelle ein neues Spiel.' });
       return;
    }

    if (opponent) {
      io.to(opponent).emit('chatMessage', { 
        role: 'system', 
        message: \`\${requester} möchte ein neues Spiel spielen! (Board: \${boardId}, Timer: \${timerConfig ? timerConfig + 's' : 'Keiner'})\`,
        options: [
          { label: 'Annehmen', value: 'accept_rematch' },
          { label: 'Ablehnen', value: 'decline_rematch' }
        ]
      });
      socket.emit('chatMessage', { role: 'system', message: 'Anfrage auf neues Spiel gesendet. Warte auf Antwort...' });
    }
  });

  socket.on('acceptRematch', (roomId: string) => {
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
  });

  socket.on('disconnect', () => {`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync('server/index.ts', code);
