import { Component, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Category } from '../../../../api/models/category';
import { CategoryUpsert } from '../../../../api/apis/categories-api';

@Component({
  selector: 'app-category-dialog',
  standalone: false,
  templateUrl: './category-dialog.html',
  styleUrl: './category-dialog.scss',
})
export class CategoryDialog {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<CategoryDialog, CategoryUpsert | null>);
  readonly data = inject(MAT_DIALOG_DATA) as Category | null;

  readonly form = this.fb.nonNullable.group({
    name: this.fb.nonNullable.control(this.data?.name ?? '', [Validators.required, Validators.maxLength(60)]),
    description: this.fb.nonNullable.control(this.data?.description ?? '', [Validators.required, Validators.maxLength(200)]),
    imageUrl: this.fb.nonNullable.control(this.data?.imageUrl ?? ''),
  });

  close(): void {
    this.dialogRef.close(null);
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const raw = this.form.getRawValue();
    this.dialogRef.close({
      name: raw.name.trim(),
      description: raw.description.trim(),
      imageUrl: raw.imageUrl.trim() || undefined,
    });
  }
}
