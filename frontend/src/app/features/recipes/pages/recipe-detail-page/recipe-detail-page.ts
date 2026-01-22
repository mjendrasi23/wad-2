import { Component, DestroyRef, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, combineLatest, finalize, forkJoin, map, of, shareReplay, startWith, switchMap } from 'rxjs';
import { CategoriesApi } from '../../../../api/apis/categories-api';
import { CommentsApi } from '../../../../api/apis/comments-api';
import { FavoritesApi } from '../../../../api/apis/favorites-api';
import { RatingsApi } from '../../../../api/apis/ratings-api';
import { RecipesApi } from '../../../../api/apis/recipes-api';
import { Comment } from '../../../../api/models/comment';
import { Rating } from '../../../../api/models/rating';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmService } from '../../../../shared/services/confirm.service';

@Component({
  selector: 'app-recipe-detail-page',
  standalone: false,
  templateUrl: './recipe-detail-page.html',
  styleUrl: './recipe-detail-page.scss',
})
export class RecipeDetailPage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly recipesApi = inject(RecipesApi);
  private readonly categoriesApi = inject(CategoriesApi);
  private readonly commentsApi = inject(CommentsApi);
  private readonly ratingsApi = inject(RatingsApi);
  private readonly favoritesApi = inject(FavoritesApi);
  private readonly auth = inject(AuthService);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(FormBuilder);

  private readonly refreshCommentsSubject = new BehaviorSubject<void>(undefined);
  private readonly refreshRatingSubject = new BehaviorSubject<void>(undefined);
  private readonly refreshFavoriteSubject = new BehaviorSubject<void>(undefined);

  readonly recipeId$ = this.route.paramMap.pipe(
    map((p) => p.get('id')!),
    shareReplay(1)
  );

  readonly recipe$ = this.recipeId$.pipe(
    switchMap((id) => this.recipesApi.getById(id)),
    shareReplay(1)
  );

  readonly category$ = combineLatest([this.recipe$, this.categoriesApi.list()]).pipe(
    map(([r, cats]) => cats.find((c) => c.id === r.categoryId) ?? null),
    shareReplay(1)
  );

  readonly canInteract$ = this.auth.user$.pipe(
    map((u) => !!u && (u.role === 'explorer' || u.role === 'creator')),
    shareReplay(1)
  );

  readonly canEdit$ = combineLatest([this.auth.user$, this.recipe$]).pipe(
    map(([u, r]) => !!u && u.role === 'creator' && r.authorId === u.id),
    shareReplay(1)
  );

  readonly rating$ = combineLatest([this.recipeId$, this.refreshRatingSubject, this.auth.user$]).pipe(
    switchMap(([id]) => this.ratingsApi.summary(id)),
    shareReplay(1)
  );

  readonly isFavorite$ = combineLatest([this.recipeId$, this.refreshFavoriteSubject, this.auth.user$]).pipe(
    switchMap(([id, _, user]) => {
      if (!user) return of(false);
      if (user.role !== 'explorer' && user.role !== 'creator') return of(false);
      return this.favoritesApi.isFavorite(id);
    }),
    shareReplay(1)
  );

  readonly commentsVm$ = combineLatest([this.recipeId$, this.refreshCommentsSubject, this.refreshRatingSubject]).pipe(
    switchMap(([id]) => {
      return forkJoin({
        comments: this.commentsApi.listByRecipe(id),
        ratings: this.ratingsApi.listByRecipe(id),
      }).pipe(
        map(({ comments, ratings }) => ({
          loading: false,
          comments: this.attachAuthorRatings(comments, ratings),
        })),
        startWith({ loading: true, comments: [] as Array<Comment & { authorRating?: number }> })
      );
    }),
    shareReplay(1)
  );

  readonly commentForm = this.fb.nonNullable.group({
    body: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(800)]),
  });

  reviewSubmitting = false;
  ratingTouched = false;
  selectedRating = 0;

  constructor() {
    this.rating$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((r) => {
      this.selectedRating = r.myRating ?? 0;
    });
  }

  toggleFavorite(recipeId: string): void {
    const user = this.auth.userSnapshot();
    if (!user || (user.role !== 'explorer' && user.role !== 'creator')) return;
    this.favoritesApi.toggle(recipeId).subscribe(() => this.refreshFavoriteSubject.next());
  }

  onReviewRate(value: number): void {
    this.ratingTouched = true;
    this.selectedRating = value;
  }

  submitReview(recipeId: string): void {
    this.commentForm.markAllAsTouched();
    this.ratingTouched = true;
    if (this.commentForm.invalid) return;
    if (this.selectedRating <= 0) return;

    const user = this.auth.userSnapshot();
    if (!user || (user.role !== 'explorer' && user.role !== 'creator')) return;

    this.reviewSubmitting = true;

    forkJoin({
      rating: this.ratingsApi.rate(recipeId, this.selectedRating),
      comment: this.commentsApi.create({ recipeId, body: this.commentForm.controls.body.value }),
    })
      .pipe(finalize(() => (this.reviewSubmitting = false)))
      .subscribe({
      next: () => {
        this.commentForm.reset({ body: '' });
        this.refreshCommentsSubject.next();
        this.refreshRatingSubject.next();
      },
    });
  }

  private attachAuthorRatings(
    comments: Comment[],
    ratings: Rating[]
  ): Array<Comment & { authorRating?: number }> {
    const bestRatingByUserId = new Map<string, Rating>();
    for (const r of ratings) {
      const existing = bestRatingByUserId.get(r.userId);
      if (!existing) {
        bestRatingByUserId.set(r.userId, r);
        continue;
      }
      if (new Date(r.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
        bestRatingByUserId.set(r.userId, r);
      }
    }

    return comments.map((c) => ({ ...c, authorRating: bestRatingByUserId.get(c.authorId)?.value }));
  }

  removeComment(comment: Comment): void {
    this.confirm
      .open({
        title: 'Remove comment?',
        message: 'This will hide the comment from public view.',
        confirmText: 'Remove',
        tone: 'danger',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.commentsApi.remove(comment.id).subscribe(() => this.refreshCommentsSubject.next());
      });
  }

  canRemoveComment(comment: Comment, recipeAuthorId: string): boolean {
    const u = this.auth.userSnapshot();
    if (!u) return false;
    if (u.role === 'admin' || u.role === 'manager') return true;
    if (comment.authorId === u.id) return true;
    return u.role === 'creator' && recipeAuthorId === u.id;
  }

  stepLabel(index: number): string {
    if (index === 0) return 'Preparation Step';
    return `Step ${index}`;
  }
}
