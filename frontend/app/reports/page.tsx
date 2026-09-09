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
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [
          reportsResponse,
          statsResponse,
          routeReportsResponse,
        ] = await Promise.all([
          fetch("http://127.0.0.1:8000/reports"),
          fetch("http://127.0.0.1:8000/reports/stats"),
          fetch("http://127.0.0.1:8000/reports/routes"),
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

        setReports(reportsData.reports);
        setStats(statsData);
        setRouteReports(routeReportsData.routes);
      } catch (err) {
        setError(
          "Unable to load reports. Make sure FastAPI is running."
        );
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
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
            Information reliability
          </p>

          <h2 className="mt-2 text-4xl font-bold text-white">
            Issue Reports
          </h2>

          <p className="mt-3 max-w-2xl text-blue-100">
            Passenger observations about public transport information
            problems.
          </p>

        </div>

      </section>


      {/* Content */}
      <section className="mx-auto max-w-7xl px-6 py-10">

        {/* Summary Cards */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">

          {/* Total Reports */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <p className="text-sm text-slate-500">
              Total Reports
            </p>

            <p className="mt-2 text-3xl font-bold">
              {stats.total_reports}
            </p>

          </div>


          {/* Routes Affected */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <p className="text-sm text-slate-500">
              Routes Affected
            </p>

            <p className="mt-2 text-3xl font-bold">
              {stats.affected_routes}
            </p>

          </div>


          {/* Most Common Issue */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <p className="text-sm text-slate-500">
              Most Common Issue
            </p>

            <p className="mt-2 text-lg font-bold">
              {stats.most_common_issue || "No reports yet"}
            </p>

          </div>

        </div>


        {/* Most Reported Stop */}
        {!loading && !error && stats.most_reported_stop && (
          <div className="mb-8 rounded-2xl border border-blue-100 bg-blue-50 p-5">

            <p className="text-sm font-semibold text-blue-700">
              📍 Most Reported Stop
            </p>

            <p className="mt-1 text-lg font-bold text-blue-900">
              {stats.most_reported_stop}
            </p>

            <p className="mt-1 text-sm text-blue-700">
              This stop has received the highest number of passenger
              information observations.
            </p>

          </div>
        )}


        {/* Route Report Summary */}
        {!loading && !error && routeReports.length > 0 && (
          <div className="mb-8 rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="border-b border-slate-200 p-6">

              <h3 className="text-xl font-bold">
                Reports by Route
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Routes with the highest number of reported information
                observations.
              </p>

            </div>


            <div className="divide-y divide-slate-200">

              {routeReports.map((route) => (

                <div
                  key={route.route_id}
                  className="flex items-center justify-between p-5 hover:bg-slate-50"
                >

                  <div className="flex items-center gap-3">

                    <span className="rounded-lg bg-blue-100 px-3 py-1 text-sm font-bold text-blue-700">
                      {route.route_id}
                    </span>

                    <span className="text-sm text-slate-600">
                      Reported route
                    </span>

                  </div>

                  <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700">
                    {route.report_count}{" "}
                    {route.report_count === 1 ? "report" : "reports"}
                  </span>

                </div>

              ))}

            </div>

          </div>
        )}


        {/* Loading */}
        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">

            <p className="text-slate-500">
              Loading reports...
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


        {/* Reports */}
        {!loading && !error && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="border-b border-slate-200 p-6">

              <h3 className="text-xl font-bold">
                Recent Reports
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Latest observations submitted by passengers.
              </p>

            </div>


            {reports.length === 0 ? (

              <div className="p-8 text-center text-slate-500">
                No reports have been submitted yet.
              </div>

            ) : (

              <div className="divide-y divide-slate-200">

                {reports.map((report) => (

                  <div
                    key={report.id}
                    className="p-6 transition hover:bg-slate-50"
                  >

                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">

                      <div>

                        <div className="flex flex-wrap items-center gap-2">

                          <span className="rounded-lg bg-blue-100 px-3 py-1 text-sm font-bold text-blue-700">
                            {report.route_id}
                          </span>

                          <span className="rounded-lg bg-slate-100 px-3 py-1 text-sm text-slate-700">
                            📍 {report.stop_name}
                          </span>

                        </div>


                        <h4 className="mt-3 font-semibold">
                          {report.issue_type}
                        </h4>


                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {report.description}
                        </p>


                        <p className="mt-3 text-xs text-slate-400">

                          Report #{report.id} ·{" "}

                          {new Date(
                            report.reported_at
                          ).toLocaleString()}

                        </p>

                      </div>


                      <span className="w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                        {report.status}
                      </span>

                    </div>

                  </div>

                ))}

              </div>

            )}

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