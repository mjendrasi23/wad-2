import { Component } from '@angular/core';

@Component({
  selector: 'app-authors-page',
  standalone: false,
  templateUrl: './authors-page.html',
  styleUrl: './authors-page.scss',
})
export class AuthorsPage {
  readonly authors = [
    { name: 'Marina Jendrašić', role: 'Student', email: 'marina@example.com' },
    { name: 'Nurali Zholdassov', role: 'Student', email: 'nurali@example.com' },
    { name: 'Community', role: 'Recipe Contributors', email: 'community@recipenet.example' },
  ] as const;
}
