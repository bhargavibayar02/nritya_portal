import { envReady, issueSession, json, requireMethod, secureRequest, sessionCookie } from "../../lib/server.js";

export default function handler(req, res) {
  if (!requireMethod(req, res, "POST")) return;
  if (!envReady()) return json(res, 503, { error: "The portal is not configured. Set its server environment variables." });
  const { username, password } = req.body || {};
  if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
    return json(res, 401, { error: "That username and password do not match." });
  }
  return json(res, 200, { ok: true }, { "Set-Cookie": sessionCookie(issueSession(), undefined, secureRequest(req)) });
}
