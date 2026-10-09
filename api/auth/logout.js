import { json, requireMethod, secureRequest, sessionCookie } from "../../lib/server.js";

export default function handler(req, res) {
  if (!requireMethod(req, res, "POST")) return;
  return json(res, 200, { ok: true }, { "Set-Cookie": sessionCookie("", 0, secureRequest(req)) });
}
