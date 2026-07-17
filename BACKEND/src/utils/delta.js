// Delta-pull support for offline POS clients: list endpoints accept
// ?updatedSince=<ISO> and include serverTime in the envelope so clients cursor
// on server clock, never their own (clock-skew safety).

function parseUpdatedSince(query) {
  const raw = query?.updatedSince;
  if (!raw) return null;
  const ts = Date.parse(String(raw));
  return Number.isNaN(ts) ? null : new Date(ts);
}

function serverTime() {
  return new Date().toISOString();
}

module.exports = { parseUpdatedSince, serverTime };
