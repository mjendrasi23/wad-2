import { MockDb } from './mock-db';
import { createRng, id, nowIso } from './mock-utils';
import { User, UserPrivate } from '../models/user';
import { Category } from '../models/category';
import { ImageCrop, Recipe, RecipeIngredient, RecipeStep } from '../models/recipe';
import { Comment } from '../models/comment';
import { Rating } from '../models/rating';
import { Favorite } from '../models/favorite';
import { Report } from '../models/report';

const TAGS = [
  'quick',
  'family',
  'spicy',
  'healthy',
  'comfort',
  'budget',
  'high-protein',
  'gluten-free',
  'vegan',
  'vegetarian',
  'one-pan',
  'weeknight',
  'meal-prep',
  'dessert',
  'breakfast',
];

const CATEGORY_NAMES = [
  'Breakfast',
  'Lunch',
  'Dinner',
  'Desserts',
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Soups',
  'Salads',
  'Baking',
];

function seedUsers(): { users: User[]; userPrivate: UserPrivate[] } {
  const createdAt = nowIso();
  const users: User[] = [
    { id: 'u_demo', name: 'Demo User', email: 'user@demo.com', role: 'creator', createdAt },
    { id: 'u_manager', name: 'Demo Manager', email: 'manager@demo.com', role: 'manager', createdAt },
    { id: 'u_admin', name: 'Demo Admin', email: 'admin@demo.com', role: 'admin', createdAt },
  ];

  const privateRows: UserPrivate[] = [
    { userId: 'u_demo', password: 'Password123!' },
    { userId: 'u_manager', password: 'Password123!' },
    { userId: 'u_admin', password: 'Password123!' },
  ];

  const extra: Array<Pick<User, 'name' | 'email' | 'role'>> = [
    { name: 'Ava Cook', email: 'ava@example.com', role: 'explorer' },
    { name: 'Noah Baker', email: 'noah@example.com', role: 'creator' },
    { name: 'Mia Chen', email: 'mia@example.com', role: 'explorer' },
    { name: 'Liam Patel', email: 'liam@example.com', role: 'explorer' },
    { name: 'Sophia Nguyen', email: 'sophia@example.com', role: 'creator' },
    { name: 'Ethan Rivera', email: 'ethan@example.com', role: 'explorer' },
    { name: 'Isabella Rossi', email: 'isabella@example.com', role: 'explorer' },
    { name: 'Lucas Silva', email: 'lucas@example.com', role: 'explorer' },
    { name: 'Charlotte King', email: 'charlotte@example.com', role: 'explorer' },
  ];

  extra.forEach((u, idx) => {
    const userId = id('u', idx + 1);
    users.push({ id: userId, name: u.name, email: u.email, role: u.role, createdAt });
    privateRows.push({ userId, password: 'Password123!' });
  });

  return { users, userPrivate: privateRows };
}

function seedCategories(): Category[] {
  const createdAt = nowIso();
  return CATEGORY_NAMES.map((name, idx) => ({
    id: id('c', idx + 1),
    name,
    description: `Hand-picked ${name.toLowerCase()} recipes with clean ingredients and cozy vibes.`,
    imageUrl: `https://picsum.photos/seed/category-${idx + 1}/1200/700`,
    createdAt,
  }));
}

function ingredientsFor(title: string, rng: ReturnType<typeof createRng>): RecipeIngredient[] {
  const base = [
    'Olive oil',
    'Salt',
    'Black pepper',
    'Garlic',
    'Lemon',
    'Onion',
    'Butter',
    'Flour',
    'Eggs',
    'Milk',
    'Tomatoes',
  ];

  const picks = rng.pickMany(base, rng.int(5, 8));
  const extra = `${title.split(' ')[0]} (optional)`;
  return [...picks, extra].map((text) => ({ text }));
}

function stepsFor(seed: string, rng: ReturnType<typeof createRng>): RecipeStep[] {
  const crop: ImageCrop = { originX: 50, originY: 50, zoom: 1 };
  const texts = [
    'Prep ingredients and preheat as needed.',
    'Mix and season until balanced.',
    'Cook over medium heat, stirring occasionally.',
    'Taste and adjust seasoning.',
    'Serve and garnish.',
  ];
  return texts.slice(0, rng.int(3, 5)).map((text, idx) => ({
    text,
    imageUrl: `https://picsum.photos/seed/${seed}-step-${idx + 1}/900/900`,
    imageCrop: crop,
  }));
}

function seedRecipes(users: User[], categories: Category[]): Recipe[] {
  const rng = createRng(1337);
  const now = nowIso();

  const titles = [
    'Lemon Garlic Pasta',
    'One-Pan Chicken & Veggies',
    'Creamy Tomato Soup',
    'Sheet Pan Nachos',
    'Classic Banana Bread',
    'Crispy Tofu Bowl',
    'Overnight Oats',
    'Spicy Chickpea Curry',
    'Berry Yogurt Parfait',
    'Herb Roasted Potatoes',
  ];

  const recipes: Recipe[] = [];
  for (let i = 1; i <= 50; i++) {
    const title = `${rng.pick(titles)} #${i}`;
    const category = rng.pick(categories);
    const author = rng.pick(users);

    recipes.push({
      id: id('r', i),
      title,
      description:
        'A modern, approachable recipe with clear steps, minimal fuss, and maximum flavor. Perfect for weeknights.',
      imageUrl: `https://picsum.photos/seed/recipe-${i}/1200/800`,
      categoryId: category.id,
      tags: rng.pickMany(TAGS, rng.int(2, 5)),
      ingredients: ingredientsFor(title, rng),
      steps: stepsFor(`recipe-${i}`, rng),
      authorId: author.id,
      createdAt: now,
      updatedAt: now,
      isPublic: true,
      views: rng.int(0, 2500),
    });
  }

  return recipes;
}

function seedRatings(users: User[], recipes: Recipe[]): Rating[] {
  const rng = createRng(2024);
  const ratings: Rating[] = [];
  let n = 1;

  for (const recipe of recipes) {
    const count = rng.int(0, 10);
    const raters = rng.pickMany(
      users.filter((u) => u.role !== 'manager'),
      Math.min(count, users.length)
    );
    for (const rater of raters) {
      ratings.push({
        id: id('rate', n++),
        recipeId: recipe.id,
        userId: rater.id,
        value: rng.int(2, 5),
        createdAt: nowIso(),
      });
    }
  }

  return ratings;
}

function seedComments(users: User[], recipes: Recipe[]): Comment[] {
  const rng = createRng(777);
  const comments: Comment[] = [];
  let n = 1;

  const snippets = [
    'Made this tonight—so good!',
    'Loved the flavors. Will make again.',
    'I swapped in what I had and it worked great.',
    'Perfect weeknight recipe.',
    'Next time I’ll add more spice.',
    'My family asked for seconds.',
  ];

  for (const recipe of recipes.slice(0, 30)) {
    const count = rng.int(0, 4);
    const authors = rng.pickMany(users, Math.min(count, users.length));
    for (const author of authors) {
      comments.push({
        id: id('com', n++),
        recipeId: recipe.id,
        authorId: author.id,
        body: rng.pick(snippets),
        createdAt: nowIso(),
        status: 'active',
      });
    }
  }

  return comments;
}

function seedFavorites(users: User[], recipes: Recipe[]): Favorite[] {
  const rng = createRng(5150);
  const favorites: Favorite[] = [];
  let n = 1;

  for (const user of users.filter((u) => u.role !== 'manager')) {
    const count = rng.int(0, 12);
    const picks = rng.pickMany(recipes, Math.min(count, recipes.length));
    for (const recipe of picks) {
      favorites.push({ id: id('fav', n++), recipeId: recipe.id, userId: user.id, createdAt: nowIso() });
    }
  }

  return favorites;
}

function seedReports(users: User[], recipes: Recipe[], comments: Comment[]): Report[] {
  const rng = createRng(9001);
  const reports: Report[] = [];
  let n = 1;

  const reasons = ['Spam', 'Inappropriate', 'Copyright', 'Harassment', 'Other'];

  const reportableComments = comments.slice(0, 12);
  const reportableRecipes = recipes.slice(0, 10);

  for (const c of reportableComments) {
    reports.push({
      id: id('rep', n++),
      reporterId: rng.pick(users).id,
      targetType: 'comment',
      targetId: c.id,
      reason: rng.pick(reasons),
      details: 'This feels off for a recipe site.',
      status: rng.pick(['open', 'open', 'resolved']),
      createdAt: nowIso(),
    });
  }

  for (const r of reportableRecipes) {
    reports.push({
      id: id('rep', n++),
      reporterId: rng.pick(users).id,
      targetType: 'recipe',
      targetId: r.id,
      reason: rng.pick(reasons),
      details: 'Please review this content.',
      status: rng.pick(['open', 'removed', 'resolved']),
      createdAt: nowIso(),
    });
  }

  return reports;
}

export function seedMockDb(): MockDb {
  const { users, userPrivate } = seedUsers();
  const categories = seedCategories();
  const recipes = seedRecipes(users, categories);
  const comments = seedComments(users, recipes);
  const ratings = seedRatings(users, recipes);
  const favorites = seedFavorites(users, recipes);
  const reports = seedReports(users, recipes, comments);

  return {
    version: 1,
    users,
    userPrivate,
    categories,
    recipes,
    comments,
    ratings,
    favorites,
    reports,
  };
}

