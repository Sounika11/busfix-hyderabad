"use client";

import { useState } from "react";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<
    {
      route_id: string;
      route_short_name: string;
      agency_id: string;
      route_type: string;
    }[]
  >([]);
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
    } catch (err) {
      setError(
        "Unable to connect to BusFix backend. Make sure FastAPI is running."
      );
    } finally {
      setLoading(false);
    }
  }

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
              <h1 className="text-xl font-bold tracking-tight">
                BusFix Hyderabad
              </h1>

              <p className="text-xs text-slate-500">
                Public transport information reliability
              </p>
            </div>
          </div>

          <button className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50">
            Admin
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-blue-600">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="max-w-3xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-blue-100">
              Hyderabad Public Transport
            </p>

            <h2 className="text-4xl font-bold leading-tight text-white md:text-5xl">
              Is the bus information
              <br />
              actually reliable?
            </h2>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-blue-100">
              Search bus routes, check available information, and report
              problems when what you see doesn't match what actually happens.
            </p>

            {/* Search */}
            <div className="mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearch();
                  }
                }}
                placeholder="Search bus number..."
                className="h-14 flex-1 rounded-xl border-0 bg-white px-5 text-base text-slate-900 shadow-lg outline-none placeholder:text-slate-400 focus:ring-4 focus:ring-blue-300"
              />

              <button
                onClick={handleSearch}
                disabled={loading}
                className="h-14 rounded-xl bg-slate-900 px-7 font-semibold text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Searching..." : "Search Bus"}
              </button>
            </div>

            {/* Search Results */}
            {(results.length > 0 || error) && (
              <div className="mt-5 max-w-2xl rounded-xl bg-white p-5 shadow-lg">
                {results.length > 0 && (
                  <>
                    <p className="mb-3 text-sm font-semibold text-slate-500">
                      Routes found
                    </p>

                    <div className="space-y-3">
                      {results.map((route) => (
                        <button
                          key={route.route_id}
                          onClick={() => {
                            window.location.href = `/route/${encodeURIComponent(
                              route.route_short_name
                            )}`;
                          }}
                          className="flex w-full items-center justify-between rounded-lg border border-slate-200 p-4 text-left transition hover:border-blue-400 hover:bg-blue-50"
                        >
                          <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-blue-50 px-3 py-2 font-bold text-blue-700">
                              🚌 {route.route_short_name}
                            </div>

                            <div>
                              <p className="font-medium text-slate-900">
                                Route {route.route_short_name}
                              </p>

                              <p className="text-xs text-slate-500">
                                TGSRTC · Route type {route.route_type}
                              </p>
                            </div>
                          </div>

                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            Available →
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {error && (
                  <p className="text-sm font-medium text-red-600">{error}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="mx-auto max-w-7xl px-6 py-10">
        <h3 className="text-lg font-bold">What do you want to do?</h3>

        <p className="mt-1 text-sm text-slate-500">
          Get information or help us identify transport information problems.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ActionCard
            icon="🚌"
            title="Find a Bus"
            description="Search routes, stops and available schedules."
          />

          <ActionCard
            icon="📍"
            title="Find a Stop"
            description="Find bus stops and the routes serving them."
          />

          {/* Report Issue */}
          <ActionCard
            icon="🚨"
            title="Report an Issue"
            description="Tell us when bus information doesn't match reality."
            onClick={() => {
              window.location.href = "/report";
            }}
          />

          <ActionCard
            icon="📊"
            title="View Reliability"
            description="See information reliability across routes and stops."
          />
        </div>
      </section>

      {/* Information Health */}
      <section className="mx-auto max-w-7xl px-6 pb-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-lg font-bold">
                Hyderabad Information Health
              </h3>

              <p className="text-sm text-slate-500">
                Demo data — we'll replace this with real observations later.
              </p>
            </div>

            <span className="w-fit rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              MVP Preview
            </span>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <HealthCard
              value="92%"
              label="Information Available"
              description="Bus and route information currently visible"
              type="good"
            />

            <HealthCard
              value="6%"
              label="Reported Issues"
              description="Information discrepancies reported"
              type="warning"
            />

            <HealthCard
              value="2%"
              label="Critical Issues"
              description="Repeated or severe information failures"
              type="critical"
            />
          </div>
        </div>
      </section>

      {/* Recent Issues */}
      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="mb-5">
          <h3 className="text-lg font-bold">Recent Reported Problems</h3>

          <p className="text-sm text-slate-500">
            Examples of issues passengers can report.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <IssueRow
            route="216D"
            stop="Ameerpet"
            issue="Bus arrived but was not shown in the app"
            time="Today, 8:35 AM"
            status="Reported"
          />

          <IssueRow
            route="218"
            stop="Uppal"
            issue="Schedule information unavailable"
            time="Today, 9:10 AM"
            status="Under review"
          />

          <IssueRow
            route="24B"
            stop="Secunderabad"
            issue="Live tracking unavailable"
            time="Yesterday, 6:45 PM"
            status="Reported"
          />
        </div>
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

/* ---------------- Components ---------------- */

function ActionCard({
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
      className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-md"
    >
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl">
        {icon}
      </div>

      <h4 className="font-semibold group-hover:text-blue-600">
        {title}
      </h4>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        {description}
      </p>
    </button>
  );
}

function HealthCard({
  value,
  label,
  description,
  type,
}: {
  value: string;
  label: string;
  description: string;
  type: "good" | "warning" | "critical";
}) {
  const styles = {
    good: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    critical: "bg-red-50 text-red-700",
  };

  return (
    <div className="rounded-xl bg-slate-50 p-5">
      <div
        className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold ${styles[type]}`}
      >
        {value}
      </div>

      <h4 className="font-semibold">{label}</h4>

      <p className="mt-1 text-sm leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function IssueRow({
  route,
  stop,
  issue,
  time,
  status,
}: {
  route: string;
  stop: string;
  issue: string;
  time: string;
  status: string;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-100 p-5 last:border-0 md:flex-row md:items-center md:justify-between">
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700">
          {route}
        </div>

        <div>
          <p className="font-medium">{issue}</p>

          <p className="mt-1 text-sm text-slate-500">
            {stop} · {time}
          </p>
        </div>
      </div>

      <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
        {status}
      </span>
    </div>
  );
}