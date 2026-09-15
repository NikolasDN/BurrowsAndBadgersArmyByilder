export interface RosterSelection {
  instanceId: string;
  entryId: string;
  groupId: string;
  name: string;
  children: RosterSelection[];
}

export interface RosterModel {
  instanceId: string;
  entryId: string;
  name: string;
  species: string;
  fate: number;
  exp: number;
  selections: RosterSelection[];
}

export interface Warband {
  id: string;
  name: string;
  factionId: string;
  factionName: string;
  allegianceEntryId: string;
  archetype: string;
  notes: string;
  treasury: number;
  labour: number;
  materials: number;
  pension: number;
  pennyLimit: number;
  stashedEquipment: string;
  denUpgradeIds: string[];
  models: RosterModel[];
  updatedAt: string;
}

export interface UnitStats {
  Movement: string;
  Strike: string;
  Block: string;
  Ranged: string;
  Nimbleness: string;
  Concealment: string;
  Awareness: string;
  Fortitude: string;
  Presence: string;
  Level: string;
}

export const EMPTY_STATS: UnitStats = {
  Movement: '',
  Strike: '',
  Block: '',
  Ranged: '',
  Nimbleness: '',
  Concealment: '',
  Awareness: '',
  Fortitude: '',
  Presence: '',
  Level: '',
};

export const STORAGE_KEY = 'bb-warbands-v1';
