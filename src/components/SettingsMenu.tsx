/**
 * SettingsMenu — in-game settings overlay
 * Sections: Account, Multiplayer, Cloud Sync, Audio, System
 */
import { useState, useEffect, useCallback } from 'react';
import {
  isPuterAvailable, puterSignIn, getPuterUser, syncPlayerToCloud, loadPlayerFromCloud,
  type PuterUser,
} from '@/game/puter-cloud';
import {
  type MultiplayerConfig, saveMultiplayerConfig,
} from '@/game/multiplayer';
import { type AudioSettings } from '@/game/audio-engine';

const FONT = "'Oxanium', sans-serif";
const APP_NAME = (import.meta as any).env?.VITE_APP_NAME || 'Grudge Warlords';
const APP_VERSION = (import.meta as any).env?.VITE_APP_VERSION || '1.0.0';

// ── Local storage keys (mirrors audio-engine.ts / multiplayer.ts) ──
const AUDIO_KEY = 'grudge_audio_settings';
const MP_KEY = 'grudge_multiplayer_settings';

function loadAudioSettings(): AudioSettings {
  try { const r = localStorage.getItem(AUDIO_KEY); if (r) return JSON.parse(r); } catch {}
  return { masterVolume: 0.7, sfxVolume: 0.8, musicVolume: 0.5, ambientVolume: 0.6, voiceVolume: 0.8, muted: false };
}
function saveAudioSettings(s: AudioSettings) {
  try { localStorage.setItem(AUDIO_KEY, JSON.stringify(s)); } catch {}
}
function loadMPConfig(): MultiplayerConfig {
  try { const r = localStorage.getItem(MP_KEY); if (r) return JSON.parse(r); } catch {}
  return { serverUrl: (import.meta as any).env?.VITE_MULTIPLAYER_URL || 'ws://localhost:2567', playerName: 'Adventurer', enabled: false };
}

// ── Styles ─────────────────────────────────────────────────────
const overlay: React.CSSProperties = {
  position: 'absolute', inset: 0, zIndex: 200,
  background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: FONT,
};
const panel: React.CSSProperties = {
  background: 'linear-gradient(to bottom, #1a1408, #0d0a04)',
  border: '2px solid #c5a059', borderRadius: 12, width: 480, maxHeight: '85vh',
  overflowY: 'auto', padding: 0,
  boxShadow: '0 12px 40px rgba(0,0,0,0.9), 0 0 12px rgba(197,160,89,0.15)',
};
const header: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '14px 20px', borderBottom: '1px solid #c5a05930',
};
const sectionStyle: React.CSSProperties = { padding: '12px 20px', borderBottom: '1px solid #ffffff08' };
const sectionTitle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: '#c5a059', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' as const };
const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 };
const label: React.CSSProperties = { fontSize: 12, color: '#b8a07a' };
const input: React.CSSProperties = {
  padding: '4px 8px', borderRadius: 4, background: '#111', border: '1px solid #333',
  color: '#ddd', fontSize: 11, fontFamily: FONT, width: 200,
};
const btn: React.CSSProperties = {
  padding: '5px 14px', borderRadius: 6, border: '1px solid #c5a05950',
  background: 'rgba(197,160,89,0.1)', color: '#c5a059', fontSize: 11,
  fontWeight: 600, cursor: 'pointer', fontFamily: FONT,
};
const dangerBtn: React.CSSProperties = {
  ...btn, borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444',
};
const slider: React.CSSProperties = { width: 140, accentColor: '#c5a059' };

interface Props {
  onClose: () => void;
}

export default function SettingsMenu({ onClose }: Props) {
  // ── Account ──
  const [puterUser, setPuterUser] = useState<PuterUser | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const grudgeJwt = localStorage.getItem('grudge_jwt');

  useEffect(() => {
    getPuterUser().then(u => u && setPuterUser(u));
  }, []);

  const handlePuterSignIn = useCallback(async () => {
    setAuthLoading(true);
    const user = await puterSignIn();
    if (user) setPuterUser(user);
    setAuthLoading(false);
  }, []);

  // ── Multiplayer ──
  const [mpConfig, setMpConfig] = useState<MultiplayerConfig>(loadMPConfig);
  const updateMP = (patch: Partial<MultiplayerConfig>) => {
    const next = { ...mpConfig, ...patch };
    setMpConfig(next);
    saveMultiplayerConfig(next);
  };

  // ── Audio ──
  const [audio, setAudio] = useState<AudioSettings>(loadAudioSettings);
  const updateAudio = (patch: Partial<AudioSettings>) => {
    const next = { ...audio, ...patch };
    setAudio(next);
    saveAudioSettings(next);
  };

  // ── Cloud sync ──
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const handleCloudSave = useCallback(async () => {
    setSyncing(true);
    setSyncStatus(null);
    const ok = await syncPlayerToCloud({
      attributes: JSON.parse(localStorage.getItem('grudge_player_attributes') || 'null'),
      equipment: JSON.parse(localStorage.getItem('grudge_player_equipment') || 'null'),
      professions: JSON.parse(localStorage.getItem('grudge_player_professions') || 'null'),
      resources: JSON.parse(localStorage.getItem('grudge_resources') || 'null'),
    });
    setSyncStatus(ok ? 'Saved to cloud ✓' : 'Cloud save failed (sign in to Puter first)');
    setSyncing(false);
  }, []);

  const handleCloudLoad = useCallback(async () => {
    setSyncing(true);
    setSyncStatus(null);
    const data = await loadPlayerFromCloud();
    if (data) {
      for (const [k, v] of Object.entries(data)) {
        localStorage.setItem(`grudge_${k}`, JSON.stringify(v));
      }
      setSyncStatus('Loaded from cloud ✓ — reload to apply');
    } else {
      setSyncStatus('No cloud data found');
    }
    setSyncing(false);
  }, []);

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={panel}>

        {/* Header */}
        <div style={header}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#f5e2c1' }}>⚙ Settings</div>
            <div style={{ fontSize: 9, color: '#6b5535' }}>{APP_NAME} v{APP_VERSION}</div>
          </div>
          <button style={btn} onClick={onClose}>✕ Close</button>
        </div>

        {/* ── Account ── */}
        <div style={sectionStyle}>
          <div style={sectionTitle}>🔑 Account</div>
          <div style={row}>
            <span style={label}>Puter Account</span>
            {puterUser ? (
              <span style={{ fontSize: 11, color: '#6ec96e' }}>✓ {puterUser.username}</span>
            ) : (
              <button style={btn} onClick={handlePuterSignIn} disabled={authLoading || !isPuterAvailable()}>
                {authLoading ? 'Signing in…' : isPuterAvailable() ? 'Sign In with Puter' : 'Puter unavailable'}
              </button>
            )}
          </div>
          <div style={row}>
            <span style={label}>Grudge Backend</span>
            <span style={{ fontSize: 11, color: grudgeJwt ? '#6ec96e' : '#6b5535' }}>
              {grudgeJwt ? '✓ Authenticated' : 'Not connected'}
            </span>
          </div>
        </div>

        {/* ── Cloud Sync ── */}
        <div style={sectionStyle}>
          <div style={sectionTitle}>☁ Cloud Save</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            <button style={btn} onClick={handleCloudSave} disabled={syncing}>
              {syncing ? '…' : '⬆ Save to Cloud'}
            </button>
            <button style={btn} onClick={handleCloudLoad} disabled={syncing}>
              {syncing ? '…' : '⬇ Load from Cloud'}
            </button>
          </div>
          {syncStatus && <div style={{ fontSize: 10, color: syncStatus.includes('✓') ? '#6ec96e' : '#ef4444' }}>{syncStatus}</div>}
          <div style={{ fontSize: 9, color: '#6b5535', marginTop: 4 }}>
            Cloud saves use your Puter account. Sign in above to enable.
          </div>
        </div>

        {/* ── Multiplayer ── */}
        <div style={sectionStyle}>
          <div style={sectionTitle}>🌐 Multiplayer</div>
          <div style={row}>
            <span style={label}>Enabled</span>
            <input type="checkbox" checked={mpConfig.enabled} onChange={e => updateMP({ enabled: e.target.checked })}
              style={{ accentColor: '#c5a059', width: 16, height: 16 }} />
          </div>
          <div style={row}>
            <span style={label}>Server URL</span>
            <input style={input} value={mpConfig.serverUrl} onChange={e => updateMP({ serverUrl: e.target.value })} placeholder="ws://localhost:2567" />
          </div>
          <div style={row}>
            <span style={label}>Player Name</span>
            <input style={input} value={mpConfig.playerName} onChange={e => updateMP({ playerName: e.target.value })} maxLength={24} />
          </div>
        </div>

        {/* ── Audio ── */}
        <div style={sectionStyle}>
          <div style={sectionTitle}>🔊 Audio</div>
          <div style={row}>
            <span style={label}>Mute All</span>
            <input type="checkbox" checked={audio.muted} onChange={e => updateAudio({ muted: e.target.checked })}
              style={{ accentColor: '#c5a059', width: 16, height: 16 }} />
          </div>
          {[
            { key: 'masterVolume' as const, label: 'Master' },
            { key: 'sfxVolume' as const, label: 'SFX' },
            { key: 'musicVolume' as const, label: 'Music' },
            { key: 'ambientVolume' as const, label: 'Ambient' },
            { key: 'voiceVolume' as const, label: 'Voice' },
          ].map(v => (
            <div key={v.key} style={row}>
              <span style={label}>{v.label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="range" min={0} max={100} value={Math.round(audio[v.key] * 100)}
                  onChange={e => updateAudio({ [v.key]: parseInt(e.target.value) / 100 })}
                  style={slider} />
                <span style={{ fontSize: 10, color: '#6b5535', width: 28, textAlign: 'right' }}>{Math.round(audio[v.key] * 100)}%</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── System ── */}
        <div style={{ ...sectionStyle, borderBottom: 'none' }}>
          <div style={sectionTitle}>🛠 System</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button style={dangerBtn} onClick={() => {
              localStorage.removeItem('grudge3d_character');
              window.location.reload();
            }}>Switch Character</button>
            <button style={dangerBtn} onClick={() => {
              if (confirm('Clear ALL local data? You will lose unsaved progress.')) {
                const keys = Object.keys(localStorage).filter(k => k.startsWith('grudge'));
                keys.forEach(k => localStorage.removeItem(k));
                window.location.reload();
              }
            }}>Reset All Data</button>
          </div>
          <div style={{ fontSize: 9, color: '#6b5535', marginTop: 8 }}>
            {APP_NAME} v{APP_VERSION} · Grudge Studio · Racalvin The Pirate King
          </div>
        </div>
      </div>
    </div>
  );
}
