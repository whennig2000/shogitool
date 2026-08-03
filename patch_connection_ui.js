const fs = require('fs');
let code = fs.readFileSync('client/src/components/Game.tsx', 'utf8');

const targetStr = `<div style={{ fontWeight: 'bold' }}>Gegner: {gameState.playerNames[opponentRole]}</div>`;
const replaceStr = `<div style={{ fontWeight: 'bold' }}>
              Gegner: {gameState.playerNames[opponentRole]}
              {!opponentConnected && !opponentConnectionLost && gameState.playerNames.gote !== 'Bot (Gote)' && <span style={{ color: '#ef4444', marginLeft: '0.5rem', fontSize: '0.8rem' }}>(Nicht verbunden)</span>}
              {opponentConnectionLost && <span style={{ color: '#f59e0b', marginLeft: '0.5rem', fontSize: '0.8rem' }}>(Verbindung getrennt, wartet auf Reconnect...)</span>}
            </div>`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('client/src/components/Game.tsx', code);
