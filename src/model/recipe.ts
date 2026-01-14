
import { HttpError } from "../helpers/errors";

export class Recipe {
  recipe_id: number = 0;
  user_id: number;
  category_id: number | null;
  title: string;
  description: string;
  steps: string;
  image_path?: string;
  
  constructor(user_id: number, title: string, steps: string, category_id?: number) {
    if (!user_id || user_id <= 0) throw new HttpError(400, 'Valid User ID required');
    if (!title || title.trim().length === 0) throw new HttpError(400, 'Title is required');
    if (!steps || steps.trim().length === 0) throw new HttpError(400, 'Recipe steps are required');

    this.user_id = user_id;
    this.title = title.trim();
    this.steps = steps.trim();
    this.category_id = category_id || null;
    this.description = ""; 
  }
}