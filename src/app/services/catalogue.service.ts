import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  BsFaction,
  BsSelectionEntry,
  BsSelectionEntryGroup,
  CatalogueIndex,
  CHARACTER_GROUP_ID,
  SIZE_ORDER,
} from '../models/battlescribe';
import { parseCatalogue, parseGameSystem, finalizeIndex, primaryCategory } from '../data/xml-parser';

interface Manifest {
  gameSystem: string;
  catalogues: string[];
}

@Injectable({ providedIn: 'root' })
export class CatalogueService {
  readonly ready = signal(false);
  readonly error = signal<string | null>(null);
  private index: CatalogueIndex | null = null;

  constructor(private readonly http: HttpClient) {}

  async load(): Promise<CatalogueIndex> {
    if (this.index) {
      return this.index;
    }
    try {
      const manifest = await firstValueFrom(this.http.get<Manifest>('data/manifest.json'));
      const gst = await firstValueFrom(
        this.http.get(`data/${manifest.gameSystem}`, { responseType: 'text' }),
      );
      const index = parseGameSystem(gst);
      for (const path of manifest.catalogues) {
        const xml = await firstValueFrom(this.http.get(`data/${encodeURI(path)}`, { responseType: 'text' }));
        parseCatalogue(xml, index);
      }
      const ready = finalizeIndex(index);
      this.index = ready;
      this.ready.set(true);
      return ready;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load catalogue data';
      this.error.set(message);
      throw err;
    }
  }

  getIndex(): CatalogueIndex {
    if (!this.index) {
      throw new Error('Catalogue data has not loaded yet');
    }
    return this.index;
  }

  factions(): BsFaction[] {
    return this.getIndex().factions;
  }

  faction(id: string): BsFaction | undefined {
    return this.getIndex().factions.find((f) => f.id === id);
  }

  models(): BsSelectionEntry[] {
    return this.getIndex().models;
  }

  modelsBySize(): { size: string; models: BsSelectionEntry[] }[] {
    const groups = new Map<string, BsSelectionEntry[]>();
    for (const model of this.models()) {
      const size = primaryCategory(model) || 'Other';
      const list = groups.get(size) ?? [];
      list.push(model);
      groups.set(size, list);
    }
    const ordered = SIZE_ORDER.filter((s) => groups.has(s)).map((size) => ({
      size,
      models: groups.get(size)!,
    }));
    for (const [size, models] of groups) {
      if (!SIZE_ORDER.includes(size)) {
        ordered.push({ size, models });
      }
    }
    return ordered;
  }

  denUpgrades(): BsSelectionEntry[] {
    return this.getIndex().denUpgrades;
  }

  entry(id: string): BsSelectionEntry | undefined {
    return this.getIndex().entries.get(id);
  }

  group(id: string): BsSelectionEntryGroup | undefined {
    return this.getIndex().groups.get(id);
  }

  characterGroup(): BsSelectionEntryGroup | undefined {
    return this.getIndex().groups.get(CHARACTER_GROUP_ID);
  }
}
