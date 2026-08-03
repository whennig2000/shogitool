const fs = require('fs');
let code = fs.readFileSync('client/src/components/Game.tsx', 'utf8');

const oldEffect = `  useEffect(() => {
    if (isGameOver) {
      socket.emit('gameOver', roomId);
    }
  }, [isGameOver, roomId]);`;

code = code.replace(oldEffect, '');

const targetStr = `  if (!gameState) return <div className="lobby">Lade Spiel...</div>;`;

const replaceStr = `  useEffect(() => {
    if (gameState) {
      const opponentRole = role === 'sente' ? 'gote' : 'sente';
      const amIInCheck = isKingInCheck(gameState.board, role);
      const opponentInCheck = isKingInCheck(gameState.board, opponentRole);
      const myLegalMoves = hasAnyLegalMoves(gameState.board, role, gameState.captured[role]);
      const opponentLegalMoves = hasAnyLegalMoves(gameState.board, opponentRole, gameState.captured[opponentRole]);
      const amICheckmated = amIInCheck && !myLegalMoves;
      const opponentCheckmated = opponentInCheck && !opponentLegalMoves;
      const isStalemate = (!amIInCheck && !myLegalMoves) || (!opponentInCheck && !opponentLegalMoves);
      const timerLoser = (gameState as any).timerExpired ? (gameState as any).winner === role ? opponentRole : role : null;
      
      if (amICheckmated || opponentCheckmated || isStalemate || timerLoser !== null) {
        socket.emit('gameOver', roomId);
      }
    }
  }, [gameState, role, roomId]);

  if (!gameState) return <div className="lobby">Lade Spiel...</div>;`;

code = code.replace(targetStr, replaceStr);

fs.writeFileSync('client/src/components/Game.tsx', code);
