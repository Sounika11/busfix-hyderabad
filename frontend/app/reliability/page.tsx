"use client";

import { useEffect, useState } from "react";

type RouteReliability = {
  route_id: string;
  report_count: number;
  affected_stop_count: number;
  weighted_issue_burden: number;
  information_health_score: number;
  status: string;
  confidence: string;
  issue_breakdown: Record<string, number>;
};

type ReliabilityResponse = {
  count: number;
  methodology?: {
    description?: string;
    not_a_live_arrival_probability?: boolean;
  };
  routes: RouteReliability[];
};

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

function formatIssue(issue: string) {
  return issue
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function ReliabilityPage() {
  const [routes, setRoutes] = useState<RouteReliability[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function loadReliability(refresh = false) {
    refresh ? setRefreshing(true) : setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/reports/routes/reliability",
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error("Failed to load reliability data");
      }

      const data: ReliabilityResponse = await response.json();
      setRoutes(Array.isArray(data.routes) ? data.routes : []);
    } catch {
      setError(
        "Unable to load reliability data. Make sure FastAPI is running."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadReliability();
  }, []);

  const totalReports = routes.reduce((sum, r) => sum + r.report_count, 0);

  const affectedStops = routes.reduce(
    (sum, r) => sum + r.affected_stop_count,
    0
  );

  const averageHealth =
    routes.length > 0
      ? Math.round(
          routes.reduce(
            (sum, r) => sum + r.information_health_score,
            0
          ) / routes.length
        )
      : 0;

  const attentionCount = routes.filter(
    (r) => r.information_health_score < 80
  ).length;

  const overall = scoreTone(averageHealth);

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
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-white">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                Information health
              </div>

              <h2 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-[40px]">
                See where transport information needs attention.
              </h2>

              <p className="mt-3 max-w-xl text-sm leading-6 text-teal-50 md:text-base">
                BusFix turns passenger observations into a simple view of
                information health across reported routes.
              </p>
            </div>

            <button
              onClick={() => loadReliability(true)}
              disabled={loading || refreshing}
              className="w-fit rounded-full bg-white px-4 py-2 text-xs font-bold text-teal-700 shadow-sm transition hover:bg-teal-50 disabled:opacity-60"
            >
              {refreshing ? "Refreshing..." : "↻ Refresh data"}
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        {/* Loading */}
        {loading && (
          <div className="rounded-3xl bg-white p-12 text-center shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-xl">
              🚌
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-600">
              Loading information health...
            </p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-2xl border border-red-100 bg-white p-6">
            <p className="text-sm font-semibold text-red-600">⚠️ {error}</p>
            <button
              onClick={() => loadReliability()}
              className="mt-4 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && routes.length === 0 && (
          <div className="rounded-3xl bg-white p-12 text-center shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-2xl">
              📊
            </div>
            <h3 className="mt-4 text-lg font-bold">No observations yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
              Route information health will appear here after passengers
              submit observations.
            </p>
          </div>
        )}

        {/* Dashboard */}
        {!loading && !error && routes.length > 0 && (
          <div className="space-y-7">
            {/* Top overview */}
            <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr_1fr]">
              <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-6 text-white shadow-[0_12px_35px_rgba(15,23,42,0.12)]">
                <div className="relative z-10">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Network information health
                  </p>

                  <div className="mt-5 flex items-center gap-5">
                    <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-[9px] border-slate-700">
                      <div
                        className="absolute inset-[-9px] rounded-full border-[9px] border-transparent"
                        style={{
                          borderTopColor:
                            averageHealth >= 80
                              ? "#10b981"
                              : averageHealth >= 60
                              ? "#f59e0b"
                              : "#ef4444",
                          transform: `rotate(${averageHealth * 3.6 - 45}deg)`,
                        }}
                      />
                      <div className="text-center">
                        <p className={`text-3xl font-bold ${overall.text}`}>
                          {averageHealth}
                        </p>
                        <p className="text-[9px] text-slate-500">/ 100</p>
                      </div>
                    </div>

                    <div>
                      <p className={`text-sm font-bold ${overall.text}`}>
                        {overall.label}
                      </p>
                      <p className="mt-2 max-w-[180px] text-xs leading-5 text-slate-400">
                        Based on the current passenger observations.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-teal-500/10" />
                <div className="absolute -bottom-16 right-20 h-32 w-32 rounded-full bg-teal-500/5" />
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Reported routes
                </p>
                <p className="mt-5 text-4xl font-bold text-slate-800">
                  {routes.length}
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Routes with at least one information observation.
                </p>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Passenger observations
                </p>
                <p className="mt-5 text-4xl font-bold text-slate-800">
                  {totalReports}
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Across {affectedStops} affected stop observations.
                </p>
              </div>
            </div>

            {/* Attention strip */}
            <div className="flex flex-col gap-4 rounded-2xl border border-amber-100 bg-amber-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white">
                  ⚠️
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-800">
                    {attentionCount}{" "}
                    {attentionCount === 1 ? "route needs" : "routes need"}{" "}
                    attention
                  </p>
                  <p className="text-xs text-amber-700/70">
                    Scores below 80 are surfaced for further observation.
                  </p>
                </div>
              </div>
            </div>

            {/* Route cards */}
            <div>
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-600">
                    Route overview
                  </p>
                  <h3 className="mt-1 text-2xl font-bold tracking-tight text-slate-800">
                    Information health by route
                  </h3>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {routes.map((route) => {
                  const tone = scoreTone(
                    route.information_health_score
                  );

                  const topIssues = Object.entries(
                    route.issue_breakdown || {}
                  )
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3);

                  return (
                    <article
                      key={route.route_id}
                      className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_6px_25px_rgba(15,23,42,0.045)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(15,23,42,0.08)]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 min-w-12 items-center justify-center rounded-2xl bg-teal-50 px-3 text-sm font-extrabold text-teal-700">
                            {route.route_id}
                          </div>

                          <div>
                            <p className="text-sm font-bold text-slate-700">
                              Route {route.route_id}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-400">
                              {route.report_count}{" "}
                              {route.report_count === 1
                                ? "report"
                                : "reports"}{" "}
                              · {route.affected_stop_count}{" "}
                              {route.affected_stop_count === 1
                                ? "affected stop"
                                : "affected stops"}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${tone.bg} ${tone.border} ${tone.text}`}
                        >
                          {route.status || tone.label}
                        </span>
                      </div>

                      <div className="mt-6">
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                              Information health
                            </p>
                            <p className={`mt-1 text-3xl font-bold ${tone.text}`}>
                              {route.information_health_score}
                              <span className="ml-1 text-xs font-medium text-slate-400">
                                / 100
                              </span>
                            </p>
                          </div>

                          <p className="text-[10px] text-slate-400">
                            {route.confidence} confidence
                          </p>
                        </div>

                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${tone.bar}`}
                            style={{
                              width: `${route.information_health_score}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div className="mt-5 border-t border-slate-100 pt-4">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Most reported issues
                        </p>

                        <div className="mt-2 flex flex-wrap gap-2">
                          {topIssues.length > 0 ? (
                            topIssues.map(([issue, count]) => (
                              <span
                                key={issue}
                                className="rounded-full bg-slate-50 px-2.5 py-1.5 text-[10px] font-medium text-slate-500"
                              >
                                {formatIssue(issue)} · {count}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400">
                              No issue details available.
                            </span>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            {/* Methodology */}
            <div className="rounded-3xl bg-white p-6 shadow-[0_6px_25px_rgba(15,23,42,0.045)]">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-sm">
                  ℹ️
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-700">
                    How this score works
                  </h3>

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Each reported information problem contributes a weighted
                    burden, while recent observations have more influence
                    than older ones. That burden is converted into a
                    0–100 Information Health Score.
                  </p>

                  <p className="mt-3 text-[11px] leading-5 text-slate-400">
                    This is a BusFix prototype indicator based on passenger
                    observations. It is not an official TGSRTC rating and
                    does not predict live bus arrivals.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
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
