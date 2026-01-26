# Recipe Sharing Web Application

## Full-Stack Node.js & Angular Project

An authentic recipe management system featuring a **Node.js/Express** backend with **SQLite3** and an **Angular** frontend. This project implements a full relational database schema with automated triggers for rating calculations and a paged API for efficient data loading.

---

## 🛠 Prerequisites

Ensure you have **Node.js** (v20+) installed. It is recommended to have the Angular CLI installed globally:

```bash
npm install -g @angular/cli@20

```

---

## 🚀 Getting Started (Development)

### 1. Clone & Install

Clone the repository and install dependencies for both the backend and frontend:

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
npm --prefix frontend install

```

### 2. Configuration

Copy the environment template and customize it if needed (set your `DBFILE` path and server `PORT`):

```bash
cp .env-example .env

```

### 3. Run Development Servers

You will need two separate terminal instances:

**Terminal A: Backend (Node.js)**

```bash
npm run dev

```

*Runs via `ts-node-dev` on [http://localhost:3000*](https://www.google.com/search?q=http://localhost:3000)

**Terminal B: Frontend (Angular)**

```bash
cd frontend
npm run start

```

*Runs on [http://localhost:12166*](https://www.google.com/search?q=http://localhost:12166)

---

## 🏗 Production Deployment

To run the application in a production-ready state, follow these steps to build the static assets and run the compiled server.

### 1. Build the Project

This command triggers the frontend build and compiles the TypeScript backend into the `dist/` folder:

```bash
npm run build

```

### 2. Start the Production Server

Run the compiled JavaScript entry point:

```bash
npm start

```

---

## 🗄 Database Management

### Initializing the Schema

The database uses `PRAGMA user_version` to track the schema state. If `./db/recipes.sqlite3` is missing, the backend will automatically create the relational schema and set up automated **SQL Triggers**.

### Seeding Data

To populate the database with a diverse set of test recipes, world-cuisine ingredients, and pre-configured users:

```bash
npm run seed

```

> **Security Note:** All seeded users (e.g., `admin`, `jdoe`) are configured with the password: **`password123`**.

### Hard Reset

1. Stop the backend server.
2. Delete the `./db/recipes.sqlite3` file.
3. Restart the backend server.

---

## 📡 API Endpoints

The backend implements a Paged API compatible with the `RecipesListQuery` interface.

* **GET** `/api/recipes`
* **Query Params:** `page`, `pageSize`, `textSearch`.
* **Response Format:**


```json
{
  "items": [ { "recipe_id": 1, "title": "...", "average_rating": 4.5 } ],
  "total": 12,
  "page": 1,
  "pageSize": 10
}

```

## 👥 Authors

* **Marina Jendrašić,Nurali Zholdassov** - Full Stack Implementation & Database Seeding
* **Mariusz Jarocki** - Base Project Template & Architecture
