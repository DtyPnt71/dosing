# HDT Dosier-Tool v3.1

Neu entwickelte PWA-Oberfläche für die Berechnung und Dokumentation von Mischungsverhältnissen.

## Entwicklung

```bash
npm install
npm run dev
```

## Produktions-Build

```bash
npm run build
```

Der fertige statische Build befindet sich anschließend in `dist/`.

## Hinweise

- Die Berechnung erfolgt als `Komponente B / Komponente A × 100`.
- Eigene Materialien werden ausschließlich lokal im Browser gespeichert.
- Der interne PDF-Export ist wie in v2 mit PIN `4711` geschützt.
- Das Tool ist offline installierbar. Service Worker und Manifest werden beim Build erzeugt.
- Der Wartungsmodus wird über `public/version.json` mit `"maintenance": true` aktiviert.
- Neue Releases zeigen in der installierten PWA einen sichtbaren Update-Hinweis.
# Version 3.2.0 – Produktionsoberfläche

Dunkle Beschriftungen, kompaktere Karten, deutliche Materialauswahl und klare Leerzustände.
Die zentralen Schriftfarben stehen in `src/styles.css` unter `--text-primary` und `--text-secondary`.

Updates: Bei Start, Rückkehr zur App, erneuter Verbindung und stündlich im sichtbaren Fenster wird nach einem Service-Worker-Update gesucht. Verfügbare Dateien werden im Hintergrund geladen. Aktivierung erfolgt über „Jetzt aktualisieren“, nicht ungefragt während einer Messung. Vor dem Zurücksetzen vorhandener Messwerte wird eine Bestätigung verlangt. Berichte vorher exportieren. Offline bleibt die zuletzt zwischengespeicherte Version nutzbar. Der Versionsabruf hat ein Zeitlimit von fünf Sekunden.
# Update-Fix 3.2.1

Updates zeigen Vorbereiten → Aktivieren → Neustart. Nach Übernahme durch den neuen Service Worker wird automatisch neu geladen. Bei fehlgeschlagener Vorbereitung/Aktivierung bleiben die Eingaben erhalten und ein erneuter Versuch ist möglich. Eine unabhängige HTML-Startansicht bleibt sichtbar, falls JavaScript nicht geladen werden kann.

Kompletten Build zusammen veröffentlichen, einschließlich `sw.js`, `index.html` und `assets/`. HTML und Service Worker sollten nicht langfristig per HTTP gecacht werden. Beim ersten Wechsel läuft der Updatebutton noch mit dem alten Code: Wenn die alte Installation weiß bleibt, App einmal schließen und neu öffnen bzw. Seite neu laden. Keine lokalen Daten löschen.
# Version 3.3.0 – Optionales Probendiagramm

Unter der Probenliste steht „Diagramm anzeigen“. Standardmäßig ausgeschaltet,
auch nach Neuladen und Materialwechsel. Das Diagramm bildet ausschließlich
übernommene Proben ab und aktualisiert sich beim Hinzufügen und Löschen.
Die Einheit ist B relativ zu A in Prozent (dieselbe Größe wie das Rechenergebnis).
Ein vorhandener Sollwert erscheint gestrichelt; ein hinterlegter Bereich als
Toleranzband. Es wird kein Sollwert aus der Bereichsmitte erfunden.
Der PDF-Bericht bleibt unverändert und enthält das Diagramm nicht.
# Version 3.3.1 – Überarbeiteter Probenverlauf

Die Diagrammkarte steht jetzt unterhalb des Mittelwerts und öffnet per Klick
auf „Diagramm“. Sie startet geschlossen. Messpunkte mit Verbindungslinie ersetzen
die Balken. Die Prozentachse zeigt einen automatisch angepassten Ausschnitt,
damit kleine Schwankungen sichtbar werden; dieser Ausschnitt wird ausdrücklich
unter dem Diagramm angegeben. Die Achse beginnt daher nicht zwingend bei null.
Minimum, Maximum und Spannweite (Prozentpunkte) ergänzen die Darstellung.
Diese Beschreibung ersetzt die ältere Diagrammbeschreibung zur Version 3.3.0.
