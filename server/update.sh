#!/bin/bash
# DartClub: automatisches Update vom GitHub-Repo (läuft alle 5 Minuten per Cron).
# Lädt nur Dateien (führt nichts aus dem Internet direkt aus) und startet PocketBase nur neu,
# wenn sich Server-Teile (pb_hooks / pb_migrations) geändert haben.
D=/opt/pb/verein
R=https://raw.githubusercontent.com/Anduuuuin/Dart-App/main
T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT
changed_app=0; changed_srv=0
get() { # $1 = Pfad im Repo, $2 = Ziel auf dem Server, $3 = app|srv
  curl -fsSL --max-time 30 "$R/$1" -o "$T/f" || return 0          # offline/fehlend -> nichts tun
  [ -s "$T/f" ] || return 0
  if ! cmp -s "$T/f" "$2"; then
    install -o pocketbase -g pocketbase -m 644 "$T/f" "$2"
    if [ "$3" = srv ]; then changed_srv=1; else changed_app=1; fi
  fi
}
for f in index.html sw.js manifest.webmanifest icon-192.png icon-512.png; do get "$f" "$D/pb_public/$f" app; done
mkdir -p "$D/pb_public/videos" && chown pocketbase:pocketbase "$D/pb_public/videos"
for v in 1-profil-anlegen 2-app-installieren 3-statistik 4-spiele-und-training; do get "videos/$v.mp4" "$D/pb_public/videos/$v.mp4" app; get "videos/$v.jpg" "$D/pb_public/videos/$v.jpg" app; done
get server/pb_hooks/dartclub.pb.js "$D/pb_hooks/dartclub.pb.js" srv
get server/pb_migrations/1762500000_dartclub.js "$D/pb_migrations/1762500000_dartclub.js" srv
# das Update-Skript selbst aktualisieren (gehört root, nicht PocketBase)
if curl -fsSL --max-time 30 "$R/server/update.sh" -o "$T/u" && [ -s "$T/u" ] && bash -n "$T/u" && ! cmp -s "$T/u" /usr/local/bin/dartclub-update; then
  install -o root -g root -m 755 "$T/u" /usr/local/bin/dartclub-update
fi
if [ $changed_srv = 1 ]; then systemctl restart pocketbase@verein; fi
if [ $changed_app = 1 ] || [ $changed_srv = 1 ]; then logger -t dartclub "Update eingespielt (app=$changed_app server=$changed_srv)"; fi
exit 0
