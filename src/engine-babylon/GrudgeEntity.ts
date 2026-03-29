/**
 * GrudgeEntity — Entity system for the Babylon.js playground.
 *
 * Mirrors t5c Entity: extends TransformNode, has health/mana/level,
 * mesh controller, movement, and AI integration.
 */

import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { GrudgeAI, AIState } from './GrudgeAI';
import { GRUDGE_CONFIG } from './GrudgeEngine';

export interface EntityStats {
  name: string;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  level: number;
  speed: number;
}

const DEFAULT_STATS: EntityStats = {
  name: 'Entity',
  health: 100,
  maxHealth: 100,
  mana: 50,
  maxMana: 50,
  level: 1,
  speed: GRUDGE_CONFIG.PLAYER_SPEED,
};

/** Creates a simple capsule-like mesh to represent an entity. */
function createEntityMesh(
  name: string,
  scene: Scene,
  color: Color3,
  height = 1.8,
): Mesh {
  const body = MeshBuilder.CreateCylinder(
    `${name}_body`,
    { height: height * 0.6, diameter: 0.6, tessellation: 12 },
    scene,
  );
  body.position.y = height * 0.3;

  const head = MeshBuilder.CreateSphere(
    `${name}_head`,
    { diameter: 0.5, segments: 8 },
    scene,
  );
  head.position.y = height * 0.65;
  head.parent = body;

  const mat = new StandardMaterial(`${name}_mat`, scene);
  mat.diffuseColor = color;
  mat.specularColor = new Color3(0.2, 0.2, 0.2);
  body.material = mat;
  head.material = mat;

  // Make pickable
  body.isPickable = true;
  body.metadata = { type: 'entity', name };

  return body;
}

export class GrudgeEntity extends TransformNode {
  public stats: EntityStats;
  public mesh: Mesh;
  public ai: GrudgeAI | null = null;
  public isDead = false;

  // Movement
  private _moveTarget: Vector3 | null = null;

  constructor(
    name: string,
    scene: Scene,
    position: Vector3,
    color: Color3,
    stats?: Partial<EntityStats>,
    enableAI = false,
  ) {
    super(name, scene);

    this.stats = { ...DEFAULT_STATS, ...stats, name };
    this.position = position.clone();

    // Create mesh
    this.mesh = createEntityMesh(name, scene, color);
    this.mesh.parent = this;

    // AI
    if (enableAI) {
      this.ai = new GrudgeAI(this, position);
    }
  }

  /** Set a movement target (click-to-move). */
  moveTo(target: Vector3): void {
    this._moveTarget = target.clone();
    this._moveTarget.y = this.position.y;
  }

  /** Move using a direction vector (WASD). */
  moveDirection(dir: Vector3, dt: number): void {
    if (dir.length() < 0.01) return;
    this.position.addInPlace(dir.scale(this.stats.speed * dt));
    // Face direction
    const angle = Math.atan2(dir.x, dir.z);
    this.rotation.y = angle;
  }

  /** Main update — call every frame. */
  update(dt: number, playerPos?: Vector3): void {
    if (this.isDead) return;

    // AI update
    if (this.ai) {
      this.ai.updateWithPlayerPos(dt, playerPos || Vector3.Zero());
    }

    // Click-to-move
    if (this._moveTarget) {
      const dir = this._moveTarget.subtract(this.position);
      dir.y = 0;
      const dist = dir.length();

      if (dist < 0.3) {
        this._moveTarget = null;
        return;
      }

      dir.normalize();
      this.position.addInPlace(dir.scale(this.stats.speed * dt));
      const angle = Math.atan2(dir.x, dir.z);
      this.rotation.y = angle;
    }
  }

  /** Take damage. */
  takeDamage(amount: number): void {
    this.stats.health = Math.max(0, this.stats.health - amount);
    if (this.stats.health <= 0) {
      this.isDead = true;
      if (this.ai) this.ai.state = AIState.DEAD;
    }
  }

  /** Add shadow to this entity's mesh. */
  addShadow(shadowGen: ShadowGenerator): void {
    shadowGen.addShadowCaster(this.mesh);
  }

  /** Dispose entity and mesh. */
  remove(): void {
    this.mesh.dispose();
    this.dispose();
  }
}
