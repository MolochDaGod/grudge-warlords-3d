/**
 * ToonAdmin — Admin test page for the modular voxel character system.
 *
 * Features:
 *   - Character builder: select any of 12 body types
 *   - Race modifications: bone scaling + palette recolor
 *   - Weapon attachment: attach/detach all 21 weapon models
 *   - Animation browser: play any animation from the library
 *   - Flat arena with camera orbit
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CHARACTER_DEFS, loadCharacter, type CharacterInstance } from '../engine/character-loader';
import { applyRace, recolorPalette, RACE_CONFIGS, getRaceNames } from '../engine/race-mods';
import { attachWeapon, detachAll, getWeaponModelKeys, WEAPON_MODELS, getAttachedWeapons, equipClassStartingWeapons } from '../engine/weapon-attach';
import { bindAnimation, bindAnimationSet, bindFallbackAnimations } from '../engine/animation-bind';
import { ANIM_LIBRARY, getAnimsByCategory, type AnimCategory, type AnimEntry } from '../game/animation-library';

const FONT = "'Oxanium', sans-serif";
const CLASSES = ['Warrior', 'Mage', 'Ranger', 'Worge'];
const ANIM_CATEGORIES: AnimCategory[] = [
  'idle', 'movement', 'combat_melee', 'combat_ranged', 'combat_magic',
  'combat_reaction', 'dodge', 'block', 'death', 'social', 'harvesting',
  'swimming', 'npc_idle', 'mount', 'misc',
];

export default function ToonAdmin() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    clock: THREE.Clock;
    animId: number;
    char: CharacterInstance | null;
    actions: Map<string, THREE.AnimationAction>;
    currentAction: THREE.AnimationAction | null;
  } | null>(null);

  // Selection state
  const [charId, setCharId] = useState(0);
  const [race, setRace] = useState('Human');
  const [skinColor, setSkinColor] = useState('#c4956a');
  const [heroClass, setHeroClass] = useState('Warrior');
  const [currentAnim, setCurrentAnim] = useState('');
  const [animCategory, setAnimCategory] = useState<AnimCategory>('idle');
  const [loadingAnims, setLoadingAnims] = useState(false);
  const [attached, setAttached] = useState<{ mainhand?: string; offhand?: string }>({});

  // ── 3D Scene Setup ─────────────────────────────────────────

  useEffect(() => {
    const container = canvasRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    scene.add(new THREE.AmbientLight(0x666666, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffeedd, 2);
    dirLight.position.set(4, 8, 5);
    dirLight.castShadow = true;
    scene.add(dirLight);
    scene.add(new THREE.HemisphereLight(0x87CEEB, 0x3a5a2a, 0.5));

    // Grid + ground
    scene.add(new THREE.GridHelper(20, 20, 0x333355, 0x222244));
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.MeshStandardMaterial({ color: 0x151525, roughness: 0.95 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);

    const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 1.5, 4);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.8, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.update();

    const clock = new THREE.Clock();
    const state = {
      renderer, scene, camera, controls, clock, animId: 0,
      char: null as CharacterInstance | null,
      actions: new Map<string, THREE.AnimationAction>(),
      currentAction: null as THREE.AnimationAction | null,
    };
    stateRef.current = state;

    const loop = () => {
      const dt = clock.getDelta();
      controls.update();
      if (state.char?.mixer) state.char.mixer.update(dt);
      renderer.render(scene, camera);
      state.animId = requestAnimationFrame(loop);
    };
    state.animId = requestAnimationFrame(loop);

    const onResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(state.animId);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      renderer.dispose();
      container.innerHTML = '';
    };
  }, []);

  // ── Load Character ─────────────────────────────────────────

  const rebuildCharacter = useCallback(async () => {
    const state = stateRef.current;
    if (!state) return;

    // Remove old
    if (state.char) {
      state.scene.remove(state.char.group);
      state.char = null;
      state.actions.clear();
      state.currentAction = null;
    }

    try {
      const char = await loadCharacter(charId);
      applyRace(char, race);
      if (skinColor !== RACE_CONFIGS[race]?.skinColor) {
        recolorPalette(char, skinColor, RACE_CONFIGS[race]?.accentColor || '#4a3020');
      }
      await equipClassStartingWeapons(char, heroClass);

      // Load fallback anims
      const actions = await bindFallbackAnimations(char);
      const idle = actions.get('idle');
      if (idle) { idle.play(); state.currentAction = idle; }

      state.scene.add(char.group);
      state.char = char;
      state.actions = actions;
      setAttached(getAttachedWeapons(char));
      setCurrentAnim('idle');
    } catch (err) {
      console.error('[ToonAdmin] Failed to load character:', err);
    }
  }, [charId, race, skinColor, heroClass]);

  useEffect(() => { rebuildCharacter(); }, [rebuildCharacter]);

  // ── Play Animation ─────────────────────────────────────────

  const playAnim = useCallback(async (entry: AnimEntry) => {
    const state = stateRef.current;
    if (!state?.char) return;

    setLoadingAnims(true);
    try {
      const action = await bindAnimation(state.char, entry.id, entry);
      if (action) {
        if (state.currentAction) {
          state.currentAction.crossFadeTo(action, 0.2, true);
        }
        action.reset().play();
        state.currentAction = action;
        state.actions.set(entry.id, action);
        setCurrentAnim(entry.id);
      }
    } catch (err) {
      console.warn('[ToonAdmin] Animation load failed:', err);
    }
    setLoadingAnims(false);
  }, []);

  // ── Attach Weapon ──────────────────────────────────────────

  const handleAttachWeapon = useCallback(async (modelKey: string) => {
    const state = stateRef.current;
    if (!state?.char) return;
    await attachWeapon(state.char, modelKey);
    setAttached(getAttachedWeapons(state.char));
  }, []);

  const handleDetachAll = useCallback(() => {
    const state = stateRef.current;
    if (!state?.char) return;
    detachAll(state.char);
    setAttached({});
  }, []);

  // ── Render ─────────────────────────────────────────────────

  const categoryAnims = getAnimsByCategory(animCategory);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', fontFamily: FONT, color: '#ddd', background: '#0a0a1a' }}>
      {/* Left Panel: Controls */}
      <div style={{ width: 340, overflowY: 'auto', borderRight: '1px solid #1a1a2e', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#c5a059', margin: 0 }}>TOON ADMIN</h1>

        {/* Character Select */}
        <Section title="CHARACTER">
          <select value={charId} onChange={e => setCharId(Number(e.target.value))} style={selectStyle}>
            {CHARACTER_DEFS.map(d => (
              <option key={d.id} value={d.id}>{d.id}: {d.name} ({d.bodyType})</option>
            ))}
          </select>
        </Section>

        {/* Race */}
        <Section title="RACE">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {getRaceNames().map(r => (
              <button key={r} onClick={() => { setRace(r); setSkinColor(RACE_CONFIGS[r]?.skinColor || '#c4956a'); }}
                style={pillStyle(race === r, RACE_CONFIGS[r]?.skinColor || '#888')}>{r}</button>
            ))}
          </div>
        </Section>

        {/* Skin Color */}
        <Section title="SKIN">
          <input type="color" value={skinColor} onChange={e => setSkinColor(e.target.value)}
            style={{ width: 48, height: 32, border: 'none', cursor: 'pointer', background: 'transparent' }} />
          <span style={{ fontSize: 11, color: '#666', marginLeft: 8 }}>{skinColor}</span>
        </Section>

        {/* Class */}
        <Section title="CLASS (STARTING WEAPON)">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {CLASSES.map(c => (
              <button key={c} onClick={() => setHeroClass(c)}
                style={pillStyle(heroClass === c, '#c5a059')}>{c}</button>
            ))}
          </div>
        </Section>

        {/* Weapons */}
        <Section title="WEAPONS">
          <div style={{ fontSize: 10, color: '#555', marginBottom: 4 }}>
            MH: {attached.mainhand || 'none'} · OH: {attached.offhand || 'none'}
          </div>
          <button onClick={handleDetachAll} style={{ ...pillStyle(false, '#ef5350'), marginBottom: 6 }}>Detach All</button>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, maxHeight: 160, overflowY: 'auto' }}>
            {getWeaponModelKeys().map(k => (
              <button key={k} onClick={() => handleAttachWeapon(k)}
                style={pillStyle(attached.mainhand === k || attached.offhand === k, '#4fc3f7')}>
                {WEAPON_MODELS[k]?.name || k}
              </button>
            ))}
          </div>
        </Section>

        {/* Animation Browser */}
        <Section title="ANIMATIONS">
          <select value={animCategory} onChange={e => setAnimCategory(e.target.value as AnimCategory)} style={selectStyle}>
            {ANIM_CATEGORIES.map(c => (
              <option key={c} value={c}>{c} ({getAnimsByCategory(c).length})</option>
            ))}
          </select>
          <div style={{ maxHeight: 300, overflowY: 'auto', marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {categoryAnims.map(entry => (
              <button key={entry.id} onClick={() => playAnim(entry)}
                style={{
                  padding: '4px 8px', borderRadius: 4, cursor: 'pointer', textAlign: 'left',
                  background: currentAnim === entry.id ? '#1a1a3e' : '#0d0d1e',
                  border: `1px solid ${currentAnim === entry.id ? '#c5a059' : '#1a1a2e'}`,
                  fontFamily: FONT, fontSize: 11, color: currentAnim === entry.id ? '#c5a059' : '#888',
                }}>
                {entry.name}
                <span style={{ fontSize: 9, color: '#444', marginLeft: 6 }}>{entry.duration.toFixed(1)}s {entry.loop ? '⟲' : '▸'}</span>
              </button>
            ))}
          </div>
          {loadingAnims && <div style={{ fontSize: 10, color: '#c5a059', marginTop: 4 }}>Loading...</div>}
        </Section>
      </div>

      {/* Right: 3D Viewport */}
      <div ref={canvasRef} style={{ flex: 1 }} />
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#666', letterSpacing: 2, marginBottom: 6 }}>{title}</div>
      {children}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  width: '100%', padding: '6px 10px', borderRadius: 6, fontSize: 12,
  background: '#0d0d1e', border: '1px solid #1a1a2e', color: '#ccc',
  fontFamily: "'Oxanium', sans-serif",
};

function pillStyle(active: boolean, color: string): React.CSSProperties {
  return {
    padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600,
    background: active ? `${color}20` : '#0d0d1e',
    border: `1px solid ${active ? color : '#1a1a2e'}`,
    color: active ? color : '#888',
    fontFamily: "'Oxanium', sans-serif",
  };
}
