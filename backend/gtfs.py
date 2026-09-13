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
def get_route_stops(route_id: str, direction_id: str | None = None):
    """
    Return the scheduled stops for ONE direction of a route.
    GTFS stores different journeys/directions as separate trips. The
    previous implementation collected stop_times from every trip, which
    made the frontend display:
        ... -> Secunderabad -> Medchal -> ...
    as if it were one continuous journey.
    We now:
      1. filter trips by route;
      2. optionally filter by direction_id;
      3. select one representative trip for that direction;
      4. return only that trip's ordered stops.
    This means the final stop of a direction is genuinely the final stop
    shown on the route page/map. The reverse direction is a separate view.
    """
    trips_file = DATA_DIR / "trips.txt"
    stop_times_file = DATA_DIR / "stop_times.txt"
    stops_file = DATA_DIR / "stops.txt"
    matching_trips = []
    with open(trips_file, "r", encoding="utf-8") as file:
        reader = csv.DictReader(file)
        for row in reader:
            if row["route_id"].lower() != route_id.lower():
                continue
            if (
                direction_id is not None
                and str(row["direction_id"]) != str(direction_id)
            ):
                continue
            matching_trips.append(row)
    if not matching_trips:
        return []
    # Use one representative trip. Stop ordering is structural route
    # information; scheduled times may differ between trips.
    representative_trip = matching_trips[0]
    trip_id = representative_trip["trip_id"]
    selected_direction = representative_trip["direction_id"]
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
            if row["trip_id"] != trip_id:
                continue
            stop_id = row["stop_id"]
            if stop_id not in stops:
                continue
            result.append({
                "direction_id": selected_direction,
                "stop_sequence": row["stop_sequence"],
                "stop_id": stop_id,
                "stop_name": stops[stop_id]["stop_name"],
                "stop_lat": stops[stop_id]["stop_lat"],
                "stop_lon": stops[stop_id]["stop_lon"],
                "stop_desc": stops[stop_id]["stop_desc"],
                "arrival_time": row["arrival_time"],
                "departure_time": row["departure_time"],
            })
    result.sort(
        key=lambda stop: int(stop["stop_sequence"])
        if str(stop["stop_sequence"]).isdigit()
        else 999999999
    )
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
def _load_calendar_services():
    """
    Load the GTFS weekly service calendar.
    Returns:
        {
            service_id: {
                "monday": bool,
                ...
                "start_date": "YYYYMMDD",
                "end_date": "YYYYMMDD",
            }
        }
    If calendar.txt is unavailable, return an empty dictionary.
    """
    calendar_file = DATA_DIR / "calendar.txt"
    if not calendar_file.exists():
        return {}
    services = {}
    with open(calendar_file, "r", encoding="utf-8") as file:
        reader = csv.DictReader(file)
        for row in reader:
            services[row["service_id"]] = {
                "monday": row.get("monday", "0") == "1",
                "tuesday": row.get("tuesday", "0") == "1",
                "wednesday": row.get("wednesday", "0") == "1",
                "thursday": row.get("thursday", "0") == "1",
                "friday": row.get("friday", "0") == "1",
                "saturday": row.get("saturday", "0") == "1",
                "sunday": row.get("sunday", "0") == "1",
                "start_date": row.get("start_date", ""),
                "end_date": row.get("end_date", ""),
            }
    return services

def _service_runs_on_date(service, target_date):
    """
    Check whether a regular GTFS calendar service runs on target_date.
    """
    if not service:
        return True
    date_string = target_date.strftime("%Y%m%d")
    start_date = service.get("start_date", "")
    end_date = service.get("end_date", "")
    if start_date and date_string < start_date:
        return False
    if end_date and date_string > end_date:
        return False
    weekday_names = [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
    ]
    return service.get(
        weekday_names[target_date.weekday()],
        False,
    )

def _is_service_active_today(service_id, services, target_date):
    """
    Check the regular weekly calendar.
    calendar_dates.txt is also honored when present:
        exception_type=1 -> service added
        exception_type=2 -> service removed
    """
    regular_service = services.get(service_id)
    runs = _service_runs_on_date(
        regular_service,
        target_date,
    )
    calendar_dates_file = DATA_DIR / "calendar_dates.txt"
    if calendar_dates_file.exists():
        date_string = target_date.strftime("%Y%m%d")
        with open(
            calendar_dates_file,
            "r",
            encoding="utf-8",
        ) as file:
            reader = csv.DictReader(file)
            for row in reader:
                if row.get("service_id") != service_id:
                    continue
                if row.get("date") != date_string:
                    continue
                exception_type = row.get("exception_type")
                if exception_type == "1":
                    runs = True
                elif exception_type == "2":
                    runs = False
    return runs

def find_direct_routes(
    origin_stop_ids,
    destination_stop_ids,
    target_date=None,
    now=None,
    max_routes=20,
    upcoming_only=True,
):
    """
    Find direct scheduled bus routes from the requested origin to
    destination.
    Important behavior:
    - A route number is returned ONCE, not once per trip.
    - Origin must occur before destination in the same trip.
      This prevents reverse-direction trips from being returned.
    - Only services operating on the requested date are considered.
    - By default, only trips whose departure has not already passed
      are considered.
    - For each route number, the next scheduled trip is returned.
    - This is scheduled GTFS data, not live vehicle tracking.
    Args:
        target_date:
            Date to search. Defaults to today's local date.
        now:
            Current local time. Defaults to datetime.now().
            Pass a datetime when testing.
        max_routes:
            Maximum number of unique route numbers returned.
        upcoming_only:
            If True, only departures at/after now are considered.
    Returns one result per bus route number.
    """
    from datetime import datetime
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
    if target_date is None:
        target_date = datetime.now().date()
    if now is None:
        now = datetime.now()
    # -------------------------------------------------
    # Current time in GTFS seconds.
    #
    # GTFS may contain hours > 23, so normal datetime
    # parsing is intentionally avoided.
    # -------------------------------------------------
    current_seconds = (
        now.hour * 3600
        + now.minute * 60
        + now.second
    )
    # -------------------------------------------------
    # Route names
    # -------------------------------------------------
    route_names = {}
    with open(routes_file, "r", encoding="utf-8") as file:
        reader = csv.DictReader(file)
        for row in reader:
            route_names[row["route_id"]] = row["route_short_name"]
    # -------------------------------------------------
    # Active services for today
    # -------------------------------------------------
    services = _load_calendar_services()
    # -------------------------------------------------
    # Trips
    # -------------------------------------------------
    trip_info = {}
    with open(trips_file, "r", encoding="utf-8") as file:
        reader = csv.DictReader(file)
        for row in reader:
            trip_id = row["trip_id"]
            service_id = row["service_id"]
            if not _is_service_active_today(
                service_id,
                services,
                target_date,
            ):
                continue
            trip_info[trip_id] = {
                "route_id": row["route_id"],
                "direction_id": row["direction_id"],
                "service_id": service_id,
            }
    if not trip_info:
        return []
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
            trip_id = row["trip_id"]
            if trip_id not in trip_info:
                continue
            if row["stop_id"] not in relevant_stop_ids:
                continue
            try:
                sequence = int(row["stop_sequence"])
            except (ValueError, TypeError):
                continue
            arrival_seconds = time_to_seconds(
                row["arrival_time"]
            )
            departure_seconds = time_to_seconds(
                row["departure_time"]
            )
            if (
                arrival_seconds is None
                or departure_seconds is None
            ):
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
                "arrival_seconds": arrival_seconds,
                "departure_seconds": departure_seconds,
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
    # Match valid trips
    # -------------------------------------------------
    route_candidates = {}
    for trip_id, trip_data in trip_stops.items():
        origins = trip_data["origins"]
        destinations = trip_data["destinations"]
        if not origins or not destinations:
            continue
        trip = trip_info.get(trip_id)
        if not trip:
            continue
        route_id = trip["route_id"]
        valid_pairs = []
        for origin_stop_id, origin in origins.items():
            for destination_stop_id, destination in destinations.items():
                # THIS is the direction protection.
                #
                # If the trip reaches Bowenpally first and
                # Secunderabad later, it cannot satisfy:
                #
                # Secunderabad -> Bowenpally
                #
                # because origin sequence >= destination sequence.
                if origin["sequence"] >= destination["sequence"]:
                    continue
                # Don't show a trip that has already departed.
                if (
                    upcoming_only
                    and origin["departure_seconds"] < current_seconds
                ):
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
        # Prefer the pair with the earliest departure.
        valid_pairs.sort(
            key=lambda pair: (
                pair[2]["departure_seconds"],
                pair[2]["sequence"],
            )
        )
        (
            selected_origin_id,
            selected_destination_id,
            origin,
            destination,
        ) = valid_pairs[0]
        candidate = {
            "route_id": route_id,
            "route_short_name": route_names.get(
                route_id,
                route_id,
            ),
            "trip_id": trip_id,
            "direction_id": trip["direction_id"],
            "origin_stop_id": selected_origin_id,
            "destination_stop_id": selected_destination_id,
            "origin_departure": origin["departure_time"],
            "destination_arrival": destination["arrival_time"],
            "origin_departure_seconds": origin[
                "departure_seconds"
            ],
        }
        route_candidates.setdefault(
            route_id,
            []
        ).append(candidate)
    # -------------------------------------------------
    # ONE result per route number
    #
    # A route can have many trips, but the passenger
    # should see the route number once.
    # -------------------------------------------------
    results = []
    for route_id, candidates in route_candidates.items():
        candidates.sort(
            key=lambda route: (
                route["origin_departure_seconds"],
                route["destination_arrival"],
            )
        )
        selected = candidates[0]
        # Keep a small number of upcoming scheduled times
        # for future UI use, while still returning only one
        # card per bus number.
        upcoming_times = [
            candidate["origin_departure"]
            for candidate in candidates[:5]
        ]
        results.append({
            "route_id": selected["route_id"],
            "route_short_name": selected[
                "route_short_name"
            ],
            "trip_id": selected["trip_id"],
            "direction_id": selected["direction_id"],
            "origin_stop_id": selected[
                "origin_stop_id"
            ],
            "destination_stop_id": selected[
                "destination_stop_id"
            ],
            "origin_departure": selected[
                "origin_departure"
            ],
            "destination_arrival": selected[
                "destination_arrival"
            ],
            # New passenger-friendly fields.
            "next_departure": selected[
                "origin_departure"
            ],
            "next_arrival": selected[
                "destination_arrival"
            ],
            "upcoming_departures": upcoming_times,
            # Helpful for debugging/testing; the frontend
            # does not need to display this.
            "scheduled_trip_count": len(candidates),
        })
    # -------------------------------------------------
    # Sort by next bus time.
    #
    # This is more useful to a passenger than sorting
    # alphabetically by route number.
    # -------------------------------------------------
    results.sort(
        key=lambda route: (
            time_to_seconds(
                route["next_departure"]
            )
            if time_to_seconds(
                route["next_departure"]
            ) is not None
            else 999999999,
            route["route_short_name"],
        )
    )
    return results[:max_routes]

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

# =====================================================
# ALTERNATIVE JOURNEY SEARCH
# =====================================================
def find_alternative_journeys(
    origin_stop_ids,
    destination_stop_ids,
    max_results=10,
    max_walk_km=0.8,
    walking_speed_kmh=4.8,
    min_transfer_minutes=1,
    max_transfer_minutes=60,
):
    """
    Find practical journeys when NO direct bus exists.
    Supported patterns:
        BUS -> BUS
        BUS -> WALK -> BUS
    The search uses the actual GTFS stop sequence to find:
        origin -> transfer area -> destination
    Two transfer stops are considered connected by walking when
    their geographic distance is within max_walk_km.
    This uses scheduled GTFS information only.
    It does not represent live bus availability.
    """
    trips_file = DATA_DIR / "trips.txt"
    stop_times_file = DATA_DIR / "stop_times.txt"
    routes_file = DATA_DIR / "routes.txt"
    stops_file = DATA_DIR / "stops.txt"
    # -------------------------------------------------
    # Normalize IDs
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
    # Routes
    # -------------------------------------------------
    route_names = {}
    with open(routes_file, "r", encoding="utf-8") as file:
        reader = csv.DictReader(file)
        for row in reader:
            route_names[row["route_id"]] = row["route_short_name"]
    # -------------------------------------------------
    # Stops
    # -------------------------------------------------
    stop_info = {}
    with open(stops_file, "r", encoding="utf-8") as file:
        reader = csv.DictReader(file)
        for row in reader:
            try:
                lat = float(row["stop_lat"])
                lon = float(row["stop_lon"])
            except (ValueError, TypeError):
                continue
            stop_info[row["stop_id"]] = {
                "stop_id": row["stop_id"],
                "stop_name": row["stop_name"],
                "lat": lat,
                "lon": lon,
            }
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
    # Build complete trip sequences
    # -------------------------------------------------
    trip_stops = {}
    with open(stop_times_file, "r", encoding="utf-8") as file:
        reader = csv.DictReader(file)
        for row in reader:
            trip_id = row["trip_id"]
            if trip_id not in trip_routes:
                continue
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
            if row["stop_id"] not in stop_info:
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
    for trip_id in trip_stops:
        trip_stops[trip_id].sort(
            key=lambda stop: stop["sequence"]
        )
    # -------------------------------------------------
    # Candidate first legs
    #
    # A first leg must start at one of the selected
    # origin stops and continue to at least one later
    # stop.
    # -------------------------------------------------
    first_legs = []
    for trip_id, stops in trip_stops.items():
        route_id = trip_routes.get(trip_id)
        if not route_id or len(stops) < 2:
            continue
        origins = [
            stop
            for stop in stops
            if stop["stop_id"] in origin_stop_ids
        ]
        if not origins:
            continue
        for origin in origins:
            for transfer in stops:
                if transfer["sequence"] <= origin["sequence"]:
                    continue
                # Don't use a destination as the transfer point.
                if transfer["stop_id"] in destination_stop_ids:
                    continue
                first_legs.append({
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
    if not first_legs:
        return []
    # -------------------------------------------------
    # Candidate second legs
    #
    # A second leg must reach the destination after
    # leaving its boarding/transfer stop.
    # -------------------------------------------------
    second_legs = []
    for trip_id, stops in trip_stops.items():
        route_id = trip_routes.get(trip_id)
        if not route_id or len(stops) < 2:
            continue
        destinations = [
            stop
            for stop in stops
            if stop["stop_id"] in destination_stop_ids
        ]
        if not destinations:
            continue
        for destination in destinations:
            for transfer in stops:
                if transfer["sequence"] >= destination["sequence"]:
                    continue
                if transfer["stop_id"] in origin_stop_ids:
                    continue
                second_legs.append({
                    "trip_id": trip_id,
                    "route_id": route_id,
                    "route_short_name": route_names.get(
                        route_id,
                        route_id,
                    ),
                    "direction_id": trip_directions.get(
                        trip_id
                    ),
                    "transfer": transfer,
                    "destination": destination,
                })
    if not second_legs:
        return []
    # -------------------------------------------------
    # Group second legs by stop
    # -------------------------------------------------
    second_by_stop = {}
    for leg in second_legs:
        stop_id = leg["transfer"]["stop_id"]
        if stop_id not in second_by_stop:
            second_by_stop[stop_id] = []
        second_by_stop[stop_id].append(leg)
    # -------------------------------------------------
    # Build a compact list of possible second-leg
    # transfer stops for geographic matching.
    # -------------------------------------------------
    second_stop_ids = [
        stop_id
        for stop_id in second_by_stop
        if stop_id in stop_info
    ]
    # -------------------------------------------------
    # Haversine distance helper
    # -------------------------------------------------
    def distance_km(stop_a, stop_b):
        lat1 = math.radians(stop_a["lat"])
        lat2 = math.radians(stop_b["lat"])
        delta_lat = math.radians(
            stop_b["lat"] - stop_a["lat"]
        )
        delta_lon = math.radians(
            stop_b["lon"] - stop_a["lon"]
        )
        a = (
            math.sin(delta_lat / 2) ** 2
            + math.cos(lat1)
            * math.cos(lat2)
            * math.sin(delta_lon / 2) ** 2
        )
        return 6371 * 2 * math.atan2(
            math.sqrt(a),
            math.sqrt(1 - a),
        )
    # -------------------------------------------------
    # Cache walking distances because many trips can
    # share the same physical transfer stops.
    # -------------------------------------------------
    walking_cache = {}
    def get_walking_distance(stop_a_id, stop_b_id):
        key = tuple(sorted((stop_a_id, stop_b_id)))
        if key in walking_cache:
            return walking_cache[key]
        if (
            stop_a_id not in stop_info
            or stop_b_id not in stop_info
        ):
            return None
        distance = distance_km(
            stop_info[stop_a_id],
            stop_info[stop_b_id],
        )
        walking_cache[key] = distance
        return distance
    # -------------------------------------------------
    # Search and rank journeys
    # -------------------------------------------------
    journeys = {}
    for first_leg in first_legs:
        first_transfer_id = first_leg["transfer"]["stop_id"]
        if first_transfer_id not in stop_info:
            continue
        # Only compare against physically nearby second-leg
        # boarding stops.
        for second_transfer_id in second_stop_ids:
            walk_km = get_walking_distance(
                first_transfer_id,
                second_transfer_id,
            )
            if walk_km is None or walk_km > max_walk_km:
                continue
            walk_minutes = (
                walk_km / walking_speed_kmh * 60
            )
            first_arrival = first_leg["transfer"][
                "arrival_seconds"
            ]
            for second_leg in second_by_stop[
                second_transfer_id
            ]:
                if (
                    second_leg["trip_id"]
                    == first_leg["trip_id"]
                ):
                    continue
                # The second bus must depart late enough for
                # the passenger to complete the walk.
                second_departure = second_leg[
                    "transfer"
                ]["departure_seconds"]
                available_time = (
                    second_departure
                    - first_arrival
                )
                minimum_required = (
                    walk_minutes
                    + min_transfer_minutes
                ) * 60
                if available_time < minimum_required:
                    continue
                if available_time > (
                    max_transfer_minutes * 60
                ):
                    continue
                origin_departure = first_leg[
                    "origin"
                ]["departure_seconds"]
                destination_arrival = second_leg[
                    "destination"
                ]["arrival_seconds"]
                total_duration = (
                    destination_arrival
                    - origin_departure
                )
                if total_duration <= 0:
                    continue
                wait_after_walk = (
                    available_time
                    - walk_minutes * 60
                )
                journey_type = (
                    "BUS_BUS"
                    if first_transfer_id == second_transfer_id
                    else "BUS_WALK_BUS"
                )
                journey_key = (
                    first_leg["trip_id"],
                    second_leg["trip_id"],
                    first_transfer_id,
                    second_transfer_id,
                    second_leg["destination"]["stop_id"],
                )
                journeys[journey_key] = {
                    "journey_type": journey_type,
                    "first_route_id": first_leg[
                        "route_id"
                    ],
                    "first_route_short_name": first_leg[
                        "route_short_name"
                    ],
                    "first_trip_id": first_leg[
                        "trip_id"
                    ],
                    "first_direction_id": first_leg[
                        "direction_id"
                    ],
                    "origin_stop_id": first_leg[
                        "origin"
                    ]["stop_id"],
                    "origin_stop_name": stop_info[
                        first_leg["origin"]["stop_id"]
                    ]["stop_name"],
                    "first_departure": first_leg[
                        "origin"
                    ]["departure_time"],
                    "first_transfer_stop_id":
                        first_transfer_id,
                    "first_transfer_stop_name":
                        stop_info[first_transfer_id][
                            "stop_name"
                        ],
                    "first_transfer_arrival":
                        first_leg["transfer"][
                            "arrival_time"
                        ],
                    "walk_distance_km": round(
                        walk_km,
                        3,
                    ),
                    "walk_minutes": round(
                        walk_minutes,
                        1,
                    ),
                    "second_transfer_stop_id":
                        second_transfer_id,
                    "second_transfer_stop_name":
                        stop_info[second_transfer_id][
                            "stop_name"
                        ],
                    "second_departure":
                        second_leg["transfer"][
                            "departure_time"
                        ],
                    "second_route_id": second_leg[
                        "route_id"
                    ],
                    "second_route_short_name":
                        second_leg[
                            "route_short_name"
                        ],
                    "second_trip_id": second_leg[
                        "trip_id"
                    ],
                    "second_direction_id":
                        second_leg[
                            "direction_id"
                        ],
                    "destination_stop_id":
                        second_leg["destination"][
                            "stop_id"
                        ],
                    "destination_stop_name":
                        stop_info[
                            second_leg["destination"][
                                "stop_id"
                            ]
                        ]["stop_name"],
                    "destination_arrival":
                        second_leg["destination"][
                            "arrival_time"
                        ],
                    "wait_after_walk_minutes": round(
                        wait_after_walk / 60,
                        1,
                    ),
                    "total_duration_minutes": round(
                        total_duration / 60,
                        1,
                    ),
                }
    # -------------------------------------------------
    # Rank:
    # 1. total journey time
    # 2. walking time
    # 3. waiting after walking
    # -------------------------------------------------
    results = list(journeys.values())
    results.sort(
        key=lambda journey: (
            journey["total_duration_minutes"],
            journey["walk_minutes"],
            journey["wait_after_walk_minutes"],
        )
    )
    return results[:max_results]
