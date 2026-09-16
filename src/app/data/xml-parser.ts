import {
  BsCatalogueSummary,
  BsCategory,
  BsCategoryLink,
  BsCondition,
  BsConditionGroup,
  BsConstraint,
  BsCost,
  BsCostType,
  BsEntryLink,
  BsFaction,
  BsInfoLink,
  BsModifier,
  BsProfile,
  BsRule,
  BsSelectionEntry,
  BsSelectionEntryGroup,
  CatalogueIndex,
  CHARACTER_GROUP_ID,
} from '../models/battlescribe';

function localName(el: Element): string {
  return el.localName || el.nodeName.replace(/^.*:/, '');
}

function kids(el: Element, name: string): Element[] {
  return Array.from(el.children).filter((c) => localName(c) === name);
}

function kid(el: Element, name: string): Element | undefined {
  return kids(el, name)[0];
}

function attr(el: Element, name: string, fallback = ''): string {
  return el.getAttribute(name) ?? fallback;
}

function boolAttr(el: Element, name: string, fallback = false): boolean {
  const v = el.getAttribute(name);
  if (v == null) {
    return fallback;
  }
  return v === 'true';
}

function numAttr(el: Element, name: string, fallback = 0): number {
  const v = el.getAttribute(name);
  if (v == null || v === '') {
    return fallback;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function parseCosts(el: Element): BsCost[] {
  const wrap = kid(el, 'costs');
  if (!wrap) {
    return [];
  }
  return kids(wrap, 'cost').map((c) => ({
    name: attr(c, 'name'),
    typeId: attr(c, 'typeId'),
    value: numAttr(c, 'value'),
  }));
}

function parseConstraints(el: Element): BsConstraint[] {
  const wrap = kid(el, 'constraints');
  if (!wrap) {
    return [];
  }
  return kids(wrap, 'constraint').map((c) => ({
    id: attr(c, 'id'),
    type: attr(c, 'type') === 'min' ? 'min' : 'max',
    value: numAttr(c, 'value'),
    field: attr(c, 'field'),
    scope: attr(c, 'scope'),
    shared: boolAttr(c, 'shared', true),
    includeChildSelections: boolAttr(c, 'includeChildSelections'),
    includeChildForces: boolAttr(c, 'includeChildForces'),
    childId: c.getAttribute('childId') || undefined,
  }));
}

function parseCharacteristics(el: Element): { name: string; typeId: string; value: string }[] {
  const wrap = kid(el, 'characteristics');
  if (!wrap) {
    return [];
  }
  return kids(wrap, 'characteristic').map((c) => ({
    name: attr(c, 'name'),
    typeId: attr(c, 'typeId'),
    value: (c.textContent || '').trim(),
  }));
}

function parseProfile(el: Element): BsProfile {
  return {
    id: attr(el, 'id'),
    name: attr(el, 'name'),
    hidden: boolAttr(el, 'hidden'),
    typeId: attr(el, 'typeId'),
    typeName: attr(el, 'typeName'),
    characteristics: parseCharacteristics(el),
  };
}

function parseRule(el: Element): BsRule {
  const desc = kid(el, 'description');
  return {
    id: attr(el, 'id'),
    name: attr(el, 'name'),
    hidden: boolAttr(el, 'hidden'),
    description: (desc?.textContent || '').trim(),
  };
}

function parseInfoLinks(el: Element): BsInfoLink[] {
  const wrap = kid(el, 'infoLinks');
  if (!wrap) {
    return [];
  }
  return kids(wrap, 'infoLink').map((c) => ({
    id: attr(c, 'id'),
    name: attr(c, 'name'),
    hidden: boolAttr(c, 'hidden'),
    type: attr(c, 'type'),
    targetId: attr(c, 'targetId'),
    modifiers: parseModifiers(c),
  }));
}

function parseCategoryLinks(el: Element): BsCategoryLink[] {
  const wrap = kid(el, 'categoryLinks');
  if (!wrap) {
    return [];
  }
  return kids(wrap, 'categoryLink').map((c) => ({
    id: attr(c, 'id'),
    name: attr(c, 'name'),
    hidden: boolAttr(c, 'hidden'),
    targetId: attr(c, 'targetId'),
    primary: boolAttr(c, 'primary'),
  }));
}

function parseConditions(el: Element): BsCondition[] {
  const wrap = kid(el, 'conditions');
  if (!wrap) {
    return [];
  }
  return kids(wrap, 'condition').map((c) => ({
    type: attr(c, 'type'),
    value: attr(c, 'value'),
    field: attr(c, 'field'),
    scope: attr(c, 'scope'),
    childId: c.getAttribute('childId') || undefined,
    shared: boolAttr(c, 'shared', true),
    includeChildSelections: boolAttr(c, 'includeChildSelections'),
    includeChildForces: boolAttr(c, 'includeChildForces'),
  }));
}

function parseConditionGroups(el: Element): BsConditionGroup[] {
  const wrap = kid(el, 'conditionGroups');
  if (!wrap) {
    return [];
  }
  return kids(wrap, 'conditionGroup').map((c) => ({
    type: attr(c, 'type') === 'or' ? 'or' : 'and',
    conditions: parseConditions(c),
    conditionGroups: parseConditionGroups(c),
  }));
}

function parseModifiers(el: Element): BsModifier[] {
  const wrap = kid(el, 'modifiers');
  if (!wrap) {
    return [];
  }
  return kids(wrap, 'modifier').map((c) => ({
    type: attr(c, 'type'),
    value: attr(c, 'value'),
    field: attr(c, 'field'),
    arg: c.getAttribute('arg') || undefined,
    affects: c.getAttribute('affects') || undefined,
    scope: c.getAttribute('scope') || undefined,
    conditions: parseConditions(c),
    conditionGroups: parseConditionGroups(c),
  }));
}

function parseEntryLink(el: Element, index: CatalogueIndex): BsEntryLink {
  const link: BsEntryLink = {
    id: attr(el, 'id'),
    name: attr(el, 'name'),
    hidden: boolAttr(el, 'hidden'),
    type: attr(el, 'type') === 'selectionEntryGroup' ? 'selectionEntryGroup' : 'selectionEntry',
    targetId: attr(el, 'targetId'),
    import: boolAttr(el, 'import', true),
    defaultAmount: numAttr(el, 'defaultAmount'),
    costs: parseCosts(el),
    constraints: parseConstraints(el),
    selectionEntries: [],
    selectionEntryGroups: [],
    entryLinks: [],
    modifiers: parseModifiers(el),
  };
  const seWrap = kid(el, 'selectionEntries');
  if (seWrap) {
    link.selectionEntries = kids(seWrap, 'selectionEntry').map((c) => parseSelectionEntry(c, index));
  }
  const gWrap = kid(el, 'selectionEntryGroups');
  if (gWrap) {
    link.selectionEntryGroups = kids(gWrap, 'selectionEntryGroup').map((c) =>
      parseSelectionEntryGroup(c, index),
    );
  }
  const lWrap = kid(el, 'entryLinks');
  if (lWrap) {
    link.entryLinks = kids(lWrap, 'entryLink').map((c) => parseEntryLink(c, index));
  }
  return link;
}

function parseSelectionEntry(el: Element, index: CatalogueIndex): BsSelectionEntry {
  const entry: BsSelectionEntry = {
    id: attr(el, 'id'),
    name: attr(el, 'name'),
    hidden: boolAttr(el, 'hidden'),
    type: attr(el, 'type'),
    import: boolAttr(el, 'import', true),
    defaultAmount: numAttr(el, 'defaultAmount'),
    costs: parseCosts(el),
    constraints: parseConstraints(el),
    profiles: [],
    infoLinks: parseInfoLinks(el),
    categoryLinks: parseCategoryLinks(el),
    selectionEntries: [],
    selectionEntryGroups: [],
    entryLinks: [],
    rules: [],
    modifiers: parseModifiers(el),
  };
  const pWrap = kid(el, 'profiles');
  if (pWrap) {
    entry.profiles = kids(pWrap, 'profile').map(parseProfile);
    for (const p of entry.profiles) {
      index.profiles.set(p.id, p);
    }
  }
  const rWrap = kid(el, 'rules');
  if (rWrap) {
    entry.rules = kids(rWrap, 'rule').map(parseRule);
    for (const r of entry.rules) {
      index.rules.set(r.id, r);
    }
  }
  const seWrap = kid(el, 'selectionEntries');
  if (seWrap) {
    entry.selectionEntries = kids(seWrap, 'selectionEntry').map((c) => parseSelectionEntry(c, index));
  }
  const gWrap = kid(el, 'selectionEntryGroups');
  if (gWrap) {
    entry.selectionEntryGroups = kids(gWrap, 'selectionEntryGroup').map((c) =>
      parseSelectionEntryGroup(c, index),
    );
  }
  const lWrap = kid(el, 'entryLinks');
  if (lWrap) {
    entry.entryLinks = kids(lWrap, 'entryLink').map((c) => parseEntryLink(c, index));
  }
  index.entries.set(entry.id, entry);
  return entry;
}

function parseSelectionEntryGroup(el: Element, index: CatalogueIndex): BsSelectionEntryGroup {
  const group: BsSelectionEntryGroup = {
    id: attr(el, 'id'),
    name: attr(el, 'name'),
    hidden: boolAttr(el, 'hidden'),
    defaultSelectionEntryId: el.getAttribute('defaultSelectionEntryId') || undefined,
    constraints: parseConstraints(el),
    selectionEntries: [],
    selectionEntryGroups: [],
    entryLinks: [],
    modifiers: parseModifiers(el),
  };
  const seWrap = kid(el, 'selectionEntries');
  if (seWrap) {
    group.selectionEntries = kids(seWrap, 'selectionEntry').map((c) => parseSelectionEntry(c, index));
  }
  const gWrap = kid(el, 'selectionEntryGroups');
  if (gWrap) {
    group.selectionEntryGroups = kids(gWrap, 'selectionEntryGroup').map((c) =>
      parseSelectionEntryGroup(c, index),
    );
  }
  const lWrap = kid(el, 'entryLinks');
  if (lWrap) {
    group.entryLinks = kids(lWrap, 'entryLink').map((c) => parseEntryLink(c, index));
  }
  index.groups.set(group.id, group);
  return group;
}

function ingestContainer(root: Element, index: CatalogueIndex): void {
  const catWrap = kid(root, 'categoryEntries');
  if (catWrap) {
    for (const c of kids(catWrap, 'categoryEntry')) {
      const cat: BsCategory = { id: attr(c, 'id'), name: attr(c, 'name') };
      index.categories.set(cat.id, cat);
    }
  }
  const costWrap = kid(root, 'costTypes');
  if (costWrap) {
    index.costTypes = kids(costWrap, 'costType').map((c) => ({
      id: attr(c, 'id'),
      name: attr(c, 'name'),
      defaultCostLimit: numAttr(c, 'defaultCostLimit'),
      hidden: boolAttr(c, 'hidden'),
    }));
  }
  const sharedRules = kid(root, 'sharedRules') ?? kid(root, 'rules');
  if (sharedRules) {
    for (const r of kids(sharedRules, 'rule')) {
      const rule = parseRule(r);
      index.rules.set(rule.id, rule);
    }
  }
  const sharedProfiles = kid(root, 'sharedProfiles');
  if (sharedProfiles) {
    for (const p of kids(sharedProfiles, 'profile')) {
      const profile = parseProfile(p);
      index.profiles.set(profile.id, profile);
    }
  }
  const sharedEntries = kid(root, 'sharedSelectionEntries');
  if (sharedEntries) {
    for (const e of kids(sharedEntries, 'selectionEntry')) {
      parseSelectionEntry(e, index);
    }
  }
  const sharedGroups = kid(root, 'sharedSelectionEntryGroups');
  if (sharedGroups) {
    for (const g of kids(sharedGroups, 'selectionEntryGroup')) {
      parseSelectionEntryGroup(g, index);
    }
  }
  const topEntries = kid(root, 'selectionEntries');
  if (topEntries) {
    for (const e of kids(topEntries, 'selectionEntry')) {
      parseSelectionEntry(e, index);
    }
  }
  const links = kid(root, 'entryLinks');
  if (links) {
    for (const l of kids(links, 'entryLink')) {
      parseEntryLink(l, index);
    }
  }
}

function emptyIndex(): CatalogueIndex {
  return {
    gameSystemName: '',
    gameSystemId: '',
    costTypes: [],
    categories: new Map(),
    entries: new Map(),
    groups: new Map(),
    profiles: new Map(),
    rules: new Map(),
    factions: [],
    models: [],
    denUpgrades: [],
    characterGroupId: CHARACTER_GROUP_ID,
  };
}

export function parseXmlDocument(xml: string): Document {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const err = doc.querySelector('parsererror');
  if (err) {
    throw new Error(err.textContent || 'XML parse error');
  }
  return doc;
}

export function parseGameSystem(xml: string, index = emptyIndex()): CatalogueIndex {
  const doc = parseXmlDocument(xml);
  const root = doc.documentElement;
  index.gameSystemName = attr(root, 'name');
  index.gameSystemId = attr(root, 'id');
  ingestContainer(root, index);
  return index;
}

export function parseCatalogue(xml: string, index: CatalogueIndex): BsCatalogueSummary {
  const doc = parseXmlDocument(xml);
  const root = doc.documentElement;
  const summary: BsCatalogueSummary = {
    id: attr(root, 'id'),
    name: attr(root, 'name'),
    library: boolAttr(root, 'library'),
    gameSystemId: attr(root, 'gameSystemId'),
  };
  ingestContainer(root, index);

  if (!summary.library) {
    let allegianceId = '';
    const all = Array.from(root.getElementsByTagName('*'));
    for (const el of all) {
      if (
        localName(el) === 'selectionEntry' &&
        attr(el, 'name').toLowerCase().startsWith('allegiance:')
      ) {
        allegianceId = attr(el, 'id');
        break;
      }
    }
    const allegiance = allegianceId ? index.entries.get(allegianceId) : undefined;
    const rules: BsRule[] = [];
    const seen = new Set<string>();
    if (allegiance) {
      for (const link of allegiance.infoLinks) {
        const rule = index.rules.get(link.targetId);
        if (rule && !seen.has(rule.id)) {
          seen.add(rule.id);
          rules.push(rule);
        }
      }
      for (const rule of allegiance.rules) {
        if (!seen.has(rule.id)) {
          seen.add(rule.id);
          rules.push(rule);
        }
      }
    }
    const faction: BsFaction = {
      id: summary.id,
      name: summary.name,
      allegianceEntryId: allegiance?.id ?? '',
      rules,
      catalogue: summary,
    };
    if (!index.factions.some((f) => f.id === faction.id)) {
      index.factions.push(faction);
    }
  }
  return summary;
}

export function finalizeIndex(index: CatalogueIndex): CatalogueIndex {
  index.models = [...index.entries.values()]
    .filter((e) => e.type === 'model')
    .sort((a, b) => a.name.localeCompare(b.name));
  index.denUpgrades = [...index.entries.values()]
    .filter((e) => e.categoryLinks.some((c) => c.name === 'Den Upgrade'))
    .sort((a, b) => a.name.localeCompare(b.name));
  index.factions.sort((a, b) => a.name.localeCompare(b.name));
  return index;
}

export function pennyCost(entry: { costs: BsCost[] }): number {
  return entry.costs.find((c) => c.name === 'Penny')?.value ?? 0;
}

export function laborCost(entry: { costs: BsCost[] }): number {
  return entry.costs.find((c) => c.name === 'Labor')?.value ?? 0;
}

export function materialCost(entry: { costs: BsCost[] }): number {
  return entry.costs.find((c) => c.name === 'Material')?.value ?? 0;
}

export function primaryCategory(entry: BsSelectionEntry): string {
  const primary = entry.categoryLinks.find((c) => c.primary);
  return primary?.name || entry.categoryLinks[0]?.name || '';
}
