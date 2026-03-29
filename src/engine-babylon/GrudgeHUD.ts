/**
 * GrudgeHUD — In-game HUD using Babylon.js GUI.
 *
 * Mirrors t5c UserInterface: health/mana bars, ability hotbar,
 * entity nameplates, debug info panel.
 */

import { Scene } from '@babylonjs/core/scene';
import { AdvancedDynamicTexture } from '@babylonjs/gui/2D/advancedDynamicTexture';
import { Rectangle } from '@babylonjs/gui/2D/controls/rectangle';
import { TextBlock } from '@babylonjs/gui/2D/controls/textBlock';
import { StackPanel } from '@babylonjs/gui/2D/controls/stackPanel';
import { Control } from '@babylonjs/gui/2D/controls/control';

const GOLD = '#c5a059';
const DARK_BG = 'rgba(10,10,26,0.85)';
const HEALTH_COLOR = '#ef5350';
const MANA_COLOR = '#42a5f5';
const XP_COLOR = '#66bb6a';

export class GrudgeHUD {
  public advancedTexture: AdvancedDynamicTexture;

  // Health / Mana bars
  private _healthBar: Rectangle;
  private _healthFill: Rectangle;
  private _manaBar: Rectangle;
  private _manaFill: Rectangle;
  private _healthText: TextBlock;
  private _manaText: TextBlock;

  // Hotbar
  private _hotbarSlots: Rectangle[] = [];

  // Debug
  private _debugText: TextBlock;

  // Title
  private _titleText: TextBlock;

  constructor(scene: Scene) {
    this.advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI('grudgeHUD', true, scene);

    this._createTitle();
    this._createHealthMana();
    this._createHotbar();
    this._createDebugPanel();
  }

  // ── Title ──────────────────────────────────────────────────
  private _createTitle(): void {
    this._titleText = new TextBlock('title', 'GRUDGE ENGINE');
    this._titleText.color = GOLD;
    this._titleText.fontSize = 14;
    this._titleText.fontFamily = "'Oxanium', sans-serif";
    this._titleText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this._titleText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this._titleText.left = 12;
    this._titleText.top = 8;
    this.advancedTexture.addControl(this._titleText);
  }

  // ── Health & Mana Bars ─────────────────────────────────────
  private _createHealthMana(): void {
    const panel = new StackPanel('statBars');
    panel.isVertical = true;
    panel.width = '220px';
    panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    panel.left = 12;
    panel.top = 30;
    this.advancedTexture.addControl(panel);

    // Health
    const { bar: hBar, fill: hFill, text: hText } = this._createBar('HP', HEALTH_COLOR, 22);
    this._healthBar = hBar;
    this._healthFill = hFill;
    this._healthText = hText;
    panel.addControl(hBar);

    // Mana
    const { bar: mBar, fill: mFill, text: mText } = this._createBar('MP', MANA_COLOR, 18);
    this._manaBar = mBar;
    this._manaFill = mFill;
    this._manaText = mText;
    panel.addControl(mBar);
  }

  private _createBar(label: string, color: string, height: number) {
    const bar = new Rectangle(`${label}_bar`);
    bar.width = '220px';
    bar.height = `${height}px`;
    bar.cornerRadius = 4;
    bar.color = 'rgba(255,255,255,0.15)';
    bar.thickness = 1;
    bar.background = 'rgba(0,0,0,0.6)';
    bar.paddingBottom = '2px';

    const fill = new Rectangle(`${label}_fill`);
    fill.width = 1;
    fill.height = 1;
    fill.background = color;
    fill.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    fill.thickness = 0;
    fill.cornerRadius = 3;
    bar.addControl(fill);

    const text = new TextBlock(`${label}_text`, `${label}: 100/100`);
    text.color = '#fff';
    text.fontSize = height - 8;
    text.fontFamily = "'Oxanium', sans-serif";
    bar.addControl(text);

    return { bar, fill, text };
  }

  // ── Ability Hotbar ─────────────────────────────────────────
  private _createHotbar(): void {
    const panel = new StackPanel('hotbar');
    panel.isVertical = false;
    panel.height = '48px';
    panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    panel.top = -16;
    this.advancedTexture.addControl(panel);

    const abilityNames = ['Slash', 'Fireball', 'Heal', 'Buff', '', 'Potion', 'Food', 'Relic'];
    for (let i = 0; i < 8; i++) {
      const slot = new Rectangle(`hotbar_${i}`);
      slot.width = '44px';
      slot.height = '44px';
      slot.cornerRadius = 6;
      slot.color = i === 4 ? 'transparent' : `${GOLD}60`;
      slot.thickness = i === 4 ? 0 : 1;
      slot.background = i === 4 ? 'transparent' : DARK_BG;
      slot.paddingLeft = '2px';
      slot.paddingRight = '2px';

      if (i !== 4 && abilityNames[i]) {
        const num = new TextBlock(`slot_num_${i}`, `${i < 4 ? i + 1 : i + 2}`);
        num.color = '#666';
        num.fontSize = 9;
        num.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        num.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        num.left = 3;
        num.top = 2;
        slot.addControl(num);

        const label = new TextBlock(`slot_label_${i}`, abilityNames[i]);
        label.color = '#aaa';
        label.fontSize = 10;
        label.fontFamily = "'Oxanium', sans-serif";
        slot.addControl(label);
      }

      panel.addControl(slot);
      this._hotbarSlots.push(slot);
    }
  }

  // ── Debug Panel ────────────────────────────────────────────
  private _createDebugPanel(): void {
    this._debugText = new TextBlock('debug', '');
    this._debugText.color = '#888';
    this._debugText.fontSize = 11;
    this._debugText.fontFamily = 'monospace';
    this._debugText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    this._debugText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this._debugText.left = -8;
    this._debugText.top = 8;
    this._debugText.textWrapping = true;
    this._debugText.width = '200px';
    this.advancedTexture.addControl(this._debugText);
  }

  // ── Public Update Methods ──────────────────────────────────

  updateHealth(current: number, max: number): void {
    const pct = Math.max(0, Math.min(1, current / max));
    this._healthFill.width = pct;
    this._healthText.text = `HP: ${Math.floor(current)}/${max}`;
  }

  updateMana(current: number, max: number): void {
    const pct = Math.max(0, Math.min(1, current / max));
    this._manaFill.width = pct;
    this._manaText.text = `MP: ${Math.floor(current)}/${max}`;
  }

  updateDebug(fps: number, entityCount: number, extra?: string): void {
    let text = `FPS: ${Math.floor(fps)}\nEntities: ${entityCount}`;
    if (extra) text += `\n${extra}`;
    this._debugText.text = text;
  }

  highlightSlot(index: number): void {
    this._hotbarSlots.forEach((slot, i) => {
      slot.color = i === index ? GOLD : `${GOLD}60`;
      slot.thickness = i === index ? 2 : 1;
    });
  }

  dispose(): void {
    this.advancedTexture.dispose();
  }
}
