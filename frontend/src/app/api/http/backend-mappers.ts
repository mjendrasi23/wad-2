import { Category } from '../models/category';
import { Comment } from '../models/comment';
import { PagedResult } from '../models/paging';
import { Rating, RatingSummary } from '../models/rating';
import { ImageCrop, RecipeDetail, RecipeIngredient, RecipeListItem, RecipeStep } from '../models/recipe';
import { User, UserRole } from '../models/user';

export function roleFromRoleId(roleId: number): UserRole {
  if (roleId === 1) return 'admin';
  if (roleId === 2) return 'manager';
  if (roleId === 4) return 'explorer';
  return 'creator';
}

export function userFromAuthPayload(payload: any): User | null {
  const u = payload?.user;
  if (!u) return null;
  return {
    id: String(u.user_id),
    name: u.username,
    email: u.email ?? '',
    role: roleFromRoleId(Number(u.role_id)),
    createdAt: u.created_at ?? new Date().toISOString(),
  };
}

export function categoryFromBackend(row: any): Category {
  return {
    id: String(row.category_id ?? row.id),
    name: row.name ?? '',
    description: row.description ?? '',
    createdAt: row.created_at ?? new Date().toISOString(),
    imageUrl: row.image_url ?? row.imageUrl ?? undefined,
  };
}

function ensureTags(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
}

function ingredientText(row: any): string {
  const name = String(row.ingredient_name ?? row.name ?? '').trim();
  const quantity = row.quantity != null ? String(row.quantity) : '';
  const unit = String(row.unit ?? '').trim();
  return [quantity, unit, name].filter((p) => String(p).trim()).join(' ');
}

function normalizePublicUrl(input: string): string {
  const raw = String(input ?? '').trim();
  if (!raw) return '/pictures/placeholder.png';
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;

  const url = raw.replace(/\\/g, '/');
  if (url.startsWith('/uploads/') || url.startsWith('/pictures/')) return url;
  if (url.startsWith('./uploads/')) return '/uploads/' + url.slice('./uploads/'.length);
  if (url.startsWith('uploads/')) return '/uploads/' + url.slice('uploads/'.length);
  if (url.startsWith('./pictures/')) return '/pictures/' + url.slice('./pictures/'.length);
  if (url.startsWith('pictures/')) return '/pictures/' + url.slice('pictures/'.length);
  return url;
}

function imageCropFromBackend(row: any): ImageCrop | undefined {
  const raw = row?.image_crop ?? row?.imageCrop ?? row?.image_crop_json;
  return imageCropFromRaw(raw);
}

function imageCropFromRaw(raw: any): ImageCrop | undefined {
  if (!raw) return undefined;

  let obj: any = raw;
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) return undefined;
    try {
      obj = JSON.parse(s);
    } catch {
      return undefined;
    }
  }

  const originX = Number(obj?.originX ?? obj?.x);
  const originY = Number(obj?.originY ?? obj?.y);
  const zoom = Number(obj?.zoom ?? obj?.scale);
  if (!Number.isFinite(originX) || !Number.isFinite(originY) || !Number.isFinite(zoom)) return undefined;

  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
  return { originX: clamp(originX, 0, 100), originY: clamp(originY, 0, 100), zoom: clamp(zoom, 1, 4) };
}

export function recipeListItemFromBackend(row: any): RecipeListItem {
  const imageUrl = normalizePublicUrl(String(row.image_path ?? row.imageUrl ?? ''));
  return {
    id: String(row.recipe_id),
    title: row.title ?? '',
    description: row.description ?? '',
    imageUrl,
    imageCrop: imageCropFromBackend(row),
    categoryId: String(row.category_id ?? ''),
    tags: ensureTags(row.tags),
    authorId: String(row.user_id ?? ''),
    createdAt: row.created_at ?? new Date().toISOString(),
    views: Number(row.views ?? 0) || 0,
    avgRating: Number(row.average_rating ?? row.avgRating ?? 0) || 0,
    ratingsCount: Number(row.ratingsCount ?? row.ratings_count ?? 0) || 0,
    favoritesCount: Number(row.favoritesCount ?? row.favorites_count ?? 0) || 0,
  };
}

function splitStepsText(steps: string): string[] {
  const raw = String(steps ?? '').trim();
  if (!raw) return [];
  if (raw.includes('\n')) return raw.split('\n').map((s) => s.trim()).filter(Boolean);
  const numbered = raw.split(/\s*\d+\.\s*/g).map((s) => s.trim()).filter(Boolean);
  if (numbered.length > 1) return numbered;
  return [raw];
}

function stepsFromBackend(row: any): RecipeStep[] {
  const stepsJson = row?.steps_json ?? row?.stepsJson;
  if (stepsJson) {
    let arr: any = stepsJson;
    if (typeof stepsJson === 'string') {
      const s = stepsJson.trim();
      if (!s) return [];
      try {
        arr = JSON.parse(s);
      } catch {
        arr = null;
      }
    }

    if (Array.isArray(arr)) {
      return arr
        .map((it: any) => {
          const text = String(it?.text ?? '').trim();
          if (!text) return null;
          return { text } satisfies RecipeStep;
        })
        .filter(Boolean) as RecipeStep[];
    }
  }

  return splitStepsText(row.steps ?? '').map((text) => ({ text }));
}

export function recipeDetailFromBackend(row: any): RecipeDetail {
  const base = recipeListItemFromBackend(row);
  const ingredients: RecipeIngredient[] = Array.isArray(row.ingredients)
    ? row.ingredients.map((i: any) => ({ text: ingredientText(i) })).filter((i: any) => i.text.trim())
    : [];

  return {
    ...base,
    ingredients,
    steps: stepsFromBackend(row),
    isPublic: true,
  };
}

export function commentFromBackend(row: any): Comment {
  return {
    id: String(row.comment_id),
    recipeId: String(row.recipe_id),
    authorId: String(row.user_id),
    authorName: row.username ?? undefined,
    body: row.content ?? '',
    createdAt: row.created_at ?? new Date().toISOString(),
    status: 'active',
  };
}

export function ratingFromBackend(row: any): Rating {
  return {
    id: String(row.rating_id),
    recipeId: String(row.recipe_id),
    userId: String(row.user_id),
    value: Number(row.rating_value ?? row.value ?? 0) || 0,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

export function ratingSummaryFromBackend(row: any): RatingSummary {
  return {
    recipeId: String(row.recipeId ?? row.recipe_id),
    avgRating: Number(row.avgRating ?? row.average_rating ?? 0) || 0,
    count: Number(row.count ?? 0) || 0,
    myRating: row.myRating != null ? Number(row.myRating) : undefined,
  };
}

export function mapPagedResult<TIn, TOut>(result: PagedResult<TIn>, mapItem: (i: TIn) => TOut): PagedResult<TOut> {
  return { ...result, items: (result.items || []).map(mapItem) };
}
