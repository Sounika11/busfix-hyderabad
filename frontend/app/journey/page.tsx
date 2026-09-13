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

  // The backend now groups trips by bus route number.
  // These fields support the grouped response.
  next_departure?: string;
  upcoming_departures?: string[];

  // Kept for compatibility with older frontend/backend naming.
  scheduled_departures?: string[];

  // Kept for compatibility with older backend responses.
  trip_id?: string;
  direction_id?: string;
  origin_stop_name?: string;
  destination_stop_name?: string;
  origin_departure?: string;
  destination_arrival?: string;
};

type AlternativeJourney = {
  journey_type: "BUS_BUS" | "BUS_WALK_BUS";

  first_route_id: string;
  first_route_short_name: string;
  first_trip_id: string;
  first_direction_id: string;

  origin_stop_id: string;
  origin_stop_name: string;
  first_departure_time: string;

  first_transfer_stop_id: string;
  first_transfer_stop_name: string;
  first_arrival_time: string;

  walk_distance_km: number;
  walk_minutes: number;

  second_transfer_stop_id: string;
  second_transfer_stop_name: string;
  second_departure_time: string;

  second_route_id: string;
  second_route_short_name: string;
  second_trip_id: string;
  second_direction_id: string;

  destination_stop_id: string;
  destination_stop_name: string;
  destination_arrival_time: string;

  wait_after_walk_minutes: number;
  total_duration_minutes: number;
};

const API_BASE = "http://127.0.0.1:8000";

export default function JourneyPage() {
  const [origin, setOrigin] = useState<Stop | null>(null);
  const [destination, setDestination] = useState<Stop | null>(null);

  const [originQuery, setOriginQuery] = useState("");
  const [destinationQuery, setDestinationQuery] = useState("");

  const [nearbyStops, setNearbyStops] = useState<Stop[]>([]);

  const [routes, setRoutes] = useState<JourneyRoute[]>([]);
  const [alternativeJourneys, setAlternativeJourneys] = useState<
    AlternativeJourney[]
  >([]);

  const [loadingLocation, setLoadingLocation] = useState(false);
  const [loadingRoutes, setLoadingRoutes] = useState(false);

  const [error, setError] = useState("");

  /* ================================================= */
  /* USE CURRENT LOCATION */
  /* ================================================= */

  function useMyLocation() {
    setError("");
    setRoutes([]);
    setAlternativeJourneys([]);
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
            `${API_BASE}/stops/nearby?lat=${latitude}&lon=${longitude}`
          );

          if (!response.ok) {
            throw new Error("Failed to find nearby stops");
          }

          const data = await response.json();
          const stops: Stop[] = data.stops || [];

          if (stops.length === 0) {
            setOrigin(null);
            setNearbyStops([]);
            setError("No bus stops were found near your location.");
            return;
          }

          // Nearest stop is used as the starting point.
          // Other nearby stops are kept internally as possible
          // origin locations.
          setOrigin(stops[0]);
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
          "Location permission was denied. You can enter your starting location manually."
        );
        setLoadingLocation(false);
      }
    );
  }

  /* ================================================= */
  /* FIND MATCHING STOPS INTERNALLY */
  /* ================================================= */

  async function findMatchingStops(query: string): Promise<Stop[]> {
    const response = await fetch(
      `${API_BASE}/stops/search?q=${encodeURIComponent(query)}`
    );

    if (!response.ok) {
      throw new Error("Stop search failed");
    }

    const data = await response.json();

    return data.stops || [];
  }

  /* ================================================= */
  /* FIND JOURNEY */
  /* ================================================= */

  async function findBuses() {
    const from = originQuery.trim();
    const to = destinationQuery.trim();

    // A starting location can come from either manual input or GPS.
    if (!from && !origin) {
      setError("Enter your starting location or use your current location.");
      return;
    }

    if (!to) {
      setError("Enter your destination.");
      return;
    }

    setLoadingRoutes(true);
    setError("");
    setRoutes([]);
    setAlternativeJourneys([]);

    try {
      /*
       * -------------------------------------------------
       * STEP 1
       * Find ALL matching physical stops internally.
       *
       * GPS mode:
       *   Use all nearby stops already found around the user.
       *
       * Manual mode:
       *   Search all stops matching the typed place.
       *
       * The user never has to select a physical stop.
       * -------------------------------------------------
       */

      let originStops: Stop[] = [];

      if (origin) {
        originStops =
          nearbyStops.length > 0
            ? nearbyStops
            : [origin];
      } else {
        originStops = await findMatchingStops(from);
      }

      const destinationStops = await findMatchingStops(to);

      if (originStops.length === 0) {
        setError(
          from
            ? `No bus stop found for "${from}".`
            : "No nearby bus stop was found for your location."
        );
        return;
      }

      if (destinationStops.length === 0) {
        setError(`No bus stop found for "${to}".`);
        return;
      }

      /*
       * Keep the GPS-selected location when GPS is being used.
       * For manual search, keep the first matching stop internally
       * so the existing display/state continues to work.
       */
      if (!origin) {
        setOrigin(originStops[0]);
      }

      setDestination(destinationStops[0]);

      /*
       * -------------------------------------------------
       * STEP 2
       * Search DIRECT buses.
       *
       * ONE backend request.
       *
       * This is much faster than making one request for
       * every origin/destination stop combination.
       * -------------------------------------------------
       */

      const directParams = new URLSearchParams();

      originStops.forEach((stop) => {
        directParams.append("origin_stop_id", stop.stop_id);
      });

      destinationStops.forEach((stop) => {
        directParams.append(
          "destination_stop_id",
          stop.stop_id
        );
      });

      const directResponse = await fetch(
        `${API_BASE}/journey/direct?${directParams.toString()}`
      );

      if (!directResponse.ok) {
        throw new Error("Direct journey search failed");
      }

      const directData = await directResponse.json();

      /*
       * The backend returns one entry per bus route number.
       * Keep a frontend safety deduplication as well, so even
       * if an older/backend response contains multiple trips,
       * the passenger still sees one card per bus number.
       *
       * We also merge upcoming departure times from both the
       * current backend field (upcoming_departures) and the
       * older frontend-compatible field (scheduled_departures).
       */
      const routeMap = new Map<string, JourneyRoute>();

      for (const route of (directData.routes || []) as JourneyRoute[]) {
        const key = route.route_short_name.trim().toLowerCase();

        if (!key) continue;

        const existing = routeMap.get(key);

        if (!existing) {
          const times = new Set<string>();

          (route.upcoming_departures || []).forEach((time) => {
            if (time) times.add(time);
          });

          (route.scheduled_departures || []).forEach((time) => {
            if (time) times.add(time);
          });

          if (route.next_departure) {
            times.add(route.next_departure);
          }

          if (route.origin_departure) {
            times.add(route.origin_departure);
          }

          const sortedTimes = Array.from(times).sort();

          routeMap.set(key, {
            ...route,
            next_departure:
              sortedTimes[0] || route.next_departure,
            upcoming_departures: sortedTimes,
            scheduled_departures: sortedTimes,
          });

          continue;
        }

        const times = new Set<string>([
          ...(existing.upcoming_departures || []),
          ...(existing.scheduled_departures || []),
          ...(route.upcoming_departures || []),
          ...(route.scheduled_departures || []),
        ]);

        if (existing.next_departure) {
          times.add(existing.next_departure);
        }

        if (route.next_departure) {
          times.add(route.next_departure);
        }

        if (existing.origin_departure) {
          times.add(existing.origin_departure);
        }

        if (route.origin_departure) {
          times.add(route.origin_departure);
        }

        const sortedTimes = Array.from(times).sort();

        routeMap.set(key, {
          ...existing,
          next_departure:
            sortedTimes[0] ||
            existing.next_departure ||
            route.next_departure,
          upcoming_departures: sortedTimes,
          scheduled_departures: sortedTimes,
        });
      }

      const directRoutes = Array.from(routeMap.values());

      /*
       * IMPORTANT:
       * Sort direct bus cards by the NEXT scheduled departure,
       * not by route number.
       *
       * Example:
       * 589 → 15:10
       * 229 → 15:13
       * 227 → 15:18
       */
      directRoutes.sort((a, b) => {
        const timeA =
          a.next_departure ||
          a.upcoming_departures?.[0] ||
          a.scheduled_departures?.[0] ||
          a.origin_departure ||
          "99:99:99";

        const timeB =
          b.next_departure ||
          b.upcoming_departures?.[0] ||
          b.scheduled_departures?.[0] ||
          b.origin_departure ||
          "99:99:99";

        return timeA.localeCompare(timeB);
      });


      /*
       * -------------------------------------------------
       * STEP 3
       * DIRECT BUS FOUND
       *
       * Show ONLY direct buses.
       * Do NOT search alternatives.
       * -------------------------------------------------
       */

      if (directRoutes.length > 0) {
        setRoutes(directRoutes);
        return;
      }

      /*
       * -------------------------------------------------
       * STEP 4
       * NO DIRECT BUS
       *
       * Now search alternative journeys.
       * -------------------------------------------------
       */

      const alternativeParams = new URLSearchParams();

      originStops.forEach((stop) => {
        alternativeParams.append(
          "origin_stop_id",
          stop.stop_id
        );
      });

      destinationStops.forEach((stop) => {
        alternativeParams.append(
          "destination_stop_id",
          stop.stop_id
        );
      });

      const alternativeResponse = await fetch(
        `${API_BASE}/journey/alternative?${alternativeParams.toString()}`
      );

      if (!alternativeResponse.ok) {
        throw new Error("Alternative journey search failed");
      }

      const alternativeData = await alternativeResponse.json();

      const alternatives: AlternativeJourney[] =
        alternativeData.journeys || [];

      if (alternatives.length === 0) {
        setError(
          `No direct or alternative scheduled journey was found from "${from}" to "${to}".`
        );
        return;
      }

      setAlternativeJourneys(alternatives);
    } catch (err) {
      console.error(err);

      setError(
        "Unable to find journey options. Make sure FastAPI is running."
      );
    } finally {
      setLoadingRoutes(false);
    }
  }

  /* ================================================= */
  /* RESET ORIGIN */
  /* ================================================= */

  function changeOrigin() {
    setOrigin(null);
    setOriginQuery("");
    setNearbyStops([]);
    setRoutes([]);
    setAlternativeJourneys([]);
    setError("");
  }

  /* ================================================= */
  /* RESET DESTINATION */
  /* ================================================= */

  function changeDestination() {
    setDestination(null);
    setDestinationQuery("");
    setRoutes([]);
    setAlternativeJourneys([]);
    setError("");
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
              Enter your starting point and destination to find the
              best scheduled bus options.
            </p>


            {/* ================================================= */}
            {/* FROM */}
            {/* ================================================= */}

            <div className="mt-6">

              <label className="mb-2 block text-xs font-semibold text-slate-500">
                📍 From
              </label>

              {origin ? (

                <div className="flex items-center gap-3 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3">

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-base">
                    📍
                  </div>

                  <div className="min-w-0 flex-1">

                    <p className="truncate text-sm font-semibold text-teal-800">
                      {originQuery || origin.stop_name}
                    </p>

                    <p className="mt-0.5 text-[11px] text-teal-600">
                      Starting location
                    </p>

                  </div>

                  <button
                    onClick={changeOrigin}
                    className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-teal-700 transition hover:bg-white"
                  >
                    Change
                  </button>

                </div>

              ) : (

                <div className="relative">

                  <input
                    type="text"
                    value={originQuery}
                    onChange={(e) => {
                      const value = e.target.value;
                      setOriginQuery(value);
                      setError("");
                      setRoutes([]);
                      setAlternativeJourneys([]);

                      // Typing a new starting point switches back to manual mode.
                      if (value.trim()) {
                        setOrigin(null);
                        setNearbyStops([]);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        findBuses();
                      }
                    }}
                    placeholder="Search starting point"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-4 pr-14 text-sm outline-none transition focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100"
                  />

                  <button
                    type="button"
                    onClick={useMyLocation}
                    disabled={loadingLocation}
                    title="Use my current location"
                    className="absolute right-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-base transition hover:bg-teal-100 disabled:opacity-60"
                  >
                    {loadingLocation ? "…" : "📍"}
                  </button>

                  <p className="mt-2 text-[11px] text-slate-400">
                    Type a place or tap 📍 to use your current location
                  </p>

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

                  <div className="min-w-0">

                    <p className="text-sm font-semibold text-teal-800">
                      {destinationQuery || destination.stop_name}
                    </p>

                    <p className="mt-1 text-xs text-teal-600">
                      Destination
                    </p>

                  </div>

                  <button
                    onClick={changeDestination}
                    className="shrink-0 text-xs font-semibold text-teal-600"
                  >
                    Change
                  </button>

                </div>

              ) : (

                <input
                  type="text"
                  value={destinationQuery}
                  onChange={(e) => {
                    setDestinationQuery(e.target.value);
                    setError("");
                    setRoutes([]);
                    setAlternativeJourneys([]);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      findBuses();
                    }
                  }}
                  placeholder="Example: Secunderabad"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100"
                />

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
                : "Find Buses"}
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


        {/* ================================================= */}
        {/* DIRECT BUSES */}
        {/* ================================================= */}

        {routes.length > 0 && (

          <div>

            <div className="mb-4">

              <h3 className="text-base font-bold text-slate-800">
                Direct Buses
              </h3>

              <p className="text-xs text-slate-400">
                Direct scheduled buses from{" "}
                {originQuery || origin?.stop_name} to{" "}
                {destinationQuery || destination?.stop_name}
              </p>

            </div>


            <div className="space-y-3">

              {routes.map((route) => {

                const nextDeparture =
                  route.next_departure ||
                  route.scheduled_departures?.[0] ||
                  route.origin_departure ||
                  "Schedule available";

                const upcomingTimes = (
                  route.upcoming_departures ||
                  route.scheduled_departures ||
                  []
                )
                  .filter((time) => time !== nextDeparture)
                  .slice(0, 4);

                return (
                  <div
                    key={`${route.route_id}-${route.route_short_name}`}
                    className="rounded-2xl bg-white p-5 shadow-sm"
                  >

                    <div className="flex items-center gap-4">

                      <div className="flex h-12 min-w-16 items-center justify-center rounded-xl bg-teal-50 px-3 text-base font-bold text-teal-700">
                        {route.route_short_name}
                      </div>

                      <div className="min-w-0">

                        <p className="text-sm font-semibold text-slate-800">
                          {originQuery || origin?.stop_name}
                        </p>

                        <p className="text-xs text-slate-400">
                          ↓
                        </p>

                        <p className="text-sm font-semibold text-slate-800">
                          {destinationQuery || destination?.stop_name}
                        </p>

                      </div>

                    </div>


                    <div className="mt-4 border-t border-slate-100 pt-4">

                      <p className="text-[10px] uppercase tracking-wide text-slate-400">
                        Next scheduled bus
                      </p>

                      <p className="mt-1 text-lg font-bold text-teal-700">
                        {nextDeparture}
                      </p>

                    </div>


                    {upcomingTimes.length > 1 && (
                      <div className="mt-3">

                        <p className="text-[10px] uppercase tracking-wide text-slate-400">
                          Upcoming scheduled times
                        </p>

                        <div className="mt-2 flex flex-wrap gap-2">

                          {upcomingTimes.map((time) => (
                            <span
                              key={time}
                              className="rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600"
                            >
                              {time}
                            </span>
                          ))}

                        </div>

                      </div>
                    )}


                    <p className="mt-4 text-[11px] text-slate-400">
                      Scheduled route information · Actual arrival may differ.
                    </p>

                  </div>
                );
              })}

            </div>

          </div>

        )}


        {/* ================================================= */}
        {/* ALTERNATIVE JOURNEYS */}
        {/* ================================================= */}

        {alternativeJourneys.length > 0 && (

          <div>

            <div className="mb-4">

              <h3 className="text-base font-bold text-slate-800">
                Alternative Journeys
              </h3>

              <p className="text-xs text-slate-400">
                No direct bus was found. These options use buses with
                a possible walking transfer.
              </p>

            </div>


            <div className="space-y-3">

              {alternativeJourneys.map((journey, index) => (

                <div
                  key={`${journey.first_trip_id}-${journey.second_trip_id}-${index}`}
                  className="rounded-2xl bg-white p-5 shadow-sm"
                >

                  {/* Header */}

                  <div className="mb-4 flex items-center justify-between">

                    <p className="text-sm font-bold text-slate-800">
                      Option {index + 1}
                    </p>

                    <span className="rounded-full bg-teal-50 px-3 py-1 text-[10px] font-semibold text-teal-700">
                      {journey.journey_type === "BUS_WALK_BUS"
                        ? "BUS + WALK + BUS"
                        : "BUS + BUS"}
                    </span>

                  </div>


                  {/* First bus */}

                  <div className="rounded-xl border border-slate-200 p-4">

                    <div className="flex items-center gap-3">

                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50">
                        🚌
                      </div>

                      <div>

                        <p className="text-[10px] uppercase tracking-wide text-slate-400">
                          First bus
                        </p>

                        <p className="text-lg font-bold text-teal-700">
                          {journey.first_route_short_name}
                        </p>

                      </div>

                    </div>


                    <div className="mt-4 grid grid-cols-2 gap-3">

                      <div>

                        <p className="text-[10px] uppercase tracking-wide text-slate-400">
                          Board
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {journey.first_departure_time}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {journey.origin_stop_name}
                        </p>

                      </div>

                      <div>

                        <p className="text-[10px] uppercase tracking-wide text-slate-400">
                          Get down
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {journey.first_arrival_time}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {journey.first_transfer_stop_name}
                        </p>

                      </div>

                    </div>

                  </div>


                  {/* Transfer */}

                  <div className="flex items-center gap-3 px-4 py-3">

                    <div className="text-lg">
                      {journey.journey_type === "BUS_WALK_BUS"
                        ? "🚶"
                        : "🔄"}
                    </div>

                    <div>

                      {journey.journey_type === "BUS_WALK_BUS" ? (

                        <>
                          <p className="text-xs font-semibold text-slate-600">
                            Walk to the next stop
                          </p>

                          <p className="mt-1 text-[11px] text-slate-400">
                            {journey.walk_distance_km.toFixed(2)} km ·{" "}
                            {journey.walk_minutes} min
                          </p>

                          <p className="mt-1 text-[11px] text-slate-400">
                            Next stop:{" "}
                            {journey.second_transfer_stop_name}
                          </p>
                        </>

                      ) : (

                        <p className="text-xs font-semibold text-slate-600">
                          Transfer at{" "}
                          {journey.first_transfer_stop_name}
                        </p>

                      )}

                      {journey.wait_after_walk_minutes > 0 && (
                        <p className="mt-1 text-[11px] text-slate-400">
                          Wait approximately{" "}
                          {journey.wait_after_walk_minutes} min
                        </p>
                      )}

                    </div>

                  </div>


                  {/* Second bus */}

                  <div className="rounded-xl border border-slate-200 p-4">

                    <div className="flex items-center gap-3">

                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50">
                        🚌
                      </div>

                      <div>

                        <p className="text-[10px] uppercase tracking-wide text-slate-400">
                          Second bus
                        </p>

                        <p className="text-lg font-bold text-teal-700">
                          {journey.second_route_short_name}
                        </p>

                      </div>

                    </div>


                    <div className="mt-4 grid grid-cols-2 gap-3">

                      <div>

                        <p className="text-[10px] uppercase tracking-wide text-slate-400">
                          Board
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {journey.second_departure_time}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {journey.second_transfer_stop_name}
                        </p>

                      </div>

                      <div>

                        <p className="text-[10px] uppercase tracking-wide text-slate-400">
                          Arrive
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {journey.destination_arrival_time}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {journey.destination_stop_name}
                        </p>

                      </div>

                    </div>

                  </div>


                  {/* Total */}

                  <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 p-3">

                    <span className="text-xs text-slate-500">
                      Total scheduled journey
                    </span>

                    <span className="text-sm font-bold text-slate-700">
                      {journey.total_duration_minutes} min
                    </span>

                  </div>

                </div>

              ))}

            </div>

          </div>

        )}


        {/* ================================================= */}
        {/* EMPTY STATE */}
        {/* ================================================= */}

        {!loadingRoutes &&
          routes.length === 0 &&
          alternativeJourneys.length === 0 &&
          !error && (

            <div className="rounded-2xl bg-white p-8 text-center shadow-sm">

              <div className="text-3xl">
                🚌
              </div>

              <p className="mt-3 text-sm font-medium text-slate-600">
                Enter your starting point and destination.
              </p>

              <p className="mt-1 text-xs text-slate-400">
                We&apos;ll find direct buses first and alternatives if needed.
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