import { randomUUID } from "node:crypto";
import { envReady, hasSession, json, supabaseRequest } from "../lib/server.js";

const KINDS = new Set(["branches", "students", "classes", "payments"]);

function validRecord(kind, payload) {
  if (!KINDS.has(kind) || !payload || typeof payload !== "object" || Array.isArray(payload)) return false;
  if (kind === "branches") {
    return typeof payload.name === "string" && payload.name.trim().length > 0
      && (!payload.status || ["open", "closed"].includes(payload.status));
  }
  if (kind === "students") return typeof payload.name === "string" && payload.name.trim().length > 0;
  if (kind === "payments") {
    return typeof payload.studentId === "string"
      && typeof payload.branchId === "string"
      && Number.isFinite(Number(payload.amountDue)) && Number(payload.amountDue) >= 0
      && Number.isFinite(Number(payload.amountReceived)) && Number(payload.amountReceived) > 0
      && Number.isInteger(Number(payload.months)) && [1, 2, 3].includes(Number(payload.months))
      && /^\d{4}-\d{2}-\d{2}$/.test(payload.date);
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(payload.date)
    && typeof payload.branchId === "string" && payload.branchId.length > 0;
}

async function branchIsClosed(branchId) {
  const rows = await supabaseRequest(`portal_records?select=payload&kind=eq.branches&id=eq.${encodeURIComponent(branchId)}&limit=1`);
  if (!rows.length) return true;
  return rows[0].payload.status === "closed";
}

async function ensureMuruva() {
  const branches = await supabaseRequest("portal_records?select=id&kind=eq.branches&payload->>name=ilike.Muruva&limit=1");
  if (branches.length) return;
  await supabaseRequest("portal_records", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify([{
      id: randomUUID(),
      kind: "branches",
      payload: { name: "Muruva", startDate: "2025-09-22", status: "open" }
    }])
  });
}

export default async function handler(req, res) {
  if (!envReady()) return json(res, 503, { error: "The portal is not configured. Set its server environment variables." });
  if (!hasSession(req)) return json(res, 401, { error: "Please sign in to continue." });

  const { kind, id } = req.query || {};
  if (!KINDS.has(kind)) return json(res, 400, { error: "Choose a valid record type." });

  try {
    await ensureMuruva();
    if (req.method === "GET") {
      const records = await supabaseRequest(`portal_records?select=id,payload&kind=eq.${kind}&order=created_at.asc`);
      return json(res, 200, records.map(({ id: recordId, payload }) => ({ ...payload, id: recordId })));
    }

    if (req.method === "POST") {
      const payload = req.body || {};
      if (!validRecord(kind, payload)) return json(res, 400, { error: "Please provide the required record details." });
      if (["students", "classes"].includes(kind) && await branchIsClosed(payload.branchId)) {
        return json(res, 400, { error: "Choose an open branch for new students and classes." });
      }
      const created = await supabaseRequest("portal_records?select=id,payload", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify([{ id: randomUUID(), kind, payload }])
      });
      return json(res, 201, { ...created[0].payload, id: created[0].id });
    }

    if (req.method === "PATCH") {
      if (!id) return json(res, 400, { error: "A record ID is required." });
      const payload = req.body || {};
      if (!validRecord(kind, payload)) return json(res, 400, { error: "Please provide the required record details." });
      if (["students", "classes"].includes(kind)) {
        const current = await supabaseRequest(`portal_records?select=payload&kind=eq.${kind}&id=eq.${encodeURIComponent(id)}&limit=1`);
        if (!current.length) return json(res, 404, { error: "That record was not found." });
        if (await branchIsClosed(payload.branchId) && current[0].payload.branchId !== payload.branchId) {
          return json(res, 400, { error: "Choose an open branch for new students and classes." });
        }
      }
      const updated = await supabaseRequest(`portal_records?id=eq.${encodeURIComponent(id)}&kind=eq.${kind}&select=id,payload`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ payload })
      });
      if (!updated.length) return json(res, 404, { error: "That record was not found." });
      return json(res, 200, { ...updated[0].payload, id: updated[0].id });
    }

    if (req.method === "DELETE") {
      if (!id) return json(res, 400, { error: "A record ID is required." });
      const deleted = await supabaseRequest(`portal_records?id=eq.${encodeURIComponent(id)}&kind=eq.${kind}&select=id`, {
        method: "DELETE",
        headers: { Prefer: "return=representation" }
      });
      if (!deleted.length) return json(res, 404, { error: "That record was not found." });
      return json(res, 200, { ok: true });
    }

    return json(res, 405, { error: "Method not allowed." }, { Allow: "GET, POST, PATCH, DELETE" });
  } catch (error) {
    console.error("Portal data request failed:", error);
    return json(res, 500, { error: "The request could not be completed. Check the database setup and try again." });
  }
}
