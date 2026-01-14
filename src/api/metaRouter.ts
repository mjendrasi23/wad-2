import { Router, Request, Response } from "express";
import { db } from "../helpers/db";
import { HttpError } from "../helpers/errors";
import { requireRole } from "../helpers/auth";

export const metaRouter = Router();

metaRouter.post('/categories', requireRole([1, 2]), async (req: Request, res: Response) => {
    const { name, description } = req.body;
    try {
        const result = await db.connection!.get(
            'INSERT INTO categories (name, description) VALUES (?, ?) RETURNING *',
            [name, description]
        );
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
    res.json(updated);
});

metaRouter.delete('/categories/:id', requireRole([1, 2]), async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const result = await db.connection!.run('DELETE FROM categories WHERE category_id = ?', id);
    
    if (result.changes === 0) {
        throw new HttpError(404, 'Category not found');
    }
    
    res.status(204).send();
});


metaRouter.get('/tags', async (req: Request, res: Response) => {
    const tags = await db.connection!.all('SELECT * FROM tags');
    res.json(tags || []);
});

metaRouter.post('/tags', requireRole([1, 2]), async (req: Request, res: Response) => {
    const { tag_name } = req.body;
    const result = await db.connection!.get('INSERT INTO tags (tag_name) VALUES (?) RETURNING *', [tag_name]);
    res.status(201).json(result);
});

metaRouter.delete('/tags/:id', requireRole([1, 2]), async (req: Request, res: Response) => {
    const result = await db.connection!.run('DELETE FROM tags WHERE tag_id = ?', req.params.id);
    if (result.changes === 0) throw new HttpError(404, 'Tag not found');
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
    res.json(updated);
});

metaRouter.delete('/ingredients/:id', requireRole([1, 2]), async (req: Request, res: Response) => {
    const used = await db.connection!.get('SELECT 1 FROM recipe_ingredients WHERE ingredient_id = ?', req.params.id);
    if (used) throw new HttpError(409, 'Ingredient is used in recipes and cannot be deleted');

    const deleted = await db.connection!.run('DELETE FROM ingredients WHERE ingredient_id = ?', req.params.id);
    if (deleted.changes === 0) throw new HttpError(404, 'Ingredient not found');
    res.status(204).send();
});
