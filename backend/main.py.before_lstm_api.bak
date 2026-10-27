import math
from datetime import date, timedelta
import os
from contextlib import asynccontextmanager
from datetime import date
from decimal import Decimal

import psycopg
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from psycopg.rows import dict_row

load_dotenv()

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "/tmp"),
    "port": int(os.getenv("DB_PORT", "5432")),
    "dbname": os.getenv("DB_NAME", "restaurant_inventory"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", ""),
}


def get_connection():
    return psycopg.connect(**DB_CONFIG, row_factory=dict_row)


def serialize_ingredient(row):
    return {
        "id": row["id"],
        "name": row["name"],
        "category": row["category"],
        "quantity": float(row["quantity"]),
        "unit": row["unit"],
        "min": float(row["min_stock"]),
        "price": float(row["price"]),
        "expiry": row["expiry"],
    }


def initialize_database():
    with get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS ingredients (
                id SERIAL PRIMARY KEY,
                name VARCHAR(120) NOT NULL,
                category VARCHAR(80) NOT NULL,
                quantity NUMERIC(12, 2) NOT NULL DEFAULT 0,
                unit VARCHAR(30) NOT NULL,
                min_stock NUMERIC(12, 2) NOT NULL DEFAULT 0,
                price NUMERIC(12, 2) NOT NULL DEFAULT 0,
                expiry VARCHAR(30) NOT NULL DEFAULT '',
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS waste_records (
                id SERIAL PRIMARY KEY,
                ingredient_name VARCHAR(120) NOT NULL,
                quantity NUMERIC(12, 2) NOT NULL,
                unit VARCHAR(30) NOT NULL,
                reason VARCHAR(120) NOT NULL,
                estimated_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
                recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS menu_items (
                id SERIAL PRIMARY KEY,
                name VARCHAR(120) NOT NULL UNIQUE,
                category VARCHAR(80) NOT NULL DEFAULT 'Main Course',
                selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS recipe_ingredients (
                id SERIAL PRIMARY KEY,
                menu_item_id INTEGER NOT NULL
                    REFERENCES menu_items(id) ON DELETE CASCADE,
                ingredient_id INTEGER NOT NULL
                    REFERENCES ingredients(id) ON DELETE RESTRICT,
                quantity_per_portion NUMERIC(12, 4) NOT NULL
                    CHECK (quantity_per_portion > 0),
                UNIQUE (menu_item_id, ingredient_id)
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS production_records (
                id SERIAL PRIMARY KEY,
                menu_item_id INTEGER NOT NULL
                    REFERENCES menu_items(id) ON DELETE RESTRICT,
                business_date DATE NOT NULL DEFAULT CURRENT_DATE,
                orders_received INTEGER NOT NULL CHECK (orders_received >= 0),
                portions_prepared INTEGER NOT NULL CHECK (portions_prepared >= 0),
                portions_sold INTEGER NOT NULL CHECK (portions_sold >= 0),
                portions_discarded INTEGER NOT NULL
                    CHECK (portions_discarded >= 0),
                portions_carried_forward INTEGER NOT NULL DEFAULT 0
                    CHECK (portions_carried_forward >= 0),
                ingredient_cost_wasted NUMERIC(12, 2) NOT NULL DEFAULT 0,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE (menu_item_id, business_date),
                CHECK (
                    portions_sold + portions_discarded
                    + portions_carried_forward <= portions_prepared
                )
            )
        """)

        count = conn.execute(
            "SELECT COUNT(*) AS total FROM ingredients"
        ).fetchone()["total"]

        # Add demo ingredients only when the inventory is empty.
        if count == 0:
            demo_ingredients = [
                ("Tomatoes", "Vegetables", 18, "kg", 8, 35, "2026-10-14"),
                ("Paneer", "Dairy", 6, "kg", 4, 320, "2026-10-13"),
                ("Basmati Rice", "Grains", 25, "kg", 10, 90, "2027-01-30"),
                ("Cooking Oil", "Oils", 12, "L", 5, 150, "2027-03-20"),
                ("Onions", "Vegetables", 15, "kg", 7, 40, "2026-10-18"),
                ("Fresh Cream", "Dairy", 3, "L", 4, 220, "2026-10-12"),
            ]

            conn.cursor().executemany("""
                INSERT INTO ingredients
                    (name, category, quantity, unit, min_stock, price, expiry)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, demo_ingredients)


@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_database()
    yield


app = FastAPI(
    title="HarvestIQ API",
    description="Restaurant inventory and waste management backend",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class IngredientCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    category: str = Field(min_length=1, max_length=80)
    quantity: float = Field(ge=0)
    unit: str = Field(min_length=1, max_length=30)
    min: float = Field(ge=0)
    price: float = Field(ge=0)
    expiry: str = ""


class WasteCreate(BaseModel):
    ingredient_name: str = Field(min_length=1, max_length=120)
    quantity: float = Field(gt=0)
    unit: str = Field(min_length=1, max_length=30)
    reason: str = Field(min_length=1, max_length=120)
    estimated_cost: float = Field(ge=0, default=0)

class MenuItemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    category: str = Field(default="Main Course", max_length=80)
    selling_price: float = Field(default=0, ge=0)


class RecipeLine(BaseModel):
    ingredient_id: int = Field(gt=0)
    quantity_per_portion: float = Field(gt=0)


class RecipeCreate(BaseModel):
    ingredients: list[RecipeLine] = Field(min_length=1)


class ProductionCreate(BaseModel):
    menu_item_id: int = Field(gt=0)
    business_date: date = Field(default_factory=date.today)
    orders_received: int = Field(ge=0)
    portions_prepared: int = Field(ge=0)
    portions_sold: int = Field(ge=0)
    portions_discarded: int = Field(ge=0)
    portions_carried_forward: int = Field(default=0, ge=0)


@app.get("/")
def root():
    return {
        "message": "Welcome to HarvestIQ API",
        "docs": "/docs",
        "health": "/api/health",
    }


@app.get("/api/health")
def health():
    try:
        with get_connection() as conn:
            conn.execute("SELECT 1")
        return {"status": "healthy", "database": "connected"}
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Database connection failed: {exc}",
        )


@app.get("/api/ingredients")
def get_ingredients():
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM ingredients ORDER BY id DESC"
        ).fetchall()
    return [serialize_ingredient(row) for row in rows]


@app.post("/api/ingredients", status_code=201)
def add_ingredient(ingredient: IngredientCreate):
    with get_connection() as conn:
        row = conn.execute("""
            INSERT INTO ingredients
                (name, category, quantity, unit, min_stock, price, expiry)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """, (
            ingredient.name.strip(),
            ingredient.category.strip(),
            ingredient.quantity,
            ingredient.unit,
            ingredient.min,
            ingredient.price,
            ingredient.expiry,
        )).fetchone()

    return serialize_ingredient(row)


@app.delete("/api/ingredients/{ingredient_id}")
def delete_ingredient(ingredient_id: int):
    with get_connection() as conn:
        row = conn.execute(
            "DELETE FROM ingredients WHERE id = %s RETURNING id",
            (ingredient_id,),
        ).fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="Ingredient not found")

    return {"message": "Ingredient deleted", "id": ingredient_id}


@app.get("/api/summary")
def get_summary():
    with get_connection() as conn:
        inventory = conn.execute("""
            SELECT
                COUNT(*) AS total_items,
                COALESCE(SUM(quantity * price), 0) AS inventory_value,
                COUNT(*) FILTER (WHERE quantity <= min_stock)
                    AS low_stock_count
            FROM ingredients
        """).fetchone()

        waste = conn.execute("""
            SELECT
                COUNT(*) AS waste_records,
                COALESCE(SUM(estimated_cost), 0) AS waste_cost
            FROM waste_records
        """).fetchone()

    return {
        "total_items": inventory["total_items"],
        "inventory_value": float(inventory["inventory_value"]),
        "low_stock_count": inventory["low_stock_count"],
        "waste_records": waste["waste_records"],
        "waste_cost": float(waste["waste_cost"]),
    }


@app.get("/api/waste")
def get_waste_records():
    with get_connection() as conn:
        rows = conn.execute("""
            SELECT id, ingredient_name, quantity, unit, reason,
                   estimated_cost, recorded_at
            FROM waste_records
            ORDER BY recorded_at DESC
        """).fetchall()

    return [
        {
            **row,
            "quantity": float(row["quantity"]),
            "estimated_cost": float(row["estimated_cost"]),
            "recorded_at": row["recorded_at"].isoformat(),
        }
        for row in rows
    ]


@app.post("/api/waste", status_code=201)
def add_waste_record(record: WasteCreate):
    with get_connection() as conn:
        row = conn.execute("""
            INSERT INTO waste_records
                (ingredient_name, quantity, unit, reason, estimated_cost)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, ingredient_name, quantity, unit, reason,
                      estimated_cost, recorded_at
        """, (
            record.ingredient_name.strip(),
            record.quantity,
            record.unit,
            record.reason.strip(),
            record.estimated_cost,
        )).fetchone()

    return {
        **row,
        "quantity": float(row["quantity"]),
        "estimated_cost": float(row["estimated_cost"]),
        "recorded_at": row["recorded_at"].isoformat(),
    }
    
@app.get("/api/menu")
def get_menu():
    with get_connection() as conn:
        items = conn.execute("""
            SELECT id, name, category, selling_price
            FROM menu_items
            ORDER BY name
        """).fetchall()

        result = []

        for item in items:
            recipe = conn.execute("""
                SELECT
                    ri.ingredient_id,
                    i.name AS ingredient_name,
                    i.unit,
                    ri.quantity_per_portion,
                    i.price
                FROM recipe_ingredients ri
                JOIN ingredients i ON i.id = ri.ingredient_id
                WHERE ri.menu_item_id = %s
                ORDER BY i.name
            """, (item["id"],)).fetchall()

            recipe_cost = sum(
                float(line["quantity_per_portion"]) * float(line["price"])
                for line in recipe
            )

            result.append({
                **item,
                "selling_price": float(item["selling_price"]),
                "recipe_cost_per_portion": round(recipe_cost, 2),
                "recipe": [
                    {
                        **line,
                        "quantity_per_portion": float(
                            line["quantity_per_portion"]
                        ),
                        "price": float(line["price"]),
                    }
                    for line in recipe
                ],
            })

    return result


@app.post("/api/menu", status_code=201)
def create_menu_item(item: MenuItemCreate):
    with get_connection() as conn:
        try:
            row = conn.execute("""
                INSERT INTO menu_items (name, category, selling_price)
                VALUES (%s, %s, %s)
                RETURNING id, name, category, selling_price
            """, (
                item.name.strip(),
                item.category.strip(),
                item.selling_price,
            )).fetchone()
        except psycopg.errors.UniqueViolation:
            raise HTTPException(
                status_code=409,
                detail="A menu item with this name already exists.",
            )

    return {
        **row,
        "selling_price": float(row["selling_price"]),
    }


@app.put("/api/menu/{menu_item_id}/recipe")
def save_recipe(menu_item_id: int, recipe: RecipeCreate):
    ingredient_ids = [
        line.ingredient_id for line in recipe.ingredients
    ]

    if len(ingredient_ids) != len(set(ingredient_ids)):
        raise HTTPException(
            status_code=400,
            detail="Each ingredient can appear only once in a recipe.",
        )

    with get_connection() as conn:
        menu_item = conn.execute(
            "SELECT id FROM menu_items WHERE id = %s",
            (menu_item_id,),
        ).fetchone()

        if menu_item is None:
            raise HTTPException(status_code=404, detail="Menu item not found.")

        for line in recipe.ingredients:
            ingredient = conn.execute(
                "SELECT id FROM ingredients WHERE id = %s",
                (line.ingredient_id,),
            ).fetchone()

            if ingredient is None:
                raise HTTPException(
                    status_code=404,
                    detail=f"Ingredient {line.ingredient_id} not found.",
                )

        # Replace the recipe atomically. Existing stock is not changed here.
        conn.execute(
            "DELETE FROM recipe_ingredients WHERE menu_item_id = %s",
            (menu_item_id,),
        )

        for line in recipe.ingredients:
            conn.execute("""
                INSERT INTO recipe_ingredients
                    (menu_item_id, ingredient_id, quantity_per_portion)
                VALUES (%s, %s, %s)
            """, (
                menu_item_id,
                line.ingredient_id,
                line.quantity_per_portion,
            ))

    return {
        "message": "Recipe saved successfully.",
        "menu_item_id": menu_item_id,
        "ingredient_count": len(recipe.ingredients),
    }

@app.post("/api/production", status_code=201)
def record_production(record: ProductionCreate):
    if record.portions_sold > record.orders_received:
        raise HTTPException(
            status_code=400,
            detail="Portions sold cannot exceed orders received.",
        )

    accounted_for = (
        record.portions_sold
        + record.portions_discarded
        + record.portions_carried_forward
    )

    if accounted_for > record.portions_prepared:
        raise HTTPException(
            status_code=400,
            detail="Sold, discarded and carried-forward portions "
                   "cannot exceed portions prepared.",
        )

    with get_connection() as conn:
        existing = conn.execute("""
            SELECT id FROM production_records
            WHERE menu_item_id = %s AND business_date = %s
        """, (
            record.menu_item_id,
            record.business_date,
        )).fetchone()

        if existing:
            raise HTTPException(
                status_code=409,
                detail="A production record already exists for this "
                       "menu item on this date.",
            )

        menu_item = conn.execute("""
            SELECT id, name FROM menu_items WHERE id = %s
        """, (record.menu_item_id,)).fetchone()

        if menu_item is None:
            raise HTTPException(
                status_code=404,
                detail="Menu item not found.",
            )

        recipe = conn.execute("""
            SELECT
                ri.ingredient_id,
                ri.quantity_per_portion,
                i.name,
                i.unit,
                i.quantity AS available_quantity,
                i.price
            FROM recipe_ingredients ri
            JOIN ingredients i ON i.id = ri.ingredient_id
            WHERE ri.menu_item_id = %s
            FOR UPDATE OF i
        """, (record.menu_item_id,)).fetchall()

        if not recipe:
            raise HTTPException(
                status_code=400,
                detail="This menu item has no recipe. Save its recipe first.",
            )

        usage = []
        recipe_cost = 0.0

        # Validate every ingredient before deducting any stock.
        for line in recipe:
            per_portion = float(line["quantity_per_portion"])
            required = per_portion * record.portions_prepared
            available = float(line["available_quantity"])

            if required > available:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Insufficient stock for {line['name']}. "
                        f"Required: {required:.4f} {line['unit']}; "
                        f"available: {available:.4f} {line['unit']}."
                    ),
                )

            recipe_cost += per_portion * float(line["price"])

            usage.append({
                "ingredient_id": line["ingredient_id"],
                "name": line["name"],
                "unit": line["unit"],
                "quantity_used": required,
            })

        waste_cost = round(
            recipe_cost * record.portions_discarded, 2
        )

        # All changes below are part of the same transaction.
        for line in usage:
            conn.execute("""
                UPDATE ingredients
                SET quantity = quantity - %s
                WHERE id = %s
            """, (
                line["quantity_used"],
                line["ingredient_id"],
            ))

        conn.execute("""
            INSERT INTO production_records (
                menu_item_id, business_date, orders_received,
                portions_prepared, portions_sold, portions_discarded,
                portions_carried_forward, ingredient_cost_wasted
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            record.menu_item_id,
            record.business_date,
            record.orders_received,
            record.portions_prepared,
            record.portions_sold,
            record.portions_discarded,
            record.portions_carried_forward,
            waste_cost,
        ))

        if record.portions_discarded > 0:
            conn.execute("""
                INSERT INTO waste_records (
                    ingredient_name, quantity, unit, reason,
                    estimated_cost
                )
                VALUES (%s, %s, %s, %s, %s)
            """, (
                menu_item["name"],
                record.portions_discarded,
                "portions",
                "Discarded prepared food",
                waste_cost,
            ))

    return {
        "message": "Production recorded and inventory updated.",
        "menu_item": menu_item["name"],
        "business_date": record.business_date.isoformat(),
        "orders_received": record.orders_received,
        "portions_prepared": record.portions_prepared,
        "portions_sold": record.portions_sold,
        "portions_discarded": record.portions_discarded,
        "recipe_cost_per_portion": round(recipe_cost, 2),
        "estimated_waste_cost": waste_cost,
        "ingredient_usage": usage,
    }


@app.get("/api/production")
def get_production_history():
    with get_connection() as conn:
        rows = conn.execute("""
            SELECT
                p.*,
                m.name AS menu_item_name
            FROM production_records p
            JOIN menu_items m ON m.id = p.menu_item_id
            ORDER BY p.business_date DESC, p.id DESC
        """).fetchall()

    return [
        {
            **row,
            "ingredient_cost_wasted": float(
                row["ingredient_cost_wasted"]
            ),
            "business_date": row["business_date"].isoformat(),
            "created_at": row["created_at"].isoformat(),
        }
        for row in rows
    ]
    
@app.get("/api/predictions")
def get_predictions(target_date: date | None = None):
    if target_date is None:
        target_date = date.today() + timedelta(days=1)

    with psycopg.connect(**DB_CONFIG, row_factory=dict_row) as conn:
        menu_items = conn.execute(
            """
            SELECT id, name, category, selling_price
            FROM menu_items
            ORDER BY name
            """
        ).fetchall()

        results = []

        for item in menu_items:
            history = conn.execute(
                """
                SELECT business_date, portions_sold
                FROM production_records
                WHERE menu_item_id = %s
                  AND business_date < %s
                  AND business_date >= %s
                ORDER BY business_date DESC
                """,
                (
                    item["id"],
                    target_date,
                    target_date - timedelta(days=56),
                ),
            ).fetchall()

            sales = [
                {
                    "date": row["business_date"],
                    "sold": int(row["portions_sold"]),
                }
                for row in history
            ]

            same_weekday = [
                row["sold"]
                for row in sales
                if row["date"].weekday() == target_date.weekday()
            ]

            if len(same_weekday) >= 2:
                average = sum(same_weekday) / len(same_weekday)
                method = "same_weekday_average"
            elif sales:
                average = sum(row["sold"] for row in sales) / len(sales)
                method = "overall_average"
            else:
                results.append({
                    "menu_item_id": item["id"],
                    "menu_item": item["name"],
                    "target_date": target_date.isoformat(),
                    "predicted_portions": None,
                    "recommended_preparation": None,
                    "historical_records": 0,
                    "method": "insufficient_data",
                    "message": "Record actual sales before generating a forecast.",
                })
                continue

            predicted = max(0, math.ceil(average))
            recommended = math.ceil(average * 1.10)

            results.append({
                "menu_item_id": item["id"],
                "menu_item": item["name"],
                "target_date": target_date.isoformat(),
                "predicted_portions": predicted,
                "recommended_preparation": recommended,
                "historical_records": len(sales),
                "method": method,
                "message": (
                    "Historical-average estimate with a configurable "
                    "10% preparation buffer."
                ),
            })

    return {
        "target_date": target_date.isoformat(),
        "forecast_type": "historical_baseline",
        "predictions": results,
    }


