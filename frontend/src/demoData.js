
export const demoData = {
  restaurant: {
    name: "Olive & Thyme",
    subtitle: "Restaurant operations dashboard",
  },

  inventory: [
    { id: 1, name: "Paneer", category: "Dairy", quantity: 8, unit: "kg", minStock: 5, cost: 320, expiry: "2026-10-14" },
    { id: 2, name: "Tomatoes", category: "Vegetables", quantity: 3, unit: "kg", minStock: 8, cost: 45, expiry: "2026-10-13" },
    { id: 3, name: "Basmati Rice", category: "Grains", quantity: 24, unit: "kg", minStock: 10, cost: 110, expiry: "2026-11-20" },
    { id: 4, name: "Fresh Cream", category: "Dairy", quantity: 2, unit: "L", minStock: 5, cost: 210, expiry: "2026-10-15" },
    { id: 5, name: "Onions", category: "Vegetables", quantity: 12, unit: "kg", minStock: 8, cost: 35, expiry: "2026-10-18" },
    { id: 6, name: "Chicken", category: "Meat", quantity: 6, unit: "kg", minStock: 5, cost: 280, expiry: "2026-10-13" },
    { id: 7, name: "Cooking Oil", category: "Pantry", quantity: 15, unit: "L", minStock: 6, cost: 150, expiry: "2027-01-10" },
    { id: 8, name: "Spinach", category: "Vegetables", quantity: 2, unit: "kg", minStock: 4, cost: 60, expiry: "2026-10-13" },
  ],

  recipes: [
    { id: 1, name: "Paneer Butter Masala", category: "Main Course", portions: 4, prepTime: 30, cost: 180, sellingPrice: 320, ingredients: "Paneer, tomatoes, cream, butter, spices", emoji: "🍛" },
    { id: 2, name: "Vegetable Biryani", category: "Rice", portions: 4, prepTime: 40, cost: 140, sellingPrice: 280, ingredients: "Basmati rice, vegetables, herbs, spices", emoji: "🍚" },
    { id: 3, name: "Palak Paneer", category: "Main Course", portions: 4, prepTime: 25, cost: 160, sellingPrice: 290, ingredients: "Spinach, paneer, onions, cream", emoji: "🥬" },
    { id: 4, name: "Butter Chicken", category: "Main Course", portions: 4, prepTime: 35, cost: 220, sellingPrice: 380, ingredients: "Chicken, tomatoes, cream, butter, spices", emoji: "🍗" },
    { id: 5, name: "Masala Dosa", category: "Breakfast", portions: 2, prepTime: 20, cost: 55, sellingPrice: 140, ingredients: "Dosa batter, potatoes, onions, chutney", emoji: "🥞" },
    { id: 6, name: "Fresh Lime Soda", category: "Beverages", portions: 1, prepTime: 5, cost: 18, sellingPrice: 80, ingredients: "Lime, soda, sugar, mint", emoji: "🍋" },
  ],

  sales: [
    { day: "Mon", revenue: 18500, orders: 72 },
    { day: "Tue", revenue: 21200, orders: 84 },
    { day: "Wed", revenue: 19800, orders: 78 },
    { day: "Thu", revenue: 24600, orders: 96 },
    { day: "Fri", revenue: 28900, orders: 112 },
    { day: "Sat", revenue: 34200, orders: 138 },
    { day: "Sun", revenue: 31500, orders: 126 },
  ],

  waste: [
    { day: "Mon", amount: 2.8, cost: 620 },
    { day: "Tue", amount: 2.1, cost: 480 },
    { day: "Wed", amount: 3.4, cost: 790 },
    { day: "Thu", amount: 1.9, cost: 420 },
    { day: "Fri", amount: 2.6, cost: 610 },
    { day: "Sat", amount: 4.1, cost: 950 },
    { day: "Sun", amount: 3.2, cost: 740 },
  ],

  wasteReasons: [
    { name: "Over-preparation", value: 38 },
    { name: "Expired ingredients", value: 26 },
    { name: "Plate leftovers", value: 21 },
    { name: "Storage damage", value: 15 },
  ],

  predictions: [
    { id: 1, name: "Paneer Butter Masala", predicted: 34, prepare: 38, trend: "+12%", confidence: "High" },
    { id: 2, name: "Vegetable Biryani", predicted: 42, prepare: 46, trend: "+8%", confidence: "High" },
    { id: 3, name: "Butter Chicken", predicted: 28, prepare: 31, trend: "+5%", confidence: "Medium" },
    { id: 4, name: "Palak Paneer", predicted: 21, prepare: 23, trend: "-3%", confidence: "Medium" },
    { id: 5, name: "Masala Dosa", predicted: 48, prepare: 53, trend: "+15%", confidence: "High" },
    { id: 6, name: "Fresh Lime Soda", predicted: 36, prepare: 40, trend: "+10%", confidence: "Medium" },
  ],

  activities: [
    { id: 1, title: "Tomatoes running low", detail: "Only 3 kg remaining", time: "10 min ago", type: "warning" },
    { id: 2, title: "Inventory updated", detail: "Basmati rice stock received", time: "35 min ago", type: "success" },
    { id: 3, title: "Waste report generated", detail: "Weekly waste analysis ready", time: "1 hour ago", type: "info" },
    { id: 4, title: "Fresh stock expiring soon", detail: "Spinach and chicken need attention", time: "2 hours ago", type: "warning" },
  ],
};
