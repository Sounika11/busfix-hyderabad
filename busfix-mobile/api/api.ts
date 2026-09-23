// =====================================================
// BUSFIX MOBILE API CONFIGURATION
// =====================================================

// Current local FastAPI backend.
// Change ONLY this line when the backend address changes
// or when we deploy the backend.
export const API_BASE_URL = "http://175.16.28.213:8000";


// =====================================================
// HEALTH CHECK
// =====================================================

export async function checkBackendHealth() {
  const response = await fetch(`${API_BASE_URL}/health`);

  if (!response.ok) {
    throw new Error("Backend health check failed");
  }

  return response.json();
}


// =====================================================
// STOP SEARCH
// =====================================================

export async function searchStops(query: string) {
  const response = await fetch(
    `${API_BASE_URL}/stops/search?q=${encodeURIComponent(query)}`
  );

  if (!response.ok) {
    throw new Error("Failed to search stops");
  }

  return response.json();
}


// =====================================================
// BUILD JOURNEY STOP QUERY
// =====================================================

function buildStopQuery(
  endpoint: string,
  originStopIds: string[],
  destinationStopIds: string[]
) {
  const params = new URLSearchParams();

  originStopIds.forEach((id) => {
    params.append("origin_stop_id", id);
  });

  destinationStopIds.forEach((id) => {
    params.append("destination_stop_id", id);
  });

  return `${API_BASE_URL}${endpoint}?${params.toString()}`;
}


// =====================================================
// DIRECT JOURNEYS
// =====================================================

export async function findDirectJourneys(
  originStopIds: string[],
  destinationStopIds: string[]
) {
  const url = buildStopQuery(
    "/journey/direct",
    originStopIds,
    destinationStopIds
  );

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Failed to find direct journeys");
  }

  return response.json();
}


// =====================================================
// ALTERNATIVE JOURNEYS
// =====================================================

export async function findAlternativeJourneys(
  originStopIds: string[],
  destinationStopIds: string[]
) {
  const params = new URLSearchParams();

  originStopIds.forEach((id) => {
    params.append("origin_stop_id", id);
  });

  destinationStopIds.forEach((id) => {
    params.append("destination_stop_id", id);
  });

  params.append("max_results", "10");

  const response = await fetch(
    `${API_BASE_URL}/journey/alternative?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error("Failed to find alternative journeys");
  }

  return response.json();
}


// =====================================================
// SUBMIT PASSENGER REPORT
// =====================================================

export async function submitReport(report: {
  route_id: string;
  stop_name: string;
  issue_type: string;
  description: string;
}) {
  const response = await fetch(`${API_BASE_URL}/reports`, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify(report),
  });

  if (!response.ok) {
    throw new Error("Failed to submit report");
  }

  return response.json();
}


// =====================================================
// INFORMATION HEALTH
// =====================================================

export async function getNetworkReliability() {
  const response = await fetch(
    `${API_BASE_URL}/reports/routes/reliability`
  );

  if (!response.ok) {
    throw new Error("Failed to load reliability data");
  }

  return response.json();
}


// =====================================================
// NEARBY STOPS / GPS
// =====================================================

export async function getNearbyStops(
  lat: number,
  lon: number
) {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString(),
  });

  const response = await fetch(
    `${API_BASE_URL}/stops/nearby?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error("Failed to find nearby stops");
  }

  return response.json();
}


// =====================================================
// ROUTE STOPS / MAP
// =====================================================

export async function getRouteStops(
  routeId: string,
  directionId?: string
) {
  let url = `${API_BASE_URL}/routes/${encodeURIComponent(
    routeId
  )}/stops`;

  if (directionId !== undefined) {
    url += `?direction_id=${encodeURIComponent(
      directionId
    )}`;
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Failed to load route stops");
  }

  return response.json();
}