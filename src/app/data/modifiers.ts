import {
  BsCondition,
  BsConditionGroup,
  BsModifier,
  BsSelectionEntry,
  BsSelectionEntryGroup,
} from '../models/battlescribe';
import { RosterModel, RosterSelection, Warband } from '../models/roster';

export interface EvalContext {
  warband: Warband;
  model?: RosterModel;
  siblingEntryIds?: string[];
  /** Extra roster ids that count as selected, e.g. allegiance entryLink ids. */
  extraRosterIds?: string[];
}

function walkSelections(sels: RosterSelection[]): string[] {
  const ids: string[] = [];
  for (const s of sels) {
    ids.push(s.entryId);
    ids.push(...walkSelections(s.children));
  }
  return ids;
}

export function allEntryIds(warband: Warband, model?: RosterModel, extraRosterIds: string[] = []): {
  roster: string[];
  root: string[];
} {
  const roster: string[] = [warband.allegianceEntryId];
  for (const id of extraRosterIds) {
    if (id && id !== warband.allegianceEntryId) {
      roster.push(id);
    }
  }
  roster.push(...warband.denUpgradeIds);
  for (const m of warband.models) {
    roster.push(m.entryId);
    roster.push(...walkSelections(m.selections));
  }
  const root = model ? [model.entryId, ...walkSelections(model.selections)] : [];
  return { roster, root };
}

function count(ids: string[], childId: string): number {
  return ids.filter((id) => id === childId).length;
}

function evalCondition(cond: BsCondition, ctx: EvalContext): boolean {
  const ids = allEntryIds(ctx.warband, ctx.model, ctx.extraRosterIds);
  let n = 0;
  const scope = cond.scope;
  if (scope === 'roster' || scope === 'force') {
    n = count(ids.roster, cond.childId || '');
  } else if (scope === 'root-entry') {
    n = count(ids.root, cond.childId || '');
  } else if (scope === 'parent' || scope === 'self') {
    n = count(ctx.siblingEntryIds ?? ids.root, cond.childId || '');
  } else {
    n = count(ids.roster, cond.childId || '');
  }
  const value = Number(cond.value);
  switch (cond.type) {
    case 'equalTo':
      return n === value;
    case 'atLeast':
      return n >= value;
    case 'atMost':
      return n <= value;
    case 'lessThan':
      return n < value;
    case 'greaterThan':
      return n > value;
    case 'notEqualTo':
      return n !== value;
    case 'instanceOf':
      return n >= 1;
    default:
      return false;
  }
}

function evalGroup(group: BsConditionGroup, ctx: EvalContext): boolean {
  const results = [
    ...group.conditions.map((c) => evalCondition(c, ctx)),
    ...group.conditionGroups.map((g) => evalGroup(g, ctx)),
  ];
  if (results.length === 0) {
    return true;
  }
  return group.type === 'or' ? results.some(Boolean) : results.every(Boolean);
}

export function modifierActive(mod: BsModifier, ctx: EvalContext): boolean {
  const results = [
    ...mod.conditions.map((c) => evalCondition(c, ctx)),
    ...mod.conditionGroups.map((g) => evalGroup(g, ctx)),
  ];
  if (results.length === 0) {
    return true;
  }
  return results.every(Boolean);
}

export function isHidden(
  node: { hidden: boolean; modifiers: BsModifier[] },
  ctx: EvalContext,
): boolean {
  let hidden = node.hidden;
  for (const mod of node.modifiers) {
    if (mod.field === 'hidden' && mod.type === 'set' && modifierActive(mod, ctx)) {
      hidden = mod.value === 'true';
    }
  }
  return hidden;
}

export function maxConstraint(
  node: { constraints: { type: string; field: string; value: number; scope: string }[] },
): number {
  const max = node.constraints.find((c) => c.type === 'max' && c.field === 'selections');
  return max ? max.value : Number.POSITIVE_INFINITY;
}

export function minConstraint(
  node: { constraints: { type: string; field: string; value: number; scope: string }[] },
): number {
  const min = node.constraints.find((c) => c.type === 'min' && c.field === 'selections');
  return min ? min.value : 0;
}

function isRosterScope(scope: string): boolean {
  return scope === 'roster' || scope === 'force';
}

export function selectionLimits(node: {
  constraints: { type: string; field: string; value: number; scope: string }[];
}): { local: number; roster: number } {
  let local = Number.POSITIVE_INFINITY;
  let roster = Number.POSITIVE_INFINITY;
  for (const c of node.constraints) {
    if (c.type !== 'max' || c.field !== 'selections') {
      continue;
    }
    if (isRosterScope(c.scope)) {
      roster = Math.min(roster, c.value);
    } else {
      local = Math.min(local, c.value);
    }
  }
  return { local, roster };
}

function forEachSelection(
  sels: RosterSelection[],
  includeChildren: boolean,
  visit: (sel: RosterSelection) => void,
): void {
  for (const s of sels) {
    visit(s);
    if (includeChildren) {
      forEachSelection(s.children, true, visit);
    }
  }
}

export function rosterSelectionCount(
  warband: Warband,
  match: (sel: RosterSelection) => boolean,
): number {
  let n = 0;
  for (const model of warband.models) {
    forEachSelection(model.selections, true, (sel) => {
      if (match(sel)) {
        n += 1;
      }
    });
  }
  return n;
}

export function canAddSelection(opts: {
  localCount: number;
  localMax: number;
  rosterCount: number;
  rosterMax: number;
  entryLocalCount: number;
  entryLocalMax: number;
  entryRosterCount: number;
  entryRosterMax: number;
}): { allowed: boolean; replace: boolean } {
  if (opts.entryLocalCount >= opts.entryLocalMax || opts.entryRosterCount >= opts.entryRosterMax) {
    return { allowed: false, replace: false };
  }
  if (opts.localCount < opts.localMax && opts.rosterCount < opts.rosterMax) {
    return { allowed: true, replace: false };
  }
  if (opts.localMax === 1 && opts.localCount === 1) {
    return { allowed: true, replace: true };
  }
  return { allowed: false, replace: false };
}

export function resolveEntry(
  indexEntries: Map<string, BsSelectionEntry>,
  id: string,
): BsSelectionEntry | undefined {
  return indexEntries.get(id);
}

export function resolveGroupChildren(
  group: BsSelectionEntryGroup,
  entries: Map<string, BsSelectionEntry>,
  groups: Map<string, BsSelectionEntryGroup>,
): { entries: BsSelectionEntry[]; groups: BsSelectionEntryGroup[] } {
  const resultEntries = [...group.selectionEntries];
  const resultGroups = [...group.selectionEntryGroups];
  for (const link of group.entryLinks) {
    if (link.type === 'selectionEntry') {
      const target = entries.get(link.targetId);
      if (target) {
        resultEntries.push({
          ...target,
          hidden: link.hidden || target.hidden,
          defaultAmount: link.defaultAmount || target.defaultAmount,
          selectionEntries: [...target.selectionEntries, ...link.selectionEntries],
          selectionEntryGroups: [...target.selectionEntryGroups, ...link.selectionEntryGroups],
          entryLinks: [...target.entryLinks, ...link.entryLinks],
        });
      }
    } else {
      const target = groups.get(link.targetId);
      if (target) {
        resultGroups.push({
          ...target,
          hidden: link.hidden || target.hidden,
        });
      }
    }
  }
  return { entries: resultEntries, groups: resultGroups };
}

export function groupHasVisibleOptions(
  group: BsSelectionEntryGroup,
  ctx: EvalContext,
  entries: Map<string, BsSelectionEntry>,
  groups: Map<string, BsSelectionEntryGroup>,
): boolean {
  if (isHidden(group, ctx)) {
    return false;
  }
  const resolved = resolveGroupChildren(group, entries, groups);
  if (resolved.entries.some((e) => !isHidden(e, ctx))) {
    return true;
  }
  return resolved.groups.some((g) => groupHasVisibleOptions(g, ctx, entries, groups));
}

export function resolveEntryChildren(
  entry: BsSelectionEntry,
  entries: Map<string, BsSelectionEntry>,
  groups: Map<string, BsSelectionEntryGroup>,
): { entries: BsSelectionEntry[]; groups: BsSelectionEntryGroup[] } {
  const resultEntries = [...entry.selectionEntries];
  const resultGroups = [...entry.selectionEntryGroups];
  for (const link of entry.entryLinks) {
    if (link.type === 'selectionEntry') {
      const target = entries.get(link.targetId);
      if (target) {
        resultEntries.push(target);
      }
    } else {
      const target = groups.get(link.targetId);
      if (target) {
        resultGroups.push(target);
      }
    }
  }
  return { entries: resultEntries, groups: resultGroups };
}
