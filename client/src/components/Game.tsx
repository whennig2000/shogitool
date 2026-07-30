import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { socket } from './Lobby';
import type { GameState, Piece, Player, Position } from '../../../shared/types';
import { getValidMoves, canPromote, getPromotedType, getDemotedType, getValidDrops, isKingInCheck, hasAnyLegalMoves } from '../../../shared/movement';
import { createPiece } from '../../../shared/constants';
import { getKanjiMode } from './Settings';
import { Board } from './Board';
import { Komadai } from './Komadai';
import { Settings } from './Settings';

interface ChatMessage {
  role: string;
  message: string;
}

export const Game = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const role = searchParams.get('role') as Player;

  const [gameState, setGameState] = useState<GameState | null>(null);
  
  // Settings
  const [kanjiMode, setKanjiMode] = useState(getKanjiMode());
  const [showGameSettings, setShowGameSettings] = useState(false);
  const [showThemeSettings, setShowThemeSettings] = useState(false);
  const [myNameInput, setMyNameInput] = useState('');
  const [botDifficulty, setBotDifficulty] = useState<'easy'|'greedy'|'puzzle'>('easy');
  const [opponentConnected, setOpponentConnected] = useState(false);
  
  // Interaction
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);
  const [selectedDropPiece, setSelectedDropPiece] = useState<Piece | null>(null);
  const [validMoves, setValidMoves] = useState<Position[]>([]);

  // Promotion
  const [pendingPromotion, setPendingPromotion] = useState<{from: Position, to: Position, piece: Piece, targetCell: Piece | null} | null>(null);

  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleTheme = () => setKanjiMode(getKanjiMode());
    window.addEventListener('themeChanged', handleTheme);
    return () => window.removeEventListener('themeChanged', handleTheme);
  }, []);

  useEffect(() => {
    socket.emit('joinRoom', roomId, (res: any) => {
      if (res.error) {
        alert(res.error);
        navigate('/');
        return;
      }
      setGameState(res.gameState);
      setOpponentConnected(res.opponentConnected);
      setMyNameInput(res.gameState.playerNames[role]);
    });

    socket.on('stateUpdated', (newState: GameState) => {
      setGameState(newState);
      setSelectedPos(null);
      setSelectedDropPiece(null);
      setValidMoves([]);
      setPendingPromotion(null);
    });
    
    socket.on('playerJoined', (data) => {
      console.log('Player joined:', data.role);
      setOpponentConnected(true);
    });

    socket.on('playerDisconnected', (data) => {
      alert(`${data.role === 'sente' ? 'Player 1' : 'Player 2'} hat das Spiel verlassen.`);
      setOpponentConnected(false);
    });

    socket.on('syncTime', (timeLeft: { sente: number, gote: number }) => {
      setGameState(prev => prev ? { ...prev, timeLeft } : prev);
    });

    socket.on('timeExpired', (loserRole: Player) => {
      alert(`Zeit abgelaufen für ${loserRole === 'sente' ? 'Player 1' : 'Player 2'}!`);
      setGameState(prev => prev ? { ...prev, timerExpired: true, winner: loserRole === 'sente' ? 'gote' : 'sente' } as any : prev);
    });

    socket.on('chatMessage', (msg: ChatMessage) => {
      setChatMessages(prev => [...prev, msg]);
    });

    return () => {
      socket.off('stateUpdated');
      socket.off('playerJoined');
      socket.off('playerDisconnected');
      socket.off('syncTime');
      socket.off('timeExpired');
      socket.off('chatMessage');
    };
  }, [roomId, navigate, role]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const executeMove = (from: Position, to: Position, pieceToMove: Piece, targetCell: Piece | null, promote: boolean) => {
    if (!gameState) return;
    const { board, turn, captured } = gameState;
    
    const newBoard = board.map(r => [...r]);
    newBoard[from.y][from.x] = null; 
    
    const newCaptured = { ...captured };
    if (targetCell) {
      if (targetCell.type === 'king') {
        setTimeout(() => alert(`Spielende! ${gameState.playerNames[turn]} hat den gegnerischen König geschlagen!`), 100);
      } else {
        const demotedType = getDemotedType(targetCell.type);
        newCaptured[turn] = [...newCaptured[turn], createPiece(demotedType, turn)];
      }
    }

    let finalPiece = pieceToMove;
    if (promote && getPromotedType(pieceToMove.type)) {
      finalPiece = { ...pieceToMove, type: getPromotedType(pieceToMove.type)! };
    }

    newBoard[to.y][to.x] = finalPiece;

    const newState: GameState = {
      ...gameState,
      board: newBoard,
      turn: turn === 'sente' ? 'gote' : 'sente',
      captured: newCaptured,
      playerNames: gameState.playerNames,
      lastMove: { from, to }
    };

    setGameState(newState);
    socket.emit('updateState', roomId, newState);
    
    setSelectedPos(null);
    setValidMoves([]);
    setPendingPromotion(null);
  };

  const handleSelectBoard = useCallback((x: number, y: number) => {
    if (!gameState) return;
    if (gameState.turn !== role) return;

    const { board, turn, captured } = gameState;
    const clickedCell = board[y][x];

    if (selectedDropPiece) {
      const isValidDrop = validMoves.some(m => m.x === x && m.y === y);
      if (isValidDrop && clickedCell === null) {
        const newBoard = board.map(r => [...r]);
        newBoard[y][x] = { ...selectedDropPiece, owner: turn };
        
        const newCaptured = { ...captured };
        newCaptured[turn] = newCaptured[turn].filter(p => p.id !== selectedDropPiece.id);
        
        const newState: GameState = {
          ...gameState,
          board: newBoard,
          turn: turn === 'sente' ? 'gote' : 'sente',
          captured: newCaptured,
          playerNames: gameState.playerNames,
          lastMove: { to: { x, y } }
        };
        setGameState(newState);
        socket.emit('updateState', roomId, newState);
        setSelectedDropPiece(null);
        setValidMoves([]);
      } else {
        setSelectedDropPiece(null);
        setValidMoves([]);
      }
      return;
    }

    if (selectedPos) {
      const isValidMove = validMoves.some(m => m.x === x && m.y === y);
      if (isValidMove) {
        const pieceToMove = board[selectedPos.y][selectedPos.x]!;
        const targetCell = board[y][x];
        
        // Promotion check
        const canPromotePiece = getPromotedType(pieceToMove.type) !== null;
        const zone = gameState.promotionZoneSize || (gameState.board.length >= 9 ? 3 : 1);
        const isPromoPossible = canPromote(gameState.board, zone, selectedPos.y, role) || canPromote(gameState.board, zone, y, role);
        
        if (canPromotePiece && isPromoPossible) {
          // Check if promotion is mandatory (e.g. Pawn/Lance on last rank)
          let mandatory = false;
          if (pieceToMove.owner === 'sente') {
            if ((pieceToMove.type === 'pawn' || pieceToMove.type === 'lance') && y === 0) mandatory = true;
            if (pieceToMove.type === 'knight' && y <= 1) mandatory = true;
          } else {
            if ((pieceToMove.type === 'pawn' || pieceToMove.type === 'lance') && y === 8) mandatory = true;
            if (pieceToMove.type === 'knight' && y >= 7) mandatory = true;
          }

          if (mandatory) {
            executeMove(selectedPos, {x, y}, pieceToMove, targetCell, true);
          } else {
            // Ask user
            setPendingPromotion({ from: selectedPos, to: {x, y}, piece: pieceToMove, targetCell });
          }
        } else {
          executeMove(selectedPos, {x, y}, pieceToMove, targetCell, false);
        }
      } else {
        if (clickedCell && clickedCell.owner === turn) {
          setSelectedPos({ x, y });
          setValidMoves(getValidMoves(board, { x, y }));
        } else {
          setSelectedPos(null);
          setValidMoves([]);
        }
      }
    } else {
      if (clickedCell && clickedCell.owner === turn) {
        setSelectedPos({ x, y });
        setValidMoves(getValidMoves(board, { x, y }));
      }
    }
  }, [gameState, role, selectedPos, selectedDropPiece, validMoves, roomId]);

  const handleSelectCaptured = useCallback((piece: Piece) => {
    if (!gameState) return;
    if (gameState.turn === role && piece.owner === role) {
      setSelectedDropPiece(piece);
      setSelectedPos(null);
      setValidMoves(getValidDrops(gameState.board, piece.type, role)); 
    }
  }, [gameState, role]);

  const sendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      socket.emit('sendMessage', roomId, chatInput.trim(), role);
      setChatInput('');
    }
  };

  const saveSettings = () => {
    if (gameState && myNameInput.trim()) {
      const newState = { ...gameState };
      newState.playerNames[role] = myNameInput.trim();
      setGameState(newState);
      socket.emit('updateState', roomId, newState);
    }
    setShowGameSettings(false);
  };

  const inviteBot = () => {
    socket.emit('inviteBot', roomId, botDifficulty, (res: any) => {
      if (res.error) alert(res.error);
      setShowGameSettings(false);
    });
  };

  const handleSetTimer = (seconds: number | null) => {
    socket.emit('setTimer', roomId, seconds);
  };

  if (!gameState) return <div className="lobby">Lade Spiel...</div>;

  const opponentRole = role === 'sente' ? 'gote' : 'sente';

  const amIInCheck = isKingInCheck(gameState.board, role);
  const opponentInCheck = isKingInCheck(gameState.board, opponentRole);
  
  const myLegalMoves = hasAnyLegalMoves(gameState.board, role, gameState.captured[role]);
  const opponentLegalMoves = hasAnyLegalMoves(gameState.board, opponentRole, gameState.captured[opponentRole]);

  const amICheckmated = amIInCheck && !myLegalMoves;
  const opponentCheckmated = opponentInCheck && !opponentLegalMoves;
  const timerLoser = (gameState as any).timerExpired ? (gameState as any).winner === role ? (role === 'sente' ? 'gote' : 'sente') : role : null;
  const isGameOver = amICheckmated || opponentCheckmated || timerLoser !== null;

  const formatTime = (seconds?: number) => {
    if (seconds === undefined) return null;
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 className="title" style={{ fontSize: '2rem', margin: 0 }}>Raum: {roomId}</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div>
            Du bist: <strong style={{ color: role === 'sente' ? 'var(--theme-sente)' : 'var(--theme-gote)' }}>{gameState.playerNames[role]}</strong>
          </div>
          <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '1rem' }} onClick={() => setShowGameSettings(true)}>
            ⚙️ Optionen
          </button>
          <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '1rem' }} onClick={() => setShowThemeSettings(true)}>
            🎨 Theme
          </button>
          <button className="btn" style={{ background: '#ef4444', color: 'white', padding: '0.5rem 1rem', fontSize: '1rem' }} onClick={() => {
            socket.disconnect(); // Will reconnect in Lobby
            socket.connect();
            navigate('/');
          }}>
            🚪 Leave Room
          </button>
        </div>
      </div>
      
      <div className="turn-indicator" style={{ color: isGameOver ? '#ef4444' : gameState.turn === role ? '#22c55e' : '#f59e0b', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {isGameOver ? (
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
            {timerLoser 
              ? `ZEIT ABGELAUFEN! ${gameState.playerNames[timerLoser === role ? opponentRole : role]} gewinnt!`
              : `SCHACHMATT! ${amICheckmated ? gameState.playerNames[opponentRole] : gameState.playerNames[role]} gewinnt!`
            }
          </span>
        ) : (
          <>
            <span>{gameState.turn === role ? "Du bist dran!" : `${gameState.playerNames[opponentRole]} ist dran...`}</span>
            {amIInCheck && <span style={{ color: '#ef4444', fontWeight: 'bold', animation: 'pulse 1.5s infinite' }}>ACHTUNG: SCHACH!</span>}
            {opponentInCheck && <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Gegner steht im Schach!</span>}
          </>
        )}
      </div>

      <div className="game-layout">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 'bold' }}>Gegner: {gameState.playerNames[opponentRole]}</div>
            {gameState.timeLeft && (
              <div style={{ background: '#1e293b', padding: '0.5rem 1rem', borderRadius: '4px', fontFamily: 'monospace', fontSize: '1.5rem', color: gameState.turn === opponentRole ? '#ef4444' : 'white' }}>
                {formatTime(gameState.timeLeft[opponentRole])}
              </div>
            )}
          </div>
          <Komadai 
            player={opponentRole}
            pieces={gameState.captured[opponentRole]}
            selectedPiece={null}
            onSelect={() => {}}
            isCurrentTurn={gameState.turn === opponentRole}
            isMyRole={false}
            kanjiMode={kanjiMode}
          />
        </div>

        <Board 
          board={gameState.board}
          selectedPos={selectedPos}
          validMoves={validMoves}
          role={role}
          promotionZoneSize={gameState.promotionZoneSize}
          kanjiMode={kanjiMode}
          lastMove={gameState.lastMove}
          onSelectCell={handleSelectBoard}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 'bold' }}>Du: {gameState.playerNames[role]}</div>
            {gameState.timeLeft && (
              <div style={{ background: '#1e293b', padding: '0.5rem 1rem', borderRadius: '4px', fontFamily: 'monospace', fontSize: '1.5rem', color: gameState.turn === role ? '#ef4444' : 'white' }}>
                {formatTime(gameState.timeLeft[role])}
              </div>
            )}
          </div>
          <Komadai 
            player={role}
            pieces={gameState.captured[role]}
            selectedPiece={selectedDropPiece}
            onSelect={handleSelectCaptured}
            isCurrentTurn={gameState.turn === role}
            isMyRole={true}
            kanjiMode={kanjiMode}
          />

          <div className="chat-container">
            <div className="chat-messages">
              {chatMessages.map((m, i) => (
                <div key={i} className={`chat-message ${m.role === 'system' || m.role === 'bot' ? 'system' : ''}`}>
                  <strong style={{ color: m.role === 'sente' ? 'var(--primary)' : m.role === 'gote' ? 'var(--secondary)' : 'inherit' }}>
                    {m.role === 'bot' ? 'Bot' : m.role === 'system' ? 'System' : gameState.playerNames[m.role as Player]}: 
                  </strong> {m.message}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <form className="chat-input" onSubmit={sendChat}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Nachricht..." />
              <button type="submit">Senden</button>
            </form>
          </div>
        </div>
      </div>

      {isGameOver && (
        <div className="modal-overlay" style={{ zIndex: 1000, background: 'rgba(0,0,0,0.8)' }}>
          <div className="modal" style={{ textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h2 style={{ marginBottom: '1rem', fontSize: '2rem' }}>
              {timerLoser ? 'Zeit abgelaufen!' : 'Schachmatt!'}
            </h2>
            <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>
              {timerLoser 
                ? (timerLoser === role ? 'Deine Zeit ist um. Du hast verloren!' : 'Die Zeit deines Gegners ist um. Du hast gewonnen!')
                : (amICheckmated ? 'Du wurdest mattgesetzt. Du hast verloren!' : 'Du hast gewonnen!')}
            </p>
            <button className="btn" onClick={() => navigate('/')}>Zurück zur Lobby</button>
          </div>
        </div>
      )}

      {pendingPromotion && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Befördern?</h3>
            <p>Möchtest du diese Figur befördern?</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem' }}>
              <button className="btn" onClick={() => executeMove(pendingPromotion.from, pendingPromotion.to, pendingPromotion.piece, pendingPromotion.targetCell, true)}>
                Ja, Befördern
              </button>
              <button className="btn btn-secondary" onClick={() => executeMove(pendingPromotion.from, pendingPromotion.to, pendingPromotion.piece, pendingPromotion.targetCell, false)}>
                Nein, so lassen
              </button>
            </div>
          </div>
        </div>
      )}

      {showThemeSettings && (
        <Settings onClose={() => setShowThemeSettings(false)} />
      )}

      {showGameSettings && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Spiel-Optionen</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', margin: '2rem 0', textAlign: 'left' }}>
              <label>
                <strong>Dein Name:</strong>
                <input 
                  type="text" 
                  value={myNameInput}
                  onChange={e => setMyNameInput(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }}
                />
              </label>
              
              <hr style={{ borderColor: 'var(--border)', margin: '1rem 0' }} />
              
              <label>
                <strong>Bot-Schwierigkeit:</strong>
                <select 
                  value={botDifficulty} 
                  onChange={e => setBotDifficulty(e.target.value as any)}
                  style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }}
                >
                  <option value="easy">Einfach (Zufällige Züge)</option>
                  <option value="greedy">Aggressiv (Schlägt bevorzugt)</option>
                  <option value="puzzle">Matt-Problem-Master (Puzzle-Modus)</option>
                </select>
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
              <button className="btn btn-secondary" onClick={inviteBot}>🤖 Bot Einladen</button>
              <button className="btn" onClick={saveSettings}>Speichern & Schließen</button>
            </div>
          </div>
        </div>
      )}

      {gameState && !(gameState as any).timerConfigured && opponentConnected && (
        <div className="modal-overlay" style={{ zIndex: 1000, background: 'rgba(0,0,0,0.8)' }}>
          <div className="modal" style={{ textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h2 style={{ marginBottom: '0.5rem' }}>⏱️ Zeitlimit wählen</h2>
            <p style={{ marginBottom: '2rem', color: 'var(--text)', opacity: 0.8 }}>Das Spiel ist voll! Wählt ein Zeitlimit, um zu starten.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button className="btn" onClick={() => handleSetTimer(null)}>Ohne Timer spielen</button>
              <button className="btn btn-secondary" onClick={() => handleSetTimer(180)}>3 Minuten</button>
              <button className="btn btn-secondary" onClick={() => handleSetTimer(300)}>5 Minuten</button>
              <button className="btn btn-secondary" onClick={() => handleSetTimer(600)}>10 Minuten</button>
            </div>
            <p style={{ marginTop: '2rem', fontSize: '0.8rem', opacity: 0.5 }}>Wer zuerst klickt, entscheidet!</p>
          </div>
        </div>
      )}

    </div>
  );
};
