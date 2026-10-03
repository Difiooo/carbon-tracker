import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import {
  Leaf,
  Car,
  Utensils,
  Zap,
  Plus,
  LayoutDashboard,
  History,
} from "lucide-react";
import "./Dashboard.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const API_URL = "http://localhost:5000/api/activities";

const activityOptions = {
  transport: [
    { value: "car", label: "Car (km)" },
    { value: "bus", label: "Bus (km)" },
    { value: "motorcycle", label: "Motorcycle (km)" },
  ],
  food: [
    { value: "vegetarian", label: "Vegetarian meal (servings)" },
    { value: "meat", label: "Meat meal (servings)" },
  ],
  energy: [{ value: "electricity", label: "Electricity (kWh)" }],
};

function Dashboard() {
  const [activities, setActivities] = useState([]);
  const [activePage, setActivePage] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    category: "transport",
    type: "car",
    quantity: "",
  });

  useEffect(() => {
    async function loadActivities() {
      try {
        setError("");
        const response = await fetch(API_URL);

        if (!response.ok) {
          throw new Error("Could not load activities from the backend.");
        }

        const data = await response.json();
        setActivities(
          data.map((activity) => ({
            ...activity,
            id: Number(activity.id),
            quantity: Number(activity.quantity),
            emission: Number(activity.emission),
          }))
        );
      } catch (err) {
        console.error("Loading activities failed:", err);
        setError(
          "Could not connect to the backend. Make sure the server is running at http://localhost:5000."
        );
      } finally {
        setLoading(false);
      }
    }

    loadActivities();
  }, []);

  const total = activities.reduce(
    (sum, activity) => sum + Number(activity.emission || 0),
    0
  );

  const categoryTotals = {
    transport: activities
      .filter((activity) => activity.category === "transport")
      .reduce((sum, activity) => sum + Number(activity.emission || 0), 0),
    food: activities
      .filter((activity) => activity.category === "food")
      .reduce((sum, activity) => sum + Number(activity.emission || 0), 0),
    energy: activities
      .filter((activity) => activity.category === "energy")
      .reduce((sum, activity) => sum + Number(activity.emission || 0), 0),
  };

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weeklyTotals = weekDays.map((day) =>
    activities
      .filter((activity) => activity.day === day)
      .reduce((sum, activity) => sum + Number(activity.emission || 0), 0)
  );

  const weeklyData = {
    labels: weekDays,
    datasets: [
      {
        label: "CO₂e (kg)",
        data: weeklyTotals,
        borderWidth: 1,
        borderRadius: 8,
      },
    ],
  };

  const weeklyOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `${Number(context.parsed.y || 0).toFixed(2)} kg CO₂e`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => `${value} kg`,
        },
      },
    },
  };

  function changeCategory(category) {
    const defaults = {
      transport: "car",
      food: "vegetarian",
      energy: "electricity",
    };

    setForm((previous) => ({
      ...previous,
      category,
      type: defaults[category],
    }));
  }

  async function addActivity(event) {
    event.preventDefault();

    const quantity = Number(form.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError("Please enter a quantity greater than zero.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: form.category,
          type: form.type,
          quantity,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not save this activity.");
      }

      const savedActivity = {
        ...data,
        id: Number(data.id),
        quantity: Number(data.quantity),
        emission: Number(data.emission),
      };

      setActivities((previous) => [savedActivity, ...previous]);
      setForm((previous) => ({ ...previous, quantity: "" }));
    } catch (err) {
      console.error("Adding activity failed:", err);
      setError(err.message || "Could not save activity. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteActivity(id) {
    try {
      setError("");

      const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not delete this activity.");
      }

      setActivities((previous) =>
        previous.filter((activity) => activity.id !== Number(id))
      );
    } catch (err) {
      console.error("Deleting activity failed:", err);
      setError(err.message || "Could not delete activity. Please try again.");
    }
  }

  function renderActivityList() {
    if (loading) {
      return <p className="empty-state">Loading activities...</p>;
    }

    if (activities.length === 0) {
      return (
        <div className="empty-state">
          <Leaf size={32} />
          <p>No activities recorded yet.</p>
          <span>Add an activity from the Dashboard.</span>
        </div>
      );
    }

    return (
      <div className="activity-list">
        {activities.map((activity) => (
          <div className="activity-item" key={activity.id}>
            <div className="activity-info">
              {activity.category === "transport" && <Car size={20} />}
              {activity.category === "food" && <Utensils size={20} />}
              {activity.category === "energy" && <Zap size={20} />}

              <div>
                <strong>{activity.type}</strong>
                <span>
                  {activity.quantity} units · {activity.date}
                </span>
              </div>
            </div>

            <div className="activity-actions">
              <strong>
                {Number(activity.emission).toFixed(2)} kg CO₂e
              </strong>
              <button
                type="button"
                onClick={() => deleteActivity(activity.id)}
                className="delete-button"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="brand">
          <Leaf size={28} />
          <div>
            <h1>Carbon Tracker</h1>
            <p>Track your daily carbon footprint</p>
          </div>
        </div>

        <div className="total-emission">
          <span>Total CO₂e</span>
          <strong>{total.toFixed(2)} kg</strong>
        </div>
      </header>

      <nav className="dashboard-nav">
        <button
          type="button"
          className={activePage === "dashboard" ? "active" : ""}
          onClick={() => setActivePage("dashboard")}
        >
          <LayoutDashboard size={18} />
          Dashboard
        </button>
        <button
          type="button"
          className={activePage === "history" ? "active" : ""}
          onClick={() => setActivePage("history")}
        >
          <History size={18} />
          History
        </button>
      </nav>

      {error && (
        <p role="alert" className="backend-error">
          {error}
        </p>
      )}

      <main className="dashboard-content">
        {activePage === "dashboard" ? (
          <>
            <section className="add-activity-card">
              <div className="section-heading">
                <div>
                  <h2>Add Activity</h2>
                  <p>Record an activity to estimate its carbon impact.</p>
                </div>
                <Plus size={24} />
              </div>

              <div className="category-buttons">
                <button
                  type="button"
                  className={form.category === "transport" ? "selected" : ""}
                  onClick={() => changeCategory("transport")}
                >
                  <Car size={20} />
                  Transport
                </button>
                <button
                  type="button"
                  className={form.category === "food" ? "selected" : ""}
                  onClick={() => changeCategory("food")}
                >
                  <Utensils size={20} />
                  Food
                </button>
                <button
                  type="button"
                  className={form.category === "energy" ? "selected" : ""}
                  onClick={() => changeCategory("energy")}
                >
                  <Zap size={20} />
                  Energy
                </button>
              </div>

              <form onSubmit={addActivity}>
                <div className="form-group">
                  <label htmlFor="activity-type">Activity</label>
                  <select
                    id="activity-type"
                    value={form.type}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        type: event.target.value,
                      }))
                    }
                  >
                    {activityOptions[form.category].map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="quantity">Quantity</label>
                  <input
                    id="quantity"
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={form.quantity}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        quantity: event.target.value,
                      }))
                    }
                    placeholder="Enter quantity"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="add-button"
                  disabled={saving}
                >
                  <Plus size={18} />
                  {saving ? "Saving..." : "Add Activity"}
                </button>
              </form>
            </section>

            <section className="summary-grid">
              <div className="summary-card">
                <Car size={24} />
                <div>
                  <span>Transport</span>
                  <strong>{categoryTotals.transport.toFixed(2)} kg</strong>
                </div>
              </div>
              <div className="summary-card">
                <Utensils size={24} />
                <div>
                  <span>Food</span>
                  <strong>{categoryTotals.food.toFixed(2)} kg</strong>
                </div>
              </div>
              <div className="summary-card">
                <Zap size={24} />
                <div>
                  <span>Energy</span>
                  <strong>{categoryTotals.energy.toFixed(2)} kg</strong>
                </div>
              </div>
            </section>

            <section className="chart-card">
              <div className="section-heading">
                <div>
                  <h2>Weekly Carbon Emissions</h2>
                  <p>Your recorded CO₂e emissions by day.</p>
                </div>
              </div>
              <div className="chart-container">
                <Bar data={weeklyData} options={weeklyOptions} />
              </div>
            </section>

            <section className="activity-card">
              <div className="section-heading">
                <div>
                  <h2>Recent Activities</h2>
                  <p>Your latest recorded activities.</p>
                </div>
                {activities.length > 0 && (
                  <button
                    type="button"
                    className="delete-button"
                    onClick={() => setActivePage("history")}
                  >
                    View all
                  </button>
                )}
              </div>
              {renderActivityList()}
            </section>
          </>
        ) : (
          <section className="activity-card">
            <div className="section-heading">
              <div>
                <h2>Activity History</h2>
                <p>All your saved activities.</p>
              </div>
              <span>
                {activities.length}{" "}
                {activities.length === 1 ? "activity" : "activities"}
              </span>
            </div>
            {renderActivityList()}
          </section>
        )}
      </main>
    </div>
  );
}

export default Dashboard;
