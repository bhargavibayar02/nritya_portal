import { hasSession, json, requireMethod } from "../../lib/server.js";

export default function handler(req, res) {
  if (!requireMethod(req, res, "GET")) return;
  return json(res, 200, { authenticated: hasSession(req) });
}
