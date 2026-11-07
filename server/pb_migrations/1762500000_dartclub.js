/// <reference path="../pb_data/types.d.ts" />
// DartClub: eine Tabelle für alle Vereinsdaten + Schutz-Einstellungen.
// Zugriff NUR über die eigenen Routen in pb_hooks (mit Vereins-Code), nie direkt.
migrate((app) => {
  try { app.findCollectionByNameOrId("dc_items"); } catch (e) {
    app.save(new Collection({
      type: "base", name: "dc_items",
      listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
      fields: [
        { name: "key", type: "text", required: true, max: 200 },
        { name: "kind", type: "text", max: 50 },
        { name: "data", type: "json", maxSize: 10000000 },
        { name: "rev", type: "number" },
        { name: "deleted", type: "bool" },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: [
        "CREATE UNIQUE INDEX idx_dc_key ON dc_items (key)",
        "CREATE INDEX idx_dc_rev ON dc_items (rev)",
      ],
    }));
  }
  const s = app.settings();
  s.trustedProxy.headers = ["X-Forwarded-For"];   // echte Geräte-IP hinter Caddy
  s.trustedProxy.useLeftmostIP = false;
  s.rateLimits.enabled = true;
  s.rateLimits.rules = [
    { label: "/api/",  maxRequests: 1500, duration: 60, audience: "" }, // viele Tablets im Vereins-WLAN teilen sich eine IP
    { label: "*:auth", maxRequests: 10,   duration: 60, audience: "" }, // Admin-Login
  ];
  app.save(s);
}, (app) => {
  try { app.delete(app.findCollectionByNameOrId("dc_items")); } catch (e) {}
});
