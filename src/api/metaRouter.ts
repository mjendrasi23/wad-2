import { Router, Request, Response } from "express";
import { db } from "../helpers/db";
import { HttpError } from "../helpers/errors";
import { requireRole } from "../helpers/auth";
import { AuditService } from "../helpers/auditlog"; // Imported the new class

export const metaRouter = Router();

metaRouter.post('/categories', requireRole([1, 2]), async (req: Request, res: Response) => {
    const { name, description } = req.body;
    try {
        const result = await db.connection!.get(
            'INSERT INTO categories (name, description) VALUES (?, ?) RETURNING *',
            [name, description]
        );
        await AuditService.log(req, 'CREATE_CATEGORY', 'categories', result.category_id, `Created category: ${name}`);
        res.status(201).json(result);
    } catch (e: any) {
        throw new HttpError(400, 'Missing required fields or duplicate name');
    }
});

metaRouter.get('/categories', async (req: Request, res: Response) => {
    const categories = await db.connection!.all('SELECT * FROM categories');
    res.json(categories || []);
});

metaRouter.get('/categories/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const category = await db.connection!.get('SELECT * FROM categories WHERE category_id = ?', id);
    
    if (!category) {
        throw new HttpError(404, 'Category not found');
    }
    
    res.json(category);
});

metaRouter.put('/categories/:id', requireRole([1, 2]), async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, description } = req.body;

    const categoryExists = await db.connection!.get('SELECT category_id FROM categories WHERE category_id = ?', id);
    if (!categoryExists) {
        throw new HttpError(404, 'Category not found');
    }

    const updated = await db.connection!.get(
        'UPDATE categories SET name = ?, description = ? WHERE category_id = ? RETURNING *',
        [name, description, id]
    );
    await AuditService.log(req, 'UPDATE_CATEGORY', 'categories', id, `Updated category details for: ${name}`);
    res.json(updated);
});

metaRouter.delete('/categories/:id', requireRole([1, 2]), async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const result = await db.connection!.run('DELETE FROM categories WHERE category_id = ?', id);
    
const category = await db.connection!.get('SELECT name FROM categories WHERE category_id = ?', id);
    if (!category) throw new HttpError(404, 'Category not found');    await AuditService.log(req, 'DELETE_CATEGORY', 'categories', id, `Deleted category: ${category.name}`);
    res.status(204).send();
});


metaRouter.get('/tags', async (req: Request, res: Response) => {
    const tags = await db.connection!.all('SELECT * FROM tags');
    res.json(tags || []);
});

metaRouter.post('/tags', requireRole([1, 2]), async (req: Request, res: Response) => {
    const { tag_name } = req.body;
    const result = await db.connection!.get('INSERT INTO tags (tag_name) VALUES (?) RETURNING *', [tag_name]);
    await AuditService.log(req, 'CREATE_TAG', 'tags', result.tag_id, `Created tag: ${tag_name}`);
    res.status(201).json(result);
});

metaRouter.delete('/tags/:id', requireRole([1, 2]), async (req: Request, res: Response) => {
    const result = await db.connection!.run('DELETE FROM tags WHERE tag_id = ?', req.params.id);
    if (result.changes === 0) throw new HttpError(404, 'Tag not found');
    await AuditService.log(req, 'DELETE_TAG', 'tags', req.params.id, `Deleted tag: ${req.params.id}`);
    res.status(204).send();
});

metaRouter.put('/tags/:id', requireRole([1, 2]), async (req: Request, res: Response) => {
    const { id } = req.params;
    const { tag_name } = req.body;

    if (!tag_name) {
        throw new HttpError(400, 'Tag name is required');
    }

    const updated = await db.connection!.get(
        'UPDATE tags SET tag_name = ? WHERE tag_id = ? RETURNING *',
        [tag_name, id]
    );

    if (!updated) {
        throw new HttpError(404, 'Tag not found');
    }
await AuditService.log(req, 'UPDATE_TAG', 'tags', id, `Updated tag name to: ${tag_name}`);
    res.json(updated);
});

metaRouter.get('/ingredients', async (req: Request, res: Response) => {
    const search = req.query.q ? `%${req.query.q}%` : '%';
    const ingredients = await db.connection!.all(
        'SELECT * FROM ingredients WHERE ingredient_name LIKE ?', 
        [search]
    );
    res.json(ingredients || []);
});

metaRouter.post('/ingredients', requireRole([1, 2]), async (req: Request, res: Response) => {
    const { ingredient_name } = req.body;
    if (!ingredient_name) throw new HttpError(400, 'Ingredient name is required');

    try {
        const result = await db.connection!.get(
            'INSERT INTO ingredients (ingredient_name) VALUES (?) RETURNING *', 
            [ingredient_name]
        );
        await AuditService.log(req, 'CREATE_INGREDIENT', 'ingredients', result.ingredient_id, `Added ingredient: ${ingredient_name}`);
        res.status(201).json(result);
    } catch (error: any) {
        throw new HttpError(400, 'Cannot add ingredient: ' + error.message);
    }
});

metaRouter.get('/ingredients/:id', async (req: Request, res: Response) => {
    const ingredient = await db.connection!.get(
        'SELECT * FROM ingredients WHERE ingredient_id = ?', 
        req.params.id
    );
    if (!ingredient) throw new HttpError(404, 'Ingredient not found');
    res.json(ingredient);
});

metaRouter.put('/ingredients/:id', requireRole([1, 2]), async (req: Request, res: Response) => {
    const { ingredient_name } = req.body;
    if (!ingredient_name) throw new HttpError(400, 'Ingredient name is required');

    const updated = await db.connection!.get(
        'UPDATE ingredients SET ingredient_name = ? WHERE ingredient_id = ? RETURNING *',
        [ingredient_name, req.params.id]
    );

    if (!updated) throw new HttpError(404, 'Ingredient not found');
    await AuditService.log(req, 'UPDATE_INGREDIENT', 'ingredients', req.params.id, `Updated ingredient name to: ${ingredient_name}`);
    res.json(updated);
});

metaRouter.delete('/ingredients/:id', requireRole([1, 2]), async (req: Request, res: Response) => {
    const used = await db.connection!.get('SELECT 1 FROM recipe_ingredients WHERE ingredient_id = ?', req.params.id);
    if (used) throw new HttpError(409, 'Ingredient is used in recipes and cannot be deleted');

    const deleted = await db.connection!.run('DELETE FROM ingredients WHERE ingredient_id = ?', req.params.id);
    if (deleted.changes === 0) throw new HttpError(404, 'Ingredient not found');
    await AuditService.log(req, 'DELETE_INGREDIENT', 'ingredients', req.params.id, `Removed ingredient ID: ${req.params.id}`);
    res.status(204).send();
});

metaRouter.get('/stats/categories/popular', requireRole([1, 2]), async (_req: Request, res: Response) => {
    const rows = await db.connection!.all(
        `SELECT c.category_id as categoryId, c.name as categoryName, COUNT(r.recipe_id) as recipeCount
         FROM categories c
         LEFT JOIN recipes r ON r.category_id = c.category_id
         GROUP BY c.category_id
         ORDER BY recipeCount DESC, c.name ASC`
    );
    res.json(rows || []);
});

metaRouter.get('/stats/categories/ratings', requireRole([1, 2]), async (_req: Request, res: Response) => {
    const rows = await db.connection!.all(
        `SELECT c.category_id as categoryId, c.name as categoryName,
                COALESCE(ROUND(AVG(rt.rating_value), 2), 0) as avgRating,
                COUNT(rt.rating_id) as ratingsCount
         FROM categories c
         LEFT JOIN recipes r ON r.category_id = c.category_id
         LEFT JOIN ratings rt ON rt.recipe_id = r.recipe_id
         GROUP BY c.category_id
         ORDER BY avgRating DESC, ratingsCount DESC, c.name ASC`
    );
    res.json(rows || []);
});
