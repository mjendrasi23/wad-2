import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: false,
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.scss',
})
export class EmptyState {
  @Input({ required: true }) title!: string;
  @Input() message?: string;
  @Input() icon?: string;

  @Input() primaryActionLabel?: string;
  @Input() primaryActionLink?: string;

  @Input() secondaryActionLabel?: string;
  @Input() secondaryActionLink?: string;
}
