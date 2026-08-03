const fs = require('fs');
let code = fs.readFileSync('client/src/components/Game.tsx', 'utf8');

// Fix INITIAL_BOARD
code = code.replace(
  "import { createPiece, INITIAL_BOARD } from '../../../shared/constants';",
  "import { createPiece, getInitialBoard } from '../../../shared/constants';"
);
code = code.replace(
  "board: INITIAL_BOARD,",
  "board: getInitialBoard(),"
);

// Remove unused handleRematchOption
code = code.replace(
  `    // Check if chat message contains options and it's a rematch option
    const handleRematchOption = (value: string) => {
       if (value === 'accept_rematch') {
          socket.emit('acceptRematch', roomId);
       } else if (value === 'decline_rematch') {
          socket.emit('declineRematch', roomId);
       }
    };`,
  ""
);

fs.writeFileSync('client/src/components/Game.tsx', code);
