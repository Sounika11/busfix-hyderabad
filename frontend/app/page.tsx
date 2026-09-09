"use client";

import { useState } from "react";

type Route = {
  route_id: string;
  route_short_name: string;
  agency_id: string;
  route_type: string;
};

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<Route[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch() {
    const query = searchQuery.trim();

    if (!query) {
      setError("Please enter a bus route number.");
      setResults([]);
      return;
    }

    setLoading(true);
    setError("");
    setResults([]);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/routes/search?q=${encodeURIComponent(query)}`
      );

      if (!response.ok) {
        throw new Error("Failed to search routes");
      }

      const data = await response.json();

      if (data.count === 0) {
        setError(`No route found for "${query}".`);
      } else {
        setResults(data.routes);
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
              window.location.href = "/reports";
            }}
            className="rounded-full px-4 py-2 text-sm font-medium transition hover:bg-teal-600"
          >
            Reports
          </button>

        </div>

      </header>


      {/* ================================================= */}
      {/* SEARCH */}
      {/* ================================================= */}

      <section className="bg-teal-500 pb-8">

        <div className="mx-auto max-w-6xl px-4">

          <div className="rounded-2xl bg-white p-4 shadow-lg">

            <p className="mb-3 text-sm font-semibold text-slate-700">
              Where do you want to go?
            </p>


            <div className="flex gap-2">

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearch();
                  }
                }}
                placeholder="Enter bus number or route"
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


            {/* Search Results */}

            {(results.length > 0 || error) && (

              <div className="mt-4 border-t border-slate-100 pt-4">

                {results.length > 0 && (

                  <div className="space-y-2">

                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Available routes
                    </p>


                    {results.map((route) => (

                      <button
                        key={route.route_id}
                        onClick={() => {
                          window.location.href = `/route/${encodeURIComponent(
                            route.route_short_name
                          )}`;
                        }}
                        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-teal-300 hover:bg-teal-50"
                      >

                        <div className="flex items-center gap-3">

                          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-50 px-1 text-xs font-bold text-teal-600">
                            {route.route_short_name}
                          </div>

                          <div>

                            <p className="text-sm font-semibold">
                              Route {route.route_short_name}
                            </p>

                            <p className="text-xs text-slate-400">
                              TGSRTC · View route
                            </p>

                          </div>

                        </div>

                        <span className="text-lg text-teal-500">
                          →
                        </span>

                      </button>

                    ))}

                  </div>

                )}


                {error && (
                  <p className="text-sm font-medium text-red-500">
                    {error}
                  </p>
                )}

              </div>

            )}

          </div>

        </div>

      </section>


      {/* ================================================= */}
      {/* MAIN NAVIGATION */}
      {/* ================================================= */}

      <section className="mx-auto max-w-6xl px-4 py-7">

        <h2 className="text-base font-bold text-slate-800">
          What are you looking for?
        </h2>

        <p className="mt-1 text-xs text-slate-400">
          Find buses, stops, plan your journey or report a problem.
        </p>


        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">

          {/* Plan Journey */}

          <QuickAction
            icon="🚌"
            title="Plan Journey"
            description="Find buses from A to B"
            onClick={() => {
              window.location.href = "/journey";
            }}
          />


          {/* Find Stop */}

          <QuickAction
            icon="📍"
            title="Find Stop"
            description="Find bus stops"
            onClick={() => {
              window.location.href = "/stops";
            }}
          />


          {/* Report Problem */}

          <QuickAction
            icon="🚨"
            title="Report Problem"
            description="Report an information issue"
            onClick={() => {
              window.location.href = "/report";
            }}
          />


          {/* Recent Problems */}

          <QuickAction
            icon="📝"
            title="Recent Problems"
            description="See passenger reports"
            onClick={() => {
              window.location.href = "/reports";
            }}
          />

        </div>

      </section>


      {/* ================================================= */}
      {/* RECENT PROBLEMS */}
      {/* ================================================= */}

      <section className="mx-auto max-w-6xl px-4 pb-10">

        <div className="mb-3 flex items-center justify-between">

          <div>

            <h2 className="text-base font-bold text-slate-800">
              Recent Problems Reported
            </h2>

            <p className="text-xs text-slate-400">
              Latest passenger observations
            </p>

          </div>


          <button
            onClick={() => {
              window.location.href = "/reports";
            }}
            className="text-xs font-semibold text-teal-600"
          >
            View all →
          </button>

        </div>


        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">

          <ProblemRow
            route="216D"
            stop="Ameerpet"
            issue="Bus arrived but was not shown"
            status="Reported"
          />

          <ProblemRow
            route="227"
            stop="Uppal"
            issue="Schedule information unavailable"
            status="Reported"
          />

          <ProblemRow
            route="229"
            stop="Secunderabad"
            issue="Live tracking unavailable"
            status="Reported"
          />

        </div>

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


/* ================================================= */
/* QUICK ACTION */
/* ================================================= */

function QuickAction({
  icon,
  title,
  description,
  onClick,
}: {
  icon: string;
  title: string;
  description: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >

      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-lg">
        {icon}
      </div>

      <h3 className="mt-3 text-sm font-bold text-slate-800">
        {title}
      </h3>

      <p className="mt-1 text-[11px] text-slate-400">
        {description}
      </p>

    </button>
  );
}


/* ================================================= */
/* PROBLEM ROW */
/* ================================================= */

function ProblemRow({
  route,
  stop,
  issue,
  status,
}: {
  route: string;
  stop: string;
  issue: string;
  status: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 p-4 last:border-0">

      <div className="flex h-10 min-w-14 items-center justify-center rounded-lg bg-teal-50 px-2 text-xs font-bold text-teal-600">
        {route}
      </div>


      <div className="min-w-0 flex-1">

        <p className="truncate text-sm font-medium text-slate-700">
          {issue}
        </p>

        <p className="mt-1 text-xs text-slate-400">
          📍 {stop}
        </p>

      </div>


      <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-600">
        {status}
      </span>

    </div>
  );
}