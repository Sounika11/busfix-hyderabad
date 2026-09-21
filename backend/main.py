import os
from fastapi import FastAPI, Query, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
from difflib import SequenceMatcher
import re
from gtfs import (
    load_routes,
    search_routes,
    get_route_stops,
    get_route_trips,
    search_stops,
    find_nearest_stops,
    find_direct_routes,
    find_connecting_routes,
    find_alternative_journeys,
)
from database import get_db_connection

app = FastAPI(
    title="BusFix Hyderabad API",
    description="Public transport information reliability platform",
    version="0.1.0",
)

# =====================================================
# CORS
# =====================================================
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================
# REPORT MODEL
# =====================================================
class IssueReport(BaseModel):
    route_id: str
    stop_name: str
    issue_type: str
    description: str

# =====================================================
# BASIC
# =====================================================
@app.get("/")
def root():
    return {
        "message": "BusFix Hyderabad API is running 🚍"
    }

@app.get("/health")
def health():
    return {
        "status": "healthy"
    }

# =====================================================
# ROUTES
# =====================================================
@app.get("/routes")
def get_routes():
    routes = load_routes()
    return {
        "count": len(routes),
        "routes": routes
    }

@app.get("/routes/search")
def search_route(
    q: str = Query(
        ...,
        min_length=1,
        description="Bus route number or name to search"
    )
):
    results = search_routes(q)
    return {
        "query": q,
        "count": len(results),
        "routes": results
    }

@app.get("/routes/{route_id}/stops")
def get_stops_for_route(
    route_id: str,
    direction_id: str | None = Query(
        None,
        description="Optional GTFS direction ID. If omitted, the first direction is used.",
    ),
):
    stops = get_route_stops(
        route_id,
        direction_id=direction_id,
    )
    return {
        "route_id": route_id,
        "direction_id": direction_id,
        "count": len(stops),
        "stops": stops,
    }
@app.get("/routes/{route_id}/trips")
def get_trips_for_route(route_id: str):
    trips = get_route_trips(route_id)
    return {
        "route_id": route_id,
        "count": len(trips),
        "trips": trips
    }

# =====================================================
# STOP SEARCH
# =====================================================
@app.get("/stops/search")
def search_stop(
    q: str = Query(
        ...,
        min_length=1,
        description="Bus stop name to search"
    )
):
    results = search_stops(q)
    return {
        "query": q,
        "count": len(results),
        "stops": results,
    }

# =====================================================
# NEARBY STOPS
# =====================================================
@app.get("/stops/nearby")
def get_nearby_stops(
    lat: float = Query(
        ...,
        description="Latitude"
    ),
    lon: float = Query(
        ...,
        description="Longitude"
    ),
):
    stops = find_nearest_stops(
        latitude=lat,
        longitude=lon,
        limit=5,
    )
    return {
        "latitude": lat,
        "longitude": lon,
        "count": len(stops),
        "stops": stops,
    }

# =====================================================
# DIRECT JOURNEY
# =====================================================
@app.get("/journey/direct")
def get_direct_routes(
    origin_stop_id: list[str] = Query(
        ...,
        description="One or more origin GTFS stop IDs",
    ),
    destination_stop_id: list[str] = Query(
        ...,
        description="One or more destination GTFS stop IDs",
    ),
):
    origin_ids = list(
        dict.fromkeys(
            stop_id.strip()
            for stop_id in origin_stop_id
            if stop_id.strip()
        )
    )
    destination_ids = list(
        dict.fromkeys(
            stop_id.strip()
            for stop_id in destination_stop_id
            if stop_id.strip()
        )
    )
    if not origin_ids:
        raise HTTPException(
            status_code=400,
            detail="At least one origin stop ID is required.",
        )
    if not destination_ids:
        raise HTTPException(
            status_code=400,
            detail="At least one destination stop ID is required.",
        )
    if (
        len(origin_ids) == 1
        and len(destination_ids) == 1
        and origin_ids[0] == destination_ids[0]
    ):
        raise HTTPException(
            status_code=400,
            detail="Origin and destination cannot be the same stop.",
        )
    routes = find_direct_routes(
        origin_ids,
        destination_ids,
    )
    return {
        "origin_stop_ids": origin_ids,
        "destination_stop_ids": destination_ids,
        "count": len(routes),
        "routes": routes,
    }

# =====================================================
# SMART JOURNEY SEARCH
# =====================================================
@app.get("/journey/search")
def search_journey(
    origin_stop_id: list[str] = Query(
        ...,
        description="One or more physical origin stop IDs",
    ),
    destination_stop_id: list[str] = Query(
        ...,
        description="One or more physical destination stop IDs",
    ),
    via_stop_id: list[str] | None = Query(
        None,
        description="Optional one or more VIA stop IDs",
    ),
    max_results: int = Query(
        20,
        ge=1,
        le=50,
        description="Maximum scheduled trips to return",
    ),
):
    """
    Passenger-friendly route discovery.
    A location can represent several physical GTFS stops. The backend
    searches all of them, so the passenger does not need to know a route
    number or exact GTFS stop ID.
    """
    origin_ids = list(dict.fromkeys(
        stop_id.strip()
        for stop_id in origin_stop_id
        if stop_id.strip()
    ))
    destination_ids = list(dict.fromkeys(
        stop_id.strip()
        for stop_id in destination_stop_id
        if stop_id.strip()
    ))
    via_ids = list(dict.fromkeys(
        stop_id.strip()
        for stop_id in (via_stop_id or [])
        if stop_id.strip()
    ))
    if not origin_ids:
        raise HTTPException(
            status_code=400,
            detail="At least one origin stop ID is required.",
        )
    if not destination_ids:
        raise HTTPException(
            status_code=400,
            detail="At least one destination stop ID is required.",
        )
    if set(origin_ids) & set(destination_ids):
        raise HTTPException(
            status_code=400,
            detail="Origin and destination stops cannot overlap.",
        )
    routes = find_route_options(
        origin_ids,
        destination_ids,
        via_stop_ids=via_ids,
        max_results=max_results,
    )
    return {
        "origin_stop_ids": origin_ids,
        "destination_stop_ids": destination_ids,
        "via_stop_ids": via_ids,
        "count": len(routes),
        "routes": routes,
    }

# =====================================================
# ALTERNATIVE JOURNEY
# =====================================================
@app.get("/journey/alternative")
def get_alternative_journeys(
    origin_stop_id: list[str] = Query(
        ...,
        description="One or more origin GTFS stop IDs",
    ),
    destination_stop_id: list[str] = Query(
        ...,
        description="One or more destination GTFS stop IDs",
    ),
    max_results: int = Query(
        10,
        ge=1,
        le=20,
        description="Maximum number of alternative journeys",
    ),
):
    origin_ids = list(
        dict.fromkeys(
            stop_id.strip()
            for stop_id in origin_stop_id
            if stop_id.strip()
        )
    )
    destination_ids = list(
        dict.fromkeys(
            stop_id.strip()
            for stop_id in destination_stop_id
            if stop_id.strip()
        )
    )
    if not origin_ids:
        raise HTTPException(
            status_code=400,
            detail="At least one origin stop ID is required.",
        )
    if not destination_ids:
        raise HTTPException(
            status_code=400,
            detail="At least one destination stop ID is required.",
        )
    if set(origin_ids) & set(destination_ids):
        raise HTTPException(
            status_code=400,
            detail="Origin and destination stops cannot overlap.",
        )
    journeys = find_alternative_journeys(
        origin_ids,
        destination_ids,
        max_results=max_results,
        max_walk_km=0.8,
        walking_speed_kmh=4.8,
        min_transfer_minutes=1,
        max_transfer_minutes=60,
    )
    return {
        "origin_stop_ids": origin_ids,
        "destination_stop_ids": destination_ids,
        "count": len(journeys),
        "journeys": journeys,
    }
# =====================================================
# CONNECTING JOURNEY
# =====================================================
@app.get("/journey/connecting")
def get_connecting_routes(
    origin_stop_id: list[str] = Query(
        ...,
        description="One or more origin GTFS stop IDs",
    ),
    destination_stop_id: list[str] = Query(
        ...,
        description="One or more destination GTFS stop IDs",
    ),
    max_results: int = Query(
        10,
        ge=1,
        le=20,
        description="Maximum number of connecting journeys",
    ),
):
    origin_ids = list(
        dict.fromkeys(
            stop_id.strip()
            for stop_id in origin_stop_id
            if stop_id.strip()
        )
    )
    destination_ids = list(
        dict.fromkeys(
            stop_id.strip()
            for stop_id in destination_stop_id
            if stop_id.strip()
        )
    )
    if not origin_ids:
        raise HTTPException(
            status_code=400,
            detail="At least one origin stop ID is required.",
        )
    if not destination_ids:
        raise HTTPException(
            status_code=400,
            detail="At least one destination stop ID is required.",
        )
    if set(origin_ids) & set(destination_ids):
        raise HTTPException(
            status_code=400,
            detail="Origin and destination stops cannot overlap.",
        )
    journeys = find_connecting_routes(
        origin_ids,
        destination_ids,
        max_results=max_results,
        min_transfer_minutes=2,
        max_transfer_minutes=60,
    )
    return {
        "origin_stop_ids": origin_ids,
        "destination_stop_ids": destination_ids,
        "count": len(journeys),
        "journeys": journeys,
    }

# =====================================================
# REPORT VERIFICATION HELPERS
# =====================================================
def _normalize_report_text(text: str) -> str:
    text = (text or "").lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

def _description_similarity(first: str, second: str) -> float:
    first_normalized = _normalize_report_text(first)
    second_normalized = _normalize_report_text(second)
    if not first_normalized or not second_normalized:
        return 0.0
    return SequenceMatcher(
        None,
        first_normalized,
        second_normalized,
    ).ratio()

def _find_possible_duplicate(cursor, report: IssueReport):
    """
    Identify a possible recent duplicate without rejecting the report.
    Same route + stop + issue type, within 24 hours, with at least
    80% normalized description similarity.
    """
    cursor.execute(
        """
        SELECT
            id,
            route_id,
            stop_name,
            issue_type,
            description,
            reported_at
        FROM reports
        WHERE LOWER(TRIM(route_id)) = LOWER(TRIM(%s))
          AND LOWER(TRIM(stop_name)) = LOWER(TRIM(%s))
          AND issue_type = %s
        ORDER BY reported_at DESC
        LIMIT 20
        """,
        (
            report.route_id,
            report.stop_name,
            report.issue_type,
        ),
    )
    candidates = cursor.fetchall()
    best_match = None
    best_similarity = 0.0
    now = datetime.now()
    incoming = _normalize_report_text(report.description)
    for candidate in candidates:
        reported_at = candidate["reported_at"]
        if reported_at is not None:
            if reported_at.tzinfo is not None:
                reported_at = reported_at.replace(tzinfo=None)
            if now - reported_at > timedelta(hours=24):
                continue
        candidate_text = _normalize_report_text(
            candidate["description"]
        )
        if incoming and candidate_text and incoming == candidate_text:
            similarity = 1.0
        else:
            similarity = _description_similarity(
                report.description,
                candidate["description"],
            )
        if similarity >= 0.80 and similarity > best_similarity:
            best_match = candidate
            best_similarity = similarity
    if best_match is None:
        return None
    return {
        "report_id": best_match["id"],
        "similarity": round(best_similarity, 2),
        "reported_at": best_match["reported_at"],
    }

def _duplicate_message(duplicate):
    if not duplicate:
        return None
    similarity_percent = round(
        duplicate["similarity"] * 100
    )
    return (
        "This report may describe the same issue as a recent "
        f"report (#{duplicate['report_id']}, "
        f"{similarity_percent}% description similarity). "
        "It was still recorded because repeated passenger "
        "observations are valuable evidence."
    )

# =====================================================
# REPORTS
# =====================================================
@app.post("/reports")
def create_report(report: IssueReport):
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        possible_duplicate = _find_possible_duplicate(
            cursor,
            report,
        )
        query = """
            INSERT INTO reports
            (route_id, stop_name, issue_type, description)
            VALUES (%s, %s, %s, %s)
        """
        cursor.execute(
            query,
            (
                report.route_id,
                report.stop_name,
                report.issue_type,
                report.description,
            ),
        )
        connection.commit()
        report_id = cursor.lastrowid
        return {
            "message": "Issue reported successfully",
            "report": {
                "id": report_id,
                "route_id": report.route_id,
                "stop_name": report.stop_name,
                "issue_type": report.issue_type,
                "description": report.description,
                "status": "Reported",
            },
            "verification": {
                "possible_duplicate": possible_duplicate is not None,
                "duplicate_of_report_id": (
                    possible_duplicate["report_id"]
                    if possible_duplicate
                    else None
                ),
                "description_similarity": (
                    possible_duplicate["similarity"]
                    if possible_duplicate
                    else None
                ),
                "message": _duplicate_message(
                    possible_duplicate
                ),
            },
        }
    finally:
        cursor.close()
        connection.close()

# =====================================================
# GET REPORTS
# =====================================================
@app.get("/reports")
def get_reports():
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT
                id,
                route_id,
                stop_name,
                issue_type,
                description,
                reported_at,
                status
            FROM reports
            ORDER BY reported_at DESC
        """)
        reports = cursor.fetchall()
        return {
            "count": len(reports),
            "reports": reports,
        }
    finally:
        cursor.close()
        connection.close()

# =====================================================
# EVIDENCE STRENGTH
# =====================================================
@app.get("/reports/evidence")
def get_report_evidence():
    """
    Estimate evidence strength for recurring information problems.
    Grouping:
      route + stop + issue type
    Strength:
      Low    = 1 observation, or multiple on one calendar date
      Medium = 2+ observations across 2+ calendar dates
      High   = 5+ observations across 3+ calendar dates
    This is repeated-evidence strength, not truth or unique passenger count.
    """
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT
                id,
                route_id,
                stop_name,
                issue_type,
                reported_at
            FROM reports
            ORDER BY reported_at DESC
        """)
        rows = cursor.fetchall()
        groups = {}
        for row in rows:
            route_id = str(row["route_id"] or "").strip()
            stop_name = str(row["stop_name"] or "").strip()
            issue_type = str(
                row["issue_type"] or "OTHER"
            ).strip()
            if not route_id or not stop_name:
                continue
            key = (
                route_id.lower(),
                stop_name.lower(),
                issue_type,
            )
            if key not in groups:
                groups[key] = {
                    "route_id": route_id,
                    "stop_name": stop_name,
                    "issue_type": issue_type,
                    "report_ids": [],
                    "observation_dates": set(),
                    "latest_reported_at": None,
                    "oldest_reported_at": None,
                }
            group = groups[key]
            group["report_ids"].append(row["id"])
            if row["reported_at"] is not None:
                reported_at = row["reported_at"]
                group["observation_dates"].add(
                    reported_at.date().isoformat()
                )
                if (
                    group["latest_reported_at"] is None
                    or reported_at > group["latest_reported_at"]
                ):
                    group["latest_reported_at"] = reported_at
                if (
                    group["oldest_reported_at"] is None
                    or reported_at < group["oldest_reported_at"]
                ):
                    group["oldest_reported_at"] = reported_at
        results = []
        for group in groups.values():
            observation_count = len(
                group["report_ids"]
            )
            observation_period_count = len(
                group["observation_dates"]
            )
            if (
                observation_count >= 5
                and observation_period_count >= 3
            ):
                strength = "High"
                reason = (
                    "Repeated observations across at least "
                    "3 different calendar dates."
                )
            elif (
                observation_count >= 2
                and observation_period_count >= 2
            ):
                strength = "Medium"
                reason = (
                    "Repeated observations across at least "
                    "2 different calendar dates."
                )
            else:
                strength = "Low"
                reason = (
                    "Evidence is currently limited to one "
                    "observation period."
                )
            results.append({
                "route_id": group["route_id"],
                "stop_name": group["stop_name"],
                "issue_type": group["issue_type"],
                "observation_count": observation_count,
                "observation_period_count": observation_period_count,
                "observation_dates": sorted(
                    group["observation_dates"],
                    reverse=True,
                ),
                "latest_reported_at": group[
                    "latest_reported_at"
                ],
                "oldest_reported_at": group[
                    "oldest_reported_at"
                ],
                "evidence_strength": strength,
                "evidence_reason": reason,
            })
        strength_order = {
            "High": 0,
            "Medium": 1,
            "Low": 2,
        }
        results.sort(
            key=lambda item: (
                strength_order[item["evidence_strength"]],
                -item["observation_count"],
                -item["observation_period_count"],
            )
        )
        return {
            "count": len(results),
            "methodology": {
                "grouping": "Same route + same stop + same issue type.",
                "strength_rules": {
                    "Low": (
                        "1 observation, or multiple observations "
                        "on one date."
                    ),
                    "Medium": (
                        "2+ observations across 2+ calendar dates."
                    ),
                    "High": (
                        "5+ observations across 3+ calendar dates."
                    ),
                },
                "unique_passenger_identity": False,
                "note": (
                    "Evidence strength indicates repeated observed "
                    "evidence, not truth or unique passenger count."
                ),
            },
            "evidence": results,
        }
    finally:
        cursor.close()
        connection.close()

# =====================================================
# REPORT STATISTICS
# =====================================================
@app.get("/reports/stats")
def get_report_stats():
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT COUNT(*) AS total_reports
            FROM reports
        """)
        total_reports = cursor.fetchone()["total_reports"]
        cursor.execute("""
            SELECT COUNT(DISTINCT route_id) AS affected_routes
            FROM reports
        """)
        affected_routes = cursor.fetchone()["affected_routes"]
        cursor.execute("""
            SELECT issue_type, COUNT(*) AS issue_count
            FROM reports
            GROUP BY issue_type
            ORDER BY issue_count DESC
            LIMIT 1
        """)
        common_issue = cursor.fetchone()
        cursor.execute("""
            SELECT stop_name, COUNT(*) AS report_count
            FROM reports
            GROUP BY stop_name
            ORDER BY report_count DESC
            LIMIT 1
        """)
        common_stop = cursor.fetchone()
        return {
            "total_reports": total_reports,
            "affected_routes": affected_routes,
            "most_common_issue": (
                common_issue["issue_type"]
                if common_issue
                else None
            ),
            "most_reported_stop": (
                common_stop["stop_name"]
                if common_stop
                else None
            ),
        }
    finally:
        cursor.close()
        connection.close()

# =====================================================
# ROUTE REPORT SUMMARY
# =====================================================
@app.get("/reports/routes")
def get_route_report_summary():
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT
                route_id,
                COUNT(*) AS report_count
            FROM reports
            GROUP BY route_id
            ORDER BY report_count DESC
        """)
        routes = cursor.fetchall()
        return {
            "count": len(routes),
            "routes": routes,
        }
    finally:
        cursor.close()
        connection.close()

# =====================================================
# ROUTE RELIABILITY
# =====================================================
@app.get("/reports/routes/reliability")
def get_route_reliability():
    """
    Information Health Score using:
      1. issue severity
      2. report recency
      3. repeated-evidence strength
    Evidence strength is applied transparently:
      Low    -> 1.00x
      Medium -> 1.10x
      High   -> 1.25x
    The multiplier means repeated observations across different dates
    contribute more evidence burden than an isolated observation.
    This remains an information-health indicator, NOT live arrival
    probability and NOT proof that an official service is incorrect.
    """
    from datetime import datetime, timezone
    import math
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    severity_weights = {
        "LIVE_DATA_MISSING": 10,
        "WRONG_BUS_INFORMATION": 15,
        "WRONG_ROUTE_INFORMATION": 20,
        "SCHEDULE_UNAVAILABLE": 8,
        "TRACKING_UNAVAILABLE": 12,
        "STOP_INFORMATION_WRONG": 15,
        "OTHER": 5,
    }
    evidence_multipliers = {
        "Low": 1.00,
        "Medium": 1.10,
        "High": 1.25,
    }
    calibration = 25.0
    def recency_factor(reported_at):
        if reported_at is None:
            return 1.0
        if reported_at.tzinfo is None:
            now = datetime.now()
            age_days = max(
                0.0,
                (now - reported_at).total_seconds() / 86400,
            )
        else:
            now = datetime.now(timezone.utc)
            age_days = max(
                0.0,
                (now - reported_at).total_seconds() / 86400,
            )
        return math.exp(-age_days / 30.0)
    try:
        cursor.execute("""
            SELECT
                id,
                route_id,
                stop_name,
                issue_type,
                reported_at
            FROM reports
            ORDER BY reported_at DESC
        """)
        rows = cursor.fetchall()
        # Build evidence groups first so each report knows the strength
        # of the recurring problem it belongs to.
        evidence_groups = {}
        for row in rows:
            route_id = str(row["route_id"] or "").strip()
            if not route_id:
                continue
            stop_name = str(
                row["stop_name"] or ""
            ).strip()
            issue_type = row["issue_type"] or "OTHER"
            key = (
                route_id.lower(),
                stop_name.lower(),
                issue_type,
            )
            if key not in evidence_groups:
                evidence_groups[key] = {
                    "report_count": 0,
                    "dates": set(),
                }
            evidence_groups[key]["report_count"] += 1
            if row["reported_at"] is not None:
                evidence_groups[key]["dates"].add(
                    row["reported_at"].date().isoformat()
                )
        def evidence_strength(group):
            count = group["report_count"]
            periods = len(group["dates"])
            if count >= 5 and periods >= 3:
                return "High"
            if count >= 2 and periods >= 2:
                return "Medium"
            return "Low"
        route_data = {}
        for row in rows:
            route_id = str(
                row["route_id"] or ""
            ).strip()
            if not route_id:
                continue
            stop_name = str(
                row["stop_name"] or ""
            ).strip()
            issue_type = row["issue_type"] or "OTHER"
            weight = severity_weights.get(
                issue_type,
                severity_weights["OTHER"],
            )
            recency = recency_factor(
                row["reported_at"]
            )
            group_key = (
                route_id.lower(),
                stop_name.lower(),
                issue_type,
            )
            strength = evidence_strength(
                evidence_groups[group_key]
            )
            multiplier = evidence_multipliers[strength]
            weighted_penalty = (
                weight
                * recency
                * multiplier
            )
            if route_id not in route_data:
                route_data[route_id] = {
                    "route_id": route_id,
                    "report_count": 0,
                    "weighted_issue_burden": 0.0,
                    "issue_breakdown": {},
                    "affected_stops": set(),
                    "evidence_strength_counts": {
                        "Low": 0,
                        "Medium": 0,
                        "High": 0,
                    },
                }
            route = route_data[route_id]
            route["report_count"] += 1
            route["weighted_issue_burden"] += weighted_penalty
            if stop_name:
                route["affected_stops"].add(stop_name)
            route["issue_breakdown"][issue_type] = (
                route["issue_breakdown"].get(
                    issue_type,
                    0,
                )
                + 1
            )
            route["evidence_strength_counts"][
                strength
            ] += 1
        results = []
        for route in route_data.values():
            burden = route["weighted_issue_burden"]
            score = round(
                100 / (1 + burden / calibration)
            )
            score = max(
                0,
                min(100, score),
            )
            if route["report_count"] < 3:
                confidence = "Low"
            elif route["report_count"] < 10:
                confidence = "Medium"
            else:
                confidence = "High"
            if score >= 80:
                status = "Good"
            elif score >= 60:
                status = "Needs Attention"
            else:
                status = "Poor"
            # Route-level evidence summary: use the strongest evidence
            # present on that route.
            if route["evidence_strength_counts"]["High"] > 0:
                route_evidence = "High"
            elif route["evidence_strength_counts"]["Medium"] > 0:
                route_evidence = "Medium"
            else:
                route_evidence = "Low"
            results.append({
                "route_id": route["route_id"],
                "report_count": route["report_count"],
                "affected_stop_count": len(
                    route["affected_stops"]
                ),
                "weighted_issue_burden": round(
                    burden,
                    2,
                ),
                "information_health_score": score,
                "status": status,
                "confidence": confidence,
                "evidence_strength": route_evidence,
                "evidence_strength_counts": route[
                    "evidence_strength_counts"
                ],
                "issue_breakdown": route[
                    "issue_breakdown"
                ],
            })
        results.sort(
            key=lambda route: (
                route["information_health_score"],
                -route["report_count"],
            )
        )
        return {
            "count": len(results),
            "methodology": {
                "description": (
                    "Passenger-reported information issue burden "
                    "with recency and repeated-evidence weighting."
                ),
                "not_a_live_arrival_probability": True,
                "confidence_rule": {
                    "Low": "1-2 reports",
                    "Medium": "3-9 reports",
                    "High": "10+ reports",
                },
                "severity_weights": severity_weights,
                "evidence_strength_multipliers": evidence_multipliers,
                "recency": (
                    "Exponential decay with a 30-day "
                    "characteristic time."
                ),
            },
            "routes": results,
        }
    finally:
        cursor.close()
        connection.close()
