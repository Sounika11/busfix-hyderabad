"use client";

import { useState } from "react";

type Stop = {
  stop_id: string;
  stop_name: string;
  stop_lat: string;
  stop_lon: string;
  stop_desc?: string;
  distance_km?: number;
  routes?: string[];
};

type JourneyRoute = {
  route_id: string;
  route_short_name: string;
  trip_id: string;
  direction_id: string;
  origin_departure: string;
  destination_arrival: string;
};

export default function JourneyPage() {
  const [origin, setOrigin] = useState<Stop | null>(null);
  const [destination, setDestination] = useState<Stop | null>(null);

  const [originQuery, setOriginQuery] = useState("");
  const [originResults, setOriginResults] = useState<Stop[]>([]);
  const [originCandidates, setOriginCandidates] = useState<Stop[]>([]);

  const [destinationQuery, setDestinationQuery] = useState("");
  const [destinationResults, setDestinationResults] = useState<Stop[]>([]);
  const [destinationCandidates, setDestinationCandidates] = useState<Stop[]>(
    []
  );

  const [nearbyStops, setNearbyStops] = useState<Stop[]>([]);

  const [routes, setRoutes] = useState<JourneyRoute[]>([]);

  const [loadingLocation, setLoadingLocation] = useState(false);
  const [loadingOrigin, setLoadingOrigin] = useState(false);
  const [loadingDestination, setLoadingDestination] = useState(false);
  const [loadingRoutes, setLoadingRoutes] = useState(false);

  const [error, setError] = useState("");

  /* ================================================= */
  /* USE CURRENT LOCATION */
  /* ================================================= */

  function useMyLocation() {
    setError("");
    setRoutes([]);
    setLoadingLocation(true);

    if (!navigator.geolocation) {
      setError("Location services are not supported by this browser.");
      setLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;

          const response = await fetch(
            `http://127.0.0.1:8000/stops/nearby?lat=${latitude}&lon=${longitude}`
          );

          if (!response.ok) {
            throw new Error("Failed to find nearby stops");
          }

          const data = await response.json();
          const stops: Stop[] = data.stops || [];

          if (stops.length === 0) {
            setOrigin(null);
            setOriginCandidates([]);
            setNearbyStops([]);
            setError("No bus stops were found near your location.");
            return;
          }

          setOrigin(stops[0]);
          setOriginCandidates(stops);
          setNearbyStops(stops);
        } catch {
          setError(
            "Unable to find nearby bus stops. Make sure FastAPI is running."
          );
        } finally {
          setLoadingLocation(false);
        }
      },
      () => {
        setError(
          "Location permission was denied. You can select your starting stop manually."
        );
        setLoadingLocation(false);
      }
    );
  }

  /* ================================================= */
  /* SEARCH ORIGIN STOP */
  /* ================================================= */

  async function searchOrigin() {
    const query = originQuery.trim();

    if (!query) {
      setError("Enter your starting bus stop.");
      return;
    }

    setLoadingOrigin(true);
    setError("");
    setRoutes([]);
    setOriginResults([]);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/stops/search?q=${encodeURIComponent(query)}`
      );

      if (!response.ok) {
        throw new Error("Failed to search origin stops");
      }

      const data = await response.json();
      const stops: Stop[] = data.stops || [];

      if (stops.length === 0) {
        setOrigin(null);
        setOriginCandidates([]);
        setError(`No bus stop found for "${query}".`);
        return;
      }

      /*
       * One matching physical stop:
       * automatically select it.
       */
      if (stops.length === 1) {
        setOrigin(stops[0]);
        setOriginCandidates(stops);
        setOriginResults([]);
        setOriginQuery("");
        setNearbyStops([]);
        setRoutes([]);
        setError("");
        return;
      }

      /*
       * Multiple physical stops:
       * show them so the user can choose the correct one.
       */
      setOriginCandidates(stops);
      setOriginResults(stops);
    } catch {
      setError(
        "Unable to search starting stops. Make sure FastAPI is running."
      );
    } finally {
      setLoadingOrigin(false);
    }
  }

  /* ================================================= */
  /* SEARCH DESTINATION STOP */
  /* ================================================= */

  async function searchDestination() {
    const query = destinationQuery.trim();

    if (!query) {
      setError("Enter your destination bus stop.");
      return;
    }

    setLoadingDestination(true);
    setError("");
    setRoutes([]);
    setDestinationResults([]);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/stops/search?q=${encodeURIComponent(query)}`
      );

      if (!response.ok) {
        throw new Error("Failed to search destination stops");
      }

      const data = await response.json();
      const stops: Stop[] = data.stops || [];

      if (stops.length === 0) {
        setDestination(null);
        setDestinationCandidates([]);
        setError(`No bus stop found for "${query}".`);
        return;
      }

      /*
       * One matching physical stop:
       * automatically select it.
       */
      if (stops.length === 1) {
        setDestination(stops[0]);
        setDestinationCandidates(stops);
        setDestinationResults([]);
        setDestinationQuery("");
        setRoutes([]);
        setError("");
        return;
      }

      /*
       * Multiple physical stops:
       * show choices.
       */
      setDestinationCandidates(stops);
      setDestinationResults(stops);
    } catch {
      setError(
        "Unable to search destination stops. Make sure FastAPI is running."
      );
    } finally {
      setLoadingDestination(false);
    }
  }

  /* ================================================= */
  /* FIND DIRECT BUSES */
  /* ================================================= */

  async function findBuses() {
    if (!origin) {
      setError("Please select your starting stop.");
      return;
    }

    if (!destination) {
      setError("Please select your destination stop.");
      return;
    }

    if (origin.stop_id === destination.stop_id) {
      setError("Starting stop and destination cannot be the same.");
      return;
    }

    setLoadingRoutes(true);
    setError("");
    setRoutes([]);

    try {
      /*
       * Send all relevant physical stop IDs to the backend
       * in ONE request.
       *
       * The backend handles the combinations efficiently.
       */
      const originStops =
        originCandidates.length > 0 ? originCandidates : [origin];

      const destinationStops =
        destinationCandidates.length > 0
          ? destinationCandidates
          : [destination];

      const params = new URLSearchParams();

      originStops.forEach((stop) => {
        params.append("origin_stop_id", stop.stop_id);
      });

      destinationStops.forEach((stop) => {
        params.append("destination_stop_id", stop.stop_id);
      });

      const response = await fetch(
        `http://127.0.0.1:8000/journey/direct?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Failed to find routes");
      }

      const data = await response.json();

      const foundRoutes: JourneyRoute[] = data.routes || [];

      if (foundRoutes.length === 0) {
        setError(
          "No direct scheduled bus was found between these locations. Try another nearby stop or destination."
        );
        return;
      }

      /*
       * Final frontend deduplication.
       *
       * A single GTFS trip should appear only once.
       */
      const uniqueRoutes: JourneyRoute[] = [];
      const seenTrips = new Set<string>();

      for (const route of foundRoutes) {
        const key = `${route.route_id}-${route.trip_id}`;

        if (!seenTrips.has(key)) {
          seenTrips.add(key);
          uniqueRoutes.push(route);
        }
      }

      uniqueRoutes.sort((a, b) => {
        const routeComparison = a.route_short_name.localeCompare(
          b.route_short_name,
          undefined,
          { numeric: true }
        );

        if (routeComparison !== 0) {
          return routeComparison;
        }

        return a.origin_departure.localeCompare(b.origin_departure);
      });

      setRoutes(uniqueRoutes);
    } catch {
      setError(
        "Unable to find journey options. Make sure FastAPI is running."
      );
    } finally {
      setLoadingRoutes(false);
    }
  }

  /* ================================================= */
  /* STOP DISPLAY HELPERS */
  /* ================================================= */

  function getStopRoutes(stop: Stop) {
    if (!stop.routes || stop.routes.length === 0) {
      return "Route information unavailable";
    }

    const visibleRoutes = stop.routes.slice(0, 8);

    return visibleRoutes.join(", ");
  }

  function getStopContext(stop: Stop) {
    if (stop.stop_desc && stop.stop_desc.trim()) {
      return stop.stop_desc.trim();
    }

    return "Physical stop location";
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-800">

      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <header className="sticky top-0 z-50 bg-teal-500 text-white shadow-md">

        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl">
              🚌
            </div>

            <div>
              <h1 className="text-lg font-bold">
                BusFix
              </h1>

              <p className="text-[10px] uppercase tracking-wide text-teal-50">
                Hyderabad
              </p>
            </div>

          </div>

          <button
            onClick={() => {
              window.location.href = "/";
            }}
            className="rounded-full px-4 py-2 text-sm font-medium transition hover:bg-teal-600"
          >
            ← Home
          </button>

        </div>

      </header>


      {/* ================================================= */}
      {/* JOURNEY PLANNER */}
      {/* ================================================= */}

      <section className="bg-teal-500 pb-8">

        <div className="mx-auto max-w-6xl px-4">

          <div className="rounded-2xl bg-white p-5 shadow-lg">

            <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">
              Hyderabad Public Transport
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-800">
              Plan Your Journey
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Find scheduled direct buses between your starting point and
              destination.
            </p>


            {/* ================================================= */}
            {/* FROM */}
            {/* ================================================= */}

            <div className="mt-6">

              <label className="mb-2 block text-xs font-semibold text-slate-500">
                📍 From
              </label>


              {origin ? (

                <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">

                  <div className="flex items-center justify-between gap-4">

                    <div className="min-w-0">

                      <p className="text-sm font-semibold text-teal-800">
                        {origin.stop_name}
                      </p>

                      {origin.distance_km !== undefined && (
                        <p className="mt-1 text-xs text-teal-600">
                          Approximately {origin.distance_km} km away
                        </p>
                      )}

                    </div>

                    <button
                      onClick={() => {
                        setOrigin(null);
                        setOriginResults([]);
                        setOriginCandidates([]);
                        setNearbyStops([]);
                        setOriginQuery("");
                        setRoutes([]);
                        setError("");
                      }}
                      className="shrink-0 text-xs font-semibold text-teal-600"
                    >
                      Change
                    </button>

                  </div>

                </div>

              ) : (

                <div className="space-y-3">

                  {/* GPS */}

                  <button
                    onClick={useMyLocation}
                    disabled={loadingLocation}
                    className="w-full rounded-xl border border-teal-200 bg-teal-50 p-4 text-left transition hover:border-teal-300 hover:bg-teal-100 disabled:opacity-60"
                  >

                    <div className="flex items-center gap-3">

                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white">
                        📍
                      </div>

                      <div>

                        <p className="text-sm font-semibold text-teal-800">
                          {loadingLocation
                            ? "Finding nearby stops..."
                            : "Use my current location"}
                        </p>

                        <p className="mt-1 text-xs text-teal-600">
                          We&apos;ll find the nearest bus stop
                        </p>

                      </div>

                    </div>

                  </button>


                  {/* OR */}

                  <div className="flex items-center gap-3">

                    <div className="h-px flex-1 bg-slate-200" />

                    <span className="text-xs text-slate-400">
                      OR
                    </span>

                    <div className="h-px flex-1 bg-slate-200" />

                  </div>


                  {/* Manual Selection */}

                  <div>

                    <p className="mb-2 text-xs font-semibold text-slate-500">
                      Select your starting stop manually
                    </p>

                    <div className="flex gap-2">

                      <input
                        type="text"
                        value={originQuery}
                        onChange={(e) => {
                          setOriginQuery(e.target.value);
                          setError("");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            searchOrigin();
                          }
                        }}
                        placeholder="Example: Secunderabad"
                        className="h-12 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100"
                      />

                      <button
                        onClick={searchOrigin}
                        disabled={loadingOrigin}
                        className="h-12 rounded-xl bg-teal-500 px-5 text-sm font-semibold text-white transition hover:bg-teal-600 disabled:opacity-60"
                      >
                        {loadingOrigin ? "..." : "Search"}
                      </button>

                    </div>


                    {/* Origin Results */}

                    {originResults.length > 0 && (

                      <div className="mt-3">

                        <div className="mb-2 rounded-lg bg-slate-50 px-3 py-2">
                          <p className="text-xs font-semibold text-slate-600">
                            We found multiple physical stops with this name.
                          </p>

                          <p className="mt-1 text-[11px] text-slate-400">
                            Choose the stop using the route or location
                            information below.
                          </p>
                        </div>

                        <div className="space-y-2">

                          {originResults.map((stop) => (

                            <button
                              key={`origin-${stop.stop_id}`}
                              onClick={() => {
                                setOrigin(stop);
                                setOriginCandidates(originResults);
                                setOriginResults([]);
                                setNearbyStops([]);
                                setOriginQuery("");
                                setError("");
                                setRoutes([]);
                              }}
                              className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-teal-300 hover:bg-teal-50"
                            >

                              <div className="flex items-start gap-3">

                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-50">
                                  📍
                                </div>

                                <div className="min-w-0">

                                  <p className="text-sm font-semibold text-slate-700">
                                    {stop.stop_name}
                                  </p>

                                  <p className="mt-1 text-xs text-slate-500">
                                    Routes: {getStopRoutes(stop)}
                                  </p>

                                  <p className="mt-1 text-xs text-slate-400">
                                    {getStopContext(stop)}
                                  </p>

                                </div>

                              </div>

                            </button>

                          ))}

                        </div>

                      </div>

                    )}

                  </div>

                </div>

              )}


              {/* ================================================= */}
              {/* NEARBY GPS ALTERNATIVES */}
              {/* ================================================= */}

              {nearbyStops.length > 1 && origin && (

                <div className="mt-3 rounded-xl bg-slate-50 p-3">

                  <div className="mb-2 flex items-center justify-between">

                    <p className="text-xs font-semibold text-slate-500">
                      Nearby stops
                    </p>

                    <button
                      onClick={() => {
                        setNearbyStops([]);
                      }}
                      className="text-xs font-semibold text-slate-400 hover:text-slate-600"
                    >
                      Hide
                    </button>

                  </div>

                  <div className="space-y-1">

                    {nearbyStops
                      .filter((stop) => stop.stop_id !== origin.stop_id)
                      .map((stop) => (

                        <button
                          key={`nearby-${stop.stop_id}`}
                          onClick={() => {
                            setOrigin(stop);
                            setOriginCandidates(nearbyStops);
                            setNearbyStops([]);
                            setRoutes([]);
                            setError("");
                          }}
                          className="flex w-full items-center justify-between rounded-lg p-2 text-left text-xs hover:bg-white"
                        >

                          <span className="min-w-0 pr-3">
                            {stop.stop_name}
                          </span>

                          <span className="shrink-0 text-slate-400">
                            {stop.distance_km} km
                          </span>

                        </button>

                      ))}

                  </div>

                </div>

              )}

            </div>


            {/* ================================================= */}
            {/* TO */}
            {/* ================================================= */}

            <div className="mt-6">

              <label className="mb-2 block text-xs font-semibold text-slate-500">
                🏁 To
              </label>


              {destination ? (

                <div className="flex items-center justify-between gap-4 rounded-xl border border-teal-200 bg-teal-50 p-4">

                  <p className="min-w-0 text-sm font-semibold text-teal-800">
                    {destination.stop_name}
                  </p>

                  <button
                    onClick={() => {
                      setDestination(null);
                      setDestinationResults([]);
                      setDestinationCandidates([]);
                      setDestinationQuery("");
                      setRoutes([]);
                      setError("");
                    }}
                    className="shrink-0 text-xs font-semibold text-teal-600"
                  >
                    Change
                  </button>

                </div>

              ) : (

                <div>

                  <div className="flex gap-2">

                    <input
                      type="text"
                      value={destinationQuery}
                      onChange={(e) => {
                        setDestinationQuery(e.target.value);
                        setError("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          searchDestination();
                        }
                      }}
                      placeholder="Where do you want to go?"
                      className="h-12 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100"
                    />

                    <button
                      onClick={searchDestination}
                      disabled={loadingDestination}
                      className="h-12 rounded-xl bg-teal-500 px-5 text-sm font-semibold text-white transition hover:bg-teal-600 disabled:opacity-60"
                    >
                      {loadingDestination ? "..." : "Search"}
                    </button>

                  </div>


                  {/* Destination Results */}

                  {destinationResults.length > 0 && (

                    <div className="mt-3">

                      <div className="mb-2 rounded-lg bg-slate-50 px-3 py-2">
                        <p className="text-xs font-semibold text-slate-600">
                          We found multiple physical stops with this name.
                        </p>

                        <p className="mt-1 text-[11px] text-slate-400">
                          Choose the stop using the route or location
                          information below.
                        </p>
                      </div>

                      <div className="space-y-2">

                        {destinationResults.map((stop) => (

                          <button
                            key={`destination-${stop.stop_id}`}
                            onClick={() => {
                              setDestination(stop);
                              setDestinationCandidates(destinationResults);
                              setDestinationResults([]);
                              setDestinationQuery("");
                              setError("");
                              setRoutes([]);
                            }}
                            className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-teal-300 hover:bg-teal-50"
                          >

                            <div className="flex items-start gap-3">

                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-50">
                                📍
                              </div>

                              <div className="min-w-0">

                                <p className="text-sm font-semibold text-slate-700">
                                  {stop.stop_name}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  Routes: {getStopRoutes(stop)}
                                </p>

                                <p className="mt-1 text-xs text-slate-400">
                                  {getStopContext(stop)}
                                </p>

                              </div>

                            </div>

                          </button>

                        ))}

                      </div>

                    </div>

                  )}

                </div>

              )}

            </div>


            {/* ================================================= */}
            {/* FIND BUSES */}
            {/* ================================================= */}

            <button
              onClick={findBuses}
              disabled={loadingRoutes}
              className="mt-6 h-12 w-full rounded-xl bg-slate-900 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {loadingRoutes
                ? "Finding buses..."
                : "Find Direct Buses"}
            </button>


            {/* ================================================= */}
            {/* ERROR */}
            {/* ================================================= */}

            {error && (

              <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-4">

                <p className="text-sm font-medium text-red-600">
                  {error}
                </p>

              </div>

            )}

          </div>

        </div>

      </section>


      {/* ================================================= */}
      {/* RESULTS */}
      {/* ================================================= */}

      <section className="mx-auto max-w-6xl px-4 py-7">

        {routes.length > 0 && (

          <div>

            <div className="mb-4">

              <h3 className="text-base font-bold text-slate-800">
                Direct Buses
              </h3>

              <p className="text-xs text-slate-400">
                {routes.length} scheduled trip
                {routes.length === 1 ? "" : "s"} found
              </p>

            </div>


            <div className="space-y-3">

              {routes.map((route) => (

                <div
                  key={`route-${route.route_id}-${route.trip_id}`}
                  className="rounded-2xl bg-white p-5 shadow-sm"
                >

                  <div className="flex items-center gap-4">

                    <div className="flex h-12 min-w-16 items-center justify-center rounded-xl bg-teal-50 px-2 text-sm font-bold text-teal-700">
                      {route.route_short_name}
                    </div>

                    <div>

                      <p className="text-sm font-semibold text-slate-800">
                        {origin?.stop_name}
                      </p>

                      <p className="text-xs text-slate-400">
                        ↓
                      </p>

                      <p className="text-sm font-semibold text-slate-800">
                        {destination?.stop_name}
                      </p>

                    </div>

                  </div>


                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">

                    <div>

                      <p className="text-[10px] uppercase tracking-wide text-slate-400">
                        Scheduled departure
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-700">
                        {route.origin_departure}
                      </p>

                    </div>

                    <div>

                      <p className="text-[10px] uppercase tracking-wide text-slate-400">
                        Scheduled arrival
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-700">
                        {route.destination_arrival}
                      </p>

                    </div>

                  </div>


                  <p className="mt-4 text-[11px] text-slate-400">
                    Scheduled route information · Actual arrival may differ.
                  </p>

                </div>

              ))}

            </div>

          </div>

        )}


        {!loadingRoutes &&
          routes.length === 0 &&
          !error && (

            <div className="rounded-2xl bg-white p-8 text-center shadow-sm">

              <div className="text-3xl">
                🚌
              </div>

              <p className="mt-3 text-sm font-medium text-slate-600">
                Select your starting point and destination.
              </p>

              <p className="mt-1 text-xs text-slate-400">
                We&apos;ll find scheduled direct buses between them.
              </p>

            </div>

          )}

      </section>


      {/* ================================================= */}
      {/* FOOTER */}
      {/* ================================================= */}

      <footer className="border-t border-slate-200 bg-white">

        <div className="mx-auto max-w-6xl px-4 py-5 text-center">

          <p className="text-xs text-slate-400">
            BusFix Hyderabad
          </p>

          <p className="mt-1 text-[10px] text-slate-400">
            Independent student project · Not affiliated with TGSRTC
          </p>

        </div>

      </footer>

    </main>
  );
}