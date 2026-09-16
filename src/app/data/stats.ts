import {
  BsInfoLink,
  BsModifier,
  BsSelectionEntry,
  CatalogueIndex,
  STAT_IDS,
  UNIT_PROFILE_TYPE,
} from '../models/battlescribe';
import { EMPTY_STATS, RosterModel, RosterSelection, UnitStats } from '../models/roster';
import { modifierActive, EvalContext } from './modifiers';
import { pennyCost } from './xml-parser';

function collectSelections(sels: RosterSelection[]): RosterSelection[] {
  return sels.flatMap((s) => [s, ...collectSelections(s.children)]);
}

function applyReplaceModifiers(stats: UnitStats, modifiers: BsModifier[], ctx: EvalContext): void {
  const idToStat = Object.entries(STAT_IDS) as [keyof UnitStats, string][];
  for (const mod of modifiers) {
    if (mod.type !== 'replace' || !modifierActive(mod, ctx)) {
      continue;
    }
    const match = idToStat.find(([, id]) => id === mod.field);
    if (!match) {
      continue;
    }
    const key = match[0];
    if (stats[key] === (mod.arg || '')) {
      stats[key] = mod.value;
    }
  }
}

export function computeStats(
  index: CatalogueIndex,
  model: RosterModel,
  ctx: EvalContext,
): UnitStats {
  const entry = index.entries.get(model.entryId);
  const stats: UnitStats = { ...EMPTY_STATS };
  const profile =
    entry?.profiles.find((p) => p.typeName === 'Unit' || p.typeId === UNIT_PROFILE_TYPE) ??
    [...index.profiles.values()].find((p) => p.id && p.name === entry?.name && p.typeName === 'Unit');
  if (profile) {
    for (const ch of profile.characteristics) {
      if (ch.name in stats) {
        stats[ch.name as keyof UnitStats] = ch.value;
      }
    }
  }
  const all = collectSelections(model.selections);
  for (const sel of all) {
    const selEntry = index.entries.get(sel.entryId);
    if (!selEntry) {
      continue;
    }
    applyReplaceModifiers(stats, selEntry.modifiers, ctx);
  }
  return stats;
}

export function computeModelPennies(index: CatalogueIndex, model: RosterModel): number {
  const entry = index.entries.get(model.entryId);
  let total = entry ? pennyCost(entry) : 0;
  for (const sel of collectSelections(model.selections)) {
    const selEntry = index.entries.get(sel.entryId);
    if (selEntry) {
      total += pennyCost(selEntry);
    }
  }
  return total;
}

export function computeWarbandPennies(index: CatalogueIndex, models: RosterModel[]): number {
  return models.reduce((sum, m) => sum + computeModelPennies(index, m), 0);
}

export function computeRating(index: CatalogueIndex, models: RosterModel[], ctxFactory: (m: RosterModel) => EvalContext): number {
  return models.reduce((sum, m) => {
    const level = Number(computeStats(index, m, ctxFactory(m)).Level);
    return sum + (Number.isFinite(level) ? level : 0);
  }, 0);
}

export interface RosterSkill {
  name: string;
  effect: string;
}

function tidyEffect(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function effectFromProfile(profile: { characteristics: { name: string; value: string }[] }): string {
  const preferred = profile.characteristics.find(
    (c) => c.name === 'Effect' || c.name === 'Rules' || c.name === 'Description',
  );
  if (preferred?.value) {
    return tidyEffect(preferred.value);
  }
  const bits = profile.characteristics.filter((c) => c.value).map((c) => tidyEffect(c.value));
  return bits.join(' ');
}

function effectFromLink(index: CatalogueIndex, link: BsInfoLink): string {
  const rule = index.rules.get(link.targetId);
  if (rule?.description) {
    return tidyEffect(rule.description);
  }
  const profile = index.profiles.get(link.targetId);
  return profile ? effectFromProfile(profile) : '';
}

function effectFromEntry(index: CatalogueIndex, entry: BsSelectionEntry): string {
  for (const link of entry.infoLinks) {
    const text = effectFromLink(index, link);
    if (text) {
      return text;
    }
  }
  for (const rule of entry.rules) {
    if (rule.description) {
      return tidyEffect(rule.description);
    }
  }
  for (const profile of entry.profiles) {
    if (profile.typeName === 'Unit' || profile.typeId === UNIT_PROFILE_TYPE) {
      continue;
    }
    const text = effectFromProfile(profile);
    if (text) {
      return text;
    }
  }
  return '';
}

function nameKeys(name: string): string[] {
  const keys = [name];
  const stripped = name.replace(/\s*\([^)]*\)\s*$/, '').trim();
  if (stripped && stripped !== name) {
    keys.push(stripped, `${stripped} (X)`);
  }
  return keys;
}

function effectByName(index: CatalogueIndex, name: string): string {
  const keys = new Set(nameKeys(name).map((k) => k.toLowerCase()));
  for (const rule of index.rules.values()) {
    if (keys.has(rule.name.toLowerCase()) && rule.description) {
      return tidyEffect(rule.description);
    }
  }
  for (const profile of index.profiles.values()) {
    if (keys.has(profile.name.toLowerCase())) {
      const text = effectFromProfile(profile);
      if (text) {
        return text;
      }
    }
  }
  return '';
}

function skillEffect(index: CatalogueIndex, name: string, entry?: BsSelectionEntry, link?: BsInfoLink): string {
  if (link) {
    const fromLink = effectFromLink(index, link);
    if (fromLink) {
      return fromLink;
    }
  }
  if (entry) {
    const fromEntry = effectFromEntry(index, entry);
    if (fromEntry) {
      return fromEntry;
    }
  }
  return effectByName(index, name);
}

export function printSkillLine(skill: RosterSkill): string {
  if (!skill.effect) {
    return skill.name;
  }
  return `${skill.name} (${skill.effect})`;
}

const GEAR_PROFILE_TYPES = new Set([
  'Weapon',
  'Armor',
  'Item',
  'Enchanted Item',
  'Enchanted Weapon',
  'Enchanted Armor',
]);

function usefulChar(value?: string): string {
  const text = tidyEffect(value || '');
  return !text || text === '-' ? '' : text;
}

function equipmentEffectFromProfile(profile: {
  typeName: string;
  characteristics: { name: string; value: string }[];
}): string {
  const byName = (name: string) =>
    usefulChar(profile.characteristics.find((c) => c.name === name)?.value);
  const parts: string[] = [];
  const range = byName('Range');
  if (range) {
    parts.push(`Range ${range}`);
  }
  const rules = byName('Rules') || byName('Effect') || byName('Description');
  if (rules) {
    parts.push(rules);
  }
  const keywords = byName('Keywords');
  if (keywords) {
    parts.push(keywords);
  }
  return parts.join('; ');
}

function equipmentEffect(index: CatalogueIndex, name: string, entry?: BsSelectionEntry): string {
  const fromProfile = (profile?: { typeName: string; characteristics: { name: string; value: string }[] }) => {
    if (!profile || !GEAR_PROFILE_TYPES.has(profile.typeName)) {
      return '';
    }
    return equipmentEffectFromProfile(profile);
  };
  if (entry) {
    for (const link of entry.infoLinks) {
      const text = fromProfile(index.profiles.get(link.targetId));
      if (text) {
        return text;
      }
    }
    for (const profile of entry.profiles) {
      const text = fromProfile(profile);
      if (text) {
        return text;
      }
    }
  }
  const keys = new Set(nameKeys(name).map((k) => k.toLowerCase()));
  for (const profile of index.profiles.values()) {
    if (keys.has(profile.name.toLowerCase())) {
      const text = fromProfile(profile);
      if (text) {
        return text;
      }
    }
  }
  return '';
}

export function printGearLine(item: RosterSkill): string {
  return printSkillLine(item);
}

function formatInfoLinkName(index: CatalogueIndex, link: BsInfoLink): string {
  const target = index.rules.get(link.targetId) ?? index.profiles.get(link.targetId);
  let name = link.name || target?.name || '';
  let annotation = '';
  for (const mod of link.modifiers) {
    if (mod.field === 'hidden' && mod.type === 'set' && mod.value === 'true') {
      return '';
    }
    if (mod.field === 'name') {
      if (mod.type === 'set') {
        name = mod.value;
      } else if (mod.type === 'replace' && mod.arg && name.includes(mod.arg)) {
        const replacement =
          mod.arg === '(X)' && !/^\(.*\)$/.test(mod.value) ? `(${mod.value})` : mod.value;
        name = name.split(mod.arg).join(replacement);
      }
    }
    if (mod.field === 'annotation' && mod.type === 'set' && mod.value) {
      annotation = mod.value;
    }
  }
  if (annotation && !name.includes(`(${annotation})`)) {
    name = `${name} (${annotation})`;
  }
  return name.trim();
}

export function startingSkillDetails(index: CatalogueIndex, entry: BsSelectionEntry): RosterSkill[] {
  const skills: RosterSkill[] = [];
  const seen = new Set<string>();
  for (const link of entry.infoLinks) {
    if (link.hidden) {
      continue;
    }
    const name = formatInfoLinkName(index, link);
    const key = name.toLowerCase();
    if (!name || seen.has(key)) {
      continue;
    }
    seen.add(key);
    skills.push({ name, effect: skillEffect(index, name, undefined, link) });
  }
  return skills;
}

export function startingSkills(index: CatalogueIndex, entry: BsSelectionEntry): string[] {
  return startingSkillDetails(index, entry).map((s) => s.name);
}

function pushUniqueSkill(list: RosterSkill[], seen: Set<string>, skill: RosterSkill): void {
  const key = skill.name.toLowerCase();
  if (!skill.name || seen.has(key)) {
    return;
  }
  seen.add(key);
  list.push(skill);
}

export function modelSkills(index: CatalogueIndex, model: RosterModel): RosterSkill[] {
  const skills: RosterSkill[] = [];
  const seenSkills = new Set<string>();
  const entry = index.entries.get(model.entryId);
  if (entry) {
    for (const skill of startingSkillDetails(index, entry)) {
      pushUniqueSkill(skills, seenSkills, skill);
    }
  }

  const visit = (sels: RosterSelection[], groupName: string) => {
    for (const sel of sels) {
      const group = index.groups.get(sel.groupId);
      const name = group?.name || groupName;
      const lower = name.toLowerCase();
      const isSkillGroup =
        (lower.includes('skill') ||
          lower.includes('spell') ||
          lower.includes('magic') ||
          lower.includes('injury') ||
          lower === 'rank' ||
          lower.includes('innate')) &&
        !['equipment', 'weapon slots', 'armor slots', 'items slot', 'special slot'].includes(lower);
      if (isSkillGroup) {
        const selEntry = index.entries.get(sel.entryId);
        pushUniqueSkill(skills, seenSkills, {
          name: sel.name,
          effect: skillEffect(index, sel.name, selEntry),
        });
      }
      visit(sel.children, name);
    }
  };
  visit(model.selections, '');
  return skills;
}

export function printSkillLines(index: CatalogueIndex, model: RosterModel): string[] {
  return modelSkills(index, model).map(printSkillLine);
}

function collectEquipment(
  index: CatalogueIndex,
  model: RosterModel,
): { weapons: RosterSkill[]; armour: RosterSkill[]; items: RosterSkill[]; special: RosterSkill[] } {
  const weapons: RosterSkill[] = [];
  const armour: RosterSkill[] = [];
  const items: RosterSkill[] = [];
  const special: RosterSkill[] = [];

  const visit = (sels: RosterSelection[], groupName: string) => {
    for (const sel of sels) {
      const group = index.groups.get(sel.groupId);
      const name = group?.name || groupName;
      const lower = name.toLowerCase();
      const selEntry = index.entries.get(sel.entryId);
      const gear: RosterSkill = {
        name: sel.name,
        effect: equipmentEffect(index, sel.name, selEntry),
      };
      if (lower.includes('weapon slot')) {
        weapons.push(gear);
      } else if (lower.includes('armor slot') || lower.includes('armour slot')) {
        armour.push(gear);
      } else if (lower.includes('items slot') || lower === 'items' || lower.includes('bonded')) {
        items.push(gear);
      } else if (lower.includes('special slot')) {
        special.push(gear);
      }
      visit(sel.children, name);
    }
  };
  visit(model.selections, '');
  return { weapons, armour, items, special };
}

export function equipmentBuckets(
  index: CatalogueIndex,
  model: RosterModel,
): { weapons: string[]; armour: string[]; items: string[]; special: string[]; skills: string[] } {
  const gear = collectEquipment(index, model);
  return {
    weapons: gear.weapons.map((g) => g.name),
    armour: gear.armour.map((g) => g.name),
    items: gear.items.map((g) => g.name),
    special: gear.special.map((g) => g.name),
    skills: modelSkills(index, model).map((s) => s.name),
  };
}

export function printEquipmentBuckets(
  index: CatalogueIndex,
  model: RosterModel,
): { weapons: string[]; armour: string[]; items: string[]; special: string[] } {
  const gear = collectEquipment(index, model);
  return {
    weapons: gear.weapons.map(printGearLine),
    armour: gear.armour.map(printGearLine),
    items: gear.items.map(printGearLine),
    special: gear.special.map(printGearLine),
  };
}

export function lookupProfileText(index: CatalogueIndex, entry: BsSelectionEntry): string {
  const parts: string[] = [];
  for (const p of entry.profiles) {
    const bits = p.characteristics
      .filter((c) => c.value)
      .map((c) => `${c.name}: ${c.value}`);
    if (bits.length) {
      parts.push(bits.join(' · '));
    }
  }
  for (const link of entry.infoLinks) {
    const profile = index.profiles.get(link.targetId);
    if (profile) {
      const bits = profile.characteristics
        .filter((c) => c.value)
        .map((c) => `${c.name}: ${c.value}`);
      if (bits.length) {
        parts.push(bits.join(' · '));
      }
    }
    const rule = index.rules.get(link.targetId);
    if (rule?.description) {
      parts.push(rule.description);
    }
  }
  for (const rule of entry.rules) {
    if (rule.description) {
      parts.push(rule.description);
    }
  }
  return parts.join('\n');
}
