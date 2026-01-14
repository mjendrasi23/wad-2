import { HttpError } from "../helpers/errors";

export class Comment {
  constructor(public recipe_id: number, public user_id: number, public content: string) {
    if (!content || content.trim().length === 0) throw new HttpError(400, 'Comment cannot be empty');
  }
}