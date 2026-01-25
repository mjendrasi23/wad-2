import { Component, inject } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { shareReplay } from 'rxjs';
import { CategoriesApi } from '../../../../api/apis/categories-api';
import { RecipesApi } from '../../../../api/apis/recipes-api';
import { UploadsApi } from '../../../../api/apis/uploads-api';
import { ImageCrop, RecipeDetail, RecipeStep, RecipeUpsert } from '../../../../api/models/recipe';
import { ConfirmService } from '../../../../shared/services/confirm.service';

@Component({
  selector: 'app-recipe-form-page',
  standalone: false,
  templateUrl: './recipe-form-page.html',
  styleUrl: './recipe-form-page.scss',
})
export class RecipeFormPage {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly recipesApi = inject(RecipesApi);
  private readonly categoriesApi = inject(CategoriesApi);
  private readonly uploadsApi = inject(UploadsApi);
  private readonly confirm = inject(ConfirmService);

  readonly recipeId = this.route.snapshot.paramMap.get('id');
  readonly isEdit = !!this.recipeId;

  readonly categories$ = this.categoriesApi.list().pipe(shareReplay(1));

  readonly form = this.fb.nonNullable.group({
    title: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(120)]),
    description: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(1200)]),
    imageUrl: this.fb.nonNullable.control(''),
    imageCrop: this.fb.nonNullable.group({
      originX: this.fb.nonNullable.control(50),
      originY: this.fb.nonNullable.control(50),
      zoom: this.fb.nonNullable.control(1),
    }),
    categoryId: this.fb.nonNullable.control('', [Validators.required]),
    tags: this.fb.nonNullable.control(''),
    isPublic: this.fb.nonNullable.control(true),
    ingredients: this.fb.nonNullable.array<IngredientGroup>([]),
    steps: this.fb.nonNullable.array<StepGroup>([]),
  });

  saving = false;
  uploadingImage = false;

  private cropDrag:
    | {
        pointerId: number;
        startClientX: number;
        startClientY: number;
        startOriginX: number;
        startOriginY: number;
        frameWidth: number;
        frameHeight: number;
      }
    | undefined;

  get ingredients(): FormArray<IngredientGroup> {
    return this.form.controls.ingredients;
  }

  get steps(): FormArray<StepGroup> {
    return this.form.controls.steps;
  }

  constructor() {
    if (this.isEdit && this.recipeId) {
      this.recipesApi.getById(this.recipeId).subscribe((recipe) => this.loadRecipe(recipe));
    } else {
      this.addIngredient();
      this.addStep();
    }
  }

  addIngredient(value = ''): void {
    this.ingredients.push(this.createIngredientGroup(value));
  }

  removeIngredient(idx: number): void {
    this.ingredients.removeAt(idx);
  }

  addStep(value?: Partial<RecipeStep>): void {
    this.steps.push(this.createStepGroup(value));
  }

  removeStep(idx: number): void {
    this.steps.removeAt(idx);
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const raw = this.form.getRawValue();
    const steps: RecipeStep[] = (raw.steps || [])
      .map((s: any) => ({ text: String(s.text ?? '').trim() }))
      .filter((s: RecipeStep) => s.text);

    const payload: RecipeUpsert = {
      title: raw.title,
      description: raw.description,
      imageUrl: raw.imageUrl.trim() || undefined,
      imageCrop: raw.imageUrl.trim() ? this.clampCrop(raw.imageCrop) : undefined,
      categoryId: raw.categoryId,
      tags: parseTags(raw.tags),
      ingredients: raw.ingredients,
      steps,
      isPublic: raw.isPublic,
    };

    this.saving = true;

    const req$ = this.isEdit && this.recipeId ? this.recipesApi.update(this.recipeId, payload) : this.recipesApi.create(payload);
    req$.subscribe({
      next: (res) => void this.router.navigate(['/recipes', res.id]),
      complete: () => (this.saving = false),
    });
  }

  delete(): void {
    if (!this.recipeId) return;
    this.confirm
      .open({
        title: 'Delete recipe?',
        message: 'This cannot be undone.',
        confirmText: 'Delete',
        tone: 'danger',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.recipesApi.delete(this.recipeId!).subscribe(() => void this.router.navigateByUrl('/my-recipes'));
      });
  }

  private loadRecipe(recipe: RecipeDetail): void {
    this.form.patchValue({
      title: recipe.title,
      description: recipe.description,
      imageUrl: recipe.imageUrl ?? '',
      imageCrop: recipe.imageCrop ?? { originX: 50, originY: 50, zoom: 1 },
      categoryId: recipe.categoryId,
      tags: recipe.tags.join(', '),
      isPublic: recipe.isPublic,
    });

    this.ingredients.clear();
    for (const i of recipe.ingredients) this.addIngredient(i.text);
    if (!recipe.ingredients.length) this.addIngredient();

    this.steps.clear();
    for (const s of recipe.steps) this.addStep(s);
    if (!recipe.steps.length) this.addStep();
  }

  private createIngredientGroup(text: string): IngredientGroup {
    return this.fb.nonNullable.group({
      text: this.fb.nonNullable.control(text, [Validators.required]),
    });
  }

  onImageFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;

    this.uploadingImage = true;
    this.uploadsApi.uploadRecipeImage(file).subscribe({
      next: (url) => {
        this.form.controls.imageUrl.setValue(url);
        this.resetCrop();
      },
      complete: () => {
        this.uploadingImage = false;
        if (input) input.value = '';
      },
    });
  }

  get cropPreview(): ImageCrop {
    return this.clampCrop(this.form.controls.imageCrop.getRawValue());
  }

  setZoom(value: unknown): void {
    const zoom = Number(value);
    if (!Number.isFinite(zoom)) return;
    this.form.controls.imageCrop.controls.zoom.setValue(zoom);
  }

  resetCrop(): void {
    this.form.controls.imageCrop.setValue({ originX: 50, originY: 50, zoom: 1 });
  }

  cropPointerDown(event: PointerEvent): void {
    if (!this.form.controls.imageUrl.value) return;
    const el = event.currentTarget as HTMLElement | null;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const crop = this.cropPreview;
    this.cropDrag = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOriginX: crop.originX,
      startOriginY: crop.originY,
      frameWidth: rect.width,
      frameHeight: rect.height,
    };

    el.setPointerCapture(event.pointerId);
  }

  cropPointerMove(event: PointerEvent): void {
    if (!this.cropDrag || event.pointerId !== this.cropDrag.pointerId) return;
    const crop = this.cropPreview;
    const zoom = crop.zoom || 1;

    const dx = event.clientX - this.cropDrag.startClientX;
    const dy = event.clientY - this.cropDrag.startClientY;
    const deltaX = (dx / this.cropDrag.frameWidth) * 100 * (1 / zoom);
    const deltaY = (dy / this.cropDrag.frameHeight) * 100 * (1 / zoom);

    this.form.controls.imageCrop.patchValue({
      originX: this.cropDrag.startOriginX - deltaX,
      originY: this.cropDrag.startOriginY - deltaY,
    });
  }

  cropPointerUp(event: PointerEvent): void {
    if (!this.cropDrag || event.pointerId !== this.cropDrag.pointerId) return;
    this.form.controls.imageCrop.setValue(this.cropPreview);
    this.cropDrag = undefined;
  }

  private clampCrop(crop: ImageCrop): ImageCrop {
    const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
    return {
      originX: clamp(Number(crop.originX ?? 50), 0, 100),
      originY: clamp(Number(crop.originY ?? 50), 0, 100),
      zoom: clamp(Number(crop.zoom ?? 1), 1, 4),
    };
  }

  private createStepGroup(value?: Partial<RecipeStep>): StepGroup {
    return this.fb.nonNullable.group({
      text: this.fb.nonNullable.control(String(value?.text ?? ''), [Validators.required, Validators.maxLength(2000)]),
    });
  }
}

function parseTags(input: string): string[] {
  return input
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

type IngredientGroup = FormGroup<{ text: FormControl<string> }>;
type StepGroup = FormGroup<{
  text: FormControl<string>;
}>;
