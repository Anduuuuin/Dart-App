#!/bin/bash
# DartClub auf dem Server installieren bzw. aktualisieren (PocketBase-Instanz "verein").
# Aufruf auf dem Server:  curl -fsSL https://raw.githubusercontent.com/Anduuuuin/Dart-App/main/server/install.sh | bash
set -e
D=/opt/pb/verein
R=https://raw.githubusercontent.com/Anduuuuin/Dart-App/main
mkdir -p "$D/pb_public" "$D/pb_hooks" "$D/pb_migrations" "$D/pb_data"
echo "Lade App-Dateien ..."
for f in index.html sw.js manifest.webmanifest icon-192.png icon-512.png; do
  curl -fsSL "$R/$f" -o "$D/pb_public/$f"
done
curl -fsSL "$R/server/pb_hooks/dartclub.pb.js" -o "$D/pb_hooks/dartclub.pb.js"
curl -fsSL "$R/server/pb_migrations/1762500000_dartclub.js" -o "$D/pb_migrations/1762500000_dartclub.js"
touch "$D/env"
grep -q '^PORT=' "$D/env" || echo "PORT=8092" >> "$D/env"
if ! grep -q '^CLUB_KEY=' "$D/env"; then
  echo "CLUB_KEY=$(tr -dc 'a-z0-9' </dev/urandom | head -c 10)" >> "$D/env"
  echo "Neuer Vereins-Code erzeugt."
fi
chown -R pocketbase:pocketbase "$D"
systemctl restart pocketbase@verein
sleep 2
systemctl is-active --quiet pocketbase@verein && echo "PocketBase (verein) läuft." || { echo "FEHLER: PocketBase startet nicht:"; journalctl -u pocketbase@verein -n 20 --no-pager; exit 1; }
K=$(grep '^CLUB_KEY=' "$D/env" | cut -d= -f2)
echo
echo "FERTIG."
echo "Einladungslink für den Verein:"
echo "https://verein.anduuuuin.de/#k=$K"
