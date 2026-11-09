/// <reference path="../pb_data/types.d.ts" />
// DartClub-Abgleich. Jede Anfrage braucht den Vereins-Code (Header X-Club-Key),
// der auf dem Server in /opt/pb/verein/env als CLUB_KEY steht.

// Alle Änderungen seit Stand "rev" holen
routerAdd("GET", "/api/dc/since", (e) => {
  const key = $os.getenv("CLUB_KEY");
  if (!key || e.request.header.get("X-Club-Key") !== key) throw new UnauthorizedError("Falscher Vereins-Code");
  const since = parseInt(e.request.url.query().get("rev") || "0", 10) || 0;
  const recs = $app.findRecordsByFilter("dc_items", "rev > {:r}", "rev", 0, 0, { r: since });
  let max = since;
  const items = recs.map((r) => {
    const rev = r.getInt("rev");
    if (rev > max) max = rev;
    return { key: r.getString("key"), rev: rev, deleted: r.getBool("deleted"), data: r.getBool("deleted") ? null : r.get("data") };
  });
  return e.json(200, { rev: max, items: items });
});

// Änderungen speichern. Jeder Eintrag nennt den Stand ("base"), auf dem er beruht.
// Hat ein anderes Gerät inzwischen etwas geändert, kommt "conflict" zurück und die App führt zusammen.
routerAdd("POST", "/api/dc/put", (e) => {
  const key = $os.getenv("CLUB_KEY");
  if (!key || e.request.header.get("X-Club-Key") !== key) throw new UnauthorizedError("Falscher Vereins-Code");
  const body = e.requestInfo().body || {};
  const list = body.items || [];
  if (!Array.isArray(list) || list.length > 200) throw new BadRequestError("Ungültige Anfrage");
  const out = [];
  $app.runInTransaction((tx) => {
    const res = new DynamicModel({ m: 0 });
    tx.db().newQuery("SELECT COALESCE(MAX(rev),0) AS m FROM dc_items").one(res);
    let next = res.m;
    const col = tx.findCollectionByNameOrId("dc_items");
    for (const it of list) {
      const k = String(it.key || "");
      if (!k || k.length > 200) continue;
      let rec = null;
      try { rec = tx.findFirstRecordByData("dc_items", "key", k); } catch (_) { rec = null; }
      const cur = rec ? rec.getInt("rev") : 0;
      if (cur !== (parseInt(it.base, 10) || 0)) {
        const del = rec ? rec.getBool("deleted") : true;
        out.push({ key: k, conflict: true, rev: cur, deleted: del, data: del ? null : rec.get("data") });
        continue;
      }
      if (!rec) { rec = new Record(col); rec.set("key", k); }
      next++;
      rec.set("kind", k.split(":")[0]);
      rec.set("rev", next);
      if (it.data === null || it.data === undefined) { rec.set("deleted", true); rec.set("data", null); }
      else { rec.set("deleted", false); rec.set("data", it.data); }
      tx.save(rec);
      out.push({ key: k, rev: next });
    }
  });
  return e.json(200, { items: out });
});

// ---------- Rückmeldungen ----------
// Senden: jeder mit Vereins-Code. Lesen/Ändern: nur mit Admin-PIN (wird gegen den Admin-Eintrag auf dem Server geprüft).
routerAdd("POST", "/api/dc/feedback", (e) => {
  const key = $os.getenv("CLUB_KEY");
  if (!key || e.request.header.get("X-Club-Key") !== key) throw new UnauthorizedError("Falscher Vereins-Code");
  const b = e.requestInfo().body || {};
  const text = String(b.text || "").trim();
  if (text.length < 3) throw new BadRequestError("Bitte etwas mehr schreiben");
  const kinds = ["idee", "fehler", "sonst"];
  const col = $app.findCollectionByNameOrId("dc_feedback");
  const r = new Record(col);
  r.set("kind", kinds.indexOf(b.kind) >= 0 ? b.kind : "sonst");
  r.set("text", text.slice(0, 3000));
  r.set("sender", String(b.sender || "anonym").slice(0, 100));
  r.set("ctx", b.ctx && typeof b.ctx === "object" ? b.ctx : {});
  r.set("status", "neu");
  $app.save(r);
  return e.json(200, { ok: true });
});

routerAdd("POST", "/api/dc/feedback/admin", (e) => {
  const key = $os.getenv("CLUB_KEY");
  if (!key || e.request.header.get("X-Club-Key") !== key) throw new UnauthorizedError("Falscher Vereins-Code");
  let pin = null;
  try { const a = $app.findFirstRecordByData("dc_items", "key", "users:admin"); const d = JSON.parse(a.getString("data") || "null"); pin = d && d.pin; } catch (_) {}
  if (!pin || e.request.header.get("X-Admin-Pin") !== String(pin)) throw new ForbiddenError("Nur für den Admin");
  const b = e.requestInfo().body || {};
  if (b.id && b.action) {
    const r = $app.findRecordById("dc_feedback", String(b.id));
    if (b.action === "delete") $app.delete(r);
    else if (["neu", "gelesen", "erledigt"].indexOf(b.action) >= 0) { r.set("status", b.action); $app.save(r); }
  }
  const recs = $app.findRecordsByFilter("dc_feedback", "id != ''", "-created", 500, 0);
  return e.json(200, { items: recs.map((r) => ({ id: r.id, kind: r.getString("kind"), text: r.getString("text"), sender: r.getString("sender"), ctx: r.get("ctx"), status: r.getString("status"), created: r.getString("created") })) });
});
