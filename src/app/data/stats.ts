import {
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

export function equipmentBuckets(
  index: CatalogueIndex,
  model: RosterModel,
): { weapons: string[]; armour: string[]; items: string[]; special: string[]; skills: string[] } {
  const weapons: string[] = [];
  const armour: string[] = [];
  const items: string[] = [];
  const special: string[] = [];
  const skills: string[] = [];

  const visit = (sels: RosterSelection[], groupName: string) => {
    for (const sel of sels) {
      const group = index.groups.get(sel.groupId);
      const name = group?.name || groupName;
      const lower = name.toLowerCase();
      if (lower.includes('weapon slot')) {
        weapons.push(sel.name);
      } else if (lower.includes('armor slot') || lower.includes('armour slot')) {
        armour.push(sel.name);
      } else if (lower.includes('items slot') || lower === 'items' || lower.includes('bonded')) {
        items.push(sel.name);
      } else if (lower.includes('special slot')) {
        special.push(sel.name);
      } else if (
        lower.includes('skill') ||
        lower.includes('spell') ||
        lower.includes('magic') ||
        lower.includes('injury') ||
        lower === 'rank' ||
        lower.includes('innate')
      ) {
        if (!['equipment', 'weapon slots', 'armor slots', 'items slot', 'special slot'].includes(lower)) {
          skills.push(sel.name);
        }
      }
      visit(sel.children, name);
    }
  };
  visit(model.selections, '');
  return { weapons, armour, items, special, skills };
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
