import { HttpError } from "../helpers/errors";
export class Rating {
  constructor(public recipe_id: number, public user_id: number, public value: number) {
    if (value < 1 || value > 5) throw new HttpError(400, 'Rating must be between 1 and 5');
  }
}