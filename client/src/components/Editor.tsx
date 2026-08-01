import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { BoardState, Piece, PieceType, Player, CustomSetup, PuzzleSetup, RecordedMove } from '../../../shared/types';
import { createPiece, getInitialBoard } from '../../../shared/constants';
import { getPromotedType, getDemotedType } from '../../../shared/movement';
import { PieceIcon } from './PieceIcon';
import { getDisplayMode } from './Settings';

const PIECE_TYPES: PieceType[] = ['pawn', 'lance', 'knight', 'silver', 'gold', 'bishop', 'rook', 'king'];

type SelectedPieceRef = { location: 'board', x: number, y: number } | { location: 'hand', owner: Player, index: number } | null;

export const Editor: React.FC = () => {
  const navigate = useNavigate();
  const displayMode = getDisplayMode();
  
  const [editorMode, setEditorMode] = useState<'board' | 'puzzle'>('board');
  const [customSetups, setCustomSetups] = useState<CustomSetup[]>([]);
  
  const [name, setName] = useState('My Custom Setup');
  const [width, setWidth] = useState(9);
  const [height, setHeight] = useState(9);
  const [promotionZoneSize, setPromotionZoneSize] = useState(3);
  const [board, setBoard] = useState<BoardState>(Array(9).fill(null).map(() => Array(9).fill(null)));
  const [hands, setHands] = useState<{ sente: Piece[]; gote: Piece[] }>({ sente: [], gote: [] });
  
  // Puzzle specifics
  const [boardId, setBoardId] = useState('standard');
  const [botRole, setBotRole] = useState<Player>('gote');
  const [movesToMate, setMovesToMate] = useState(3);
  const [editorPhase, setEditorPhase] = useState<'setup' | 'solution'>('setup');
  const [solution, setSolution] = useState<RecordedMove[]>([]);
  const [recordingTurn, setRecordingTurn] = useState<Player>('sente');
  
  // Board Editor Tools
  const [selectedType, setSelectedType] = useState<PieceType | 'eraser'>('king');
  const [selectedOwner, setSelectedOwner] = useState<Player>('sente');

  // Puzzle Editor Selection
  const [selectedPieceRef, setSelectedPieceRef] = useState<SelectedPieceRef>(null);

  const [showTokenPrompt, setShowTokenPrompt] = useState(false);
  const [githubToken, setGithubToken] = useState(localStorage.getItem('github_token') || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchSetups = async () => {
      try {
        const res = await fetch(`https://raw.githubusercontent.com/whennig2000/shogitool/main/server/setups.json?t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          setCustomSetups(data);
        }
      } catch (e) {
        console.error('Failed to load setups', e);
      }
    };
    fetchSetups();
  }, []);

  // Initialize Puzzle Mode Piece Pool
  useEffect(() => {
    if (editorMode === 'puzzle') {
      handleBaseBoardChange(boardId);
    } else {
       setSelectedPieceRef(null);
    }
  }, [editorMode]);

  const handleBaseBoardChange = (newBoardId: string) => {
    setBoardId(newBoardId);
    let newWidth = 9;
    let newHeight = 9;
    let newZone = 3;
    let baseBoard = getInitialBoard();
    let baseHands = { sente: [], gote: [] } as { sente: Piece[], gote: Piece[] };

    if (newBoardId !== 'standard') {
      const setup = customSetups.find(s => s.id === newBoardId);
      if (setup) {
        newWidth = setup.width;
        newHeight = setup.height;
        newZone = setup.promotionZoneSize || 0;
        baseBoard = setup.board;
        baseHands = setup.hands || baseHands;
      }
    }

    if (editorMode === 'puzzle') {
      const newSenteHand: Piece[] = [...baseHands.sente];
      const newGoteHand: Piece[] = [...baseHands.gote];

      baseBoard.forEach((row) => {
        row.forEach((cell) => {
          if (cell) {
             if (cell.owner === 'sente') newSenteHand.push(cell);
             else newGoteHand.push(cell);
          }
        });
      });

      setHands({ sente: newSenteHand, gote: newGoteHand });
      setBoard(Array(newHeight).fill(null).map(() => Array(newWidth).fill(null)));
    } else {
      setHands({ sente: [], gote: [] });
      setBoard(Array(newHeight).fill(null).map(() => Array(newWidth).fill(null)));
    }
    
    setWidth(newWidth);
    setHeight(newHeight);
    setPromotionZoneSize(newZone);
    setSelectedPieceRef(null);
  };

  const updateSize = (newWidth: number, newHeight: number) => {
    const newBoard = Array(newHeight).fill(null).map((_, y) => 
      Array(newWidth).fill(null).map((_, x) => {
        if (board[y] && board[y][x] && y < height && x < width) {
          return board[y][x];
        }
        return null;
      })
    );
    setBoard(newBoard);
    setWidth(newWidth);
    setHeight(newHeight);
  };

  const handleCellClick = (x: number, y: number) => {
    if (editorMode === 'board') {
      const newBoard = board.map(row => [...row]);
      if (selectedType === 'eraser') {
        newBoard[y][x] = null;
      } else {
        newBoard[y][x] = createPiece(selectedType, selectedOwner);
      }
      setBoard(newBoard);
    } else {
      // Puzzle Mode logic
      if (selectedPieceRef) {
         const targetPiece = board[y][x];
         
         if (targetPiece && (editorPhase !== 'solution' || targetPiece.owner === recordingTurn)) {
            // Select the piece
            setSelectedPieceRef({ location: 'board', x, y });
         } else {
            // Move selected piece (possibly capturing)
            const newBoard = board.map(row => [...row]);
            const newHands = { sente: [...hands.sente], gote: [...hands.gote] };
            let movingPiece: Piece | null = null;
            let capturedPiece = targetPiece;

            if (selectedPieceRef.location === 'board') {
               movingPiece = newBoard[selectedPieceRef.y][selectedPieceRef.x];
               newBoard[selectedPieceRef.y][selectedPieceRef.x] = null;
            } else {
               movingPiece = newHands[selectedPieceRef.owner][selectedPieceRef.index];
               newHands[selectedPieceRef.owner].splice(selectedPieceRef.index, 1);
            }

            if (movingPiece) {
               if (capturedPiece) {
                  const demoted = getDemotedType(capturedPiece.type) || capturedPiece.type;
                  newHands[recordingTurn].push(createPiece(demoted, recordingTurn));
               }
               newBoard[y][x] = movingPiece;
               setBoard(newBoard);
               setHands(newHands);
               
               if (editorPhase === 'solution') {
                  const move: RecordedMove = {
                     type: selectedPieceRef.location === 'board' ? 'move' : 'drop',
                     from: selectedPieceRef.location === 'board' ? { x: selectedPieceRef.x, y: selectedPieceRef.y } : undefined,
                     to: { x, y },
                     pieceType: movingPiece.type
                  };
                  setSolution(prev => [...prev, move]);
                  setRecordingTurn(prev => prev === 'sente' ? 'gote' : 'sente');
               }
            }
            setSelectedPieceRef(null);
         }
      } else {
         if (board[y][x]) {
            if (editorPhase === 'solution' && board[y][x]!.owner !== recordingTurn) return;
            setSelectedPieceRef({ location: 'board', x, y });
         }
      }
    }
  };

  const addHandPiece = (owner: Player, type: PieceType) => {
    if (editorMode === 'puzzle') return;
    setHands(prev => ({
      ...prev,
      [owner]: [...prev[owner], createPiece(type, owner)]
    }));
  };

  const removeHandPiece = (owner: Player, index: number) => {
    if (editorMode === 'puzzle') return;
    setHands(prev => {
      const newHand = [...prev[owner]];
      newHand.splice(index, 1);
      return { ...prev, [owner]: newHand };
    });
  };

  const handleHandClick = (owner: Player, index: number) => {
    if (editorMode === 'board') {
      removeHandPiece(owner, index);
    } else {
      if (editorPhase === 'solution' && owner !== recordingTurn) return;
      setSelectedPieceRef({ location: 'hand', owner, index });
    }
  };

  // Puzzle Mode Actions
  const flipOwner = () => {
     if (editorPhase === 'solution') return;
     if (!selectedPieceRef) return;
     const newBoard = board.map(row => [...row]);
     const newHands = { sente: [...hands.sente], gote: [...hands.gote] };
     
     if (selectedPieceRef.location === 'board') {
        const piece = newBoard[selectedPieceRef.y][selectedPieceRef.x];
        if (piece) piece.owner = piece.owner === 'sente' ? 'gote' : 'sente';
        setBoard(newBoard);
     } else {
        const piece = newHands[selectedPieceRef.owner][selectedPieceRef.index];
        if (piece) {
           newHands[selectedPieceRef.owner].splice(selectedPieceRef.index, 1);
           piece.owner = piece.owner === 'sente' ? 'gote' : 'sente';
           newHands[piece.owner].push(piece);
           setSelectedPieceRef({ location: 'hand', owner: piece.owner, index: newHands[piece.owner].length - 1 });
        }
        setHands(newHands);
     }
  };

  const togglePromote = () => {
     if (!selectedPieceRef) return;
     const newBoard = board.map(row => [...row]);
     const newHands = { sente: [...hands.sente], gote: [...hands.gote] };
     
     let piece: Piece | null = null;
     if (selectedPieceRef.location === 'board') {
        piece = newBoard[selectedPieceRef.y][selectedPieceRef.x];
     } else {
        piece = newHands[selectedPieceRef.owner][selectedPieceRef.index];
     }

     if (piece) {
        if (getPromotedType(piece.type)) {
           piece.type = getPromotedType(piece.type)!;
           if (editorPhase === 'solution' && solution.length > 0) {
               setSolution(prev => {
                   const newSol = [...prev];
                   newSol[newSol.length - 1].promote = true;
                   return newSol;
               });
           }
        } else if (getDemotedType(piece.type)) {
           piece.type = getDemotedType(piece.type);
           if (editorPhase === 'solution' && solution.length > 0) {
               setSolution(prev => {
                   const newSol = [...prev];
                   newSol[newSol.length - 1].promote = false;
                   return newSol;
               });
           }
        }
     }

     if (selectedPieceRef.location === 'board') setBoard(newBoard);
     else setHands(newHands);
  };

  const moveToHand = () => {
     if (editorPhase === 'solution') return;
     if (!selectedPieceRef || selectedPieceRef.location !== 'board') return;
     const newBoard = board.map(row => [...row]);
     const newHands = { sente: [...hands.sente], gote: [...hands.gote] };
     const piece = newBoard[selectedPieceRef.y][selectedPieceRef.x];
     if (piece) {
        newBoard[selectedPieceRef.y][selectedPieceRef.x] = null;
        newHands[piece.owner].push(piece);
        setBoard(newBoard);
        setHands(newHands);
        setSelectedPieceRef(null);
     }
  };

  const pushToGithub = async (fileData: any, token: string, isPuzzle: boolean) => {
    setIsSaving(true);
    try {
      const cleanToken = token.replace(/\s+/g, '');
      if (!/^[a-zA-Z0-9_]+$/.test(cleanToken)) {
         throw new Error('Das Token enthält ungültige Zeichen! Bitte erstelle ein neues auf GitHub und kopiere es sauber.');
      }
      const filePath = isPuzzle ? 'server/puzzles.json' : 'server/setups.json';
      const apiUrl = `https://api.github.com/repos/whennig2000/shogitool/contents/${filePath}`;
      
      const getRes = await fetch(`${apiUrl}?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 
          'Authorization': `Bearer ${cleanToken}`
        }
      });
      
      let existingData: any[] = [];
      let sha = '';
      if (getRes.ok) {
        const data = await getRes.json();
        sha = data.sha;
        const content = decodeURIComponent(escape(atob(data.content)));
        existingData = JSON.parse(content);
      }

      if (existingData.some(s => s.name === fileData.name)) {
        alert(`Ein ${isPuzzle ? 'Puzzle' : 'Setup'} mit diesem Namen existiert bereits auf GitHub.`);
        setIsSaving(false);
        return;
      }
      existingData.push(fileData);

      const newContent = btoa(unescape(encodeURIComponent(JSON.stringify(existingData, null, 2))));

      const putRes = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${cleanToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Add new ${isPuzzle ? 'puzzle' : 'setup'}: ${fileData.name}`,
          content: newContent,
          sha: sha || undefined
        })
      });

      if (!putRes.ok) {
        if (putRes.status === 401 || putRes.status === 403) {
           localStorage.removeItem('github_token');
           setGithubToken('');
        }
        throw new Error('Fehler beim Speichern (Token ungültig oder abgelaufen?)');
      }

      alert(`${isPuzzle ? 'Puzzle' : 'Setup'} erfolgreich auf GitHub gespeichert!`);
      localStorage.setItem('github_token', token);
      setShowTokenPrompt(false);
      navigate('/');
    } catch (e: any) {
      if (e.name === 'TypeError' || e.message.includes('NetworkError') || e.message.includes('fetch')) {
         localStorage.removeItem('github_token');
         setGithubToken('');
         alert('Netzwerk-Fehler (evtl. ungültiges Token Format oder CORS). Token wurde zurückgesetzt. Bitte versuche es erneut und achte darauf, dass keine Leerzeichen im Token sind.');
         setShowTokenPrompt(true);
      } else {
         alert(e.message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const saveSetup = () => {
    if (!githubToken) {
      setShowTokenPrompt(true);
      return;
    }
    executeSave(githubToken);
  };

  const executeSave = (token: string) => {
    if (editorMode === 'board') {
      const setup: CustomSetup = {
        id: `setup_${Date.now()}`,
        name,
        width,
        height,
        board,
        hands,
        promotionZoneSize
      };
      pushToGithub(setup, token, false);
    } else {
      const puzzle: PuzzleSetup = {
        id: `puzzle_${Date.now()}`,
        name,
        boardId,
        botRole,
        movesToMate: solution.length > 0 ? Math.ceil(solution.length / 2) : movesToMate,
        solution,
        width,
        height,
        board,
        hands,
        promotionZoneSize
      };
      pushToGithub(puzzle, token, true);
    }
  };

  const isSelected = (loc: SelectedPieceRef) => {
     if (!selectedPieceRef || !loc) return false;
     if (loc.location === 'board' && selectedPieceRef.location === 'board') return loc.x === selectedPieceRef.x && loc.y === selectedPieceRef.y;
     if (loc.location === 'hand' && selectedPieceRef.location === 'hand') return loc.owner === selectedPieceRef.owner && loc.index === selectedPieceRef.index;
     return false;
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h2 className="title" style={{ margin: 0 }}>
            {editorMode === 'board' ? 'Board Editor' : 'Matt-Problem Creator'}
          </h2>
          {editorPhase === 'solution' && (
            <div style={{ padding: '0.25rem 0.75rem', background: 'var(--primary)', color: 'white', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 'bold' }}>
              Aufzeichnung: {recordingTurn === 'sente' ? 'Sente (Schwarz)' : 'Gote (Weiß)'} ist am Zug
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            className={`btn ${editorMode === 'board' ? '' : 'btn-secondary'}`} 
            onClick={() => { setEditorMode('board'); setName('My Custom Setup'); }}
          >
            Board
          </button>
          <button 
            className={`btn ${editorMode === 'puzzle' ? '' : 'btn-secondary'}`} 
            onClick={() => { setEditorMode('puzzle'); setName('My Custom Puzzle'); }}
          >
            Puzzle
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/')}>🔙 Lobby</button>
        </div>
      </div>

      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', padding: '0.5rem', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px' }} />
        </div>
        
        {editorMode === 'board' ? (
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Breite (x)</label>
              <input type="number" min={3} max={15} value={width} onChange={e => updateSize(parseInt(e.target.value), height)} style={{ width: '100%', padding: '0.5rem', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Höhe (y)</label>
              <input type="number" min={5} max={15} value={height} onChange={e => updateSize(width, parseInt(e.target.value))} style={{ width: '100%', padding: '0.5rem', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Beförderungszone (Reihen)</label>
              <input type="number" min={0} max={5} value={promotionZoneSize} onChange={e => setPromotionZoneSize(parseInt(e.target.value))} style={{ width: '100%', padding: '0.5rem', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px' }} />
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Basis Board</label>
              <select value={boardId} onChange={e => handleBaseBoardChange(e.target.value)} style={{ width: '100%', padding: '0.5rem', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px' }}>
                <option value="standard">Standard (9x9)</option>
                {customSetups.map(s => <option key={s.id} value={s.id}>{s.name} ({s.width}x{s.height})</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Bot Rolle (Verlierer)</label>
              <select value={botRole} onChange={e => setBotRole(e.target.value as Player)} style={{ width: '100%', padding: '0.5rem', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px' }}>
                <option value="gote">Gote (Weiß)</option>
                <option value="sente">Sente (Schwarz)</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Züge bis Matt</label>
              <input type="number" min={1} max={99} value={movesToMate} onChange={e => setMovesToMate(parseInt(e.target.value))} style={{ width: '100%', padding: '0.5rem', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px' }} />
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        {/* Sidebar */}
        <div className="lobby-card" style={{ flex: '1 1 200px' }}>
          {editorMode === 'board' ? (
             <>
                <h3>Werkzeuge</h3>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                   <label>
                      <input type="radio" checked={selectedOwner === 'sente'} onChange={() => setSelectedOwner('sente')} />
                      Sente (Schwarz)
                   </label>
                   <label>
                      <input type="radio" checked={selectedOwner === 'gote'} onChange={() => setSelectedOwner('gote')} />
                      Gote (Weiß)
                   </label>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                   <button 
                      className="btn"
                      style={{ 
                        background: selectedType === 'eraser' ? 'rgba(234, 179, 8, 0.3)' : 'var(--surface)', 
                        color: 'var(--text)',
                        border: selectedType === 'eraser' ? '1px solid #eab308' : '1px solid transparent'
                      }} 
                      onClick={() => setSelectedType('eraser')}
                   >
                    🧹 Eraser
                  </button>
                  {PIECE_TYPES.map(pt => (
                    <button 
                      key={pt} 
                      className="btn"
                      style={{ 
                        background: selectedType === pt ? 'rgba(234, 179, 8, 0.3)' : 'var(--surface)',
                        color: 'var(--text)',
                        border: selectedType === pt ? '1px solid #eab308' : '1px solid transparent',
                        display: 'flex', justifyContent: 'center'
                      }}
                      onClick={() => setSelectedType(pt)}
                    >
                      <PieceIcon type={pt} color={selectedOwner === 'sente' ? 'var(--theme-sente)' : 'var(--theme-gote)'} size={24} displayMode={displayMode} />
                    </button>
                  ))}
                </div>
             </>
          ) : (
             <>
                <h3>Aktionen</h3>
                {selectedPieceRef ? (
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                      {editorPhase === 'setup' && (
                         <button className="btn btn-secondary" onClick={flipOwner}>Seite wechseln</button>
                      )}
                      <button className="btn btn-secondary" onClick={togglePromote}>Befördern / Degradieren</button>
                      {editorPhase === 'setup' && selectedPieceRef.location === 'board' && (
                         <button className="btn btn-secondary" onClick={moveToHand}>In die Hand</button>
                      )}
                   </div>
                ) : (
                   <p style={{ opacity: 0.7 }}>Wähle eine Figur auf dem Brett oder in der Hand, um sie zu bearbeiten oder zu bewegen.</p>
                )}
             </>
          )}
        </div>

        {/* Board Preview */}
        <div style={{ flex: '1 1 300px' }}>
          <div style={{ marginBottom: '1rem' }}>
            <h4>Gote Hand (Weiß)</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', minHeight: '40px', background: 'var(--surface)', padding: '0.5rem', borderRadius: '4px' }}>
              {hands.gote.map((p, i) => {
                const sel = isSelected({ location: 'hand', owner: 'gote', index: i });
                return (
                   <div key={p.id} onClick={() => handleHandClick('gote', i)} style={{ cursor: 'pointer', background: sel ? 'rgba(234, 179, 8, 0.3)' : 'transparent', borderRadius: '4px' }}>
                     <PieceIcon type={p.type} color="var(--theme-gote)" displayMode={displayMode} />
                   </div>
                )
              })}
              {editorMode === 'board' && (
                 <button className="btn btn-secondary" style={{ padding: '0 0.5rem' }} onClick={() => addHandPiece('gote', selectedType !== 'eraser' ? selectedType : 'pawn')}>+</button>
              )}
            </div>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: `repeat(${width}, 1fr)`, 
            gridTemplateRows: `repeat(${height}, 1fr)`,
            gap: '2px', 
            background: 'var(--board-lines)', 
            padding: '2px', 
            borderRadius: '4px' 
          }}>
            {board.map((row, y) => (
              <React.Fragment key={`row-${y}`}>
                {row.map((cell, x) => {
                  const sel = isSelected({ location: 'board', x, y });
                  return (
                    <div 
                      key={`cell-${x}-${y}`} 
                      onClick={() => handleCellClick(x, y)}
                      className={`cell ${(y < promotionZoneSize || y >= height - promotionZoneSize) ? 'promotion-zone' : ''}`}
                      style={{ 
                        aspectRatio: '1',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer',
                        background: sel ? 'rgba(234, 179, 8, 0.5)' : undefined
                      }}
                    >
                      {cell && (
                        <div style={{ transform: cell.owner === 'gote' ? 'rotate(180deg)' : 'none' }}>
                          <PieceIcon type={cell.type} color={cell.owner === 'sente' ? 'var(--theme-sente)' : 'var(--theme-gote)'} displayMode={displayMode} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>

          <div style={{ marginTop: '1rem' }}>
            <h4>Sente Hand (Schwarz)</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', minHeight: '40px', background: 'var(--surface)', padding: '0.5rem', borderRadius: '4px' }}>
              {hands.sente.map((p, i) => {
                const sel = isSelected({ location: 'hand', owner: 'sente', index: i });
                return (
                   <div key={p.id} onClick={() => handleHandClick('sente', i)} style={{ cursor: 'pointer', background: sel ? 'rgba(234, 179, 8, 0.3)' : 'transparent', borderRadius: '4px' }}>
                     <PieceIcon type={p.type} color="var(--theme-sente)" displayMode={displayMode} />
                   </div>
                )
              })}
              {editorMode === 'board' && (
                 <button className="btn btn-secondary" style={{ padding: '0 0.5rem' }} onClick={() => addHandPiece('sente', selectedType !== 'eraser' ? selectedType : 'pawn')}>+</button>
              )}
            </div>
          </div>
          
          {editorMode === 'board' ? (
             <button className="btn" style={{ marginTop: '2rem', width: '100%' }} onClick={saveSetup} disabled={isSaving}>
               {isSaving ? '⏳ Speichere auf GitHub...' : '💾 Setup auf GitHub Speichern'}
             </button>
          ) : (
             editorPhase === 'setup' ? (
               <button className="btn" style={{ marginTop: '2rem', width: '100%', background: 'var(--theme-sente)', color: '#fff' }} onClick={() => { setEditorPhase('solution'); setSolution([]); setRecordingTurn(botRole === 'gote' ? 'sente' : 'gote'); }}>
                 🔴 Lösung aufzeichnen
               </button>
             ) : (
               <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                 <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setEditorPhase('setup'); setSolution([]); }}>
                   ⏹️ Abbrechen
                 </button>
                 <button className="btn" style={{ flex: 2 }} onClick={saveSetup} disabled={isSaving || solution.length === 0}>
                   {isSaving ? '⏳ Speichere...' : `💾 Speichern (${Math.ceil(solution.length / 2)} Züge bis Matt)`}
                 </button>
               </div>
             )
          )}
        </div>
      </div>

      {showTokenPrompt && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>GitHub Token benötigt</h3>
            <p style={{ opacity: 0.8, marginBottom: '1rem', fontSize: '0.9rem' }}>Um {editorMode === 'board' ? 'Boards' : 'Puzzles'} direkt in deinem Repository (whennig2000/shogitool) zu speichern, wird ein Personal Access Token mit Repo-Rechten benötigt.</p>
            <input 
              type="password" 
              placeholder="ghp_xxxxxxxxxxxx" 
              value={githubToken}
              onChange={e => setGithubToken(e.target.value)}
              style={{ width: '100%', padding: '0.8rem', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px', marginBottom: '1rem' }}
            />
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => setShowTokenPrompt(false)}>Abbrechen</button>
              <button className="btn" onClick={() => executeSave(githubToken)}>Speichern</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
