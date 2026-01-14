import { Component, inject } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { shareReplay } from 'rxjs';
import { CategoriesApi } from '../../../../api/apis/categories-api';
import { RecipesApi } from '../../../../api/apis/recipes-api';
import { RecipeDetail, RecipeUpsert } from '../../../../api/models/recipe';
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
  private readonly confirm = inject(ConfirmService);

  readonly recipeId = this.route.snapshot.paramMap.get('id');
  readonly isEdit = !!this.recipeId;

  readonly categories$ = this.categoriesApi.list().pipe(shareReplay(1));

  readonly form = this.fb.nonNullable.group({
    title: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(120)]),
    description: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(1200)]),
    imageUrl: this.fb.nonNullable.control(''),
    categoryId: this.fb.nonNullable.control('', [Validators.required]),
    tags: this.fb.nonNullable.control(''),
    isPublic: this.fb.nonNullable.control(true),
    ingredients: this.fb.nonNullable.array<IngredientGroup>([]),
    steps: this.fb.nonNullable.array<FormControl<string>>([]),
  });

  saving = false;

  get ingredients(): FormArray<IngredientGroup> {
    return this.form.controls.ingredients;
  }

  get steps(): FormArray<FormControl<string>> {
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

  addStep(value = ''): void {
    this.steps.push(this.fb.nonNullable.control(value, [Validators.required]));
  }

  removeStep(idx: number): void {
    this.steps.removeAt(idx);
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const raw = this.form.getRawValue();
    const payload: RecipeUpsert = {
      title: raw.title,
      description: raw.description,
      imageUrl: raw.imageUrl.trim() || undefined,
      categoryId: raw.categoryId,
      tags: parseTags(raw.tags),
      ingredients: raw.ingredients,
      steps: raw.steps,
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
}

function parseTags(input: string): string[] {
  return input
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

type IngredientGroup = FormGroup<{ text: FormControl<string> }>;
