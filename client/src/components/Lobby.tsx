import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import type { CustomSetup } from '../../../shared/types';

export const socket = io(import.meta.env.VITE_SERVER_URL || 'http://localhost:3001');

export const Lobby = () => {
  const [joinCode, setJoinCode] = useState('');
  const [customSetups, setCustomSetups] = useState<CustomSetup[]>([]);
  const [selectedSetupId, setSelectedSetupId] = useState<string>('standard');
  const navigate = useNavigate();

  useEffect(() => {
    socket.on('roomCreated', (id: string) => {
      navigate(`/game/${id}`);
    });

    socket.on('joinedRoom', (res: any) => {
      if (res.error) {
        alert(res.error);
        return;
      }
      navigate(`/game/${res.roomId}`);
    });

    const fetchSetups = async () => {
      try {
        const res = await fetch('https://api.github.com/repos/whennig2000/shogitool/contents/server/setups.json');
        if (res.ok) {
          const data = await res.json();
          const content = decodeURIComponent(escape(atob(data.content))); // proper utf-8 decode
          setCustomSetups(JSON.parse(content));
        }
      } catch (e) {
        console.error('Failed to load setups from GitHub', e);
      }
    };
    fetchSetups();

    return () => {
      socket.off('roomCreated');
      socket.off('joinedRoom');
    };
  }, [navigate]);

  const handleCreateRoom = () => {
    const setup = selectedSetupId === 'standard' ? null : customSetups.find(s => s.id === selectedSetupId);
    socket.emit('createRoom', { customSetup: setup }, ({ roomId, role }: any) => {
      navigate(`/room/${roomId}?role=${role}`);
    });
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.trim()) {
      socket.emit('joinRoom', joinCode.trim().toUpperCase(), (response: any) => {
        if (response.error) {
          alert(response.error);
        } else {
          navigate(`/room/${response.roomId}?role=${response.role}`);
        }
      });
    }
  };

  return (
    <div className="lobby">
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: '400px' }}>
        <h1 className="title" style={{ fontSize: '3rem', margin: '0' }}>Shogito</h1>
      </div>
      
      <div className="glass-panel" style={{ textAlign: 'center', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '1rem' }}>
        
        <div>
          <h3 style={{ marginBottom: '1rem', color: 'var(--text)' }}>Neues Spiel</h3>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text)', opacity: 0.7, textAlign: 'left' }}>Startaufstellung:</label>
          <select 
            value={selectedSetupId} 
            onChange={e => setSelectedSetupId(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '8px' }}
          >
            <option value="standard">Standard 9x9 Shogi</option>
            {customSetups.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.width}x{s.height})</option>
            ))}
          </select>
          <button className="btn" onClick={handleCreateRoom} style={{ width: '100%' }}>
            Spiel erstellen
          </button>
        </div>

        <div style={{ color: 'var(--text)', opacity: 0.5 }}>oder</div>

        <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ margin: 0, color: 'var(--text)' }}>Raum beitreten</h3>
          <input 
            type="text" 
            placeholder="Raum-Code eingeben"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            style={{
              padding: '1rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--text)',
              textAlign: 'center',
              textTransform: 'uppercase',
              fontSize: '1.2rem'
            }}
          />
          <button type="submit" className="btn btn-secondary">Beitreten</button>
        </form>

        <hr style={{ borderTop: '1px solid var(--border)', margin: '1rem 0' }} />

        <div>
          <h3 style={{ marginBottom: '0.5rem', color: 'var(--text)' }}>Board Editor</h3>
          <p style={{ margin: '0 0 1rem 0', color: 'var(--text)', opacity: 0.7, fontSize: '0.9rem' }}>Erstelle eigene Brettgrößen und Rätsel.</p>
          <button className="btn btn-secondary" onClick={() => navigate('/editor')} style={{ width: '100%' }}>
            🎨 Editor öffnen
          </button>
        </div>

      </div>
    </div>
  );
};
