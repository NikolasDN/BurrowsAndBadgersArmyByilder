export interface BsCost {
  name: string;
  typeId: string;
  value: number;
}

export interface BsConstraint {
  id: string;
  type: 'min' | 'max';
  value: number;
  field: string;
  scope: string;
  shared: boolean;
  includeChildSelections: boolean;
  includeChildForces: boolean;
  childId?: string;
}

export interface BsCharacteristic {
  name: string;
  typeId: string;
  value: string;
}

export interface BsProfile {
  id: string;
  name: string;
  hidden: boolean;
  typeId: string;
  typeName: string;
  characteristics: BsCharacteristic[];
}

export interface BsRule {
  id: string;
  name: string;
  hidden: boolean;
  description: string;
}

export interface BsInfoLink {
  id: string;
  name: string;
  hidden: boolean;
  type: string;
  targetId: string;
  modifiers: BsModifier[];
}

export interface BsCategoryLink {
  id: string;
  name: string;
  hidden: boolean;
  targetId: string;
  primary: boolean;
}

export interface BsCondition {
  type: string;
  value: string;
  field: string;
  scope: string;
  childId?: string;
  shared: boolean;
  includeChildSelections: boolean;
  includeChildForces: boolean;
}

export interface BsConditionGroup {
  type: 'and' | 'or';
  conditions: BsCondition[];
  conditionGroups: BsConditionGroup[];
}

export interface BsModifier {
  type: string;
  value: string;
  field: string;
  arg?: string;
  affects?: string;
  scope?: string;
  conditions: BsCondition[];
  conditionGroups: BsConditionGroup[];
}

export interface BsEntryLink {
  id: string;
  name: string;
  hidden: boolean;
  type: 'selectionEntry' | 'selectionEntryGroup';
  targetId: string;
  import: boolean;
  defaultAmount: number;
  costs: BsCost[];
  constraints: BsConstraint[];
  selectionEntries: BsSelectionEntry[];
  selectionEntryGroups: BsSelectionEntryGroup[];
  entryLinks: BsEntryLink[];
  modifiers: BsModifier[];
}

export interface BsSelectionEntry {
  id: string;
  name: string;
  hidden: boolean;
  type: string;
  import: boolean;
  defaultAmount: number;
  costs: BsCost[];
  constraints: BsConstraint[];
  profiles: BsProfile[];
  infoLinks: BsInfoLink[];
  categoryLinks: BsCategoryLink[];
  selectionEntries: BsSelectionEntry[];
  selectionEntryGroups: BsSelectionEntryGroup[];
  entryLinks: BsEntryLink[];
  rules: BsRule[];
  modifiers: BsModifier[];
}

export interface BsSelectionEntryGroup {
  id: string;
  name: string;
  hidden: boolean;
  defaultSelectionEntryId?: string;
  constraints: BsConstraint[];
  selectionEntries: BsSelectionEntry[];
  selectionEntryGroups: BsSelectionEntryGroup[];
  entryLinks: BsEntryLink[];
  modifiers: BsModifier[];
}

export interface BsCategory {
  id: string;
  name: string;
}

export interface BsCostType {
  id: string;
  name: string;
  defaultCostLimit: number;
  hidden: boolean;
}

export interface BsFaction {
  id: string;
  name: string;
  allegianceEntryId: string;
  rules: BsRule[];
  catalogue: BsCatalogueSummary;
}

export interface BsCatalogueSummary {
  id: string;
  name: string;
  library: boolean;
  gameSystemId: string;
}

export interface CatalogueIndex {
  gameSystemName: string;
  gameSystemId: string;
  costTypes: BsCostType[];
  categories: Map<string, BsCategory>;
  entries: Map<string, BsSelectionEntry>;
  entryLinks: Map<string, BsEntryLink>;
  groups: Map<string, BsSelectionEntryGroup>;
  profiles: Map<string, BsProfile>;
  rules: Map<string, BsRule>;
  factions: BsFaction[];
  models: BsSelectionEntry[];
  denUpgrades: BsSelectionEntry[];
  characterGroupId: string;
  /** entryLink id -> target selection entry/group id */
  entryLinkTargets: Map<string, string>;
}

export const COST_PENNY = '6752-9e0b-692e-d5b9';
export const COST_LABOR = 'a8b9-14eb-c576-28d4';
export const COST_MATERIAL = 'ce21-5b5b-f092-7301';
export const CHARACTER_GROUP_ID = '4240-559e-5c1d-4780';
export const SETUP_ONLY_ID = 'cee3-9887-9ffb-1cae';
export const UNIT_PROFILE_TYPE = '6a97-197c-e03d-8adc';

export const STAT_IDS = {
  Movement: 'e8dc-4636-129f-5901',
  Strike: '3c84-430f-dc21-e27b',
  Block: '973e-9c70-c1b0-79a7',
  Ranged: '81ac-f564-ffc1-e3fa',
  Nimbleness: '04d3-8db0-e5d0-b1a5',
  Concealment: 'd4c0-ccdb-b645-bd70',
  Awareness: 'e482-eed4-6daa-ca70',
  Fortitude: 'c395-16b3-3435-da18',
  Presence: '855b-25d5-4575-cabb',
  Level: '659a-f40f-dc29-33bf',
} as const;

export const SIZE_ORDER = [
  'Small Beast (30mm Base)',
  'Medium Beast (30mm Base)',
  'Large Beast (40mm Base)',
  'Massive Beast (50mm base)',
];
