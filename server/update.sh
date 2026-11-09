#!/bin/bash
# DartClub: automatisches Update vom GitHub-Repo (läuft alle 5 Minuten per Cron).
# Lädt nur Dateien (führt nichts aus dem Internet direkt aus) und startet PocketBase nur neu,
# wenn sich Server-Teile (pb_hooks / pb_migrations) geändert haben.
D=/opt/pb/verein
# Nur arbeiten, wenn es auf GitHub wirklich etwas Neues gibt (spart Datenverkehr – die Videos sind groß)
SHA=$(curl -fsSL --max-time 20 -H "Accept: application/vnd.github.sha" https://api.github.com/repos/Anduuuuin/Dart-App/commits/main 2>/dev/null | tr -dc '0-9a-f' | head -c 40)
if [ ${#SHA} -eq 40 ] && [ -f "$D/.update_sha" ] && [ "$(cat "$D/.update_sha")" = "$SHA" ]; then exit 0; fi
if [ ${#SHA} -eq 40 ]; then R=https://raw.githubusercontent.com/Anduuuuin/Dart-App/$SHA; else R=https://raw.githubusercontent.com/Anduuuuin/Dart-App/main; fi
T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT
changed_app=0; changed_srv=0; failed=0
get() { # $1 = Pfad im Repo, $2 = Ziel auf dem Server, $3 = app|srv
  curl -fsSL --max-time 60 "$R/$1" -o "$T/f" || { failed=1; return 0; }   # offline/fehlend -> später nochmal
  [ -s "$T/f" ] || return 0
  if ! cmp -s "$T/f" "$2"; then
    install -o pocketbase -g pocketbase -m 644 "$T/f" "$2"
    if [ "$3" = srv ]; then changed_srv=1; else changed_app=1; fi
  fi
}
# Dateiliste vom Repo holen; ohne Liste (alte Version) nichts tun
if curl -fsSL --max-time 30 "$R/server/files.txt" -o "$T/files" && [ -s "$T/files" ]; then
  while read -r src dst kind; do
    case "$src" in ''|'#'*) continue;; esac
    case "$dst" in *..*|/*) continue;; esac          # nur Pfade innerhalb von /opt/pb/verein
    mkdir -p "$(dirname "$D/$dst")"; chown pocketbase:pocketbase "$(dirname "$D/$dst")"
    get "$src" "$D/$dst" "$kind"
  done < "$T/files"
else failed=1
fi
# das Update-Skript selbst aktualisieren (gehört root, nicht PocketBase)
if curl -fsSL --max-time 30 "$R/server/update.sh" -o "$T/u" && [ -s "$T/u" ] && bash -n "$T/u" && ! cmp -s "$T/u" /usr/local/bin/dartclub-update; then
  install -o root -g root -m 755 "$T/u" /usr/local/bin/dartclub-update
fi
if [ $changed_srv = 1 ]; then systemctl restart pocketbase@verein; fi
[ ${#SHA} -eq 40 ] && [ $failed = 0 ] && echo "$SHA" > "$D/.update_sha"
if [ $changed_app = 1 ] || [ $changed_srv = 1 ]; then logger -t dartclub "Update eingespielt (app=$changed_app server=$changed_srv)"; fi
exit 0
