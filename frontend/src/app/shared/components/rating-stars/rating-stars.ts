import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-rating-stars',
  standalone: false,
  templateUrl: './rating-stars.html',
  styleUrl: './rating-stars.scss',
})
export class RatingStars {
  readonly Math = Math;

  @Input() rating = 0;
  @Input() max = 5;
  @Input() readonly = true;
  @Input() label = 'Rating';
  @Input() showValue = true;

  @Output() rated = new EventEmitter<number>();

  stars(): number[] {
    return Array.from({ length: this.max }, (_, idx) => idx + 1);
  }

  onRate(value: number): void {
    if (this.readonly) return;
    this.rated.emit(value);
  }
}
