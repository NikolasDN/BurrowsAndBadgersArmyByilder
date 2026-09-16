import { computeModelPennies, computeStats, equipmentBuckets, printSkillLine, printSkillLines, startingSkills } from './stats';
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

  it('lists innate starting skills from model info links', () => {
    const gst = `<?xml version="1.0" encoding="UTF-8"?>
<gameSystem xmlns="http://www.battlescribe.net/schema/gameSystemSchema" id="sys-1" name="Test" battleScribeVersion="2.03">
  <sharedRules>
    <rule hidden="false" id="flight" name="Flight"><description>Fly.</description></rule>
    <rule hidden="false" id="delicate" name="Delicate (X)"><description>Fragile.</description></rule>
  </sharedRules>
  <sharedProfiles>
    <profile id="strong" name="Strong" hidden="false" typeName="Ability">
      <characteristics>
        <characteristic name="Effect" typeId="e">Adds Strong.</characteristic>
      </characteristics>
    </profile>
  </sharedProfiles>
  <sharedSelectionEntryGroups>
    <selectionEntryGroup id="innate" name="Innate Skills" hidden="false"/>
  </sharedSelectionEntryGroups>
  <sharedSelectionEntries>
    <selectionEntry id="mole" name="Mole" type="model" hidden="false">
      <infoLinks>
        <infoLink hidden="false" id="il1" name="Flight" targetId="flight" type="rule"/>
        <infoLink hidden="false" id="il2" name="Strong" targetId="strong" type="profile">
          <modifiers>
            <modifier type="set" value="1" field="annotation"/>
          </modifiers>
        </infoLink>
        <infoLink hidden="false" id="il3" name="Delicate (X)" targetId="delicate" type="rule">
          <modifiers>
            <modifier arg="(X)" field="name" type="replace" value="2"/>
          </modifiers>
        </infoLink>
        <infoLink hidden="true" id="il4" name="Hidden Skill" targetId="flight" type="rule"/>
      </infoLinks>
    </selectionEntry>
  </sharedSelectionEntries>
</gameSystem>`;
    const index = finalizeIndex(parseGameSystem(gst));
    const mole = index.entries.get('mole')!;
    expect(startingSkills(index, mole)).toEqual(['Flight', 'Strong (1)', 'Delicate (2)']);

    const model: RosterModel = {
      instanceId: 'm1',
      entryId: 'mole',
      name: 'Diggory',
      species: 'Mole',
      fate: 0,
      exp: 0,
      selections: [
        { instanceId: 's1', entryId: 'flight-pick', groupId: 'innate', name: 'Flight', children: [] },
        { instanceId: 's2', entryId: 'swim', groupId: 'innate', name: 'Swim', children: [] },
      ],
    };
    expect(equipmentBuckets(index, model).skills).toEqual(['Flight', 'Strong (1)', 'Delicate (2)', 'Swim']);
    expect(printSkillLines(index, model)).toEqual([
      'Flight (Fly.)',
      'Strong (1) (Adds Strong.)',
      'Delicate (2) (Fragile.)',
      'Swim',
    ]);
    expect(
      printSkillLine({
        name: 'Flight',
        effect: 'The model may move by flying.',
      }),
    ).toBe('Flight (The model may move by flying.)');
  });
});
