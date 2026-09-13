"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const RouteMap = dynamic(() => import("../../Map"), {
  ssr: false,
});

type Stop = {
  direction_id: string;
  stop_sequence: string;
  stop_id: string;
  stop_name: string;
  stop_lat: string;
  stop_lon: string;
  arrival_time: string;
  departure_time: string;
};

type Trip = {
  trip_id: string;
  service_id: string;
  direction_id: string;
  trip_short_name: string;
  route_description: string;
};

export default function RoutePage() {
  const params = useParams();
  const routeId = params.routeId as string;

  const [stops, setStops] = useState<Stop[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedDirection, setSelectedDirection] = useState<string | null>(
    null
  );

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [stopsLoading, setStopsLoading] = useState(false);
  const [error, setError] = useState("");

  // Load the available directions for this route.
  useEffect(() => {
    async function fetchRouteTrips() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `http://127.0.0.1:8000/routes/${encodeURIComponent(
            routeId
          )}/trips`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch route trips");
        }

        const data = await response.json();
        const routeTrips: Trip[] = data.trips || [];

        // Keep one representative trip per GTFS direction.
        const uniqueDirections = Array.from(
          new Map(
            routeTrips.map((item) => [item.direction_id, item])
          ).values()
        );

        setTrips(uniqueDirections);

        if (uniqueDirections.length > 0) {
          setSelectedDirection(uniqueDirections[0].direction_id);
          setTrip(uniqueDirections[0]);
        } else {
          setSelectedDirection(null);
          setTrip(null);
        }
      } catch {
        setError(
          "Unable to load route information. Make sure FastAPI is running."
        );
      } finally {
        setLoading(false);
      }
    }

    fetchRouteTrips();
  }, [routeId]);

  // Load stops only for the selected direction.
  useEffect(() => {
    if (selectedDirection === null) return;

    async function fetchDirectionStops() {
      try {
        setStopsLoading(true);
        setError("");

        const response = await fetch(
          `http://127.0.0.1:8000/routes/${encodeURIComponent(
            routeId
          )}/stops?direction_id=${encodeURIComponent(
            selectedDirection
          )}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch route stops");
        }

        const data = await response.json();
        setStops(data.stops || []);
      } catch {
        setStops([]);
        setError(
          "Unable to load stops for this direction. Make sure FastAPI is running."
        );
      } finally {
        setStopsLoading(false);
      }
    }

    fetchDirectionStops();
  }, [routeId, selectedDirection]);

  function selectDirection(directionId: string) {
    const selectedTrip =
      trips.find((item) => item.direction_id === directionId) || null;

    setSelectedDirection(directionId);
    setTrip(selectedTrip);
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-2xl">
              🚌
            </div>

            <div>
              <h1 className="text-xl font-bold tracking-tight">
                BusFix Hyderabad
              </h1>
              <p className="text-xs text-slate-500">
                Public transport information reliability
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              window.location.href = "/";
            }}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            ← Back
          </button>
        </div>
      </header>

      <section className="bg-blue-600">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-100">
            TGSRTC Route
          </p>

          <h2 className="mt-2 text-4xl font-bold text-white">
            🚌 {routeId}
          </h2>

          {trip && (
            <p className="mt-3 text-lg font-medium text-blue-100">
              {trip.route_description}
            </p>
          )}

          <p className="mt-2 text-sm text-blue-200">
            Scheduled route information from the TGSRTC GTFS dataset.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-slate-500">Loading route information...</p>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-6">
            <p className="font-medium text-red-700">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Direction selector */}
            {trips.length > 1 && (
              <div className="mb-8">
                <div className="mb-3">
                  <h3 className="text-lg font-bold">Route direction</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Each direction is a separate scheduled journey. The route
                    ends at the final stop shown below.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {trips.map((directionTrip) => {
                    const active =
                      selectedDirection === directionTrip.direction_id;

                    return (
                      <button
                        key={directionTrip.direction_id}
                        onClick={() =>
                          selectDirection(directionTrip.direction_id)
                        }
                        className={`rounded-xl border px-5 py-3 text-left transition ${
                          active
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide opacity-75">
                          Direction {directionTrip.direction_id}
                        </p>

                        <p className="mt-1 text-sm font-bold">
                          {directionTrip.route_description ||
                            `Direction ${directionTrip.direction_id}`}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              <InfoCard label="Route" value={routeId} />

              <InfoCard
                label="Direction"
                value={trip ? trip.direction_id : "N/A"}
              />

              <InfoCard
                label="Scheduled Stops"
                value={
                  stopsLoading ? "..." : stops.length.toString()
                }
              />
            </div>

            {trip && (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-xl font-bold">Route Journey</h3>

                <p className="mt-1 text-sm text-slate-500">
                  Information from the scheduled GTFS trip for the selected
                  direction.
                </p>

                <div className="mt-5 rounded-xl bg-blue-50 p-5">
                  <p className="text-sm font-semibold text-blue-700">
                    🚌 {routeId}
                  </p>

                  <p className="mt-2 text-lg font-bold text-slate-900">
                    {trip.route_description}
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    Service: {trip.service_id}
                  </p>
                </div>
              </div>
            )}

            {/* Route Map */}
            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6">
                <h3 className="text-xl font-bold">Route Map</h3>

                <p className="mt-1 text-sm text-slate-500">
                  The map shows only the selected direction. Information
                  health markers are based on passenger observations.
                </p>
              </div>

              {stopsLoading ? (
                <div className="flex h-[500px] items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-500">
                  Loading direction...
                </div>
              ) : (
                <RouteMap stops={stops} />
              )}
            </div>

            {/* Stops */}
            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6">
                <h3 className="text-xl font-bold">Scheduled Stops</h3>

                <p className="mt-1 text-sm text-slate-500">
                  Stops and scheduled arrival times for the selected direction.
                </p>
              </div>

              {stopsLoading ? (
                <p className="text-sm text-slate-500">
                  Loading stops...
                </p>
              ) : stops.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No scheduled stops found for this direction.
                </p>
              ) : (
                <div className="space-y-3">
                  {stops.map((stop, index) => (
                    <div
                      key={`${stop.stop_id}-${stop.stop_sequence}-${index}`}
                      className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                        {stop.stop_sequence}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900">
                          {stop.stop_name}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          📍 {stop.stop_lat}, {stop.stop_lon}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-700">
                          {stop.arrival_time}
                        </p>

                        <p className="text-xs text-slate-400">
                          scheduled arrival
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-sm font-semibold text-amber-800">
                ⚠️ Information reliability note
              </p>

              <p className="mt-1 text-sm leading-6 text-amber-700">
                These are scheduled transport details from the GTFS dataset.
                They represent planned information and should not be treated
                as proof of the bus&apos;s actual arrival time.
              </p>
            </div>
          </>
        )}
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-6 text-center text-sm text-slate-500">
          BusFix Hyderabad · Independent student project · Not affiliated with
          TGSRTC
        </div>
      </footer>
    </main>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
