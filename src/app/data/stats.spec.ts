import { computeModelPennies, computeStats } from './stats';
import { parseGameSystem, finalizeIndex } from './xml-parser';
import { Warband, RosterModel } from '../models/roster';

const GST = `<?xml version="1.0" encoding="UTF-8"?>
<gameSystem xmlns="http://www.battlescribe.net/schema/gameSystemSchema" id="sys-1" name="Test" battleScribeVersion="2.03">
  <sharedSelectionEntries>
    <selectionEntry id="mouse" name="Mouse" type="model" hidden="false">
      <costs><cost name="Penny" typeId="penny" value="24"/></costs>
      <profiles>
        <profile id="p1" name="Mouse" hidden="false" typeName="Unit">
          <characteristics>
            <characteristic name="Strike" typeId="3c84-430f-dc21-e27b">d4</characteristic>
            <characteristic name="Level" typeId="659a-f40f-dc29-33bf">1</characteristic>
          </characteristics>
        </profile>
      </profiles>
    </selectionEntry>
    <selectionEntry id="up-strike" name="Upgrade Strike" type="upgrade" hidden="false">
      <costs><cost name="Penny" typeId="penny" value="0"/></costs>
      <modifiers>
        <modifier type="replace" value="d6" field="3c84-430f-dc21-e27b" arg="d4"/>
      </modifiers>
    </selectionEntry>
    <selectionEntry id="sword" name="One-handed weapon" type="upgrade" hidden="false">
      <costs><cost name="Penny" typeId="penny" value="8"/></costs>
    </selectionEntry>
  </sharedSelectionEntries>
</gameSystem>`;

describe('stats', () => {
  it('sums model and equipment pennies and applies dice upgrades', () => {
    const index = finalizeIndex(parseGameSystem(GST));
    const model: RosterModel = {
      instanceId: 'm1',
      entryId: 'mouse',
      name: 'Pip',
      species: 'Mouse',
      fate: 0,
      exp: 0,
      selections: [
        { instanceId: 's1', entryId: 'sword', groupId: 'w', name: 'One-handed weapon', children: [] },
        { instanceId: 's2', entryId: 'up-strike', groupId: 'u', name: 'Upgrade Strike', children: [] },
      ],
    };
    const warband: Warband = {
      id: 'w',
      name: 'Band',
      factionId: 'f',
      factionName: 'Kindred',
      allegianceEntryId: 'a',
      archetype: 'Ranger',
      notes: '',
      treasury: 0,
      labour: 0,
      materials: 0,
      pension: 0,
      pennyLimit: 350,
      stashedEquipment: '',
      denUpgradeIds: [],
      models: [model],
      updatedAt: '',
    };
    expect(computeModelPennies(index, model)).toBe(32);
    const stats = computeStats(index, model, { warband, model });
    expect(stats.Strike).toBe('d6');
    expect(stats.Level).toBe('1');
  });
});
