import { useEffect, useMemo, useState } from "react";
import { getRecommendations } from "../services/recommendationService";
import { getDestinations } from "../services/routeService";
import { getBudgetOverview } from "../services/budgetService";
import {
  getWeatherCurrent,
  getWeatherDaily,
} from "../services/weatherMonitoringService";
import { getWeatherIcon, getWeatherLabel } from "../utils/weatherUtils";
import "../styles/Dashboard.css";

/* ------------------------------------------------------------------
   Helpers
------------------------------------------------------------------ */

const todayIso = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

const toDay = (value) => String(value || "").slice(0, 10);

const formatDate = (value, withYear = true) => {
  if (!value) return "Date unavailable";
  const date = new Date(`${toDay(value)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  });
};

const formatWeekday = (value) => {
  const date = new Date(`${toDay(value)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { weekday: "short" });
};

const formatMoney = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return `₹${number.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
};

const daysBetween = (fromIso, toIso) => {
  const from = new Date(`${toDay(fromIso)}T00:00:00`);
  const to = new Date(`${toDay(toIso)}T00:00:00`);
  return Math.round((to.getTime() - from.getTime()) / 86400000);
};

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const getTripId = (trip) => trip?.tripId ?? trip?.id ?? "";

/* WMO weather-code -> emoji (the backend returns Open-Meteo codes). */
const codeIcon = (code) => {
  const value = Number(code);
  if (value === 0) return "☀️";
  if (value >= 1 && value <= 2) return "🌤️";
  if (value === 3) return "☁️";
  if (value === 45 || value === 48) return "🌫️";
  if (value >= 51 && value <= 57) return "🌦️";
  if ((value >= 61 && value <= 67) || (value >= 80 && value <= 82)) return "🌧️";
  if ((value >= 71 && value <= 77) || value === 85 || value === 86) return "❄️";
  if (value >= 95) return "⛈️";
  return "🌡️";
};

const arrayAt = (source, key, index) =>
  Array.isArray(source?.[key]) ? source[key][index] : undefined;

const QUICK_LINKS = [
  { view: "plan", icon: "✈️", title: "Plan a trip", text: "Create a new journey" },
  { view: "trips", icon: "🧳", title: "My trips", text: "Manage trips & destinations" },
  { view: "routes", icon: "🗺️", title: "Routes", text: "Distance and travel time" },
  { view: "weather", icon: "🌦️", title: "Weather", text: "Forecast & alerts" },
  { view: "recommendations", icon: "✨", title: "Recommendations", text: "Weather-aware ideas" },
  { view: "food", icon: "🍽️", title: "Food & dining", text: "Local dishes & places" },
  { view: "accommodation", icon: "🏨", title: "Accommodation", text: "Find a place to stay" },
  { view: "budget", icon: "💰", title: "Budget", text: "Track spending" },
];

/* ------------------------------------------------------------------
   Component
------------------------------------------------------------------ */

function Dashboard({ user, weather, trips, onNavigate }) {
  const tripList = useMemo(
    () => (Array.isArray(trips) ? trips : []),
    [trips]
  );

  const today = todayIso();

  /* Trips that are not archived and have not ended, soonest first. */
  const upcomingTrips = useMemo(
    () =>
      tripList
        .filter(
          (trip) =>
            String(trip?.status || "").toUpperCase() !== "ARCHIVED" &&
            toDay(trip?.endDate || trip?.startDate) >= today
        )
        .sort((a, b) =>
          toDay(a.startDate).localeCompare(toDay(b.startDate))
        ),
    [tripList, today]
  );

  const [chosenTripId, setChosenTripId] = useState("");

  /* The trip that drives destination, weather, budget and recommendations. */
  const focusTrip = useMemo(() => {
    const byChoice = tripList.find(
      (trip) => String(getTripId(trip)) === String(chosenTripId)
    );
    return byChoice || upcomingTrips[0] || tripList[0] || null;
  }, [tripList, upcomingTrips, chosenTripId]);

  const focusTripId = focusTrip ? String(getTripId(focusTrip)) : "";

  const [destinations, setDestinations] = useState([]);
  const [destinationsState, setDestinationsState] = useState("idle");

  const [currentWeather, setCurrentWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [weatherState, setWeatherState] = useState("idle");

  const [budget, setBudget] = useState(null);
  const [budgetState, setBudgetState] = useState("idle");

  const [recommendations, setRecommendations] = useState([]);
  const [recommendationState, setRecommendationState] = useState("idle");

  useEffect(() => {
    let active = true;

    const reset = () => {
      setDestinations([]);
      setDestinationsState("idle");
      setCurrentWeather(null);
      setForecast(null);
      setWeatherState("idle");
      setBudget(null);
      setBudgetState("idle");
      setRecommendations([]);
      setRecommendationState("idle");
    };

    if (!focusTripId) {
      reset();
      return () => {
        active = false;
      };
    }

    setDestinationsState("loading");
    setWeatherState("loading");
    setBudgetState("loading");
    setRecommendationState("loading");
    setCurrentWeather(null);
    setForecast(null);

    /* Destinations -> then weather for the first destination that has
       real coordinates. */
    (async () => {
      let list = [];
      try {
        const data = await getDestinations(focusTripId);
        list = Array.isArray(data) ? data : [];
        if (!active) return;
        setDestinations(list);
        setDestinationsState("ready");
      } catch {
        if (!active) return;
        setDestinations([]);
        setDestinationsState("error");
      }

      const located = list.find(
        (item) => item?.latitude != null && item?.longitude != null
      );

      if (!located) {
        if (active) setWeatherState(list.length ? "no-coordinates" : "no-destination");
        return;
      }

      const [currentResult, dailyResult] = await Promise.allSettled([
        getWeatherCurrent(located.latitude, located.longitude),
        getWeatherDaily(located.latitude, located.longitude),
      ]);

      if (!active) return;

      const current =
        currentResult.status === "fulfilled" ? currentResult.value : null;
      const daily =
        dailyResult.status === "fulfilled" ? dailyResult.value : null;

      setCurrentWeather(
        current
          ? { ...current, locationName: located.destinationName }
          : null
      );
      setForecast(daily);
      setWeatherState(current || daily ? "ready" : "error");
    })();

    getBudgetOverview(focusTripId)
      .then((data) => {
        if (!active) return;
        setBudget(data || null);
        setBudgetState(data ? "ready" : "none");
      })
      .catch((error) => {
        if (!active) return;
        setBudget(null);
        /* A 404 simply means no budget has been created for this trip. */
        setBudgetState(error?.status === 404 ? "none" : "error");
      });

    getRecommendations(focusTripId)
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.recommendations)
            ? data.recommendations
            : [];
        setRecommendations(list);
        setRecommendationState("ready");
      })
      .catch((error) => {
        if (!active) return;
        setRecommendations([]);
        setRecommendationState(error?.status === 404 ? "ready" : "error");
      });

    return () => {
      active = false;
    };
  }, [focusTripId]);

  /* ---------------- Derived values ---------------- */

  const firstName = String(user?.name || "Traveler").trim().split(" ")[0];

  const nextTrip = upcomingTrips[0] || null;

  const countdown = useMemo(() => {
    if (!nextTrip) return null;
    const start = toDay(nextTrip.startDate);
    const end = toDay(nextTrip.endDate || nextTrip.startDate);
    if (start <= today && today <= end) {
      return { label: "Trip in progress", value: "Now", tone: "live" };
    }
    const diff = daysBetween(today, start);
    if (diff === 1) return { label: "Next trip starts", value: "Tomorrow" };
    return {
      label: "Next trip starts in",
      value: `${diff} day${diff === 1 ? "" : "s"}`,
    };
  }, [nextTrip, today]);

  /* Forecast: next five days, flagging the days that fall inside the trip. */
  const forecastDays = useMemo(() => {
    const times = Array.isArray(forecast?.time) ? forecast.time : [];
    return times.slice(0, 5).map((time, index) => ({
      date: toDay(time),
      code: arrayAt(forecast, "weatherCode", index),
      description: arrayAt(forecast, "weatherDescription", index),
      max: arrayAt(forecast, "temperatureMax", index),
      min: arrayAt(forecast, "temperatureMin", index),
      rain: arrayAt(forecast, "precipitationProbabilityMax", index),
      inTrip:
        !!focusTrip &&
        toDay(time) >= toDay(focusTrip.startDate) &&
        toDay(time) <= toDay(focusTrip.endDate || focusTrip.startDate),
    }));
  }, [forecast, focusTrip]);

  /* Insights computed only from the real forecast values. */
  const forecastInsights = useMemo(() => {
    const notes = [];
    const wet = forecastDays.find((day) => Number(day.rain) >= 60);
    if (wet) {
      notes.push(
        `Rain is likely on ${formatDate(wet.date, false)} (${Math.round(
          wet.rain
        )}% chance). Consider indoor plans or rain gear.`
      );
    }
    const hot = forecastDays.find((day) => Number(day.max) >= 35);
    if (hot) {
      notes.push(
        `Hot day expected on ${formatDate(hot.date, false)} (${Math.round(
          hot.max
        )}°C). Plan outdoor sights for the morning.`
      );
    }
    return notes;
  }, [forecastDays]);

  const budgetView = useMemo(() => {
    if (budgetState === "ready" && budget) {
      const total = Number(budget.totalBudget || 0);
      const spent = Number(budget.totalSpent || 0);
      const remaining =
        budget.remainingBudget != null
          ? Number(budget.remainingBudget)
          : Math.max(total - spent, 0);
      const percent = Math.max(
        0,
        Math.min(
          100,
          budget.spentPercentage != null
            ? Number(budget.spentPercentage)
            : total > 0
              ? (spent / total) * 100
              : 0
        )
      );
      return { total, spent, remaining, percent, over: spent > total && total > 0 };
    }
    return null;
  }, [budget, budgetState]);

  const displayWeather = useMemo(() => {
    if (currentWeather && currentWeather.temperature != null) {
      return {
        place: currentWeather.locationName || focusTrip?.destination || "",
        temp: currentWeather.temperature,
        text: currentWeather.weatherDescription || "",
        icon: codeIcon(currentWeather.weatherCode),
        humidity: currentWeather.humidity,
        wind: currentWeather.windSpeed,
        feels: currentWeather.apparentTemperature,
        source: "destination",
      };
    }
    if (weather && weather.temperature != null) {
      return {
        place: weather.location || "Your location",
        temp: weather.temperature,
        text: getWeatherLabel(weather.type),
        icon: getWeatherIcon(weather.type, weather.isDay),
        source: "device",
      };
    }
    return null;
  }, [currentWeather, weather, focusTrip]);

  const statusText = (trip) => {
    const status = String(trip?.status || "").toUpperCase();
    if (status === "DRAFT") return "Draft";
    if (status === "ARCHIVED") return "Archived";
    const start = toDay(trip?.startDate);
    const end = toDay(trip?.endDate || trip?.startDate);
    if (start <= today && today <= end) return "In progress";
    return "Planned";
  };

  /* ---------------- Render ---------------- */

  return (
    <div className="dx">
      {/* ================= HERO ================= */}
      <section className="dx-hero" aria-labelledby="dx-hero-title">
        <div className="dx-hero-copy">
          <span className="dx-eyebrow">Weather-aware trip planning</span>
          <h1 id="dx-hero-title">
            {greeting()}, {firstName}
          </h1>
          <p>
            {nextTrip
              ? `Your next trip is “${nextTrip.tripName}” to ${nextTrip.destination}.`
              : "Where would you like to go next? Start a plan and we will line up weather, food and stays."}
          </p>

          <div className="dx-hero-actions">
            <button
              type="button"
              className="dx-btn dx-btn-light"
              onClick={() => onNavigate("plan")}
            >
              ✈️ Plan a new trip
            </button>
            <button
              type="button"
              className="dx-btn dx-btn-ghost"
              onClick={() => onNavigate("trips")}
            >
              View my trips
            </button>
          </div>
        </div>

        <div className="dx-hero-glass" aria-live="polite">
          {displayWeather ? (
            <>
              <span className="dx-glass-label">
                {displayWeather.source === "destination"
                  ? "Weather at your destination"
                  : "Weather where you are"}
              </span>
              <div className="dx-glass-temp">
                <span aria-hidden="true">{displayWeather.icon}</span>
                <strong>{Math.round(displayWeather.temp)}°C</strong>
              </div>
              <span className="dx-glass-place">
                {[displayWeather.place, displayWeather.text]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </>
          ) : (
            <>
              <span className="dx-glass-label">Weather</span>
              <span className="dx-glass-place">
                {weather?.loading
                  ? "Detecting your location…"
                  : "Weather will appear once a destination with a location is added."}
              </span>
            </>
          )}
        </div>
      </section>

      {/* ================= STATS ================= */}
      <section className="dx-stats" aria-label="Trip summary">
        <article className="dx-stat">
          <span className="dx-stat-icon" aria-hidden="true">🧳</span>
          <div>
            <strong>{tripList.length}</strong>
            <span>Saved trips</span>
          </div>
        </article>
        <article className="dx-stat">
          <span className="dx-stat-icon" aria-hidden="true">📅</span>
          <div>
            <strong>{upcomingTrips.length}</strong>
            <span>Upcoming trips</span>
          </div>
        </article>
        <article className="dx-stat">
          <span className="dx-stat-icon" aria-hidden="true">⏳</span>
          <div>
            <strong>{countdown ? countdown.value : "—"}</strong>
            <span>{countdown ? countdown.label : "No upcoming trip"}</span>
          </div>
        </article>
        <article className="dx-stat">
          <span className="dx-stat-icon" aria-hidden="true">📍</span>
          <div>
            <strong>
              {destinationsState === "ready" ? destinations.length : "—"}
            </strong>
            <span>
              {focusTrip
                ? `Destinations in ${focusTrip.tripName}`
                : "Destinations"}
            </span>
          </div>
        </article>
      </section>

      {tripList.length === 0 ? (
        /* ============ EMPTY STATE: no trips at all ============ */
        <section className="dx-card dx-empty-hero">
          <div className="dx-empty-art" aria-hidden="true">🗺️</div>
          <h2>No trips yet</h2>
          <p>
            Create your first trip to unlock the destination overview, weather
            forecast, budget tracking and smart recommendations on this page.
          </p>
          <button
            type="button"
            className="dx-btn dx-btn-primary"
            onClick={() => onNavigate("plan")}
          >
            Start planning
          </button>
        </section>
      ) : (
        <>
          {/* Trip selector for the detail cards */}
          <div className="dx-focus-bar">
            <label htmlFor="dx-focus-trip">Showing details for</label>
            <select
              id="dx-focus-trip"
              value={focusTripId}
              onChange={(event) => setChosenTripId(event.target.value)}
            >
              {tripList.map((trip) => (
                <option key={getTripId(trip)} value={getTripId(trip)}>
                  {trip.tripName}
                  {trip.destination ? ` — ${trip.destination}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="dx-grid">
            {/* ============ UPCOMING TRIPS ============ */}
            <article className="dx-card dx-span-7">
              <header className="dx-card-head">
                <h2>Upcoming trips</h2>
                <button
                  type="button"
                  className="dx-link"
                  onClick={() => onNavigate("trips")}
                >
                  View all →
                </button>
              </header>

              {upcomingTrips.length === 0 ? (
                <div className="dx-empty">
                  <span aria-hidden="true">📅</span>
                  <p>
                    None of your trips are upcoming. Plan a new one to see it
                    here.
                  </p>
                  <button
                    type="button"
                    className="dx-btn dx-btn-primary dx-btn-sm"
                    onClick={() => onNavigate("plan")}
                  >
                    Plan a trip
                  </button>
                </div>
              ) : (
                <ul className="dx-trip-list">
                  {upcomingTrips.slice(0, 4).map((trip) => (
                    <li key={getTripId(trip)}>
                      <button
                        type="button"
                        className={`dx-trip ${
                          String(getTripId(trip)) === focusTripId ? "is-focus" : ""
                        }`}
                        onClick={() => setChosenTripId(String(getTripId(trip)))}
                      >
                        <span className="dx-trip-date" aria-hidden="true">
                          <b>{formatDate(trip.startDate, false).split(" ")[0]}</b>
                          <small>{formatDate(trip.startDate, false).split(" ")[1]}</small>
                        </span>
                        <span className="dx-trip-main">
                          <strong>{trip.tripName}</strong>
                          <small>
                            {trip.origin ? `${trip.origin} → ` : ""}
                            {trip.destination}
                          </small>
                          <small>
                            {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
                            {trip.noOfTravelers
                              ? ` · ${trip.noOfTravelers} traveller${
                                  Number(trip.noOfTravelers) === 1 ? "" : "s"
                                }`
                              : ""}
                          </small>
                        </span>
                        <span className="dx-pill">{statusText(trip)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </article>

            {/* ============ BUDGET ============ */}
            <article className="dx-card dx-span-5">
              <header className="dx-card-head">
                <h2>Budget overview</h2>
                <button
                  type="button"
                  className="dx-link"
                  onClick={() => onNavigate("budget")}
                >
                  Open budget →
                </button>
              </header>

              {budgetState === "loading" && <div className="dx-skeleton" aria-busy="true" />}

              {budgetView && (
                <div className="dx-budget">
                  <div
                    className={`dx-meter ${budgetView.over ? "is-over" : ""}`}
                    role="img"
                    aria-label={`${Math.round(budgetView.percent)} percent of budget spent`}
                  >
                    <div style={{ width: `${budgetView.percent}%` }} />
                  </div>
                  <div className="dx-budget-figures">
                    <div>
                      <span>Total</span>
                      <strong>{formatMoney(budgetView.total)}</strong>
                    </div>
                    <div>
                      <span>Spent</span>
                      <strong>{formatMoney(budgetView.spent)}</strong>
                    </div>
                    <div>
                      <span>Remaining</span>
                      <strong className={budgetView.over ? "dx-bad" : ""}>
                        {formatMoney(budgetView.remaining)}
                      </strong>
                    </div>
                  </div>
                  <p className="dx-muted">
                    {Math.round(budgetView.percent)}% of the budget for{" "}
                    {focusTrip?.tripName} is spent.
                  </p>
                </div>
              )}

              {(budgetState === "none" || budgetState === "error") && (
                <div className="dx-empty">
                  <span aria-hidden="true">💰</span>
                  {focusTrip?.budget ? (
                    <p>
                      Planned trip budget:{" "}
                      <strong>{formatMoney(focusTrip.budget)}</strong>. No
                      detailed budget plan has been set up yet.
                    </p>
                  ) : (
                    <p>No budget has been set for this trip yet.</p>
                  )}
                  {budgetState === "error" && (
                    <p className="dx-muted">Budget details could not be loaded.</p>
                  )}
                  <button
                    type="button"
                    className="dx-btn dx-btn-primary dx-btn-sm"
                    onClick={() => onNavigate("budget")}
                  >
                    Set up budget
                  </button>
                </div>
              )}
            </article>

            {/* ============ WEATHER FORECAST ============ */}
            <article className="dx-card dx-span-7">
              <header className="dx-card-head">
                <h2>Weather forecast</h2>
                <button
                  type="button"
                  className="dx-link"
                  onClick={() => onNavigate("weather")}
                >
                  Full forecast →
                </button>
              </header>

              {weatherState === "loading" && <div className="dx-skeleton" aria-busy="true" />}

              {weatherState === "no-destination" && (
                <div className="dx-empty">
                  <span aria-hidden="true">📍</span>
                  <p>Add a destination to this trip to see its forecast.</p>
                </div>
              )}

              {weatherState === "no-coordinates" && (
                <div className="dx-empty">
                  <span aria-hidden="true">📍</span>
                  <p>
                    The destinations on this trip have no coordinates, so a
                    forecast cannot be loaded.
                  </p>
                </div>
              )}

              {weatherState === "error" && (
                <div className="dx-empty">
                  <span aria-hidden="true">⚠️</span>
                  <p>The weather forecast could not be loaded right now.</p>
                </div>
              )}

              {weatherState === "ready" && forecastDays.length > 0 && (
                <>
                  <p className="dx-muted dx-forecast-for">
                    Forecast for{" "}
                    <strong>
                      {currentWeather?.locationName || focusTrip?.destination}
                    </strong>
                  </p>
                  <ul className="dx-forecast">
                    {forecastDays.map((day) => (
                      <li
                        key={day.date}
                        className={day.inTrip ? "in-trip" : ""}
                        title={day.description || ""}
                      >
                        <small>{formatWeekday(day.date)}</small>
                        <span aria-hidden="true">{codeIcon(day.code)}</span>
                        <b>
                          {day.max != null ? `${Math.round(day.max)}°` : "--"}
                        </b>
                        <small>
                          {day.min != null ? `${Math.round(day.min)}°` : "--"}
                        </small>
                        {day.rain != null && (
                          <em>💧 {Math.round(day.rain)}%</em>
                        )}
                        {day.inTrip && <i>On trip</i>}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {weatherState === "ready" && forecastDays.length === 0 && (
                <div className="dx-empty">
                  <span aria-hidden="true">🌤️</span>
                  <p>No daily forecast data was returned.</p>
                </div>
              )}
            </article>

            {/* ============ DESTINATION OVERVIEW ============ */}
            <article className="dx-card dx-span-5">
              <header className="dx-card-head">
                <h2>Destination overview</h2>
                <button
                  type="button"
                  className="dx-link"
                  onClick={() => onNavigate("trips")}
                >
                  Manage →
                </button>
              </header>

              {destinationsState === "loading" && <div className="dx-skeleton" aria-busy="true" />}

              {destinationsState === "error" && (
                <div className="dx-empty">
                  <span aria-hidden="true">⚠️</span>
                  <p>Destinations could not be loaded.</p>
                </div>
              )}

              {destinationsState === "ready" && destinations.length === 0 && (
                <div className="dx-empty">
                  <span aria-hidden="true">📍</span>
                  <p>
                    No destinations added to {focusTrip?.tripName} yet. Add
                    places from My Trips.
                  </p>
                  <button
                    type="button"
                    className="dx-btn dx-btn-primary dx-btn-sm"
                    onClick={() => onNavigate("trips")}
                  >
                    Add destinations
                  </button>
                </div>
              )}

              {destinationsState === "ready" && destinations.length > 0 && (
                <ol className="dx-dest-list">
                  {destinations.slice(0, 5).map((item, index) => (
                    <li key={item.destinationId ?? index}>
                      <span className="dx-dest-num">{index + 1}</span>
                      <div>
                        <strong>{item.destinationName}</strong>
                        <small>
                          {[
                            item.category,
                            item.bestTime ? `Best: ${item.bestTime}` : "",
                          ]
                            .filter(Boolean)
                            .join(" · ") || "Destination"}
                        </small>
                      </div>
                    </li>
                  ))}
                  {destinations.length > 5 && (
                    <li className="dx-more">+{destinations.length - 5} more</li>
                  )}
                </ol>
              )}
            </article>

            {/* ============ SMART RECOMMENDATIONS ============ */}
            <article className="dx-card dx-span-12">
              <header className="dx-card-head">
                <h2>Smart travel recommendations</h2>
                <button
                  type="button"
                  className="dx-link"
                  onClick={() => onNavigate("recommendations")}
                >
                  {recommendations.length ? "See all →" : "Generate →"}
                </button>
              </header>

              {recommendationState === "loading" && <div className="dx-skeleton" aria-busy="true" />}

              {recommendationState === "error" && (
                <div className="dx-empty">
                  <span aria-hidden="true">⚠️</span>
                  <p>Recommendations could not be loaded.</p>
                </div>
              )}

              {recommendationState === "ready" &&
                recommendations.length === 0 &&
                forecastInsights.length === 0 && (
                  <div className="dx-empty">
                    <span aria-hidden="true">✨</span>
                    <p>
                      No recommendations have been generated for{" "}
                      {focusTrip?.tripName} yet.
                    </p>
                    <button
                      type="button"
                      className="dx-btn dx-btn-primary dx-btn-sm"
                      onClick={() => onNavigate("recommendations")}
                    >
                      Generate recommendations
                    </button>
                  </div>
                )}

              {(recommendations.length > 0 || forecastInsights.length > 0) && (
                <ul className="dx-reco-list">
                  {recommendations.slice(0, 3).map((item, index) => (
                    <li key={item.recommendationId ?? index} className="dx-reco">
                      <div className="dx-reco-top">
                        <strong>
                          {item.destinationName ||
                            String(item.recommendationType || "Suggestion")}
                        </strong>
                        {item.score != null && (
                          <span className="dx-pill">
                            {Math.round(Number(item.score))}% match
                          </span>
                        )}
                      </div>
                      {item.reason && <p>{item.reason}</p>}
                      <small>
                        {[
                          item.recommendationType &&
                            String(item.recommendationType).replace(/_/g, " "),
                          item.weatherCondition,
                          item.crowdLevel && `Crowd: ${item.crowdLevel}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </small>
                    </li>
                  ))}
                  {forecastInsights.map((note) => (
                    <li key={note} className="dx-reco dx-reco-note">
                      <div className="dx-reco-top">
                        <strong>From the forecast</strong>
                      </div>
                      <p>{note}</p>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </div>
        </>
      )}

      {/* ================= QUICK NAVIGATION ================= */}
      <section aria-labelledby="dx-quick-title" className="dx-quick">
        <h2 id="dx-quick-title">Jump to</h2>
        <div className="dx-quick-grid">
          {QUICK_LINKS.map((link) => (
            <button
              key={link.view}
              type="button"
              className="dx-quick-card"
              onClick={() => onNavigate(link.view)}
            >
              <span className="dx-quick-icon" aria-hidden="true">
                {link.icon}
              </span>
              <strong>{link.title}</strong>
              <small>{link.text}</small>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
