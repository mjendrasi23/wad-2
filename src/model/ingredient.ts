import { HttpError } from "../helpers/errors";

export class RecipeIngredient {
  recipe_id: number = 0;
  ingredient_id: number;
  quantity: number;
  unit: string;

  constructor(ingredient_id: number, quantity: number, unit: string) {
    if (!ingredient_id || ingredient_id <= 0) throw new HttpError(400, 'Invalid Ingredient ID');
    if (quantity <= 0) throw new HttpError(400, 'Quantity must be greater than 0');
    if (!unit || unit.trim().length === 0) throw new HttpError(400, 'Unit (e.g., grams, cups) is required');

    this.ingredient_id = ingredient_id;
    this.quantity = quantity;
    this.unit = unit.trim();
  }
}