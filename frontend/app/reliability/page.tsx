"use client";

import { useEffect, useState } from "react";

type RouteReliability = {
  route_id: string;
  report_count: number;
  information_health_score: number;
  status: string;
};

export default function ReliabilityPage() {
  const [routes, setRoutes] = useState<RouteReliability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadReliability() {
      try {
        const response = await fetch(
          "http://127.0.0.1:8000/reports/routes/reliability"
        );

        if (!response.ok) {
          throw new Error("Failed to load reliability data");
        }

        const data = await response.json();

        setRoutes(data.routes);
      } catch (err) {
        setError(
          "Unable to load reliability data. Make sure FastAPI is running."
        );
      } finally {
        setLoading(false);
      }
    }

    loadReliability();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">

      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-2xl">
              🚌
            </div>

            <div>
              <h1 className="text-xl font-bold">
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
            ← Home
          </button>

        </div>
      </header>


      {/* Hero */}
      <section className="bg-blue-600">

        <div className="mx-auto max-w-7xl px-6 py-10">

          <p className="text-sm font-semibold uppercase tracking-wider text-blue-100">
            Information health
          </p>

          <h2 className="mt-2 text-4xl font-bold text-white">
            Route Reliability
          </h2>

          <p className="mt-3 max-w-2xl text-blue-100">
            A report-based view of how reliable public transport information
            has been across reported routes.
          </p>

        </div>

      </section>


      {/* Content */}
      <section className="mx-auto max-w-7xl px-6 py-10">

        {/* Explanation */}
        <div className="mb-8 rounded-2xl border border-blue-100 bg-blue-50 p-6">

          <h3 className="font-bold text-blue-900">
            What does this score mean?
          </h3>

          <p className="mt-2 text-sm leading-6 text-blue-800">
            The Information Health Score is currently based on passenger
            information-problem reports. More reports result in a lower
            score. It is an initial observation indicator and does not
            predict bus arrivals or represent an official TGSRTC rating.
          </p>

        </div>


        {/* Loading */}
        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">

            <p className="text-slate-500">
              Loading reliability data...
            </p>

          </div>
        )}


        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5">

            <p className="font-medium text-red-700">
              ⚠️ {error}
            </p>

          </div>
        )}


        {/* No data */}
        {!loading && !error && routes.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">

            <p className="text-slate-500">
              No route reliability observations are available yet.
            </p>

          </div>
        )}


        {/* Route Reliability */}
        {!loading && !error && routes.length > 0 && (

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="border-b border-slate-200 p-6">

              <h3 className="text-xl font-bold">
                Route Information Health
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Current report-based observations by route.
              </p>

            </div>


            <div className="divide-y divide-slate-200">

              {routes.map((route) => (

                <div
                  key={route.route_id}
                  className="p-6 transition hover:bg-slate-50"
                >

                  <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

                    {/* Route */}
                    <div>

                      <span className="inline-block rounded-lg bg-blue-100 px-3 py-1 text-sm font-bold text-blue-700">
                        {route.route_id}
                      </span>

                      <p className="mt-2 text-sm text-slate-500">
                        {route.report_count}{" "}
                        {route.report_count === 1
                          ? "information report"
                          : "information reports"}
                      </p>

                    </div>


                    {/* Score */}
                    <div className="w-full md:w-80">

                      <div className="mb-2 flex items-center justify-between">

                        <span className="text-sm font-semibold">
                          Information Health
                        </span>

                        <span className="text-2xl font-bold">
                          {route.information_health_score}%
                        </span>

                      </div>


                      {/* Progress Bar */}
                      <div className="h-3 overflow-hidden rounded-full bg-slate-200">

                        <div
                          className="h-full rounded-full bg-blue-600 transition-all"
                          style={{
                            width: `${route.information_health_score}%`,
                          }}
                        />

                      </div>


                      <div className="mt-2 flex justify-between">

                        <span className="text-xs text-slate-400">
                          Based on reports
                        </span>

                        <span className="text-xs font-semibold text-slate-600">
                          {route.status}
                        </span>

                      </div>

                    </div>

                  </div>

                </div>

              ))}

            </div>

          </div>

        )}

      </section>


      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">

        <div className="mx-auto max-w-7xl px-6 py-6 text-center text-sm text-slate-500">

          BusFix Hyderabad · Independent student project · Not affiliated with
          TGSRTC

        </div>

      </footer>

    </main>
  );
}