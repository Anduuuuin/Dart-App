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
