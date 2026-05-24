import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LayoutStore } from '../../core/services/layout.store';
import { CompetitionStore } from '../../core/services/competition.store';
import { LiveDataService } from '../../core/services/live-data.service';

@Component({
  selector: 'app-layout-list',
  imports: [FormsModule, RouterLink],
  templateUrl: './layout-list.component.html',
  styleUrl: './layout-list.component.scss',
})
export class LayoutListComponent {
  protected readonly store = inject(LayoutStore);
  protected readonly competition = inject(CompetitionStore);
  private readonly liveData = inject(LiveDataService);
  protected newLayoutName = signal('');
  protected nameError = signal('');

  activate(id: string): void {
    this.store.setActiveLayout(id);
  }

  deleteLayout(id: string): void {
    this.store.deleteLayout(id);
  }

  setLaneCount(value: string): void {
    const n = parseInt(value, 10);
    if (n >= 1 && n <= 10) this.competition.setLaneCount(n);
  }

  enableLive(): void {
    this.liveData.start();
  }

  disableLive(): void {
    this.liveData.stop();
  }

  createLayout(): void {
    const name = this.newLayoutName().trim();
    if (!name) {
      this.nameError.set('Layout name is required.');
      return;
    }
    if (this.store.layouts().some((l) => l.name === name)) {
      this.nameError.set('A layout with this name already exists.');
      return;
    }
    this.store.createLayout(name);
    this.newLayoutName.set('');
    this.nameError.set('');
  }
}
