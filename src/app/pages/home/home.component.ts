import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CatalogueService } from '../../services/catalogue.service';
import { RosterService } from '../../services/roster.service';
import { BsFaction } from '../../models/battlescribe';

@Component({
  selector: 'app-home',
  imports: [FormsModule],
  templateUrl: './home.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  private readonly catalogue = inject(CatalogueService);
  private readonly roster = inject(RosterService);
  private readonly router = inject(Router);

  factions: BsFaction[] = [];
  selectedFaction = '';
  bandName = '';
  loadError = '';
  loading = true;

  get saved() {
    return this.roster.saved();
  }

  get selectedRules() {
    return this.factions.find((f) => f.id === this.selectedFaction)?.rules ?? [];
  }

  get error() {
    return this.catalogue.error();
  }

  async ngOnInit(): Promise<void> {
    await this.catalogue.load();
    this.factions = this.catalogue.factions();
    this.selectedFaction = this.factions[0]?.id ?? '';
    this.loading = false;
  }

  start(): void {
    if (!this.selectedFaction) {
      return;
    }
    this.roster.create(this.selectedFaction, this.bandName.trim() || 'New Warband');
    void this.router.navigate(['/builder']);
  }

  open(id: string): void {
    this.roster.load(id);
    void this.router.navigate(['/builder']);
  }

  remove(id: string, event: Event): void {
    event.stopPropagation();
    this.roster.deleteSaved(id);
  }

  async importFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    try {
      this.roster.importJson(await file.text());
      void this.router.navigate(['/builder']);
    } catch (err) {
      this.loadError = err instanceof Error ? err.message : 'Could not import file';
    }
  }
}
