/**
 * Character Creation — Full flow with live 3D voxel character preview.
 *
 * Flow: Faction → Race → Body Type + Skin → Class → Name → Enter World
 * Uses the modular voxel character pipeline:
 *   character-loader → race-mods → weapon-attach → animation-bind
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { loadCharacter, getCharacterDefsForRace, CHARACTER_DEFS, type CharacterInstance } from '../engine/character-loader';
import { applyRace, recolorPalette, RACE_CONFIGS, getRacesForFaction } from '../engine/race-mods';
import { equipClassStartingWeapons, detachAll } from '../engine/weapon-attach';
import { bindFallbackAnimations } from '../engine/animation-bind';

// ── Constants ──────────────────────────────────────────────────

const FONT = "'Oxanium', sans-serif";

const FACTIONS = [
  { id: 'Crusade', name: 'THE CRUSADE', color: '#c5a059', bg: '#c5a05915', desc: 'Honor-bound warriors and tacticians.' },
  { id: 'Fabled', name: 'THE FABLED', color: '#4fc3f7', bg: '#4fc3f715', desc: 'Ancient artisans and arcane scholars.' },
  { id: 'Legion', name: 'THE LEGION', color: '#ef5350', bg: '#ef535015', desc: 'Relentless conquerors and dark forces.' },
];

const CLASS_INFO: Record<string, { color: string; desc: string; weapons: string }> = {
  Warrior: { color: '#ef5350', desc: 'Heavy armor, shields, devastating strikes. Tank and melee DPS.', weapons: 'Swords, Shields, 2H Weapons' },
  Mage:    { color: '#7c4dff', desc: 'Ranged spellcaster, AoE damage, arcane power.', weapons: 'Staffs, Wands, Spell Books, Relics' },
  Ranger:  { color: '#66bb6a', desc: 'Bows, crossbows, daggers, traps, mobility.', weapons: 'Bows, Crossbows, Guns, Daggers' },
  Worge:   { color: '#ff9800', desc: 'Shapeshifter forms: Bear, Raptor, Bird. Lifesteal & stealth.', weapons: 'Staffs, Spears, Daggers, Bows' },
};

const CLASSES = ['Warrior', 'Mage', 'Ranger', 'Worge'];

const SKIN_PRESETS = [
  '#c4956a', '#d4a574', '#a57850', '#e8d5b8', '#7a5a3a', '#5a3a2a',
  '#5a8a3a', '#7a8a7a', '#b8a090', '#dcc8b0', '#8a6a5a', '#3a4a3a',
];

type Step = 'faction' | 'race' | 'customize' | 'class' | 'name';

interface CharacterCreationProps {
  onCreate: (char: { race: string; heroClass: string; name: string; bodyTypeId: number; skinColor: string }) => void;
}

// ══════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════

export default function CharacterCreation({ onCreate }: CharacterCreationProps) {
  const [step, setStep] = useState<Step>('faction');
  const [faction, setFaction] = useState<string | null>(null);
  const [race, setRace] = useState<string | null>(null);
  const [bodyTypeId, setBodyTypeId] = useState<number>(0);
  const [skinColor, setSkinColor] = useState<string>('#c4956a');
  const [heroClass, setHeroClass] = useState<string | null>(null);
  const [name, setName] = useState('');

  const previewRef = useRef<HTMLDivElement>(null);
  const sceneState = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    clock: THREE.Clock;
    animId: number;
    character: CharacterInstance | null;
    mixer: THREE.AnimationMixer | null;
  } | null>(null);

  // ── 3D Preview Setup ───────────────────────────────────────

  useEffect(() => {
    const container = previewRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(320, 440);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0x666666, 1));
    const dirLight = new THREE.DirectionalLight(0xffeedd, 2.5);
    dirLight.position.set(3, 5, 4);
    scene.add(dirLight);
    scene.add(new THREE.HemisphereLight(0x87CEEB, 0x3a5a2a, 0.6));

    // Ground disc
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(2, 32),
      new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9, metalness: 0.05 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    scene.add(ground);

    const camera = new THREE.PerspectiveCamera(30, 320 / 440, 0.1, 100);
    camera.position.set(0, 1.3, 4);
    camera.lookAt(0, 0.8, 0);

    const clock = new THREE.Clock();
    const state = {
      renderer, scene, camera, clock, animId: 0,
      character: null as CharacterInstance | null,
      mixer: null as THREE.AnimationMixer | null,
    };
    sceneState.current = state;

    const loop = () => {
      const dt = clock.getDelta();
      if (state.mixer) state.mixer.update(dt);
      if (state.character) state.character.group.rotation.y += dt * 0.4;
      renderer.render(scene, camera);
      state.animId = requestAnimationFrame(loop);
    };
    state.animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(state.animId);
      renderer.dispose();
      container.innerHTML = '';
    };
  }, []);

  // ── Load/Update Character Model ────────────────────────────

  const loadPreview = useCallback(async (charId: number, raceName: string, skin: string, className?: string) => {
    const state = sceneState.current;
    if (!state) return;

    // Remove old character
    if (state.character) {
      state.scene.remove(state.character.group);
      state.character = null;
      state.mixer = null;
    }

    try {
      const char = await loadCharacter(charId);
      applyRace(char, raceName);

      // Apply custom skin color if different from race default
      if (skin !== RACE_CONFIGS[raceName]?.skinColor) {
        recolorPalette(char, skin, RACE_CONFIGS[raceName]?.accentColor || '#4a3020');
      }

      // Attach class weapons
      if (className) {
        await equipClassStartingWeapons(char, className);
      }

      // Load fallback animations for idle
      try {
        const actions = await bindFallbackAnimations(char);
        const idle = actions.get('idle');
        if (idle) idle.play();
        state.mixer = char.mixer;
      } catch {
        // No animations — character still shows
      }

      state.scene.add(char.group);
      state.character = char;
    } catch (err) {
      console.warn('[CharacterCreation] Failed to load preview:', err);
    }
  }, []);

  // Reload preview when selections change
  useEffect(() => {
    if (race && bodyTypeId !== undefined) {
      loadPreview(bodyTypeId, race, skinColor, heroClass || undefined);
    }
  }, [race, bodyTypeId, skinColor, heroClass, loadPreview]);

  // When race changes, pick first available body type
  useEffect(() => {
    if (race) {
      const defs = getCharacterDefsForRace(race);
      if (defs.length > 0) setBodyTypeId(defs[0].id);
      setSkinColor(RACE_CONFIGS[race]?.skinColor || '#c4956a');
    }
  }, [race]);

  // ── Derived ────────────────────────────────────────────────

  const availableRaces = faction ? getRacesForFaction(faction) : [];
  const availableBodyTypes = race ? getCharacterDefsForRace(race) : [];
  const factionColor = FACTIONS.find(f => f.id === faction)?.color || '#888';
  const raceConfig = race ? RACE_CONFIGS[race] : null;

  // ── Render ─────────────────────────────────────────────────

  return (
    <div style={{ width: '100%', height: '100%', background: '#0a0a1a', display: 'flex', fontFamily: FONT, color: '#fff' }}>
      {/* Left: 3D Preview */}
      <div style={{ width: 360, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #1a1a2e' }}>
        <div ref={previewRef} style={{ width: 320, height: 440, borderRadius: 12, overflow: 'hidden', background: '#050510' }} />
        {race && (
          <div style={{ textAlign: 'center', marginTop: 12, padding: '0 16px' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: heroClass ? CLASS_INFO[heroClass]?.color : raceConfig?.skinColor || '#fff' }}>
              {name || `${race}${heroClass ? ` ${heroClass}` : ''}`}
            </div>
            <div style={{ fontSize: 11, color: factionColor, marginTop: 2 }}>
              {faction} Faction
            </div>
            {raceConfig && (
              <div style={{ fontSize: 10, color: '#555', marginTop: 4 }}>{raceConfig.description}</div>
            )}
          </div>
        )}
      </div>

      {/* Right: Selection UI */}
      <div style={{ flex: 1, padding: 32, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* ── STEP: FACTION ─────────────────────────────────── */}
        {step === 'faction' && (
          <div>
            <h1 style={h1Style}>CHOOSE YOUR FACTION</h1>
            <p style={subStyle}>Your faction determines which races you can play and your allegiance in the world.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 500 }}>
              {FACTIONS.map(f => (
                <button key={f.id} onClick={() => { setFaction(f.id); setRace(null); setHeroClass(null); }} style={{
                  padding: '20px 24px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                  background: faction === f.id ? f.bg : '#0d0d1e',
                  border: `2px solid ${faction === f.id ? f.color : '#1a1a2e'}`,
                  fontFamily: FONT, transition: 'all 0.15s',
                }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: f.color, letterSpacing: 2 }}>{f.name}</div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{f.desc}</div>
                </button>
              ))}
            </div>
            <button onClick={() => faction && setStep('race')} disabled={!faction} style={nextBtnStyle(!!faction)}>
              Choose Race →
            </button>
          </div>
        )}

        {/* ── STEP: RACE ───────────────────────────────────── */}
        {step === 'race' && (
          <div>
            <h1 style={h1Style}>CHOOSE YOUR RACE</h1>
            <p style={subStyle}>
              <span style={{ color: factionColor }}>{faction}</span> races available:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180, 1fr))', gap: 10, maxWidth: 600 }}>
              {availableRaces.map(r => {
                const cfg = RACE_CONFIGS[r];
                return (
                  <button key={r} onClick={() => { setRace(r); setHeroClass(null); }} style={{
                    padding: '18px 16px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                    background: race === r ? `${cfg.skinColor}20` : '#0d0d1e',
                    border: `2px solid ${race === r ? cfg.skinColor : '#1a1a2e'}`,
                    fontFamily: FONT, transition: 'all 0.15s',
                  }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: cfg.skinColor }}>{r}</div>
                    <div style={{ fontSize: 10, color: '#555', marginTop: 4 }}>{cfg.description}</div>
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setStep('faction')} style={backBtnStyle}>← Back</button>
              <button onClick={() => race && setStep('customize')} disabled={!race} style={nextBtnStyle(!!race)}>
                Customize →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: CUSTOMIZE ──────────────────────────────── */}
        {step === 'customize' && (
          <div>
            <h1 style={h1Style}>CUSTOMIZE</h1>
            <p style={subStyle}>
              <span style={{ color: raceConfig?.skinColor }}>{race}</span> — Choose body type and skin color.
            </p>

            {/* Body Type */}
            <div style={{ marginBottom: 20 }}>
              <div style={labelStyle}>BODY TYPE</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
                {availableBodyTypes.map(def => (
                  <button key={def.id} onClick={() => setBodyTypeId(def.id)} style={{
                    padding: '10px 12px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                    background: bodyTypeId === def.id ? '#1a1a3e' : '#0d0d1e',
                    border: `2px solid ${bodyTypeId === def.id ? '#c5a059' : '#1a1a2e'}`,
                    fontFamily: FONT, fontSize: 13, fontWeight: 600,
                    color: bodyTypeId === def.id ? '#c5a059' : '#888',
                    transition: 'all 0.15s',
                  }}>
                    {def.name}
                    <div style={{ fontSize: 9, color: '#555', marginTop: 2 }}>{def.bodyType.replace('_', ' ')}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Skin Color */}
            <div style={{ marginBottom: 20 }}>
              <div style={labelStyle}>SKIN COLOR</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {SKIN_PRESETS.map(c => (
                  <button key={c} onClick={() => setSkinColor(c)} style={{
                    width: 36, height: 36, borderRadius: 8, cursor: 'pointer',
                    background: c, border: `3px solid ${skinColor === c ? '#fff' : 'transparent'}`,
                    transition: 'all 0.15s',
                  }} />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setStep('race')} style={backBtnStyle}>← Back</button>
              <button onClick={() => setStep('class')} style={nextBtnStyle(true)}>
                Choose Class →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: CLASS ──────────────────────────────────── */}
        {step === 'class' && (
          <div>
            <h1 style={h1Style}>CHOOSE YOUR CLASS</h1>
            <p style={subStyle}>Your class determines combat style, abilities, and weapon proficiencies.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, maxWidth: 600 }}>
              {CLASSES.map(c => {
                const info = CLASS_INFO[c];
                return (
                  <button key={c} onClick={() => setHeroClass(c)} style={{
                    padding: '18px 16px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                    background: heroClass === c ? `${info.color}15` : '#0d0d1e',
                    border: `2px solid ${heroClass === c ? info.color : '#1a1a2e'}`,
                    fontFamily: FONT, transition: 'all 0.15s',
                  }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: info.color }}>{c}</div>
                    <div style={{ fontSize: 11, color: '#777', marginTop: 4 }}>{info.desc}</div>
                    <div style={{ fontSize: 10, color: '#555', marginTop: 6 }}>⚔ {info.weapons}</div>
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setStep('customize')} style={backBtnStyle}>← Back</button>
              <button onClick={() => heroClass && setStep('name')} disabled={!heroClass} style={nextBtnStyle(!!heroClass)}>
                Name Character →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: NAME ───────────────────────────────────── */}
        {step === 'name' && (
          <div>
            <h1 style={h1Style}>NAME YOUR CHARACTER</h1>
            <p style={subStyle}>
              <span style={{ color: raceConfig?.skinColor }}>{race}</span>{' '}
              <span style={{ color: CLASS_INFO[heroClass!]?.color }}>{heroClass}</span>{' — '}
              <span style={{ color: factionColor }}>{faction}</span>
            </p>
            <input
              value={name} onChange={e => setName(e.target.value)} maxLength={20}
              placeholder="Enter name..." autoFocus
              style={{
                width: '100%', maxWidth: 400, padding: '14px 18px', borderRadius: 8,
                fontSize: 22, textAlign: 'center', fontWeight: 700,
                background: '#0d0d1e', border: '2px solid #1a1a2e',
                color: '#fff', fontFamily: FONT, outline: 'none',
              }}
            />
            <div style={{ fontSize: 11, color: '#444', marginTop: 6 }}>{name.length}/20</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={() => setStep('class')} style={backBtnStyle}>← Back</button>
              <button
                onClick={() => {
                  if (name.trim().length >= 2 && race && heroClass) {
                    onCreate({ race, heroClass, name: name.trim(), bodyTypeId, skinColor });
                  }
                }}
                disabled={name.trim().length < 2}
                style={{
                  padding: '16px 56px', borderRadius: 10, fontSize: 20, fontWeight: 800,
                  background: name.trim().length >= 2
                    ? 'linear-gradient(135deg, #c5a059, #8b6914)'
                    : '#222',
                  color: name.trim().length >= 2 ? '#000' : '#555',
                  border: 'none', cursor: name.trim().length >= 2 ? 'pointer' : 'default',
                  fontFamily: FONT, letterSpacing: 1,
                }}
              >
                BEGIN ADVENTURE
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Style Helpers ──────────────────────────────────────────────

const h1Style: React.CSSProperties = {
  fontSize: 28, fontWeight: 800, color: '#c5a059', marginBottom: 4, letterSpacing: 1,
};
const subStyle: React.CSSProperties = {
  fontSize: 12, color: '#555', marginBottom: 20,
};
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: '#888', letterSpacing: 2, marginBottom: 8,
};
const backBtnStyle: React.CSSProperties = {
  padding: '10px 24px', borderRadius: 8, background: '#111', color: '#666',
  border: '1px solid #1a1a2e', cursor: 'pointer', fontFamily: "'Oxanium', sans-serif", fontSize: 13,
};
function nextBtnStyle(enabled: boolean): React.CSSProperties {
  return {
    marginTop: 20, padding: '14px 40px', borderRadius: 10, fontSize: 16, fontWeight: 700,
    background: enabled ? '#c5a059' : '#222', color: enabled ? '#000' : '#555',
    border: 'none', cursor: enabled ? 'pointer' : 'default',
    fontFamily: "'Oxanium', sans-serif", letterSpacing: 1,
  };
}
