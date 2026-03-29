/**
 * BabylonPlayground — Grudge Engine example scene using Babylon.js.
 *
 * Demonstrates t5c-style patterns adapted for Grudge Warlords:
 *   - Scene setup (lights, skybox, ground, fog, shadows)
 *   - Click-to-move player controller
 *   - AI entities with IDLE/PATROL/CHASE state machine
 *   - Babylon.js GUI HUD (health, mana, hotbar, debug)
 *   - Multi-rate game loop (render, server tick, slow tick)
 *
 * Route: /playground
 */

import { useEffect, useRef } from 'react';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';

import { GrudgeEngine, GRUDGE_CONFIG } from '../engine-babylon/GrudgeEngine';
import { createGrudgeScene } from '../engine-babylon/GrudgeScene';
import { GrudgePlayerInput } from '../engine-babylon/GrudgePlayerInput';
import { GrudgeCamera } from '../engine-babylon/GrudgeCamera';
import { GrudgeEntity } from '../engine-babylon/GrudgeEntity';
import { GrudgeHUD } from '../engine-babylon/GrudgeHUD';

// ── Enemy spawn definitions ─────────────────────────────────────
const ENEMY_SPAWNS = [
  { name: 'Orc Scout',    pos: [8, 0, 8],   color: [0.4, 0.6, 0.3],  hp: 80,  lvl: 2 },
  { name: 'Orc Grunt',    pos: [-10, 0, 5],  color: [0.35, 0.5, 0.25], hp: 120, lvl: 3 },
  { name: 'Undead Shade',  pos: [5, 0, -12], color: [0.5, 0.4, 0.6],  hp: 60,  lvl: 1 },
  { name: 'Elf Warden',    pos: [-6, 0, -8], color: [0.3, 0.7, 0.5],  hp: 100, lvl: 2 },
  { name: 'Dwarf Sentry',  pos: [12, 0, -4], color: [0.6, 0.5, 0.3],  hp: 150, lvl: 4 },
];

export default function BabylonPlayground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GrudgeEngine | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ── Create canvas ────────────────────────────────────────
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.outline = 'none';
    container.appendChild(canvas);

    // ── Initialize engine ────────────────────────────────────
    const ge = new GrudgeEngine(canvas);
    engineRef.current = ge;

    // ── Create scene ─────────────────────────────────────────
    const { scene, shadowGenerator } = createGrudgeScene(ge.engine);
    ge.scene = scene;

    // ── Camera ───────────────────────────────────────────────
    const cam = new GrudgeCamera(scene, canvas);
    scene.activeCamera = cam.camera;

    // ── Input ────────────────────────────────────────────────
    const input = new GrudgePlayerInput(scene);

    // ── HUD ──────────────────────────────────────────────────
    const hud = new GrudgeHUD(scene);

    // ── Player entity ────────────────────────────────────────
    const player = new GrudgeEntity(
      'Player',
      scene,
      new Vector3(0, 0, 0),
      new Color3(0.2, 0.4, 0.9), // blue
      { health: 800, maxHealth: 800, mana: 200, maxMana: 200, level: 5, speed: 5 },
      false,
    );
    if (shadowGenerator) player.addShadow(shadowGenerator);
    cam.attach(player);

    // ── Enemy entities ───────────────────────────────────────
    const enemies: GrudgeEntity[] = [];
    for (const spawn of ENEMY_SPAWNS) {
      const enemy = new GrudgeEntity(
        spawn.name,
        scene,
        new Vector3(spawn.pos[0], spawn.pos[1], spawn.pos[2]),
        new Color3(spawn.color[0], spawn.color[1], spawn.color[2]),
        { health: spawn.hp, maxHealth: spawn.hp, level: spawn.lvl, speed: 1.5 },
        true, // enable AI
      );
      if (shadowGenerator) enemy.addShadow(shadowGenerator);
      enemies.push(enemy);
    }

    // ── Some decorative objects ──────────────────────────────
    const pillar1 = MeshBuilder.CreateCylinder('pillar1', { height: 4, diameter: 0.8 }, scene);
    pillar1.position = new Vector3(-3, 2, 3);
    const pillarMat = new StandardMaterial('pillarMat', scene);
    pillarMat.diffuseColor = new Color3(0.4, 0.35, 0.3);
    pillar1.material = pillarMat;
    pillar1.receiveShadows = true;
    if (shadowGenerator) shadowGenerator.addShadowCaster(pillar1);

    const pillar2 = pillar1.clone('pillar2');
    pillar2.position = new Vector3(3, 2, 3);

    const pillar3 = pillar1.clone('pillar3');
    pillar3.position = new Vector3(-3, 2, -3);

    const pillar4 = pillar1.clone('pillar4');
    pillar4.position = new Vector3(3, 2, -3);

    // ── Multi-rate game loop (t5c pattern) ───────────────────
    const timers = {
      SERVER: { rate: GRUDGE_CONFIG.SERVER_RATE, last: Date.now() },
      SLOW: { rate: GRUDGE_CONFIG.SLOW_RATE, last: Date.now() },
    };

    scene.registerBeforeRender(() => {
      const dt = ge.engine.getDeltaTime() / 1000; // seconds
      const now = Date.now();

      // ── Camera follow ───────────────────────────────────
      cam.update();

      // ── Player movement (WASD + click-to-move) ──────────
      const wasd = input.getWASDDirection();
      if (wasd.length() > 0) {
        player.moveDirection(wasd, dt);
      } else if (input.pickPoint && input.playerCanMove) {
        player.moveTo(input.pickPoint);
        input.pickPoint = null;
      }
      player.update(dt);

      // ── Hotbar ──────────────────────────────────────────
      const digit = input.consumeDigit();
      if (digit > 0) hud.highlightSlot(digit - 1);

      // ── Enemies (every frame) ───────────────────────────
      for (const enemy of enemies) {
        enemy.update(dt, player.position);
      }

      // ── Server-rate tick ────────────────────────────────
      if (now - timers.SERVER.last >= timers.SERVER.rate) {
        timers.SERVER.last = now;
        // Placeholder: send input to server, reconcile
      }

      // ── Slow tick ───────────────────────────────────────
      if (now - timers.SLOW.last >= timers.SLOW.rate) {
        timers.SLOW.last = now;
        // HUD updates
        hud.updateHealth(player.stats.health, player.stats.maxHealth);
        hud.updateMana(player.stats.mana, player.stats.maxMana);
        hud.updateDebug(
          ge.engine.getFps(),
          enemies.length + 1,
          `Player: ${player.position.x.toFixed(1)}, ${player.position.z.toFixed(1)}`,
        );
      }
    });

    // ── Start ────────────────────────────────────────────────
    ge.startRenderLoop();

    // ── Resize ───────────────────────────────────────────────
    const onResize = () => ge.resize();
    window.addEventListener('resize', onResize);

    // Hide loading after first render
    scene.executeWhenReady(() => {
      ge.engine.hideLoadingUI();
    });

    // ── Cleanup ──────────────────────────────────────────────
    return () => {
      window.removeEventListener('resize', onResize);
      input.dispose();
      hud.dispose();
      ge.dispose();
      container.innerHTML = '';
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#0a0a1a',
        position: 'relative',
      }}
    >
      {/* Back button */}
      <button
        onClick={() => { window.location.href = '/'; }}
        style={{
          position: 'absolute', top: 10, right: 10, zIndex: 100,
          padding: '6px 14px', borderRadius: 6,
          background: 'rgba(10,10,26,0.9)', border: '1px solid #c5a05960',
          color: '#c5a059', fontFamily: "'Oxanium', sans-serif",
          fontSize: 12, cursor: 'pointer',
        }}
      >
        ← Back to 3D World
      </button>
    </div>
  );
}
