import { Component, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, map, shareReplay, startWith, switchMap } from 'rxjs';
import { CategoriesApi } from '../../../../api/apis/categories-api';
import { Category } from '../../../../api/models/category';
import { ConfirmService } from '../../../../shared/services/confirm.service';
import { CategoryDialog } from '../../components/category-dialog/category-dialog';

@Component({
  selector: 'app-categories-page',
  standalone: false,
  templateUrl: './categories-page.html',
  styleUrl: './categories-page.scss',
})
export class CategoriesPage {
  private readonly categoriesApi = inject(CategoriesApi);
  private readonly dialog = inject(MatDialog);
  private readonly confirm = inject(ConfirmService);

  private readonly refreshSubject = new BehaviorSubject<void>(undefined);

  readonly vm$ = this.refreshSubject.pipe(
    switchMap(() =>
      this.categoriesApi.list().pipe(
        map((categories) => ({ loading: false, categories })),
        startWith({ loading: true, categories: [] as Category[] })
      )
    ),
    shareReplay(1)
  );

  openCreate(): void {
    this.dialog
      .open(CategoryDialog, { width: '520px', data: null })
      .afterClosed()
      .subscribe((value) => {
        if (!value) return;
        this.categoriesApi.create(value).subscribe(() => this.refreshSubject.next());
      });
  }

  openEdit(category: Category): void {
    this.dialog
      .open(CategoryDialog, { width: '520px', data: category })
      .afterClosed()
      .subscribe((value) => {
        if (!value) return;
        this.categoriesApi.update(category.id, value).subscribe(() => this.refreshSubject.next());
      });
  }

  delete(category: Category): void {
    this.confirm
      .open({
        title: 'Delete category?',
        message: `Delete “${category.name}”? This cannot be undone.`,
        confirmText: 'Delete',
        tone: 'danger',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.categoriesApi.delete(category.id).subscribe(() => this.refreshSubject.next());
      });
  }
}
