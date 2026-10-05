const API_URL = "http://192.168.1.28:3000";

// ==========================================
// TEST BACKEND
// ==========================================

export async function testBackend() {
  const response = await fetch(`${API_URL}/test-db`);

  if (!response.ok) {
    throw new Error("Backend request failed");
  }

  return response.json();
}

// ==========================================
// SUBMIT REPORT
// ==========================================

export async function submitReport(report: {
  userId: number;
  issue: string;
  description: string;
  photo: string | null;
  latitude: number;
  longitude: number;
  placeName: string;
  placeAddress: string;
  area: string;
  collectionDate: string;
  collectionTime: string;
  wasteType: string;
  status: string;
}) {
  const response = await fetch(`${API_URL}/reports`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(report),
  });

  const text = await response.text();

  console.log("REPORT SERVER STATUS:", response.status);
  console.log("REPORT SERVER RESPONSE:", text);

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `Server returned invalid response (${response.status}): ${text}`,
    );
  }

  if (!response.ok) {
    throw new Error(data.message || "Failed to submit report");
  }

  return data;
}

// ==========================================
// GET MY REPORTS
// ==========================================

export async function getMyReports(userId: number) {
  const response = await fetch(`${API_URL}/reports/my-reports/${userId}`);

  const text = await response.text();

  console.log("MY REPORTS SERVER STATUS:", response.status);
  console.log("MY REPORTS SERVER RESPONSE:", text);

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `Server returned invalid response (${response.status}): ${text}`,
    );
  }

  if (!response.ok) {
    throw new Error(data.message || "Failed to get reports");
  }

  return data.reports;
}

// ==========================================
// SEARCH GOOGLE PLACES
// ==========================================

export async function searchPlaces(input: string) {
  const response = await fetch(`${API_URL}/places/autocomplete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input,
    }),
  });

  const text = await response.text();

  console.log("PLACES SEARCH STATUS:", response.status);
  console.log("PLACES SEARCH RESPONSE:", text);

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Invalid Places response (${response.status}): ${text}`);
  }

  if (!response.ok) {
    throw new Error(data.message || "Failed to search places.");
  }

  return data.suggestions || [];
}

// ==========================================
// GET GOOGLE PLACE DETAILS
// ==========================================

export async function getPlaceDetails(placeId: string) {
  const response = await fetch(
    `${API_URL}/places/details/${encodeURIComponent(placeId)}`,
  );

  const text = await response.text();

  console.log("PLACE DETAILS STATUS:", response.status);
  console.log("PLACE DETAILS RESPONSE:", text);

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `Invalid Place Details response (${response.status}): ${text}`,
    );
  }

  if (!response.ok) {
    throw new Error(data.message || "Failed to get place details.");
  }

  return data.place;
}
