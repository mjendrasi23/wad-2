import { Router, Request, Response } from "express";
import { db } from "../helpers/db";
import { HttpError } from "../helpers/errors";
import { requireRole } from "../helpers/auth";

export const interactionRouter = Router();

function reportDto(row: any) {
    return {
        id: String(row.report_id),
        reporterId: String(row.reporter_id),
        targetType: row.target_type,
        targetId: String(row.target_id),
        reason: row.reason,
        details: row.details ?? undefined,
        status: row.status,
        createdAt: row.created_at,
        reviewedById: row.reviewed_by_id != null ? String(row.reviewed_by_id) : undefined,
        reviewedAt: row.reviewed_at ?? undefined,
    };
}

interactionRouter.get('/recipes/:recipeid/comments', async (req: Request, res: Response) => {
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

interactionRouter.post('/recipes/:recipeid/comments', requireRole([1, 2, 3, 4]), async (req: Request, res: Response) => {
    const content = (req.body?.body ?? req.body?.content ?? '').toString();
    const { recipeid } = req.params;
    const user = (req as any).user;

    if (!content.trim()) throw new HttpError(400, 'Comment content is required');

    const result = await db.connection!.get(
        'INSERT INTO comments (recipe_id, user_id, content) VALUES (?, ?, ?) RETURNING *',
        [recipeid, user.user_id, content]
    );
    res.status(201).json(result);
});

interactionRouter.get('/recipes/:recipeid/ratings', async (req: Request, res: Response) => {
    const ratings = await db.connection!.all(
        `SELECT r.*
         FROM ratings r
         WHERE r.recipe_id = ?
           AND EXISTS (
             SELECT 1 FROM comments c
             WHERE c.recipe_id = r.recipe_id AND c.user_id = r.user_id
           )
         ORDER BY r.created_at DESC`,
        [req.params.recipeid]
    );
    res.json(ratings || []);
});

interactionRouter.get('/recipes/:recipeid/ratings/summary', async (req: Request, res: Response) => {
    const recipeId = Number(req.params.recipeid);
    const recipe = await db.connection!.get('SELECT recipe_id FROM recipes WHERE recipe_id = ?', [recipeId]);
    if (!recipe) throw new HttpError(404, 'Recipe not found');

    const summary = await db.connection!.get(
        `SELECT
           COALESCE(ROUND(AVG(r.rating_value), 2), 0) as avgRating,
           COUNT(*) as count
         FROM ratings r
         WHERE r.recipe_id = ?
           AND EXISTS (
             SELECT 1 FROM comments c
             WHERE c.recipe_id = r.recipe_id AND c.user_id = r.user_id
           )`,
        [recipeId]
    );
    const authUser = (req as any).user;
    const myRow = authUser
        ? await db.connection!.get('SELECT rating_value FROM ratings WHERE recipe_id = ? AND user_id = ?', [recipeId, authUser.user_id])
        : null;

    res.json({
        recipeId: String(recipeId),
        avgRating: summary?.avgRating ?? 0,
        count: summary?.count ?? 0,
        myRating: myRow?.rating_value ?? undefined,
    });
});

interactionRouter.post('/recipes/:recipeid/ratings', requireRole([1, 2, 3, 4]), async (req: Request, res: Response) => {
    const recipeId = Number(req.params.recipeid);
    const value = Number(req.body?.value);
    const user = (req as any).user;

    if (!Number.isFinite(value) || value < 1 || value > 5) {
        throw new HttpError(400, 'Rating must be between 1 and 5');
    }

    const recipe = await db.connection!.get('SELECT recipe_id FROM recipes WHERE recipe_id = ?', [recipeId]);
    if (!recipe) throw new HttpError(404, 'Recipe not found');

    await db.connection!.run(
        `INSERT INTO ratings (recipe_id, user_id, rating_value) VALUES (?, ?, ?)
         ON CONFLICT(recipe_id, user_id) DO UPDATE SET rating_value = excluded.rating_value, created_at = CURRENT_TIMESTAMP`,
        [recipeId, user.user_id, value]
    );

    const summary = await db.connection!.get(
        `SELECT
           COALESCE(ROUND(AVG(r.rating_value), 2), 0) as avgRating,
           COUNT(*) as count
         FROM ratings r
         WHERE r.recipe_id = ?
           AND EXISTS (
             SELECT 1 FROM comments c
             WHERE c.recipe_id = r.recipe_id AND c.user_id = r.user_id
           )`,
        [recipeId]
    );

    res.json({
        recipeId: String(recipeId),
        avgRating: summary?.avgRating ?? 0,
        count: summary?.count ?? 0,
        myRating: value,
    });
});

interactionRouter.get('/favorites', requireRole([1, 2, 3, 4]), async (req: Request, res: Response) => {
    const user = (req as any).user;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 12;
    const offset = (page - 1) * pageSize;
    const textSearch = (req.query.textSearch as string | undefined)?.trim() || '';

    const where: string[] = ['fav.user_id = ?'];
    const params: any[] = [user.user_id];
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
            COUNT(DISTINCT f2.user_id) as favoritesCount,
            COUNT(DISTINCT rat.rating_id) as ratingsCount,
            COALESCE(GROUP_CONCAT(DISTINCT t.tag_name), '') as tags
        FROM favorites fav
        JOIN recipes rec ON rec.recipe_id = fav.recipe_id
        LEFT JOIN favorites f2 ON f2.recipe_id = rec.recipe_id
        LEFT JOIN ratings rat ON rat.recipe_id = rec.recipe_id
        LEFT JOIN recipe_tags rt ON rt.recipe_id = rec.recipe_id
        LEFT JOIN tags t ON t.tag_id = rt.tag_id
        ${whereSql}
        GROUP BY rec.recipe_id
        ORDER BY fav.created_at DESC
        LIMIT ? OFFSET ?
        `,
        [...params, pageSize, offset]
    );

    const countRow = await db.connection!.get(
        `SELECT COUNT(*) as total FROM (SELECT rec.recipe_id FROM favorites fav JOIN recipes rec ON rec.recipe_id = fav.recipe_id ${whereSql} GROUP BY rec.recipe_id)`,
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

interactionRouter.get('/favorites/:recipeId', requireRole([1, 2, 3, 4]), async (req: Request, res: Response) => {
    const user = (req as any).user;
    const exists = await db.connection!.get(
        'SELECT 1 FROM favorites WHERE user_id = ? AND recipe_id = ?',
        [user.user_id, Number(req.params.recipeId)]
    );
    res.json(!!exists);
});

interactionRouter.post('/favorites/:recipeId', requireRole([1, 2, 3, 4]), async (req: Request, res: Response) => {
    const user = (req as any).user;
    const recipeId = Number(req.params.recipeId);
    const exists = await db.connection!.get(
        'SELECT 1 FROM favorites WHERE user_id = ? AND recipe_id = ?',
        [user.user_id, recipeId]
    );

    if (exists) {
        await db.connection!.run('DELETE FROM favorites WHERE user_id = ? AND recipe_id = ?', [user.user_id, recipeId]);
        res.json({ isFavorite: false });
        return;
    }

    await db.connection!.run('INSERT INTO favorites (user_id, recipe_id) VALUES (?, ?)', [user.user_id, recipeId]);
    res.json({ isFavorite: true });
});

interactionRouter.post('/reports', requireRole([1, 2, 3, 4]), async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { targetType, targetId, reason, details } = req.body ?? {};
    if (targetType !== 'recipe' && targetType !== 'comment') throw new HttpError(400, 'Invalid targetType');
    if (!targetId) throw new HttpError(400, 'targetId is required');
    if (!reason) throw new HttpError(400, 'reason is required');

    if (targetType === 'recipe') {
        const exists = await db.connection!.get('SELECT 1 FROM recipes WHERE recipe_id = ?', [Number(targetId)]);
        if (!exists) throw new HttpError(404, 'Recipe not found');
    } else {
        const exists = await db.connection!.get('SELECT 1 FROM comments WHERE comment_id = ?', [Number(targetId)]);
        if (!exists) throw new HttpError(404, 'Comment not found');
    }

    const inserted = await db.connection!.get(
        'INSERT INTO reports (reporter_id, target_type, target_id, reason, details) VALUES (?, ?, ?, ?, ?) RETURNING *',
        [user.user_id, targetType, Number(targetId), String(reason), details ? String(details) : null]
    );
    res.status(201).json(reportDto(inserted));
});

interactionRouter.get('/management/moderation', requireRole([1, 2]), async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const offset = (page - 1) * pageSize;

    const status = (req.query.status as string | undefined)?.trim() || '';
    const type = (req.query.type as string | undefined)?.trim() || '';

    const where: string[] = [];
    const params: any[] = [];
    if (status) {
        where.push('status = ?');
        params.push(status);
    }
    if (type && type !== 'report') {
        where.push('target_type = ?');
        params.push(type);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const items = await db.connection!.all(
        `SELECT * FROM reports ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
    );

    const countRow = await db.connection!.get(
        `SELECT COUNT(*) as total FROM reports ${whereSql}`,
        params
    );

    res.json({
        items: (items || []).map(reportDto),
        total: countRow?.total ?? 0,
        page,
        pageSize,
    });
});

interactionRouter.post('/management/moderation/:reportId/resolve', requireRole([1, 2]), async (req: Request, res: Response) => {
    const user = (req as any).user;
    const reportId = Number(req.params.reportId);
    const updated = await db.connection!.get(
        `UPDATE reports
         SET status = 'resolved', reviewed_by_id = ?, reviewed_at = CURRENT_TIMESTAMP
         WHERE report_id = ?
         RETURNING *`,
        [user.user_id, reportId]
    );
    if (!updated) throw new HttpError(404, 'Report not found');
    res.json(reportDto(updated));
});

interactionRouter.post('/management/moderation/:reportId/remove', requireRole([1, 2]), async (req: Request, res: Response) => {
    const user = (req as any).user;
    const reportId = Number(req.params.reportId);

    const report = await db.connection!.get('SELECT * FROM reports WHERE report_id = ?', [reportId]);
    if (!report) throw new HttpError(404, 'Report not found');

    await db.connection!.exec('BEGIN IMMEDIATE');
    try {
        if (report.target_type === 'comment') {
            await db.connection!.run('DELETE FROM comments WHERE comment_id = ?', [report.target_id]);
        } else if (report.target_type === 'recipe') {
            await db.connection!.run('DELETE FROM recipes WHERE recipe_id = ?', [report.target_id]);
        }

        const updated = await db.connection!.get(
            `UPDATE reports
             SET status = 'removed', reviewed_by_id = ?, reviewed_at = CURRENT_TIMESTAMP
             WHERE report_id = ?
             RETURNING *`,
            [user.user_id, reportId]
        );

        await db.connection!.exec('COMMIT');
        res.json(reportDto(updated));
    } catch (e) {
        await db.connection!.exec('ROLLBACK');
        throw e;
    }
});

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

interactionRouter.post('/comment/recipe/:recipeid', requireRole([1, 2, 3, 4]), async (req: Request, res: Response) => {
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

interactionRouter.put('/comments/:id', requireRole([1, 2, 3, 4]), async (req: Request, res: Response) => {
    const { content } = req.body;
    const user = (req as any).user;

    const comment = await db.connection!.get('SELECT user_id FROM comments WHERE comment_id = ?', [req.params.id]);
    if (!comment) throw new HttpError(404, 'Comment not found');

    if (comment.user_id !== user.user_id && user.role_id !== 1 && user.role_id !== 2) {
        throw new HttpError(403, 'Access denied: You do not own this comment');
    }

    const updated = await db.connection!.get(
        'UPDATE comments SET content = ? WHERE comment_id = ? RETURNING *',
        [content, req.params.id]
    );
    res.json(updated);
});

interactionRouter.delete('/comments/:id', requireRole([1, 2, 3, 4]), async (req: Request, res: Response) => {
    const user = (req as any).user;

    const comment = await db.connection!.get('SELECT user_id FROM comments WHERE comment_id = ?', [req.params.id]);
    if (!comment) throw new HttpError(404, 'Comment not found');

    if (comment.user_id !== user.user_id && user.role_id !== 1 && user.role_id !== 2) {
        const recipeOwner = await db.connection!.get(
            `SELECT r.user_id FROM comments c JOIN recipes r ON r.recipe_id = c.recipe_id WHERE c.comment_id = ?`,
            [req.params.id]
        );
        if (!recipeOwner || recipeOwner.user_id !== user.user_id) {
            throw new HttpError(403, 'Access denied: You do not own this comment');
        }
    }

    await db.connection!.run('DELETE FROM comments WHERE comment_id = ?', [req.params.id]);
    res.status(204).send();
});

interactionRouter.delete('/rating/:id', requireRole([1, 2, 3, 4]), async (req: Request, res: Response) => {
    const rating = await db.connection!.get('SELECT user_id FROM ratings WHERE rating_id = ?', req.params.id);
    if (!rating) throw new HttpError(404, 'Rating not found');

    const authUser = (req as any).user;
    if (authUser.role_id !== 1 && authUser.role_id !== 2 && rating.user_id !== authUser.user_id) {
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

interactionRouter.put('/ratings/:id', requireRole([1, 2, 3, 4]), async (req: Request, res: Response) => {
    const { rating_value } = req.body;
    const user = (req as any).user;

    if (rating_value < 1 || rating_value > 5) {
        throw new HttpError(400, 'Rating must be between 1 and 5');
    }

    const rating = await db.connection!.get('SELECT user_id FROM ratings WHERE rating_id = ?', [req.params.id]);
    if (!rating) throw new HttpError(404, 'Rating not found');

    if (rating.user_id !== user.user_id && user.role_id !== 1 && user.role_id !== 2) {
        throw new HttpError(403, 'Access denied: You do not own this rating');
    }

    const updated = await db.connection!.get(
        'UPDATE ratings SET rating_value = ? WHERE rating_id = ? RETURNING *',
        [rating_value, req.params.id]
    );
    res.json(updated);
});

interactionRouter.delete('/ratings/:id', requireRole([1, 2, 3, 4]), async (req: Request, res: Response) => {
    const user = (req as any).user;

    const rating = await db.connection!.get('SELECT user_id FROM ratings WHERE rating_id = ?', [req.params.id]);
    if (!rating) throw new HttpError(404, 'Rating not found');

    if (rating.user_id !== user.user_id && user.role_id !== 1 && user.role_id !== 2) {
        throw new HttpError(403, 'Access denied: You do not own this rating');
    }

    await db.connection!.run('DELETE FROM ratings WHERE rating_id = ?', [req.params.id]);
    res.status(204).send();
});
