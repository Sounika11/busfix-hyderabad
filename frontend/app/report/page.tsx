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
    } catch {
      setError(
        "Unable to submit report. Make sure FastAPI is running."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <button
            onClick={() => {
              window.location.href = "/";
            }}
            className="flex items-center gap-3 text-left"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-xl">
              🚌
            </div>

            <div>
              <h1 className="text-base font-bold text-slate-800">
                BusFix
              </h1>
              <p className="text-[10px] uppercase tracking-wide text-teal-600">
                Hyderabad
              </p>
            </div>
          </button>

          <button
            onClick={() => {
              window.location.href = "/";
            }}
            className="text-sm font-medium text-slate-500 transition hover:text-teal-600"
          >
            ← Home
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-teal-500">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-50">
              Transport information
            </p>

            <h2 className="mt-2 text-3xl font-bold tracking-tight text-white md:text-4xl">
              Something didn&apos;t match?
            </h2>

            <p className="mt-3 text-sm leading-6 text-teal-50 md:text-base">
              Tell us what you saw. Your observation helps BusFix identify
              where public transport information may not match reality.
            </p>
          </div>
        </div>
      </section>

      {/* Main */}
      <section className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Form card */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-5 md:px-7">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-lg">
                  📝
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-800">
                    Report an issue
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Add what you observed at the stop.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 px-5 py-6 md:px-7">
              {/* Route + stop */}
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Bus route
                  </label>

                  <input
                    type="text"
                    value={routeId}
                    onChange={(e) => setRouteId(e.target.value)}
                    placeholder="e.g. 216D"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Bus stop
                  </label>

                  <input
                    type="text"
                    value={stopName}
                    onChange={(e) => setStopName(e.target.value)}
                    placeholder="e.g. Ameerpet"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100"
                  />
                </div>
              </div>

              {/* Issue type */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  What went wrong?
                </label>

                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100"
                >
                  <option value="">Select an issue</option>

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
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    What did you observe?
                  </label>

                  <span className="text-[10px] text-slate-400">
                    Be specific if possible
                  </span>
                </div>

                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Example: The app showed no buses available, but a 216D bus arrived at the stop."
                  rows={5}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100"
                />
              </div>

              {/* Messages */}
              {success && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-sm font-medium text-emerald-700">
                    ✓ {success}
                  </p>
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm font-medium text-red-700">
                    {error}
                  </p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-xl bg-slate-900 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Submitting..." : "Submit Report"}
              </button>
            </form>
          </div>

          {/* Side information */}
          <aside className="space-y-4">
            <div className="rounded-2xl border border-teal-100 bg-teal-50 p-5">
              <p className="text-sm font-bold text-teal-800">
                What makes a useful report?
              </p>

              <div className="mt-4 space-y-3">
                <div className="flex gap-3">
                  <span className="mt-0.5 text-sm">🚌</span>
                  <div>
                    <p className="text-xs font-semibold text-teal-800">
                      Route number
                    </p>
                    <p className="mt-0.5 text-xs leading-5 text-teal-700">
                      Tell us which bus you were checking.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="mt-0.5 text-sm">📍</span>
                  <div>
                    <p className="text-xs font-semibold text-teal-800">
                      Location
                    </p>
                    <p className="mt-0.5 text-xs leading-5 text-teal-700">
                      Mention the stop where you observed it.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="mt-0.5 text-sm">🔎</span>
                  <div>
                    <p className="text-xs font-semibold text-teal-800">
                      What you saw
                    </p>
                    <p className="mt-0.5 text-xs leading-5 text-teal-700">
                      Explain what the app showed versus what happened.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm">
                  ℹ️
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    Observation, not accusation
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    A report records what a passenger observed. One report
                    does not automatically prove that the official service or
                    application is incorrect. Repeated observations help
                    identify genuine information reliability problems.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* Footer */}
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
