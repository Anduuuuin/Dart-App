/// <reference path="../pb_data/types.d.ts" />
// Rückmeldungen (Verbesserungen, Fehler) – getrennt von den Vereinsdaten, lesbar nur mit Admin-PIN über pb_hooks.
migrate((app) => {
  try { app.findCollectionByNameOrId("dc_feedback"); return; } catch (e) {}
  app.save(new Collection({
    type: "base", name: "dc_feedback",
    listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
    fields: [
      { name: "kind", type: "text", max: 20 },
      { name: "text", type: "text", max: 3000 },
      { name: "sender", type: "text", max: 100 },
      { name: "ctx", type: "json", maxSize: 20000 },
      { name: "status", type: "text", max: 20 },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: ["CREATE INDEX idx_fb_created ON dc_feedback (created)"],
  }));
}, (app) => {
  try { app.delete(app.findCollectionByNameOrId("dc_feedback")); } catch (e) {}
});
