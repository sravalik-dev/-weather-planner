
import { useEffect, useState } from "react";
import Accommodation from "./Accommodation";
import BudgetPanel from "./BudgetPanel";
import Dashboard from "./Dashboard";
import Food from "./Food";
import ProfilePanel from "./ProfilePanel";
import RecommendationEngine from "./RecommendationEngine";
import RoutePlanner from "./RoutePlanner";
import TripSelectBar from "./TripSelectBar";
import Trips from "./Trips";
import WeatherMonitoring from "./WeatherMonitoring";
import { getTrips } from "../services/tripService";
import { getWeatherIcon, getWeatherLabel } from "../utils/weatherUtils";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "⌂" },
  { id: "plan", label: "Plan Trip", icon: "✈" },
  { id: "trips", label: "My Trips", icon: "🧳" },
  { id: "routes", label: "Routes", icon: "🗺" },
  { id: "weather", label: "Weather", icon: "☁" },
  { id: "recommendations", label: "Recommendations", icon: "✦" },
  { id: "food", label: "Food", icon: "🍽" },
  { id: "accommodation", label: "Accommodation", icon: "🏨" },
  { id: "budget", label: "Budget", icon: "₹" },
  { id: "profile", label: "Profile", icon: "☺" },
];

const DEFAULT_BUDGET_TRIP_ID = "56";

function AppShell({ user, weather, onLogout, onUserUpdate }) {
  const [view, setView] = useState("dashboard");
  const [trips, setTrips] = useState([]);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [selectedTripId, setSelectedTripId] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let active = true;

    setTripsLoading(true);

    getTrips()
      .then((data) => {
        if (!active) return;

        const list = Array.isArray(data) ? data : [];
        setTrips(list);

        setSelectedTripId((currentId) => {
          const currentStillExists = list.some(
            (trip) =>
              String(trip.tripId ?? trip.id) === String(currentId)
          );

          if (currentId && currentStillExists) {
            return String(currentId);
          }

          const preferredTrip = list.find(
            (trip) =>
              String(trip.tripId ?? trip.id) ===
              DEFAULT_BUDGET_TRIP_ID
          );

          if (preferredTrip) {
            return DEFAULT_BUDGET_TRIP_ID;
          }

          return list.length
            ? String(list[0].tripId ?? list[0].id)
            : "";
        });
      })
      .catch((error) => {
        console.error("Failed to load trips:", error);

        if (active) {
          setTrips([]);
          setSelectedTripId("");
        }
      })
      .finally(() => {
        if (active) {
          setTripsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [view]);

  const selectedTrip = trips.find(
    (trip) =>
      String(trip.tripId ?? trip.id) === String(selectedTripId)
  );

  const title =
    NAV.find((item) => item.id === view)?.label || "Dashboard";

  return (
    <div className="app-shell">
      <aside className={`shell-sidebar ${menuOpen ? "open" : ""}`}>
        <div className="shell-brand">
          <span>☁</span>
          <strong>Weather Planner</strong>
        </div>

        <nav>
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={view === item.id ? "active" : ""}
              onClick={() => {
                setView(item.id);
                setMenuOpen(false);
              }}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <button
          type="button"
          className="logout-link"
          onClick={onLogout}
        >
          Logout
        </button>
      </aside>

      <div className="shell-main">
        <header className="shell-topbar">
          <button
            type="button"
            className="menu-toggle"
            onClick={() => setMenuOpen((open) => !open)}
          >
            ☰
          </button>

          <h2>{title}</h2>

          <div className="topbar-weather">
            <span>
              {getWeatherIcon(weather.type, weather.isDay)}
            </span>

            <div>
              <strong>
                {weather.temperature != null
                  ? `${Math.round(weather.temperature)}°C`
                  : "--"}
              </strong>

              <small>
                {weather.loading
                  ? "Detecting location..."
                  : weather.location ||
                    weather.error ||
                    getWeatherLabel(weather.type)}
              </small>
            </div>

            <div className="avatar">
              {(user?.name || "T").charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="shell-content">
          {view === "dashboard" && (
            <Dashboard
              user={user}
              weather={weather}
              trips={trips}
              onNavigate={setView}
            />
          )}

          {view === "plan" && (
            <Trips key="plan" hideBack startWithCreate />
          )}

          {view === "trips" && (
            <Trips key="trips" hideBack />
          )}

          {view === "routes" && (
            <>
              <TripSelectBar
                trips={trips}
                tripId={selectedTripId}
                onChange={setSelectedTripId}
                loading={tripsLoading}
                emptyText="Create a trip before calculating a route."
              />

              {selectedTrip && (
                <RoutePlanner
                  trip={selectedTrip}
                  onBack={() => setView("trips")}
                />
              )}
            </>
          )}

          {view === "weather" && <WeatherMonitoring />}

          {view === "recommendations" && (
            <>
              <TripSelectBar
                trips={trips}
                tripId={selectedTripId}
                onChange={setSelectedTripId}
                loading={tripsLoading}
                emptyText="Create a trip before generating recommendations."
              />

              {selectedTripId && (
                <RecommendationEngine
                  tripId={selectedTripId}
                  onBack={() => setView("dashboard")}
                />
              )}
            </>
          )}

          {view === "food" && (
            <Food onBack={() => setView("dashboard")} />
          )}

          {view === "accommodation" && (
            <Accommodation onBack={() => setView("dashboard")} />
          )}

          {view === "budget" && (
            <BudgetPanel
              trips={trips}
              selectedTripId={selectedTripId}
              onTripChange={setSelectedTripId}
              tripsLoading={tripsLoading}
            />
          )}

          {view === "profile" && (
            <div className="profile-stack">
              <ProfilePanel
                view="profile"
                user={user}
                onUserUpdate={onUserUpdate}
              />
              <ProfilePanel view="preferences" user={user} />
              <ProfilePanel view="password" user={user} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AppShell;
