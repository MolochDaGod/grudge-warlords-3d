# Grudge Warlords 3D

A multi-mode 3D MMO game engine built with **Babylon.js 9.0**, **Havok Physics**, and **React**. Created by **Racalvin The Pirate King** at **Grudge Studio**.

## Game Modes

| Route | Mode | Engine | Description |
|---|---|---|---|
| `/` | 3D World | Three.js + Rapier | Main open-world MMO with character creation, factions, crafting |
| `/playground` | Playground | Babylon.js 9.0 | Engine demo: player, AI enemies, HUD, multi-rate game loop |
| `/thirdperson` | Third Person | Babylon.js 9.0 + Havok | Physics character controller: WASD, jump, collisions, camera follow |
| `/rts` | RTS | Babylon.js 9.0 | Real-time strategy: unit selection, formations, click-to-move, combat |
| `/retarget` | Retarget Tool | Babylon.js 9.0 | Animation retargeting tool (AnimatorAvatar API) |
| `/toonadmin` | Toon Admin | Three.js | Character builder: body types, races, weapons, animation browser |
| `/arena` | Arena | DCQ Bridge | 5v5 MOBA arena mode |

## Tech Stack

- **Babylon.js 9.0** — Primary 3D engine (ES6 tree-shaking imports)
- **Havok Physics** — Character controller, collisions, physics aggregates
- **Three.js** — Legacy game engine (being migrated)
- **React 18** — UI framework
- **Vite 7** — Build tool with manual chunk splitting
- **Colyseus** — Multiplayer networking
- **Socket.io** — Real-time communication
- **bitECS** — Entity Component System
- **zustand** — State management
- **Howler** — Audio engine
- **Cloudflare** — CDN caching for hashed assets

## Project Structure

```
src/
  engine-babylon/           ← Babylon.js 9.0 engine modules
    babylon-imports.ts      ← Master side-effect + re-export shim
    GrudgeEngine.ts         ← Engine wrapper, config, render loop
    GrudgeScene.ts          ← Scene setup (lights, skybox, ground, fog, shadows)
    GrudgeEntity.ts         ← Entity system (TransformNode + stats + AI)
    GrudgePlayerInput.ts    ← Input controller (pointer + keyboard)
    GrudgeCamera.ts         ← Orbit camera with follow
    GrudgeAI.ts             ← AI state machine (IDLE/PATROL/CHASE/ATTACK/DEAD)
    GrudgeHUD.ts            ← Babylon.js GUI HUD
    GrudgeRetargetTool.ts   ← Animation retargeting (AnimatorAvatar API)
    thirdperson/            ← Havok physics character controller
      ThirdPersonController.ts  ← PhysicsCharacterController + state machine
      ThirdPersonCamera.ts      ← FreeCamera follow + orbit
    rts/                    ← RTS game mode
      RTSGame.ts            ← Main game class
      RTSUnit.ts            ← KayKit unit types + GLB loading
      RTSFormations.ts      ← Circular/line/grid formations
      RTSSelection.ts       ← Drag-rectangle selection
      RTSWeapons.ts         ← Laser + melee attack visuals
      RTSCamera.ts          ← Top-down camera with edge-scroll
      RTSHUD.ts             ← RTS HUD
  engine/                   ← Three.js ECS engine (legacy)
  game/                     ← Game systems (combat, crafting, AI, etc.)
  pages/                    ← React page components
  components/               ← Shared UI components
public/
  _headers                  ← Cloudflare caching config
  assets/                   ← Models, textures, icons
```

## Setup

```bash
npm install
npm run dev          # Dev server at http://localhost:5173
npm run build        # Production build to dist/
```

### CDN Build

```bash
VITE_CDN_BASE=https://cdn.grudge-studio.com/ npm run build
```

### Deploy to Puter

```bash
npm run deploy:puter          # First deploy
npm run deploy:puter:update   # Update existing
```

## Babylon.js Playground Compatibility

When porting playground `.js` snippets, use the compatibility shim:

```typescript
import * as BABYLON from '../engine-babylon/babylon-imports';
```

This registers all side-effects (loaders, physics, audio, shadows) and re-exports every class so `BABYLON.Scene`, `BABYLON.ImportMeshAsync`, etc. work identically to playground code.

## Character Controller Patterns

### Havok Physics (recommended)

```typescript
// State machine: IN_AIR → ON_GROUND → START_JUMP
const controller = new PhysicsCharacterController(position, { capsuleHeight, capsuleRadius }, scene);
// In physics tick:
const support = controller.checkSupport(dt, downDirection);
const velocity = getDesiredVelocity(dt, support, currentVelocity);
controller.setVelocity(velocity);
controller.integrate(dt, support, gravity);
```

### Simple moveWithCollisions

```typescript
const displacement = inputDirection.scale(dt * speed).applyRotationQuaternion(cameraOrientation);
controller.moveWithCollisions(displacement);
```

## Chunk Optimization

Vite `manualChunks` splits all heavy deps into separate cached chunks:

- `vendor-babylon` — Babylon.js core (~2.6MB, 606KB gzip)
- `vendor-babylon-gui` — GUI controls
- `vendor-babylon-loaders` — glTF/GLB loaders
- `vendor-three` — Three.js (legacy)
- `vendor-rapier` — Rapier physics (legacy)
- `vendor-react-dom` — React runtime

All chunks are content-hashed → immutable CF cache (`max-age=31536000`).

## License

MIT
