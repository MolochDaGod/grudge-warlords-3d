/**
 * GrudgeEngine — Babylon.js engine wrapper for the Grudge Warlords playground.
 *
 * Follows the t5c App pattern: owns the Engine, manages scene lifecycle,
 * and runs the render loop. Designed to be instantiated from a React
 * component that supplies a canvas element.
 */

import { Engine } from '@babylonjs/core/Engines/engine';
import '@babylonjs/loaders/glTF/2.0/glTFLoader';

// ── State enum (mirrors t5c Screens.ts) ────────────────────────
export enum GrudgeState {
  NULL = 0,
  PLAYGROUND = 1,
  LOADING = 2,
}

// ── Config (mirrors t5c Config.ts) ─────────────────────────────
export const GRUDGE_CONFIG = {
  title: 'Grudge Warlords',
  version: '0.1.0',

  // Render
  SHADOW_ON: true,
  FOG_ON: true,
  FOG_START: 60,
  FOG_END: 180,

  // Player
  PLAYER_SPEED: 5,
  PLAYER_VIEW_DISTANCE: 30,
  PLAYER_INTERACTABLE_DISTANCE: 5,

  // Enemies
  MONSTER_AGGRO_DISTANCE: 8,
  MONSTER_ATTACK_DISTANCE: 2,
  MONSTER_CHASE_PERIOD: 4000,
  MONSTER_RESPAWN_RATE: 20000,

  // Combat
  COMBAT_SPEED: 1000,

  // Update rates (ms)
  SERVER_RATE: 100,
  SLOW_RATE: 1000,
};

// ── Engine class ───────────────────────────────────────────────
export class GrudgeEngine {
  public engine: Engine;
  public scene: any | null = null; // BABYLON.Scene — typed loosely to avoid circular import
  public canvas: HTMLCanvasElement;
  public state: GrudgeState = GrudgeState.NULL;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.engine = new Engine(canvas, true, {
      adaptToDeviceRatio: true,
      antialias: true,
    });
    this.engine.setHardwareScalingLevel(1);
  }

  /** Start the render loop (call once after scene is ready). */
  startRenderLoop(): void {
    this.engine.runRenderLoop(() => {
      if (this.scene && this.scene.activeCamera) {
        this.scene.render();
      }
    });
  }

  /** Handle window resize. */
  resize(): void {
    this.engine.resize();
  }

  /** Clean up everything. */
  dispose(): void {
    this.engine.stopRenderLoop();
    if (this.scene) {
      this.scene.dispose();
      this.scene = null;
    }
    this.engine.dispose();
  }
}
