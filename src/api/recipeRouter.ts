import { Router, Request, Response } from "express";
import { db } from "../helpers/db";
import { Recipe } from "../model/recipe";
import { HttpError } from "../helpers/errors";
import { requireRole } from "../helpers/auth";

export const recipeRouter = Router();

type SortBy = 'newest' | 'rating' | 'popularity';
type SortDir = 'asc' | 'desc';

function asStringArray(value: unknown): string[] {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(String).filter(Boolean);
    if (typeof value === 'string') return value.split(',').map((s) => s.trim()).filter(Boolean);
    return [];
}

function normalizeSteps(steps: unknown): string {
    if (Array.isArray(steps)) return steps.map(String).map((s) => s.trim()).filter(Boolean).join('\n');
    return typeof steps === 'string' ? steps : String(steps ?? '');
}

function normalizeTags(tags: unknown): string[] {
    if (!tags) return [];
    if (Array.isArray(tags)) {
        return tags
            .map((t) => (typeof t === 'string' ? t : (t as any)?.tag_name))
            .map((t) => String(t ?? '').trim())
            .filter(Boolean);
    }
    if (typeof tags === 'string') return asStringArray(tags);
    return [];
}

function parseIngredientText(text: string): { ingredient_name: string; quantity: number; unit: string } {
    const trimmed = String(text ?? '').trim();
    if (!trimmed) return { ingredient_name: '', quantity: 1, unit: '' };

    const parts = trimmed.split(/\s+/);
    const maybeQty = Number(parts[0]);
    if (!Number.isFinite(maybeQty)) return { ingredient_name: trimmed, quantity: 1, unit: '' };

    const unit = parts[1] ? String(parts[1]) : '';
    const ingredient_name = parts.slice(unit ? 2 : 1).join(' ').trim();
    return { ingredient_name: ingredient_name || trimmed, quantity: maybeQty, unit };
}

function normalizeIngredients(ingredients: unknown): Array<{ ingredient_name: string; quantity: number; unit: string }> {
    if (!Array.isArray(ingredients)) return [];
    return ingredients
        .map((i) => {
            if (typeof i === 'string') return parseIngredientText(i);
            const text = (i as any)?.text;
            if (typeof text === 'string') return parseIngredientText(text);
            return {
                ingredient_name: String((i as any)?.ingredient_name ?? '').trim(),
                quantity: Number((i as any)?.quantity ?? 1),
                unit: String((i as any)?.unit ?? '').trim(),
            };
        })
        .filter((i) => i.ingredient_name);
}

function normalizeImageCrop(input: any): { originX: number; originY: number; zoom: number } | null {
    if (!input) return null;

    let raw: any = input;
    if (typeof input === 'string') {
        const s = input.trim();
        if (!s) return null;
        try {
            raw = JSON.parse(s);
        } catch {
            return null;
        }
    }

    const originX = Number(raw?.originX ?? raw?.x ?? raw?.origin_x);
    const originY = Number(raw?.originY ?? raw?.y ?? raw?.origin_y);
    const zoom = Number(raw?.zoom ?? raw?.scale);
    if (!Number.isFinite(originX) || !Number.isFinite(originY) || !Number.isFinite(zoom)) return null;

    const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
    return {
        originX: clamp(originX, 0, 100),
        originY: clamp(originY, 0, 100),
        zoom: clamp(zoom, 1, 4),
    };
}

async function ensureTag(tag_name: string): Promise<number> {
    const name = tag_name.trim();
    if (!name) throw new HttpError(400, 'Tag name is required');
    await db.connection!.run('INSERT OR IGNORE INTO tags (tag_name) VALUES (?)', [name]);
    const row = await db.connection!.get('SELECT tag_id FROM tags WHERE tag_name = ?', [name]);
    if (!row) throw new HttpError(500, 'Failed to resolve tag');
    return row.tag_id as number;
}

async function ensureIngredient(ingredient_name: string): Promise<number> {
    const name = ingredient_name.trim();
    if (!name) throw new HttpError(400, 'Ingredient name is required');
    await db.connection!.run('INSERT OR IGNORE INTO ingredients (ingredient_name) VALUES (?)', [name]);
    const row = await db.connection!.get('SELECT ingredient_id FROM ingredients WHERE ingredient_name = ?', [name]);
    if (!row) throw new HttpError(500, 'Failed to resolve ingredient');
    return row.ingredient_id as number;
}

async function replaceRecipeTags(recipeId: number, tags: string[]): Promise<void> {
    await db.connection!.run('DELETE FROM recipe_tags WHERE recipe_id = ?', [recipeId]);
    for (const tag of tags) {
        const tagId = await ensureTag(tag);
        await db.connection!.run('INSERT OR IGNORE INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)', [recipeId, tagId]);
    }
}

async function replaceRecipeIngredients(
    recipeId: number,
    ingredients: Array<{ ingredient_name: string; quantity: number; unit: string }>
): Promise<void> {
    await db.connection!.run('DELETE FROM recipe_ingredients WHERE recipe_id = ?', [recipeId]);
    for (const i of ingredients) {
        const ingredientId = await ensureIngredient(i.ingredient_name);
        await db.connection!.run(
            'INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES (?, ?, ?, ?)',
            [recipeId, ingredientId, i.quantity ?? 1, i.unit ?? '']
        );
    }
}

async function getRecipeDetail(recipeId: number) {
    const recipe = await db.connection!.get('SELECT * FROM recipes WHERE recipe_id = ?', [recipeId]);
    if (!recipe) throw new HttpError(404, 'Recipe not found');

    const ingredients = await db.connection!.all(
        `
        SELECT i.ingredient_name, ri.quantity, ri.unit
        FROM recipe_ingredients ri
        JOIN ingredients i ON ri.ingredient_id = i.ingredient_id
        WHERE ri.recipe_id = ?
        ORDER BY i.ingredient_name ASC
        `,
        [recipeId]
    );

    const tagRows = await db.connection!.all(
        `
        SELECT t.tag_name
        FROM recipe_tags rt
        JOIN tags t ON rt.tag_id = t.tag_id
        WHERE rt.recipe_id = ?
        ORDER BY t.tag_name ASC
        `,
        [recipeId]
    );

    const favoritesCount = await db.connection!.get(
        'SELECT COUNT(*) as count FROM favorites WHERE recipe_id = ?',
        [recipeId]
    );

    const ratingsCount = await db.connection!.get(
        'SELECT COUNT(*) as count FROM ratings WHERE recipe_id = ?',
        [recipeId]
    );

    return {
        ...recipe,
        ingredients: ingredients || [],
        tags: (tagRows || []).map((t: any) => t.tag_name),
        favoritesCount: favoritesCount?.count ?? 0,
        ratingsCount: ratingsCount?.count ?? 0,
    };
}

/* old code
recipeRouter.get('/', async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;
    const search = req.query.q ? `%${req.query.q}%` : '%';

    const recipes = await db.connection!.all(
        'SELECT * FROM recipes WHERE title LIKE ? OR description LIKE ? LIMIT ? OFFSET ?',
        [search, search, limit, offset]
    );
    res.json(recipes || []);
*/ 
recipeRouter.get('/', async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 12;
    const offset = (page - 1) * pageSize;

    const textSearch = (req.query.textSearch as string | undefined)?.trim() || '';
    const categoryId = (req.query.categoryId as string | undefined)?.trim() || '';
    const tags = asStringArray(req.query.tags);
    const ingredientSearch = (req.query.ingredientSearch as string | undefined)?.trim() || '';
    const minRating = Number(req.query.minRating ?? 0) || 0;

    const sortBy = (String(req.query.sortBy || 'newest') as SortBy);
    const sortDir = (String(req.query.sortDir || 'desc') as SortDir);
    const sortDirSql = sortDir === 'asc' ? 'ASC' : 'DESC';
    const sortBySql =
        sortBy === 'rating' ? 'rec.average_rating' :
        sortBy === 'popularity' ? 'favoritesCount' :
        'rec.created_at';

    const where: string[] = [];
    const params: any[] = [];

    if (textSearch) {
        where.push('(rec.title LIKE ? OR rec.description LIKE ?)');
        const search = `%${textSearch}%`;
        params.push(search, search);
    }
    if (categoryId) {
        where.push('rec.category_id = ?');
        params.push(Number(categoryId));
    }
    if (minRating > 0) {
        where.push('rec.average_rating >= ?');
        params.push(minRating);
    }
    if (tags.length) {
        where.push(`rec.recipe_id IN (
            SELECT rt.recipe_id
            FROM recipe_tags rt
            JOIN tags t ON t.tag_id = rt.tag_id
            WHERE t.tag_name IN (${tags.map(() => '?').join(',')})
        )`);
        params.push(...tags);
    }
    if (ingredientSearch) {
        where.push(`rec.recipe_id IN (
            SELECT ri.recipe_id
            FROM recipe_ingredients ri
            JOIN ingredients i ON i.ingredient_id = ri.ingredient_id
            WHERE i.ingredient_name LIKE ?
        )`);
        params.push(`%${ingredientSearch}%`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const items = await db.connection!.all(
        `
        SELECT
            rec.*,
            COUNT(DISTINCT f.user_id) as favoritesCount,
            COUNT(DISTINCT rat.rating_id) as ratingsCount,
            COALESCE(GROUP_CONCAT(DISTINCT t.tag_name), '') as tags
        FROM recipes rec
        LEFT JOIN favorites f ON f.recipe_id = rec.recipe_id
        LEFT JOIN ratings rat ON rat.recipe_id = rec.recipe_id
        LEFT JOIN recipe_tags rt ON rt.recipe_id = rec.recipe_id
        LEFT JOIN tags t ON t.tag_id = rt.tag_id
        ${whereSql}
        GROUP BY rec.recipe_id
        ORDER BY ${sortBySql} ${sortDirSql}
        LIMIT ? OFFSET ?
        `,
        [...params, pageSize, offset]
    );

    const countRow = await db.connection!.get(
        `SELECT COUNT(*) as total FROM (SELECT rec.recipe_id FROM recipes rec ${whereSql} GROUP BY rec.recipe_id)`,
        params
    );

    res.json({
        items: (items || []).map((r: any) => ({
            ...r,
            tags: r.tags ? String(r.tags).split(',').filter(Boolean) : [],
        })),
        total: countRow?.total ?? 0,
        page,
        pageSize,
    });
});

recipeRouter.get('/mine', requireRole([1, 2, 3]), async (req: Request, res: Response) => {
    const authUser = (req as any).user;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 12;
    const offset = (page - 1) * pageSize;
    const textSearch = (req.query.textSearch as string | undefined)?.trim() || '';

    const where: string[] = ['rec.user_id = ?'];
    const params: any[] = [authUser.user_id];
    if (textSearch) {
        where.push('(rec.title LIKE ? OR rec.description LIKE ?)');
        const search = `%${textSearch}%`;
        params.push(search, search);
    }

    const whereSql = `WHERE ${where.join(' AND ')}`;

    const items = await db.connection!.all(
        `
        SELECT
            rec.*,
            COUNT(DISTINCT f.user_id) as favoritesCount,
            COUNT(DISTINCT rat.rating_id) as ratingsCount,
            COALESCE(GROUP_CONCAT(DISTINCT t.tag_name), '') as tags
        FROM recipes rec
        LEFT JOIN favorites f ON f.recipe_id = rec.recipe_id
        LEFT JOIN ratings rat ON rat.recipe_id = rec.recipe_id
        LEFT JOIN recipe_tags rt ON rt.recipe_id = rec.recipe_id
        LEFT JOIN tags t ON t.tag_id = rt.tag_id
        ${whereSql}
        GROUP BY rec.recipe_id
        ORDER BY rec.created_at DESC
        LIMIT ? OFFSET ?
        `,
        [...params, pageSize, offset]
    );

    const countRow = await db.connection!.get(
        `SELECT COUNT(*) as total FROM (SELECT rec.recipe_id FROM recipes rec ${whereSql} GROUP BY rec.recipe_id)`,
        params
    );

    res.json({
        items: (items || []).map((r: any) => ({
            ...r,
            tags: r.tags ? String(r.tags).split(',').filter(Boolean) : [],
        })),
        total: countRow?.total ?? 0,
        page,
        pageSize,
    });
});

recipeRouter.get('/:id', async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    res.json(await getRecipeDetail(id));
});

recipeRouter.post('/', requireRole([1, 2, 3]), async (req: Request, res: Response) => {
    const { title, description, categoryId, category_id, imageUrl, image_path, imageCrop, image_crop } = req.body ?? {};
    const authUser = (req as any).user;

    const steps = normalizeSteps((req.body ?? {}).steps);
    const tags = normalizeTags((req.body ?? {}).tags);
    const ingredients = normalizeIngredients((req.body ?? {}).ingredients);
    const crop = normalizeImageCrop(imageCrop ?? image_crop);
    const categoryIdNum = Number(categoryId ?? category_id);
    const category_id_final = Number.isFinite(categoryIdNum) ? categoryIdNum : null;
    
    await db.connection!.exec('BEGIN IMMEDIATE');
    try {
        const newRecipe = new Recipe(authUser.user_id, title, steps, category_id_final || undefined);
        const added = await db.connection!.get(
            'INSERT INTO recipes (user_id, title, description, steps, category_id, image_path, image_crop) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *',
            [
                newRecipe.user_id,
                newRecipe.title,
                String(description ?? ''),
                newRecipe.steps,
                newRecipe.category_id,
                String(imageUrl ?? image_path ?? '') || null,
                crop ? JSON.stringify(crop) : null,
            ]
        );
        await replaceRecipeTags(added.recipe_id, tags);
        await replaceRecipeIngredients(added.recipe_id, ingredients);
        await db.connection!.exec('COMMIT');
        res.status(201).json(await getRecipeDetail(added.recipe_id));
    } catch (error: any) {
        await db.connection!.exec('ROLLBACK');
        throw new HttpError(400, 'Missing required fields: ' + error.message);
    }
});

recipeRouter.put('/:id', requireRole([1, 2, 3]), async (req: Request, res: Response) => {
    const { title, description, categoryId, category_id, imageUrl, image_path, imageCrop, image_crop } = req.body ?? {};
    const steps = normalizeSteps((req.body ?? {}).steps);
    const tags = normalizeTags((req.body ?? {}).tags);
    const ingredients = normalizeIngredients((req.body ?? {}).ingredients);
    const authUser = (req as any).user;
    const crop = normalizeImageCrop(imageCrop ?? image_crop);

    const recipe = await db.connection!.get('SELECT user_id FROM recipes WHERE recipe_id = ?', req.params.id);
    if (!recipe) throw new HttpError(404, 'Recipe not found');
    
    if (recipe.user_id !== authUser.user_id && authUser.role_id !== 1 && authUser.role_id !== 2) {
        throw new HttpError(403, 'Not recipe owner');
    }

    const categoryIdNum = Number(categoryId ?? category_id);
    const category_id_final = Number.isFinite(categoryIdNum) ? categoryIdNum : null;

    await db.connection!.exec('BEGIN IMMEDIATE');
    try {
        await db.connection!.get(
            'UPDATE recipes SET title = ?, description = ?, steps = ?, category_id = ?, image_path = ?, image_crop = ?, updated_at = CURRENT_TIMESTAMP WHERE recipe_id = ? RETURNING *',
            [
                title,
                description,
                steps,
                category_id_final,
                String(imageUrl ?? image_path ?? '') || null,
                crop ? JSON.stringify(crop) : null,
                req.params.id,
            ]
        );
        await replaceRecipeTags(Number(req.params.id), tags);
        await replaceRecipeIngredients(Number(req.params.id), ingredients);
        await db.connection!.exec('COMMIT');
    } catch (e) {
        await db.connection!.exec('ROLLBACK');
        throw e;
    }

    res.json(await getRecipeDetail(Number(req.params.id)));
});

recipeRouter.delete('/:id', requireRole([1, 2, 3]), async (req: Request, res: Response) => {
    const authUser = (req as any).user;
    const recipe = await db.connection!.get('SELECT user_id FROM recipes WHERE recipe_id = ?', req.params.id);
    
    if (!recipe) throw new HttpError(404, 'Recipe not found');
    
    if (recipe.user_id !== authUser.user_id && authUser.role_id !== 1 && authUser.role_id !== 2) {
        throw new HttpError(403, 'Not recipe owner');
    }

    await db.connection!.run('DELETE FROM recipes WHERE recipe_id = ?', req.params.id);
    res.status(204).send();
});

recipeRouter.get('/users/:userid', async (req: Request, res: Response) => {
    const recipes = await db.connection!.all(
        'SELECT * FROM recipes WHERE user_id = ?', 
        [req.params.userid]
    );
    res.json(recipes || []);
});


recipeRouter.get('/tags/:tagid', async (req: Request, res: Response) => {
    const recipes = await db.connection!.all(`
        SELECT r.* FROM recipes r 
        JOIN recipe_tags rt ON r.recipe_id = rt.recipe_id 
        WHERE rt.tag_id = ?`, 
        [req.params.tagid]
    );
    res.json(recipes || []);
});


recipeRouter.get('/categories/:categoryid', async (req: Request, res: Response) => {
    const recipes = await db.connection!.all(
        'SELECT * FROM recipes WHERE category_id = ?', 
        [req.params.categoryid]
    );
    res.json(recipes || []);
});
