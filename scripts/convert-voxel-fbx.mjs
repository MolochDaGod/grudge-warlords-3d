/**
 * Convert Voxel RPG Characters FBX → GLB
 * 
 * Uses Three.js FBXLoader in Node.js to load FBX, then exports as GLB via GLTFExporter.
 * Embeds the shared palette texture into each character GLB.
 * 
 * Usage: node scripts/convert-voxel-fbx.mjs
 * 
 * Requires: npm install -D three @gltf-transform/core @gltf-transform/functions
 * 
 * NOTE: Three.js FBXLoader requires jsdom or a headless GL context in Node.
 * Alternative: Use Blender command-line for batch conversion:
 *   blender --background --python scripts/fbx_to_glb.py
 * 
 * For now, this script documents the conversion pipeline.
 * The actual conversion should be done in Blender or using fbx2gltf CLI tool.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join, basename } from 'path';

const SRC_CHARS = 'public/assets/models/voxel-rpg/Content/Characters';
const SRC_WEAPONS = 'public/assets/models/voxel-rpg/Content/Weapons';
const SRC_TEXTURE = 'public/assets/models/voxel-rpg/Content/Textures/DungeonCrawler_Character.png';

const DST_CHARS = 'public/assets/models/voxel-rpg-glb/characters';
const DST_WEAPONS = 'public/assets/models/voxel-rpg-glb/weapons';

// Character name mapping: FBX filename → clean GLB name
const CHAR_NAMES = {
  'DungeonCrawler_Character.fbx': 'character_00_knight.glb',
  'DungeonCrawler_Character1.fbx': 'character_01_warrior.glb',
  'DungeonCrawler_Character2.fbx': 'character_02_rogue.glb',
  'DungeonCrawler_Character3.fbx': 'character_03_mage.glb',
  'DungeonCrawler_Character4.fbx': 'character_04_ranger.glb',
  'DungeonCrawler_Character5.fbx': 'character_05_berserker.glb',
  'DungeonCrawler_Character6.fbx': 'character_06_huntress.glb',
  'DungeonCrawler_Character7.fbx': 'character_07_valkyrie.glb',
  'DungeonCrawler_Character8.fbx': 'character_08_witch.glb',
  'DungeonCrawler_Character9.fbx': 'character_09_brute.glb',
  'DungeonCrawler_Character10.fbx': 'character_10_shadow.glb',
  'DungeonCrawler_Character11.fbx': 'character_11_shieldmaiden.glb',
};

// Ensure output dirs exist
[DST_CHARS, DST_WEAPONS].forEach(d => {
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
});

console.log('=== Voxel RPG FBX → GLB Conversion Pipeline ===\n');
console.log('Source characters:', SRC_CHARS);
console.log('Source weapons:', SRC_WEAPONS);
console.log('Palette texture:', SRC_TEXTURE);
console.log('');

// List what needs converting
console.log('Characters to convert:');
const charFiles = readdirSync(SRC_CHARS).filter(f => f.endsWith('.fbx'));
charFiles.forEach(f => {
  const glbName = CHAR_NAMES[f] || f.replace('.fbx', '.glb');
  const exists = existsSync(join(DST_CHARS, glbName));
  console.log(`  ${f} → ${glbName} ${exists ? '(DONE)' : '(PENDING)'}`);
});

console.log('\nWeapons to convert:');
const weaponFiles = readdirSync(SRC_WEAPONS).filter(f => f.endsWith('.fbx'));
weaponFiles.forEach(f => {
  const glbName = f.replace('.fbx', '.glb').toLowerCase();
  const exists = existsSync(join(DST_WEAPONS, glbName));
  console.log(`  ${f} → ${glbName} ${exists ? '(DONE)' : '(PENDING)'}`);
});

console.log(`
=== CONVERSION INSTRUCTIONS ===

Option 1: Blender CLI (recommended for quality)
  For each FBX file:
    blender --background --python-expr "
      import bpy
      bpy.ops.import_scene.fbx(filepath='INPUT.fbx')
      bpy.ops.export_scene.gltf(filepath='OUTPUT.glb', export_format='GLB')
    "

Option 2: fbx2gltf CLI (fast, no Blender needed)
  npm install -g fbx2gltf
  For each FBX:
    fbx2gltf --input INPUT.fbx --output OUTPUT.glb

Option 3: Online converter
  https://products.aspose.app/3d/conversion/fbx-to-glb

For this project, the FBX files work directly with Three.js FBXLoader.
GLB conversion is a production optimization — not blocking development.
The game can load FBX files directly during development.
`);
