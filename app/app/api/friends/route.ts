import { POST as orbit } from "../orbit/route";

// Old "Become friends" address (a page open since before 2026-11-15): now an orbit request.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  return orbit(new Request(req.url, { method: "POST", headers: req.headers, body: JSON.stringify({ ...body, action: "request" }) }));
}
