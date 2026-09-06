from fastapi import FastAPI, Query
from pydantic import BaseModel
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware

from gtfs import (
    load_routes,
    search_routes,
    get_route_stops,
    get_route_trips,
)


app = FastAPI(
    title="BusFix Hyderabad API",
    description="Public transport information reliability platform",
    version="0.1.0",
)


# ---------------- CORS ----------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------- Report Model ----------------

class IssueReport(BaseModel):
    route_id: str
    stop_name: str
    issue_type: str
    description: str


# Temporary storage for reports
# Later we will replace this with PostgreSQL/Supabase.
reports = []


# ---------------- Basic Endpoints ----------------

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


# ---------------- Route Endpoints ----------------

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


# ---------------- Issue Reporting ----------------

@app.post("/reports")
def create_report(report: IssueReport):

    new_report = {
        "id": len(reports) + 1,
        "route_id": report.route_id,
        "stop_name": report.stop_name,
        "issue_type": report.issue_type,
        "description": report.description,
        "reported_at": datetime.now().isoformat(),
        "status": "Reported",
    }

    reports.append(new_report)

    return {
        "message": "Issue reported successfully",
        "report": new_report,
    }


@app.get("/reports")
def get_reports():
    return {
        "count": len(reports),
        "reports": reports,
    }