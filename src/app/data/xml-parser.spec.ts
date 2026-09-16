import { parseCatalogue, parseGameSystem, finalizeIndex, pennyCost, primaryCategory } from './xml-parser';

const GST = `<?xml version="1.0" encoding="UTF-8"?>
<gameSystem xmlns="http://www.battlescribe.net/schema/gameSystemSchema" id="sys-1" name="Test System" battleScribeVersion="2.03" revision="1">
  <costTypes>
    <costType id="penny" name="Penny" defaultCostLimit="350"/>
  </costTypes>
  <categoryEntries>
    <categoryEntry id="small" name="Small Beast (30mm Base)"/>
  </categoryEntries>
  <sharedSelectionEntryGroups>
    <selectionEntryGroup id="char" name="Character" hidden="false"/>
  </sharedSelectionEntryGroups>
  <sharedSelectionEntries>
    <selectionEntry id="mouse" name="Mouse" type="model" hidden="false">
      <costs><cost name="Penny" typeId="penny" value="24"/></costs>
      <categoryLinks>
        <categoryLink name="Small Beast (30mm Base)" hidden="false" id="cl1" targetId="small" primary="true"/>
      </categoryLinks>
      <infoLinks>
        <infoLink hidden="false" id="il-flight" name="Flight" targetId="flight" type="rule">
          <modifiers>
            <modifier type="set" value="1" field="annotation"/>
          </modifiers>
        </infoLink>
      </infoLinks>
      <profiles>
        <profile id="p1" name="Mouse" hidden="false" typeId="unit" typeName="Unit">
          <characteristics>
            <characteristic name="Movement" typeId="m">d6</characteristic>
            <characteristic name="Level" typeId="l">1</characteristic>
          </characteristics>
        </profile>
      </profiles>
    </selectionEntry>
  </sharedSelectionEntries>
</gameSystem>`;

const CAT = `<?xml version="1.0" encoding="UTF-8"?>
<catalogue xmlns="http://www.battlescribe.net/schema/catalogueSchema" library="false" id="kindred" name="Kindred" gameSystemId="sys-1" battleScribeVersion="2.03" revision="1">
  <sharedSelectionEntries>
    <selectionEntry type="upgrade" name="Allegiance: Kindred" hidden="false" id="alg-1">
      <categoryLinks>
        <categoryLink name="Allegiance" hidden="false" id="cl-a" targetId="allegiance" primary="true"/>
      </categoryLinks>
      <infoLinks>
        <infoLink name="Travel Light" id="il1" hidden="false" type="rule" targetId="r1"/>
      </infoLinks>
    </selectionEntry>
  </sharedSelectionEntries>
  <rules>
    <rule name="Travel Light" id="r1" hidden="false">
      <description>No heavy armour.</description>
    </rule>
  </rules>
</catalogue>`;

describe('xml-parser', () => {
  it('parses a game system and catalogue into an index', () => {
    const index = parseGameSystem(GST);
    parseCatalogue(CAT, index);
    finalizeIndex(index);

    expect(index.gameSystemName).toBe('Test System');
    expect(index.models.length).toBe(1);
    expect(index.models[0].name).toBe('Mouse');
    expect(pennyCost(index.models[0])).toBe(24);
    expect(primaryCategory(index.models[0])).toBe('Small Beast (30mm Base)');
    expect(index.factions.length).toBe(1);
    expect(index.factions[0].name).toBe('Kindred');
    expect(index.factions[0].allegianceEntryId).toBe('alg-1');
    expect(index.factions[0].rules[0].description).toContain('heavy armour');
    expect(index.profiles.get('p1')?.characteristics[0].value).toBe('d6');
    expect(index.models[0].infoLinks[0].modifiers).toEqual([
      expect.objectContaining({ type: 'set', value: '1', field: 'annotation' }),
    ]);
  });

  it('indexes entryLink ids so allegiance aliases can be resolved', () => {
    const gst = `<?xml version="1.0" encoding="UTF-8"?>
<gameSystem xmlns="http://www.battlescribe.net/schema/gameSystemSchema" id="sys-1" name="Test" battleScribeVersion="2.03" revision="1">
  <entryLinks>
    <entryLink import="true" name="Allegiance: Royalists" hidden="false" id="link-royal" targetId="entry-royal" type="selectionEntry"/>
  </entryLinks>
  <sharedSelectionEntries>
    <selectionEntry type="upgrade" name="Allegiance: Royalists" hidden="false" id="entry-royal"/>
  </sharedSelectionEntries>
</gameSystem>`;
    const index = parseGameSystem(gst);
    expect(index.entryLinkTargets.get('link-royal')).toBe('entry-royal');
  });

  it('keeps allegiance ids unique across catalogues', () => {
    const index = parseGameSystem(GST);
    parseCatalogue(CAT, index);
    parseCatalogue(
      CAT.replace('kindred', 'rogues').replace('Kindred', 'Rogues').replace('alg-1', 'alg-2'),
      index,
    );
    finalizeIndex(index);
    expect(index.factions.map((f) => f.allegianceEntryId).sort()).toEqual(['alg-1', 'alg-2']);
  });
});
