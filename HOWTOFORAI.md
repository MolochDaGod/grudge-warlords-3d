# How To For AI — Grudge Warlords 3D

Guide for AI assistants working on this codebase.

## Core Rules

1. **Babylon.js 9.0 is the primary engine.** All new 3D code uses `@babylonjs/core` ES6 imports, NOT the UMD `babylonjs` package.
2. **Havok is the physics engine.** Use `PhysicsCharacterController` for characters, `PhysicsAggregate` for level geometry.
3. **Three.js is legacy.** The main `/` route still uses Three.js but is being migrated. Don't add new Three.js code.
4. **Tree-shaking imports only.** Import from specific paths like `@babylonjs/core/Maths/math.vector`, NOT `@babylonjs/core`.
5. **Use `babylon-imports.ts`** when porting playground `.js` snippets that use the global `BABYLON.*` namespace.

## Import Pattern

```typescript
// ✅ Correct — granular tree-shaking
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';

// ❌ Wrong — pulls entire library
import * as BABYLON from 'babylonjs';
import * as BABYLON from '@babylonjs/core';
```

Exception: when porting playground JS snippets, use:
```typescript
import * as BABYLON from '../engine-babylon/babylon-imports';
```

## Character Controller Pattern (Havok)

Two approaches, both valid:

### Full State Machine (recommended for MMO gameplay)
```
ThirdPersonController.ts:
  checkSupport() → state machine (IN_AIR/ON_GROUND/START_JUMP)
  → calculateMovement() → setVelocity() → integrate()
```

### Simple (for prototyping)
```
inputDirection.scale(dt * speed).applyRotationQuaternion(cameraOrientation)
→ moveWithCollisions(displacement)
```

## Camera Pattern

FreeCamera (NOT ArcRotateCamera) for third-person:
- `onBeforeRenderObservable`: lerp target to character, distance spring, height damp
- Pointer observable: mouse-drag orbit (slide camera position by right vector × movementX)
- Scroll: adjust follow distance

## Physics Level Pattern

```typescript
// Static level geometry
SceneLoader.ImportMeshAsync("", url, "level.glb", scene).then(() => {
  // Static mesh colliders
  new PhysicsAggregate(mesh, PhysicsShapeType.MESH, { mass: 0 });
  mesh.freezeWorldMatrix();
  mesh.doNotSyncBoundingInfo = true;

  // Dynamic boxes
  new PhysicsAggregate(box, PhysicsShapeType.BOX, { mass: 0.1 });
});
```

## File Organization

- `src/engine-babylon/` — All Babylon.js engine code
- `src/engine-babylon/thirdperson/` — Third-person character controller + camera
- `src/engine-babylon/rts/` — RTS game mode (units, formations, selection, weapons)
- `src/pages/` — React page components (one per route)
- `src/main.tsx` — Route registration (lazy imports)

## Adding a New Game Mode

1. Create engine files in `src/engine-babylon/yourmode/`
2. Create `src/pages/YourModePage.tsx`
3. Add lazy import + route in `src/main.tsx`
4. Add to `manualChunks` in `vite.config.ts` if new vendor deps

## Build & Deploy

```bash
npm run dev                    # Local dev
npm run build                  # Production build
VITE_CDN_BASE=https://cdn.grudge-studio.com/ npm run build  # CDN build
npm run deploy:puter           # Deploy to Puter
npm run deploy:puter:update    # Update Puter deploy
```

## Chunk Strategy

`vite.config.ts` has `manualChunks` that splits every major dependency into its own hashed chunk:
- Babylon core, GUI, loaders, materials, havok, inspector, post-processes, serializers
- Three.js, React, Colyseus, Socket.io, Rapier, bitECS, zustand, Howler, SpectorJS, GLSL parser

Each chunk is immutable-cached on CF (`_headers` file in `public/`).

## KayKit Character Models

Available at `/assets/models/characters/`:
- `crusaders_knight.glb` — Warrior
- `Animated_Wizard.glb` — Mage
- `ElfRanger.glb` — Ranger
- `berserker.glb` — Berserker
- `Skeleton.glb` — Enemy skeleton
- `Animated_Zombie.glb` — Enemy zombie
- `graatorc.glb` — Enemy orc
- `tpose_character.glb` through `tpose_character11.glb` — Mixamo T-pose characters

## Key Dependencies

| Package | Version | Purpose |
|---|---|---|
| `@babylonjs/core` | 9.0.0 | 3D engine |
| `@babylonjs/havok` | 9.0.0 | Physics |
| `@babylonjs/gui` | 9.0.0 | In-game UI |
| `@babylonjs/loaders` | 9.0.0 | glTF/GLB loading |
| `@babylonjs/inspector` | 9.0.0 | Debug tools |
| `@babylonjs/materials` | 9.0.0 | PBR, water, fire materials |
| `@babylonjs/post-processes` | 9.0.0 | Bloom, blur, SSAO |
| `@babylonjs/serializers` | 9.0.0 | GLB/glTF export |
| `react` | 18.x | UI framework |
| `vite` | 7.x | Build tool |
| `colyseus.js` | 0.16.x | Multiplayer |
| `bitecs` | latest | ECS framework |
| `zustand` | latest | State management |
| `howler` | latest | Audio |
| `socket.io-client` | latest | Real-time networking |

## Backend

- API: `https://game-api.grudge-studio.com`
- Object Store: `https://molochdagod.github.io/ObjectStore`
- Auth: Grudge JWT in `localStorage('grudge_jwt')`
- Domain: `grudge-studio.com` on Cloudflare
