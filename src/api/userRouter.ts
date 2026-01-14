import { Router, Request, Response } from "express";
import { db } from "../helpers/db";
import { User } from "../model/user";
import { HttpError } from "../helpers/errors";
import { requireRole } from "../helpers/auth";

export const userRouter = Router();

userRouter.get('/', requireRole([1, 2]), async (req: Request, res: Response) => {
    const users = await db.connection!.all('SELECT user_id, username, email, role_id, created_at, is_active FROM users');
    res.json(users || []);
});

userRouter.post('/', async (req: Request, res: Response) => {
    const { username, email, password, role_id } = req.body;
    await db.connection!.exec('BEGIN IMMEDIATE');
    try {
        const newUser = new User(username, email, password, role_id || 3);
        const addedUser = await db.connection!.get(
            'INSERT INTO users (username, email, password_hash, role_id) VALUES (?, ?, ?, ?) RETURNING user_id, username, email, role_id',
            newUser.username, newUser.email, newUser.password_hash, newUser.role_id
        );
        await db.connection!.exec('COMMIT');
        res.status(201).json(addedUser);
    } catch (error: any) {
        await db.connection!.exec('ROLLBACK');
        if (error.message?.includes('UNIQUE')) throw new HttpError(409, 'Email or username already registered');
        throw new HttpError(400, 'Cannot create user: ' + error.message);
    }
});

userRouter.get('/:id', async (req: Request, res: Response) => {
    const user = await db.connection!.get(
        'SELECT user_id, username, email, role_id, is_active FROM users WHERE user_id = ?', 
        req.params.id
    );
    
    if (!user) {
        throw new HttpError(404, 'User not found');
    }
    
    res.json(user);
});

userRouter.put('/:id', requireRole([1]), async (req: Request, res: Response) => {
    const { username, email, role_id, is_active } = req.body;
    
    const userExists = await db.connection!.get('SELECT user_id FROM users WHERE user_id = ?', req.params.id);
    if (!userExists) {
        throw new HttpError(404, 'User not found');
    }

    try {
        const updatedUser = await db.connection!.get(
            `UPDATE users 
             SET username = ?, email = ?, role_id = ?, is_active = ? 
             WHERE user_id = ? 
             RETURNING user_id, username, email, role_id, is_active`,
            [username, email, role_id, is_active, req.params.id]
        );
        res.json(updatedUser);
    } catch (error: any) {
        throw new HttpError(400, 'Invalid data format');
    }
});

userRouter.delete('/:id', requireRole([1]), async (req: Request, res: Response) => {
    const result = await db.connection!.run('DELETE FROM users WHERE user_id = ?', req.params.id);
    
    if (result.changes === 0) {
        throw new HttpError(404, 'User not found');
    }
    
    res.status(204).send();
});