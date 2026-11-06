
import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Custom map marker
const locationIcon = L.divIcon({
  className: "weather-location-marker",
  html: `<div style="
    width: 22px;
    height: 22px;
    background: #2563eb;
    border: 4px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
  "></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

// Detect clicks on the map
function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(event) {
      onLocationSelect({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      });
    },
  });

  return null;
}

// Move the map when a searched location is selected
function MapCenterUpdater({ position }) {
  const map = useMap();

  useEffect(() => {
    if (
      position &&
      Number.isFinite(position.latitude) &&
      Number.isFinite(position.longitude)
    ) {
      map.flyTo(
        [position.latitude, position.longitude],
        11,
        { duration: 1.2 }
      );
    }
  }, [position, map]);

  return null;
}

export default function WeatherLocationMap({
  position,
  onLocationSelect,
}) {
  const defaultPosition = [20.5937, 78.9629];

  const mapPosition =
    position &&
    Number.isFinite(position.latitude) &&
    Number.isFinite(position.longitude)
      ? [position.latitude, position.longitude]
      : defaultPosition;

  return (
    <div
      className="weather-location-map"
      style={{
        width: "100%",
        height: "400px",
        borderRadius: "14px",
        overflow: "hidden",
        position: "relative",
        zIndex: 1,
      }}
    >
      <MapContainer
        center={mapPosition}
        zoom={5}
        scrollWheelZoom={true}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickHandler onLocationSelect={onLocationSelect} />

        <MapCenterUpdater position={position} />

        {position &&
          Number.isFinite(position.latitude) &&
          Number.isFinite(position.longitude) && (
            <Marker
              position={[
                position.latitude,
                position.longitude,
              ]}
              icon={locationIcon}
            />
          )}
      </MapContainer>
    </div>
  );
}
