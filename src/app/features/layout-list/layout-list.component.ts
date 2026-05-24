import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LayoutStore } from '../../core/services/layout.store';
import { CompetitionStore } from '../../core/services/competition.store';
import { LiveDataService } from '../../core/services/live-data.service';
import { ALL_MESSAGE_TYPES } from '../../core/api/api.models';

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
