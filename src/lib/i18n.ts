import type { Language } from './types'

const messages = {
  de: {
    title: 'Dosier-Tool', subtitle: 'Mischungsverhältnis nach Gewicht', online: 'Online', offline: 'Offline nutzbar',
    material: 'Material', selectMaterial: 'Materialtyp auswählen', searchMaterial: 'Material suchen …', noMaterial: 'Kein Material gefunden', custom: 'Eigenes Material',
    weights: 'Gewichte eingeben', weightA: 'Gewicht Komponente A', weightB: 'Gewicht Komponente B', grams: 'g', formula: 'Dosierung = Komponente B ÷ Komponente A × 100',
    currentSample: 'Aktuelle Probe', addSample: 'Probe übernehmen', missingMaterial: 'Bitte zuerst einen Materialtyp auswählen.', missingValues: 'Bitte Gewicht A größer als 0 und Gewicht B ab 0 eingeben.',
    history: 'Messreihe', emptyHistory: 'Noch keine Probe übernommen', mean: 'Mittelwert', maxFive: 'Maximal 5 Proben',
    ok: 'Dosierung korrekt', low: 'Härtermangel', high: 'Härterüberschuss', neutral: 'Keine Vorgabe',
    okHint: 'Ergebnis liegt im vorgegebenen Bereich.', lowHint: 'Dosierblock Richtung Hydraulik anpassen.', highHint: 'Dosierblock Richtung Dosierpumpe anpassen.', neutralHint: 'Für dieses Material ist kein Bereich hinterlegt.',
    target: 'Herstellervorgabe', reset: 'Messung zurücksetzen', menu: 'Menü', export: 'PDF-Bericht', language: 'English', addMaterial: 'Material hinzufügen', manageMaterials: 'Materialien verwalten', help: 'Hilfe', about: 'Über dieses Tool',
    delete: 'Löschen', edit: 'Bearbeiten', cancel: 'Abbrechen', save: 'Speichern', close: 'Schließen',
    resetTitle: 'Messung zurücksetzen?', resetText: 'Eingaben und Proben dieser Messreihe werden gelöscht. Eigene Materialien bleiben erhalten.',
    materialName: 'Materialname', materialId: 'Interne ID', targetValue: 'Zielwert in % (optional)', minValue: 'Minimum in %', maxValue: 'Maximum in %',
    exportTitle: 'Bericht erstellen', exportPin: 'Interne PIN', continue: 'Weiter', wrongPin: 'Die PIN ist nicht korrekt.', machine: 'Maschinen-Nr.', customer: 'Kunde', date: 'Datum', creator: 'Erstellt durch', otherCreator: 'Anderer Name', comment: 'Kommentar', batch: 'Material-Charge', batchA: 'Charge A-Komponente', batchB: 'Charge B-Komponente', createPdf: 'PDF erstellen', email: 'E-Mail',
  },
  en: {
    title: 'Dosing tool', subtitle: 'Mixing ratio by weight', online: 'Online', offline: 'Available offline',
    material: 'Material', selectMaterial: 'Select material type', searchMaterial: 'Search material …', noMaterial: 'No material found', custom: 'Custom material',
    weights: 'Enter weights', weightA: 'Weight component A', weightB: 'Weight component B', grams: 'g', formula: 'Dosing = component B ÷ component A × 100',
    currentSample: 'Current sample', addSample: 'Add sample', missingMaterial: 'Select a material type first.', missingValues: 'Enter weight A greater than 0 and weight B from 0.',
    history: 'Measurement series', emptyHistory: 'No sample added yet', mean: 'Mean value', maxFive: 'Maximum 5 samples',
    ok: 'Dosing correct', low: 'Hardener deficiency', high: 'Hardener excess', neutral: 'No specification',
    okHint: 'The result is within the specified range.', lowHint: 'Adjust dosing block towards hydraulics.', highHint: 'Adjust dosing block towards metering pump.', neutralHint: 'No range is stored for this material.',
    target: 'Manufacturer specification', reset: 'Reset measurement', menu: 'Menu', export: 'PDF report', language: 'Deutsch', addMaterial: 'Add material', manageMaterials: 'Manage materials', help: 'Help', about: 'About this tool',
    delete: 'Delete', edit: 'Edit', cancel: 'Cancel', save: 'Save', close: 'Close',
    resetTitle: 'Reset measurement?', resetText: 'Inputs and samples from this series will be deleted. Custom materials remain.',
    materialName: 'Material name', materialId: 'Internal ID', targetValue: 'Target in % (optional)', minValue: 'Minimum in %', maxValue: 'Maximum in %',
    exportTitle: 'Create report', exportPin: 'Internal PIN', continue: 'Continue', wrongPin: 'The PIN is incorrect.', machine: 'Machine No.', customer: 'Customer', date: 'Date', creator: 'Created by', otherCreator: 'Other name', comment: 'Comment', batch: 'Material batch', batchA: 'Batch component A', batchB: 'Batch component B', createPdf: 'Create PDF', email: 'Email',
  },
} as const

export type MessageKey = keyof typeof messages.de
export const translator = (language: Language) => (key: MessageKey) => messages[language][key]
