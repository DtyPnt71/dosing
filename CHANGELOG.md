# Changelog

## 3.1.0 – 22.09.2026

- Helles, kontraststarkes Design für helle Produktionsbereiche und bessere Lesbarkeit umgesetzt.
- Start-Hinweis zur ausschließlichen Berechnung nach Gewicht wiederhergestellt.
- Abschnittsnummern 01, 02, 03 und 04 entfernt.
- Berechnungsformel aus der Hauptansicht entfernt und in „Berechnung & Gewicht“ im Menü verschoben.
- Automatisches Öffnen der Bildschirmtastatur bei der Materialauswahl verhindert.
- Wartungsmodus über `public/version.json` wiederhergestellt.
- Reset-Schaltfläche lädt nun die komplette Website neu.
- Sichtbaren PWA-Update-Hinweis sowie manuelle Updateprüfung im Menü ergänzt.

## 3.0.0 – 22.09.2026

- Oberfläche vollständig mit React, TypeScript, Tailwind CSS und shadcn/Radix UI neu aufgebaut.
- PU, PS und SI als direkte segmentierte Auswahl statt Dropdown umgesetzt.
- Materialtyp als durchsuchbare, touchoptimierte Auswahl realisiert.
- Auf Smartphones öffnet sich die Materialauswahl als Bottom Sheet und lässt sich durch Tippen außerhalb, die Zurück-Geste oder den Schließen-Button beenden.
- Eingaben eindeutig als Gewicht von Komponente A und B mit Einheit Gramm beschriftet.
- Berechnungsformel direkt bei den Eingaben erklärt.
- Live-Ergebnis, Herstellervorgabe und Toleranzstatus zusammengeführt.
- Messreihe kompakter dargestellt; maximal fünf Proben und Mittelwert bleiben erhalten.
- PDF- und E-Mail-Bericht in die neue Oberfläche übernommen.
- Eigene Materialien können weiterhin hinzugefügt, bearbeitet und gelöscht werden.
- Vorhandene eigene Materialien und Spracheinstellung aus Version 2 werden automatisch übernommen.
- Neue installierbare Offline-PWA mit automatisch erzeugtem Service Worker.
- Überlagerte historische CSS-Patches und globale JavaScript-Datei entfernt.
# 3.2.1

- Aktualisierung wartet auf die tatsächliche Übernahme durch den neuen Service Worker, dann automatischer Reload.
- Fortschrittsdialog mit echten Phasen und Wiederholungsmöglichkeit bei Fehlern.
- Statische Startansicht statt leerem Root; bei Ladeproblemen erscheint ein Reload-Button.
- Lokaler Chromium-Test: 3.2.0 → 3.2.1, danach weiterer Worker-Wechsel und Offline-Neustart.
# 3.2.2

- Neues App-Icon Variante 01: blaue und gelbe A/B-Messskalen.
- Versionierte Icon-URLs, separate maskable Android-Datei, Apple-Touch-Icon und mehrformatiges ICO.
- App-ID und Manifest-Adresse unverändert; Icon-Aktualisierung bleibt vom Browser/Launcher abhängig.
# 3.3.0

- Optionales Balkendiagramm unter den Proben, über „Diagramm anzeigen“ einschaltbar.
- Nach Start/Neuladen und Materialwechsel immer ausgeblendet; Einstellung wird nicht dauerhaft gespeichert.
- Fünf feste Probenplätze, Live-Aktualisierung beim Übernehmen/Löschen.
- Prozentwerte, gestrichelter Sollwert und/oder Toleranzband nach vorhandenen Materialdaten.
- Abweichungen orange und mit Stern; Achse ab null, Skala schrumpft innerhalb derselben Materialauswahl nicht.
- Berechnung, PDF-Bericht und App-Icons unverändert.
# 3.3.1

- Diagramm als eigene aufklappbare Karte unter Messreihe und Mittelwert.
- Messpunkte mit geraden Verbindungslinien statt Balken; adaptive, ausdrücklich beschriftete Detailachse.
- Responsive Zeichenfläche mit festen Schriftgrößen und voller Kartenbreite.
- Minimum, Maximum und Spannweite in Prozentpunkten.
- Sollwertlinie/Toleranzband bleiben erhalten, Abweichungen als orange Rauten.
- Weiterhin standardmäßig geschlossen; PDF und Berechnung unverändert.
