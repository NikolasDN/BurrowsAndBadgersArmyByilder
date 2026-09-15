import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CatalogueService } from '../../services/catalogue.service';
import { RosterService } from '../../services/roster.service';
import { RosterModel, UnitStats, EMPTY_STATS } from '../../models/roster';
import { equipmentBuckets } from '../../data/stats';
import { PrintBeastComponent } from '../../components/print-beast/print-beast.component';

export interface PrintBeast {
  model: RosterModel | null;
  stats: UnitStats;
  weapons: string[];
  armour: string[];
  items: string[];
  special: string[];
  skills: string[];
}

@Component({
  selector: 'app-print',
  imports: [RouterLink, PrintBeastComponent],
  templateUrl: './print.component.html',
  styleUrl: './print.component.scss',
})
export class PrintComponent implements OnInit {
  private readonly catalogue = inject(CatalogueService);
  private readonly roster = inject(RosterService);
  private readonly router = inject(Router);

  page1: PrintBeast[] = [];
  extraPages: PrintBeast[][] = [];
  dens: string[] = [];

  get warband() {
    return this.roster.warband();
  }

  get rating() {
    return this.roster.rating();
  }

  async ngOnInit(): Promise<void> {
    await this.catalogue.load();
    if (!this.warband) {
      void this.router.navigate(['/']);
      return;
    }
    const beasts = this.warband.models.map((model) => this.toBeast(model));
    this.page1 = this.pad(beasts.slice(0, 2), 2);
    const rest = beasts.slice(2);
    this.extraPages = [];
    for (let i = 0; i < Math.max(rest.length, 4); i += 4) {
      this.extraPages.push(this.pad(rest.slice(i, i + 4), 4));
      if (i === 0 && rest.length <= 4) {
        break;
      }
    }
    this.dens = this.warband.denUpgradeIds
      .map((id) => this.catalogue.entry(id)?.name || '')
      .filter(Boolean);
  }

  print(): void {
    window.print();
  }

  denSlot(i: number): string {
    return this.dens[i] || '';
  }

  private toBeast(model: RosterModel): PrintBeast {
    const buckets = equipmentBuckets(this.catalogue.getIndex(), model);
    return {
      model,
      stats: this.roster.modelStats(model) ?? EMPTY_STATS,
      weapons: buckets.weapons,
      armour: buckets.armour,
      items: buckets.items,
      special: buckets.special,
      skills: buckets.skills,
    };
  }

  private pad(list: PrintBeast[], size: number): PrintBeast[] {
    const empty: PrintBeast = {
      model: null,
      stats: EMPTY_STATS,
      weapons: [],
      armour: [],
      items: [],
      special: [],
      skills: [],
    };
    return [...list, ...Array.from({ length: Math.max(0, size - list.length) }, () => empty)];
  }
}
