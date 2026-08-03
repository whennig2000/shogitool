const fs = require('fs');
let code = fs.readFileSync('server/index.ts', 'utf8');

const disconnectTarget = `  socket.on('disconnect', () => {
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
  });`;

const disconnectReplacement = `  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    rooms.forEach((room, roomId) => {
      if (room.sentePlayer === socket.id || room.gotePlayer === socket.id) {
         const role = room.sentePlayer === socket.id ? 'sente' : 'gote';
         
         // Notify the room that the player lost connection (grace period started)
         io.to(room.id).emit('playerConnectionLost', { role });
         
         if (!room.disconnectTimeouts) room.disconnectTimeouts = {};
         
         // Clear their player ID so joinRoom can re-assign it
         if (role === 'sente') room.sentePlayer = null;
         if (role === 'gote' && room.gotePlayer !== 'bot') room.gotePlayer = null;
         
         // Set a 60-second timeout before officially disconnecting them
         room.disconnectTimeouts[role] = setTimeout(() => {
             io.to(room.id).emit('playerDisconnected', { role });
             
             if (room.disconnectTimeouts) {
                 delete room.disconnectTimeouts[role];
             }
             
             if (room.timerInterval && (!room.sentePlayer || !room.gotePlayer)) {
                clearInterval(room.timerInterval);
             }

             if (!room.sentePlayer && (!room.gotePlayer || room.gotePlayer === 'bot')) {
               rooms.delete(room.id);
             }
         }, 60000); // 60 seconds grace period
      }
    });
  });`;

code = code.replace(disconnectTarget, disconnectReplacement);
fs.writeFileSync('server/index.ts', code);
