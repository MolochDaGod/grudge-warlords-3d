/**
 * Weapon Attachment System — loads weapon FBX models and attaches them
 * to character hand bones at runtime.
 * 
 * Supports:
 *   - Right-hand weapons (swords, spears, staffs, knives)
 *   - Left-hand items (shields, spell books, off-hand)
 *   - Two-hand weapons (longbows, longswords — hide off-hand)
 *   - Dual wield (two one-hand weapons)
 */

import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import type { CharacterInstance } from './character-loader';

// ── Weapon Definitions ─────────────────────────────────────────

export type WeaponSlot = 'mainhand' | 'offhand';
export type WeaponGrip = 'one_hand' | 'two_hand' | 'off_hand';

export interface WeaponModelDef {
  /** Internal key matching the FBX file */
  modelKey: string;
  /** Display name */
  name: string;
  /** FBX filename in Content/Weapons/ */
  fbxFile: string;
  /** Which hand slot this goes in */
  slot: WeaponSlot;
  /** Grip type — two_hand hides offhand */
  grip: WeaponGrip;
  /** Position offset relative to hand bone */
  positionOffset: THREE.Vector3;
  /** Rotation offset (Euler degrees) */
  rotationOffset: THREE.Euler;
  /** Scale multiplier */
  scale: number;
  /** Bone name to attach to (searched by substring) */
  attachBone: string;
}

/**
 * Weapon model definitions mapped from the 21 FBX weapon files.
 * Position/rotation offsets will need tuning per weapon.
 */
export const WEAPON_MODELS: Record<string, WeaponModelDef> = {
  // ── Swords ──
  Sword: {
    modelKey: 'Sword', name: 'Sword', fbxFile: 'Sword.fbx',
    slot: 'mainhand', grip: 'one_hand',
    positionOffset: new THREE.Vector3(0, 0, 0),
    rotationOffset: new THREE.Euler(0, 0, 0),
    scale: 1.0, attachBone: 'RightHand',
  },
  Sword_1: {
    modelKey: 'Sword_1', name: 'Broad Sword', fbxFile: 'Sword_1.fbx',
    slot: 'mainhand', grip: 'one_hand',
    positionOffset: new THREE.Vector3(0, 0, 0),
    rotationOffset: new THREE.Euler(0, 0, 0),
    scale: 1.0, attachBone: 'RightHand',
  },
  // ── Long Swords (two-hand) ──
  LongSword: {
    modelKey: 'LongSword', name: 'Long Sword', fbxFile: 'LongSword.fbx',
    slot: 'mainhand', grip: 'two_hand',
    positionOffset: new THREE.Vector3(0, 0, 0),
    rotationOffset: new THREE.Euler(0, 0, 0),
    scale: 1.0, attachBone: 'RightHand',
  },
  LongSword_1: {
    modelKey: 'LongSword_1', name: 'Great Sword', fbxFile: 'LongSword_1.fbx',
    slot: 'mainhand', grip: 'two_hand',
    positionOffset: new THREE.Vector3(0, 0, 0),
    rotationOffset: new THREE.Euler(0, 0, 0),
    scale: 1.0, attachBone: 'RightHand',
  },
  LongSword_2: {
    modelKey: 'LongSword_2', name: 'Claymore', fbxFile: 'LongSword_2.fbx',
    slot: 'mainhand', grip: 'two_hand',
    positionOffset: new THREE.Vector3(0, 0, 0),
    rotationOffset: new THREE.Euler(0, 0, 0),
    scale: 1.0, attachBone: 'RightHand',
  },
  // ── Knives ──
  Knife: {
    modelKey: 'Knife', name: 'Knife', fbxFile: 'Knife.fbx',
    slot: 'mainhand', grip: 'one_hand',
    positionOffset: new THREE.Vector3(0, 0, 0),
    rotationOffset: new THREE.Euler(0, 0, 0),
    scale: 1.0, attachBone: 'RightHand',
  },
  Knife_1: {
    modelKey: 'Knife_1', name: 'Dagger', fbxFile: 'Knife_1.fbx',
    slot: 'mainhand', grip: 'one_hand',
    positionOffset: new THREE.Vector3(0, 0, 0),
    rotationOffset: new THREE.Euler(0, 0, 0),
    scale: 1.0, attachBone: 'RightHand',
  },
  // ── Spears (two-hand) ──
  Spear: {
    modelKey: 'Spear', name: 'Spear', fbxFile: 'Spear.fbx',
    slot: 'mainhand', grip: 'two_hand',
    positionOffset: new THREE.Vector3(0, 0, 0),
    rotationOffset: new THREE.Euler(0, 0, 0),
    scale: 1.0, attachBone: 'RightHand',
  },
  Spear_1: {
    modelKey: 'Spear_1', name: 'Halberd', fbxFile: 'Spear_1.fbx',
    slot: 'mainhand', grip: 'two_hand',
    positionOffset: new THREE.Vector3(0, 0, 0),
    rotationOffset: new THREE.Euler(0, 0, 0),
    scale: 1.0, attachBone: 'RightHand',
  },
  // ── Shields (off-hand) ──
  Shield: {
    modelKey: 'Shield', name: 'Round Shield', fbxFile: 'Shield.fbx',
    slot: 'offhand', grip: 'off_hand',
    positionOffset: new THREE.Vector3(0, 0, 0),
    rotationOffset: new THREE.Euler(0, 0, 0),
    scale: 1.0, attachBone: 'LeftHand',
  },
  Shield_1: {
    modelKey: 'Shield_1', name: 'Kite Shield', fbxFile: 'Shield_1.fbx',
    slot: 'offhand', grip: 'off_hand',
    positionOffset: new THREE.Vector3(0, 0, 0),
    rotationOffset: new THREE.Euler(0, 0, 0),
    scale: 1.0, attachBone: 'LeftHand',
  },
  Shield_2: {
    modelKey: 'Shield_2', name: 'Tower Shield', fbxFile: 'Shield_2.fbx',
    slot: 'offhand', grip: 'off_hand',
    positionOffset: new THREE.Vector3(0, 0, 0),
    rotationOffset: new THREE.Euler(0, 0, 0),
    scale: 1.0, attachBone: 'LeftHand',
  },
  // ── Bows (two-hand, left-hand hold) ──
  LongBow: {
    modelKey: 'LongBow', name: 'Long Bow', fbxFile: 'LongBow.fbx',
    slot: 'mainhand', grip: 'two_hand',
    positionOffset: new THREE.Vector3(0, 0, 0),
    rotationOffset: new THREE.Euler(0, 0, 0),
    scale: 1.0, attachBone: 'LeftHand',
  },
  BowRope: {
    modelKey: 'BowRope', name: 'Bow String', fbxFile: 'BowRope.fbx',
    slot: 'offhand', grip: 'off_hand',
    positionOffset: new THREE.Vector3(0, 0, 0),
    rotationOffset: new THREE.Euler(0, 0, 0),
    scale: 1.0, attachBone: 'LeftHand',
  },
  BowRope_1: {
    modelKey: 'BowRope_1', name: 'Bow String Alt', fbxFile: 'BowRope_1.fbx',
    slot: 'offhand', grip: 'off_hand',
    positionOffset: new THREE.Vector3(0, 0, 0),
    rotationOffset: new THREE.Euler(0, 0, 0),
    scale: 1.0, attachBone: 'LeftHand',
  },
  // ── Arrows (right hand for draw) ──
  Arrow: {
    modelKey: 'Arrow', name: 'Arrow', fbxFile: 'Arrow.fbx',
    slot: 'offhand', grip: 'off_hand',
    positionOffset: new THREE.Vector3(0, 0, 0),
    rotationOffset: new THREE.Euler(0, 0, 0),
    scale: 1.0, attachBone: 'RightHand',
  },
  Arrow_1: {
    modelKey: 'Arrow_1', name: 'Fire Arrow', fbxFile: 'Arrow_1.fbx',
    slot: 'offhand', grip: 'off_hand',
    positionOffset: new THREE.Vector3(0, 0, 0),
    rotationOffset: new THREE.Euler(0, 0, 0),
    scale: 1.0, attachBone: 'RightHand',
  },
  Arrow_2: {
    modelKey: 'Arrow_2', name: 'Ice Arrow', fbxFile: 'Arrow_2.fbx',
    slot: 'offhand', grip: 'off_hand',
    positionOffset: new THREE.Vector3(0, 0, 0),
    rotationOffset: new THREE.Euler(0, 0, 0),
    scale: 1.0, attachBone: 'RightHand',
  },
  // ── Magic (staffs, books) ──
  MagicCane: {
    modelKey: 'MagicCane', name: 'Staff', fbxFile: 'MagicCane.fbx',
    slot: 'mainhand', grip: 'two_hand',
    positionOffset: new THREE.Vector3(0, 0, 0),
    rotationOffset: new THREE.Euler(0, 0, 0),
    scale: 1.0, attachBone: 'RightHand',
  },
  MagicCane_1: {
    modelKey: 'MagicCane_1', name: 'Wand', fbxFile: 'MagicCane_1.fbx',
    slot: 'mainhand', grip: 'one_hand',
    positionOffset: new THREE.Vector3(0, 0, 0),
    rotationOffset: new THREE.Euler(0, 0, 0),
    scale: 1.0, attachBone: 'RightHand',
  },
  SpellBook: {
    modelKey: 'SpellBook', name: 'Spell Book', fbxFile: 'SpellBook.fbx',
    slot: 'offhand', grip: 'off_hand',
    positionOffset: new THREE.Vector3(0, 0, 0),
    rotationOffset: new THREE.Euler(0, 0, 0),
    scale: 1.0, attachBone: 'LeftHand',
  },
};

// ── Loader ─────────────────────────────────────────────────────

const WEAPON_PATH = '/assets/models/voxel-rpg/Content/Weapons/';
const fbxLoader = new FBXLoader();
const textureLoader = new THREE.TextureLoader();
const weaponCache = new Map<string, THREE.Group>();
let weaponPaletteCache: THREE.Texture | null = null;

function loadWeaponPalette(): Promise<THREE.Texture> {
  if (weaponPaletteCache) return Promise.resolve(weaponPaletteCache);
  const palettePath = '/assets/models/voxel-rpg/Content/Textures/DungeonCrawler_Character.png';
  return new Promise((resolve) => {
    textureLoader.load(palettePath, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      weaponPaletteCache = tex;
      resolve(tex);
    }, undefined, () => {
      // Fallback solid color
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 1;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#888888';
      ctx.fillRect(0, 0, 256, 1);
      const fb = new THREE.CanvasTexture(canvas);
      fb.magFilter = THREE.NearestFilter;
      weaponPaletteCache = fb;
      resolve(fb);
    });
  });
}

async function loadWeaponModel(modelKey: string): Promise<THREE.Group> {
  const def = WEAPON_MODELS[modelKey];
  if (!def) throw new Error(`Weapon model "${modelKey}" not found`);

  if (weaponCache.has(modelKey)) {
    return weaponCache.get(modelKey)!.clone();
  }

  const palette = await loadWeaponPalette();
  const group = await new Promise<THREE.Group>((resolve, reject) => {
    fbxLoader.load(WEAPON_PATH + def.fbxFile, (fbx) => {
      // Apply palette texture to weapon meshes
      fbx.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true;
          const mat = (child as THREE.Mesh).material;
          const applyPalette = (m: THREE.Material) => {
            // FBXLoader typically produces MeshPhongMaterial for weapons.
            // Only assign a diffuse map to materials that are known to support it.
            if (
              (m as THREE.MeshStandardMaterial).isMeshStandardMaterial ||
              (m as THREE.MeshPhongMaterial).isMeshPhongMaterial
            ) {
              (m as THREE.MeshStandardMaterial | THREE.MeshPhongMaterial).map = palette;
            }
            // `needsUpdate` exists on the base Material type.
            m.needsUpdate = true;
          };
          if (Array.isArray(mat)) mat.forEach(applyPalette);
          else applyPalette(mat);
        }
      });
      weaponCache.set(modelKey, fbx);
      resolve(fbx.clone());
    }, undefined, reject);
  });

  return group;
}

// ── Attachment State ───────────────────────────────────────────

interface AttachedWeapon {
  modelKey: string;
  group: THREE.Group;
  bone: THREE.Bone;
  slot: WeaponSlot;
}

/** Tracks attached weapons per character (keyed by character group uuid) */
const attachments = new Map<string, AttachedWeapon[]>();

// ── Public API ─────────────────────────────────────────────────

/**
 * Attach a weapon model to a character's hand bone.
 * Automatically removes any existing weapon in that slot first.
 */
export async function attachWeapon(
  character: CharacterInstance,
  modelKey: string,
): Promise<void> {
  const def = WEAPON_MODELS[modelKey];
  if (!def) return;

  const bone = character.getBone(def.attachBone);
  if (!bone) {
    console.warn(`[weapon-attach] Bone "${def.attachBone}" not found on character`);
    return;
  }

  // Remove existing weapon in this slot
  detachSlot(character, def.slot);

  // If two-hand, also clear off-hand
  if (def.grip === 'two_hand') {
    detachSlot(character, 'offhand');
  }

  // Load and attach
  const weaponGroup = await loadWeaponModel(modelKey);

  // Apply offset transforms
  weaponGroup.position.copy(def.positionOffset);
  weaponGroup.rotation.copy(def.rotationOffset);
  weaponGroup.scale.setScalar(def.scale);

  bone.add(weaponGroup);

  // Track attachment
  const charId = character.group.uuid;
  if (!attachments.has(charId)) attachments.set(charId, []);
  attachments.get(charId)!.push({
    modelKey,
    group: weaponGroup,
    bone,
    slot: def.slot,
  });
}

/**
 * Detach all weapons from a specific slot on the character.
 */
export function detachSlot(character: CharacterInstance, slot: WeaponSlot): void {
  const charId = character.group.uuid;
  const list = attachments.get(charId);
  if (!list) return;

  const remaining: AttachedWeapon[] = [];
  for (const att of list) {
    if (att.slot === slot) {
      att.bone.remove(att.group);
      att.group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          if (Array.isArray(mesh.material)) mesh.material.forEach(m => m.dispose());
          else mesh.material.dispose();
          mesh.geometry.dispose();
        }
      });
    } else {
      remaining.push(att);
    }
  }
  attachments.set(charId, remaining);
}

/**
 * Detach all weapons from a character.
 */
export function detachAll(character: CharacterInstance): void {
  detachSlot(character, 'mainhand');
  detachSlot(character, 'offhand');
}

/**
 * Get the currently attached weapon model keys for a character.
 */
export function getAttachedWeapons(character: CharacterInstance): { mainhand?: string; offhand?: string } {
  const list = attachments.get(character.group.uuid) || [];
  const result: { mainhand?: string; offhand?: string } = {};
  for (const att of list) {
    result[att.slot] = att.modelKey;
  }
  return result;
}

// ── Class → Starting Weapon Mapping ────────────────────────────

/**
 * Maps character class to default starting weapons.
 * Used during character creation to preview the correct weapon.
 */
export const CLASS_STARTING_WEAPONS: Record<string, { mainhand: string; offhand?: string }> = {
  Warrior: { mainhand: 'Sword', offhand: 'Shield' },
  Mage:    { mainhand: 'MagicCane', offhand: 'SpellBook' },
  Ranger:  { mainhand: 'LongBow' },
  Worge:   { mainhand: 'Spear' },
};

/**
 * Equip the starting weapons for a class on a character.
 */
export async function equipClassStartingWeapons(
  character: CharacterInstance,
  className: string,
): Promise<void> {
  const loadout = CLASS_STARTING_WEAPONS[className];
  if (!loadout) return;

  detachAll(character);
  await attachWeapon(character, loadout.mainhand);
  if (loadout.offhand) {
    await attachWeapon(character, loadout.offhand);
  }
}

/** Get all weapon model keys */
export function getWeaponModelKeys(): string[] {
  return Object.keys(WEAPON_MODELS);
}

/** Get weapon models for a specific slot */
export function getWeaponModelsForSlot(slot: WeaponSlot): WeaponModelDef[] {
  return Object.values(WEAPON_MODELS).filter(w => w.slot === slot);
}
