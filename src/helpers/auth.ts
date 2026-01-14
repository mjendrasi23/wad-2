import { scryptSync, randomBytes } from 'crypto';
import { Express, Request, Response, NextFunction, Router, RequestHandler } from 'express';
import session from 'express-session';
import passport from 'passport';
import SQLiteStoreFactory from 'connect-sqlite3';

import { User } from '../model/user';
import { HttpError } from './errors';
import { reloadUsers } from './sysdb';
import { db } from "../helpers/db";


export const authRouter = Router();

interface AuthRequest extends Request {
  user?: User;
}

export function requireRole(roles: number[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;
    const user = authReq.user as User | undefined;
    const hasRole = user?.roles?.some(role => roles.includes(role));
    if (!hasRole) {
      throw new HttpError(403, 'You do not have permission to do this');
    }
    next();
  };
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  const hashToCompare = scryptSync(password, salt, 64).toString('hex');
  return hash === hashToCompare;
}

export const users: User[] = []

// Initialize authentication
export async function initAuth(app: Express, reset: boolean = false): Promise<void> {

  // Define JSON strategy
  const { Strategy } = require('passport-json') as any;
  passport.use(
  new Strategy(async (username: string, password: string, done: any) => {
    try {
      const user = await findUserByUsername(username);
      
      if (!user) {
        return done(null, false, { message: 'User not found' });
      }
      
      if (!verifyPassword(password, user.password_hash || '')) {
        return done(null, false, { message: 'Invalid password' });
      }
      
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

  // Middleware setup with persistent sessions
  const SQLiteStore = SQLiteStoreFactory(session);
  app.use(
    session({
      secret: process.env.SECRETKEY || 'mysecretkey',
      resave: false,
      saveUninitialized: false,
      // store sessions in sqlite database
      store: new SQLiteStore({ db: process.env.SESSIONSDBFILE || './db/sessions.sqlite3' }) as session.Store,
      cookie: { maxAge: 86400000 } // default 1 day
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
  return await db.connection!.get(
    'SELECT * FROM users WHERE user_id = ?', 
    [id]
  );
}

async function findUserByUsername(username: string): Promise<User | undefined> {
  return await db.connection!.get(
    'SELECT * FROM users WHERE username = ?', 
    [username]
  );
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
authRouter.post('', passport.authenticate('json'), (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  res.json({
    message: 'Logged in successfully',
    username: authReq.user?.username,
    roles: authReq.user?.roles
  });
});

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
    res.json({ username: user.username, roles: user.roles });
  } else {
    res.json({ username: null, roles: null });
  }
});