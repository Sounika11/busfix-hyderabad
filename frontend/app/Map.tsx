"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
} from "react-leaflet";

import L from "leaflet";

import "leaflet/dist/leaflet.css";

type MapStop = {
  stop_sequence: string;
  stop_name: string;
  stop_lat: string;
  stop_lon: string;
};

const busIcon = new L.Icon({
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function RouteMap({
  stops,
}: {
  stops: MapStop[];
}) {
  if (stops.length === 0) {
    return (
      <div className="rounded-xl bg-slate-100 p-8 text-center text-sm text-slate-500">
        No map data available for this route.
      </div>
    );
  }

  const coordinates = stops.map((stop) => [
    Number(stop.stop_lat),
    Number(stop.stop_lon),
  ] as [number, number]);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <MapContainer
  bounds={coordinates}
  scrollWheelZoom={true}
  className="h-[500px] w-full"
>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Polyline positions={coordinates} />

        {stops.map((stop, index) => (
          <Marker
            key={`${stop.stop_sequence}-${index}`}
            position={[
              Number(stop.stop_lat),
              Number(stop.stop_lon),
            ]}
            icon={busIcon}
          >
            <Popup>
              <div>
                <strong>
                  {stop.stop_sequence}. {stop.stop_name}
                </strong>

                <br />

                <span>
                  📍 {stop.stop_lat}, {stop.stop_lon}
                </span>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}