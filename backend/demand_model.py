"""Shared multi-dish LSTM demand forecasting using labelled simulated sales."""

import csv
import json
import math
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import torch
from torch import nn

BASE = Path(__file__).resolve().parent
DATA_DIR = BASE / "data"
MODEL_DIR = BASE / "models"

CSV_PATH = DATA_DIR / "daily_sales.csv"
MODEL_PATH = MODEL_DIR / "multi_dish_demand_lstm.pt"
META_PATH = MODEL_DIR / "multi_dish_demand_model_metadata.json"

SEED = 42
SEQUENCE_LENGTH = 14
SCALE = 100.0
DEVICE = torch.device("cpu")  # CPU training to avoid MPS out-of-memory errors

torch.manual_seed(SEED)
np.random.seed(SEED)


def calendar_features(day):
    weekday_angle = 2 * math.pi * day.weekday() / 7
    year_length = 366 if (
        date(day.year, 12, 31).timetuple().tm_yday == 366
    ) else 365
    year_angle = 2 * math.pi * day.timetuple().tm_yday / year_length

    return [
        math.sin(weekday_angle),
        math.cos(weekday_angle),
        math.sin(year_angle),
        math.cos(year_angle),
    ]


def load_dataset():
    """Read and validate the supplied simulated sales CSV."""
    if not CSV_PATH.exists():
        raise FileNotFoundError(f"Sales dataset not found: {CSV_PATH}")

    with CSV_PATH.open(newline="", encoding="utf-8") as file:
        rows = list(csv.DictReader(file))

    required = {
        "business_date", "menu_item_name", "portions_sold", "data_source"
    }
    if not rows or not required.issubset(rows[0]):
        raise ValueError(f"CSV must contain these columns: {sorted(required)}")

    parsed = []
    for row in rows:
        if row["data_source"] != "SIMULATED_NOT_REAL_SALES":
            raise ValueError(
                "This training script expects rows explicitly labelled "
                "SIMULATED_NOT_REAL_SALES."
            )

        sold = int(row["portions_sold"])
        if sold < 0:
            raise ValueError("Sales counts cannot be negative.")

        parsed.append({
            "date": date.fromisoformat(row["business_date"]),
            "menu_item": row["menu_item_name"].strip(),
            "sold": sold,
        })

    dishes = sorted({row["menu_item"] for row in parsed})
    dates = sorted({row["date"] for row in parsed})

    if not dishes:
        raise ValueError("No dishes found in sales dataset.")

    expected_dates = [
        dates[0] + timedelta(days=i)
        for i in range((dates[-1] - dates[0]).days + 1)
    ]
    if dates != expected_dates:
        raise ValueError("Sales dataset must have continuous daily coverage.")

    pairs = [(row["date"], row["menu_item"]) for row in parsed]
    if len(pairs) != len(set(pairs)):
        raise ValueError("Duplicate dish/date rows found in sales dataset.")

    expected_pairs = len(dates) * len(dishes)
    if len(parsed) != expected_pairs:
        raise ValueError(
            "Each dish must have one sales row for every date."
        )

    dish_to_index = {name: i for i, name in enumerate(dishes)}
    sales = np.zeros((len(dates), len(dishes)), dtype=np.float32)
    date_to_index = {day: i for i, day in enumerate(dates)}

    for row in parsed:
        sales[date_to_index[row["date"]], dish_to_index[row["menu_item"]]] = (
            row["sold"]
        )

    return dates, dishes, sales


def feature_sequence(sales, dates, target_index, dish_index):
    """Build recent sales and calendar features for one dish and target day."""
    features = []
    target_day = dates[target_index]
    target_weekday = calendar_features(target_day)[:2]

    for index in range(target_index - SEQUENCE_LENGTH, target_index):
        features.append([
            float(sales[index, dish_index]) / SCALE,
            *calendar_features(dates[index]),
            *target_weekday,
        ])

    return np.asarray(features, dtype=np.float32)


class SharedDemandLSTM(nn.Module):
    def __init__(self):
        super().__init__()
        self.lstm = nn.LSTM(
            input_size=7,
            hidden_size=24,
            num_layers=1,
            batch_first=True,
        )
        self.output = nn.Linear(24, 1)

    def forward(self, sequence):
        outputs, _ = self.lstm(sequence)
        return self.output(outputs[:, -1, :])


def build_examples(sales, dates, dish_count, end_index):
    sequences = []
    targets = []

    for dish_index in range(dish_count):
        for target_index in range(SEQUENCE_LENGTH, end_index):
            sequences.append(
                feature_sequence(
                    sales, dates, target_index, dish_index
                )
            )
            targets.append(sales[target_index, dish_index] / SCALE)

    return (
        np.asarray(sequences, dtype=np.float32),
        np.asarray(targets, dtype=np.float32).reshape(-1, 1),
    )


def fit_model(sales, dates, dish_count, end_index, epochs=70):
    x, y = build_examples(sales, dates, dish_count, end_index)

    if len(x) == 0:
        raise ValueError("Not enough sales history to train the model.")

    x_tensor = torch.tensor(x, dtype=torch.float32, device=DEVICE)
    y_tensor = torch.tensor(y, dtype=torch.float32, device=DEVICE)

    model = SharedDemandLSTM().to(DEVICE)
    optimizer = torch.optim.Adam(model.parameters(), lr=0.005)
    loss_fn = nn.MSELoss()

    model.train()
    for _ in range(epochs):
        optimizer.zero_grad()
        loss = loss_fn(model(x_tensor), y_tensor)
        loss.backward()
        optimizer.step()

    return model


def predict_one(model, sales, dates, dish_index, target_day):
    """Forecast one dish using the 14 days immediately before target_day."""
    if len(dates) < SEQUENCE_LENGTH:
        raise ValueError("At least 14 days of sales history are required.")

    if dates[-1] + timedelta(days=1) != target_day:
        raise ValueError(
            "Forecast date must be the day immediately after available history."
        )

    features = []
    target_weekday = calendar_features(target_day)[:2]

    for offset in range(SEQUENCE_LENGTH, 0, -1):
        historical_day = target_day - timedelta(days=offset)
        index = (historical_day - dates[0]).days

        if index < 0 or index >= len(dates) or dates[index] != historical_day:
            raise ValueError(f"Missing historical sales for {historical_day}.")

        features.append([
            float(sales[index, dish_index]) / SCALE,
            *calendar_features(historical_day),
            *target_weekday,
        ])

    tensor = torch.tensor(
        np.asarray(features, dtype=np.float32)[None, :, :],
        dtype=torch.float32,
        device=DEVICE,
    )

    model.eval()
    with torch.no_grad():
        scaled = float(model(tensor).item())

    return max(0, round(scaled * SCALE))


def train_and_save():
    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    dates, dishes, sales = load_dataset()
    if len(dates) <= SEQUENCE_LENGTH + 7:
        raise ValueError("Not enough daily history for training and evaluation.")

    split = int(len(dates) * 0.8)

    # Evaluate on later dates that were excluded from model fitting.
    evaluation_model = fit_model(
        sales, dates, len(dishes), split, epochs=70
    )
    actuals = []
    predictions = []

    for target_index in range(split, len(dates)):
        for dish_index in range(len(dishes)):
            # Uses only the history before each evaluated target date.
            prediction = predict_one(
                evaluation_model,
                sales[:target_index],
                dates[:target_index],
                dish_index,
                dates[target_index],
            )
            predictions.append(prediction)
            actuals.append(int(sales[target_index, dish_index]))

    actuals_array = np.asarray(actuals, dtype=np.float32)
    predictions_array = np.asarray(predictions, dtype=np.float32)
    mae = float(np.mean(np.abs(actuals_array - predictions_array)))
    rmse = float(np.sqrt(np.mean((actuals_array - predictions_array) ** 2)))

    # Fit the final model on all available simulated history.
    final_model = fit_model(
        sales, dates, len(dishes), len(dates), epochs=90
    )
    torch.save(final_model.state_dict(), MODEL_PATH)

    metadata = {
        "model": "SharedDemandLSTM",
        "menu_items": dishes,
        "menu_item_count": len(dishes),
        "training_days": len(dates),
        "training_start": dates[0].isoformat(),
        "training_end": dates[-1].isoformat(),
        "sequence_length": SEQUENCE_LENGTH,
        "device": DEVICE.type,
        "seed": SEED,
        "data_type": "SIMULATED_NOT_REAL_SALES",
        "evaluation_method": (
            "Chronological holdout; one-step predictions using prior "
            "observations from the held-out period."
        ),
        "holdout_days": len(dates) - split,
        "holdout_predictions": len(predictions),
        "holdout_mae_portions": round(mae, 3),
        "holdout_rmse_portions": round(rmse, 3),
        "weights_file": str(MODEL_PATH),
        "dataset_file": str(CSV_PATH),
    }
    META_PATH.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    print("\nSHARED MULTI-DISH LSTM TRAINING COMPLETE")
    print("Menu items:", len(dishes))
    print("Daily dates:", len(dates))
    print("Date range:", dates[0], "to", dates[-1])
    print("Training device:", DEVICE)
    print("Holdout MAE:", round(mae, 2), "portions")
    print("Holdout RMSE:", round(rmse, 2), "portions")
    print("Model saved:", MODEL_PATH)
    print("Metadata saved:", META_PATH)
    print("IMPORTANT: the dataset contains simulated, not real, sales.")


def load_saved_forecasts(target_day):
    """Load the shared model and forecast all dishes for the next day."""
    if not MODEL_PATH.exists() or not META_PATH.exists():
        raise FileNotFoundError(
            "Train the multi-dish model first: python demand_model.py"
        )

    dates, dishes, sales = load_dataset()
    if target_day != dates[-1] + timedelta(days=1):
        raise ValueError(
            f"The dataset ends on {dates[-1]}. This model forecasts only "
            f"the next day, {dates[-1] + timedelta(days=1)}."
        )

    metadata = json.loads(META_PATH.read_text(encoding="utf-8"))
    if metadata.get("data_type") != "SIMULATED_NOT_REAL_SALES":
        raise ValueError("Model metadata has an unexpected data source.")
    if metadata.get("menu_items") != dishes:
        raise ValueError(
            "The dataset's menu list differs from the trained model. Retrain."
        )

    model = SharedDemandLSTM().to(DEVICE)
    model.load_state_dict(
        torch.load(MODEL_PATH, map_location=DEVICE, weights_only=True)
    )
    model.eval()

    return {
        name: predict_one(model, sales, dates, index, target_day)
        for index, name in enumerate(dishes)
    }


def load_saved_forecast(target_day):
    """Compatibility helper for the original single-dish API usage."""
    forecasts = load_saved_forecasts(target_day)
    if "Paneer Butter Masala" not in forecasts:
        raise ValueError("Paneer Butter Masala is missing from the trained model.")
    return forecasts["Paneer Butter Masala"]


if __name__ == "__main__":
    train_and_save()
