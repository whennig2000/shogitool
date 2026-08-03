const fs = require('fs');
let code = fs.readFileSync('client/src/components/Game.tsx', 'utf8');

code = code.replace(
  "  const [opponentConnectionLost, setOpponentConnectionLost] = useState(false);",
  "  const [opponentConnectionLost, setOpponentConnectionLost] = useState(false);\n  const [showRematchModal, setShowRematchModal] = useState(false);"
);

const targetChatMsg = `    socket.on('chatMessage', (msg: ChatMessage) => {
      setChatMessages(prev => [...prev, msg]);
    });`;

const replaceChatMsg = `    socket.on('chatMessage', (msg: ChatMessage) => {
      setChatMessages(prev => [...prev, msg]);
    });
    
    // Check if chat message contains options and it's a rematch option
    const handleRematchOption = (value: string) => {
       if (value === 'accept_rematch') {
          socket.emit('acceptRematch', roomId);
       } else if (value === 'decline_rematch') {
          socket.emit('declineRematch', roomId);
       }
    };
    
    // Attach to global window object so chat message onClick can call it easily?
    // Actually we can just map the options in the JSX rendering of chat messages.`;
    
code = code.replace(targetChatMsg, replaceChatMsg);

const targetChatRender = `                  {msg.options && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                      {msg.options.map(opt => (
                        <button 
                          key={opt.value}
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                          onClick={() => {
                            if (opt.value === 'random') {
                              socket.emit('loadRandomPuzzle', roomId);
                            } else {
                              socket.emit('loadPuzzle', roomId, parseInt(opt.value));
                            }
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}`;

const replaceChatRender = `                  {msg.options && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                      {msg.options.map(opt => (
                        <button 
                          key={opt.value}
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                          onClick={() => {
                            if (opt.value === 'accept_rematch') {
                               socket.emit('acceptRematch', roomId);
                            } else if (opt.value === 'decline_rematch') {
                               socket.emit('declineRematch', roomId);
                            } else if (opt.value === 'random') {
                              socket.emit('loadRandomPuzzle', roomId);
                            } else {
                              socket.emit('loadPuzzle', roomId, parseInt(opt.value));
                            }
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}`;

code = code.replace(targetChatRender, replaceChatRender);

const newGameBtnTarget = `              {gameState.isPuzzleMatch && !isGameOver && (
                <div style={{ padding: '0.5rem', display: 'flex', justifyContent: 'center' }}>
                  <button 
                    className="btn btn-secondary" 
                    style={{ width: '100%' }}
                    onClick={() => socket.emit('requestHint', roomId)}
                  >
                    💡 Tipp anzeigen
                  </button>
                </div>
              )}`;

const newGameBtnReplacement = `              {gameState.isPuzzleMatch && !isGameOver && (
                <div style={{ padding: '0.5rem', display: 'flex', justifyContent: 'center' }}>
                  <button 
                    className="btn btn-secondary" 
                    style={{ width: '100%' }}
                    onClick={() => socket.emit('requestHint', roomId)}
                  >
                    💡 Tipp anzeigen
                  </button>
                </div>
              )}
              {isGameOver && !gameState.isPuzzleMatch && gameState.playerNames.gote !== 'Bot (Gote)' && (
                 <div style={{ padding: '0.5rem', display: 'flex', justifyContent: 'center' }}>
                    <button 
                      className="btn" 
                      style={{ width: '100%' }}
                      onClick={() => setShowRematchModal(true)}
                    >
                      🔄 Neues Spiel anfragen
                    </button>
                 </div>
              )}`;

code = code.replace(newGameBtnTarget, newGameBtnReplacement);

const targetPendingPromotion = `      {pendingPromotion && (
        <div className="modal-overlay">`;

const replacePendingPromotion = `      {showRematchModal && (
        <RematchModal 
           onClose={() => setShowRematchModal(false)}
           onSend={(setupId, timer) => {
              setShowRematchModal(false);
              
              // We need to fetch the setup or use standard
              if (setupId === 'standard') {
                 const newState = {
                    board: INITIAL_BOARD,
                    turn: 'sente',
                    captured: { sente: [], gote: [] },
                    playerNames: gameState.playerNames,
                    promotionZoneSize: 3,
                 };
                 socket.emit('requestRematch', roomId, newState, timer);
              } else {
                 fetch('https://raw.githubusercontent.com/whennig2000/shogitool/main/server/setups.json?t=' + Date.now())
                   .then(res => res.json())
                   .then(setups => {
                      const setup = setups.find((s: any) => s.id === setupId);
                      if (setup) {
                         const newState = {
                            board: setup.board,
                            turn: 'sente',
                            captured: { sente: [], gote: [] },
                            playerNames: gameState.playerNames,
                            promotionZoneSize: setup.promotionZoneSize || 1,
                         };
                         socket.emit('requestRematch', roomId, newState, timer);
                      }
                   });
              }
           }}
        />
      )}

      {pendingPromotion && (
        <div className="modal-overlay">`;

code = code.replace(targetPendingPromotion, replacePendingPromotion);

fs.writeFileSync('client/src/components/Game.tsx', code);
