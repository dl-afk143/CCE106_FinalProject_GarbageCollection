const API_URL = "http://192.168.1.28:3000";

export async function testBackend() {
  const response = await fetch(`${API_URL}/test-db`);

  if (!response.ok) {
    throw new Error("Backend request failed");
  }

  return response.json();
}

export async function submitReport(report: {
  issue: string;
  description: string;
  photo: string | null;
  latitude: number;
  longitude: number;
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
