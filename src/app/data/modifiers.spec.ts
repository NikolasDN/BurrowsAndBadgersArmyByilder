import { BsConstraint, BsSelectionEntry } from '../models/battlescribe';
import { RosterModel, Warband } from '../models/roster';
import {
  canAddSelection,
  isHidden,
  resolveEntryChildren,
  rosterSelectionCount,
  selectionLimits,
} from './modifiers';
import { parseGameSystem } from './xml-parser';

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

function warband(models: RosterModel[], allegianceEntryId = '50ec-2aab-28b0-12e1'): Warband {
  return {
    id: 'w',
    name: 'Rogues',
    factionId: 'rogues',
    factionName: 'Rogues',
    allegianceEntryId,
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

const MAGIC_GST = `<?xml version="1.0" encoding="UTF-8"?>
<gameSystem xmlns="http://www.battlescribe.net/schema/gameSystemSchema" id="sys-1" name="Test" battleScribeVersion="2.03" revision="1">
  <sharedSelectionEntryGroups>
    <selectionEntryGroup name="Magic" id="magic" hidden="false">
      <selectionEntries>
        <selectionEntry type="upgrade" import="true" name="Magic User" hidden="false" id="magic-user">
          <selectionEntryGroups>
            <selectionEntryGroup name="Magical Archetypes" id="archetypes" hidden="false">
              <selectionEntries>
                <selectionEntry type="upgrade" import="true" name="Natural" hidden="true" id="natural">
                  <selectionEntryGroups>
                    <selectionEntryGroup name="Natural Spells" id="natural-spells" hidden="false">
                      <selectionEntries>
                        <selectionEntry type="upgrade" import="true" name="Haste" hidden="false" id="haste"/>
                        <selectionEntry type="upgrade" import="true" name="Curse" hidden="false" id="curse"/>
                      </selectionEntries>
                    </selectionEntryGroup>
                  </selectionEntryGroups>
                  <modifiers>
                    <modifier type="set" value="false" field="hidden">
                      <conditionGroups>
                        <conditionGroup type="or">
                          <conditions>
                            <condition type="equalTo" value="1" field="selections" scope="roster" childId="kindred-entry" shared="true"/>
                            <condition type="equalTo" value="1" field="selections" scope="roster" childId="royal-link" shared="true"/>
                            <condition type="lessThan" value="1" field="selections" scope="root-entry" childId="setup" shared="true"/>
                          </conditions>
                        </conditionGroup>
                      </conditionGroups>
                    </modifier>
                  </modifiers>
                </selectionEntry>
                <selectionEntry type="upgrade" import="true" name="Necromancy" hidden="true" id="necromancy">
                  <selectionEntryGroups>
                    <selectionEntryGroup name="Necromancy Spells" id="necro-spells" hidden="false">
                      <selectionEntries>
                        <selectionEntry type="upgrade" import="true" name="Raise" hidden="false" id="raise"/>
                      </selectionEntries>
                    </selectionEntryGroup>
                  </selectionEntryGroups>
                  <modifiers>
                    <modifier type="set" value="false" field="hidden">
                      <conditionGroups>
                        <conditionGroup type="or">
                          <conditions>
                            <condition type="equalTo" value="1" field="selections" scope="roster" childId="undead-entry" shared="true"/>
                            <condition type="lessThan" value="1" field="selections" scope="root-entry" childId="setup" shared="true"/>
                          </conditions>
                        </conditionGroup>
                      </conditionGroups>
                    </modifier>
                  </modifiers>
                </selectionEntry>
              </selectionEntries>
            </selectionEntryGroup>
          </selectionEntryGroups>
        </selectionEntry>
      </selectionEntries>
    </selectionEntryGroup>
  </sharedSelectionEntryGroups>
</gameSystem>`;

describe('magical archetypes', () => {
  const index = parseGameSystem(MAGIC_GST);
  const natural = index.entries.get('natural') as BsSelectionEntry;
  const necromancy = index.entries.get('necromancy') as BsSelectionEntry;
  const setupModel: RosterModel = {
    instanceId: 'm1',
    entryId: 'mouse',
    name: 'Pip',
    species: 'Mouse',
    fate: 0,
    exp: 0,
    selections: [
      {
        instanceId: 'setup-1',
        entryId: 'setup',
        groupId: '',
        name: 'Setup Only',
        children: [],
      },
    ],
  };

  function ctxFor(allegianceEntryId: string, extraRosterIds: string[] = []) {
    return {
      warband: warband([setupModel], allegianceEntryId),
      model: setupModel,
      extraRosterIds,
    };
  }

  it('keeps Natural hidden for a starting Kindred-less band', () => {
    expect(isHidden(natural, ctxFor('undead-entry'))).toBe(true);
  });

  it('unhides Natural for a starting Kindred band so its spell list can be chosen', () => {
    expect(isHidden(natural, ctxFor('kindred-entry'))).toBe(false);
    const { groups, entries } = resolveEntryChildren(natural, index.entries, index.groups);
    expect(groups.map((g) => g.name)).toEqual(['Natural Spells']);
    expect(groups[0].selectionEntries.map((e) => e.name)).toEqual(['Haste', 'Curse']);
    expect(entries).toEqual([]);
  });

  it('unhides Natural when the catalogue condition uses the allegiance entryLink id', () => {
    expect(isHidden(natural, ctxFor('royal-entry'))).toBe(true);
    expect(isHidden(natural, ctxFor('royal-entry', ['royal-link']))).toBe(false);
  });

  it('does not offer Necromancy spells to a starting Kindred magic-user', () => {
    expect(isHidden(necromancy, ctxFor('kindred-entry'))).toBe(true);
  });
});
