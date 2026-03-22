/**
 * Grudge ObjectStore API Client (minimal stub for 3D project)
 * Fetches weapon skills data from the ObjectStore CDN.
 */

const BASE_URL = 'https://molochdagod.github.io/ObjectStore';

export interface OSWeaponSkillOption {
  id: string;
  name: string;
  icon: string;
  description: string;
  cooldown: number;
  manaCost: number;
  damageMultiplier?: number;
  effect?: string;
  slot: string;
  slotLabel: string;
}

export interface OSWeaponSpecific {
  slot4: OSWeaponSkillOption[];
  slot5: OSWeaponSkillOption | OSWeaponSkillOption[];
}

export interface OSWeaponTypeSkills {
  name: string;
  emoji: string;
  sharedSkills: {
    slot1: OSWeaponSkillOption[];
    slot2: OSWeaponSkillOption[];
    slot3: OSWeaponSkillOption[];
  };
  weapons: Record<string, OSWeaponSpecific>;
}

interface WeaponSkillsData {
  version: string;
  weaponTypes: Record<string, OSWeaponTypeSkills>;
}

// Cache
let _skillsData: WeaponSkillsData | null = null;

async function fetchSkills(): Promise<WeaponSkillsData | null> {
  if (_skillsData) return _skillsData;
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/weaponSkills.json`);
    if (!resp.ok) return null;
    _skillsData = await resp.json();
    return _skillsData;
  } catch {
    return null;
  }
}

export const grudgeApi = {
  async getWeaponTypeSkills(weaponType: string): Promise<OSWeaponTypeSkills | null> {
    const data = await fetchSkills();
    if (!data) return null;
    return data.weaponTypes[weaponType] || null;
  },

  async getWeaponSpecificSkills(weaponType: string, weaponId: string): Promise<OSWeaponSpecific | null> {
    const data = await fetchSkills();
    if (!data) return null;
    const typeData = data.weaponTypes[weaponType];
    if (!typeData) return null;
    return typeData.weapons[weaponId] || null;
  },
};
