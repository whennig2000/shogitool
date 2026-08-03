const fs = require('fs');
let code = fs.readFileSync('client/src/components/Game.tsx', 'utf8');

// 1. Add to Game Over Modal
const targetModalStr = `<button className="btn btn-secondary" onClick={() => setHideGameOverModal(true)}>Brett ansehen</button>
              <button className="btn" onClick={() => navigate('/')}>Zurück zur Lobby</button>`;

const replaceModalStr = `<button className="btn btn-primary" onClick={() => { setShowRematchModal(true); setHideGameOverModal(true); }}>🔄 Neues Spiel anfragen</button>
              <button className="btn btn-secondary" onClick={() => setHideGameOverModal(true)}>Brett ansehen</button>
              <button className="btn" onClick={() => navigate('/')}>Zurück zur Lobby</button>`;

code = code.replace(targetModalStr, replaceModalStr);

// 2. Add above chat input when game is over
const targetChatStr = `              {gameState.isPuzzleMatch && !isGameOver && (
                <div style={{ padding: '0.5rem', display: 'flex', justifyContent: 'center' }}>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => socket.emit('requestHint', roomId)}
                    style={{ width: '100%', fontSize: '0.9rem' }}
                  >
                    💡 Tipp anzeigen
                  </button>
                </div>
              )}`;

const replaceChatStr = targetChatStr + `
              {isGameOver && (
                <div style={{ padding: '0.5rem', display: 'flex', justifyContent: 'center' }}>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => setShowRematchModal(true)}
                    style={{ width: '100%', fontSize: '0.9rem', fontWeight: 'bold' }}
                  >
                    🔄 Neues Spiel anfragen
                  </button>
                </div>
              )}`;

code = code.replace(targetChatStr, replaceChatStr);

fs.writeFileSync('client/src/components/Game.tsx', code);
