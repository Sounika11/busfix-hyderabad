from fastapi import FastAPI, Query, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

from gtfs import (
    load_routes,
    search_routes,
    get_route_stops,
    get_route_trips,
    search_stops,
    find_nearest_stops,
    find_direct_routes,
    find_connecting_routes,
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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
def get_stops_for_route(route_id: str):

    stops = get_route_stops(route_id)

    return {
        "route_id": route_id,
        "count": len(stops),
        "stops": stops
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
# REPORTS
# =====================================================

@app.post("/reports")
def create_report(report: IssueReport):

    connection = get_db_connection()
    cursor = connection.cursor()

    try:

        query = """
            INSERT INTO reports
            (route_id, stop_name, issue_type, description)
            VALUES (%s, %s, %s, %s)
        """

        values = (
            report.route_id,
            report.stop_name,
            report.issue_type,
            report.description,
        )

        cursor.execute(query, values)
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

    try:

        cursor.execute("""
            SELECT
                route_id,
                issue_type,
                COUNT(*) AS issue_count
            FROM reports
            GROUP BY route_id, issue_type
        """)

        rows = cursor.fetchall()

        route_data = {}

        for row in rows:

            route_id = row["route_id"]
            issue_type = row["issue_type"]
            issue_count = row["issue_count"]

            weight = severity_weights.get(
                issue_type,
                5
            )

            penalty = issue_count * weight

            if route_id not in route_data:
                route_data[route_id] = {
                    "route_id": route_id,
                    "report_count": 0,
                    "penalty": 0,
                }

            route_data[route_id]["report_count"] += issue_count
            route_data[route_id]["penalty"] += penalty

        results = []

        for route in route_data.values():

            score = max(
                0,
                100 - route["penalty"]
            )

            if score >= 80:
                status = "Good"
            elif score >= 60:
                status = "Needs Attention"
            else:
                status = "Poor"

            results.append({
                "route_id": route["route_id"],
                "report_count": route["report_count"],
                "penalty": route["penalty"],
                "information_health_score": score,
                "status": status,
            })

        results.sort(
            key=lambda route:
            route["information_health_score"]
        )

        return {
            "count": len(results),
            "routes": results,
        }

    finally:

        cursor.close()
        connection.close()