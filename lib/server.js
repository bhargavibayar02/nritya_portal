import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "nritya_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

export function json(res, status, body, headers = {}) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  for (const [name, value] of Object.entries(headers)) res.setHeader(name, value);
  res.end(JSON.stringify(body));
}

export function envReady() {
  return ["ADMIN_USERNAME", "ADMIN_PASSWORD", "SESSION_SECRET", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]
    .every((key) => Boolean(process.env[key]));
}

function sign(value) {
  return createHmac("sha256", process.env.SESSION_SECRET).update(value).digest("base64url");
}

function cookieValue(req) {
  const cookie = req.headers.cookie || "";
  const entry = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`));
  return entry ? decodeURIComponent(entry.slice(COOKIE_NAME.length + 1)) : "";
}

export function issueSession() {
  const payload = Buffer.from(JSON.stringify({
    username: process.env.ADMIN_USERNAME,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function hasSession(req) {
  const [payload, signature, extra] = cookieValue(req).split(".");
  if (!payload || !signature || extra) return false;
  const expected = Buffer.from(sign(payload));
  const supplied = Buffer.from(signature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return false;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return session.username === process.env.ADMIN_USERNAME && session.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function sessionCookie(token, maxAge = SESSION_TTL_SECONDS, secure = true) {
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly;${secure ? " Secure;" : ""} SameSite=Strict; Path=/; Max-Age=${maxAge}`;
}

export function secureRequest(req) {
  return req.headers["x-forwarded-proto"] === "https" || req.socket?.encrypted === true;
}

export function requireMethod(req, res, method) {
  if (req.method === method) return true;
  json(res, 405, { error: "Method not allowed." }, { Allow: method });
  return false;
}

export async function supabaseRequest(path, options = {}) {
  const baseUrl = process.env.SUPABASE_URL.replace(/\/+$/, "");
  const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...options.headers
    }
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Supabase request failed (${response.status}): ${text}`);
  return text ? JSON.parse(text) : null;
}

export { COOKIE_NAME };
