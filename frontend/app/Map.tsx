"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
} from "react-leaflet";

import L from "leaflet";
import { useEffect, useMemo, useState } from "react";

import "leaflet/dist/leaflet.css";

type MapStop = {
  stop_sequence: string;
  stop_name: string;
  stop_lat: string;
  stop_lon: string;
};

type Report = {
  id: number;
  route_id: string;
  stop_name: string;
  issue_type: string;
  reported_at: string;
};

type StopHealth = {
  score: number | null;
  status: string;
  confidence: string;
  reportCount: number;
  issueBreakdown: Record<string, number>;
};

const API_BASE = "http://127.0.0.1:8000";

const severityWeights: Record<string, number> = {
  LIVE_DATA_MISSING: 10,
  WRONG_BUS_INFORMATION: 15,
  WRONG_ROUTE_INFORMATION: 20,
  SCHEDULE_UNAVAILABLE: 8,
  TRACKING_UNAVAILABLE: 12,
  STOP_INFORMATION_WRONG: 15,
  OTHER: 5,
};

const CALIBRATION = 25;
const DECAY_DAYS = 30;

const busIcon = new L.Icon({
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function calculateStopHealth(reports: Report[]): StopHealth {
  if (reports.length === 0) {
    return {
      score: null,
      status: "No observations",
      confidence: "None",
      reportCount: 0,
      issueBreakdown: {},
    };
  }

  const now = Date.now();
  let burden = 0;
  const issueBreakdown: Record<string, number> = {};

  for (const report of reports) {
    const issue = report.issue_type || "OTHER";
    const severity = severityWeights[issue] ?? severityWeights.OTHER;

    const reportedTime = new Date(report.reported_at).getTime();
    const ageDays = Number.isFinite(reportedTime)
      ? Math.max(0, (now - reportedTime) / (1000 * 60 * 60 * 24))
      : 0;

    const recencyWeight = Math.exp(-ageDays / DECAY_DAYS);

    burden += severity * recencyWeight;
    issueBreakdown[issue] = (issueBreakdown[issue] || 0) + 1;
  }

  const score = Math.round(100 / (1 + burden / CALIBRATION));

  let status = "Poor";
  if (score >= 80) status = "Good";
  else if (score >= 60) status = "Needs Attention";

  let confidence = "Low";
  if (reports.length >= 10) confidence = "High";
  else if (reports.length >= 3) confidence = "Medium";

  return {
    score,
    status,
    confidence,
    reportCount: reports.length,
    issueBreakdown,
  };
}

function getStatusColor(status: string) {
  if (status === "Good") return "#10b981";
  if (status === "Needs Attention") return "#f59e0b";
  if (status === "Poor") return "#ef4444";
  return "#94a3b8";
}

function getStatusTextClass(status: string) {
  if (status === "Good") return "text-emerald-700";
  if (status === "Needs Attention") return "text-amber-700";
  if (status === "Poor") return "text-red-700";
  return "text-slate-500";
}

export default function RouteMap({
  stops,
  routeId,
}: {
  stops: MapStop[];
  routeId?: string;
}) {
  const [reports, setReports] = useState<Report[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadReports() {
      try {
        const response = await fetch(`${API_BASE}/reports`);

        if (!response.ok) {
          throw new Error("Failed to load reports");
        }

        const data = await response.json();
        const allReports: Report[] = data.reports || [];

        if (!cancelled) {
          const routeReports = routeId
            ? allReports.filter(
                (report) =>
                  report.route_id.trim().toLowerCase() ===
                  routeId.trim().toLowerCase()
              )
            : allReports;

          setReports(routeReports);
        }
      } catch {
        if (!cancelled) {
          setReports([]);
        }
      } finally {
        if (!cancelled) {
          setReportsLoading(false);
        }
      }
    }

    loadReports();

    return () => {
      cancelled = true;
    };
  }, [routeId]);

  const validStops = useMemo(
    () =>
      stops.filter(
        (stop) =>
          Number.isFinite(Number(stop.stop_lat)) &&
          Number.isFinite(Number(stop.stop_lon))
      ),
    [stops]
  );

  const coordinates = useMemo(
    () =>
      validStops.map(
        (stop) =>
          [
            Number(stop.stop_lat),
            Number(stop.stop_lon),
          ] as [number, number]
      ),
    [validStops]
  );

  const stopHealthMap = useMemo(() => {
    const result = new Map<string, StopHealth>();

    for (const stop of validStops) {
      const stopReports = reports.filter(
        (report) =>
          report.stop_name.trim().toLowerCase() ===
          stop.stop_name.trim().toLowerCase()
      );

      result.set(
        `${stop.stop_name}-${stop.stop_sequence}`,
        calculateStopHealth(stopReports)
      );
    }

    return result;
  }, [validStops, reports]);

  const observedStopCount = useMemo(() => {
    let count = 0;

    for (const health of stopHealthMap.values()) {
      if (health.score !== null) count++;
    }

    return count;
  }, [stopHealthMap]);

  const attentionCount = useMemo(() => {
    let count = 0;

    for (const health of stopHealthMap.values()) {
      if (health.status === "Needs Attention") count++;
    }

    return count;
  }, [stopHealthMap]);

  const poorCount = useMemo(() => {
    let count = 0;

    for (const health of stopHealthMap.values()) {
      if (health.status === "Poor") count++;
    }

    return count;
  }, [stopHealthMap]);

  if (validStops.length === 0) {
    return (
      <div className="rounded-xl bg-slate-100 p-8 text-center text-sm text-slate-500">
        No map data available for this route.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">
            Information health by stop
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Route geometry comes from GTFS. Stop markers show passenger
            observations, not live bus positions.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
          <LegendItem color="bg-emerald-500" label="Good" />
          <LegendItem color="bg-amber-500" label="Needs Attention" />
          <LegendItem color="bg-red-500" label="Poor" />
          <LegendItem color="bg-slate-400" label="No observations" />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <MapContainer
          bounds={coordinates}
          scrollWheelZoom={true}
          className="h-[500px] w-full"
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <Polyline positions={coordinates} />

          {validStops.map((stop, index) => {
            const health = stopHealthMap.get(
              `${stop.stop_name}-${stop.stop_sequence}`
            )!;

            return (
              <div key={`${stop.stop_sequence}-${index}`}>
                <Marker
                  position={[
                    Number(stop.stop_lat),
                    Number(stop.stop_lon),
                  ]}
                  icon={busIcon}
                >
                  <Popup>
                    <div className="min-w-[220px]">
                      <strong>
                        {stop.stop_sequence}. {stop.stop_name}
                      </strong>

                      <div className="my-3 border-t border-slate-200" />

                      <p className="text-[10px] font-bold tracking-wider text-slate-500">
                        INFORMATION HEALTH
                      </p>

                      {health.score === null ? (
                        <>
                          <p className="mt-1 text-lg font-bold text-slate-500">
                            No observations
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            No passenger reports have been recorded for this
                            stop on this route.
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="mt-1 flex items-end gap-2">
                            <span className="text-3xl font-bold text-slate-900">
                              {health.score}
                            </span>

                            <span className="mb-1 text-sm text-slate-400">
                              / 100
                            </span>
                          </div>

                          <p
                            className={`mt-1 text-sm font-semibold ${getStatusTextClass(
                              health.status
                            )}`}
                          >
                            {health.status}
                          </p>

                          <div className="mt-3 space-y-1 text-xs text-slate-600">
                            <p>
                              <strong>{health.reportCount}</strong>{" "}
                              passenger observations
                            </p>

                            <p>
                              Confidence:{" "}
                              <strong>{health.confidence}</strong>
                            </p>
                          </div>

                          {Object.keys(health.issueBreakdown).length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs font-semibold text-slate-500">
                                Reported issues
                              </p>

                              <div className="mt-1 space-y-1">
                                {Object.entries(health.issueBreakdown)
                                  .sort((a, b) => b[1] - a[1])
                                  .slice(0, 3)
                                  .map(([issue, count]) => (
                                    <div
                                      key={issue}
                                      className="flex justify-between gap-4 text-xs text-slate-600"
                                    >
                                      <span>
                                        {issue.replaceAll("_", " ")}
                                      </span>

                                      <span className="font-semibold">
                                        {count}
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      <p className="mt-3 text-[10px] leading-4 text-slate-400">
                        Based on reported observations. This marker does not
                        represent a live bus location.
                      </p>
                    </div>
                  </Popup>
                </Marker>

                {/* Health halo around the existing stop marker */}
                <CircleMarker
                  center={[
                    Number(stop.stop_lat),
                    Number(stop.stop_lon),
                  ]}
                  radius={health.score === null ? 5 : 8}
                  pathOptions={{
                    color: getStatusColor(health.status),
                    fillColor: getStatusColor(health.status),
                    fillOpacity: health.score === null ? 0.25 : 0.55,
                    opacity: 0.8,
                    weight: 2,
                  }}
                />
              </div>
            );
          })}
        </MapContainer>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <MapStat label="Stops mapped" value={validStops.length} />
        <MapStat label="Observed stops" value={observedStopCount} />
        <MapStat label="Needs attention" value={attentionCount} />
        <MapStat label="Poor" value={poorCount} />
      </div>

      {reportsLoading && (
        <p className="mt-3 text-xs text-slate-400">
          Loading passenger observations…
        </p>
      )}
    </div>
  );
}

function LegendItem({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function MapStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-lg font-bold text-slate-800">{value}</p>
    </div>
  );
}
