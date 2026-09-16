import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CatalogueService } from '../../services/catalogue.service';
import { RosterService } from '../../services/roster.service';
import { ModelCardComponent } from '../../components/model-card/model-card.component';
import { BsSelectionEntry } from '../../models/battlescribe';
import { pennyCost, laborCost, materialCost } from '../../data/xml-parser';
import { computeStats, startingSkills } from '../../data/stats';

@Component({
  selector: 'app-builder',
  imports: [FormsModule, RouterLink, ModelCardComponent],
  templateUrl: './builder.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './builder.component.scss',
})
export class BuilderComponent implements OnInit {
  private readonly catalogue = inject(CatalogueService);
  private readonly roster = inject(RosterService);
  private readonly router = inject(Router);

  pickerOpen = false;
  query = '';
  message = '';

  get warband() {
    return this.roster.warband();
  }

  get pennies() {
    return this.roster.pennies();
  }

  get rating() {
    return this.roster.rating();
  }

  get denCosts() {
    return this.roster.denCosts();
  }

  get modelGroups() {
    const q = this.query.trim().toLowerCase();
    const index = this.catalogue.getIndex();
    return this.catalogue.modelsBySize().map((group) => ({
      ...group,
      models: group.models.filter((m) => {
        if (!q) {
          return true;
        }
        if (m.name.toLowerCase().includes(q)) {
          return true;
        }
        return startingSkills(index, m).some((skill) => skill.toLowerCase().includes(q));
      }),
    })).filter((g) => g.models.length);
  }

  get dens() {
    return this.catalogue.denUpgrades();
  }

  async ngOnInit(): Promise<void> {
    await this.catalogue.load();
    if (!this.warband) {
      void this.router.navigate(['/']);
    }
  }

  patchName(name: string): void {
    this.roster.update({ name });
  }

  patchNotes(notes: string): void {
    this.roster.update({ notes });
  }

  patchStash(stashedEquipment: string): void {
    this.roster.update({ stashedEquipment });
  }

  patchNumber(field: 'treasury' | 'labour' | 'materials' | 'pension' | 'pennyLimit', value: number): void {
    this.roster.update({ [field]: Number(value) || 0 });
  }

  patchArchetype(archetype: string): void {
    this.roster.update({ archetype });
  }

  cost(entry: BsSelectionEntry): number {
    return pennyCost(entry);
  }

  laborOf(entry: BsSelectionEntry): number {
    return laborCost(entry);
  }

  materialOf(entry: BsSelectionEntry): number {
    return materialCost(entry);
  }

  statsPreview(entry: BsSelectionEntry) {
    const fake = {
      instanceId: 'preview',
      entryId: entry.id,
      name: entry.name,
      species: entry.name,
      fate: 0,
      exp: 0,
      selections: [],
    };
    return computeStats(this.catalogue.getIndex(), fake, this.roster.ctx());
  }

  skillsOf(entry: BsSelectionEntry): string[] {
    return startingSkills(this.catalogue.getIndex(), entry);
  }

  add(entryId: string): void {
    this.roster.addModel(entryId);
    this.pickerOpen = false;
    this.query = '';
  }

  denOn(id: string): boolean {
    return this.warband?.denUpgradeIds.includes(id) ?? false;
  }

  toggleDen(id: string): void {
    this.roster.toggleDenUpgrade(id);
  }

  save(): void {
    this.roster.persistCurrent();
    this.message = 'Warband saved in this browser.';
  }

  download(): void {
    const blob = new Blob([this.roster.exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.warband?.name || 'warband'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async importFile(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) {
      return;
    }
    this.roster.importJson(await file.text());
    this.message = 'Warband loaded from file.';
  }

  print(): void {
    this.roster.persistCurrent();
    void this.router.navigate(['/print']);
  }
}
