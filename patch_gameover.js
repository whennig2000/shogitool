const fs = require('fs');
let code = fs.readFileSync('client/src/components/Game.tsx', 'utf8');

const targetStr = `  const isGameOver = amICheckmated || opponentCheckmated || isStalemate || timerLoser !== null;`;
const replaceStr = `  const isGameOver = amICheckmated || opponentCheckmated || isStalemate || timerLoser !== null;

  useEffect(() => {
    if (isGameOver) {
      socket.emit('gameOver', roomId);
    }
  }, [isGameOver, roomId]);`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('client/src/components/Game.tsx', code);
