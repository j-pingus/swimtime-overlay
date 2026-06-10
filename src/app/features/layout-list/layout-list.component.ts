import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LayoutStore } from '../../core/services/layout.store';
import { CompetitionStore } from '../../core/services/competition.store';
import { LiveDataService } from '../../core/services/live-data.service';
import { ALL_MESSAGE_TYPES } from '../../core/api/api.models';
import { Layout } from '../../core/models/layout.model';

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

  protected newRuleType = signal('');
  protected newRuleLayoutId = signal('');
  protected newRuleDuration = signal('');

  protected readonly ruleEntries = computed(() =>
    Object.entries(this.store.messageTypeRules()).map(([type, rule]) => ({
      type,
      layoutName: this.store.layouts().find((l) => l.id === rule.layoutId)?.name ?? '(deleted)',
      layoutId: rule.layoutId,
      duration: rule.duration,
    })),
  );

  protected readonly availableMessageTypes = computed(() => {
    const configured = new Set(Object.keys(this.store.messageTypeRules()));
    return ALL_MESSAGE_TYPES.filter((t) => !configured.has(t));
  });

  activate(id: string): void {
    this.store.setActiveLayout(id);
  }

  cloneLayout(id: string): void {
    this.store.cloneLayout(id);
  }

  deleteLayout(id: string, name: string): void {
    if (!confirm(`Delete layout "${name}"? This cannot be undone.`)) return;
    this.store.deleteLayout(id);
  }

  exportLayout(layout: Layout): void {
    const json = JSON.stringify(layout, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${layout.name.replace(/[^\w\-]/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  onImportFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const layout = JSON.parse(reader.result as string) as Layout;
        if (!layout.name || !Array.isArray(layout.features)) return;
        this.store.importLayout(layout);
      } catch {
        // invalid JSON — silently ignore
      }
      input.value = '';
    };
    reader.readAsText(file);
  }

  setLaneCount(value: string): void {
    const n = parseInt(value, 10);
    if (n >= 1 && n <= 10) this.competition.setLaneCount(n);
  }

  setFirstLane(value: string): void {
    const n = parseInt(value, 10);
    if (!isNaN(n) && n >= 0) this.competition.setFirstLane(n);
  }

  enableLive(): void {
    this.liveData.start();
  }

  disableLive(): void {
    this.liveData.stop();
  }

  addRule(): void {
    const type = this.newRuleType();
    const layoutId = this.newRuleLayoutId();
    if (!type || !layoutId) return;
    const dur = parseInt(this.newRuleDuration(), 10);
    this.store.setMessageTypeRule(type, {
      layoutId,
      duration: dur > 0 ? dur : null,
    });
    this.newRuleType.set('');
    this.newRuleLayoutId.set('');
    this.newRuleDuration.set('');
  }

  removeRule(type: string): void {
    this.store.clearMessageTypeRule(type);
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
