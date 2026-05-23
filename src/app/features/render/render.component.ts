import { Component, inject } from '@angular/core';
import { LayoutStore } from '../../core/services/layout.store';

@Component({
  selector: 'app-render',
  imports: [],
  templateUrl: './render.component.html',
  styleUrl: './render.component.scss',
})
export class RenderComponent {
  protected readonly store = inject(LayoutStore);
}
