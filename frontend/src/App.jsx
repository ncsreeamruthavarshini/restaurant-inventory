import Chefly from "./Chefly";
import { useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard, Package, ChefHat, Trash2, Search,
  Plus, Bell, Leaf, TrendingDown, AlertTriangle,
  Clock, IndianRupee, X, Menu, ArrowUpRight,
  CheckCircle2, Sparkles, BrainCircuit
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, CartesianGrid, PieChart, Pie, Cell
} from 'recharts';
import Predictions from './Predictions';
import './App.css';

const API_BASE = 'http://localhost:8000/api';

const salesData = [
  { day: 'Mon', sales: 8200, waste: 850 },
  { day: 'Tue', sales: 9600, waste: 620 },
  { day: 'Wed', sales: 7800, waste: 910 },
  { day: 'Thu', sales: 11200, waste: 540 },
  { day: 'Fri', sales: 12800, waste: 720 },
  { day: 'Sat', sales: 15400, waste: 460 },
  { day: 'Sun', sales: 13900, waste: 380 },
];

const wasteData = [
  { name: 'Vegetables', value: 38, color: '#66876d' },
  { name: 'Dairy', value: 27, color: '#e8b96d' },
  { name: 'Prepared food', value: 22, color: '#d98570' },
  { name: 'Grains', value: 13, color: '#8e91bb' },
];

const recipes = [
  {
    name: 'Paneer Butter Masala',
    category: 'North Indian',
    ingredients: 'Paneer, tomatoes, cream, butter',
    price: '₹280',
    tag: 'Popular',
  },
  {
    name: 'Vegetable Biryani',
    category: 'Rice & Biryani',
    ingredients: 'Basmati rice, vegetables, spices',
    price: '₹240',
    tag: 'Low waste',
  },
  {
    name: 'Dal Tadka',
    category: 'North Indian',
    ingredients: 'Lentils, tomatoes, onions, spices',
    price: '₹180',
    tag: 'Budget friendly',
  },
  {
    name: 'Veg Hakka Noodles',
    category: 'Indo-Chinese',
    ingredients: 'Noodles, cabbage, carrots, sauces',
    price: '₹210',
    tag: 'Popular',
  },
];

const money = n =>
  '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');

function localISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function expiryToISO(value) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const target = new Date();
  target.setHours(0, 0, 0, 0);

  if (value === 'Tomorrow') {
    target.setDate(target.getDate() + 1);
  } else if (value !== 'Today') {
    const match = value.match(/^(\d+)\s+days?$/);
    if (match) target.setDate(target.getDate() + Number(match[1]));
  }

  return localISODate(target);
}

function expiryDays(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(`${value}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;

  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function expiryDisplay(value) {
  const days = expiryDays(value);

  if (days === null) return value || 'Not set';
  if (days < 0) return `Expired ${Math.abs(days)}d ago`;
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days <= 30) return `${days} days`;

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}

function isExpiringSoon(value) {
  const days = expiryDays(value);

  if (days !== null) return days >= 0 && days <= 1;
  return ['Today', 'Tomorrow'].includes(value);
}

function App() {
  const [inventory, setInventory] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [summary, setSummary] = useState(null);
  const [page, setPage] = useState('Overview');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [showAdd, setShowAdd] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [form, setForm] = useState({
    name: '',
    category: 'Vegetables',
    quantity: '',
    unit: 'kg',
    min: '',
    price: '',
    expiry: '7 days',
  });

  const inventoryValue = inventory.reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.price),
    0
  );

  const lowStock = inventory.filter(
    item => Number(item.quantity) <= Number(item.min)
  );

  const expiring = inventory.filter(item => isExpiringSoon(item.expiry));

  const filtered = useMemo(() => {
    return inventory.filter(item =>
      item.name.toLowerCase().includes(search.toLowerCase()) &&
      (category === 'All' || item.category === category)
    );
  }, [inventory, search, category]);

  function notify(message) {
    setNotice(message);
  }

  async function loadSummary() {
    try {
      const response = await fetch(`${API_BASE}/summary`);
      if (response.ok) setSummary(await response.json());
    } catch {
      // The dashboard can still work if summary retrieval fails.
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        const response = await fetch(`${API_BASE}/ingredients`);

        if (!response.ok) {
          throw new Error('Could not load inventory.');
        }

        const data = await response.json();
        if (!cancelled) setInventory(data);
      } catch {
        if (!cancelled) {
          setNotice('Could not load inventory. Check that the backend is running.');
        }
      } finally {
        if (!cancelled) setLoadingInventory(false);
      }

      if (!cancelled) {
        try {
          const response = await fetch(`${API_BASE}/summary`);
          if (response.ok && !cancelled) {
            setSummary(await response.json());
          }
        } catch {
          // Summary is optional.
        }
      }
    }

    initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  async function addIngredient(e) {
    e.preventDefault();

    if (!form.name.trim() || form.quantity === '' || form.price === '') {
      notify('Please fill in the required fields.');
      return;
    }

    const payload = {
      ...form,
      name: form.name.trim(),
      quantity: Number(form.quantity),
      min: Number(form.min || 0),
      price: Number(form.price),
      expiry: expiryToISO(form.expiry),
    };

    setSaving(true);

    try {
      const response = await fetch(`${API_BASE}/ingredients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          typeof error.detail === 'string'
            ? error.detail
            : 'Please check your ingredient details.'
        );
      }

      const savedIngredient = await response.json();

      setInventory(old => [savedIngredient, ...old]);
      setForm({
        name: '',
        category: 'Vegetables',
        quantity: '',
        unit: 'kg',
        min: '',
        price: '',
        expiry: '7 days',
      });
      setShowAdd(false);
      setPage('Inventory');
      notify('Ingredient saved to PostgreSQL!');
      loadSummary();
    } catch (error) {
      notify(error.message || 'Unable to save ingredient.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteIngredient(id) {
    if (deletingId !== null) return;

    setDeletingId(id);

    try {
      const response = await fetch(`${API_BASE}/ingredients/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          typeof error.detail === 'string'
            ? error.detail
            : 'Could not delete ingredient.'
        );
      }

      setInventory(old => old.filter(item => item.id !== id));
      notify('Ingredient deleted from PostgreSQL.');
      loadSummary();
    } catch (error) {
      notify(error.message || 'Unable to delete ingredient.');
    } finally {
      setDeletingId(null);
    }
  }

  const nav = [
    { label: 'Overview', icon: LayoutDashboard },
    { label: 'Inventory', icon: Package },
    { label: 'Recipes', icon: ChefHat },
    { label: 'Waste Analytics', icon: Trash2 },
    { label: 'Demand Predictions', icon: BrainCircuit },
  ];

  const descriptions = {
    Overview: 'Here’s what’s happening in your kitchen today.',
    Inventory: 'Every ingredient accounted for. Every rupee considered.',
    Recipes: 'Make smarter menu decisions with the ingredients you have.',
    'Waste Analytics': 'Understand your food waste and find opportunities to save.',
    'Demand Predictions': 'Forecast menu demand and plan preparation using recorded sales.',
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><Leaf size={23} /></div>
          <div>
            <strong>harvest<span>iq</span></strong>
            <small>SMART KITCHEN OS</small>
          </div>
          <button
            className="mobile-close"
            onClick={() => setMobileMenu(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="workspace">
          <div className="workspace-avatar">O</div>
          <div>
            <strong>Olive &amp; Thyme</strong>
            <small>Restaurant workspace</small>
          </div>
          <span className="workspace-dot" />
        </div>

        <div className="nav-caption">WORKSPACE</div>

        <nav className="navigation">
          {nav.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-item ${page === label ? 'active' : ''}`}
              onClick={() => {
                setPage(label);
                setMobileMenu(false);
              }}
            >
              <Icon size={18} />
              <span>{label}</span>
              {label === 'Inventory' && (
                <span className="nav-count">{inventory.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="eco-card">
            <div className="eco-icon"><Leaf size={17} /></div>
            <strong>Small changes. Big impact.</strong>
            <p>Track food smarter and move towards a zero-waste kitchen.</p>
            <div className="eco-progress"><span /></div>
            <small>YOUR SUSTAINABILITY JOURNEY</small>
          </div>

          <div className="profile">
            <div className="profile-avatar">OC</div>
            <div>
              <strong>Olive &amp; Thyme</strong>
              <small>Kitchen manager</small>
            </div>
            <span className="profile-menu">•••</span>
          </div>
        </div>
      </aside>

      {mobileMenu && (
        <button
          className="mobile-overlay"
          onClick={() => setMobileMenu(false)}
          aria-label="Close menu"
        />
      )}

      <main className="main-area">
        <header className="topbar">
          <button
            className="mobile-menu-button"
            onClick={() => setMobileMenu(true)}
            aria-label="Open menu"
          >
            <Menu size={21} />
          </button>

          <div className="breadcrumbs">
            Workspace <span>/</span> <strong>{page}</strong>
          </div>

          <div className="topbar-actions">
            <div className="live-status"><span /> Live overview</div>
            <button
              className="icon-button notification-button"
              onClick={() => notify(`${lowStock.length} ingredients need a stock check.`)}
              aria-label="Notifications"
            >
              <Bell size={19} /><i />
            </button>
            <div className="today-date">
              {new Intl.DateTimeFormat('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              }).format(new Date())}
            </div>
          </div>
        </header>

        <div className="page-content">
          {notice && (
            <div className="toast" role="status">
              <CheckCircle2 size={17} />
              {notice}
              <button onClick={() => setNotice('')} aria-label="Dismiss notification">
                <X size={15} />
              </button>
            </div>
          )}

          <section className="welcome-row">
            <div>
              <div className="eyebrow">
                <Sparkles size={14} /> YOUR KITCHEN, IN CONTROL
              </div>
              <h1>
                {page === 'Overview' ? <>Good evening, <em>chef.</em></> : page}
              </h1>
              <p>{descriptions[page]}</p>
            </div>

            <button className="primary-button" onClick={() => setShowAdd(true)}>
              <Plus size={18} /> Add ingredient
            </button>
          </section>

          {page === 'Overview' && (
            <>
              <section className="stats-grid">
                <Stat
                  icon={IndianRupee}
                  label="Inventory value"
                  value={money(inventoryValue)}
                  detail="Calculated from database stock"
                  trend="Live inventory"
                  color="green"
                />
                <Stat
                  icon={AlertTriangle}
                  label="Low stock items"
                  value={lowStock.length.toString().padStart(2, '0')}
                  detail="Need replenishment"
                  trend={`${lowStock.length} alerts`}
                  color="amber"
                />
                <Stat
                  icon={Clock}
                  label="Expiring soon"
                  value={expiring.length.toString().padStart(2, '0')}
                  detail="Today or tomorrow"
                  trend="Review stock"
                  color="coral"
                />
                <Stat
                  icon={TrendingDown}
                  label="Waste this week"
                  value={money(summary?.waste_cost ?? 4480)}
                  detail={summary ? 'Recorded waste cost' : 'Illustrative sample data'}
                  trend={summary ? `${summary.waste_records} records` : 'Sample only'}
                  color="blue"
                />
              </section>

              <section className="insight-banner">
                <div className="insight-symbol"><Sparkles size={22} /></div>
                <div className="insight-copy">
                  <span>HARVEST INSIGHT · LIVE INVENTORY</span>
                  <strong>
                    {loadingInventory
                      ? 'Checking your kitchen stock...'
                      : lowStock.length
                        ? `${lowStock.length} ingredients are at or below their minimum stock.`
                        : 'All ingredients are above minimum stock.'}
                  </strong>
                  <p>Review replenishment and use ingredients expiring soon before ordering more.</p>
                </div>
                <button onClick={() => setPage('Inventory')}>
                  Review inventory <ArrowUpRight size={16} />
                </button>
              </section>

              <section className="analytics-grid">
                <div className="panel sales-panel">
                  <div className="panel-heading">
                    <div>
                      <span className="panel-kicker">PERFORMANCE</span>
                      <h2>Sales vs. food waste</h2>
                      <p>Weekly kitchen performance · sample figures</p>
                    </div>
                    <button className="select-chip">This week⌄</button>
                  </div>

                  <div className="chart-legend">
                    <span><i className="legend-sales" /> Sales</span>
                    <span><i className="legend-waste" /> Food waste</span>
                  </div>

                  <div className="sales-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={salesData}
                        margin={{ top: 10, right: 6, left: -18, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#65866d" stopOpacity={0.2} />
                            <stop offset="100%" stopColor="#65866d" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#edf0e9" vertical={false} />
                        <XAxis
                          dataKey="day"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#92998e', fontSize: 12 }}
                          dy={10}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#92998e', fontSize: 11 }}
                          tickFormatter={v => `${v / 1000}k`}
                        />
                        <Tooltip
                          formatter={v => money(v)}
                          contentStyle={{
                            border: '1px solid #e7e9e2',
                            borderRadius: 12,
                            fontSize: 12,
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="sales"
                          name="Sales"
                          stroke="#63856b"
                          strokeWidth={2.5}
                          fill="url(#salesFill)"
                        />
                        <Area
                          type="monotone"
                          dataKey="waste"
                          name="Food waste"
                          stroke="#e2ad69"
                          strokeWidth={2}
                          fill="none"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="panel waste-panel">
                  <div className="panel-heading">
                    <div>
                      <span className="panel-kicker">WASTE BREAKDOWN</span>
                      <h2>Where waste happens</h2>
                      <p>By ingredient category · sample figures</p>
                    </div>
                  </div>

                  <div className="waste-chart-wrap">
                    <div className="waste-donut">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={wasteData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius="66%"
                            outerRadius="90%"
                            paddingAngle={4}
                            stroke="none"
                          >
                            {wasteData.map(item => (
                              <Cell key={item.name} fill={item.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={v => `${v}%`} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="donut-center">
                        <strong>100%</strong><small>sample waste</small>
                      </div>
                    </div>
                  </div>

                  <div className="waste-legend">
                    {wasteData.map(item => (
                      <div key={item.name}>
                        <span><i style={{ background: item.color }} />{item.name}</span>
                        <strong>{item.value}%</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="panel inventory-panel">
                <div className="panel-heading inventory-heading">
                  <div>
                    <span className="panel-kicker">KITCHEN STOCKROOM</span>
                    <h2>Inventory at a glance</h2>
                    <p>Your database ingredients, their status, their value.</p>
                  </div>
                  <button className="text-button" onClick={() => setPage('Inventory')}>
                    View all inventory <ArrowUpRight size={15} />
                  </button>
                </div>

                {loadingInventory
                  ? <p className="loading-message">Loading ingredients from PostgreSQL...</p>
                  : <InventoryTable items={inventory.slice(0, 5)} />}
              </section>
            </>
          )}

          {page === 'Inventory' && (
            <section className="panel inventory-panel full-inventory">
              <div className="inventory-tools">
                <div>
                  <h2>Ingredient inventory</h2>
                  <p>
                    {loadingInventory
                      ? 'Loading inventory...'
                      : `${inventory.length} ingredients in your stockroom`}
                  </p>
                </div>

                <div className="filter-tools">
                  <div className="search-box">
                    <Search size={17} />
                    <input
                      placeholder="Search ingredients..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  </div>

                  <select value={category} onChange={e => setCategory(e.target.value)}>
                    <option>All</option>
                    <option>Dairy</option>
                    <option>Vegetables</option>
                    <option>Grains</option>
                    <option>Pantry</option>
                    <option>Oils</option>
                  </select>
                </div>
              </div>

              {loadingInventory
                ? <p className="loading-message">Loading ingredients from PostgreSQL...</p>
                : <InventoryTable
                    items={filtered}
                    detailed
                    deletingId={deletingId}
                    onDelete={deleteIngredient}
                  />}

              {!loadingInventory && !filtered.length && (
                <div className="empty-state">
                  <Package size={32} />
                  <strong>No ingredients found</strong>
                  <p>Try another search or category.</p>
                </div>
              )}
            </section>
          )}

          {page === 'Recipes' && (
            <section className="recipe-grid">
              {recipes.map((recipe, i) => (
                <article className="recipe-card" key={recipe.name}>
                  <div className={`recipe-art art-${i}`}>
                    <ChefHat size={36} /><span>{recipe.tag}</span>
                  </div>
                  <div className="recipe-details">
                    <small>{recipe.category}</small>
                    <h2>{recipe.name}</h2>
                    <p>{recipe.ingredients}</p>
                    <div>
                      <strong>{recipe.price}</strong>
                      <button onClick={() => notify(`Recipe selected: ${recipe.name}`)}>
                        View recipe <ArrowUpRight size={15} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </section>
          )}

          {page === 'Waste Analytics' && (
            <>
              <section className="stats-grid">
                <Stat
                  icon={Trash2}
                  label="Waste cost"
                  value={money(summary?.waste_cost ?? 4480)}
                  detail={summary ? 'Recorded waste cost' : 'Illustrative sample data'}
                  trend={summary ? `${summary.waste_records} records` : 'Sample only'}
                  color="coral"
                />
                <Stat
                  icon={Leaf}
                  label="Potential savings"
                  value="₹1,120"
                  detail="Illustrative estimate"
                  trend="25% target"
                  color="green"
                />
                <Stat
                  icon={Package}
                  label="Tracked ingredients"
                  value={inventory.length.toString()}
                  detail="Database inventory"
                  trend="Live count"
                  color="blue"
                />
                <Stat
                  icon={Clock}
                  label="Expiring soon"
                  value={expiring.length.toString()}
                  detail="Today or tomorrow"
                  trend="Review"
                  color="amber"
                />
              </section>

              <section className="panel waste-detail">
                <span className="panel-kicker">YOUR NEXT BEST ACTION</span>
                <h2>Turn surplus into savings.</h2>
                <p>
                  Check ingredients expiring today, review preparation quantities,
                  and adjust your next purchase to match actual demand.
                </p>
                <button className="primary-button" onClick={() => setPage('Inventory')}>
                  Review ingredients <ArrowUpRight size={16} />
                </button>
              </section>
            </>
          )}

          {page === 'Demand Predictions' && <Predictions />}
        </div>

        <footer className="footer">
          <span><Leaf size={14} /> Less waste. More taste.</span>
          <span>
            RESTAURANTIQ · RESTAURANT INTELLIGENCE <i>•</i> INVENTORY LIVE / ANALYTICS SAMPLE
          </span>
        </footer>
      </main>

      {showAdd && (
        <div
          className="modal-backdrop"
          onMouseDown={e => {
            if (e.target === e.currentTarget && !saving) setShowAdd(false);
          }}
        >
          <div className="modal">
            <div className="modal-heading">
              <div>
                <span className="panel-kicker">STOCKROOM MANAGEMENT</span>
                <h2>Add an ingredient</h2>
                <p>Keep your stock records up to date.</p>
              </div>
              <button
                className="icon-button"
                onClick={() => !saving && setShowAdd(false)}
                aria-label="Close form"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={addIngredient}>
              <label>
                Ingredient name
                <input
                  required
                  maxLength={120}
                  placeholder="e.g. Fresh coriander"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </label>

              <div className="form-row">
                <label>
                  Category
                  <select
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                  >
                    <option>Vegetables</option>
                    <option>Dairy</option>
                    <option>Grains</option>
                    <option>Pantry</option>
                    <option>Oils</option>
                  </select>
                </label>
                <label>
                  Quantity
                  <input
                    required
                    min="0"
                    step="any"
                    type="number"
                    placeholder="0"
                    value={form.quantity}
                    onChange={e => setForm({ ...form, quantity: e.target.value })}
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Unit
                  <select
                    value={form.unit}
                    onChange={e => setForm({ ...form, unit: e.target.value })}
                  >
                    <option>kg</option>
                    <option>g</option>
                    <option>L</option>
                    <option>units</option>
                    <option>packets</option>
                  </select>
                </label>
                <label>
                  Minimum stock
                  <input
                    min="0"
                    step="any"
                    type="number"
                    placeholder="e.g. 5"
                    value={form.min}
                    onChange={e => setForm({ ...form, min: e.target.value })}
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Price per unit (₹)
                  <input
                    required
                    min="0"
                    step="any"
                    type="number"
                    placeholder="0"
                    value={form.price}
                    onChange={e => setForm({ ...form, price: e.target.value })}
                  />
                </label>
                <label>
                  Expiry
                  <select
                    value={form.expiry}
                    onChange={e => setForm({ ...form, expiry: e.target.value })}
                  >
                    <option>Today</option>
                    <option>Tomorrow</option>
                    <option>2 days</option>
                    <option>7 days</option>
                    <option>30 days</option>
                    <option>45 days</option>
                    <option>60 days</option>
                  </select>
                </label>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowAdd(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button className="primary-button" type="submit" disabled={saving}>
                  <Plus size={17} />
                  {saving ? 'Saving...' : 'Save ingredient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, detail, trend, color }) {
  return (
    <article className="stat-card">
      <div className={`stat-icon ${color}`}><Icon size={20} /></div>
      <span className="stat-trend">{trend}</span>
      <p>{label}</p>
      <h2>{value}</h2>
      <small>{detail}</small>
    </article>
  );
}

function InventoryTable({ items, detailed = false, onDelete, deletingId }) {
  return (
    <div className="table-scroll">
      <table className="inventory-table">
        <thead>
          <tr>
            <th>INGREDIENT</th>
            <th>CATEGORY</th>
            <th>IN STOCK</th>
            <th>UNIT VALUE</th>
            <th>EXPIRY</th>
            <th>STATUS</th>
            {detailed && <th />}
          </tr>
        </thead>
        <tbody>
          {items.map(item => {
            const low = Number(item.quantity) <= Number(item.min);
            const daysUntilExpiry = expiryDays(item.expiry);
            const soon = isExpiringSoon(item.expiry);
            const expired = daysUntilExpiry !== null && daysUntilExpiry < 0;

            return (
              <tr key={item.id}>
                <td>
                  <div className="ingredient-name">
                    <span className={`ingredient-icon ${item.category.toLowerCase()}`}>
                      {item.category === 'Dairy'
                        ? '🥛'
                        : item.category === 'Vegetables'
                          ? '🥬'
                          : item.category === 'Grains'
                            ? '🌾'
                            : '🫙'}
                    </span>
                    <strong>{item.name}</strong>
                  </div>
                </td>
                <td><span className="category-label">{item.category}</span></td>
                <td>
                  <strong>{item.quantity} {item.unit}</strong>
                  <small className="sub-cell">Min. {item.min} {item.unit}</small>
                </td>
                <td>{money(item.price)}</td>
                <td>
                  <span className={soon || expired ? 'expiry-warning' : 'expiry-normal'}>
                    {expiryDisplay(item.expiry)}
                  </span>
                </td>
                <td>
                  <span className={`status-pill ${low ? 'status-low' : 'status-good'}`}>
                    <i />{low ? 'Low stock' : 'In stock'}
                  </span>
                </td>
                {detailed && (
                  <td>
                    <button
                      className="delete-button"
                      title={`Remove ${item.name}`}
                      aria-label={`Remove ${item.name}`}
                      disabled={deletingId === item.id}
                      onClick={() => onDelete?.(item.id)}
                    >
                      <X size={16} />
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      <Chefly/>
    </div>
  );
}

export default App;
