import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-skeleton-cards',
  standalone: false,
  templateUrl: './skeleton-cards.html',
  styleUrl: './skeleton-cards.scss',
})
export class SkeletonCards {
  @Input() count = 9;
  @Input() variant: 'recipe' | 'list' = 'recipe';

  get items(): number[] {
    return Array.from({ length: this.count }, (_, idx) => idx);
  }
}
