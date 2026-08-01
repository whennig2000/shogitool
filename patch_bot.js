const fs = require('fs');
const content = fs.readFileSync('server/index.ts', 'utf8');

const newContent = content.replace(
  "if (legalMoves.length === 0) {",
  `const isPuzzleSolved = difficulty === 'puzzle' && room.puzzleState && room.puzzleState.currentMoveIndex >= room.puzzleState.availablePuzzles[room.puzzleState.currentPuzzleIndex].solution.length;
  
  if (legalMoves.length === 0 || isPuzzleSolved) {`
);

fs.writeFileSync('server/index.ts', newContent);
