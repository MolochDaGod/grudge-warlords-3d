/**
 * GrudgeScene — Sets up a Babylon.js scene with all the visual basics.
 *
 * Mirrors t5c GameScene.createScene(): skybox, directional + hemispheric
 * lights, shadow generator, ground plane, fog, and a multi-rate game loop.
 */

import { Scene } from '@babylonjs/core/scene';
import { Engine } from '@babylonjs/core/Engines/engine';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import { GRUDGE_CONFIG } from './GrudgeEngine';

export interface GrudgeSceneOptions {
  skyColor?: [number, number, number, number];
  fogColor?: [number, number, number];
  sunIntensity?: number;
  shadows?: boolean;
  fog?: boolean;
}

const DEFAULTS: Required<GrudgeSceneOptions> = {
  skyColor: [0.04, 0.04, 0.1, 1],
  fogColor: [0.9, 0.9, 0.85],
  sunIntensity: 1.2,
  shadows: GRUDGE_CONFIG.SHADOW_ON,
  fog: GRUDGE_CONFIG.FOG_ON,
};

export function createGrudgeScene(
  engine: Engine,
  opts: GrudgeSceneOptions = {},
): {
  scene: Scene;
  shadowGenerator: ShadowGenerator | null;
  ground: Mesh;
} {
  const o = { ...DEFAULTS, ...opts };
  const scene = new Scene(engine);

  // Background
  scene.clearColor = new Color4(...o.skyColor);

  // ── Lights ──────────────────────────────────────────────────
  let shadowGenerator: ShadowGenerator | null = null;
  if (o.shadows) {
    const shadowLight = new DirectionalLight(
      'shadowLight',
      new Vector3(-0.5, -5, -0.5),
      scene,
    );
    shadowLight.intensity = 1;
    shadowLight.autoCalcShadowZBounds = true;

    shadowGenerator = new ShadowGenerator(2048, shadowLight);
    shadowGenerator.useBlurExponentialShadowMap = true;
    shadowGenerator.blurScale = 2;
    shadowGenerator.setDarkness(0.4);
  }

  // Hemispheric (ambient fill)
  const hemiLight = new HemisphericLight(
    'hemiLight',
    new Vector3(0, 1, 0),
    scene,
  );
  hemiLight.intensity = o.sunIntensity;
  hemiLight.groundColor = new Color3(0.13, 0.13, 0.13);
  hemiLight.specular = Color3.Black();

  // ── Skybox ──────────────────────────────────────────────────
  const skybox = MeshBuilder.CreateBox('skyBox', { size: 800 }, scene);
  const skyMat = new StandardMaterial('skyBoxMat', scene);
  skyMat.backFaceCulling = false;
  skyMat.disableLighting = true;
  skyMat.diffuseColor = new Color3(0, 0, 0);
  skyMat.specularColor = new Color3(0, 0, 0);
  skyMat.emissiveColor = new Color3(0.05, 0.05, 0.15);
  skybox.material = skyMat;
  skybox.infiniteDistance = true;
  skybox.isPickable = false;

  // ── Ground ──────────────────────────────────────────────────
  const ground = MeshBuilder.CreateGround(
    'ground',
    { width: 200, height: 200, subdivisions: 4 },
    scene,
  );
  const groundMat = new StandardMaterial('groundMat', scene);
  groundMat.diffuseColor = new Color3(0.18, 0.22, 0.15);
  groundMat.specularColor = new Color3(0.05, 0.05, 0.05);
  ground.material = groundMat;
  ground.receiveShadows = true;
  ground.isPickable = true;
  ground.metadata = { type: 'environment' };

  // ── Fog ─────────────────────────────────────────────────────
  if (o.fog) {
    scene.fogMode = Scene.FOGMODE_LINEAR;
    scene.fogStart = GRUDGE_CONFIG.FOG_START;
    scene.fogEnd = GRUDGE_CONFIG.FOG_END;
    scene.fogColor = new Color3(...o.fogColor);
  }

  return { scene, shadowGenerator, ground };
}
