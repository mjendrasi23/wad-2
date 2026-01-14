import { Category } from '../models/category';
import { Comment } from '../models/comment';
import { Favorite } from '../models/favorite';
import { Rating } from '../models/rating';
import { Recipe } from '../models/recipe';
import { Report } from '../models/report';
import { User, UserPrivate } from '../models/user';

export interface MockDb {
  version: 1;
  users: User[];
  userPrivate: UserPrivate[];
  categories: Category[];
  recipes: Recipe[];
  comments: Comment[];
  ratings: Rating[];
  favorites: Favorite[];
  reports: Report[];
}

