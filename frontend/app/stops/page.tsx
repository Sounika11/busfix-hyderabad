"use client";

import { useEffect, useMemo, useState } from "react";

type Stop = {
  stop_id: string;
  stop_name: string;
  stop_lat: string;
  stop_lon: string;
  routes: string[];
};

type Report = {
  id: number;
  route_id: string;
  stop_name: string;
  issue_type: string;
  description: string;
  reported_at: string;
  status: string;
};

type StopHealth = {
  stop_name: string;
  report_count: number;
  routes: string[];
  issue_breakdown: Record<string, number>;
  health_score: number;
  confidence: string;
  status: string;
};

const severityWeights: Record<string, number> = {
  LIVE_DATA_MISSING: 10,
  WRONG_BUS_INFORMATION: 15,
  WRONG_ROUTE_INFORMATION: 20,
  SCHEDULE_UNAVAILABLE: 8,
  TRACKING_UNAVAILABLE: 12,
  STOP_INFORMATION_WRONG: 15,
  OTHER: 5,
};

function recencyFactor(reportedAt: string) {
  const date = new Date(reportedAt);

  if (Number.isNaN(date.getTime())) {
    return 1;
  }

  const ageDays = Math.max(
    0,
    (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  return Math.exp(-ageDays / 30);
}

function calculateStopHealth(reports: Report[]): StopHealth[] {
  const groups: Record<
    string,
    {
      report_count: number;
      burden: number;
      routes: Set<string>;
      issues: Record<string, number>;
    }
  > = {};

  for (const report of reports) {
    const stopName = report.stop_name?.trim();

    if (!stopName) continue;

    if (!groups[stopName]) {
      groups[stopName] = {
        report_count: 0,
        burden: 0,
        routes: new Set<string>(),
        issues: {},
      };
    }

    const issue = report.issue_type || "OTHER";
    const weight = severityWeights[issue] ?? 5;

    groups[stopName].report_count += 1;
    groups[stopName].burden +=
      weight * recencyFactor(report.reported_at);

    if (report.route_id?.trim()) {
      groups[stopName].routes.add(report.route_id.trim());
    }

    groups[stopName].issues[issue] =
      (groups[stopName].issues[issue] || 0) + 1;
  }

  return Object.entries(groups)
    .map(([stopName, group]) => {
      const score = Math.max(
        0,
        Math.min(
          100,
          Math.round(100 / (1 + group.burden / 25))
        )
      );

      let status = "Poor";

      if (score >= 80) {
        status = "Good";
      } else if (score >= 60) {
        status = "Needs Attention";
      }

      let confidence = "Low";

      if (group.report_count >= 10) {
        confidence = "High";
      } else if (group.report_count >= 3) {
        confidence = "Medium";
      }

      return {
        stop_name: stopName,
        report_count: group.report_count,
        routes: Array.from(group.routes).sort((a, b) =>
          a.localeCompare(b, undefined, { numeric: true })
        ),
        issue_breakdown: group.issues,
        health_score: score,
        confidence,
        status,
      };
    })
    .sort((a, b) => a.health_score - b.health_score);
}

function formatIssue(issue: string) {
  return issue
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function scoreTone(score: number) {
  if (score >= 80) {
    return {
      text: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-100",
      bar: "bg-emerald-500",
      label: "Good",
    };
  }

  if (score >= 60) {
    return {
      text: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-100",
      bar: "bg-amber-500",
      label: "Needs attention",
    };
  }

  return {
    text: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-100",
    bar: "bg-red-500",
    label: "Poor",
  };
}

export default function StopsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchedStops, setSearchedStops] = useState<Stop[]>([]);
  const [reports, setReports] = useState<Report[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [error, setError] = useState("");
  const [healthError, setHealthError] = useState("");

  useEffect(() => {
    async function loadReports() {
      try {
        const response = await fetch(
          "http://127.0.0.1:8000/reports",
          { cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error("Failed to load reports");
        }

        const data = await response.json();
        setReports(Array.isArray(data.reports) ? data.reports : []);
      } catch {
        setHealthError(
          "Unable to load stop information health. Make sure FastAPI is running."
        );
      } finally {
        setLoadingHealth(false);
      }
    }

    loadReports();
  }, []);

  const stopHealth = useMemo(
    () => calculateStopHealth(reports),
    [reports]
  );

  const filteredHealth = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return stopHealth;
    }

    return stopHealth.filter((stop) =>
      stop.stop_name.toLowerCase().includes(query)
    );
  }, [searchQuery, stopHealth]);

  const overallHealth =
    stopHealth.length > 0
      ? Math.round(
          stopHealth.reduce(
            (sum, stop) => sum + stop.health_score,
            0
          ) / stopHealth.length
        )
      : 0;

  const attentionCount = stopHealth.filter(
    (stop) => stop.health_score < 80
  ).length;

  const searchedStopHealth = searchedStops
    .map((stop) => ({
      ...stop,
      health: stopHealth.find(
        (health) =>
          health.stop_name.toLowerCase() ===
          stop.stop_name.toLowerCase()
      ),
    }))
    .sort((a, b) => {
      const aScore = a.health?.health_score ?? 101;
      const bScore = b.health?.health_score ?? 101;
      return aScore - bScore;
    });

  async function handleSearch() {
    const query = searchQuery.trim();

    if (!query) {
      setError("Please enter a bus stop name.");
      setSearchedStops([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/stops/search?q=${encodeURIComponent(
          query
        )}`
      );

      if (!response.ok) {
        throw new Error("Failed to search stops");
      }

      const data = await response.json();

      if (!data.stops || data.stops.length === 0) {
        setSearchedStops([]);
        setError(`No bus stop found for "${query}".`);
      } else {
        setSearchedStops(data.stops);
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
    <main className="min-h-screen bg-[#f4f8f8] text-slate-800">
      {/* Header */}
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between px-4">
          <button
            onClick={() => (window.location.href = "/")}
            className="flex items-center gap-3 text-left"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-xl">
              🚌
            </div>

            <div>
              <p className="text-base font-bold leading-none text-slate-800">
                BusFix
              </p>
              <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-teal-600">
                Hyderabad
              </p>
            </div>
          </button>

          <button
            onClick={() => (window.location.href = "/")}
            className="text-sm font-medium text-slate-500 transition hover:text-teal-600"
          >
            ← Home
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-teal-500">
        <div className="mx-auto max-w-6xl px-4 py-9 md:py-11">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              Stop information health
            </div>

            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-[40px]">
              Find the stops where information needs attention.
            </h2>

            <p className="mt-3 text-sm leading-6 text-teal-50 md:text-base">
              See passenger-reported information problems at individual bus
              stops and identify potential information hotspots.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        {/* Search */}
        <div className="rounded-3xl bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.06)] md:p-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-600">
              Search a stop
            </p>

            <h3 className="mt-1 text-xl font-bold tracking-tight">
              Find a bus stop
            </h3>

            <p className="mt-1 text-xs text-slate-400">
              Search the GTFS stop database. If passengers have reported
              issues there, its information health will be shown.
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchedStops([]);
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
              placeholder="e.g. Paradise"
              className="h-12 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100"
            />

            <button
              onClick={handleSearch}
              disabled={loading}
              className="h-12 rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {loading ? "Searching..." : "Search stop"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-100 bg-white p-4">
            <p className="text-sm font-medium text-red-600">
              ⚠️ {error}
            </p>
          </div>
        )}

        {/* Search results */}
        {!error && searchedStopHealth.length > 0 && (
          <section className="mt-7">
            <div className="mb-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-600">
                Search results
              </p>

              <h3 className="mt-1 text-2xl font-bold tracking-tight">
                Stop information health
              </h3>
            </div>

            <div className="space-y-3">
              {searchedStopHealth.map((stop) => {
                const health = stop.health;

                return (
                  <article
                    key={stop.stop_id}
                    className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_6px_24px_rgba(15,23,42,0.045)]"
                  >
                    <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-lg">
                          📍
                        </div>

                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-800">
                            {stop.stop_name}
                          </h4>

                          <p className="mt-1 text-xs text-slate-400">
                            {stop.routes?.length || 0} routes serve this
                            stop
                          </p>

                          {stop.routes && stop.routes.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {stop.routes.slice(0, 8).map((route) => (
                                <span
                                  key={route}
                                  className="rounded-full bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-500"
                                >
                                  {route}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {health ? (
                        <div className="w-full md:w-80">
                          <div className="flex items-end justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                Information health
                              </p>

                              <p
                                className={`mt-1 text-3xl font-bold ${
                                  scoreTone(health.health_score).text
                                }`}
                              >
                                {health.health_score}
                                <span className="ml-1 text-xs font-medium text-slate-400">
                                  / 100
                                </span>
                              </p>
                            </div>

                            <span
                              className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                                scoreTone(health.health_score).bg
                              } ${
                                scoreTone(health.health_score).border
                              } ${
                                scoreTone(health.health_score).text
                              }`}
                            >
                              {health.status}
                            </span>
                          </div>

                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${
                                scoreTone(health.health_score).bar
                              }`}
                              style={{
                                width: `${health.health_score}%`,
                              }}
                            />
                          </div>

                          <p className="mt-2 text-[10px] text-slate-400">
                            {health.report_count}{" "}
                            {health.report_count === 1
                              ? "observation"
                              : "observations"}{" "}
                            · {health.confidence} confidence
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-full bg-slate-50 px-4 py-2 text-xs font-medium text-slate-400">
                          No reports for this stop
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* Network stop health */}
        <section className="mt-9">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-600">
                Reported stops
              </p>

              <h3 className="mt-1 text-2xl font-bold tracking-tight">
                Information hotspots
              </h3>

              <p className="mt-1 text-xs text-slate-400">
                Stops with passenger observations, ranked by information
                health.
              </p>
            </div>

            {!loadingHealth && stopHealth.length > 0 && (
              <div className="text-xs text-slate-400">
                {attentionCount}{" "}
                {attentionCount === 1 ? "stop" : "stops"} need attention
              </div>
            )}
          </div>

          {loadingHealth && (
            <div className="rounded-3xl bg-white p-10 text-center shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-xl">
                📍
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-600">
                Loading stop observations...
              </p>
            </div>
          )}

          {!loadingHealth && healthError && (
            <div className="rounded-2xl border border-red-100 bg-white p-5">
              <p className="text-sm font-semibold text-red-600">
                ⚠️ {healthError}
              </p>
            </div>
          )}

          {!loadingHealth && !healthError && stopHealth.length === 0 && (
            <div className="rounded-3xl bg-white p-10 text-center shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-2xl">
                📊
              </div>

              <h4 className="mt-4 font-bold">No stop observations yet</h4>

              <p className="mt-1 text-sm text-slate-400">
                Stop health will appear after passenger reports are
                submitted.
              </p>
            </div>
          )}

          {!loadingHealth && !healthError && stopHealth.length > 0 && (
            <>
              <div className="mb-5 grid gap-4 md:grid-cols-3">
                <div className="rounded-3xl bg-slate-900 p-5 text-white">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Average stop health
                  </p>
                  <p className="mt-3 text-4xl font-bold">
                    {overallHealth}
                    <span className="ml-1 text-xs font-medium text-slate-500">
                      / 100
                    </span>
                  </p>
                </div>

                <div className="rounded-3xl bg-white p-5 shadow-[0_6px_24px_rgba(15,23,42,0.045)]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Observed stops
                  </p>
                  <p className="mt-3 text-4xl font-bold">
                    {stopHealth.length}
                  </p>
                </div>

                <div className="rounded-3xl bg-white p-5 shadow-[0_6px_24px_rgba(15,23,42,0.045)]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Need attention
                  </p>
                  <p className="mt-3 text-4xl font-bold text-amber-600">
                    {attentionCount}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {filteredHealth.map((stop) => {
                  const tone = scoreTone(stop.health_score);

                  const topIssues = Object.entries(
                    stop.issue_breakdown
                  )
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 2);

                  return (
                    <article
                      key={stop.stop_name}
                      className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_6px_24px_rgba(15,23,42,0.045)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(15,23,42,0.08)]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-lg">
                            📍
                          </div>

                          <div>
                            <h4 className="font-bold text-slate-800">
                              {stop.stop_name}
                            </h4>

                            <p className="mt-1 text-[10px] text-slate-400">
                              {stop.report_count}{" "}
                              {stop.report_count === 1
                                ? "observation"
                                : "observations"}{" "}
                              · {stop.routes.length}{" "}
                              {stop.routes.length === 1
                                ? "route"
                                : "routes"}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${tone.bg} ${tone.border} ${tone.text}`}
                        >
                          {stop.status}
                        </span>
                      </div>

                      <div className="mt-5 flex items-end justify-between">
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-slate-400">
                            Health
                          </p>

                          <p className={`mt-1 text-3xl font-bold ${tone.text}`}>
                            {stop.health_score}
                            <span className="ml-1 text-xs font-medium text-slate-400">
                              / 100
                            </span>
                          </p>
                        </div>

                        <p className="text-[10px] text-slate-400">
                          {stop.confidence} confidence
                        </p>
                      </div>

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${tone.bar}`}
                          style={{
                            width: `${stop.health_score}%`,
                          }}
                        />
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {stop.routes.slice(0, 6).map((route) => (
                          <span
                            key={route}
                            className="rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-semibold text-teal-700"
                          >
                            {route}
                          </span>
                        ))}

                        {stop.routes.length > 6 && (
                          <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] text-slate-400">
                            +{stop.routes.length - 6} more
                          </span>
                        )}
                      </div>

                      <div className="mt-4 border-t border-slate-100 pt-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Reported issues
                        </p>

                        <div className="mt-2 flex flex-wrap gap-2">
                          {topIssues.map(([issue, count]) => (
                            <span
                              key={issue}
                              className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] text-slate-500"
                            >
                              {formatIssue(issue)} · {count}
                            </span>
                          ))}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>

        {/* Methodology */}
        <div className="mt-7 rounded-3xl bg-white p-6 shadow-[0_6px_25px_rgba(15,23,42,0.045)]">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-sm">
              ℹ️
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-700">
                How stop health is calculated
              </h3>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                The same observation-based scoring approach used for route
                information health is applied at stop level. Issue severity
                contributes to the burden, and recent observations have
                more influence than older ones.
              </p>

              <p className="mt-3 text-[11px] leading-5 text-slate-400">
                A stop with no reports is not automatically considered
                reliable. It simply has no passenger observations yet.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-5 text-center">
          <p className="text-xs text-slate-400">BusFix Hyderabad</p>
          <p className="mt-1 text-[10px] text-slate-400">
            Independent student project · Not affiliated with TGSRTC
          </p>
        </div>
      </footer>
    </main>
  );
}
