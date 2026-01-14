import { Router, Request, Response } from "express";
import { db } from "../helpers/db";
import { HttpError } from "../helpers/errors";
import { requireRole } from "../helpers/auth";

export const interactionRouter = Router();

interactionRouter.get('/comment/recipe/:recipeid', async (req: Request, res: Response) => {
    const comments = await db.connection!.all(
        `SELECT c.*, u.username 
         FROM comments c 
         JOIN users u ON c.user_id = u.user_id 
         WHERE c.recipe_id = ? 
         ORDER BY c.created_at DESC`,
        [req.params.recipeid]
    );
    res.json(comments || []);
});

interactionRouter.post('/comment/recipe/:recipeid', requireRole([1, 2, 3]), async (req: Request, res: Response) => {
    const { content } = req.body;
    const { recipeid } = req.params;
    const user = (req as any).user;

    if (!content) throw new HttpError(400, 'Comment content is required');

    const result = await db.connection!.get(
        'INSERT INTO comments (recipe_id, user_id, content) VALUES (?, ?, ?) RETURNING *',
        [recipeid, user.user_id, content]
    );
    res.status(201).json(result);
});

interactionRouter.get('/comments/:id', async (req: Request, res: Response) => {
    const comment = await db.connection!.get(
        'SELECT c.*, u.username FROM comments c JOIN users u ON c.user_id = u.user_id WHERE c.comment_id = ?',
        [req.params.id]
    );
    if (!comment) throw new HttpError(404, 'Comment not found');
    res.json(comment);
});

interactionRouter.put('/comments/:id', requireRole([1, 2, 3]), async (req: Request, res: Response) => {
    const { content } = req.body;
    const user = (req as any).user;

    const comment = await db.connection!.get('SELECT user_id FROM comments WHERE comment_id = ?', [req.params.id]);
    if (!comment) throw new HttpError(404, 'Comment not found');

    if (comment.user_id !== user.user_id && user.role_id !== 1) {
        throw new HttpError(403, 'Access denied: You do not own this comment');
    }

    const updated = await db.connection!.get(
        'UPDATE comments SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE comment_id = ? RETURNING *',
        [content, req.params.id]
    );
    res.json(updated);
});

interactionRouter.delete('/comments/:id', requireRole([1, 2, 3]), async (req: Request, res: Response) => {
    const user = (req as any).user;

    const comment = await db.connection!.get('SELECT user_id FROM comments WHERE comment_id = ?', [req.params.id]);
    if (!comment) throw new HttpError(404, 'Comment not found');

    if (comment.user_id !== user.user_id && user.role_id !== 1) {
        throw new HttpError(403, 'Access denied: You do not own this comment');
    }

    await db.connection!.run('DELETE FROM comments WHERE comment_id = ?', [req.params.id]);
    res.status(204).send();
});

interactionRouter.delete('/rating/:id', requireRole([1, 2, 3]), async (req: Request, res: Response) => {
    const rating = await db.connection!.get('SELECT user_id FROM ratings WHERE rating_id = ?', req.params.id);
    if (!rating) throw new HttpError(404, 'Rating not found');

    const authUser = (req as any).user;
    if (authUser.role_id === 3 && rating.user_id !== authUser.user_id) {
        throw new HttpError(403, 'Not rating author');
    }

    await db.connection!.run('DELETE FROM ratings WHERE rating_id = ?', req.params.id);
    res.status(204).send();
});

interactionRouter.get('/ratings/:id', async (req: Request, res: Response) => {
    const rating = await db.connection!.get(
        'SELECT r.*, u.username FROM ratings r JOIN users u ON r.user_id = u.user_id WHERE r.rating_id = ?',
        [req.params.id]
    );
    if (!rating) throw new HttpError(404, 'Rating not found');
    res.json(rating);
});

interactionRouter.put('/ratings/:id', requireRole([1, 2, 3]), async (req: Request, res: Response) => {
    const { rating_value } = req.body;
    const user = (req as any).user;

    if (rating_value < 1 || rating_value > 5) {
        throw new HttpError(400, 'Rating must be between 1 and 5');
    }

    const rating = await db.connection!.get('SELECT user_id FROM ratings WHERE rating_id = ?', [req.params.id]);
    if (!rating) throw new HttpError(404, 'Rating not found');

    if (rating.user_id !== user.user_id && user.role_id !== 1) {
        throw new HttpError(403, 'Access denied: You do not own this rating');
    }

    const updated = await db.connection!.get(
        'UPDATE ratings SET rating_value = ?, updated_at = CURRENT_TIMESTAMP WHERE rating_id = ? RETURNING *',
        [rating_value, req.params.id]
    );
    res.json(updated);
});

interactionRouter.delete('/ratings/:id', requireRole([1, 2, 3]), async (req: Request, res: Response) => {
    const user = (req as any).user;

    const rating = await db.connection!.get('SELECT user_id FROM ratings WHERE rating_id = ?', [req.params.id]);
    if (!rating) throw new HttpError(404, 'Rating not found');

    if (rating.user_id !== user.user_id && user.role_id !== 1) {
        throw new HttpError(403, 'Access denied: You do not own this rating');
    }

    await db.connection!.run('DELETE FROM ratings WHERE rating_id = ?', [req.params.id]);
    res.status(204).send();
});