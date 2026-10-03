import { useEffect, useState } from "react";
import "./App.css";
import "./styles/RecommendationChanges.css";
import WeatherMonitoring from "./components/WeatherMonitoring";
import RecommendationEngine from "./components/RecommendationEngine";
import Trips from "./components/Trips";
import Food from "./components/Food";

/* =========================================================
   BACKEND API
========================================================= */

const API_BASE_URL = "http://localhost:8080";

const getAuthToken = () => {
  const token =
    localStorage.getItem("itineraryToken") ||
    localStorage.getItem("jwtToken") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    "";

  return String(token)
    .replace(/^Bearer\s+/i, "")
    .replace(/^"|"$/g, "")
    .trim();
};

const saveAuthToken = (token) => {
  const normalizedToken = String(token || "")
    .replace(/^Bearer\s+/i, "")
    .replace(/^"|"$/g, "")
    .trim();

  if (!normalizedToken) {
    return false;
  }

  localStorage.setItem("jwtToken", normalizedToken);
  localStorage.setItem("itineraryToken", normalizedToken);
  localStorage.setItem("isLoggedIn", "true");

  return true;
};

const clearAuthToken = () => {
  localStorage.removeItem("jwtToken");
  localStorage.removeItem("itineraryToken");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("token");
  localStorage.removeItem("isLoggedIn");
};

const getAuthHeaders = () => {
  const token = getAuthToken();

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const readApiResponse = async (response) => {
  const text = await response.text();

  let data = text;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // The backend may return plain text.
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      clearAuthToken();
    }

    const message =
      typeof data === "string"
        ? data
        : data?.message || data?.error || `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return data;
};

const formatEta = (hours) => {
  if (hours === null || hours === undefined) return "--";

  const totalMinutes = Math.round(Number(hours) * 60);
  const days = Math.floor(totalMinutes / 1440);
  const remainingMinutes = totalMinutes % 1440;
  const wholeHours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;

  if (days > 0) return `${days}d ${wholeHours}h ${minutes}m`;
  if (wholeHours > 0) return `${wholeHours}h ${minutes}m`;
  return `${minutes}m`;
};

const formatDate = (value) => {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/* =========================================================
   WEATHER HELPERS
========================================================= */

const getWeatherType = (code) => {
  if (code === 0) return "clear";

  if ([1, 2].includes(code)) return "partly-cloudy";

  if ([3, 45, 48].includes(code)) return "cloudy";

  if ([51, 53, 55, 56, 57].includes(code)) return "drizzle";

  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return "rain";
  }

  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return "snow";
  }

  if ([95, 96, 99].includes(code)) return "storm";

  return "clear";
};

const getWeatherLabel = (type) => {
  const labels = {
    clear: "Clear",
    "partly-cloudy": "Partly Cloudy",
    cloudy: "Cloudy",
    drizzle: "Drizzle",
    rain: "Rainy",
    snow: "Snowy",
    storm: "Thunderstorm",
  };

  return labels[type] || "Clear";
};

const getWeatherIcon = (type, isDay) => {
  if (!isDay && type === "clear") {
    return "🌙";
  }

  const icons = {
    clear: "☀️",
    "partly-cloudy": "🌤️",
    cloudy: "☁️",
    drizzle: "🌦️",
    rain: "🌧️",
    snow: "❄️",
    storm: "⛈️",
  };

  return icons[type] || "🌤️";
};

/* =========================================================
   DEFAULT TRAVEL PREFERENCES
========================================================= */

const defaultPreferences = {
  travelType: "Leisure",
  budget: "Moderate",
  climate: "Pleasant",
  activities: ["Sightseeing"],
  accommodation: "Hotel",
  pace: "Balanced",
};

/* =========================================================
   PREFERENCE OPTIONS
========================================================= */

const preferenceOptions = {
  travelType: [
    "Leisure",
    "Adventure",
    "Business",
    "Family",
    "Solo",
    "Romantic",
  ],

  budget: [
    "Budget",
    "Moderate",
    "Premium",
    "Luxury",
  ],

  climate: [
    "Pleasant",
    "Warm",
    "Cool",
    "Cold",
    "Any",
  ],

  activities: [
    "Sightseeing",
    "Nature",
    "Beach",
    "Adventure",
    "Food",
    "Shopping",
    "Culture",
    "Nightlife",
  ],

  accommodation: [
    "Hotel",
    "Resort",
    "Hostel",
    "Apartment",
    "Guest House",
  ],

  pace: [
    "Relaxed",
    "Balanced",
    "Packed",
  ],
};

/* =========================================================
   APP
========================================================= */

function App() {
  /* =========================================================
     LOGIN STATE
  ========================================================= */

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  /* =========================================================
     SIGNUP STATE
  ========================================================= */

  const [registerUsername, setRegisterUsername] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showRegisterPassword, setShowRegisterPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [accountCreated, setAccountCreated] = useState(false);
  const [signupError, setSignupError] = useState("");

  /* =========================================================
     MODAL STATE
  ========================================================= */

  const [showAbout, setShowAbout] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showSignup, setShowSignup] = useState(false);

  /* =========================================================
     LOGIN / PROFILE STATE
  ========================================================= */

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  /* =========================================================
     TRIPS PAGE
  ========================================================= */

  const [showTrips, setShowTrips] = useState(false);

  /* =========================================================
     MODULE 9 — LOCAL AUTHENTIC FOOD
  ========================================================= */

  const [showFood, setShowFood] = useState(false);

  /* =========================================================
     MODULE 7 — WEATHER MONITORING
  ========================================================= */
  const [showWeatherMonitoring, setShowWeatherMonitoring] =
    useState(false);

  /* =========================================================
     MODULE 8 — DYNAMIC RECOMMENDATION ENGINE
  ========================================================= */
  const [showRecommendationEngine, setShowRecommendationEngine] =
    useState(false);
  const [recommendationTripId, setRecommendationTripId] =
    useState("");
  const [recommendationTrips, setRecommendationTrips] =
    useState([]);
  const [recommendationNavigationLoading, setRecommendationNavigationLoading] =
    useState(false);
  const [recommendationNavigationError, setRecommendationNavigationError] =
    useState("");

  const [loggedInUser, setLoggedInUser] = useState({
    name: "",
    email: "",
  });

  /* =========================================================
     PROFILE PAGE STATE

     profileView:
     "profile"
     "preferences"
     "password"
  ========================================================= */

  const [profileView, setProfileView] = useState("profile");

  /* =========================================================
     TRAVEL PREFERENCES
  ========================================================= */

  const [preferences, setPreferences] = useState(
    defaultPreferences
  );

  const [savedPreferences, setSavedPreferences] = useState(
    defaultPreferences
  );

  const [preferencesSaved, setPreferencesSaved] =
    useState(false);

  /* =========================================================
     WEATHER STATE
  ========================================================= */

  const [weather, setWeather] = useState({
    type: "clear",
    temperature: null,
    isDay: true,
    location: "Detecting location...",
    humidity: null,
    wind: null,
    loading: true,
    error: "",
  });

  /* =========================================================
     LOAD SAVED LOGIN + PREFERENCES
  ========================================================= */

  useEffect(() => {
    try {
      const storedPreferences = localStorage.getItem(
        "itineraryPreferences"
      );

      if (storedPreferences) {
        const parsedPreferences =
          JSON.parse(storedPreferences);

        setPreferences({
          ...defaultPreferences,
          ...parsedPreferences,
        });

        setSavedPreferences({
          ...defaultPreferences,
          ...parsedPreferences,
        });
      }

      const storedUser =
        localStorage.getItem("itineraryUser");

      const storedToken = getAuthToken();

      if (storedUser && storedToken) {
        const parsedUser = JSON.parse(storedUser);

        if (parsedUser.email) {
          setLoggedInUser(parsedUser);
          setIsLoggedIn(true);
        }
      } else if (!storedToken) {
        clearAuthToken();
      }
    } catch (error) {
      console.error(
        "Unable to load saved application data:",
        error
      );
    }
  }, []);

  /* =========================================================
     WEATHER
  ========================================================= */

  useEffect(() => {
    const getWeather = async (latitude, longitude) => {
      try {
        const weatherUrl =
          `https://api.open-meteo.com/v1/forecast?` +
          `latitude=${latitude}` +
          `&longitude=${longitude}` +
          `&current=temperature_2m,weather_code,is_day,wind_speed_10m,relative_humidity_2m` +
          `&timezone=auto`;

        const weatherResponse = await fetch(weatherUrl);

        if (!weatherResponse.ok) {
          throw new Error("Unable to fetch weather");
        }

        const weatherData =
          await weatherResponse.json();

        const current = weatherData.current;

        let locationName = "Your location";

        try {
          const locationUrl =
            `https://api.bigdatacloud.net/data/reverse-geocode-client?` +
            `latitude=${encodeURIComponent(latitude)}` +
            `&longitude=${encodeURIComponent(longitude)}` +
            `&localityLanguage=en`;

          const locationResponse =
            await fetch(locationUrl);

          if (locationResponse.ok) {
            const locationData =
              await locationResponse.json();

            const city =
              locationData?.city ||
              locationData?.locality ||
              locationData?.principalSubdivision ||
              "Your location";

            const country =
              locationData?.countryName ||
              "";

            locationName = country
              ? `${city}, ${country}`
              : city;
          }
        } catch (locationError) {
          console.log(
            "Location name unavailable; weather will still be shown."
          );
        }

        setWeather({
          type: getWeatherType(
            current.weather_code
          ),

          temperature: Math.round(
            current.temperature_2m
          ),

          isDay: current.is_day === 1,

          location: locationName,

          humidity:
            current.relative_humidity_2m,

          wind: current.wind_speed_10m,

          loading: false,

          error: "",
        });
      } catch (error) {
        console.error(
          "Weather error:",
          error
        );

        setWeather((previous) => ({
          ...previous,
          loading: false,
          error:
            "Unable to load live weather.",
        }));
      }
    };

    if (!navigator.geolocation) {
      setWeather((previous) => ({
        ...previous,
        loading: false,
        error:
          "Location is not supported by your browser.",
      }));

      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        getWeather(
          position.coords.latitude,
          position.coords.longitude
        );
      },

      (error) => {
        console.error(
          "Location permission error:",
          error
        );

        setWeather((previous) => ({
          ...previous,
          loading: false,
          error:
            "Please allow location access for live weather.",
        }));
      },

      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  }, []);

  /* =========================================================
     LOGIN
  ========================================================= */

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      alert("Please enter your email and password.");
      return;
    }

    try {
      clearAuthToken();

      const response = await fetch(
        `${API_BASE_URL}/api/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/plain, application/json, */*",
          },
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        }
      );

      const resultText = await response.text();

      if (!response.ok) {
        let message =
          resultText || "Invalid email or password.";

        try {
          const errorData = resultText
            ? JSON.parse(resultText)
            : null;

          message =
            errorData?.message ||
            errorData?.error ||
            errorData?.detail ||
            message;
        } catch {
          // Backend returned plain text.
        }

        throw new Error(message);
      }

      let parsedResult = null;

      try {
        parsedResult = resultText
          ? JSON.parse(resultText)
          : null;
      } catch {
        parsedResult = null;
      }

      /*
        Support all token response formats used by the
        existing Weather Planner backend/frontend:
        - plain JWT text
        - token
        - jwt
        - accessToken
        - jwtToken
        - data.token
        - data.accessToken
        - data.jwt
        - data.jwtToken
        - user.token
      */
      let token = "";

      const jwtMatch = resultText.match(
        /([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/
      );

      if (jwtMatch) {
        token = jwtMatch[1];
      } else if (typeof parsedResult === "string") {
        token = parsedResult.trim();
      } else if (
        parsedResult &&
        typeof parsedResult === "object"
      ) {
        token =
          parsedResult.token ||
          parsedResult.jwt ||
          parsedResult.accessToken ||
          parsedResult.jwtToken ||
          parsedResult.data?.token ||
          parsedResult.data?.accessToken ||
          parsedResult.data?.jwt ||
          parsedResult.data?.jwtToken ||
          parsedResult.user?.token ||
          "";
      }

      const tokenSaved = saveAuthToken(token);

      if (!tokenSaved) {
        throw new Error(
          "Login succeeded, but the backend response does not contain a valid JWT token."
        );
      }

      let userName =
        email.trim().split("@")[0];

      if (parsedResult && typeof parsedResult === "object") {
        userName =
          parsedResult.fullName ||
          parsedResult.name ||
          parsedResult.user?.fullName ||
          parsedResult.user?.name ||
          userName;
      }

      const user = {
        name: userName,
        email: email.trim(),
      };

      setLoggedInUser(user);

      localStorage.setItem(
        "itineraryUser",
        JSON.stringify(user)
      );

      setIsLoggedIn(true);

      /*
        Login always opens the existing Profile page.
        Trips, Weather Monitoring, and Recommendations
        are then available from the logged-in application.
      */
      setShowTrips(false);
      setShowFood(false);
      setShowWeatherMonitoring(false);
      setShowRecommendationEngine(false);
      setRecommendationNavigationError("");
      setRecommendationNavigationLoading(false);
      setProfileView("profile");
      setShowProfile(true);

      setPassword("");
    } catch (error) {
      console.error("Login error:", error);

      clearAuthToken();
      setIsLoggedIn(false);

      alert(
        error?.message ||
          "Login failed. Please check your email and password."
      );
    }
  };

  /* =========================================================
     LOGOUT
  ========================================================= */

  const handleLogout = () => {
    setIsLoggedIn(false);
    setShowProfile(false);
    setShowTrips(false);
    setShowFood(false);
    setShowWeatherMonitoring(false);
    setShowRecommendationEngine(false);
    setRecommendationNavigationError("");
    setProfileView("profile");

    localStorage.removeItem(
      "itineraryUser"
    );

    clearAuthToken();

    setEmail("");
    setPassword("");
  };

  /* =========================================================
     SIGNUP
  ========================================================= */

  const openSignup = () => {
    setShowSignup(true);
    setAccountCreated(false);
    setSignupError("");
  };

  const closeSignup = () => {
    setShowSignup(false);
    setSignupError("");
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();

    setSignupError("");

    if (
      registerPassword !==
      confirmPassword
    ) {
      setSignupError(
        "Passwords do not match."
      );

      setAccountCreated(false);

      return;
    }

    if (registerPassword.length < 6) {
      setSignupError(
        "Password must contain at least 6 characters."
      );

      setAccountCreated(false);

      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/register`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            fullName:
              registerUsername,
            email: registerEmail,
            password:
              registerPassword,
          }),
        }
      );

      const result =
        await response.text();

      if (response.ok) {
        setAccountCreated(true);
        setSignupError("");
      } else {
        setAccountCreated(false);

        setSignupError(
          result ||
            "Registration failed."
        );
      }
    } catch (error) {
      console.error(
        "Registration error:",
        error
      );

      setAccountCreated(false);

      setSignupError(
        "Cannot connect to backend. Check if Spring Boot is running."
      );
    }
  };

  /* =========================================================
     PREFERENCE FUNCTIONS
  ========================================================= */

  const updatePreference = (
    key,
    value
  ) => {
    setPreferences((previous) => ({
      ...previous,
      [key]: value,
    }));

    setPreferencesSaved(false);
  };

  const toggleActivity = (
    activity
  ) => {
    setPreferences((previous) => {
      const current =
        previous.activities || [];

      const exists =
        current.includes(activity);

      return {
        ...previous,
        activities: exists
          ? current.filter(
              (item) =>
                item !== activity
            )
          : [...current, activity],
      };
    });

    setPreferencesSaved(false);
  };

  const savePreferences = () => {
    localStorage.setItem(
      "itineraryPreferences",
      JSON.stringify(preferences)
    );

    setSavedPreferences(
      preferences
    );

    setPreferencesSaved(true);
  };

  /* =========================================================
     PASSWORD CHANGE
  ========================================================= */

  const [currentPassword, setCurrentPassword] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmNewPassword, setConfirmNewPassword] =
    useState("");

  const [showCurrentPassword, setShowCurrentPassword] =
    useState(false);

  const [showNewPassword, setShowNewPassword] =
    useState(false);

  const [showConfirmNewPassword, setShowConfirmNewPassword] =
    useState(false);

  /* =========================================================
     MODULE 4 — SMART ROUTE PLANNER STATE
  ========================================================= */

  const [tripHistory, setTripHistory] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState("");
  const [destinations, setDestinations] = useState([]);
  const [routeDistance, setRouteDistance] = useState(null);
  const [routeEta, setRouteEta] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [routeError, setRouteError] = useState("");
  const [routeMessage, setRouteMessage] = useState("");

  const [destinationName, setDestinationName] = useState("");
  const [destinationLatitude, setDestinationLatitude] = useState("");
  const [destinationLongitude, setDestinationLongitude] = useState("");
  const [draggedDestinationId, setDraggedDestinationId] = useState(null);

  /* =========================================================
     MODULE 4 — SMART ROUTE PLANNER FUNCTIONS
  ========================================================= */

  const loadDestinations = async (tripId) => {
    if (!tripId) {
      setDestinations([]);
      return;
    }

    const response = await fetch(
      `${API_BASE_URL}/api/trips/${tripId}/destinations`,
      {
        method: "GET",
        headers: getAuthHeaders(),
      }
    );

    const data = await readApiResponse(response);
    const items = Array.isArray(data) ? data : [];

    setDestinations(
      [...items].sort(
        (a, b) =>
          Number(a.destinationOrder ?? 0) -
          Number(b.destinationOrder ?? 0)
      )
    );
  };

  const loadTripHistory = async () => {
    const token = getAuthToken();

    if (!token) {
      setHistoryLoading(false);
      setTripHistory([]);
      setSelectedTripId("");
      setDestinations([]);
      setRouteDistance(null);
      setRouteEta(null);
      setRouteError(
        "Your login session is missing or expired. Please login again."
      );
      setIsLoggedIn(false);
      setShowProfile(false);
      setShowTrips(false);
      setShowWeatherMonitoring(false);
      setShowRecommendationEngine(false);
      setProfileView("profile");
      localStorage.removeItem("itineraryUser");
      clearAuthToken();
      return;
    }

    setHistoryLoading(true);
    setRouteError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/trips`,
        {
          method: "GET",
          headers: getAuthHeaders(),
        }
      );

      const data = await readApiResponse(response);
      const trips = Array.isArray(data) ? data : [];

      setTripHistory(trips);

      if (trips.length === 0) {
        setSelectedTripId("");
        setDestinations([]);
        setRouteDistance(null);
        setRouteEta(null);
        return;
      }

      const existingTrip = trips.find(
        (trip) =>
          String(trip.tripId ?? trip.id) ===
          String(selectedTripId)
      );

      const tripToSelect = existingTrip || trips[0];
      const tripId = tripToSelect.tripId ?? tripToSelect.id;

      setSelectedTripId(String(tripId));
      await loadDestinations(tripId);
    } catch (error) {
      console.error("Trip history error:", error);

      const message = error?.message || "Unable to load route history.";

      if (
        /401|403|authentication token|token is missing|session.*expired|unauthorized/i.test(
          message
        )
      ) {
        setIsLoggedIn(false);
        setShowProfile(false);
        setShowTrips(false);
        setShowWeatherMonitoring(false);
        setShowRecommendationEngine(false);
        setProfileView("profile");
        localStorage.removeItem("itineraryUser");
        clearAuthToken();
        setRouteError("Your login session expired. Please login again.");
      } else {
        setRouteError(message);
      }
    } finally {
      setHistoryLoading(false);
    }
  };

  const refreshRouteData = async () => {
    setRouteError("");
    setRouteMessage("");
    await loadTripHistory();
  };

  const openRoutePlanner = async () => {
    const token = getAuthToken();

    if (!token) {
      setRouteError(
        "Your login session is missing or expired. Please login again."
      );
      return;
    }

    setProfileView("route");
    await loadTripHistory();
  };

  const handleTripChange = async (event) => {
    const tripId = event.target.value;

    setSelectedTripId(tripId);
    setDestinations([]);
    setRouteDistance(null);
    setRouteEta(null);
    setRouteError("");
    setRouteMessage("");

    if (!tripId) return;

    try {
      await loadDestinations(tripId);
    } catch (error) {
      setRouteError(error.message || "Unable to load destinations.");
    }
  };

  const handleAddDestination = async (event) => {
    event.preventDefault();

    if (!selectedTripId) {
      setRouteError("Select a trip before adding destinations.");
      return;
    }

    if (!destinationName.trim()) {
      setRouteError("Enter a destination name.");
      return;
    }

    const latitude = Number(destinationLatitude);
    const longitude = Number(destinationLongitude);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      setRouteError("Enter valid latitude and longitude values.");
      return;
    }

    setRouteLoading(true);
    setRouteError("");
    setRouteMessage("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/trips/${selectedTripId}/destinations`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            destinationName: destinationName.trim(),
            latitude,
            longitude,
          }),
        }
      );

      await readApiResponse(response);
      await loadDestinations(selectedTripId);

      setDestinationName("");
      setDestinationLatitude("");
      setDestinationLongitude("");
      setRouteMessage("Destination added successfully.");
    } catch (error) {
      setRouteError(error.message || "Unable to add destination.");
    } finally {
      setRouteLoading(false);
    }
  };

  const handleDeleteDestination = async (destinationId) => {
    if (!selectedTripId) return;

    setRouteLoading(true);
    setRouteError("");
    setRouteMessage("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/trips/${selectedTripId}/destinations/${destinationId}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      await readApiResponse(response);
      await loadDestinations(selectedTripId);
      setRouteMessage("Destination removed.");
    } catch (error) {
      setRouteError(error.message || "Unable to remove destination.");
    } finally {
      setRouteLoading(false);
    }
  };

  const reorderDestinations = async (orderedItems) => {
    if (!selectedTripId) return;

    const destinationIds = orderedItems.map(
      (item) => item.destinationId ?? item.id
    );

    const response = await fetch(
      `${API_BASE_URL}/api/trips/${selectedTripId}/destinations/reorder`,
      {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ destinationIds }),
      }
    );

    await readApiResponse(response);
    await loadDestinations(selectedTripId);
  };

  const moveDestination = async (index, direction) => {
    const newIndex = index + direction;

    if (
      newIndex < 0 ||
      newIndex >= destinations.length
    ) {
      return;
    }

    const reordered = [...destinations];
    [reordered[index], reordered[newIndex]] = [
      reordered[newIndex],
      reordered[index],
    ];

    try {
      setRouteError("");
      await reorderDestinations(reordered);
      setRouteMessage("Route order updated.");
    } catch (error) {
      setRouteError(error.message || "Unable to reorder destinations.");
    }
  };

  const handleDropDestination = async (targetId) => {
    if (
      draggedDestinationId === null ||
      draggedDestinationId === targetId
    ) {
      return;
    }

    const fromIndex = destinations.findIndex(
      (item) =>
        String(item.destinationId ?? item.id) ===
        String(draggedDestinationId)
    );

    const toIndex = destinations.findIndex(
      (item) =>
        String(item.destinationId ?? item.id) ===
        String(targetId)
    );

    if (fromIndex < 0 || toIndex < 0) return;

    const reordered = [...destinations];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    try {
      setRouteError("");
      await reorderDestinations(reordered);
      setRouteMessage("Route order updated.");
    } catch (error) {
      setRouteError(error.message || "Unable to reorder destinations.");
    } finally {
      setDraggedDestinationId(null);
    }
  };

  const calculateRoute = async () => {
    if (!selectedTripId || destinations.length < 2) {
      setRouteError("Add at least two destinations to calculate a route.");
      return;
    }

    setRouteLoading(true);
    setRouteError("");
    setRouteMessage("");

    try {
      const distanceResponse = await fetch(
        `${API_BASE_URL}/api/trips/${selectedTripId}/route/distance`,
        {
          method: "GET",
          headers: getAuthHeaders(),
        }
      );

      const distanceData = await readApiResponse(distanceResponse);

      const etaResponse = await fetch(
        `${API_BASE_URL}/api/trips/${selectedTripId}/route/eta`,
        {
          method: "GET",
          headers: getAuthHeaders(),
        }
      );

      const etaData = await readApiResponse(etaResponse);

      setRouteDistance(
        distanceData?.distanceKm ??
          distanceData?.distance ??
          distanceData
      );

      setRouteEta(
        etaData?.etaHours ??
          etaData?.eta ??
          etaData
      );

      setRouteMessage("Route calculated successfully.");
    } catch (error) {
      setRouteError(error.message || "Unable to calculate route.");
    } finally {
      setRouteLoading(false);
    }
  };

  const handlePasswordChange = (e) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      alert(
        "New password must contain at least 6 characters."
      );

      return;
    }

    if (
      newPassword !==
      confirmNewPassword
    ) {
      alert(
        "New passwords do not match."
      );

      return;
    }

    /*
      Frontend validation only for now.
      The actual password API can be connected
      without changing the Profile UI.
    */

    alert(
      "Password details are valid. Connect the change-password backend endpoint to update your password."
    );

    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
  };

  /* =========================================================
     PROFILE VIEW HELPERS
  ========================================================= */

  const openProfile = () => {
    setShowFood(false);
    setShowTrips(false);
    setShowWeatherMonitoring(false);
    setShowRecommendationEngine(false);
    setProfileView("profile");
    setShowProfile(true);
  };

  const backFromProfile = () => {
    setShowProfile(false);
    setShowFood(false);
    setShowTrips(false);
    setProfileView("profile");
  };

  /* =========================================================
     TRIPS NAVIGATION
  ========================================================= */

  const openTrips = () => {
    const token = getAuthToken();

    if (!token) {
      setShowProfile(true);
      setShowTrips(false);
      alert("Your login session is missing or expired. Please login again.");
      return;
    }

    setShowProfile(false);
    setShowFood(false);
    setShowWeatherMonitoring(false);
    setShowRecommendationEngine(false);
    setRecommendationNavigationError("");
    setShowTrips(true);
  };

  const backFromTrips = () => {
    setShowTrips(false);
    setProfileView("profile");
    setShowProfile(true);
  };

  /* =========================================================
     MODULE 9 — LOCAL AUTHENTIC FOOD NAVIGATION
  ========================================================= */

  const openFood = () => {
    const token = getAuthToken();

    if (!token) {
      setShowFood(false);
      setShowProfile(true);
      setProfileView("profile");
      alert("Your login session is missing or expired. Please login again.");
      return;
    }

    setShowProfile(false);
    setShowTrips(false);
    setShowWeatherMonitoring(false);
    setShowRecommendationEngine(false);
    setRecommendationNavigationError("");
    setShowFood(true);
  };

  const backFromFood = () => {
    setShowFood(false);
    setProfileView("profile");
    setShowProfile(true);
  };

  /* =========================================================
     MODULE 7 — WEATHER MONITORING NAVIGATION
  ========================================================= */
  const openWeatherMonitoring = () => {
    setShowProfile(false);
    setShowFood(false);
    setShowRecommendationEngine(false);
    setRecommendationNavigationError("");
    setShowWeatherMonitoring(true);
  };

  const backFromWeatherMonitoring = () => {
    setShowWeatherMonitoring(false);
  };

  /* =========================================================
     MODULE 8 — DYNAMIC RECOMMENDATION ENGINE NAVIGATION
  ========================================================= */
  const openRecommendationEngine = async () => {
    const token = getAuthToken();

    if (!token) {
      setShowProfile(true);
      setShowRecommendationEngine(false);
      setRecommendationNavigationError(
        "Your login session is missing or expired. Please login again."
      );
      return;
    }

    setShowProfile(false);
    setShowFood(false);
    setShowWeatherMonitoring(false);
    setShowRecommendationEngine(true);
    setRecommendationNavigationError("");
    setRecommendationNavigationLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/trips`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      const data = await readApiResponse(response);
      const trips = Array.isArray(data) ? data : [];

      setRecommendationTrips(trips);

      if (trips.length > 0) {
        const currentExists = trips.some(
          (trip) =>
            String(trip.tripId ?? trip.id) ===
            String(recommendationTripId)
        );

        if (!currentExists) {
          const firstTripId = trips[0]?.tripId ?? trips[0]?.id;
          setRecommendationTripId(
            firstTripId === undefined || firstTripId === null
              ? ""
              : String(firstTripId)
          );
        }
      } else {
        setRecommendationTripId("");
        setRecommendationNavigationError(
          "No trips found. Create a trip before generating recommendations."
        );
      }
    } catch (error) {
      console.error(
        "Recommendation trip loading error:",
        error
      );

      const message =
        error?.message ||
        "Unable to load trips for recommendations.";

      if (
        /401|403|authentication token|token is missing|session.*expired|unauthorized/i.test(
          message
        )
      ) {
        setIsLoggedIn(false);
        setShowProfile(false);
        setShowTrips(false);
        setShowWeatherMonitoring(false);
        setShowRecommendationEngine(false);
        setProfileView("profile");
        localStorage.removeItem("itineraryUser");
        clearAuthToken();
        setRecommendationNavigationError(
          "Your login session expired. Please login again."
        );
      } else {
        setRecommendationNavigationError(message);
      }
    } finally {
      setRecommendationNavigationLoading(false);
    }
  };

  const backFromRecommendationEngine = () => {
    setShowRecommendationEngine(false);
    setRecommendationNavigationError("");
  };

  const profileInitial =
    loggedInUser.name
      ? loggedInUser.name
          .charAt(0)
          .toUpperCase()
      : "U";

  /* =========================================================
     WEATHER VALUES
  ========================================================= */

  const weatherIcon = getWeatherIcon(
    weather.type,
    weather.isDay
  );

  const weatherLabel =
    getWeatherLabel(
      weather.type
    );

  /* =========================================================
     RETURN
  ========================================================= */

  return (
    <div
      className={`
        app
        weather-${weather.type}
        ${weather.isDay ? "day" : "night"}
      `}
    >
      {/* =====================================================
          WEATHER BACKGROUND
      ===================================================== */}

      <div
        className="weather-background"
        aria-hidden="true"
      >
        <div className="sun-glow"></div>

        <div className="moon-glow">
          🌙
        </div>

        <div className="cloud cloud-one">
          ☁️
        </div>

        <div className="cloud cloud-two">
          ☁️
        </div>

        <div className="cloud cloud-three">
          ☁️
        </div>

        <div className="rain-layer">
          {Array.from({
            length: 45,
          }).map((_, index) => (
            <span
              key={index}
              className="rain-drop"
            ></span>
          ))}
        </div>

        <div className="snow-layer">
          {Array.from({
            length: 35,
          }).map((_, index) => (
            <span
              key={index}
              className="snowflake"
            >
              ❄
            </span>
          ))}
        </div>

        <div className="stars">
          {Array.from({
            length: 35,
          }).map((_, index) => (
            <span
              key={index}
            >
              ✦
            </span>
          ))}
        </div>
      </div>

      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <header className="navbar">
        <div className="brand">
          <span className="brand-icon">
            {weatherIcon}
          </span>

          <span className="brand-name">
            Itinerary Planner
          </span>
        </div>

        <nav className="nav-links">
          <button
            type="button"
            onClick={() =>
              setShowAbout(true)
            }
          >
            About
          </button>

          <button
            type="button"
            onClick={() =>
              setShowContact(true)
            }
          >
            Contact
          </button>

          <button
            type="button"
            onClick={openWeatherMonitoring}
          >
            Weather Monitoring
          </button>

          <button
            type="button"
            onClick={openRecommendationEngine}
          >
            Recommendations
          </button>

          {isLoggedIn && (
            <button
              type="button"
              onClick={openFood}
            >
              Food & Dining
            </button>
          )}

          {isLoggedIn && (
            <button
              type="button"
              onClick={openProfile}
            >
              Profile
            </button>
          )}
        </nav>
      </header>

      {/* =====================================================
          MAIN WEATHER + LOGIN
      ===================================================== */}

      {!showProfile &&
        !showTrips &&
        !showFood &&
        !showWeatherMonitoring &&
        !showRecommendationEngine && (
        <main className="main-content">
          <div className="live-weather">
            <span className="live-dot"></span>

            <span>
              {weather.loading
                ? "Detecting live weather..."
                : weather.error
                ? weather.error
                : `Live weather • ${weatherLabel}`}
            </span>
          </div>

          <div className="weather-icon">
            {weatherIcon}
          </div>

          {!weather.loading &&
            weather.temperature !==
              null && (
              <div className="weather-info">
                <div className="temperature">
                  {weather.temperature}°C
                </div>

                <div className="location">
                  📍{" "}
                  {weather.location}
                </div>

                {weather.humidity !==
                  null && (
                  <div className="weather-details">
                    <span>
                      💧{" "}
                      {
                        weather.humidity
                      }
                      %
                    </span>

                    <span>
                      💨{" "}
                      {Math.round(
                        weather.wind
                      )}{" "}
                      km/h
                    </span>
                  </div>
                )}
              </div>
            )}

          <h1>
            Plan smarter.
            <br />
            Travel better.
          </h1>

          <p className="description">
            Your intelligent travel
            companion that adapts your
            itinerary based on
            real-time weather
            conditions.
          </p>

          <div className="weather-icons">
            <span>☀️</span>
            <span>🌤️</span>
            <span>🌧️</span>
            <span>⛈️</span>
          </div>

          {/* LOGIN */}

          <section className="login-container">
            <div className="login-header">
              <h2>
                Welcome Back!
              </h2>

              <p>
                Login to continue
                planning your
                perfect trip.
              </p>
            </div>

            <form
              onSubmit={handleLogin}
            >
              <div className="form-group">
                <label htmlFor="email">
                  Email
                </label>

                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) =>
                    setEmail(
                      e.target.value
                    )
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">
                  Password
                </label>

                <div className="password-wrapper">
                  <input
                    id="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) =>
                      setPassword(
                        e.target.value
                      )
                    }
                    required
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowPassword(
                        !showPassword
                      )
                    }
                  >
                    {showPassword
                      ? "🙈"
                      : "👁️"}
                  </button>
                </div>
              </div>

              <div className="forgot-container">
                <button
                  type="button"
                  className="forgot-button"
                  onClick={() =>
                    alert(
                      "Password reset will send an OTP to your registered email after the backend is connected."
                    )
                  }
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                className="login-button"
              >
                Login
              </button>
            </form>

            <div className="divider">
              <span></span>
              <p>OR</p>
              <span></span>
            </div>

            <p className="signup-text">
              Don't have an account?

              <button
                type="button"
                className="signup-button"
                onClick={
                  openSignup
                }
              >
                Sign Up
              </button>
            </p>
          </section>
        </main>
      )}

      {/* =====================================================
          TRIPS PAGE
      ===================================================== */}
      {showTrips && (
        <main className="trip-page-container">
          <Trips onBack={backFromTrips} />
        </main>
      )}

      {/* =====================================================
          MODULE 9 — LOCAL AUTHENTIC FOOD
      ===================================================== */}
      {showFood && (
        <main className="food-page-container">
          <Food onBack={backFromFood} />
        </main>
      )}

      {/* =====================================================
          MODULE 7 — WEATHER MONITORING
      ===================================================== */}
      {showWeatherMonitoring && (
        <main className="weather-monitoring-container">
          <div className="weather-monitoring-back-row">
            <button
              type="button"
              className="weather-monitoring-back wm-primary-button"
              onClick={backFromWeatherMonitoring}
            >
              ← Back
            </button>
          </div>

          <WeatherMonitoring />
        </main>
      )}

      {/* =====================================================
          MODULE 8 — DYNAMIC RECOMMENDATION ENGINE
      ===================================================== */}
      {showRecommendationEngine && (
        <main className="recommendation-engine-container">
          {recommendationNavigationLoading && (
            <div className="recommendation-navigation-message">
              Loading your trips...
            </div>
          )}

          {recommendationNavigationError && (
            <div className="recommendation-navigation-error">
              ⚠️ {recommendationNavigationError}
            </div>
          )}

          <RecommendationEngine
            tripId={recommendationTripId}
            trips={recommendationTrips}
            onTripChange={(tripId) =>
              setRecommendationTripId(String(tripId ?? ""))
            }
            onBack={backFromRecommendationEngine}
          />
        </main>
      )}

      {/* =====================================================
          PROFILE PAGE
      ===================================================== */}

      {showProfile && (
        <main className="profile-page">
          <button
            type="button"
            className="profile-back-button"
            onClick={
              profileView === "route"
                ? () => setProfileView("profile")
                : backFromProfile
            }
          >
            {profileView === "route"
              ? "← Back to Profile"
              : "← Back to Weather"}
          </button>

          <section className="profile-card">
            {/* =================================================
                PROFILE HOME
            ================================================= */}

            {profileView ===
              "profile" && (
              <>
                <div className="profile-eyebrow">
                  YOUR ACCOUNT
                </div>

                <h2>
                  Welcome,{" "}
                  {loggedInUser.name ||
                    "Traveler"}!
                </h2>

                <p className="profile-subtitle">
                  Manage your travel
                  profile and
                  preferences from
                  one place.
                </p>

                <div className="profile-picture">
                  {profileInitial}
                </div>

                <div className="profile-details">
                  <div className="profile-detail">
                    <span>
                      Name
                    </span>

                    <strong>
                      {loggedInUser.name ||
                        "Traveler"}
                    </strong>
                  </div>

                  <div className="profile-detail">
                    <span>
                      Email
                    </span>

                    <strong>
                      {
                        loggedInUser.email
                      }
                    </strong>
                  </div>
                </div>

                {/* PREFERENCE SUMMARY */}

                <div className="profile-preferences-summary">
                  <h3>
                    ✈️ Travel
                    Preferences
                  </h3>

                  <div className="preference-summary-grid">
                    <div>
                      <span>
                        Travel Type
                      </span>

                      <strong>
                        {
                          savedPreferences.travelType
                        }
                      </strong>
                    </div>

                    <div>
                      <span>
                        Budget
                      </span>

                      <strong>
                        {
                          savedPreferences.budget
                        }
                      </strong>
                    </div>

                    <div>
                      <span>
                        Climate
                      </span>

                      <strong>
                        {
                          savedPreferences.climate
                        }
                      </strong>
                    </div>

                    <div>
                      <span>
                        Pace
                      </span>

                      <strong>
                        {
                          savedPreferences.pace
                        }
                      </strong>
                    </div>

                    <div>
                      <span>
                        Accommodation
                      </span>

                      <strong>
                        {
                          savedPreferences.accommodation
                        }
                      </strong>
                    </div>

                    <div>
                      <span>
                        Activities
                      </span>

                      <strong>
                        {savedPreferences.activities?.join(
                          ", "
                        ) ||
                          "Not selected"}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* PROFILE ACTIONS */}

                <div className="profile-actions">
                  <button
                    type="button"
                    onClick={() =>
                      setProfileView(
                        "preferences"
                      )
                    }
                  >
                    ✈️ Manage
                    Preferences
                  </button>

                  <button
                    type="button"
                    onClick={openRoutePlanner}
                  >
                    🗺️ Smart Route
                    Planner
                  </button>

                  <button
                    type="button"
                    onClick={openTrips}
                  >
                    ✈️ My Trips
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setProfileView(
                        "password"
                      )
                    }
                  >
                    🔐 Change
                    Password
                  </button>

                  <button
                    type="button"
                    className="logout-button"
                    onClick={
                      handleLogout
                    }
                  >
                    🚪 Logout
                  </button>
                </div>
              </>
            )}

            {/* =================================================
                MANAGE PREFERENCES
            ================================================= */}

            {profileView ===
              "preferences" && (
              <>
                <button
                  type="button"
                  className="inner-back-button"
                  onClick={() =>
                    setProfileView(
                      "profile"
                    )
                  }
                >
                  ← Back to Profile
                </button>

                <div className="profile-eyebrow">
                  PERSONALIZE
                </div>

                <h2>
                  Travel Preferences
                </h2>

                <p className="profile-subtitle">
                  Select your travel
                  style so we can
                  create better
                  itinerary
                  recommendations.
                </p>

                {/* TRAVEL TYPE */}

                <div className="preference-section">
                  <span className="preference-title">
                    🧳 What type of
                    travel do you
                    prefer?
                  </span>

                  <p className="preference-hint">
                    Choose one
                  </p>

                  <div className="choice-grid">
                    {preferenceOptions.travelType.map(
                      (option) => (
                        <button
                          type="button"
                          key={option}
                          className={`choice-button ${
                            preferences.travelType ===
                            option
                              ? "selected"
                              : ""
                          }`}
                          onClick={() =>
                            updatePreference(
                              "travelType",
                              option
                            )
                          }
                        >
                          {preferences.travelType ===
                            option &&
                            "✓ "}
                          {option}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* BUDGET */}

                <div className="preference-section">
                  <span className="preference-title">
                    💰 What is your
                    travel budget?
                  </span>

                  <p className="preference-hint">
                    Choose one
                  </p>

                  <div className="choice-grid">
                    {preferenceOptions.budget.map(
                      (option) => (
                        <button
                          type="button"
                          key={option}
                          className={`choice-button ${
                            preferences.budget ===
                            option
                              ? "selected"
                              : ""
                          }`}
                          onClick={() =>
                            updatePreference(
                              "budget",
                              option
                            )
                          }
                        >
                          {preferences.budget ===
                            option &&
                            "✓ "}
                          {option}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* CLIMATE */}

                <div className="preference-section">
                  <span className="preference-title">
                    🌤️ Which climate
                    do you prefer?
                  </span>

                  <p className="preference-hint">
                    Choose one
                  </p>

                  <div className="choice-grid">
                    {preferenceOptions.climate.map(
                      (option) => (
                        <button
                          type="button"
                          key={option}
                          className={`choice-button ${
                            preferences.climate ===
                            option
                              ? "selected"
                              : ""
                          }`}
                          onClick={() =>
                            updatePreference(
                              "climate",
                              option
                            )
                          }
                        >
                          {preferences.climate ===
                            option &&
                            "✓ "}
                          {option}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* ACTIVITIES */}

                <div className="preference-section">
                  <span className="preference-title">
                    🎯 What activities
                    do you enjoy?
                  </span>

                  <p className="preference-hint">
                    Select all that
                    apply
                  </p>

                  <div className="choice-grid">
                    {preferenceOptions.activities.map(
                      (option) => (
                        <button
                          type="button"
                          key={option}
                          className={`choice-button ${
                            preferences.activities?.includes(
                              option
                            )
                              ? "selected"
                              : ""
                          }`}
                          onClick={() =>
                            toggleActivity(
                              option
                            )
                          }
                        >
                          {preferences.activities?.includes(
                            option
                          ) &&
                            "✓ "}
                          {option}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* ACCOMMODATION */}

                <div className="preference-section">
                  <span className="preference-title">
                    🏨 Preferred
                    accommodation
                  </span>

                  <p className="preference-hint">
                    Choose one
                  </p>

                  <div className="choice-grid">
                    {preferenceOptions.accommodation.map(
                      (option) => (
                        <button
                          type="button"
                          key={option}
                          className={`choice-button ${
                            preferences.accommodation ===
                            option
                              ? "selected"
                              : ""
                          }`}
                          onClick={() =>
                            updatePreference(
                              "accommodation",
                              option
                            )
                          }
                        >
                          {preferences.accommodation ===
                            option &&
                            "✓ "}
                          {option}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* PACE */}

                <div className="preference-section">
                  <span className="preference-title">
                    ⏱️ How do you
                    like to travel?
                  </span>

                  <p className="preference-hint">
                    Choose your
                    preferred pace
                  </p>

                  <div className="choice-grid">
                    {preferenceOptions.pace.map(
                      (option) => (
                        <button
                          type="button"
                          key={option}
                          className={`choice-button ${
                            preferences.pace ===
                            option
                              ? "selected"
                              : ""
                          }`}
                          onClick={() =>
                            updatePreference(
                              "pace",
                              option
                            )
                          }
                        >
                          {preferences.pace ===
                            option &&
                            "✓ "}
                          {option}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* SAVE BOX */}

                <div
                  className={`save-preferences-box ${
                    preferencesSaved
                      ? "saved"
                      : ""
                  }`}
                >
                  <div>
                    <strong>
                      {preferencesSaved
                        ? "✓ Preferences Saved"
                        : "Ready to save your preferences?"}
                    </strong>

                    <span>
                      {preferencesSaved
                        ? "Your travel preferences are stored on this device."
                        : "Your selections will be remembered when you return to your profile."}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="save-preferences-button"
                    onClick={
                      savePreferences
                    }
                  >
                    💾 Save Changes
                  </button>
                </div>
              </>
            )}

            {/* =================================================
                MODULE 4 — SMART ROUTE PLANNER
            ================================================= */}

            {profileView === "route" && (
              <section className="route-planner-card">
                <div className="route-planner-content">
                  <div className="route-planner-header">
                    <div>
                      <div className="route-planner-eyebrow">
                        MODULE 4 • SMART ROUTING
                      </div>

                      <div className="route-title-row">
                        <h2>Smart Route Planner</h2>
                        <span className="route-compass">🧭</span>
                      </div>

                      <p className="route-subtitle">
                        Build, organize, and calculate your journey using your saved trips.
                      </p>
                    </div>
                  </div>

                  {routeError && (
                    <div className="route-alert route-alert-error">
                      ⚠️ {routeError}
                    </div>
                  )}

                  {routeMessage && (
                    <div className="route-alert route-alert-success">
                      ✓ {routeMessage}
                    </div>
                  )}

                  <div className="route-trip-selector">
                    <div className="route-selector-icon">🗺️</div>

                    <div className="route-selector-content">
                      <label htmlFor="route-trip-select">
                        Select a trip
                      </label>

                      <select
                        id="route-trip-select"
                        value={selectedTripId}
                        onChange={handleTripChange}
                        disabled={historyLoading}
                      >
                        <option value="">Select a trip</option>

                        {tripHistory.map((trip) => {
                          const tripId = trip.tripId ?? trip.id;
                          const tripName =
                            trip.tripName ??
                            trip.name ??
                            trip.title ??
                            `Trip ${tripId}`;

                          return (
                            <option key={tripId} value={tripId}>
                              {tripName}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <button
                      type="button"
                      className="route-refresh-button"
                      onClick={refreshRouteData}
                      disabled={historyLoading}
                    >
                      ↻
                    </button>
                  </div>

                  {selectedTripId && (
                    <div className="selected-trip-banner">
                      <span className="selected-trip-id">
                        Selected trip ID: <strong>{selectedTripId}</strong>
                      </span>

                      <span className="selected-trip-id">
                        {destinations.length} destination(s)
                      </span>
                    </div>
                  )}

                  <div className="route-metrics">
                    <div className="route-metric-card">
                      <div className="route-metric-icon">📍</div>
                      <div>
                        <span>Stops</span>
                        <strong>{destinations.length}</strong>
                        <span>Destinations</span>
                      </div>
                    </div>

                    <div className="route-metric-card">
                      <div className="route-metric-icon">🛣️</div>
                      <div>
                        <span>Distance</span>
                        <strong>
                          {routeDistance !== null
                            ? `${Number(routeDistance).toFixed(2)} km`
                            : "--"}
                        </strong>
                        <span>Total route</span>
                      </div>
                    </div>

                    <div className="route-metric-card">
                      <div className="route-metric-icon">⏱️</div>
                      <div>
                        <span>ETA</span>
                        <strong>{formatEta(routeEta)}</strong>
                        <span>Estimated travel</span>
                      </div>
                    </div>

                    <div className="route-metric-card">
                      <div className="route-metric-icon">🚗</div>
                      <div>
                        <span>Avg. speed</span>
                        <strong>
                          {routeEta && routeDistance
                            ? `${(Number(routeDistance) / Number(routeEta)).toFixed(0)} km/h`
                            : "--"}
                        </strong>
                        <span>Route estimate</span>
                      </div>
                    </div>
                  </div>

                  <div className="route-workspace">
                    <form
                      className="route-add-panel"
                      onSubmit={handleAddDestination}
                    >
                      <div className="route-panel-heading">
                        <div className="route-panel-icon">＋</div>
                        <div>
                          <h3>Add Destination</h3>
                          <p className="route-subtitle">
                            Add a stop to your selected trip.
                          </p>
                        </div>
                      </div>

                      <div className="route-form-group">
                        <label htmlFor="destination-name">
                          Destination
                        </label>

                        <input
                          id="destination-name"
                          type="text"
                          placeholder="e.g. Coimbatore"
                          value={destinationName}
                          onChange={(e) =>
                            setDestinationName(e.target.value)
                          }
                          disabled={!selectedTripId || routeLoading}
                        />
                      </div>

                      <div className="route-coordinate-grid">
                        <div className="route-form-group">
                          <label htmlFor="destination-latitude">
                            Latitude
                          </label>

                          <input
                            id="destination-latitude"
                            type="number"
                            step="any"
                            placeholder="11.0168"
                            value={destinationLatitude}
                            onChange={(e) =>
                              setDestinationLatitude(e.target.value)
                            }
                            disabled={!selectedTripId || routeLoading}
                          />
                        </div>

                        <div className="route-form-group">
                          <label htmlFor="destination-longitude">
                            Longitude
                          </label>

                          <input
                            id="destination-longitude"
                            type="number"
                            step="any"
                            placeholder="76.9558"
                            value={destinationLongitude}
                            onChange={(e) =>
                              setDestinationLongitude(e.target.value)
                            }
                            disabled={!selectedTripId || routeLoading}
                          />
                        </div>
                      </div>

                      <p className="coordinate-help">
                        🌐 Enter the geographic coordinates of the destination.
                      </p>

                      <button
                        type="submit"
                        className="add-destination-button"
                        disabled={!selectedTripId || routeLoading}
                      >
                        {routeLoading ? "Adding..." : "＋ Add Destination"}
                      </button>

                      {!selectedTripId && (
                        <p className="route-empty-hint">
                          💡 Select a trip above before adding destinations.
                        </p>
                      )}
                    </form>

                    <div className="route-list-panel">
                      <div className="route-list-heading">
                        <h3>🧭 Your Route</h3>
                        <span className="stop-count-badge">
                          {destinations.length} stops
                        </span>
                      </div>

                      {destinations.length === 0 ? (
                        <div className="route-empty-state">
                          <div className="route-empty-icon">🗺️</div>
                          <strong>
                            {selectedTripId
                              ? "No destinations yet"
                              : "No trip selected"}
                          </strong>
                          <p>
                            {selectedTripId
                              ? "Add destinations to build your route."
                              : "Select a trip to see its destinations."}
                          </p>
                        </div>
                      ) : (
                        <div className="destination-list">
                          {destinations.map((destination, index) => {
                            const destinationId =
                              destination.destinationId ?? destination.id;

                            return (
                              <div
                                key={destinationId}
                                className={`destination-item ${
                                  String(draggedDestinationId) ===
                                  String(destinationId)
                                    ? "destination-dragging"
                                    : ""
                                }`}
                                draggable
                                onDragStart={() =>
                                  setDraggedDestinationId(destinationId)
                                }
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={() =>
                                  handleDropDestination(destinationId)
                                }
                              >
                                <div className="destination-order">
                                  {index + 1}
                                </div>

                                <div className="destination-line"></div>

                                <div className="destination-main">
                                  <div className="destination-name-row">
                                    <strong>
                                      {destination.destinationName ??
                                        destination.name ??
                                        "Unnamed destination"}
                                    </strong>

                                    <span className="destination-drag">
                                      ⠿
                                    </span>
                                  </div>

                                  <div className="destination-coordinates">
                                    {Number(destination.latitude).toFixed(4)},{" "}
                                    {Number(destination.longitude).toFixed(4)}
                                  </div>
                                </div>

                                <div className="destination-controls">
                                  <button
                                    type="button"
                                    className="destination-delete"
                                    onClick={() =>
                                      handleDeleteDestination(destinationId)
                                    }
                                    disabled={routeLoading}
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="calculate-route-button"
                    onClick={calculateRoute}
                    disabled={
                      !selectedTripId ||
                      destinations.length < 2 ||
                      routeLoading
                    }
                  >
                    🛣️{" "}
                    {routeLoading ? "Calculating..." : "Calculate Route"}
                  </button>

                  {(routeDistance !== null || routeEta !== null) && (
                    <div className="route-summary-panel">
                      <div className="route-summary-header">
                        <h3>Route Summary</h3>
                        <span className="route-summary-badge">
                          Calculated
                        </span>
                      </div>

                      <div className="route-summary-path">
                        {destinations.map((destination) => (
                          <span
                            className="summary-stop"
                            key={destination.destinationId ?? destination.id}
                          >
                            {destination.destinationName ??
                              destination.name ??
                              "Destination"}
                          </span>
                        ))}
                      </div>

                      <div className="route-calculation-result">
                        <div>
                          <span>Total distance</span>
                          <strong>
                            {routeDistance !== null
                              ? `${Number(routeDistance).toFixed(2)} km`
                              : "--"}
                          </strong>
                        </div>

                        <div>
                          <span>Estimated travel time</span>
                          <strong>{formatEta(routeEta)}</strong>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="route-history-section">
                    <div className="route-history-header">
                      <h3>Route History</h3>
                      <span className="history-count">
                        {tripHistory.length}
                      </span>
                    </div>

                    {historyLoading ? (
                      <div className="history-loading">
                        <span className="route-spinner"></span>
                        Loading trips...
                      </div>
                    ) : tripHistory.length === 0 ? (
                      <div className="history-empty">
                        No saved trips found.
                      </div>
                    ) : (
                      <div className="history-grid">
                        {tripHistory.map((trip, index) => {
                          const tripId = trip.tripId ?? trip.id;
                          const status = String(
                            trip.status ?? "DRAFT"
                          ).toLowerCase();

                          return (
                            <div className="history-card" key={tripId}>
                              <div className="history-card-top">
                                <span className="history-trip-number">
                                  Trip {index + 1}
                                </span>

                                <span
                                  className={`history-status history-status-${status}`}
                                >
                                  {trip.status ?? "DRAFT"}
                                </span>
                              </div>

                              <strong>
                                {trip.tripName ??
                                  trip.name ??
                                  trip.title ??
                                  `Trip ${tripId}`}
                              </strong>

                              <div className="history-date">
                                {formatDate(
                                  trip.createdAt ??
                                    trip.updatedAt ??
                                    trip.startDate
                                )}
                              </div>

                              <button
                                type="button"
                                className="history-open"
                                onClick={() => {
                                  setSelectedTripId(String(tripId));
                                  loadDestinations(tripId);
                                }}
                              >
                                Open Trip
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="route-planner-footer">
                    Drag destinations to reorder them, or use the backend route
                    calculation after adding at least two stops.
                  </div>
                </div>
              </section>
            )}

            {/* =================================================
                CHANGE PASSWORD
            ================================================= */}

            {profileView ===
              "password" && (
              <>
                <button
                  type="button"
                  className="inner-back-button"
                  onClick={() =>
                    setProfileView(
                      "profile"
                    )
                  }
                >
                  ← Back to Profile
                </button>

                <div className="profile-eyebrow">
                  SECURITY
                </div>

                <h2>
                  Change Password
                </h2>

                <p className="profile-subtitle">
                  Update your account
                  password securely.
                </p>

                <form
                  onSubmit={
                    handlePasswordChange
                  }
                >
                  <div className="form-group">
                    <label>
                      Current Password
                    </label>

                    <div className="password-wrapper">
                      <input
                        type={
                          showCurrentPassword
                            ? "text"
                            : "password"
                        }
                        value={
                          currentPassword
                        }
                        onChange={(e) =>
                          setCurrentPassword(
                            e.target.value
                          )
                        }
                        placeholder="Enter current password"
                        required
                      />

                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() =>
                          setShowCurrentPassword(
                            !showCurrentPassword
                          )
                        }
                      >
                        {showCurrentPassword
                          ? "🙈"
                          : "👁️"}
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>
                      New Password
                    </label>

                    <div className="password-wrapper">
                      <input
                        type={
                          showNewPassword
                            ? "text"
                            : "password"
                        }
                        value={
                          newPassword
                        }
                        onChange={(e) =>
                          setNewPassword(
                            e.target.value
                          )
                        }
                        placeholder="Enter new password"
                        required
                      />

                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() =>
                          setShowNewPassword(
                            !showNewPassword
                          )
                        }
                      >
                        {showNewPassword
                          ? "🙈"
                          : "👁️"}
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>
                      Confirm New Password
                    </label>

                    <div className="password-wrapper">
                      <input
                        type={
                          showConfirmNewPassword
                            ? "text"
                            : "password"
                        }
                        value={
                          confirmNewPassword
                        }
                        onChange={(e) =>
                          setConfirmNewPassword(
                            e.target.value
                          )
                        }
                        placeholder="Confirm new password"
                        required
                      />

                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() =>
                          setShowConfirmNewPassword(
                            !showConfirmNewPassword
                          )
                        }
                      >
                        {showConfirmNewPassword
                          ? "🙈"
                          : "👁️"}
                      </button>
                    </div>
                  </div>

                  <div className="profile-form-actions">
                    <button type="submit">
                      🔐 Update Password
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setProfileView(
                          "profile"
                        )
                    }
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </>
            )}
          </section>
        </main>
      )}

      {/* =====================================================
          ABOUT MODAL
      ===================================================== */}

      {showAbout && (
        <div
          className="info-overlay"
          onClick={() =>
            setShowAbout(false)
          }
        >
          <div
            className="info-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <button
              className="modal-close"
              onClick={() =>
                setShowAbout(false)
              }
            >
              ×
            </button>

            <div className="modal-icon">
              🌤️
            </div>

            <h2>
              About Itinerary Planner
            </h2>

            <p>
              Itinerary Planner is a
              smart travel planning
              platform designed to
              make trips easier,
              safer, and more
              enjoyable.
            </p>

            <p>
              The platform uses
              real-time weather
              information to help
              travelers plan their
              activities according
              to current and changing
              weather conditions.
            </p>

            <p>
              Instead of following a
              fixed itinerary,
              travelers can make
              better decisions based
              on weather conditions
              such as sunshine,
              rain, storms, and snow.
            </p>

            <div className="about-features">
              <div>
                <span>🌦️</span>
                <strong>
                  Live Weather
                </strong>
                <small>
                  Real-time weather
                  information
                </small>
              </div>

              <div>
                <span>🗺️</span>
                <strong>
                  Smart Planning
                </strong>
                <small>
                  Plan activities
                  more efficiently
                </small>
              </div>

              <div>
                <span>🤖</span>
                <strong>
                  Intelligent Travel
                </strong>
                <small>
                  Adapt plans to
                  weather conditions
                </small>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          CONTACT MODAL
      ===================================================== */}

      {showContact && (
        <div
          className="info-overlay"
          onClick={() =>
            setShowContact(false)
          }
        >
          <div
            className="info-modal contact-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <button
              className="modal-close"
              onClick={() =>
                setShowContact(false)
              }
            >
              ×
            </button>

            <div className="modal-icon">
              📞
            </div>

            <h2>
              Contact Us
            </h2>

            <p>
              Have a question,
              suggestion, or
              feedback? We'd love to
              hear from you.
            </p>

            <div className="contact-details">
              <div className="contact-item">
                <span>📧</span>

                <div>
                  <small>
                    Email
                  </small>

                  <a href="mailto:weathervsks@gmail.com">
                    weathervsks@gmail.com
                  </a>
                </div>
              </div>

              <div className="contact-item">
                <span>📱</span>

                <div>
                  <small>
                    Phone
                  </small>

                  <a href="tel:9095050274">
                    9095050274
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          SIGNUP MODAL
      ===================================================== */}

      {showSignup && (
        <div
          className="info-overlay signup-overlay"
          onClick={closeSignup}
        >
          <div
            className="info-modal signup-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <button
              className="modal-close"
              onClick={closeSignup}
            >
              ×
            </button>

            <div className="signup-modal-icon">
              ✈️
            </div>

            <h2>
              Create Your Account
            </h2>

            <p className="signup-description">
              Join us and start
              creating unforgettable
              travel memories.
            </p>

            <form
              onSubmit={
                handleCreateAccount
              }
            >
              <div className="form-group">
                <label>
                  Username
                </label>

                <input
                  type="text"
                  placeholder="Enter your username"
                  value={
                    registerUsername
                  }
                  onChange={(e) =>
                    setRegisterUsername(
                      e.target.value
                    )
                  }
                  disabled={
                    accountCreated
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  Email
                </label>

                <input
                  type="email"
                  placeholder="Enter your email"
                  value={
                    registerEmail
                  }
                  onChange={(e) =>
                    setRegisterEmail(
                      e.target.value
                    )
                  }
                  disabled={
                    accountCreated
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  Password
                </label>

                <div className="password-wrapper">
                  <input
                    type={
                      showRegisterPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="Create a password"
                    value={
                      registerPassword
                    }
                    onChange={(e) =>
                      setRegisterPassword(
                        e.target.value
                      )
                    }
                    disabled={
                      accountCreated
                    }
                    required
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowRegisterPassword(
                        !showRegisterPassword
                      )
                    }
                  >
                    {showRegisterPassword
                      ? "🙈"
                      : "👁️"}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>
                  Confirm Password
                </label>

                <div className="password-wrapper">
                  <input
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="Confirm your password"
                    value={
                      confirmPassword
                    }
                    onChange={(e) =>
                      setConfirmPassword(
                        e.target.value
                      )
                    }
                    disabled={
                      accountCreated
                    }
                    required
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowConfirmPassword(
                        !showConfirmPassword
                      )
                    }
                  >
                    {showConfirmPassword
                      ? "🙈"
                      : "👁️"}
                  </button>
                </div>
              </div>

              {signupError && (
                <div className="signup-error">
                  ⚠️ {signupError}
                </div>
              )}

              <button
                type="submit"
                className={`create-account-button ${
                  accountCreated
                    ? "account-created-button"
                    : ""
                }`}
                disabled={
                  accountCreated
                }
              >
                {accountCreated
                  ? "✓ Account Created"
                  : "Create Account"}
              </button>

              {accountCreated && (
                <div className="account-success">
                  <div className="success-check">
                    ✓
                  </div>

                  <div className="success-title">
                    Account created
                    successfully!
                  </div>

                  <div className="success-message">
                    Your account has
                    been created. You
                    can now login.
                  </div>
                </div>
              )}

              <p className="already-account">
                Already have an
                account?

                <button
                  type="button"
                  className="signup-button"
                  onClick={
                    closeSignup
                  }
                >
                  Login
                </button>
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
