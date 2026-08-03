const fs = require('fs');
let code = fs.readFileSync('client/src/components/Game.tsx', 'utf8');

const targetStr = `                  <h4>
                    {gameState.playerNames[opponentRole]}
                    {!opponentConnected && gameState.playerNames.gote !== 'Bot (Gote)' && ' (Wartet...)'}
                  </h4>`;

const replaceStr = `                  <h4>
                    {gameState.playerNames[opponentRole]}
                    {!opponentConnected && !opponentConnectionLost && gameState.playerNames.gote !== 'Bot (Gote)' && ' (Wartet...)'}
                    {opponentConnectionLost && ' (Verbindung getrennt, wartet auf Reconnect...)'}
                  </h4>`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('client/src/components/Game.tsx', code);
