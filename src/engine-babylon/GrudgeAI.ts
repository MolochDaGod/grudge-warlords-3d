/**
 * GrudgeAI — Simple AI state machine for NPC entities.
 *
 * Mirrors t5c AIState with states: IDLE, PATROL, CHASE, ATTACK, DEAD.
 * Operates on a TransformNode with a position in the scene.
 */

import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { GRUDGE_CONFIG } from './GrudgeEngine';

export enum AIState {
  IDLE = 0,
  PATROL = 1,
  CHASE = 2,
  ATTACK = 3,
  DEAD = 4,
}

export interface AIConfig {
  aggroDistance: number;
  attackDistance: number;
  patrolRadius: number;
  patrolSpeed: number;
  chaseSpeed: number;
  idleDuration: number;  // ms to idle before patrolling again
}

const DEFAULT_AI_CONFIG: AIConfig = {
  aggroDistance: GRUDGE_CONFIG.MONSTER_AGGRO_DISTANCE,
  attackDistance: GRUDGE_CONFIG.MONSTER_ATTACK_DISTANCE,
  patrolRadius: 8,
  patrolSpeed: 1.5,
  chaseSpeed: 3.5,
  idleDuration: 3000,
};

export class GrudgeAI {
  public state: AIState = AIState.IDLE;
  public config: AIConfig;
  public node: TransformNode;
  public spawnPoint: Vector3;

  // Patrol
  private _patrolTarget: Vector3;
  private _idleTimer = 0;
  private _idleStart = 0;

  // Chase
  private _chaseTarget: TransformNode | null = null;

  constructor(
    node: TransformNode,
    spawnPoint: Vector3,
    config?: Partial<AIConfig>,
  ) {
    this.node = node;
    this.spawnPoint = spawnPoint.clone();
    this.config = { ...DEFAULT_AI_CONFIG, ...config };
    this._patrolTarget = this._randomPatrolPoint();
    this._idleStart = Date.now();
  }

  /** Call every frame with delta time (seconds) and an optional player position to check aggro. */
  update(dt: number, playerPos?: Vector3): void {
    switch (this.state) {
      case AIState.IDLE:
        this._updateIdle(playerPos);
        break;
      case AIState.PATROL:
        this._updatePatrol(dt, playerPos);
        break;
      case AIState.CHASE:
        this._updateChase(dt);
        break;
      case AIState.ATTACK:
        this._updateAttack();
        break;
      case AIState.DEAD:
        break;
    }
  }

  /** Get a string label for current state (for HUD/debug). */
  getStateLabel(): string {
    return AIState[this.state];
  }

  // ── IDLE ────────────────────────────────────────────────────
  private _updateIdle(playerPos?: Vector3): void {
    // Check aggro
    if (playerPos && this._checkAggro(playerPos)) {
      this.state = AIState.CHASE;
      this._chaseTarget = null; // will use playerPos each frame
      return;
    }

    // After idle duration, pick a new patrol target
    if (Date.now() - this._idleStart > this.config.idleDuration) {
      this._patrolTarget = this._randomPatrolPoint();
      this.state = AIState.PATROL;
    }
  }

  // ── PATROL ──────────────────────────────────────────────────
  private _updatePatrol(dt: number, playerPos?: Vector3): void {
    // Check aggro
    if (playerPos && this._checkAggro(playerPos)) {
      this.state = AIState.CHASE;
      return;
    }

    // Move toward patrol target
    const dir = this._patrolTarget.subtract(this.node.position);
    dir.y = 0;
    const dist = dir.length();

    if (dist < 0.5) {
      // Reached patrol point — idle
      this.state = AIState.IDLE;
      this._idleStart = Date.now();
      return;
    }

    dir.normalize();
    this.node.position.addInPlace(dir.scale(this.config.patrolSpeed * dt));

    // Face movement direction
    this._faceDirection(dir);
  }

  // ── CHASE ───────────────────────────────────────────────────
  private _updateChase(dt: number): void {
    // For now, chase uses a stored position (playerPos was set in update)
    // In a real implementation this would track the actual player TransformNode
    if (!this._lastPlayerPos) {
      this.state = AIState.IDLE;
      this._idleStart = Date.now();
      return;
    }

    const dir = this._lastPlayerPos.subtract(this.node.position);
    dir.y = 0;
    const dist = dir.length();

    // Lost aggro
    if (dist > this.config.aggroDistance * 1.5) {
      this.state = AIState.IDLE;
      this._idleStart = Date.now();
      return;
    }

    // In attack range
    if (dist < this.config.attackDistance) {
      this.state = AIState.ATTACK;
      return;
    }

    dir.normalize();
    this.node.position.addInPlace(dir.scale(this.config.chaseSpeed * dt));
    this._faceDirection(dir);
  }

  private _lastPlayerPos: Vector3 | null = null;

  /** Overload update to store playerPos for chase. */
  updateWithPlayerPos(dt: number, playerPos: Vector3): void {
    this._lastPlayerPos = playerPos;
    this.update(dt, playerPos);
  }

  // ── ATTACK ──────────────────────────────────────────────────
  private _updateAttack(): void {
    // Simple: just go back to chase after a delay (combat logic TBD)
    // For now, immediately return to chase
    this.state = AIState.CHASE;
  }

  // ── Helpers ─────────────────────────────────────────────────
  private _checkAggro(playerPos: Vector3): boolean {
    const dist = Vector3.Distance(this.node.position, playerPos);
    return dist < this.config.aggroDistance;
  }

  private _randomPatrolPoint(): Vector3 {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * this.config.patrolRadius;
    return new Vector3(
      this.spawnPoint.x + Math.cos(angle) * radius,
      this.spawnPoint.y,
      this.spawnPoint.z + Math.sin(angle) * radius,
    );
  }

  private _faceDirection(dir: BABYLON.Vector3): void {
    const angle = Math.atan2(dir.x, dir.z);
    this.node.rotation.y = angle;
  }
}
