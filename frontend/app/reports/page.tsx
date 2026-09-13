"use client";

import { useEffect, useState } from "react";

type Report = {
  id: number;
  route_id: string;
  stop_name: string;
  issue_type: string;
  description: string;
  reported_at: string;
  status: string;
};

type ReportStats = {
  total_reports: number;
  affected_routes: number;
  most_common_issue: string | null;
  most_reported_stop: string | null;
};

type RouteReport = {
  route_id: string;
  report_count: number;
};


function formatIssue(issue: string) {
  return issue
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function issueTone(issue: string) {
  if (issue === "LIVE_DATA_MISSING" || issue === "TRACKING_UNAVAILABLE") {
    return "bg-amber-50 text-amber-700 border-amber-100";
  }

  if (
    issue === "WRONG_BUS_INFORMATION" ||
    issue === "WRONG_ROUTE_INFORMATION" ||
    issue === "STOP_INFORMATION_WRONG"
  ) {
    return "bg-red-50 text-red-700 border-red-100";
  }

  return "bg-slate-50 text-slate-600 border-slate-100";
}


export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);

  const [stats, setStats] = useState<ReportStats>({
    total_reports: 0,
    affected_routes: 0,
    most_common_issue: null,
    most_reported_stop: null,
  });

  const [routeReports, setRouteReports] = useState<RouteReport[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function loadDashboard(refresh = false) {
    refresh ? setRefreshing(true) : setLoading(true);
    setError("");

    try {
      const [
        reportsResponse,
        statsResponse,
        routeReportsResponse,
      ] = await Promise.all([
        fetch("http://127.0.0.1:8000/reports", { cache: "no-store" }),
        fetch("http://127.0.0.1:8000/reports/stats", { cache: "no-store" }),
        fetch("http://127.0.0.1:8000/reports/routes", { cache: "no-store" }),
      ]);

      if (
        !reportsResponse.ok ||
        !statsResponse.ok ||
        !routeReportsResponse.ok
      ) {
        throw new Error("Failed to load dashboard data");
      }

      const reportsData = await reportsResponse.json();
      const statsData = await statsResponse.json();
      const routeReportsData = await routeReportsResponse.json();

      setReports(
        Array.isArray(reportsData.reports)
          ? reportsData.reports
          : []
      );

      setStats(statsData);

      setRouteReports(
        Array.isArray(routeReportsData.routes)
          ? routeReportsData.routes
          : []
      );

    } catch {
      setError(
        "Unable to load reports. Make sure FastAPI is running."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

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
                Passenger observations
              </div>

              <h2 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-[40px]">
                See what passengers are reporting.
              </h2>

              <p className="mt-3 max-w-xl text-sm leading-6 text-teal-50 md:text-base">
                These observations are the evidence behind BusFix&apos;s
                information-health indicators.
              </p>
            </div>

            <button
              onClick={() => loadDashboard(true)}
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
              Loading passenger observations...
            </p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-2xl border border-red-100 bg-white p-6">
            <p className="text-sm font-semibold text-red-600">
              ⚠️ {error}
            </p>

            <button
              onClick={() => loadDashboard()}
              className="mt-4 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && reports.length === 0 && (
          <div className="rounded-3xl bg-white p-12 text-center shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-2xl">
              📝
            </div>

            <h3 className="mt-4 text-lg font-bold text-slate-700">
              No observations yet
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
              Passenger reports will appear here after the first observation
              is submitted.
            </p>
          </div>
        )}

        {/* Dashboard */}
        {!loading && !error && reports.length > 0 && (
          <div className="space-y-7">
            {/* Summary */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl bg-slate-900 p-6 text-white shadow-[0_10px_30px_rgba(15,23,42,0.10)]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Total observations
                </p>

                <p className="mt-4 text-4xl font-bold">
                  {stats.total_reports}
                </p>

                <p className="mt-2 text-xs text-slate-400">
                  Submitted by passengers
                </p>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-[0_7px_26px_rgba(15,23,42,0.055)]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Routes affected
                </p>

                <p className="mt-4 text-4xl font-bold text-slate-800">
                  {stats.affected_routes}
                </p>

                <p className="mt-2 text-xs text-slate-400">
                  Routes with reported information problems
                </p>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-[0_7px_26px_rgba(15,23,42,0.055)]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Most common issue
                </p>

                <p className="mt-4 text-xl font-bold text-slate-800">
                  {stats.most_common_issue
                    ? formatIssue(stats.most_common_issue)
                    : "No data"}
                </p>

                <p className="mt-2 text-xs text-slate-400">
                  Based on submitted observations
                </p>
              </div>
            </div>

            {/* Most reported stop */}
            {stats.most_reported_stop && (
              <div className="flex flex-col gap-4 rounded-2xl border border-teal-100 bg-teal-50 px-5 py-4 sm:flex-row sm:items-center">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white">
                  📍
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-teal-600">
                    Most reported stop
                  </p>

                  <p className="mt-1 text-base font-bold text-teal-900">
                    {stats.most_reported_stop}
                  </p>
                </div>
              </div>
            )}

            {/* Route overview */}
            {routeReports.length > 0 && (
              <section>
                <div className="mb-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-600">
                    Where reports are concentrated
                  </p>

                  <h3 className="mt-1 text-2xl font-bold tracking-tight text-slate-800">
                    Reports by route
                  </h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {routeReports.map((route) => (
                    <div
                      key={route.route_id}
                      className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_6px_24px_rgba(15,23,42,0.045)]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex h-11 min-w-11 items-center justify-center rounded-xl bg-teal-50 px-3 text-sm font-extrabold text-teal-700">
                          {route.route_id}
                        </div>

                        <span className="rounded-full bg-amber-50 px-3 py-1.5 text-[10px] font-bold text-amber-700">
                          {route.report_count}{" "}
                          {route.report_count === 1
                            ? "report"
                            : "reports"}
                        </span>
                      </div>

                      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-teal-400"
                          style={{
                            width: `${Math.min(
                              100,
                              (route.report_count /
                                Math.max(
                                  1,
                                  routeReports[0]?.report_count || 1
                                )) *
                                100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Observation list */}
            <section>
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-600">
                    Evidence
                  </p>

                  <h3 className="mt-1 text-2xl font-bold tracking-tight text-slate-800">
                    Recent observations
                  </h3>

                  <p className="mt-1 text-xs text-slate-400">
                    The individual reports contributing to the current
                    picture.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {reports.map((report) => (
                  <article
                    key={report.id}
                    className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_5px_22px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_9px_28px_rgba(15,23,42,0.07)]"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-xl bg-teal-50 px-3 py-1.5 text-xs font-extrabold text-teal-700">
                            {report.route_id}
                          </span>

                          <span className="rounded-xl bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
                            📍 {report.stop_name}
                          </span>

                          <span
                            className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${issueTone(
                              report.issue_type
                            )}`}
                          >
                            {formatIssue(report.issue_type)}
                          </span>
                        </div>

                        <p className="mt-4 text-sm leading-6 text-slate-600">
                          {report.description}
                        </p>

                        <p className="mt-3 text-[10px] text-slate-400">
                          Report #{report.id} ·{" "}
                          {new Date(report.reported_at).toLocaleString()}
                        </p>
                      </div>

                      <span className="w-fit shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-semibold text-slate-500">
                        {report.status}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {/* Interpretation note */}
            <div className="rounded-3xl bg-white p-6 shadow-[0_6px_25px_rgba(15,23,42,0.045)]">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-sm">
                  ℹ️
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-700">
                    These are observations
                  </h3>

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    A passenger report records what was observed at a
                    particular route and stop. A single report does not prove
                    that the official transport service or application is
                    incorrect. Repeated observations are more useful for
                    identifying persistent information problems.
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
