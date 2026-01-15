import { db, openDb } from "../helpers/db";

export async function resetAndSeed() {
  if (!db.connection) await openDb();
  const conn = db.connection!;

  console.log("Cleaning and re-seeding database...");

  try {
    await conn.exec("PRAGMA foreign_keys = OFF;");

    const tables = [
      "favorites",
      "ratings",
      "comments",
      "recipe_tags",
      "recipe_ingredients",
      "recipes",
      "tags",
      "ingredients",
      "categories",
      "users",
      "roles",
    ];
    for (const table of tables) {
      await conn.exec(`DELETE FROM ${table};`);
      await conn.exec(`DELETE FROM sqlite_sequence WHERE name='${table}';`);
    }

    await conn.exec("PRAGMA foreign_keys = ON;");

    await conn.exec(`
            -- 1. ROLES
INSERT INTO roles (role_name) VALUES ('Administrator'), ('Management'), ('Regular User'), ('Control User');

-- 2. CATEGORIES
INSERT INTO categories (name, description) VALUES 
('Appetizers', 'Starter dishes'), 
('Main Dishes', 'Large meals'), 
('Desserts', 'Sweet recipes'), 
('Soups', 'Hot and cold soups'), 
('Vegan', 'Plant-based recipes'),
('Seafood', 'Fresh from the ocean'),
('Bakery', 'Breads and pastries'),
('Asian', 'Stir-fries, noodles, and rice dishes'),
('Mexican', 'Tacos, burritos, and salsas'),
('Mediterranean', 'Healthy fats, grains, and fresh vegetables');

-- 3. USERS (All passwords are: password123)
INSERT INTO users (username, email, password_hash, role_id) VALUES 
('admin', 'admin@example.com', '7f8e9d0a1b2c3d4e5f6g7h8i9j0k1l2m:9e3b4f5a6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4g5h6i7j8k9l0m1n2o3p4q5r6s7t8u9v0w1x2y3z4', 1),
('jdoe', 'john@example.com', 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6:2d8f9e0a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4g5h6', 3),
('baker_smith', 'smith@bakery.com', 'f1e2d3c4b5a6908776543210abcdefab:1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1e2f3g4h5i6j7k8l9m0n1o2p3q4r5s6t7u8v9w0x1y2z', 3),
('fitness_jane', 'jane@fit.com', '556677889900aabbccddeeff11223344:b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3g4h5i6j7k8l9m0n1o2p3q4r5s6t7u8v9w0x1y2z3a4b5c6d7e8f9g0h1', 3),
('spice_master', 'spice@kitchen.com', 'ccddeeff11223344556677889900aabb:e1f2a3b4c5d6e7f8a9b0c1d2e3f4g5h6i7j8k9l0m1n2o3p4q5r6s7t8u9v0w1x2y3z4a5b6c7d8e9f0g1h2i3j4k5l6m7n8o9p0q1r2', 3);

-- 4. INGREDIENTS
INSERT INTO ingredients (ingredient_name) VALUES 
('Pasta'), ('Tomato Sauce'), ('Garlic'), ('Salmon Fillet'), ('Lemon'), 
('Asparagus'), ('Flour'), ('Yeast'), ('Avocado'), ('Chili Flakes'),
('Soy Sauce'), ('Ginger'), ('Shrimp'), ('Corn Tortillas'), ('Cilantro');

-- 5. RECIPES
-- Simple Pasta (Admin)
INSERT INTO recipes (user_id, category_id, title, description, steps) 
VALUES (1, 2, 'Classic Marinara', 'A simple pasta sauce.', '1. Cook pasta. 2. Add sauce.');

-- Salmon (jdoe)
INSERT INTO recipes (user_id, category_id, title, description, steps) 
VALUES (2, 6, 'Lemon Garlic Salmon', 'Healthy pan-seared salmon.', '1. Season salmon. 2. Sear in pan. 3. Add lemon.');

-- Pad Thai (spice_master)
INSERT INTO recipes (user_id, category_id, title, description, steps) 
VALUES (5, 8, 'Quick Pad Thai', 'Thai street food.', '1. Soak noodles. 2. Fry shrimp. 3. Toss with soy sauce.');

-- 6. RECIPE INGREDIENTS
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES 
(1, 1, 500, 'g'), (1, 2, 1, 'jar'),
(2, 4, 2, 'fillets'), (2, 5, 1, 'whole'),
(3, 11, 2, 'tbsp'), (3, 13, 10, 'pcs');

-- 7. TAGS
INSERT INTO tags (tag_name) VALUES ('Quick'), ('Healthy'), ('Italian'), ('Spicy'), ('Gluten-Free');

-- 8. RECIPE TAGS
INSERT INTO recipe_tags (recipe_id, tag_id) VALUES 
(1, 1), (1, 3), -- Pasta: Quick, Italian
(2, 2), (2, 5), -- Salmon: Healthy, Gluten-Free
(3, 1), (3, 4); -- Pad Thai: Quick, Spicy

-- 9. SOCIAL (Ratings & Comments)
INSERT INTO ratings (recipe_id, user_id, rating_value) VALUES (1, 2, 5), (2, 1, 4);
INSERT INTO comments (recipe_id, user_id, content) VALUES (1, 2, 'Simple but delicious!');

-- 1. Additional Ingredients
INSERT INTO ingredients (ingredient_name) VALUES 
('Ground Turkey'), ('Taco Seasoning'), ('Black Beans'), ('Greek Yogurt'), 
('Blueberries'), ('Oats'), ('Maple Syrup'), ('Ribeye Steak'), 
('Butter'), ('Rosemary'), ('Potatoes'), ('Soy Milk'), ('Chia Seeds');

-- 2. New Recipes 
-- Turkey Tacos (User 4 - fitness_jane, Category 9 - Mexican)
INSERT INTO recipes (user_id, category_id, title, description, steps) 
VALUES (4, 9, 'Lean Turkey Tacos', 'A high-protein, low-fat alternative to beef tacos.', '1. Brown turkey in a skillet. 2. Add seasoning and beans. 3. Serve in warm tortillas with yogurt topping.');

-- Steak & Potatoes (User 3 - baker_smith, Category 2 - Main Dishes)
INSERT INTO recipes (user_id, category_id, title, description, steps) 
VALUES (3, 2, 'Garlic Butter Steak', 'Juicy ribeye with crispy rosemary potatoes.', '1. Cube potatoes and roast with rosemary. 2. Sear steak in butter and garlic for 3 mins per side. 3. Rest and slice.');

-- Berry Overnight Oats (User 4 - fitness_jane, Category 5 - Vegan)
INSERT INTO recipes (user_id, category_id, title, description, steps) 
VALUES (4, 5, 'Blueberry Overnight Oats', 'Perfect meal-prep breakfast.', '1. Mix oats, soy milk, and chia seeds in a jar. 2. Layer with blueberries and maple syrup. 3. Refrigerate overnight.');

-- Tomato Soup (User 1 - admin, Category 4 - Soups)
INSERT INTO recipes (user_id, category_id, title, description, steps) 
VALUES (1, 4, 'Roasted Tomato Soup', 'Warm and comforting classic soup.', '1. Roast tomatoes and garlic. 2. Blend until smooth. 3. Simmer with a splash of cream.');

-- 3. Link Ingredients to these New Recipes
-- Turkey Tacos (Recipe ID 4)
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES 
(4, 16, 500, 'g'), (4, 17, 1, 'packet'), (4, 18, 1, 'can'), (4, 19, 0.5, 'cup');

-- Steak (Recipe ID 5)
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES 
(5, 23, 1, 'lb'), (5, 24, 2, 'tbsp'), (5, 25, 1, 'sprig'), (5, 26, 3, 'large');

-- Oats (Recipe ID 6)
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES 
(6, 21, 1, 'cup'), (6, 27, 1, 'cup'), (6, 28, 1, 'tbsp'), (6, 20, 0.5, 'cup');

-- 4. New Tags
INSERT INTO tags (tag_name) VALUES ('High Protein'), ('Budget Friendly'), ('Meal Prep');

-- 5. Link Tags to New Recipes
INSERT INTO recipe_tags (recipe_id, tag_id) VALUES 
(4, 6), (4, 7), -- Tacos: High Protein, Budget
(5, 6),         -- Steak: High Protein
(6, 8), (6, 5); -- Oats: Meal Prep, Gluten-Free

-- 6. Ratings & Interaction
INSERT INTO ratings (recipe_id, user_id, rating_value) VALUES 
(4, 2, 4), 
(5, 5, 5), 
(6, 1, 5);

INSERT INTO favorites (user_id, recipe_id) VALUES 
(2, 4), 
(3, 5), 
(5, 6);
        `);

    console.log("Database reset and seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}
