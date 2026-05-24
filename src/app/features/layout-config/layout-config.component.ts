import { Component, inject, computed, effect } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { LayoutStore } from '../../core/services/layout.store';

@Component({
  selector: 'app-layout-config',
  imports: [RouterLink],
  templateUrl: './layout-config.component.html',
  styleUrl: './layout-config.component.scss',
})
export class LayoutConfigComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(LayoutStore);

  private readonly id = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('id'))),
  );

  protected readonly layout = computed(() => {
    const id = this.id();
    return id ? this.store.layouts().find((l) => l.id === id) ?? null : null;
  });

  constructor() {
    effect(() => {
      const id = this.id();
      if (id) this.store.setActiveLayout(id);
    });
  }
}
