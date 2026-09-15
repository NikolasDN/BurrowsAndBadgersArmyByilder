import { Component, Input } from '@angular/core';
import { EMPTY_STATS, RosterModel, UnitStats } from '../../models/roster';

@Component({
  selector: 'app-print-beast',
  templateUrl: './print-beast.component.html',
  styleUrl: './print-beast.component.scss',
})
export class PrintBeastComponent {
  @Input() model: RosterModel | null = null;
  @Input() stats: UnitStats = EMPTY_STATS;
  @Input() weapons: string[] = [];
  @Input() armour: string[] = [];
  @Input() items: string[] = [];
  @Input() special: string[] = [];
  @Input() skills: string[] = [];

  boxes(filled: number): boolean[] {
    return Array.from({ length: 16 }, (_, i) => i < filled);
  }
}
