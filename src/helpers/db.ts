import { open, Database } from "sqlite";
import sqlite3 from "sqlite3";
import { hashPassword } from "./password";

export const db: { connection: Database | null } = {
  connection: null
};

export async function openDb(): Promise<void> {
  db.connection = await open({
    filename: process.env.DBFILE || './db/recipes.sqlite3',
    driver: sqlite3.Database
  });

  const { user_version } = await db.connection.get('PRAGMA user_version;');
  
  if (!user_version) {
    await db.connection.exec('PRAGMA user_version = 1;');
    console.log('Initializing Recipe Database Schema...');
    await createSchemaAndData();
  }

  await db.connection.exec('PRAGMA foreign_keys = ON');

  // Lightweight migration: ensure newer tables exist even for older DB files.
  await db.connection.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      report_id INTEGER PRIMARY KEY AUTOINCREMENT,
      reporter_id INTEGER NOT NULL,
      target_type TEXT NOT NULL CHECK (target_type IN ('recipe', 'comment')),
      target_id INTEGER NOT NULL,
      reason TEXT NOT NULL,
      details TEXT,
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'removed')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      reviewed_by_id INTEGER,
      reviewed_at DATETIME,
      FOREIGN KEY (reporter_id) REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
      FOREIGN KEY (reviewed_by_id) REFERENCES users(user_id) ON DELETE SET NULL ON UPDATE CASCADE
    );
  `);

  // Lightweight migration: add new columns as needed.
  try {
    const recipeCols: Array<{ name: string }> = await db.connection.all('PRAGMA table_info(recipes);');
    const hasImageCrop = recipeCols.some((c) => c.name === 'image_crop');
    if (!hasImageCrop) {
      await db.connection.exec('ALTER TABLE recipes ADD COLUMN image_crop TEXT');
    }
    const hasStepsJson = recipeCols.some((c) => c.name === 'steps_json');
    if (!hasStepsJson) {
      await db.connection.exec('ALTER TABLE recipes ADD COLUMN steps_json TEXT');
    }
  } catch {
    // Ignore (e.g. DB missing tables until initialized).
  }
}

export async function createSchemaAndData(): Promise<void> {
  const adminPasswordHash = hashPassword(process.env.ADMINPASSWORD || 'Admin123');
  const schema = `
    PRAGMA foreign_keys = ON;

    CREATE TABLE roles (
        role_id INTEGER PRIMARY KEY AUTOINCREMENT,
        role_name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE users (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active INTEGER DEFAULT 1,
        FOREIGN KEY (role_id) REFERENCES roles(role_id) ON UPDATE CASCADE ON DELETE RESTRICT
    );

    CREATE TABLE categories (
        category_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT
    );

    CREATE TABLE recipes (
        recipe_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        category_id INTEGER,
        title TEXT NOT NULL,
        description TEXT,
        steps TEXT NOT NULL,
        steps_json TEXT,
        image_path TEXT,
        image_crop TEXT,
        average_rating REAL DEFAULT 0.0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE SET NULL ON UPDATE CASCADE
    );

    CREATE TABLE ingredients (
        ingredient_id INTEGER PRIMARY KEY AUTOINCREMENT,
        ingredient_name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE recipe_ingredients (
        recipe_id INTEGER NOT NULL,
        ingredient_id INTEGER NOT NULL,
        quantity REAL NOT NULL,
        unit TEXT NOT NULL,
        PRIMARY KEY (recipe_id, ingredient_id),
        FOREIGN KEY (recipe_id) REFERENCES recipes(recipe_id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (ingredient_id) REFERENCES ingredients(ingredient_id) ON DELETE RESTRICT ON UPDATE CASCADE
    );

    CREATE TABLE tags (
        tag_id INTEGER PRIMARY KEY AUTOINCREMENT,
        tag_name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE recipe_tags (
        recipe_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (recipe_id, tag_id),
        FOREIGN KEY (recipe_id) REFERENCES recipes(recipe_id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(tag_id) ON DELETE CASCADE ON UPDATE CASCADE
    );

    CREATE TABLE comments (
        comment_id INTEGER PRIMARY KEY AUTOINCREMENT,
        recipe_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (recipe_id) REFERENCES recipes(recipe_id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE
    );

    CREATE TABLE ratings (
        rating_id INTEGER PRIMARY KEY AUTOINCREMENT,
        recipe_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        rating_value INTEGER NOT NULL CHECK (rating_value BETWEEN 1 AND 5),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (recipe_id, user_id),
        FOREIGN KEY (recipe_id) REFERENCES recipes(recipe_id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE
    );

    CREATE TABLE favorites (
        user_id INTEGER NOT NULL,
        recipe_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, recipe_id),
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (recipe_id) REFERENCES recipes(recipe_id) ON DELETE CASCADE ON UPDATE CASCADE
    );

    CREATE TABLE reports (
        report_id INTEGER PRIMARY KEY AUTOINCREMENT,
        reporter_id INTEGER NOT NULL,
        target_type TEXT NOT NULL CHECK (target_type IN ('recipe', 'comment')),
        target_id INTEGER NOT NULL,
        reason TEXT NOT NULL,
        details TEXT,
        status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'removed')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        reviewed_by_id INTEGER,
        reviewed_at DATETIME,
        FOREIGN KEY (reporter_id) REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (reviewed_by_id) REFERENCES users(user_id) ON DELETE SET NULL ON UPDATE CASCADE
    );

    CREATE TABLE audit_log (
        log_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action_type TEXT,
        entity_type TEXT,
        entity_id INTEGER,
        action_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        description TEXT,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL ON UPDATE CASCADE
    );

    INSERT INTO roles (role_name) VALUES ('Administrator'), ('Management'), ('Regular User'), ('Control User');

    INSERT INTO categories (name, description) VALUES 
    ('Appetizers', 'Starter dishes'), 
    ('Main Dishes', 'Large meals'), 
    ('Desserts', 'Sweet recipes'), 
    ('Soups', 'Hot and cold soups'), 
    ('Vegan', 'Plant-based recipes');

    INSERT INTO users (username, email, password_hash, role_id) VALUES ('admin', 'admin@example.com', '${adminPasswordHash}', 1);

    CREATE TRIGGER rating_after_insert AFTER INSERT ON ratings BEGIN
        UPDATE recipes SET average_rating = (SELECT IFNULL(ROUND(AVG(rating_value), 2), 0) FROM ratings WHERE recipe_id = NEW.recipe_id) WHERE recipe_id = NEW.recipe_id;
    END;

    CREATE TRIGGER rating_after_update AFTER UPDATE ON ratings BEGIN
        UPDATE recipes SET average_rating = (SELECT IFNULL(ROUND(AVG(rating_value), 2), 0) FROM ratings WHERE recipe_id = NEW.recipe_id) WHERE recipe_id = NEW.recipe_id;
    END;

    CREATE TRIGGER rating_after_delete AFTER DELETE ON ratings BEGIN
        UPDATE recipes SET average_rating = (SELECT IFNULL(ROUND(AVG(rating_value), 2), 0) FROM ratings WHERE recipe_id = OLD.recipe_id) WHERE recipe_id = OLD.recipe_id;
    END;
  `;

  await db.connection!.exec(schema);
  console.log('Database schema, initial data, and triggers created successfully.');
}
