const fs = require('fs');
let code = fs.readFileSync('client/src/components/Game.tsx', 'utf8');

const targetStr = `  useEffect(() => {
    socket.emit('joinRoom', roomId, (res: any) => {
      if (res.error) {
        alert(res.error);
        navigate('/');
        return;
      }
      setGameState(res.gameState);
      setOpponentConnected(res.opponentConnected);
      setOpponentConnectionLost(false);
      setMyNameInput(res.gameState.playerNames[role]);
    });`;

const replaceStr = `  useEffect(() => {
    const doJoin = () => {
      socket.emit('joinRoom', roomId, (res: any) => {
        if (res.error) {
          alert(res.error);
          navigate('/');
          return;
        }
        setGameState(res.gameState);
        setOpponentConnected(res.opponentConnected);
        setOpponentConnectionLost(false);
        setMyNameInput(res.gameState.playerNames[role]);
      });
    };

    doJoin();
    socket.on('connect', doJoin);`;

code = code.replace(targetStr, replaceStr);

const targetOffStr = `    return () => {
      socket.off('stateUpdated');`;

const replaceOffStr = `    return () => {
      socket.off('connect', doJoin);
      socket.off('stateUpdated');`;

code = code.replace(targetOffStr, replaceOffStr);

fs.writeFileSync('client/src/components/Game.tsx', code);
