const CLIENT_ID = Deno.env.get("GOOGLE_CALENDAR_CLIENT_ID");
const CLIENT_SECRET = Deno.env.get("GOOGLE_CALENDAR_CLIENT_SECRET");
const REFRESH_TOKEN = Deno.env.get("GOOGLE_REFRESH_TOKEN");
export async function getGoogleAccessToken() {
  const tokenUrl = "https://oauth2.googleapis.com/token";
  const params = new URLSearchParams();
  params.append("client_id", CLIENT_ID);
  params.append("client_secret", CLIENT_SECRET);
  params.append("refresh_token", REFRESH_TOKEN);
  params.append("grant_type", "refresh_token");
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params.toString()
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to get access token: ${res.status} ${errText}`);
  }
  const data = await res.json();
  return data.access_token;
}
