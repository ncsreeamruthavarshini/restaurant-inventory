import argparse
import csv
from pathlib import Path

from main import get_connection

DATA = Path("data")


def read_csv(filename):
    with (DATA / filename).open(
        encoding="utf-8", newline=""
    ) as file:
        return list(csv.DictReader(file))


def key(value):
    return value.strip().casefold()


def main():
    parser = argparse.ArgumentParser(
        description="Safely import RestaurantIQ CSV data."
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Apply the import. Without this flag, perform a dry run.",
    )
    args = parser.parse_args()

    menu_csv = read_csv("menu_items.csv")
    ingredients_csv = read_csv("ingredients.csv")
    recipes_csv = read_csv("recipes.csv")
    sales_csv = read_csv("daily_sales.csv")

    # Validate CSV references before connecting to the database.
    menu_names = {key(row["name"]) for row in menu_csv}
    ingredient_names = {key(row["name"]) for row in ingredients_csv}

    if len(menu_names) != len(menu_csv):
        raise ValueError("Duplicate menu names in menu_items.csv.")
    if len(ingredient_names) != len(ingredients_csv):
        raise ValueError("Duplicate ingredient names in ingredients.csv.")

    for row in recipes_csv:
        if key(row["menu_item_name"]) not in menu_names:
            raise ValueError(
                f"Unknown menu item in recipes.csv: {row['menu_item_name']}"
            )
        if key(row["ingredient_name"]) not in ingredient_names:
            raise ValueError(
                f"Unknown ingredient in recipes.csv: {row['ingredient_name']}"
            )
        if float(row["quantity_per_portion"]) <= 0:
            raise ValueError("Recipe quantities must be positive.")

    mode = "APPLY" if args.apply else "DRY RUN"
    print(f"=== RESTAURANT CSV IMPORT: {mode} ===")
    print("Sales rows found:", len(sales_csv))
    print("Sales rows to import: 0 (kept separate from production records)")

    with get_connection() as conn:
        # The connection context commits on success and rolls back on error.
        existing_menu_rows = conn.execute(
            "SELECT id, name FROM menu_items"
        ).fetchall()
        existing_ingredient_rows = conn.execute(
            "SELECT id, name, unit FROM ingredients"
        ).fetchall()

        existing_menu = {
            key(row["name"]): dict(row) for row in existing_menu_rows
        }
        existing_ingredients = {
            key(row["name"]): dict(row) for row in existing_ingredient_rows
        }

        new_menu = [
            row for row in menu_csv
            if key(row["name"]) not in existing_menu
        ]
        new_ingredients = [
            row for row in ingredients_csv
            if key(row["name"]) not in existing_ingredients
        ]

        # Never silently link a recipe to an existing ingredient with a
        # different measurement unit.
        for row in ingredients_csv:
            old = existing_ingredients.get(key(row["name"]))
            if old and old["unit"].strip().casefold() != key(row["unit"]):
                raise ValueError(
                    f"Unit mismatch for {old['name']}: database unit "
                    f"is {old['unit']!r}, CSV unit is {row['unit']!r}."
                )

        # Only recipes belonging to menu items newly added by this import
        # will be created. Existing recipes are never deleted or replaced.
        new_menu_keys = {key(row["name"]) for row in new_menu}
        recipes_to_add = [
            row for row in recipes_csv
            if key(row["menu_item_name"]) in new_menu_keys
        ]

        recipe_ingredient_keys = {
            key(row["ingredient_name"]) for row in recipes_to_add
        }
        unavailable = sorted(
            name for name in recipe_ingredient_keys
            if name not in ingredient_names
        )
        if unavailable:
            raise ValueError(f"Missing recipe ingredients: {unavailable}")

        print("Existing menu items preserved:", len(existing_menu))
        print("New menu items:", len(new_menu))
        print("Existing ingredients preserved:", len(existing_ingredients))
        print("New ingredients:", len(new_ingredients))
        print("New recipe mappings planned:", len(recipes_to_add))

        if not args.apply:
            print("\nDRY RUN ONLY: no database records were changed.")
            print("Review this preview before running with --apply.")
            return

        # Insert only missing ingredients. Existing stock, prices,
        # expiry dates, and minimum stock values remain unchanged.
        for row in new_ingredients:
            conn.execute(
                """
                INSERT INTO ingredients
                    (name, category, quantity, unit, min_stock, price, expiry)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    row["name"].strip(),
                    row["category"].strip(),
                    float(row["quantity"]),
                    row["unit"].strip(),
                    float(row["min_stock"]),
                    float(row["price"]),
                    row["expiry"].strip(),
                ),
            )

        # Insert only missing menu items. Existing prices/categories
        # are not updated.
        for row in new_menu:
            conn.execute(
                """
                INSERT INTO menu_items (name, category, selling_price)
                VALUES (%s, %s, %s)
                """,
                (
                    row["name"].strip(),
                    row["category"].strip(),
                    float(row["selling_price"]),
                ),
            )

        # Re-read IDs after inserts, using case-insensitive name matching.
        menu_ids = {
            key(row["name"]): row["id"]
            for row in conn.execute(
                "SELECT id, name FROM menu_items"
            ).fetchall()
        }
        ingredient_ids = {
            key(row["name"]): row["id"]
            for row in conn.execute(
                "SELECT id, name FROM ingredients"
            ).fetchall()
        }

        # Add recipe mappings only for newly inserted menu items.
        for row in recipes_to_add:
            conn.execute(
                """
                INSERT INTO recipe_ingredients
                    (menu_item_id, ingredient_id, quantity_per_portion)
                VALUES (%s, %s, %s)
                """,
                (
                    menu_ids[key(row["menu_item_name"])],
                    ingredient_ids[key(row["ingredient_name"])],
                    float(row["quantity_per_portion"]),
                ),
            )

        print("\nImport completed within one database transaction.")
        print("Menu items inserted:", len(new_menu))
        print("Ingredients inserted:", len(new_ingredients))
        print("Recipe mappings inserted:", len(recipes_to_add))
        print("Existing stock and recipes were not overwritten.")


if __name__ == "__main__":
    main()
