/**
 * GrudgePlayerInput — Input controller for the Babylon.js playground.
 *
 * Mirrors t5c PlayerInput: click-to-move (Diablo style), keyboard hotbar,
 * right-click camera rotation, middle-click pan.
 */

import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { PointerEventTypes } from '@babylonjs/core/Events/pointerEvents';
import { KeyboardEventTypes } from '@babylonjs/core/Events/keyboardEvents';

export class GrudgePlayerInput {
  public scene: Scene;

  // Mouse state
  public leftClick = false;
  public rightClick = false;
  public middleClick = false;
  public mouseMoving = false;

  // Movement direction (from click angle)
  public angle = 0;
  public horizontal = 0;
  public vertical = 0;
  public playerCanMove = false;

  // Keyboard
  public keyW = false;
  public keyA = false;
  public keyS = false;
  public keyD = false;
  public digitPressed = 0;

  // Ground pick point (click-to-move destination)
  public pickPoint: Vector3 | null = null;

  private _movementTimer: ReturnType<typeof setInterval> | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
    this._setupPointer();
    this._setupKeyboard();
  }

  private _setupPointer(): void {
    this.scene.onPointerObservable.add((info) => {
      // ── POINTER DOWN ────────────────────────────────────────
      if (info.type === PointerEventTypes.POINTERDOWN) {
        if (info.event.button === 0) {
          this.leftClick = true;
          // Click-to-move: pick point on ground
          const pick = this.scene.pick(
            this.scene.pointerX,
            this.scene.pointerY,
            (m) => m.metadata?.type === 'environment',
          );
          if (pick?.hit && pick.pickedPoint) {
            this.pickPoint = pick.pickedPoint.clone();
            this.playerCanMove = true;
          }
          this._startMovementTimer();
        }
        if (info.event.button === 1) this.middleClick = true;
        if (info.event.button === 2) this.rightClick = true;
      }

      // ── POINTER UP ──────────────────────────────────────────
      if (info.type === PointerEventTypes.POINTERUP) {
        if (info.event.button === 0) {
          this.leftClick = false;
          this.playerCanMove = false;
          this.horizontal = 0;
          this.vertical = 0;
          this._stopMovementTimer();
        }
        if (info.event.button === 1) this.middleClick = false;
        if (info.event.button === 2) this.rightClick = false;
        this.mouseMoving = false;
      }

      // ── POINTER MOVE ────────────────────────────────────────
      if (this.leftClick) {
        const dpi = window.devicePixelRatio;
        const target = info.event.target as HTMLCanvasElement;
        const x = ((info.event.clientX * dpi) / target.width) * 2 - 1;
        const y = ((info.event.clientY * dpi) / target.height) * 2 - 1;
        this.angle = Math.atan2(x, y);
        this.horizontal = Math.sin(this.angle);
        this.vertical = Math.cos(this.angle);
      }

      if (this.rightClick) {
        this.mouseMoving = true;
      }
    });
  }

  private _setupKeyboard(): void {
    this.scene.onKeyboardObservable.add((kbInfo) => {
      const pressed = kbInfo.type === KeyboardEventTypes.KEYDOWN;
      switch (kbInfo.event.code) {
        case 'KeyW': this.keyW = pressed; break;
        case 'KeyA': this.keyA = pressed; break;
        case 'KeyS': this.keyS = pressed; break;
        case 'KeyD': this.keyD = pressed; break;
        case 'Digit1': if (pressed) this.digitPressed = 1; break;
        case 'Digit2': if (pressed) this.digitPressed = 2; break;
        case 'Digit3': if (pressed) this.digitPressed = 3; break;
        case 'Digit4': if (pressed) this.digitPressed = 4; break;
        case 'Digit5': if (pressed) this.digitPressed = 5; break;
        case 'Digit6': if (pressed) this.digitPressed = 6; break;
        case 'Digit7': if (pressed) this.digitPressed = 7; break;
        case 'Digit8': if (pressed) this.digitPressed = 8; break;
        case 'Digit9': if (pressed) this.digitPressed = 9; break;
      }
    });
  }

  /** Returns a WASD direction vector (normalized, Y=0). */
  getWASDDirection(): Vector3 {
    let x = 0;
    let z = 0;
    if (this.keyW) z += 1;
    if (this.keyS) z -= 1;
    if (this.keyA) x -= 1;
    if (this.keyD) x += 1;
    const dir = new Vector3(x, 0, z);
    if (dir.length() > 0) dir.normalize();
    return dir;
  }

  /** Consume the digit press (returns 0 after reading). */
  consumeDigit(): number {
    const d = this.digitPressed;
    this.digitPressed = 0;
    return d;
  }

  private _startMovementTimer(): void {
    this._stopMovementTimer();
    this._movementTimer = setInterval(() => {
      if (this.leftClick) this.playerCanMove = true;
    }, 200);
  }

  private _stopMovementTimer(): void {
    if (this._movementTimer) {
      clearInterval(this._movementTimer);
      this._movementTimer = null;
    }
  }

  dispose(): void {
    this._stopMovementTimer();
  }
}
