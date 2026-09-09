import csv
import math
from pathlib import Path


DATA_DIR = Path(__file__).resolve().parent.parent / "data"


# =====================================================
# ROUTES
# =====================================================

def load_routes():
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


def search_routes(query: str):
    routes = load_routes()

    query = query.strip().lower()

    if not query:
        return []

    return [
        route
        for route in routes
        if query in route["route_short_name"].lower()
    ]


# =====================================================
# ROUTE STOPS
# =====================================================

def get_route_stops(route_id: str):
    trips_file = DATA_DIR / "trips.txt"
    stop_times_file = DATA_DIR / "stop_times.txt"
    stops_file = DATA_DIR / "stops.txt"

    trips = {}

    with open(trips_file, "r", encoding="utf-8") as file:
        reader = csv.DictReader(file)

        for row in reader:
            if row["route_id"].lower() == route_id.lower():
                trips[row["trip_id"]] = row["direction_id"]

    if not trips:
        return []

    stops = {}

    with open(stops_file, "r", encoding="utf-8") as file:
        reader = csv.DictReader(file)

        for row in reader:
            stops[row["stop_id"]] = {
                "stop_id": row["stop_id"],
                "stop_name": row["stop_name"],
                "stop_lat": row["stop_lat"],
                "stop_lon": row["stop_lon"],
                "stop_desc": row.get("stop_desc", ""),
            }

    result = []

    with open(stop_times_file, "r", encoding="utf-8") as file:
        reader = csv.DictReader(file)

        for row in reader:

            if row["trip_id"] not in trips:
                continue

            stop_id = row["stop_id"]

            if stop_id not in stops:
                continue

            result.append({
                "direction_id": trips[row["trip_id"]],
                "stop_sequence": row["stop_sequence"],
                "stop_id": stop_id,
                "stop_name": stops[stop_id]["stop_name"],
                "stop_lat": stops[stop_id]["stop_lat"],
                "stop_lon": stops[stop_id]["stop_lon"],
                "stop_desc": stops[stop_id]["stop_desc"],
                "arrival_time": row["arrival_time"],
                "departure_time": row["departure_time"],
            })

    return result


# =====================================================
# ROUTE TRIPS
# =====================================================

def get_route_trips(route_id: str):
    trips_file = DATA_DIR / "trips.txt"

    trips = []

    with open(trips_file, "r", encoding="utf-8") as file:
        reader = csv.DictReader(file)

        for row in reader:

            if row["route_id"].lower() != route_id.lower():
                continue

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


# =====================================================
# STOP SEARCH
# =====================================================

def search_stops(query: str):
    """
    Search bus stops by stop name.

    Multiple physical GTFS stops may have the same display
    name, so each physical stop remains a separate result.
    """

    stops_file = DATA_DIR / "stops.txt"
    stop_times_file = DATA_DIR / "stop_times.txt"
    trips_file = DATA_DIR / "trips.txt"
    routes_file = DATA_DIR / "routes.txt"

    query = query.strip().lower()

    if not query:
        return []

    # -------------------------------------------------
    # Routes
    # -------------------------------------------------

    route_names = {}

    with open(routes_file, "r", encoding="utf-8") as file:
        reader = csv.DictReader(file)

        for row in reader:
            route_names[row["route_id"]] = row["route_short_name"]

    # -------------------------------------------------
    # Trips
    # -------------------------------------------------

    trip_routes = {}

    with open(trips_file, "r", encoding="utf-8") as file:
        reader = csv.DictReader(file)

        for row in reader:
            trip_routes[row["trip_id"]] = row["route_id"]

    # -------------------------------------------------
    # Matching stops
    # -------------------------------------------------

    matching_stops = {}

    with open(stops_file, "r", encoding="utf-8") as file:
        reader = csv.DictReader(file)

        for row in reader:

            stop_name = row["stop_name"]

            if query not in stop_name.lower():
                continue

            matching_stops[row["stop_id"]] = {
                "stop_id": row["stop_id"],
                "stop_name": stop_name,
                "stop_lat": row["stop_lat"],
                "stop_lon": row["stop_lon"],
                "stop_desc": row.get("stop_desc", ""),
                "route_ids": set(),
            }

    if not matching_stops:
        return []

    # -------------------------------------------------
    # Routes serving matching stops
    # -------------------------------------------------

    with open(stop_times_file, "r", encoding="utf-8") as file:
        reader = csv.DictReader(file)

        for row in reader:

            stop_id = row["stop_id"]

            if stop_id not in matching_stops:
                continue

            trip_id = row["trip_id"]

            if trip_id not in trip_routes:
                continue

            matching_stops[stop_id]["route_ids"].add(
                trip_routes[trip_id]
            )

    # -------------------------------------------------
    # Results
    # -------------------------------------------------

    results = []

    for stop in matching_stops.values():

        route_numbers = []

        for route_id in stop["route_ids"]:

            if route_id in route_names:
                route_numbers.append(route_names[route_id])

        route_numbers.sort()

        results.append({
            "stop_id": stop["stop_id"],
            "stop_name": stop["stop_name"],
            "stop_lat": stop["stop_lat"],
            "stop_lon": stop["stop_lon"],
            "stop_desc": stop["stop_desc"],
            "routes": route_numbers,
        })

    results.sort(
        key=lambda stop: (
            stop["stop_name"].lower(),
            stop["stop_desc"].lower(),
            stop["stop_lat"],
            stop["stop_lon"],
        )
    )

    return results


# =====================================================
# NEAREST STOPS
# =====================================================

def find_nearest_stops(
    latitude: float,
    longitude: float,
    limit: int = 5
):
    stops_file = DATA_DIR / "stops.txt"

    nearby_stops = []

    lat1 = math.radians(latitude)

    with open(stops_file, "r", encoding="utf-8") as file:
        reader = csv.DictReader(file)

        for row in reader:

            try:
                stop_lat = float(row["stop_lat"])
                stop_lon = float(row["stop_lon"])
            except (ValueError, TypeError):
                continue

            lat2 = math.radians(stop_lat)

            delta_lat = math.radians(stop_lat - latitude)
            delta_lon = math.radians(stop_lon - longitude)

            a = (
                math.sin(delta_lat / 2) ** 2
                + math.cos(lat1)
                * math.cos(lat2)
                * math.sin(delta_lon / 2) ** 2
            )

            distance_km = 6371 * 2 * math.atan2(
                math.sqrt(a),
                math.sqrt(1 - a),
            )

            nearby_stops.append({
                "stop_id": row["stop_id"],
                "stop_name": row["stop_name"],
                "stop_lat": row["stop_lat"],
                "stop_lon": row["stop_lon"],
                "stop_desc": row.get("stop_desc", ""),
                "distance_km": round(distance_km, 3),
            })

    nearby_stops.sort(
        key=lambda stop: stop["distance_km"]
    )

    return nearby_stops[:limit]


# =====================================================
# DIRECT JOURNEY SEARCH
# =====================================================

def find_direct_routes(
    origin_stop_ids,
    destination_stop_ids
):
    """
    Find scheduled trips that serve an origin stop and
    destination stop in the correct order.
    """

    trips_file = DATA_DIR / "trips.txt"
    stop_times_file = DATA_DIR / "stop_times.txt"
    routes_file = DATA_DIR / "routes.txt"

    if isinstance(origin_stop_ids, str):
        origin_stop_ids = [origin_stop_ids]

    if isinstance(destination_stop_ids, str):
        destination_stop_ids = [destination_stop_ids]

    origin_stop_ids = {
        str(stop_id).strip()
        for stop_id in origin_stop_ids
        if str(stop_id).strip()
    }

    destination_stop_ids = {
        str(stop_id).strip()
        for stop_id in destination_stop_ids
        if str(stop_id).strip()
    }

    if not origin_stop_ids or not destination_stop_ids:
        return []

    # -------------------------------------------------
    # Route names
    # -------------------------------------------------

    route_names = {}

    with open(routes_file, "r", encoding="utf-8") as file:
        reader = csv.DictReader(file)

        for row in reader:
            route_names[row["route_id"]] = row["route_short_name"]

    # -------------------------------------------------
    # Trips
    # -------------------------------------------------

    trip_routes = {}
    trip_directions = {}

    with open(trips_file, "r", encoding="utf-8") as file:
        reader = csv.DictReader(file)

        for row in reader:

            trip_id = row["trip_id"]

            trip_routes[trip_id] = row["route_id"]
            trip_directions[trip_id] = row["direction_id"]

    # -------------------------------------------------
    # Relevant stop times
    # -------------------------------------------------

    trip_stops = {}

    relevant_stop_ids = (
        origin_stop_ids |
        destination_stop_ids
    )

    with open(stop_times_file, "r", encoding="utf-8") as file:
        reader = csv.DictReader(file)

        for row in reader:

            if row["stop_id"] not in relevant_stop_ids:
                continue

            trip_id = row["trip_id"]

            try:
                sequence = int(row["stop_sequence"])
            except (ValueError, TypeError):
                continue

            if trip_id not in trip_stops:
                trip_stops[trip_id] = {
                    "origins": {},
                    "destinations": {},
                }

            record = {
                "sequence": sequence,
                "arrival_time": row["arrival_time"],
                "departure_time": row["departure_time"],
            }

            if row["stop_id"] in origin_stop_ids:
                trip_stops[trip_id]["origins"][
                    row["stop_id"]
                ] = record

            if row["stop_id"] in destination_stop_ids:
                trip_stops[trip_id]["destinations"][
                    row["stop_id"]
                ] = record

    # -------------------------------------------------
    # Match
    # -------------------------------------------------

    matches = {}

    for trip_id, trip_data in trip_stops.items():

        origins = trip_data["origins"]
        destinations = trip_data["destinations"]

        if not origins or not destinations:
            continue

        route_id = trip_routes.get(trip_id)

        if not route_id:
            continue

        valid_pairs = []

        for origin_stop_id, origin in origins.items():

            for destination_stop_id, destination in destinations.items():

                if origin["sequence"] >= destination["sequence"]:
                    continue

                valid_pairs.append(
                    (
                        origin_stop_id,
                        destination_stop_id,
                        origin,
                        destination,
                    )
                )

        if not valid_pairs:
            continue

        valid_pairs.sort(
            key=lambda pair: (
                pair[3]["sequence"] - pair[2]["sequence"],
                pair[2]["sequence"],
            )
        )

        (
            selected_origin_id,
            selected_destination_id,
            origin,
            destination,
        ) = valid_pairs[0]

        matches[trip_id] = {
            "route_id": route_id,
            "route_short_name": route_names.get(
                route_id,
                route_id,
            ),
            "trip_id": trip_id,
            "direction_id": trip_directions.get(trip_id),
            "origin_stop_id": selected_origin_id,
            "destination_stop_id": selected_destination_id,
            "origin_departure": origin["departure_time"],
            "destination_arrival": destination["arrival_time"],
        }

    results = list(matches.values())

    results.sort(
        key=lambda route: (
            route["route_short_name"],
            route["origin_departure"],
            route["destination_arrival"],
        )
    )

    return results


# =====================================================
# TIME HELPER
# =====================================================

def time_to_seconds(time_string: str):
    """
    Convert GTFS HH:MM:SS into seconds.

    GTFS can contain hours greater than 23, so we don't
    use datetime/time here.
    """

    try:
        hours, minutes, seconds = map(
            int,
            time_string.split(":")
        )

        return (
            hours * 3600
            + minutes * 60
            + seconds
        )

    except (ValueError, AttributeError):
        return None


# =====================================================
# CONNECTING JOURNEY SEARCH
# =====================================================

def find_connecting_routes(
    origin_stop_ids,
    destination_stop_ids,
    max_results=10,
    min_transfer_minutes=2,
    max_transfer_minutes=60,
):
    """
    Find journeys requiring exactly ONE transfer.

    Example:

        Origin
          ↓
        Bus 1
          ↓
      Transfer Stop
          ↓
        Bus 2
          ↓
      Destination

    The second bus must depart after the first bus arrives.

    This uses scheduled GTFS information only.
    It does not represent live bus availability.
    """

    trips_file = DATA_DIR / "trips.txt"
    stop_times_file = DATA_DIR / "stop_times.txt"
    routes_file = DATA_DIR / "routes.txt"
    stops_file = DATA_DIR / "stops.txt"

    # -------------------------------------------------
    # Normalize stop IDs
    # -------------------------------------------------

    if isinstance(origin_stop_ids, str):
        origin_stop_ids = [origin_stop_ids]

    if isinstance(destination_stop_ids, str):
        destination_stop_ids = [destination_stop_ids]

    origin_stop_ids = {
        str(stop_id).strip()
        for stop_id in origin_stop_ids
        if str(stop_id).strip()
    }

    destination_stop_ids = {
        str(stop_id).strip()
        for stop_id in destination_stop_ids
        if str(stop_id).strip()
    }

    if not origin_stop_ids or not destination_stop_ids:
        return []

    # -------------------------------------------------
    # Route names
    # -------------------------------------------------

    route_names = {}

    with open(routes_file, "r", encoding="utf-8") as file:
        reader = csv.DictReader(file)

        for row in reader:
            route_names[row["route_id"]] = row["route_short_name"]

    # -------------------------------------------------
    # Stop names
    # -------------------------------------------------

    stop_names = {}

    with open(stops_file, "r", encoding="utf-8") as file:
        reader = csv.DictReader(file)

        for row in reader:
            stop_names[row["stop_id"]] = row["stop_name"]

    # -------------------------------------------------
    # Trip information
    # -------------------------------------------------

    trip_routes = {}
    trip_directions = {}

    with open(trips_file, "r", encoding="utf-8") as file:
        reader = csv.DictReader(file)

        for row in reader:

            trip_id = row["trip_id"]

            trip_routes[trip_id] = row["route_id"]
            trip_directions[trip_id] = row["direction_id"]

    # -------------------------------------------------
    # Build trip stop sequences
    #
    # Only one pass through stop_times.txt.
    # -------------------------------------------------

    trip_stops = {}

    with open(stop_times_file, "r", encoding="utf-8") as file:
        reader = csv.DictReader(file)

        for row in reader:

            trip_id = row["trip_id"]

            try:
                sequence = int(row["stop_sequence"])
            except (ValueError, TypeError):
                continue

            arrival = row["arrival_time"]
            departure = row["departure_time"]

            arrival_seconds = time_to_seconds(arrival)
            departure_seconds = time_to_seconds(departure)

            if arrival_seconds is None or departure_seconds is None:
                continue

            if trip_id not in trip_stops:
                trip_stops[trip_id] = []

            trip_stops[trip_id].append({
                "stop_id": row["stop_id"],
                "sequence": sequence,
                "arrival_time": arrival,
                "departure_time": departure,
                "arrival_seconds": arrival_seconds,
                "departure_seconds": departure_seconds,
            })

    # -------------------------------------------------
    # Sort every trip by stop sequence
    # -------------------------------------------------

    for trip_id in trip_stops:
        trip_stops[trip_id].sort(
            key=lambda stop: stop["sequence"]
        )

    # -------------------------------------------------
    # Build stop → trip index
    #
    # This lets us quickly find buses serving a
    # transfer stop.
    # -------------------------------------------------

    stop_to_trips = {}

    for trip_id, stops in trip_stops.items():

        for stop in stops:

            stop_id = stop["stop_id"]

            if stop_id not in stop_to_trips:
                stop_to_trips[stop_id] = []

            stop_to_trips[stop_id].append(
                (trip_id, stop)
            )

    # -------------------------------------------------
    # Find possible first-leg trips
    # -------------------------------------------------

    first_leg_trips = []

    for trip_id, stops in trip_stops.items():

        route_id = trip_routes.get(trip_id)

        if not route_id:
            continue

        origin_records = [
            stop
            for stop in stops
            if stop["stop_id"] in origin_stop_ids
        ]

        if not origin_records:
            continue

        for origin in origin_records:

            # Every stop after the origin can potentially
            # become a transfer stop.

            for transfer in stops:

                if transfer["sequence"] <= origin["sequence"]:
                    continue

                first_leg_trips.append({
                    "trip_id": trip_id,
                    "route_id": route_id,
                    "route_short_name": route_names.get(
                        route_id,
                        route_id,
                    ),
                    "direction_id": trip_directions.get(
                        trip_id
                    ),
                    "origin": origin,
                    "transfer": transfer,
                })

    # -------------------------------------------------
    # Search second legs
    # -------------------------------------------------

    journeys = {}

    for first_leg in first_leg_trips:

        transfer = first_leg["transfer"]
        transfer_stop_id = transfer["stop_id"]

        possible_second_trips = stop_to_trips.get(
            transfer_stop_id,
            []
        )

        for second_trip_id, second_transfer in possible_second_trips:

            # Don't use the exact same trip for both legs.
            if second_trip_id == first_leg["trip_id"]:
                continue

            second_route_id = trip_routes.get(
                second_trip_id
            )

            if not second_route_id:
                continue

            second_stops = trip_stops.get(
                second_trip_id,
                []
            )

            # Find destination after transfer.
            destination_records = [
                stop
                for stop in second_stops
                if stop["stop_id"] in destination_stop_ids
                and stop["sequence"] > second_transfer["sequence"]
            ]

            if not destination_records:
                continue

            destination = min(
                destination_records,
                key=lambda stop: stop["sequence"]
            )

            # -------------------------------------------------
            # Transfer timing
            # -------------------------------------------------

            first_arrival = transfer["arrival_seconds"]
            second_departure = second_transfer[
                "departure_seconds"
            ]

            transfer_wait = (
                second_departure - first_arrival
            )

            min_wait = min_transfer_minutes * 60
            max_wait = max_transfer_minutes * 60

            if transfer_wait < min_wait:
                continue

            if transfer_wait > max_wait:
                continue

            # -------------------------------------------------
            # Total journey time
            # -------------------------------------------------

            origin_departure = first_leg[
                "origin"
            ]["departure_seconds"]

            destination_arrival = destination[
                "arrival_seconds"
            ]

            total_duration = (
                destination_arrival
                - origin_departure
            )

            if total_duration <= 0:
                continue

            # -------------------------------------------------
            # Unique journey key
            # -------------------------------------------------

            journey_key = (
                f"{first_leg['trip_id']}-"
                f"{second_trip_id}-"
                f"{transfer_stop_id}"
            )

            journeys[journey_key] = {
                "first_route_id": first_leg["route_id"],
                "first_route_short_name": first_leg[
                    "route_short_name"
                ],
                "first_trip_id": first_leg["trip_id"],
                "first_direction_id": first_leg[
                    "direction_id"
                ],

                "origin_stop_id": first_leg[
                    "origin"
                ]["stop_id"],

                "origin_stop_name": stop_names.get(
                    first_leg["origin"]["stop_id"],
                    first_leg["origin"]["stop_id"],
                ),

                "transfer_stop_id": transfer_stop_id,

                "transfer_stop_name": stop_names.get(
                    transfer_stop_id,
                    transfer_stop_id,
                ),

                "transfer_arrival": transfer["arrival_time"],

                "first_departure": first_leg[
                    "origin"
                ]["departure_time"],

                "second_route_id": second_route_id,

                "second_route_short_name": route_names.get(
                    second_route_id,
                    second_route_id,
                ),

                "second_trip_id": second_trip_id,

                "second_direction_id": trip_directions.get(
                    second_trip_id
                ),

                "second_departure": second_transfer[
                    "departure_time"
                ],

                "destination_stop_id": destination[
                    "stop_id"
                ],

                "destination_stop_name": stop_names.get(
                    destination["stop_id"],
                    destination["stop_id"],
                ),

                "destination_arrival": destination[
                    "arrival_time"
                ],

                "transfer_wait_minutes": round(
                    transfer_wait / 60,
                    1,
                ),

                "total_duration_minutes": round(
                    total_duration / 60,
                    1,
                ),
            }

    # -------------------------------------------------
    # Rank journeys
    #
    # Prefer shorter total travel time, then shorter
    # transfer waiting time.
    # -------------------------------------------------

    results = list(journeys.values())

    results.sort(
        key=lambda journey: (
            journey["total_duration_minutes"],
            journey["transfer_wait_minutes"],
        )
    )

    return results[:max_results]