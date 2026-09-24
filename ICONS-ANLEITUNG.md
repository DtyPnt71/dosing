# Neue Icons – Variante 01

Die Icons sind in dieser vollständigen Projektversion bereits eingebunden.
Wie gewohnt den Projektinhalt ins Repository übernehmen und neu bauen/veröffentlichen.
Der fertige Build befindet sich in dist/. Nicht nur einzelne Dateien aus dist ersetzen.
Das HDT-Firmenlogo in der Anwendung bleibt unverändert.

## Einzeldateien in public/icons

- dosing-v1-1024.png: große Vorlage, 1024 × 1024
- dosing-v1-192.png und dosing-v1-512.png: normale Android/PWA-Icons
- dosing-v1-maskable-512.png: Android-Icon mit zusätzlichem Rand für runde Masken
- apple-touch-v1.png: iPhone/iPad, 180 × 180
- favicon-v1.png: Browser, 48 × 48
- favicon-v1.ico: Browser, enthält 16, 32, 48 und 64 Pixel

Zusätzlich liegen die Icons unter den bisherigen Dateinamen direkt in public/.
Alle PNGs sind quadratisch und deckend. Runde Ecken setzt das Betriebssystem.
Die Vorlage wurde aus dem ausgewählten Entwurf mit Imagegen erstellt und anschließend in die benötigten Dateiformate und Größen exportiert.

## Aktualisierung installierter Icons

App-Inhalte und das vom Betriebssystem gespeicherte Icon werden getrennt aktualisiert.
Der Updatebutton kann das Launcher-Icon nicht selbst austauschen.

Chrome auf Android kann WebAPK-Icons über Änderungen am Manifest aktualisieren.
Dafür verwenden wir neue Bild-URLs (dosing-v1-...), getrennte any/maskable-Icons
und behalten Manifest-URL sowie id/start_url/scope unverändert bei.
Bei künftigen Iconwechseln neue Bildnamen verwenden und die Verweise anpassen.
Nicht bei jedem gewöhnlichen App-Update die Iconnamen ändern.

Nach Veröffentlichung App online öffnen und anschließend ganz schließen.
Tablet mit WLAN verbinden und ans Ladegerät anschließen. Chrome verarbeitet
solche Updates zeitversetzt; eine feste Frist ist nicht garantiert.
Dies gilt für Chrome/WebAPK-Installationen; Samsung Internet und einfache
Homescreen-Verknüpfungen können sich anders verhalten.

Auf iPhone/iPad wird ein bereits installiertes Symbol nicht verlässlich automatisch
erneuert. Eine PWA kann den Austausch nicht erzwingen. Wenn das alte Symbol
bleibt, kann erneutes Hinzufügen zum Home-Bildschirm nötig sein. Vor dem Entfernen
lokale eigene Materialien sichern und benötigte Berichte exportieren.

Quellen (geprüft 23.09.2026):
https://developer.chrome.com/blog/improvements-to-web-app-updates
https://web.dev/articles/manifest-updates
https://web.dev/learn/pwa/update
