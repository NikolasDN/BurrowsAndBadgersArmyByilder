import { Component, Input, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RosterModel } from '../../models/roster';
import { RosterService } from '../../services/roster.service';
import { CatalogueService } from '../../services/catalogue.service';
import { OptionGroupComponent } from '../option-group/option-group.component';
import { groupHasVisibleOptions, resolveGroupChildren } from '../../data/modifiers';
import { equipmentBuckets } from '../../data/stats';

@Component({
  selector: 'app-model-card',
  imports: [FormsModule, OptionGroupComponent],
  templateUrl: './model-card.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './model-card.component.scss',
})
export class ModelCardComponent {
  @Input({ required: true }) model!: RosterModel;

  private readonly roster = inject(RosterService);
  private readonly catalogue = inject(CatalogueService);

  expanded = false;

  get stats() {
    return this.roster.modelStats(this.model);
  }

  get pennies(): number {
    return this.roster.modelPennies(this.model);
  }

  get buckets() {
    return equipmentBuckets(this.catalogue.getIndex(), this.model);
  }

  get characterChildren() {
    const group = this.catalogue.characterGroup();
    if (!group) {
      return [];
    }
    const index = this.catalogue.getIndex();
    const resolved = resolveGroupChildren(group, index.entries, index.groups);
    const ctx = this.roster.ctx(this.model);
    return resolved.groups.filter((g) =>
      groupHasVisibleOptions(g, ctx, index.entries, index.groups),
    );
  }

  get setupSelected(): boolean {
    return this.model.selections.some((s) => s.entryId === 'cee3-9887-9ffb-1cae');
  }

  rename(name: string): void {
    this.roster.patchModel(this.model.instanceId, { name });
  }

  setFate(fate: number): void {
    this.roster.patchModel(this.model.instanceId, { fate: clamp(fate, 0, 16) });
  }

  setExp(exp: number): void {
    this.roster.patchModel(this.model.instanceId, { exp: clamp(exp, 0, 16) });
  }

  toggleSetup(): void {
    if (this.setupSelected) {
      this.roster.setSelections(
        this.model.instanceId,
        this.model.selections.filter((s) => s.entryId !== 'cee3-9887-9ffb-1cae'),
      );
    } else {
      const setup = this.catalogue.entry('cee3-9887-9ffb-1cae');
      this.roster.setSelections(this.model.instanceId, [
        this.roster.newSelection(setup?.id ?? 'cee3-9887-9ffb-1cae', '', setup?.name ?? 'Setup Only'),
        ...this.model.selections,
      ]);
    }
  }

  remove(): void {
    this.roster.removeModel(this.model.instanceId);
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
