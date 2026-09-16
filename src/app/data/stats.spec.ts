import { computeModelPennies, computeStats, equipmentBuckets, printEquipmentBuckets, printGearLine, printSkillLine, printSkillLines, startingSkills } from './stats';
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

  it('prints weapon, armour, and item rules in parentheses', () => {
    const gst = `<?xml version="1.0" encoding="UTF-8"?>
<gameSystem xmlns="http://www.battlescribe.net/schema/gameSystemSchema" id="sys-1" name="Test" battleScribeVersion="2.03">
  <sharedProfiles>
    <profile id="spear" name="Spear" hidden="false" typeName="Weapon">
      <characteristics>
        <characteristic name="Type">Spear</characteristic>
        <characteristic name="Range">-</characteristic>
        <characteristic name="Rules">Adds +1 to Strike rolls.</characteristic>
        <characteristic name="Keywords"/>
      </characteristics>
    </profile>
    <profile id="bow" name="Bow" hidden="false" typeName="Weapon">
      <characteristics>
        <characteristic name="Type">-</characteristic>
        <characteristic name="Range">18"</characteristic>
        <characteristic name="Rules">-</characteristic>
        <characteristic name="Keywords">-</characteristic>
      </characteristics>
    </profile>
    <profile id="sword" name="One-handed weapon" hidden="false" typeName="Weapon">
      <characteristics>
        <characteristic name="Type">One-handed</characteristic>
        <characteristic name="Range">-</characteristic>
        <characteristic name="Rules"/>
        <characteristic name="Keywords"/>
      </characteristics>
    </profile>
    <profile id="light" name="Light armour" hidden="false" typeName="Armor">
      <characteristics>
        <characteristic name="Rules">-</characteristic>
        <characteristic name="Keywords">Tough (1)</characteristic>
      </characteristics>
    </profile>
    <profile id="antivenom" name="Anti-Venom" hidden="false" typeName="Item">
      <characteristics>
        <characteristic name="Rules">Ignore poison for one battle.</characteristic>
        <characteristic name="Keywords">Single use</characteristic>
      </characteristics>
    </profile>
  </sharedProfiles>
  <sharedSelectionEntryGroups>
    <selectionEntryGroup id="wslot" name="Weapon Slots" hidden="false"/>
    <selectionEntryGroup id="aslot" name="Armor Slots" hidden="false"/>
    <selectionEntryGroup id="islot" name="Items Slot" hidden="false"/>
  </sharedSelectionEntryGroups>
  <sharedSelectionEntries>
    <selectionEntry id="mouse" name="Mouse" type="model" hidden="false"/>
    <selectionEntry id="spear" name="Spear" type="upgrade" hidden="false">
      <infoLinks>
        <infoLink hidden="false" id="il-s" name="Spear" targetId="spear" type="profile"/>
      </infoLinks>
    </selectionEntry>
    <selectionEntry id="bow" name="Bow" type="upgrade" hidden="false">
      <infoLinks>
        <infoLink hidden="false" id="il-b" name="Bow" targetId="bow" type="profile"/>
      </infoLinks>
    </selectionEntry>
    <selectionEntry id="sword" name="One-handed weapon" type="upgrade" hidden="false">
      <infoLinks>
        <infoLink hidden="false" id="il-w" name="One-handed weapon" targetId="sword" type="profile"/>
      </infoLinks>
    </selectionEntry>
    <selectionEntry id="light" name="Light armour" type="upgrade" hidden="false">
      <infoLinks>
        <infoLink hidden="false" id="il-a" name="Light armour" targetId="light" type="profile"/>
      </infoLinks>
    </selectionEntry>
    <selectionEntry id="antivenom" name="Anti-Venom" type="upgrade" hidden="false">
      <infoLinks>
        <infoLink hidden="false" id="il-i" name="Anti-Venom" targetId="antivenom" type="profile"/>
      </infoLinks>
    </selectionEntry>
  </sharedSelectionEntries>
</gameSystem>`;
    const index = finalizeIndex(parseGameSystem(gst));
    const model: RosterModel = {
      instanceId: 'm1',
      entryId: 'mouse',
      name: 'Pip',
      species: 'Mouse',
      fate: 0,
      exp: 0,
      selections: [
        { instanceId: 's1', entryId: 'spear', groupId: 'wslot', name: 'Spear', children: [] },
        { instanceId: 's2', entryId: 'bow', groupId: 'wslot', name: 'Bow', children: [] },
        { instanceId: 's3', entryId: 'light', groupId: 'aslot', name: 'Light armour', children: [] },
        { instanceId: 's4', entryId: 'antivenom', groupId: 'islot', name: 'Anti-Venom', children: [] },
        { instanceId: 's5', entryId: 'sword', groupId: 'wslot', name: 'One-handed weapon', children: [] },
      ],
    };
    expect(equipmentBuckets(index, model).weapons).toEqual(['Spear', 'Bow', 'One-handed weapon']);
    expect(printEquipmentBuckets(index, model)).toEqual({
      weapons: [
        'Spear (Adds +1 to Strike rolls.)',
        'Bow (Range 18")',
        'One-handed weapon',
      ],
      armour: ['Light armour (Tough (1))'],
      items: ['Anti-Venom (Ignore poison for one battle.; Single use)'],
      special: [],
    });
    expect(
      printGearLine({
        name: 'Spear',
        effect: 'Adds +1 to Strike rolls.',
      }),
    ).toBe('Spear (Adds +1 to Strike rolls.)');
  });

  it('adds Ability profiles linked from a taken spell', () => {
    const gst = `<?xml version="1.0" encoding="UTF-8"?>
<gameSystem xmlns="http://www.battlescribe.net/schema/gameSystemSchema" id="sys-1" name="Test" battleScribeVersion="2.03">
  <sharedProfiles>
    <profile id="haste" name="Haste" hidden="false" typeName="Spell">
      <characteristics>
        <characteristic name="Effect">The target may make an extra Move Action.</characteristic>
      </characteristics>
    </profile>
    <profile id="curse" name="Curse" hidden="false" typeName="Spell">
      <characteristics>
        <characteristic name="Effect">The target suffers a penalty.</characteristic>
      </characteristics>
    </profile>
    <profile id="blessing" name="Blessing" hidden="false" typeName="Spell">
      <characteristics>
        <characteristic name="Effect">The target gains a bonus.</characteristic>
      </characteristics>
    </profile>
    <profile id="marsh" name="The Marsh" hidden="false" typeName="Spell">
      <characteristics>
        <characteristic name="Effect">The ground turns to marsh.</characteristic>
      </characteristics>
    </profile>
    <profile id="weak" name="Weak" hidden="false" typeName="Ability">
      <characteristics>
        <characteristic name="Effect">This model is feeble and lacking strength.</characteristic>
      </characteristics>
    </profile>
    <profile id="delicate" name="Delicate" hidden="false" typeName="Ability">
      <characteristics>
        <characteristic name="Effect">This model has a weak constitution.</characteristic>
      </characteristics>
    </profile>
  </sharedProfiles>
  <sharedSelectionEntryGroups>
    <selectionEntryGroup id="natural-spells" name="Natural Spells" hidden="false"/>
    <selectionEntryGroup id="divine-spells" name="Divine Spells" hidden="false"/>
  </sharedSelectionEntryGroups>
  <sharedSelectionEntries>
    <selectionEntry id="mouse" name="Mouse" type="model" hidden="false"/>
    <selectionEntry id="haste" name="Haste" type="upgrade" hidden="false">
      <infoLinks>
        <infoLink hidden="false" id="il-h" name="Haste" targetId="haste" type="profile"/>
        <infoLink hidden="false" id="il-w" name="Weak" targetId="weak" type="profile"/>
        <infoLink hidden="false" id="il-d" name="Delicate" targetId="delicate" type="profile"/>
        <infoLink hidden="true" id="il-hidden" name="Hidden Ability" targetId="weak" type="profile"/>
      </infoLinks>
    </selectionEntry>
    <selectionEntry id="curse" name="Curse" type="upgrade" hidden="false">
      <infoLinks>
        <infoLink hidden="false" id="il-c" name="Curse" targetId="curse" type="profile"/>
        <infoLink hidden="false" id="il-w2" name="Weak" targetId="weak" type="profile"/>
        <infoLink hidden="false" id="il-d2" name="Delicate" targetId="delicate" type="profile"/>
      </infoLinks>
    </selectionEntry>
    <selectionEntry id="blessing" name="Blessing" type="upgrade" hidden="false">
      <infoLinks>
        <infoLink hidden="false" id="il-b" name="Blessing" targetId="blessing" type="profile"/>
      </infoLinks>
    </selectionEntry>
    <selectionEntry id="marsh" name="The Marsh" type="upgrade" hidden="false">
      <infoLinks>
        <infoLink hidden="false" id="il-md" name="Delicate" targetId="delicate" type="profile"/>
        <infoLink hidden="false" id="il-mw" name="Weak" targetId="weak" type="profile"/>
        <infoLink hidden="false" id="il-m" name="The Marsh" targetId="marsh" type="profile"/>
      </infoLinks>
    </selectionEntry>
  </sharedSelectionEntries>
</gameSystem>`;
    const index = finalizeIndex(parseGameSystem(gst));
    const model: RosterModel = {
      instanceId: 'm1',
      entryId: 'mouse',
      name: 'Pip',
      species: 'Mouse',
      fate: 0,
      exp: 0,
      selections: [
        { instanceId: 's1', entryId: 'haste', groupId: 'natural-spells', name: 'Haste', children: [] },
        { instanceId: 's2', entryId: 'curse', groupId: 'natural-spells', name: 'Curse', children: [] },
        { instanceId: 's3', entryId: 'blessing', groupId: 'divine-spells', name: 'Blessing', children: [] },
        { instanceId: 's4', entryId: 'marsh', groupId: 'natural-spells', name: 'The Marsh', children: [] },
      ],
    };
    expect(equipmentBuckets(index, model).skills).toEqual([
      'Haste',
      'Weak',
      'Delicate',
      'Curse',
      'Blessing',
      'The Marsh',
    ]);
    expect(printSkillLines(index, model)).toEqual([
      'Haste (The target may make an extra Move Action.)',
      'Weak (This model is feeble and lacking strength.)',
      'Delicate (This model has a weak constitution.)',
      'Curse (The target suffers a penalty.)',
      'Blessing (The target gains a bonus.)',
      'The Marsh (The ground turns to marsh.)',
    ]);
  });
});
