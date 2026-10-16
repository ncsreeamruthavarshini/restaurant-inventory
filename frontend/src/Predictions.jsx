
import { useEffect, useState } from "react";

const demoForecast = [
  { day: "Mon", demand: 34 },
  { day: "Tue", demand: 42 },
  { day: "Wed", demand: 38 },
  { day: "Thu", demand: 51 },
  { day: "Fri", demand: 67 },
  { day: "Sat", demand: 78 },
  { day: "Sun", demand: 61 },
];

const demoIngredients = [
  { name: "Paneer", unit: "kg", stock: 8, demand: 12, confidence: 89 },
  { name: "Tomatoes", unit: "kg", stock: 15, demand: 11, confidence: 92 },
  { name: "Onions", unit: "kg", stock: 10, demand: 14, confidence: 87 },
  { name: "Cream", unit: "L", stock: 4, demand: 6, confidence: 85 },
  { name: "Rice", unit: "kg", stock: 20, demand: 16, confidence: 94 },
];

const demoMenuItems = [
  {
    name: "Paneer Butter Masala",
    category: "Main course",
    demand: 36,
    batchSize: 4,
    prepTime: 20,
  },
  {
    name: "Veg Biryani",
    category: "Rice",
    demand: 28,
    batchSize: 4,
    prepTime: 25,
  },
  {
    name: "Dal Tadka",
    category: "Main course",
    demand: 24,
    batchSize: 6,
    prepTime: 15,
  },
  {
    name: "Masala Dosa",
    category: "South Indian",
    demand: 32,
    batchSize: 4,
    prepTime: 10,
  },
  {
    name: "Veg Fried Rice",
    category: "Rice",
    demand: 20,
    batchSize: 4,
    prepTime: 15,
  },
];


const panel = {
  background: "#fffdf8",
  border: "1px solid #e8e6dc",
  borderRadius: 16,
  padding: 20,
};

export default function Predictions() {
  const [forecast, setForecast] = useState(demoForecast);
  const [ingredients, setIngredients] = useState(demoIngredients);
  const [mode, setMode] = useState("Demo forecast");
  const [period, setPeriod] = useState("7 days");
  const [updated, setUpdated] = useState(false);
  const [wasteBuffer, setWasteBuffer] = useState(10);
  const [menuItems, setMenuItems] = useState(demoMenuItems);


  useEffect(() => {
    let cancelled = false;

    async function loadForecast() {
      try {
        const response = await fetch("http://localhost:8000/api/predictions");
        if (!response.ok) throw new Error("Prediction API unavailable");

        const data = await response.json();

        // Use backend results only when they match the expected format.
        const rows = Array.isArray(data) ? data : data.forecast;
        if (!Array.isArray(rows) || rows.length === 0) {
          throw new Error("No forecast records");
        }

        const mapped = rows.map((item, index) => ({
          day: item.day || item.date || `Day ${index + 1}`,
          demand: Number(item.demand ?? item.predicted_demand ?? item.prediction ?? 0),
        }));

        if (mapped.some((item) => !Number.isFinite(item.demand))) {
          throw new Error("Invalid forecast data");
        }

        if (!cancelled) {
          setForecast(mapped);
          if (Array.isArray(data.ingredients) && data.ingredients.length) {
            setIngredients(data.ingredients);
          }
          setMode("Backend forecast");
        }
      } catch {
        // Keep the demonstration usable when the API or history is unavailable.
        if (!cancelled) setMode("Demo forecast");
      } finally {
        if (!cancelled) setUpdated(true);
      }
    }

    loadForecast();
    return () => {
      cancelled = true;
    };
  }, []);

  const maxDemand = Math.max(...forecast.map((item) => item.demand), 1);
  const totalDemand = forecast.reduce((sum, item) => sum + item.demand, 0);
  const needsRestock = ingredients.filter((item) => item.demand > item.stock);
  const estimatedCoverage = totalDemand
    ? Math.round((ingredients.reduce((sum, item) => sum + item.stock, 0) /
        Math.max(ingredients.reduce((sum, item) => sum + item.demand, 0), 1)) * 100)
    : 0;

  const visibleForecast = period === "3 days" ? forecast.slice(0, 3) : forecast;
  const visibleMax = Math.max(...visibleForecast.map((item) => item.demand), 1);
  
const productionPlan = menuItems.map((item) => {
  const initialTarget = Math.floor(
    (item.demand * (1 - wasteBuffer / 100)) / item.batchSize
  ) * item.batchSize;

  const firstBatch = Math.min(
    item.demand,
    Math.max(item.batchSize, initialTarget)
  );

  return {
    ...item,
    firstBatch,
    remaining: Math.max(0, item.demand - firstBatch),
  };
});

const totalPortions = productionPlan.reduce(
  (sum, item) => sum + item.demand,
  0
);

const firstBatchTotal = productionPlan.reduce(
  (sum, item) => sum + item.firstBatch,
  0
);

  return (
    <div style={{ color: "#24372c", fontFamily: "inherit", paddingBottom: 30 }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        gap: 16, flexWrap: "wrap", marginBottom: 24
      }}>
        <div>
          <div style={{ color: "#b16c37", fontSize: 11, fontWeight: 800, letterSpacing: 2 }}>
            SMART PLANNING
          </div>
          <h1 style={{ fontSize: 28, margin: "7px 0", color: "#21372b" }}>
            Demand Predictions
          </h1>
          <p style={{ color: "#788176", margin: 0 }}>
            Plan purchases, prepare for busy days, and reduce overstocking.
          </p>
        </div>
        <span style={{
          background: mode === "Backend forecast" ? "#e2f3e7" : "#fff0d9",
          color: mode === "Backend forecast" ? "#267044" : "#8b5a20",
          padding: "9px 13px", borderRadius: 30, fontSize: 12, fontWeight: 700
        }}>
          ● {mode}
        </span>
      </div>

      {mode === "Demo forecast" && (
        <div style={{
          padding: "12px 15px", background: "#fff4df", color: "#785b2c",
          borderRadius: 10, marginBottom: 20, fontSize: 13, lineHeight: 1.6
        }}>
          <strong>Demonstration mode:</strong> These sample forecasts demonstrate the
          interface and recommendation logic. They are illustrative, not predictions
          trained on your restaurant's historical sales.
        </div>
      )}

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(175px,1fr))",
        gap: 14, marginBottom: 22
      }}>
        {[
          { label: "Forecast demand", value: `${totalDemand} units`, note: "Across displayed days" },
          { label: "Ingredients to restock", value: needsRestock.length, note: "Demand exceeds available stock" },
          { label: "Ingredients monitored", value: ingredients.length, note: "Sample ingredient list" },
          { label: "Stock coverage indicator", value: `${estimatedCoverage}%`, note: "Illustrative stock-to-demand ratio" },
        ].map((card) => (
          <div key={card.label} style={{ ...panel, padding: 18 }}>
            <div style={{ fontSize: 12, color: "#7b8378", marginBottom: 13 }}>{card.label}</div>
            <div style={{ fontSize: 27, fontWeight: 800, color: "#284b36" }}>{card.value}</div>
            <div style={{ fontSize: 11, color: "#9a9d91", marginTop: 8 }}>{card.note}</div>
          </div>
        ))}
      </div>

      <div style={{ ...panel, marginBottom: 22 }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 12, marginBottom: 25
        }}>
          <div>
            <h2 style={{ fontSize: 17, margin: "0 0 6px" }}>Expected demand trend</h2>
            <p style={{ color: "#83897e", fontSize: 12, margin: 0 }}>
              Relative demand index · sample units
            </p>
          </div>
          <select value={period} onChange={(e) => setPeriod(e.target.value)}
            style={{
              padding: "9px 12px", border: "1px solid #dedfd4", borderRadius: 9,
              background: "#fffdf8", color: "#334b39"
            }}>
            <option>7 days</option>
            <option>3 days</option>
          </select>
        </div>

        <div style={{
          height: 205, display: "flex", alignItems: "end", gap: 12,
          borderBottom: "1px solid #e8e6dc", padding: "0 6px"
        }}>
          {visibleForecast.map((item) => (
            <div key={item.day} style={{
              flex: 1, height: "100%", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "end", minWidth: 0
            }}>
              <span style={{ fontSize: 11, color: "#647264", marginBottom: 7 }}>
                {item.demand}
              </span>
              <div title={`${item.day}: ${item.demand} sample units`} style={{
                width: "min(100%, 48px)",
                height: `${Math.max((item.demand / visibleMax) * 135, 8)}px`,
                background: item.demand === visibleMax ? "#d58b4c" : "#537b5d",
                borderRadius: "7px 7px 2px 2px",
                transition: "height .3s"
              }} />
              <span style={{ fontSize: 11, color: "#737b70", padding: "9px 0" }}>
                {item.day}
              </span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 12, color: "#858b80", margin: "14px 0 0" }}>
          Higher values indicate busier expected demand in this demonstration.
        </p>
      </div>

<div style={{
  background: "#fffdf8",
  border: "1px solid #e8e6dc",
  borderRadius: 16,
  padding: 20,
  marginBottom: 22,
  color: "#24372c"
}}>
  <div style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12
  }}>
    <div>
      <div style={{
        color: "#b16c37",
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: 2
      }}>
        SMART PRODUCTION PLANNING
      </div>
      <h2 style={{ fontSize: 19, margin: "8px 0" }}>
        What should the kitchen prepare?
      </h2>
      <p style={{ fontSize: 12, color: "#858b80", margin: 0 }}>
        Forecast demand, prepare smaller batches, and replenish as orders arrive.
      </p>
    </div>
    <div style={{
      background: "#e5f3e7",
      color: "#34734b",
      padding: "9px 12px",
      borderRadius: 10,
      fontSize: 12,
      fontWeight: 700
    }}>
      {firstBatchTotal} initial portions
    </div>
  </div>

  <div style={{
    background: "#f6f5ee",
    padding: 15,
    borderRadius: 12,
    marginTop: 18,
    marginBottom: 18
  }}>
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 10
    }}>
      <label style={{ fontSize: 13, fontWeight: 700 }}>
        Conservative preparation setting
      </label>
      <strong style={{ color: "#b16c37" }}>{wasteBuffer}%</strong>
    </div>

    <input
      type="range"
      min="0"
      max="30"
      step="5"
      value={wasteBuffer}
      onChange={(e) => setWasteBuffer(Number(e.target.value))}
      style={{ width: "100%", accentColor: "#537b5d" }}
      aria-label="Conservative preparation setting"
    />

    <div style={{
      display: "flex",
      justifyContent: "space-between",
      fontSize: 10,
      color: "#858b80"
    }}>
      <span>Prepare closer to forecast</span>
      <span>Start more conservatively</span>
    </div>
  </div>

  <div style={{ overflowX: "auto" }}>
    <table style={{
      width: "100%",
      borderCollapse: "collapse",
      minWidth: 620,
      fontSize: 12
    }}>
      <thead>
        <tr style={{
          background: "#f6f5ee",
          color: "#737b70",
          textAlign: "left"
        }}>
          {[
            "Menu item",
            "Expected demand",
            "Initial batch",
            "Keep available to cook",
            "Batch size"
          ].map((heading) => (
            <th key={heading} style={{ padding: 12 }}>
              {heading}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {productionPlan.map((item) => (
          <tr
            key={item.name}
            style={{ borderBottom: "1px solid #efeee7" }}
          >
            <td style={{ padding: 12 }}>
              <strong>{item.name}</strong>
              <div style={{
                color: "#858b80",
                fontSize: 10,
                marginTop: 4
              }}>
                {item.category}
              </div>
            </td>
            <td style={{ padding: 12 }}>
              {item.demand} portions
            </td>
            <td style={{ padding: 12 }}>
              <strong style={{ color: "#34734b" }}>
                {item.firstBatch}
              </strong>
            </td>
            <td style={{ padding: 12 }}>
              {item.remaining} portions
            </td>
            <td style={{ padding: 12 }}>
              {item.batchSize} portions
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>

  <div style={{
    marginTop: 16,
    padding: 14,
    borderRadius: 10,
    background: "#edf3e9",
    fontSize: 12,
    lineHeight: 1.7
  }}>
    <strong>Production recommendation</strong>
    <p style={{ margin: "5px 0" }}>
      Prepare approximately {firstBatchTotal} portions initially,
      out of {totalPortions} forecast portions. Keep the remaining
      {` ${Math.max(0, totalPortions - firstBatchTotal)} `}
      portions as potential follow-up production, not as food already cooked.
    </p>
    <span style={{ color: "#657361" }}>
      These are illustrative forecasts. Review live orders, preparation
      times, food-safety limits, and actual sales before following the plan.
    </span>
  </div>
</div>

      <div style={{ ...panel, marginBottom: 22 }}>
        <h2 style={{ fontSize: 17, margin: "0 0 6px" }}>Ingredient demand planner</h2>
        <p style={{ fontSize: 12, color: "#858b80", margin: "0 0 18px" }}>
          Compare current stock with estimated demand for the planning period.
        </p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 570, fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "#7b8378", background: "#f6f5ee" }}>
                {["Ingredient", "Current stock", "Est. demand", "Confidence*", "Status"].map((heading) => (
                  <th key={heading} style={{ padding: 12, fontWeight: 700 }}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ingredients.map((item) => {
                const low = Number(item.demand) > Number(item.stock);
                return (
                  <tr key={item.name} style={{ borderBottom: "1px solid #efeee7" }}>
                    <td style={{ padding: 13, fontWeight: 700 }}>{item.name}</td>
                    <td style={{ padding: 13 }}>{item.stock} {item.unit}</td>
                    <td style={{ padding: 13 }}>{item.demand} {item.unit}</td>
                    <td style={{ padding: 13 }}>{item.confidence ?? "—"}%</td>
                    <td style={{ padding: 13 }}>
                      <span style={{
                        color: low ? "#a64c37" : "#34734b",
                        background: low ? "#fbe8e1" : "#e5f3e7",
                        borderRadius: 20, padding: "6px 9px", fontSize: 11, fontWeight: 700
                      }}>
                        {low ? "Restock suggested" : "Stock sufficient"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 11, color: "#858b80", marginTop: 15 }}>
          *Confidence figures are illustrative in demo mode; they are not measured model accuracy.
        </p>
      </div>

      <div style={{
        background: "#243f30", color: "#fffaf0", borderRadius: 16, padding: 22
      }}>
        <div style={{ color: "#e6b078", fontSize: 11, fontWeight: 800, letterSpacing: 1.5 }}>
          AUTOMATED RECOMMENDATIONS
        </div>
        <h2 style={{ fontSize: 18, margin: "9px 0 15px" }}>What should you prepare for?</h2>
        {needsRestock.length ? needsRestock.map((item) => (
          <div key={item.name} style={{
            padding: "11px 0", borderBottom: "1px solid #45614c",
            display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13
          }}>
            <span>{item.name}: consider purchasing more</span>
            <strong style={{ color: "#f1bd82", whiteSpace: "nowrap" }}>
              +{Math.max(item.demand - item.stock, 0)} {item.unit}
            </strong>
          </div>
        )) : <p>Current sample stock covers the estimated demand.</p>}
        <p style={{ fontSize: 11, color: "#d3ddcf", marginBottom: 0, marginTop: 14 }}>
          Recommendations compare sample stock and sample demand; verify quantities before purchasing.
        </p>
      </div>
    </div>
  );
}
