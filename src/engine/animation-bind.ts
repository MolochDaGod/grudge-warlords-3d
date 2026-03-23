/**
 * Animation Binding — connects the animation library + retarget system
 * to the new voxel character instances.
 *
 * Loads FBX/GLB animation clips on demand, retargets them to the
 * DungeonCrawler skeleton, and registers them as AnimationActions
 * on the character's mixer.
 */

import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { CharacterInstance } from './character-loader';
import { AnimationComponent } from './components';
import {
  getAnim,
  getDefaultAnimSet,
  CC0_FALLBACK_SET,
  type AnimEntry,
} from '../game/animation-library';
import {
  applyRetargetedClip,
  extractBoneNamesFromClip,
  extractBoneNamesFromSkeleton,
  retargetClip,
} from '../game/animation-retarget';

// ── Clip Cache ─────────────────────────────────────────────────

const ANIM_BASE = '/assets/models/';
const clipCache = new Map<string, THREE.AnimationClip>();
const fbxLoader = new FBXLoader();
const gltfLoader = new GLTFLoader();

/**
 * Load a raw animation clip from an FBX or GLB file.
 * Returns the first clip found, or null.
 */
async function loadRawClip(source: string, clipName: string): Promise<THREE.AnimationClip | null> {
  const cacheKey = `${source}::${clipName}`;
  if (clipCache.has(cacheKey)) return clipCache.get(cacheKey)!;

  const url = ANIM_BASE + source;
  const ext = source.split('.').pop()?.toLowerCase();

  try {
    let clips: THREE.AnimationClip[] = [];

    if (ext === 'fbx') {
      const fbx = await new Promise<THREE.Group>((resolve, reject) => {
        fbxLoader.load(url, resolve, undefined, reject);
      });
      clips = fbx.animations;
    } else if (ext === 'glb' || ext === 'gltf') {
      const gltf = await new Promise<any>((resolve, reject) => {
        gltfLoader.load(url, resolve, undefined, reject);
      });
      clips = gltf.animations;
    }

    if (clips.length === 0) return null;

    // Find the clip by name, or take the first one
    let clip = clips.find(c => c.name === clipName) || clips[0];
    clipCache.set(cacheKey, clip);
    return clip;
  } catch (err) {
    console.warn(`[animation-bind] Failed to load ${source}:`, err);
    return null;
  }
}

// ── Retarget + Bind ────────────────────────────────────────────

/**
 * Load a single animation entry and bind it to a character as a named action.
 */
export async function bindAnimation(
  character: CharacterInstance,
  actionName: string,
  animEntry: AnimEntry,
): Promise<THREE.AnimationAction | null> {
  const rawClip = await loadRawClip(animEntry.source, animEntry.clipName);
  if (!rawClip) return null;

  // Retarget the clip to the character's skeleton
  const retargetedClip = applyRetargetedClip(rawClip, character.group);

  // Create action on the mixer
  const action = character.mixer.clipAction(retargetedClip);
  action.setLoop(
    animEntry.loop ? THREE.LoopRepeat : THREE.LoopOnce,
    animEntry.loop ? Infinity : 1,
  );
  if (!animEntry.loop) action.clampWhenFinished = true;

  return action;
}

/**
 * Load and bind a full animation set for a character based on class.
 * Returns a Map of actionName → AnimationAction.
 */
export async function bindAnimationSet(
  character: CharacterInstance,
  heroClass: string,
): Promise<Map<string, THREE.AnimationAction>> {
  const animSet = getDefaultAnimSet(heroClass);
  const actions = new Map<string, THREE.AnimationAction>();

  // Prioritize loading essential animations first
  const essentialKeys = ['idle', 'walk', 'run', 'attack', 'death', 'hit'];
  const otherKeys = Object.keys(animSet).filter(k => !essentialKeys.includes(k));

  // Load essentials first (blocking)
  for (const key of essentialKeys) {
    const animId = animSet[key];
    if (!animId) continue;
    const entry = getAnim(animId);
    if (!entry) continue;

    const action = await bindAnimation(character, key, entry);
    if (action) actions.set(key, action);
  }

  // Load remaining animations in parallel (non-blocking)
  const promises = otherKeys.map(async (key) => {
    const animId = animSet[key];
    if (!animId) return;
    const entry = getAnim(animId);
    if (!entry) return;

    const action = await bindAnimation(character, key, entry);
    if (action) actions.set(key, action);
  });
  await Promise.allSettled(promises);

  return actions;
}

/**
 * Load just the CC0 fallback animations (universal, lightweight).
 * Use this when full class-specific animations aren't needed yet.
 */
export async function bindFallbackAnimations(
  character: CharacterInstance,
): Promise<Map<string, THREE.AnimationAction>> {
  const actions = new Map<string, THREE.AnimationAction>();

  for (const [key, animId] of Object.entries(CC0_FALLBACK_SET)) {
    const entry = getAnim(animId);
    if (!entry) continue;

    const action = await bindAnimation(character, key, entry);
    if (action) actions.set(key, action);
  }

  return actions;
}

/**
 * Wire a character's animation actions into an AnimationComponent
 * for use with the ECS AnimationSystem.
 */
export function wireToECS(
  animComponent: AnimationComponent,
  character: CharacterInstance,
  actions: Map<string, THREE.AnimationAction>,
): void {
  animComponent.mixer = character.mixer;
  animComponent.actions = actions;
  animComponent.currentState = 'idle';

  // Auto-play idle if available
  const idle = actions.get('idle');
  if (idle) idle.play();
}

/**
 * Full setup: load class animations, bind to character, wire to ECS component.
 */
export async function setupCharacterAnimations(
  character: CharacterInstance,
  heroClass: string,
  animComponent: AnimationComponent,
): Promise<void> {
  const actions = await bindAnimationSet(character, heroClass);
  wireToECS(animComponent, character, actions);
}
