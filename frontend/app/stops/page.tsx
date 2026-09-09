"use client";

import { useState } from "react";

type Stop = {
  stop_id: string;
  stop_name: string;
  stop_lat: string;
  stop_lon: string;
  routes: string[];
};

export default function StopsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch() {
    const query = searchQuery.trim();

    if (!query) {
      setError("Please enter a bus stop name.");
      setStops([]);
      return;
    }

    setLoading(true);
    setError("");
    setStops([]);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/stops/search?q=${encodeURIComponent(query)}`
      );

      if (!response.ok) {
        throw new Error("Failed to search stops");
      }

      const data = await response.json();

      if (data.count === 0) {
        setError(`No bus stop found for "${query}".`);
      } else {
        setStops(data.stops);
      }
    } catch {
      setError(
        "Unable to connect to BusFix backend. Make sure FastAPI is running."
      );
    } finally {
      setLoading(false);
    }
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
      {/* SEARCH HEADER */}
      {/* ================================================= */}

      <section className="bg-teal-500 pb-8">

        <div className="mx-auto max-w-6xl px-4">

          <div className="rounded-2xl bg-white p-5 shadow-lg">

            <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">
              Hyderabad Bus Stops
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-800">
              Find a Stop
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Search for a bus stop using its name.
            </p>


            {/* Search Box */}

            <div className="mt-5 flex gap-2">

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearch();
                  }
                }}
                placeholder="Example: Ameerpet"
                className="h-12 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100"
              />

              <button
                onClick={handleSearch}
                disabled={loading}
                className="h-12 rounded-xl bg-teal-500 px-5 text-sm font-semibold text-white transition hover:bg-teal-600 disabled:opacity-60"
              >
                {loading ? "..." : "Search"}
              </button>

            </div>

          </div>

        </div>

      </section>


      {/* ================================================= */}
      {/* RESULTS */}
      {/* ================================================= */}

      <section className="mx-auto max-w-6xl px-4 py-7">

        {/* Error */}

        {error && (

          <div className="rounded-xl border border-red-100 bg-red-50 p-4">

            <p className="text-sm font-medium text-red-600">
              {error}
            </p>

          </div>

        )}


        {/* Results */}

        {stops.length > 0 && (

          <div>

            <div className="mb-4">

              <h3 className="text-base font-bold text-slate-800">
                Bus Stops
              </h3>

              <p className="text-xs text-slate-400">
                {stops.length} stop{stops.length === 1 ? "" : "s"} found
              </p>

            </div>


            <div className="space-y-3">

              {stops.map((stop) => (

                <div
                  key={stop.stop_id}
                  className="rounded-2xl bg-white p-5 shadow-sm transition hover:shadow-md"
                >

                 <div className="flex items-start gap-4">

  {/* Stop Icon */}

  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-50 text-xl">
    📍
  </div>


  {/* Stop Information */}

  <div className="min-w-0 flex-1">

    <h4 className="font-semibold text-slate-800">
      {stop.stop_name}
    </h4>


    {/* Routes */}

    <div className="mt-3">

      <p className="mb-2 text-xs font-semibold text-slate-500">
        Routes serving this stop
      </p>


      {stop.routes.length > 0 ? (

        <div className="flex flex-wrap gap-2">

          {stop.routes.map((route) => (

            <span
              key={route}
              className="rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700"
            >
              {route}
            </span>

          ))}

        </div>

      ) : (

        <p className="text-xs text-slate-400">
          No route information available
        </p>

      )}

    </div>

  </div>

</div>

                </div>

              ))}

            </div>

          </div>

        )}


        {/* Empty State */}

        {!loading && !error && stops.length === 0 && (

          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">

            <div className="text-3xl">
              📍
            </div>

            <p className="mt-3 text-sm font-medium text-slate-600">
              Search for a bus stop to get started.
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