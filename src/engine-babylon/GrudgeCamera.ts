/**
 * GrudgeCamera — Top-down RPG camera (orbit + follow target).
 *
 * Mirrors t5c PlayerCamera: ArcRotateCamera attached to a target mesh,
 * scroll-to-zoom, right-click-drag to orbit.
 */

import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { ArcRotateCameraPointersInput } from '@babylonjs/core/Cameras/Inputs/arcRotateCameraPointersInput';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';

export class GrudgeCamera {
  public camera: ArcRotateCamera;
  private _target: TransformNode | null = null;

  // Zoom limits
  private _minRadius = 6;
  private _maxRadius = 30;

  constructor(scene: Scene, canvas: HTMLCanvasElement) {
    this.camera = new ArcRotateCamera(
      'playerCam',
      -Math.PI / 2,
      Math.PI / 3.5,
      15,
      new Vector3(0, 0, 0),
      scene,
    );

    this.camera.lowerRadiusLimit = this._minRadius;
    this.camera.upperRadiusLimit = this._maxRadius;
    this.camera.lowerBetaLimit = 0.3;
    this.camera.upperBetaLimit = Math.PI / 2.2;

    this.camera.attachControl(canvas, true);
    this.camera.inputs.removeByType('ArcRotateCameraPointersInput');

    const pointersInput = new ArcRotateCameraPointersInput();
    pointersInput.buttons = [1, 2];
    this.camera.inputs.add(pointersInput);

    // Smooth zoom
    this.camera.wheelPrecision = 15;
    this.camera.pinchPrecision = 30;

    // Inertia
    this.camera.inertia = 0.85;
    this.camera.panningInertia = 0.85;
  }

  /** Attach camera to follow a target node. */
  attach(target: TransformNode): void {
    this._target = target;
  }

  /** Call each frame to smoothly follow the target. */
  update(): void {
    if (!this._target) return;
    const pos = this._target.position;
    this.camera.target = Vector3.Lerp(
      this.camera.target,
      new Vector3(pos.x, pos.y + 1, pos.z),
      0.1,
    );
  }

  /** Zoom by a delta amount (scroll event). */
  zoom(delta: number): void {
    this.camera.radius += delta * 0.01;
    this.camera.radius = Math.max(this._minRadius, Math.min(this._maxRadius, this.camera.radius));
  }
}
