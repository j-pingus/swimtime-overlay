import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LayoutStore } from '../../core/services/layout.store';

@Component({
  selector: 'app-config',
  imports: [FormsModule],
  templateUrl: './config.component.html',
  styleUrl: './config.component.scss',
})
export class ConfigComponent {
  protected readonly store = inject(LayoutStore);
  protected newLayoutName = signal('');
  protected nameError = signal('');

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

  selectLayout(id: string): void {
    this.store.setActiveLayout(id);
  }
}
