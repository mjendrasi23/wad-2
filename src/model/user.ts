import { HttpError } from "../helpers/errors";

export class User {
  user_id: number = 0;
  username: string;
  email: string;
  password_hash: string;
  role_id: number;
  is_active: number;
  roles: number[]; 

  constructor(username: string, email: string, password_hash: string, role_id: number = 3) {
    if (!username || username.trim().length < 3) 
      throw new HttpError(400, 'Username must be at least 3 characters');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) 
      throw new HttpError(400, 'Invalid email format');
    if (!password_hash) 
      throw new HttpError(400, 'Password hash is required');
    
    this.username = username.trim();
    this.email = email.trim().toLowerCase();
    this.password_hash = password_hash;
    this.role_id = role_id;
    this.is_active = 1;
    
    // Initialize roles as an array containing the single role_id
    // This allows user.roles.some(...) to function correctly
    this.roles = [role_id];
  }
}