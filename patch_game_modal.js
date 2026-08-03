const fs = require('fs');
let code = fs.readFileSync('client/src/components/Game.tsx', 'utf8');

// Add imports
code = code.replace(
  "import { createPiece } from '../../../shared/constants';",
  "import { createPiece, INITIAL_BOARD } from '../../../shared/constants';\nimport type { CustomSetup } from '../../../shared/types';"
);

// Add RematchModal component at the bottom of Game.tsx
const modalComponent = `

const RematchModal = ({ onClose, onSend }: { onClose: () => void, onSend: (setupId: string, timer: number | null) => void }) => {
  const [customSetups, setCustomSetups] = useState<CustomSetup[]>([]);
  const [selectedSetupId, setSelectedSetupId] = useState<string>('standard');
  const [timerChoice, setTimerChoice] = useState<string>('none');

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/whennig2000/shogitool/main/server/setups.json?t=' + Date.now())
      .then(res => res.json())
      .then(data => setCustomSetups(data))
      .catch(err => console.error("Could not load setups", err));
  }, []);

  const handleSend = () => {
    let timer = null;
    if (timerChoice === '60') timer = 60;
    if (timerChoice === '300') timer = 300;
    if (timerChoice === '600') timer = 600;
    onSend(selectedSetupId, timer);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Neues Spiel vorschlagen</h3>
        
        <label style={{ display: 'block', marginTop: '1rem', textAlign: 'left' }}>Board:</label>
        <select 
          value={selectedSetupId} 
          onChange={e => setSelectedSetupId(e.target.value)}
          style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '8px' }}
        >
          <option value="standard">Standard 9x9 Shogi</option>
          {customSetups.map(s => (
            <option key={s.id} value={s.id}>{s.name} ({s.width}x{s.height})</option>
          ))}
        </select>
        
        <label style={{ display: 'block', marginTop: '1rem', textAlign: 'left' }}>Bedenkzeit:</label>
        <select 
          value={timerChoice} 
          onChange={e => setTimerChoice(e.target.value)}
          style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem', marginBottom: '1.5rem', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '8px' }}
        >
          <option value="none">Kein Timer</option>
          <option value="60">1 Minute pro Spieler</option>
          <option value="300">5 Minuten pro Spieler</option>
          <option value="600">10 Minuten pro Spieler</option>
        </select>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
           <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>Abbrechen</button>
           <button className="btn" onClick={handleSend} style={{ flex: 1 }}>Anfragen</button>
        </div>
      </div>
    </div>
  );
};
`;

code = code + modalComponent;
fs.writeFileSync('client/src/components/Game.tsx', code);
