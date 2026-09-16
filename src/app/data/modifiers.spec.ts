import { BsConstraint } from '../models/battlescribe';
import { RosterModel, Warband } from '../models/roster';
import { canAddSelection, rosterSelectionCount, selectionLimits } from './modifiers';

function constraint(partial: Partial<BsConstraint> & Pick<BsConstraint, 'type' | 'value' | 'scope'>): BsConstraint {
  return {
    id: partial.id ?? 'c',
    field: 'selections',
    shared: true,
    includeChildSelections: true,
    includeChildForces: true,
    ...partial,
  };
}

function model(id: string, groupPicks: string[]): RosterModel {
  return {
    instanceId: id,
    entryId: 'mouse',
    name: id,
    species: 'Mouse',
    fate: 0,
    exp: 0,
    selections: groupPicks.map((entryId, i) => ({
      instanceId: `${id}-${i}`,
      entryId,
      groupId: 'quick',
      name: entryId,
      children: [],
    })),
  };
}

function warband(models: RosterModel[]): Warband {
  return {
    id: 'w',
    name: 'Rogues',
    factionId: 'rogues',
    factionName: 'Rogues',
    allegianceEntryId: '50ec-2aab-28b0-12e1',
    archetype: 'Ranger',
    notes: '',
    treasury: 0,
    labour: 0,
    materials: 0,
    pension: 0,
    pennyLimit: 350,
    stashedEquipment: '',
    denUpgradeIds: [],
    models,
    updatedAt: '',
  };
}

describe('selection limits', () => {
  it('splits self/parent maxima from roster maxima', () => {
    expect(
      selectionLimits({
        constraints: [
          constraint({ type: 'max', value: 2, scope: 'roster' }),
          constraint({ type: 'max', value: 1, scope: 'self' }),
        ],
      }),
    ).toEqual({ local: 1, roster: 2 });
  });

  it('counts Quick and Quiet picks across the warband', () => {
    const wb = warband([
      model('a', ['move']),
      model('b', ['nimb']),
      model('c', []),
    ]);
    expect(rosterSelectionCount(wb, (s) => s.groupId === 'quick')).toBe(2);
  });

  it('blocks a third Rogue from taking the starting Move/Nimbleness/Concealment bonus', () => {
    expect(
      canAddSelection({
        localCount: 0,
        localMax: 1,
        rosterCount: 2,
        rosterMax: 2,
        entryLocalCount: 0,
        entryLocalMax: Number.POSITIVE_INFINITY,
        entryRosterCount: 0,
        entryRosterMax: Number.POSITIVE_INFINITY,
      }),
    ).toEqual({ allowed: false, replace: false });
  });

  it('lets a beast swap its one bonus without increasing the roster count', () => {
    expect(
      canAddSelection({
        localCount: 1,
        localMax: 1,
        rosterCount: 2,
        rosterMax: 2,
        entryLocalCount: 0,
        entryLocalMax: Number.POSITIVE_INFINITY,
        entryRosterCount: 0,
        entryRosterMax: Number.POSITIVE_INFINITY,
      }),
    ).toEqual({ allowed: true, replace: true });
  });

  it('blocks a second Leader once one already exists in the band', () => {
    expect(
      canAddSelection({
        localCount: 0,
        localMax: 1,
        rosterCount: 0,
        rosterMax: Number.POSITIVE_INFINITY,
        entryLocalCount: 0,
        entryLocalMax: Number.POSITIVE_INFINITY,
        entryRosterCount: 1,
        entryRosterMax: 1,
      }),
    ).toEqual({ allowed: false, replace: false });
  });
});
