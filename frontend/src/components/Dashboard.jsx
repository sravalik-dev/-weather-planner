import { useEffect, useMemo, useState } from "react";
import { getRecommendations } from "../services/recommendationService";
import { getDestinations } from "../services/routeService";
import { getWeatherHourly } from "../services/weatherMonitoringService";
import { getWeatherLabel } from "../utils/weatherUtils";

const formatDate = (value) => {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
};

function Dashboard({
  user,
  weather,
  trips,
  onNavigate,
}) {
  const [hourly, setHourly] = useState([]);
  const [recommendation, setRecommendation] = useState(null);
  const [destinationWeatherLabel, setDestinationWeatherLabel] = useState("");

  const upcoming = useMemo(() => {
    const list = Array.isArray(trips) ? [...trips] : [];
    return list.sort((a, b) => String(a.startDate || "").localeCompare(String(b.startDate || "")))[0] || null;
  }, [trips]);

  const budgetUsedPct = useMemo(() => {
    if (!upcoming?.budget) return 0;
    return Math.min(100, Math.round(Number(upcoming.budget) ? 70 : 0));
  }, [upcoming]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!upcoming) return;
      try {
        const destinations = await getDestinations(upcoming.tripId ?? upcoming.id);
        const first = Array.isArray(destinations) ? destinations[0] : null;
        if (first?.latitude != null && first?.longitude != null) {
          const hourlyData = await getWeatherHourly(first.latitude, first.longitude);
          const times = hourlyData?.time || hourlyData?.hourlyTime || [];
          const temps = hourlyData?.temperature || hourlyData?.hourlyTemperature || [];
          const sliced = times.slice(0, 5).map((time, index) => ({
            time: String(time).slice(11, 16) || time,
            temp: temps[index],
          }));
          if (active) {
            setHourly(sliced);
            setDestinationWeatherLabel(upcoming.destination || first.destinationName || "");
          }
        }
        const recs = await getRecommendations(upcoming.tripId ?? upcoming.id);
        if (active) setRecommendation(Array.isArray(recs) ? recs[0] : recs?.recommendations?.[0] || null);
      } catch {
        if (active) {
          setRecommendation(null);
        }
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [upcoming]);

  const firstName = (user?.name || "Traveler").split(" ")[0];
  const spentHint = upcoming?.budget
    ? `₹${Number(upcoming.budget).toLocaleString("en-IN")}`
    : "No budget yet";

  return (
    <div className="dash-grid">
      <section className="glass-hero">
        <div>
          <h1>{greeting()}, {firstName}! 👋</h1>
          <p>Where would you like to travel today?</p>
          <div className="hero-search">
            <input
              type="search"
              placeholder="Search destinations..."
              onFocus={() => onNavigate("trips")}
              readOnly
            />
            <button type="button" onClick={() => onNavigate("trips")}>Go</button>
          </div>
        </div>
      </section>

      <section className="glass-card plan-card">
        <h3>Plan Your Trip</h3>
        <p>Let's create your perfect journey.</p>
        <div className="stepper">
          <span className="step active">1 Basics</span>
          <span className="step">2 Preferences</span>
          <span className="step">3 Review</span>
        </div>
        <button type="button" className="primary-pill" onClick={() => onNavigate("plan")}>
          Start Planning →
        </button>
      </section>

      <div className="quick-actions">
        {[
          ["plan", "✈️", "Plan Trip"],
          ["trips", "📍", "Manage Destinations"],
          ["weather", "🌦️", "Check Weather"],
          ["recommendations", "✨", "Recommendations"],
          ["budget", "📗", "Plan Budget"],
        ].map(([view, icon, label]) => (
          <button key={view} type="button" className="quick-action" onClick={() => onNavigate(view)}>
            <span>{icon}</span>
            {label}
          </button>
        ))}
      </div>

      <article className="glass-card">
        <div className="card-head">
          <h3>Your Upcoming Trip</h3>
          <button type="button" className="text-link" onClick={() => onNavigate("trips")}>View All →</button>
        </div>
        {upcoming ? (
          <div className="upcoming-body">
            <strong>{upcoming.tripName}</strong>
            <p>{upcoming.origin} → {upcoming.destination}</p>
            <p>{formatDate(upcoming.startDate)} – {formatDate(upcoming.endDate)}</p>
            <p>{upcoming.noOfTravelers || 1} travellers</p>
            <span className="status-chip">{upcoming.status || "PLANNED"}</span>
          </div>
        ) : (
          <p className="empty-copy">No trips yet. Start planning to see them here.</p>
        )}
      </article>

      <article className="glass-card">
        <div className="card-head">
          <h3>Weather at Your Destination</h3>
        </div>
        <div className="dest-weather">
          <div>
            <p>{destinationWeatherLabel || weather.location || "Awaiting location"}</p>
            <strong>
              {weather.temperature != null ? `${Math.round(weather.temperature)}°C` : "--"}
            </strong>
            <span>{weather.error || getWeatherLabel(weather.type)}</span>
          </div>
          <div className="hourly-row">
            {(hourly.length ? hourly : [{ time: "Now", temp: weather.temperature }]).map((item) => (
              <div key={item.time} className="hourly-chip">
                <small>{item.time}</small>
                <b>{item.temp != null ? `${Math.round(item.temp)}°` : "--"}</b>
              </div>
            ))}
          </div>
        </div>
      </article>

      <article className="glass-card">
        <div className="card-head">
          <h3>Smart Recommendations</h3>
          <button type="button" className="text-link" onClick={() => onNavigate("recommendations")}>View More →</button>
        </div>
        {recommendation ? (
          <div>
            <strong>{recommendation.title || recommendation.placeName || recommendation.name || "Suggested place"}</strong>
            <p>{recommendation.reason || recommendation.description || "Weather-aware suggestion for your trip."}</p>
          </div>
        ) : (
          <p className="empty-copy">Generate recommendations from a saved trip.</p>
        )}
      </article>

      <article className="glass-card">
        <div className="card-head">
          <h3>Trip Overview</h3>
          <button type="button" className="text-link" onClick={() => onNavigate("budget")}>View Details →</button>
        </div>
        <div className="budget-ring">
          <strong>{budgetUsedPct}%</strong>
          <div>
            <p>{spentHint}</p>
            <small>Budget for {upcoming?.tripName || "your next trip"}</small>
          </div>
        </div>
      </article>

      <article className="glass-card">
        <div className="card-head">
          <h3>Your Profile</h3>
          <button type="button" className="text-link" onClick={() => onNavigate("profile")}>Edit Profile</button>
        </div>
        <p><strong>{user?.name || "Traveler"}</strong></p>
        <p>{user?.email}</p>
      </article>
    </div>
  );
}

export default Dashboard;