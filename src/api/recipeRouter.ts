import { Router, Request, Response } from "express";
import { db } from "../helpers/db";
import { Recipe } from "../model/recipe";
import { HttpError } from "../helpers/errors";
import { requireRole } from "../helpers/auth";

export const recipeRouter = Router();

recipeRouter.get('/', async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;
    const search = req.query.q ? `%${req.query.q}%` : '%';

    const recipes = await db.connection!.all(
        'SELECT * FROM recipes WHERE title LIKE ? OR description LIKE ? LIMIT ? OFFSET ?',
        [search, search, limit, offset]
    );
    res.json(recipes || []);
});

recipeRouter.get('/:id', async (req: Request, res: Response) => {
    const { id } = req.params;

    const recipe = await db.connection!.get('SELECT * FROM recipes WHERE recipe_id = ?', id);
    
    if (!recipe) {
        throw new HttpError(404, 'Recipe not found');
    }

    const ingredients = await db.connection!.all(`
        SELECT i.ingredient_name, ri.quantity, ri.unit 
        FROM recipe_ingredients ri 
        JOIN ingredients i ON ri.ingredient_id = i.ingredient_id 
        WHERE ri.recipe_id = ?`, 
        id
    );

    const tags = await db.connection!.all(`
        SELECT t.tag_name 
        FROM recipe_tags rt 
        JOIN tags t ON rt.tag_id = t.tag_id 
        WHERE rt.recipe_id = ?`, 
        id
    );

    const fullRecipeData = {
        ...recipe,
        ingredients: ingredients || [],
        tags: tags || []
    };

    res.json(fullRecipeData);
});

recipeRouter.post('/', requireRole([1, 2, 3]), async (req: Request, res: Response) => {
    const { title, steps, category_id, description, user_id } = req.body;
    
    await db.connection!.exec('BEGIN IMMEDIATE');
    try {
        const newRecipe = new Recipe(user_id, title, steps, category_id);
        const added = await db.connection!.get(
            'INSERT INTO recipes (user_id, title, description, steps, category_id) VALUES (?, ?, ?, ?, ?) RETURNING *',
            [newRecipe.user_id, newRecipe.title, description, newRecipe.steps, newRecipe.category_id]
        );
        await db.connection!.exec('COMMIT');
        res.status(201).json(added);
    } catch (error: any) {
        await db.connection!.exec('ROLLBACK');
        throw new HttpError(400, 'Missing required fields: ' + error.message);
    }
});

recipeRouter.get('/:id', async (req: Request, res: Response) => {
    const recipe = await db.connection!.get('SELECT * FROM recipes WHERE recipe_id = ?', req.params.id);
    if (!recipe) throw new HttpError(404, 'Recipe not found');
    res.json(recipe);
});

recipeRouter.put('/:id', requireRole([1, 2, 3]), async (req: Request, res: Response) => {
    const { title, description, steps, category_id } = req.body;
    const authUser = (req as any).user;

    const recipe = await db.connection!.get('SELECT user_id FROM recipes WHERE recipe_id = ?', req.params.id);
    if (!recipe) throw new HttpError(404, 'Recipe not found');
    
    if (recipe.user_id !== authUser.user_id && authUser.role_id !== 1) {
        throw new HttpError(403, 'Not recipe owner');
    }

    const updated = await db.connection!.get(
        'UPDATE recipes SET title = ?, description = ?, steps = ?, category_id = ?, updated_at = CURRENT_TIMESTAMP WHERE recipe_id = ? RETURNING *',
        [title, description, steps, category_id, req.params.id]
    );
    res.json(updated);
});

recipeRouter.delete('/:id', requireRole([1, 2, 3]), async (req: Request, res: Response) => {
    const authUser = (req as any).user;
    const recipe = await db.connection!.get('SELECT user_id FROM recipes WHERE recipe_id = ?', req.params.id);
    
    if (!recipe) throw new HttpError(404, 'Recipe not found');
    
    if (recipe.user_id !== authUser.user_id && authUser.role_id !== 1) {
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