const fs = require('fs');
const data = JSON.parse(fs.readFileSync('server/puzzles.json', 'utf8'));

for (const p of data) {
  if (p.name === 'Kopf-Gold (Atama-kin)') {
    p.solution = [
      {
        type: 'drop',
        to: { x: 4, y: 1 },
        pieceType: 'gold'
      }
    ];
  } else if (p.name === 'Ersticktes Matt (Springer)') {
    p.solution = [
      {
        type: 'drop',
        to: { x: 1, y: 2 },
        pieceType: 'knight'
      }
    ];
  }
}

fs.writeFileSync('server/puzzles.json', JSON.stringify(data, null, 2));
