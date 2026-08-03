const fs = require('fs');
let code = fs.readFileSync('client/src/components/Game.tsx', 'utf8');

code = code.replace(
  /const newState = {\s*board: newBoard,\s*turn: turn === 'sente' \? 'gote' : 'sente',\s*captured: newCaptured,\s*playerNames: gameState\.playerNames,\s*lastMove: { from, to }\s*};/g,
  `const newState = {
      ...gameState,
      board: newBoard,
      turn: turn === 'sente' ? 'gote' : 'sente',
      captured: newCaptured,
      lastMove: { from, to }
    };`
);

code = code.replace(
  /const newState = {\s*board: newBoard,\s*turn: turn === 'sente' \? 'gote' : 'sente',\s*captured: newCaptured,\s*playerNames: gameState\.playerNames,\s*lastMove: { to: { x, y } }\s*};/g,
  `const newState = {
          ...gameState,
          board: newBoard,
          turn: turn === 'sente' ? 'gote' : 'sente',
          captured: newCaptured,
          lastMove: { to: { x, y } }
        };`
);

fs.writeFileSync('client/src/components/Game.tsx', code);
