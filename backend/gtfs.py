import csv
from pathlib import Path


DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def load_routes():
    """
    Load route information from TGSRTC routes.txt.
    """

    routes_file = DATA_DIR / "routes.txt"

    routes = []

    with open(routes_file, "r", encoding="utf-8") as file:
        reader = csv.DictReader(file)

        for row in reader:
            routes.append({
                "route_id": row["route_id"],
                "route_short_name": row["route_short_name"],
                "agency_id": row["agency_id"],
                "route_type": row["route_type"],
            })

    return routes



def get_route_stops(route_id: str):
    """
    Get the ordered stops served by a route,
    separated by direction.
    """

    trips_file = DATA_DIR / "trips.txt"
    stop_times_file = DATA_DIR / "stop_times.txt"
    stops_file = DATA_DIR / "stops.txt"

    # Find trips belonging to this route
    trips = {}

    with open(trips_file, "r", encoding="utf-8") as file:
        reader = csv.DictReader(file)

        for row in reader:
            if row["route_id"].lower() == route_id.lower():
                trips[row["trip_id"]] = row["direction_id"]

    if not trips:
        return []

    # Load stop information
    stops = {}

    with open(stops_file, "r", encoding="utf-8") as file:
        reader = csv.DictReader(file)

        for row in reader:
            stops[row["stop_id"]] = {
                "stop_id": row["stop_id"],
                "stop_name": row["stop_name"],
                "stop_lat": row["stop_lat"],
                "stop_lon": row["stop_lon"],
            }

    # Get stops for each trip
    route_stop_times = []

    with open(stop_times_file, "r", encoding="utf-8") as file:
        reader = csv.DictReader(file)

        for row in reader:
            if row["trip_id"] in trips:
                route_stop_times.append({
                    "direction_id": trips[row["trip_id"]],
                    "stop_sequence": row["stop_sequence"],
                    "stop_id": row["stop_id"],
                    "arrival_time": row["arrival_time"],
                    "departure_time": row["departure_time"],
                })

    # Combine with stop information
    result = []

    for row in route_stop_times:
        stop_id = row["stop_id"]

        if stop_id in stops:
            result.append({
                "direction_id": row["direction_id"],
                "stop_sequence": row["stop_sequence"],
                "stop_id": stop_id,
                "stop_name": stops[stop_id]["stop_name"],
                "stop_lat": stops[stop_id]["stop_lat"],
                "stop_lon": stops[stop_id]["stop_lon"],
                "arrival_time": row["arrival_time"],
                "departure_time": row["departure_time"],
            })

    return result       

def search_routes(query: str):
    """
    Search routes by route number/name.
    """

    routes = load_routes()

    query = query.strip().lower()

    if not query:
        return []

    matching_routes = [
        route
        for route in routes
        if query in route["route_short_name"].lower()
    ]

    return matching_routes


def get_route_trips(route_id: str):
    """
    Get all trips belonging to a route.
    """

    trips_file = DATA_DIR / "trips.txt"

    trips = []

    with open(trips_file, "r", encoding="utf-8") as file:
        reader = csv.DictReader(file)

        for row in reader:
            if row["route_id"].lower() == route_id.lower():

                trip_name = row["trip_short_name"]

                parts = trip_name.split("_", 1)

                if len(parts) == 2:
                    route_description = parts[1].replace("_", " ")
                else:
                    route_description = trip_name

                trips.append({
                    "trip_id": row["trip_id"],
                    "service_id": row["service_id"],
                    "direction_id": row["direction_id"],
                    "trip_short_name": trip_name,
                    "route_description": route_description,
                })

    return trips