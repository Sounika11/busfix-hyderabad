"use client";

import { useState } from "react";

export default function ReportPage() {
  const [routeId, setRouteId] = useState("");
  const [stopName, setStopName] = useState("");
  const [issueType, setIssueType] = useState("");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setSuccess("");
    setError("");

    if (!routeId || !stopName || !issueType || !description) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          route_id: routeId,
          stop_name: stopName,
          issue_type: issueType,
          description: description,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit report");
      }

      const data = await response.json();

      setSuccess(
        `Report #${data.report.id} submitted successfully. Thank you for helping improve transport information.`
      );

      setRouteId("");
      setStopName("");
      setIssueType("");
      setDescription("");
    } catch (err) {
      setError(
        "Unable to submit report. Make sure FastAPI is running."
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
        <div className="mx-auto max-w-7xl px-6 py-12">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-100">
            Help improve transport information
          </p>

          <h2 className="mt-2 text-4xl font-bold text-white">
            🚨 Report an Information Problem
          </h2>

          <p className="mt-4 max-w-2xl text-lg leading-8 text-blue-100">
            Tell us when the transport information you see doesn't match
            what actually happens.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="mx-auto max-w-3xl px-6 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="mb-6">
            <h3 className="text-xl font-bold">
              What happened?
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Please provide the details you observed.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Route */}
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Bus Route
              </label>

              <input
                type="text"
                value={routeId}
                onChange={(e) => setRouteId(e.target.value)}
                placeholder="Example: 216D"
                className="h-12 w-full rounded-lg border border-slate-200 px-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Stop */}
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Bus Stop
              </label>

              <input
                type="text"
                value={stopName}
                onChange={(e) => setStopName(e.target.value)}
                placeholder="Example: Ameerpet"
                className="h-12 w-full rounded-lg border border-slate-200 px-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Issue Type */}
            <div>
              <label className="mb-2 block text-sm font-semibold">
                What went wrong?
              </label>

              <select
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
                className="h-12 w-full rounded-lg border border-slate-200 bg-white px-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">
                  Select an issue
                </option>

                <option value="LIVE_DATA_MISSING">
                  Bus arrived but live information was missing
                </option>

                <option value="WRONG_BUS_INFORMATION">
                  Wrong bus information
                </option>

                <option value="WRONG_ROUTE_INFORMATION">
                  Wrong route information
                </option>

                <option value="SCHEDULE_UNAVAILABLE">
                  Schedule information unavailable
                </option>

                <option value="TRACKING_UNAVAILABLE">
                  Live tracking unavailable
                </option>

                <option value="STOP_INFORMATION_WRONG">
                  Stop information was incorrect
                </option>

                <option value="OTHER">
                  Other information problem
                </option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Describe what happened
              </label>

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Example: The app showed no buses available, but a 216D bus arrived at the stop."
                rows={5}
                className="w-full resize-none rounded-lg border border-slate-200 p-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Success */}
            {success && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-medium text-emerald-700">
                  ✅ {success}
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-medium text-red-700">
                  ⚠️ {error}
                </p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-lg bg-blue-600 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Submitting..." : "Submit Report"}
            </button>
          </form>
        </div>

        {/* Important note */}
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-semibold text-amber-800">
            Information reliability matters
          </p>

          <p className="mt-1 text-sm leading-6 text-amber-700">
            A report records an observation. It does not automatically mean
            that the transport service or official application is incorrect.
            Repeated observations can help identify genuine information
            reliability problems.
          </p>
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