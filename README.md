# DartClub – Vereins-App

Dart-App für den Verein: X01-Scorer, Trainingsspiele, Übungen, Trainingspläne, Minispiele, Turniere (K.-o., Doppel-K.-o., Gruppen, Schweizer System, Liga), Boards und Statistiken.

- **Vereinsversion:** https://verein.anduuuuin.de – alle Daten liegen auf dem eigenen Vereinsserver und sind auf allen Geräten gleich. Zugang nur mit Einladungslink bzw. Vereins-Code.
- **Testversion (GitHub Pages):** Daten bleiben nur im Browser des jeweiligen Geräts. Zum Ausprobieren „Demo starten“ antippen.

## Server
`server/` enthält Tabelle, Abgleich-Routen und das Installationsskript für PocketBase.
Installieren/aktualisieren auf dem Server:

    curl -fsSL https://raw.githubusercontent.com/Anduuuuin/Dart-App/main/server/install.sh | bash
