# Recipe Management API v1.0.0

# Table of contents

- [Authentication](#authentication)
  - [Login user](#login-user)
  - [Logout user](#logout-user)
  - [Who am I](#who-am-i)
- [Users](#users)
  - [Register user](#register-user)
  - [Retrieve all users](#retrieve-all-users)
  - [Get user details](#get-user-details)
- [Recipes](#recipes)
  - [Retrieve recipes](#retrieve-recipes)
  - [Add new recipe](#add-new-recipe)
  - [Delete recipe](#delete-recipe)
- [Categories, Tags & Ingredients](#meta)
  - [Manage Categories](#manage-categories)
  - [Manage Tags](#manage-tags)
  - [Manage Ingredients](#manage-ingredients)
- [Interactions](#interactions)
  - [Comments](#comments)
  - [Ratings](#ratings)

---

# <a name="authentication"></a> Authentication

## Login user
Authenticates a user using a username and password. [cite_start]Returns user info and roles[cite: 13].
- **POST** `/api/auth`
- **Body**: `{ "username": "...", "password": "..." }`
- [cite_start]**Success (200 OK)**: Returns `{ "username": "...", "roles": [number] }`[cite: 13].

## Logout user
[cite_start]Terminates the current session[cite: 13].
- **DELETE** `/api/auth`
- [cite_start]**Success (200 OK)**: `{ "message": "Logout confirmation" }`[cite: 13].

## Who am I
[cite_start]Returns the current authenticated user's info or null if guest[cite: 13].
- **GET** `/api/auth`
- [cite_start]**Success (200 OK)**: `{ "username": "admin", "roles": [1] }`[cite: 13].

---

# <a name="users"></a> Users

## Register user
[cite_start]Creates a new user account[cite: 4].
- **POST** `/api/users`
- **Body**: `{ "username": "...", "email": "...", "password": "...", "role_id": 3 }`
- [cite_start]**Success (201 Created)**: Returns the created user object[cite: 4].
- [cite_start]**Error (409 Conflict)**: Email already registered[cite: 4].

## Retrieve all users
Retrieves a list of all registered users. [cite_start]Restricted to Management/Admin[cite: 4].
- **GET** `/api/users`
- [cite_start]**Success (200 OK)**: Returns an array of user objects[cite: 4].

---

# <a name="recipes"></a> Recipes

## Retrieve recipes
[cite_start]Gets all recipes with pagination and filtering[cite: 10].
- **GET** `/api/recipes`
- [cite_start]**Query Params**: `limit`, `offset`, `q` (filter)[cite: 10, 13].
- [cite_start]**Success (200 OK)**: Returns array of recipes with pagination info[cite: 10].

## Add new recipe
Creates a new recipe entry. [cite_start]Requires authentication[cite: 10].
- **POST** `/api/recipes`
- **Body**: `{ "title": "...", "steps": "...", "category_id": number, "description": "..." }`
- [cite_start]**Success (201 Created)**: Returns the created recipe[cite: 10].

## Delete recipe
Deletes a recipe. [cite_start]Only allowed for the Owner or Admin/Management[cite: 10].
- **DELETE** `/api/recipes/:id`
- [cite_start]**Success (204 No Content)**: Recipe deleted[cite: 10].
- [cite_start]**Error (403 Forbidden)**: Not the recipe owner[cite: 10].

---

# <a name="meta"></a> Categories, Tags & Ingredients

## Manage Categories
- [cite_start]**GET** `/api/categories`: Retrieves all recipe categories[cite: 4].
- [cite_start]**POST** `/api/categories`: Creates a new category (Management only)[cite: 4].
- [cite_start]**PUT** `/api/categories/:id`: Updates category info (Management only)[cite: 10].

## Manage Tags
- [cite_start]**GET** `/api/tags`: Gets all available tags[cite: 13].
- [cite_start]**POST** `/api/tags`: Creates a new tag (Management only)[cite: 13].

## Manage Ingredients
- [cite_start]**GET** `/api/ingredients`: Gets all ingredients with search/filter[cite: 16].
- [cite_start]**DELETE** `/api/ingredients/:id`: Deletes an ingredient (Only if not used in any recipes)[cite: 16].
- [cite_start]**Error (409 Conflict)**: Ingredient is used in recipes and cannot be deleted[cite: 16].

---

# <a name="interactions"></a> Interactions

## Comments
- [cite_start]**GET** `/api/comment/:recipeid`: Gets all comments for a recipe[cite: 19].
- [cite_start]**POST** `/api/comment/:recipeid`: Adds a comment to a recipe[cite: 19].
- [cite_start]**DELETE** `/api/comment/:id`: Deletes a comment (Author or Admin only)[cite: 19].

## Ratings
- **PUT** `/api/rating/:id`: Updates a rating (1-5). [cite_start]Triggers automatic average recalculation[cite: 19].
- [cite_start]**DELETE** `/api/rating/:id`: Deletes a rating[cite: 19].