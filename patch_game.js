const fs = require('fs');
let code = fs.readFileSync('client/src/components/Game.tsx', 'utf8');

code = code.replace(
  `                  <h4>
                    {gameState.playerNames[opponentRole]}
                    {!opponentConnected && gameState.playerNames.gote !== 'Bot (Gote)' && ' (Wartet...)'}
                  </h4>`,
  `                  <h4>
                    {gameState.playerNames[opponentRole]}
                    {!opponentConnected && !opponentConnectionLost && gameState.playerNames.gote !== 'Bot (Gote)' && ' (Wartet...)'}
                    {opponentConnectionLost && ' (Verbindung getrennt, wartet auf Reconnect...)'}
                  </h4>`
);

fs.writeFileSync('client/src/components/Game.tsx', code);
