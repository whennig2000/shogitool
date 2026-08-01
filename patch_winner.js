const fs = require('fs');
const content = fs.readFileSync('server/index.ts', 'utf8');

const targetStr = `    if (difficulty === 'puzzle' && room.puzzleState) {
      io.to(roomId).emit('chatMessage', { 
        role: 'bot', 
        message: 'Super! Du hast das Matt gefunden! Wähle das nächste Puzzle oder beende das Spiel.',`;

const replacement = `    state.winner = 'sente';
    io.to(roomId).emit('stateUpdated', state);
    if (difficulty === 'puzzle' && room.puzzleState) {
      io.to(roomId).emit('chatMessage', { 
        role: 'bot', 
        message: 'Super! Du hast das Matt gefunden! Wähle das nächste Puzzle oder beende das Spiel.',`;

const newContent = content.replace(targetStr, replacement);
fs.writeFileSync('server/index.ts', newContent);
