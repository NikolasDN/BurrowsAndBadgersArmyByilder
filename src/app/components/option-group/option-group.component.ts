import { Component, Input, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  BsSelectionEntry,
  BsSelectionEntryGroup,
} from '../../models/battlescribe';
import { RosterModel, RosterSelection } from '../../models/roster';
import { CatalogueService } from '../../services/catalogue.service';
import { RosterService } from '../../services/roster.service';
import {
  isHidden,
  selectionLimits,
  rosterSelectionCount,
  canAddSelection,
  resolveEntryChildren,
  resolveGroupChildren,
} from '../../data/modifiers';
import { lookupProfileText } from '../../data/stats';
import { pennyCost } from '../../data/xml-parser';

@Component({
  selector: 'app-option-group',
  imports: [FormsModule, OptionGroupComponent],
  templateUrl: './option-group.component.html',
  styleUrl: './option-group.component.scss',
})
export class OptionGroupComponent implements OnInit {
  @Input({ required: true }) group!: BsSelectionEntryGroup;
  @Input({ required: true }) model!: RosterModel;
  @Input() parentInstanceId: string | null = null;
  @Input() depth = 0;
  @Input() startOpen = false;

  private readonly catalogue = inject(CatalogueService);
  private readonly roster = inject(RosterService);

  open = false;
  query = '';

  ngOnInit(): void {
    if (this.startOpen) {
      this.open = true;
    }
  }

  get ctx() {
    return this.roster.ctx(this.model);
  }

  get resolved() {
    const index = this.catalogue.getIndex();
    return resolveGroupChildren(this.group, index.entries, index.groups);
  }

  get visibleEntries(): BsSelectionEntry[] {
    const ctx = this.ctx;
    ctx.siblingEntryIds = this.current.map((s) => s.entryId);
    return this.resolved.entries.filter((e) => !isHidden(e, ctx));
  }

  get visibleGroups(): BsSelectionEntryGroup[] {
    return this.resolved.groups.filter((g) => !isHidden(g, this.ctx));
  }

  get filteredEntries(): BsSelectionEntry[] {
    const q = this.query.trim().toLowerCase();
    const list = this.visibleEntries;
    return q ? list.filter((e) => e.name.toLowerCase().includes(q)) : list;
  }

  get current(): RosterSelection[] {
    return this.parentList().filter((s) => s.groupId === this.group.id);
  }

  get hiddenByModifiers(): boolean {
    return isHidden(this.group, this.ctx);
  }

  get groupLimits() {
    return selectionLimits(this.group);
  }

  get localMax(): number {
    return this.groupLimits.local;
  }

  get rosterMax(): number {
    return this.groupLimits.roster;
  }

  get rosterUsed(): number {
    return rosterSelectionCount(this.ctx.warband, (s) => s.groupId === this.group.id);
  }

  hasFiniteMax(n: number): boolean {
    return Number.isFinite(n);
  }

  canSelect(entry: BsSelectionEntry): boolean {
    if (this.isSelected(entry.id)) {
      return true;
    }
    return this.addDecision(entry).allowed;
  }

  selectedCount(entryId: string): number {
    return this.current.filter((s) => s.entryId === entryId).length;
  }

  isSelected(entryId: string): boolean {
    return this.selectedCount(entryId) > 0;
  }

  costOf(entry: BsSelectionEntry): number {
    return pennyCost(entry);
  }

  hint(entry: BsSelectionEntry): string {
    return lookupProfileText(this.catalogue.getIndex(), entry);
  }

  toggle(entry: BsSelectionEntry): void {
    if (this.isSelected(entry.id)) {
      this.removeEntry(entry.id);
      return;
    }
    const decision = this.addDecision(entry);
    if (!decision.allowed) {
      return;
    }
    if (decision.replace) {
      this.replaceAll(entry);
      return;
    }
    this.add(entry);
  }

  private addDecision(entry: BsSelectionEntry) {
    const entryLimits = selectionLimits(entry);
    return canAddSelection({
      localCount: this.current.length,
      localMax: this.localMax,
      rosterCount: this.rosterUsed,
      rosterMax: this.rosterMax,
      entryLocalCount: this.selectedCount(entry.id),
      entryLocalMax: entryLimits.local,
      entryRosterCount: rosterSelectionCount(this.ctx.warband, (s) => s.entryId === entry.id),
      entryRosterMax: entryLimits.roster,
    });
  }

  add(entry: BsSelectionEntry): void {
    const sel = this.roster.newSelection(entry.id, this.group.id, entry.name);
    const next = [...this.parentList(), sel];
    this.writeParent(next);
  }

  removeEntry(entryId: string): void {
    const match = this.current.find((s) => s.entryId === entryId);
    if (!match) {
      return;
    }
    this.writeParent(this.parentList().filter((s) => s.instanceId !== match.instanceId));
  }

  replaceAll(entry: BsSelectionEntry): void {
    const kept = this.parentList().filter((s) => s.groupId !== this.group.id);
    kept.push(this.roster.newSelection(entry.id, this.group.id, entry.name));
    this.writeParent(kept);
  }

  nestedGroups(sel: RosterSelection): BsSelectionEntryGroup[] {
    const entry = this.catalogue.entry(sel.entryId);
    if (!entry) {
      return [];
    }
    const index = this.catalogue.getIndex();
    const { groups } = resolveEntryChildren(entry, index.entries, index.groups);
    return groups.filter((g) => !isHidden(g, { ...this.ctx, model: this.model }));
  }

  selectionFor(entryId: string): RosterSelection | undefined {
    return this.current.find((s) => s.entryId === entryId);
  }

  private parentList(): RosterSelection[] {
    if (!this.parentInstanceId) {
      return this.model.selections;
    }
    const found = this.find(this.model.selections, this.parentInstanceId);
    return found?.children ?? [];
  }

  private writeParent(next: RosterSelection[]): void {
    if (!this.parentInstanceId) {
      this.roster.setSelections(this.model.instanceId, next);
      return;
    }
    const cloned = structuredClone(this.model.selections);
    const found = this.find(cloned, this.parentInstanceId);
    if (found) {
      found.children = next;
      this.roster.setSelections(this.model.instanceId, cloned);
    }
  }

  private find(list: RosterSelection[], id: string): RosterSelection | undefined {
    for (const s of list) {
      if (s.instanceId === id) {
        return s;
      }
      const nested = this.find(s.children, id);
      if (nested) {
        return nested;
      }
    }
    return undefined;
  }

  toggleOpen(): void {
    this.open = !this.open;
  }
}
