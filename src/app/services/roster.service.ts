import { Injectable, computed, signal } from '@angular/core';
import {
  STORAGE_KEY,
  RosterModel,
  RosterSelection,
  Warband,
} from '../models/roster';
import { CatalogueService } from './catalogue.service';
import { SETUP_ONLY_ID } from '../models/battlescribe';
import { computeModelPennies, computeRating, computeStats, computeWarbandPennies } from '../data/stats';
import { EvalContext, modifiedDefaultAmount } from '../data/modifiers';
import { laborCost, materialCost, pennyCost } from '../data/xml-parser';

function uid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

@Injectable({ providedIn: 'root' })
export class RosterService {
  readonly warband = signal<Warband | null>(null);
  readonly saved = signal<Warband[]>(this.readAll());

  readonly pennies = computed(() => {
    const wb = this.warband();
    if (!wb || !this.catalogue.ready()) {
      return 0;
    }
    return computeWarbandPennies(this.catalogue.getIndex(), wb.models, (m) => this.ctx(m));
  });

  readonly rating = computed(() => {
    const wb = this.warband();
    if (!wb || !this.catalogue.ready()) {
      return 0;
    }
    const index = this.catalogue.getIndex();
    return computeRating(index, wb.models, (m) => this.ctx(m));
  });

  readonly denCosts = computed(() => {
    const wb = this.warband();
    if (!wb || !this.catalogue.ready()) {
      return { labor: 0, material: 0, penny: 0 };
    }
    const index = this.catalogue.getIndex();
    return wb.denUpgradeIds.reduce(
      (acc, id) => {
        const entry = index.entries.get(id);
        if (!entry) {
          return acc;
        }
        acc.labor += laborCost(entry);
        acc.material += materialCost(entry);
        acc.penny += pennyCost(entry);
        return acc;
      },
      { labor: 0, material: 0, penny: 0 },
    );
  });

  constructor(private readonly catalogue: CatalogueService) {}

  ctx(model?: RosterModel): EvalContext {
    const wb = this.warband();
    if (!wb) {
      throw new Error('No warband');
    }
    const extraRosterIds = this.catalogue.ready() ? this.catalogue.idsAliasedTo(wb.allegianceEntryId) : [];
    return { warband: wb, model, extraRosterIds };
  }

  create(factionId: string, name = 'New Warband'): Warband {
    const faction = this.catalogue.faction(factionId);
    if (!faction) {
      throw new Error('Unknown faction');
    }
    const archetypeRule = faction.rules.find((r) => r.name.toLowerCase().includes('archetype'));
    const wb: Warband = {
      id: uid(),
      name,
      factionId: faction.id,
      factionName: faction.name,
      allegianceEntryId: faction.allegianceEntryId,
      archetype: archetypeRule?.name.replace(/^Allegiance Archetype:\s*/i, '') ?? '',
      notes: faction.rules.map((r) => `${r.name}: ${r.description}`).join('\n\n'),
      treasury: 0,
      labour: 0,
      materials: 0,
      pension: 0,
      pennyLimit: 350,
      stashedEquipment: '',
      denUpgradeIds: [],
      models: [],
      updatedAt: new Date().toISOString(),
    };
    wb.denUpgradeIds = this.startingDenUpgradeIds(wb);
    this.warband.set(wb);
    this.persistCurrent();
    return wb;
  }

  load(id: string): void {
    const found = this.saved().find((w) => w.id === id);
    if (found) {
      this.warband.set(structuredClone(found));
    }
  }

  importJson(text: string): Warband {
    const data = JSON.parse(text) as Warband;
    if (!data?.id || !Array.isArray(data.models)) {
      throw new Error('Not a valid warband file');
    }
    data.updatedAt = new Date().toISOString();
    this.warband.set(data);
    this.persistCurrent();
    return data;
  }

  exportJson(): string {
    const wb = this.warband();
    if (!wb) {
      throw new Error('No warband to export');
    }
    return JSON.stringify(wb, null, 2);
  }

  update(patch: Partial<Warband>): void {
    const wb = this.warband();
    if (!wb) {
      return;
    }
    this.warband.set({ ...wb, ...patch, updatedAt: new Date().toISOString() });
    this.persistCurrent();
  }

  addModel(entryId: string): RosterModel {
    const wb = this.warband();
    const entry = this.catalogue.entry(entryId);
    if (!wb || !entry) {
      throw new Error('Cannot add model');
    }
    const selections: RosterSelection[] = [];
    const setup = this.catalogue.entry(SETUP_ONLY_ID);
    if (setup) {
      selections.push({
        instanceId: uid(),
        entryId: setup.id,
        groupId: '',
        name: setup.name,
        children: [],
      });
    }
    const model: RosterModel = {
      instanceId: uid(),
      entryId: entry.id,
      name: entry.name,
      species: entry.name,
      fate: 0,
      exp: 0,
      selections,
    };
    this.warband.set({
      ...wb,
      models: [...wb.models, model],
      updatedAt: new Date().toISOString(),
    });
    this.persistCurrent();
    return model;
  }

  removeModel(instanceId: string): void {
    const wb = this.warband();
    if (!wb) {
      return;
    }
    this.warband.set({
      ...wb,
      models: wb.models.filter((m) => m.instanceId !== instanceId),
      updatedAt: new Date().toISOString(),
    });
    this.persistCurrent();
  }

  patchModel(instanceId: string, patch: Partial<RosterModel>): void {
    const wb = this.warband();
    if (!wb) {
      return;
    }
    this.warband.set({
      ...wb,
      models: wb.models.map((m) => (m.instanceId === instanceId ? { ...m, ...patch } : m)),
      updatedAt: new Date().toISOString(),
    });
    this.persistCurrent();
  }

  setSelections(instanceId: string, selections: RosterSelection[]): void {
    this.patchModel(instanceId, { selections });
  }

  toggleDenUpgrade(id: string): void {
    const wb = this.warband();
    if (!wb) {
      return;
    }
    const denUpgradeIds = wb.denUpgradeIds.includes(id)
      ? wb.denUpgradeIds.filter((x) => x !== id)
      : [...wb.denUpgradeIds, id];
    this.update({ denUpgradeIds });
  }

  deleteSaved(id: string): void {
    const next = this.saved().filter((w) => w.id !== id);
    this.writeAll(next);
    this.saved.set(next);
    if (this.warband()?.id === id) {
      this.warband.set(null);
    }
  }

  persistCurrent(): void {
    const wb = this.warband();
    if (!wb) {
      return;
    }
    const others = this.saved().filter((w) => w.id !== wb.id);
    const next = [wb, ...others].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    this.writeAll(next);
    this.saved.set(next);
  }

  modelPennies(model: RosterModel): number {
    if (!this.catalogue.ready()) {
      return 0;
    }
    return computeModelPennies(this.catalogue.getIndex(), model, this.ctx(model));
  }

  modelStats(model: RosterModel) {
    if (!this.catalogue.ready() || !this.warband()) {
      return null;
    }
    return computeStats(this.catalogue.getIndex(), model, this.ctx(model));
  }

  newSelection(entryId: string, groupId: string, name: string): RosterSelection {
    return { instanceId: uid(), entryId, groupId, name, children: [] };
  }

  private startingDenUpgradeIds(warband: Warband): string[] {
    if (!this.catalogue.ready()) {
      return [];
    }
    const index = this.catalogue.getIndex();
    const aliases = this.catalogue.idsAliasedTo(warband.allegianceEntryId);
    const siblingEntryIds = [warband.allegianceEntryId, ...aliases];
    const ctx: EvalContext = { warband, extraRosterIds: aliases, siblingEntryIds };
    const denIdSet = new Set(index.denUpgrades.map((den) => den.id));
    const selected = new Set<string>();

    for (const den of index.denUpgrades) {
      if (modifiedDefaultAmount(den, ctx) > 0) {
        selected.add(den.id);
      }
    }

    for (const [linkId, targetId] of index.entryLinkTargets) {
      if (!denIdSet.has(targetId)) {
        continue;
      }
      const link = index.entryLinks.get(linkId);
      if (link && modifiedDefaultAmount(link, ctx) > 0) {
        selected.add(targetId);
      }
    }

    return index.denUpgrades.filter((den) => selected.has(den.id)).map((den) => den.id);
  }

  private readAll(): Warband[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Warband[]) : [];
    } catch {
      return [];
    }
  }

  private writeAll(list: Warband[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }
}
