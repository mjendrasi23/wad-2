import { HttpError } from "../helpers/errors";

export class Ingredient {
  ingredient_id: number = 0;
  ingredient_name: string;

  constructor(ingredient_name: string) {
    if (!ingredient_name || ingredient_name.trim().length === 0) {
      throw new HttpError(400, 'Ingredient name is required');
    }
    this.ingredient_name = ingredient_name.trim();
  }
}