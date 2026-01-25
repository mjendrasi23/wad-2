import { Component } from '@angular/core';

@Component({
  selector: 'app-authors-page',
  standalone: false,
  templateUrl: './authors-page.html',
  styleUrl: './authors-page.scss',
})
export class AuthorsPage {
  readonly authors = [
    { name: 'Marina Jendrašić', role: 'Student', email: 'mjendrasi23@student.foi.hr' },
    { name: 'Nurali Zholdassov', role: 'Student', email: 'ul0299107@edu.uni.lodz.pl' },
  ] as const;
}
