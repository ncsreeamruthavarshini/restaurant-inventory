from pathlib import Path
from datetime import date, timedelta
import csv
import random
import math

OUT = Path("data")
OUT.mkdir(exist_ok=True)
rng = random.Random(42)

# name, category, selling price, typical portions sold per day
menu = [
    ("Paneer Butter Masala", "Main Course", 240, 32),
    ("Shahi Paneer", "Main Course", 260, 18),
    ("Kadai Paneer", "Main Course", 250, 20),
    ("Palak Paneer", "Main Course", 230, 12),
    ("Paneer Tikka", "Starters", 220, 18),
    ("Dal Tadka", "Main Course", 180, 25),
    ("Dal Makhani", "Main Course", 210, 22),
    ("Chole Masala", "Main Course", 170, 16),
    ("Aloo Gobi", "Main Course", 170, 12),
    ("Mix Veg", "Main Course", 190, 14),
    ("Jeera Rice", "Rice", 140, 24),
    ("Veg Pulao", "Rice", 180, 15),
    ("Veg Biryani", "Rice", 220, 22),
    ("Paneer Biryani", "Rice", 250, 18),
    ("Chicken Biryani", "Rice", 280, 26),
    ("Butter Naan", "Breads", 45, 35),
    ("Tandoori Roti", "Breads", 25, 40),
    ("Plain Roti", "Breads", 15, 45),
    ("Garlic Naan", "Breads", 60, 20),
    ("Masala Dosa", "South Indian", 120, 18),
    ("Idli", "South Indian", 60, 15),
    ("Veg Manchurian", "Chinese", 190, 14),
    ("Hakka Noodles", "Chinese", 180, 16),
    ("Chilli Paneer", "Chinese", 220, 15),
    ("Tomato Soup", "Soup", 100, 10),
    ("Manchow Soup", "Soup", 110, 12),
    ("Veg Sandwich", "Snacks", 130, 14),
    ("French Fries", "Snacks", 120, 18),
    ("Gulab Jamun", "Dessert", 60, 16),
    ("Fresh Lime Soda", "Beverages", 70, 20),
]

# name, category, quantity, unit, minimum stock, price per unit, expiry
# Quantities and stock levels are illustrative starting values.
ingredients = [
    ("Tomatoes", "Vegetables", 15, "kg", 8, 35, "2026-11-05"),
    ("Paneer", "Dairy", 1.5, "kg", 4, 320, "2026-11-02"),
    ("Onions", "Vegetables", 15, "kg", 7, 40, "2026-11-05"),
    ("Cooking Oil", "Oils", 12, "L", 5, 150, "2027-03-20"),
    ("Basmati Rice", "Grains", 25, "kg", 10, 90, "2027-01-30"),
    ("Salt", "Pantry", 6, "kg", 2, 10, "2027-12-31"),
    ("Potato", "Vegetables", 50, "kg", 10, 50, "2026-11-05"),
    ("Wheat Flour", "Grains", 30, "kg", 10, 40, "2027-03-31"),
    ("Maida", "Grains", 15, "kg", 5, 45, "2027-03-31"),
    ("Milk", "Dairy", 10, "L", 4, 60, "2026-11-02"),
    ("Cream", "Dairy", 5, "L", 2, 220, "2026-11-02"),
    ("Butter", "Dairy", 5, "kg", 2, 500, "2026-12-31"),
    ("Yogurt", "Dairy", 8, "kg", 3, 90, "2026-11-03"),
    ("Chicken", "Meat", 10, "kg", 4, 260, "2026-11-02"),
    ("Eggs", "Dairy", 120, "pcs", 30, 7, "2026-11-10"),
    ("Capsicum", "Vegetables", 8, "kg", 3, 80, "2026-11-03"),
    ("Carrots", "Vegetables", 8, "kg", 3, 50, "2026-11-05"),
    ("Cauliflower", "Vegetables", 8, "kg", 3, 60, "2026-11-05"),
    ("Spinach", "Vegetables", 4, "kg", 2, 40, "2026-11-02"),
    ("Green Peas", "Vegetables", 6, "kg", 2, 100, "2026-11-03"),
    ("Ginger Garlic Paste", "Pantry", 4, "kg", 1, 140, "2026-12-31"),
    ("Paneer Masala Spice", "Spices", 2, "kg", 0.5, 300, "2027-12-31"),
    ("Garam Masala", "Spices", 2, "kg", 0.5, 400, "2027-12-31"),
    ("Lentils", "Grains", 12, "kg", 4, 130, "2027-06-30"),
    ("Chickpeas", "Grains", 10, "kg", 3, 100, "2027-06-30"),
    ("Noodles", "Grains", 8, "kg", 3, 100, "2027-06-30"),
    ("Vinegar", "Pantry", 3, "L", 1, 80, "2027-06-30"),
    ("Lemons", "Vegetables", 5, "kg", 2, 70, "2026-11-05"),
    ("Sugar", "Pantry", 8, "kg", 3, 45, "2027-12-31"),
    ("Soft Drink Syrup", "Beverages", 4, "L", 1, 180, "2027-06-30"),
]

# Each recipe: menu item -> ingredient name: quantity required per portion.
# These are estimated demonstration recipes, not verified restaurant recipes.
recipes = {
    "Paneer Butter Masala": {"Paneer": 0.15, "Tomatoes": 0.10, "Onions": 0.04, "Cream": 0.02, "Butter": 0.015},
    "Shahi Paneer": {"Paneer": 0.15, "Tomatoes": 0.08, "Onions": 0.05, "Cream": 0.025, "Butter": 0.01},
    "Kadai Paneer": {"Paneer": 0.15, "Tomatoes": 0.08, "Onions": 0.05, "Capsicum": 0.04, "Cooking Oil": 0.015},
    "Palak Paneer": {"Paneer": 0.13, "Spinach": 0.12, "Onions": 0.04, "Cooking Oil": 0.015},
    "Paneer Tikka": {"Paneer": 0.18, "Yogurt": 0.04, "Capsicum": 0.04, "Onions": 0.03},
    "Dal Tadka": {"Lentils": 0.10, "Tomatoes": 0.04, "Onions": 0.03, "Butter": 0.01},
    "Dal Makhani": {"Lentils": 0.10, "Tomatoes": 0.05, "Cream": 0.02, "Butter": 0.015},
    "Chole Masala": {"Chickpeas": 0.12, "Tomatoes": 0.05, "Onions": 0.04, "Cooking Oil": 0.01},
    "Aloo Gobi": {"Potato": 0.12, "Cauliflower": 0.12, "Tomatoes": 0.03, "Cooking Oil": 0.015},
    "Mix Veg": {"Carrots": 0.04, "Cauliflower": 0.05, "Green Peas": 0.04, "Capsicum": 0.04, "Cooking Oil": 0.015},
    "Jeera Rice": {"Basmati Rice": 0.10, "Cooking Oil": 0.008, "Salt": 0.002},
    "Veg Pulao": {"Basmati Rice": 0.10, "Carrots": 0.03, "Green Peas": 0.03, "Cooking Oil": 0.012},
    "Veg Biryani": {"Basmati Rice": 0.12, "Yogurt": 0.03, "Onions": 0.04, "Carrots": 0.03, "Cooking Oil": 0.015},
    "Paneer Biryani": {"Basmati Rice": 0.11, "Paneer": 0.10, "Yogurt": 0.03, "Onions": 0.04, "Cooking Oil": 0.015},
    "Chicken Biryani": {"Basmati Rice": 0.12, "Chicken": 0.15, "Yogurt": 0.03, "Onions": 0.05, "Cooking Oil": 0.02},
    "Butter Naan": {"Maida": 0.10, "Yogurt": 0.02, "Butter": 0.012},
    "Tandoori Roti": {"Wheat Flour": 0.08, "Salt": 0.001},
    "Plain Roti": {"Wheat Flour": 0.06, "Salt": 0.001},
    "Garlic Naan": {"Maida": 0.10, "Yogurt": 0.02, "Butter": 0.01, "Ginger Garlic Paste": 0.005},
    "Masala Dosa": {"Potato": 0.12, "Cooking Oil": 0.015, "Onions": 0.03},
    "Idli": {"Rice": 0.10, "Salt": 0.001},
    "Veg Manchurian": {"Carrots": 0.04, "Capsicum": 0.04, "Onions": 0.03, "Maida": 0.04, "Cooking Oil": 0.02, "Vinegar": 0.005},
    "Hakka Noodles": {"Noodles": 0.12, "Capsicum": 0.04, "Carrots": 0.04, "Onions": 0.03, "Cooking Oil": 0.015, "Vinegar": 0.005},
    "Chilli Paneer": {"Paneer": 0.15, "Capsicum": 0.05, "Onions": 0.03, "Cooking Oil": 0.02, "Vinegar": 0.005},
    "Tomato Soup": {"Tomatoes": 0.18, "Cream": 0.015, "Butter": 0.008, "Salt": 0.002},
    "Manchow Soup": {"Carrots": 0.03, "Capsicum": 0.02, "Onions": 0.02, "Noodles": 0.02, "Cooking Oil": 0.01, "Salt": 0.002},
    "Veg Sandwich": {"Wheat Flour": 0.08, "Potato": 0.05, "Tomatoes": 0.03, "Onions": 0.02, "Butter": 0.01},
    "French Fries": {"Potato": 0.20, "Cooking Oil": 0.025, "Salt": 0.002},
    "Gulab Jamun": {"Milk": 0.08, "Sugar": 0.04, "Cooking Oil": 0.015},
    "Fresh Lime Soda": {"Lemons": 0.04, "Sugar": 0.02, "Soft Drink Syrup": 0.02},
}

# Fix Idli recipe ingredient naming by including Rice in the ingredient catalogue.
ingredients.append(("Rice", "Grains", 10, "kg", 4, 70, "2027-01-30"))

with (OUT / "menu_items.csv").open("w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=[
        "name", "category", "selling_price", "price_source"
    ])
    writer.writeheader()
    for name, category, price, _ in menu:
        writer.writerow({
            "name": name,
            "category": category,
            "selling_price": price,
            "price_source": "illustrative_demo_price",
        })

with (OUT / "ingredients.csv").open("w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=[
        "name", "category", "quantity", "unit", "min_stock", "price",
        "expiry", "data_source"
    ])
    writer.writeheader()
    for name, category, quantity, unit, minimum, price, expiry in ingredients:
        writer.writerow({
            "name": name,
            "category": category,
            "quantity": quantity,
            "unit": unit,
            "min_stock": minimum,
            "price": price,
            "expiry": expiry,
            "data_source": "illustrative_demo_inventory",
        })

with (OUT / "recipes.csv").open("w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=[
        "menu_item_name", "ingredient_name", "quantity_per_portion",
        "quantity_unit", "data_source"
    ])
    writer.writeheader()
    for dish, lines in recipes.items():
        for ingredient, quantity in lines.items():
            writer.writerow({
                "menu_item_name": dish,
                "ingredient_name": ingredient,
                "quantity_per_portion": quantity,
                "quantity_unit": next(row[3] for row in ingredients if row[0] == ingredient),
                "data_source": "estimated_demo_recipe",
            })

# Generate 365 days of simulated sales per menu item.
# This is a model-development dataset, NOT actual restaurant sales.
start = date(2025, 10, 26)
days = 365

with (OUT / "daily_sales.csv").open("w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=[
        "business_date", "menu_item_name", "portions_sold", "data_source"
    ])
    writer.writeheader()

    for day_index in range(days):
        business_day = start + timedelta(days=day_index)
        for name, category, price, base_demand in menu:
            weekend_factor = 1.25 if business_day.weekday() >= 5 else 1.0
            weekly_pattern = 1.10 if business_day.weekday() == 4 else 1.0
            slow_day = 0.85 if business_day.weekday() == 1 else 1.0
            gradual_trend = 1.0 + 0.0003 * day_index
            noise = rng.uniform(0.75, 1.25)
            expected = base_demand * weekend_factor * weekly_pattern * slow_day * gradual_trend * noise
            sold = max(0, round(expected))
            writer.writerow({
                "business_date": business_day.isoformat(),
                "menu_item_name": name,
                "portions_sold": sold,
                "data_source": "SIMULATED_NOT_REAL_SALES",
            })

print("CSV generation complete.")
for filename in [
    "menu_items.csv",
    "ingredients.csv",
    "recipes.csv",
    "daily_sales.csv",
]:
    path = OUT / filename
    with path.open(encoding="utf-8") as f:
        row_count = sum(1 for _ in f) - 1
    print(f"{path}: {row_count} rows")
print("\nNo database records were changed.")
print("All recipe quantities, inventory values and sales are demonstration data.")
