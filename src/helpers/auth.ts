import { Express, Request, Response, NextFunction, Router, RequestHandler } from 'express';
import session from 'express-session';
import passport from 'passport';
import SQLiteStoreFactory from 'connect-sqlite3';

import { User } from '../model/user';
import { HttpError } from './errors';
import { reloadUsers } from './sysdb';
import { db } from "../helpers/db";
import { hashPassword, verifyPassword } from './password';
import { AuditService } from "../helpers/auditlog"; // Imported the new class

export const authRouter = Router();

interface AuthRequest extends Request {
  user?: User;
}

export function requireRole(roles: number[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;
    const user = authReq.user as User | undefined;
    const userRoleIds =
      Array.isArray((user as any)?.roles) ? (user as any).roles :
      typeof (user as any)?.role_id === 'number' ? [(user as any).role_id] :
      [];

    const hasRole = userRoleIds.some((role: number) => roles.includes(role));
    if (!hasRole) {
      throw new HttpError(403, 'You do not have permission to do this');
    }
    next();
  };
}

export const users: User[] = []

// Initialize authentication
export async function initAuth(app: Express, reset: boolean = false): Promise<void> {

  // Middleware setup with persistent sessions
  const SQLiteStore = SQLiteStoreFactory(session);
  app.use(
    session({
      secret: process.env.SECRETKEY || 'mysecretkey',
      resave: false,
      saveUninitialized: false,
      // store sessions in sqlite database
      store: new SQLiteStore({ db: process.env.SESSIONSDBFILE || './db/sessions.sqlite3' }) as session.Store,
      cookie: {
        maxAge: 86400000, // default 1 day
        sameSite: (process.env.COOKIE_SAMESITE as any) || 'lax',
        secure: process.env.COOKIE_SECURE === 'true',
      }
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  if(reset) {
    users.length = 0;
  }
  if(users.length > 0) return; // already initialized
  reloadUsers();
}

async function findUserById(id: number): Promise<User | undefined> {
  const row = await db.connection!.get(
    'SELECT * FROM users WHERE user_id = ?', 
    [id]
  );
  if (!row) return undefined;
  return { ...row, roles: [row.role_id] } as User;
}

async function findUserByUsername(username: string): Promise<User | undefined> {
  const row = await db.connection!.get(
    'SELECT * FROM users WHERE username = ?', 
    [username]
  );
  if (!row) return undefined;
  return { ...row, roles: [row.role_id] } as User;
}

async function findUserByLogin(login: string): Promise<User | undefined> {
  const value = login.trim();
  if (!value) return undefined;
  const row = await db.connection!.get('SELECT * FROM users WHERE username = ? OR email = ?', [value, value]);
  if (!row) return undefined;
  return { ...row, roles: [row.role_id] } as User;
}


// Serialize user to store in session (User -> user.id)
passport.serializeUser((user: Express.User, done: (err: any, id?: number) => void) => {
  done(null, (user as User).user_id);
});

// Deserialize user from session (user.id -> User)
passport.deserializeUser(async (id: number, done: (err: any, user?: User | false | null) => void) => {
  try {
    const user = await findUserById(id);
    done(null, user || false);
  } catch (err) {
    done(err);
  }
});

/**
 * @api {post} /api/auth Login user
 * @apiGroup Authentication
 * @apiName Login
 *
 * @apiDescription
 * Authenticates a user using JSON body credentials.
 * The endpoint expects credentials formatted according to the JSON strategy
 * of Passport (`{ "username": "...", "password": "..." }`).
 *
 * @apiBody {String} username User's login name
 * @apiBody {String} password User's password
 *
 * @apiSuccess {String} message Successful login message
 * @apiSuccess {String} username Authenticated user's username
 * @apiSuccess {Number[]} roles List of numeric role identifiers assigned to the user
 *
 * @apiError (401) Unauthorized Invalid credentials
 * @apiUse HttpError
*/
function authResponse(user: User | undefined | null) {
  if (!user) return { user: null, roles: null };
  return {
    user: {
      user_id: (user as any).user_id,
      username: (user as any).username,
      email: (user as any).email,
      role_id: (user as any).role_id,
      created_at: (user as any).created_at,
    },
    roles: Array.isArray((user as any).roles) ? (user as any).roles : [(user as any).role_id],
  };
}

function loginHandler(req: Request, res: Response, next: NextFunction): void {
  (async () => {
    const { username, password } = req.body ?? {};
    if (!username || !password) throw new HttpError(400, 'username and password are required');

    const user = await findUserByLogin(String(username));
    if (!user) {
      await AuditService.log(req, 'LOGIN_FAILURE', 'users', 0, `Failed login attempt for non-existent user: ${username}`);
      throw new HttpError(401, 'Invalid credentials');
    }
    if (!verifyPassword(String(password), String((user as any).password_hash ?? ''))) {
      await AuditService.log(req, 'LOGIN_FAILURE', 'users', user.user_id, `Failed login attempt (invalid password) for user: ${username}`);
      throw new HttpError(401, 'Invalid credentials');
    }
    (req as any).login(user, (err: any) => {
      if (err) return next(err);
      res.json({
        message: 'Logged in successfully',
        ...authResponse(user ?? null),
      });
    });
  })().catch(next);
}

authRouter.post('', loginHandler);
authRouter.post('/login', loginHandler);

/**
 * @api {delete} /api/auth Logout user
 * @apiGroup Authentication
 * @apiName Logout
 *
 * @apiDescription
 * Logs out the currently authenticated user by terminating their session.
 *
 * @apiSuccess {String} message Logout confirmation message
 *
 * @apiUse HttpError
 */
authRouter.delete('', (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthRequest;  
  authReq.logout((err) => {
    if (err) return next(err);
    res.json({ message: 'Logged out' });
  });
});
authRouter.delete('/logout', (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthRequest;
  authReq.logout((err) => {
    if (err) return next(err);
    res.json({ message: 'Logged out' });
  });
});

/**
 * @api {get} /api/auth Who am I
 * @apiGroup Authentication
 * @apiName WhoAmI
 *
 * @apiDescription
 * Returns information about the currently authenticated user.  
 * If no user is logged in, `username` and `roles` will be `null`.
 *
 * @apiSuccess {String|null} username Authenticated user's username or null if not logged in
 * @apiSuccess {Number[]|null} roles List of user's role IDs or null if not logged in
 *
 * @apiUse HttpError
 */
authRouter.get('', (req: Request, res: Response) => {
  if(req.isAuthenticated()) {
    const user = req.user as User;
    res.json(authResponse(user));
  } else {
    res.json(authResponse(null));
  }
});
authRouter.get('/me', (req: Request, res: Response) => {
  if (req.isAuthenticated()) {
    res.json(authResponse(req.user as User));
  } else {
    res.json(authResponse(null));
  }
});

authRouter.post('/register', async (req: Request, res: Response) => {
  const { username, email, password, role_id } = req.body ?? {};
  if (!username || !email || !password) {
    throw new HttpError(400, 'username, email and password are required');
  }

  await db.connection!.exec('BEGIN IMMEDIATE');
  try {
    const password_hash = hashPassword(String(password));
    const created = await db.connection!.get(
      'INSERT INTO users (username, email, password_hash, role_id) VALUES (?, ?, ?, ?) RETURNING *',
      [String(username), String(email), password_hash, Number(role_id) || 3]
    );
    await db.connection!.exec('COMMIT');

    const user = { ...created, roles: [created.role_id] } as User;

    await AuditService.log(req, 'USER_REGISTER', 'users', created.user_id, `New user registered: ${username} (${email})`);
    
    (req as any).login(user, (err: any) => {
      if (err) return res.status(500).json({ code: 500, message: 'Login after registration failed' });
      res.status(201).json({ message: 'Registered successfully', ...authResponse(user) });
    });
  } catch (error: any) {
    await db.connection!.exec('ROLLBACK');
    if (error.message?.includes('UNIQUE')) throw new HttpError(409, 'Email or username already registered');
    throw new HttpError(400, 'Cannot create user: ' + error.message);
  }
});
