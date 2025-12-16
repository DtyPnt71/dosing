window.EXPORT_EMAIL = "timo.burian@h-d-tec.de";
window.EXPORT_EMAIL = "info@h-d-tec.de";

let deferredPrompt;
let results = [];

const inputA = document.getElementById("inputA");
const inputB = document.getElementById("inputB");
const liveResult = document.getElementById("liveResult");
const confirmBtn = document.getElementById("confirmBtn");
const resultList = document.getElementById("resultList");
const meanResult = document.getElementById("meanResult");
const installBtn = document.getElementById("installBtn");

const themeSelect = document.getElementById("themeSelect");
const exportBtn = document.getElementById("exportBtn");
const clearCacheBtn = document.getElementById("clearCacheBtn");


// === Language Handling (DE / EN) ===
const TRANSLATIONS = {
  de: {
    tol_ok_title: 'Dosierung korrekt',
    tol_low_title: 'Härtermangel',
    tol_high_title: 'Härterüberschuss',
    tol_neutral_title: 'Kein Bereich hinterlegt',
    tol_msg_ok: 'Ergebnis liegt im vorgegebenen Bereich.',
    tol_msg_low: 'Dosierung anpassen - Dosierblock richtung Hydraulik',
    tol_msg_high: 'Dosierung anpassen - Dosierblock richtung Dosierpumpe',
    tol_msg_neutral: 'Keine Toleranz hinterlegt – keine Prüfung.',
    label_materialFamily: 'Materialsorte:',
    label_materialSpec: 'Materialtyp:',
    history_title: 'Verlauf (max. 5 Proben)',
    mean_label: 'Mittelwert:',
    export_button: 'Bericht exportieren',
    status_label: 'Status:',
    tol_range_label: 'Bereich:',
    pdf_machine: 'Maschinen-Nr:',
    pdf_family: 'Materialsorte:',
    pdf_spec: 'Materialtyp:',
    pdf_mean: 'Mittelwert:',
    pdf_creator: 'Erstellt durch:',
    result_current_label: 'Ergebnis aktuelle Probe:',
    confirm_button: 'Bestätigen',
    install_button: 'App installieren',
    machine_modal_title: 'Berichtsdaten',
    machine_modal_intro: 'Bitte Angaben für den Bericht eintragen:',
    machine_modal_label_machine: 'Maschinen-Nr',
    machine_modal_label_date: 'Datum',
    machine_modal_label_creator: 'Erstellt durch',
    machine_modal_info_title: 'Info:',
    machine_modal_info_text: 'Export unter iOS inkompatibel!',
    btn_cancel: 'Abbrechen',
    btn_continue_export: 'Weiter & exportieren',
    material_modal_title: 'Material hinzufügen',
    material_modal_intro: 'Bitte die Daten für das neue Material eintragen:',
    material_modal_family: 'Materialsorte',
    material_modal_spec: 'Materialtyp',
    placeholder_machine_no: 'z.B. 1221',
    placeholder_machine_date: 'TT.MM.JJJJ',
    placeholder_machine_creator: 'Name des Erstellers',
    label_componentA: 'Komponente A',
    label_componentB: 'Komponente B',
    menu_design: 'Design',
    menu_cache: 'Cache leeren',
    menu_add_material: 'Material hinzufügen',
    target_by_weight: 'Herstellervorgabe nach Gewicht:',
    material_modal_id_label: 'Material ID (intern)',
    material_modal_name_label: 'Material name',
    placeholder_newMatName: 'z.B. Emcepren 510',
    material_modal_target_label: 'Zielwert in %',
    material_modal_min_label: 'Dosierung min. in % (optional)',
    material_modal_max_label: 'Dosierung max. in % (optional)',
    btn_save_material: 'Speichern',
    placeholder_newMatId: 'z.B. Emcepren-510',
    placeholder_newMatTarget: 'z.B. 10,00',
    placeholder_newMatMin: 'z.B. 9,00',
    placeholder_newMatMax: 'z.B. 11,00',
    
    
    
    
  },
  en: {
    tol_ok_title: 'Dosing correct',
    tol_low_title: 'Hardener deficiency',
    tol_high_title: 'Hardener excess',
    tol_neutral_title: 'No tolerance range stored',
    tol_msg_ok: 'Result is within the specified range.',
    tol_msg_low: 'Adjust dosing – dosing block towards hydraulics.',
    tol_msg_high: 'Adjust dosing – dosing block towards metering pump.',
    tol_msg_neutral: 'No tolerance range defined – no check performed.',
    label_materialFamily: 'Material family:',
    label_materialSpec: 'Material type:',
    history_title: 'History (max. 5 samples)',
    mean_label: 'Mean value:',
    export_button: 'Export report',
    status_label: 'Status:',
    tol_range_label: 'Range:',
    pdf_machine: 'Machine No.:',
    pdf_family: 'Material family:',
    pdf_spec: 'Material type:',
    pdf_mean: 'Mean value:',
    pdf_creator: 'Created by:',
    result_current_label: 'Result current sample:',
    confirm_button: 'Confirm',
    install_button: 'Install app',
    machine_modal_title: 'Report data',
    machine_modal_intro: 'Please enter the details for the report:',
    machine_modal_label_machine: 'Machine No.',
    machine_modal_label_date: 'Date',
    machine_modal_label_creator: 'Created by',
    machine_modal_info_title: 'Info:',
    machine_modal_info_text: 'Export is not supported on iOS!',
    btn_cancel: 'Cancel',
    btn_continue_export: 'Continue & export',
    material_modal_title: 'Add material',
    material_modal_intro: 'Please enter the data for the new material:',
    material_modal_family: 'Material family',
    material_modal_spec: 'Material type',
    placeholder_machine_no: 'e.g. 1221',
    placeholder_machine_date: 'DD.MM.YYYY',
    placeholder_machine_creator: 'Name of creator',
    label_componentA: 'Component A',
    label_componentB: 'Component B',
    menu_design: 'Design',
    menu_cache: 'Clear cache',
    menu_add_material: 'Add material',
    target_by_weight: 'Manufacturer specification by weight:',
    material_modal_id_label: 'Material ID (internal)',
    material_modal_name_label: 'Material name',
    material_modal_target_label: 'Target in %',
    material_modal_min_label: 'Dosing min. in % (optional)',
    material_modal_max_label: 'Dosing max. in % (optional)',
    btn_save_material: 'Save',
    placeholder_newMatId: 'e.g. Emcepren-510',
    placeholder_newMatName: 'Display name',
    placeholder_newMatTarget: 'e.g. 10,00',
    placeholder_newMatMin: 'e.g. 9,00',
    placeholder_newMatMax: 'e.g. 11,00',
  }
};

let CURRENT_LANG = (localStorage.getItem('hdt-lang') === 'en') ? 'en' : 'de';

function t(key) {
  const dict = TRANSLATIONS[CURRENT_LANG] || TRANSLATIONS.de;
  return (dict && key in dict) ? dict[key] : (TRANSLATIONS.de[key] || key);
}

function applyLanguage() {
  try {
    if (document.documentElement) {
      document.documentElement.lang = CURRENT_LANG;
    }

    // Material selection labels
    const famLabel = document.querySelector('label[for="materialFamily"]');
    if (famLabel) famLabel.textContent = t('label_materialFamily');

    const specLabel = document.querySelector('label[for="materialSpec"]');
    if (specLabel) specLabel.textContent = t('label_materialSpec');

    // Component A/B labels
    const compALabel = document.querySelector('label[for="inputA"]');
    if (compALabel) compALabel.textContent = t('label_componentA');

    const compBLabel = document.querySelector('label[for="inputB"]');
    if (compBLabel) compBLabel.textContent = t('label_componentB');

    // History title
    const historyTitle = document.querySelector('.history-section h2');
    if (historyTitle) historyTitle.textContent = t('history_title');

    // Mean label
    const meanLabel = document.querySelector('.mean-section span');
    if (meanLabel) meanLabel.textContent = t('mean_label');

    // Export button
    if (exportBtn) {
      exportBtn.textContent = t('export_button');
    }

    // Current result label
    const resultLabel = document.querySelector('.result-section .result-label');
    if (resultLabel) resultLabel.textContent = t('result_current_label');

    // Status label
    const statusLabel = document.querySelector('.status-label');
    if (statusLabel) statusLabel.textContent = t('status_label');

    // Tolerance range label
    const tolRange = document.getElementById('tolRange');
    if (tolRange && tolRange.firstChild) {
      tolRange.firstChild.textContent = t('tol_range_label') + ' ';
    }

    // PDF-Labels: Reihenfolge im DOM beachten
    // .pdf-label Elemente im #pdfReport:
    // 0: Datum
    // 1: Maschinen-Nr
    // 2: Materialsorte
    // 3: Materialtyp
    // 4: Dosierung
    // 5: Mittelwert
    // 6: Erstellt durch
    const pdfLabels = document.querySelectorAll('.pdf-label');
    if (pdfLabels[1]) pdfLabels[1].textContent = t('pdf_machine');
    if (pdfLabels[2]) pdfLabels[2].textContent = t('pdf_family');
    if (pdfLabels[3]) pdfLabels[3].textContent = t('pdf_spec');
    if (pdfLabels[5]) pdfLabels[5].textContent = t('pdf_mean');  
    if (pdfLabels[6]) pdfLabels[6].textContent = t('pdf_creator');

    // Confirm button
    if (confirmBtn) {
      confirmBtn.textContent = t('confirm_button');
    }

    // Install button
    if (installBtn) {
      installBtn.textContent = t('install_button');
    }

    // Machine modal texts
    const machineModalEl = document.getElementById('machineModal');
    if (machineModalEl) {
      const title = machineModalEl.querySelector('h2');
      if (title) title.textContent = t('machine_modal_title');

      const paragraphs = machineModalEl.querySelectorAll('p');
      if (paragraphs[0]) paragraphs[0].textContent = t('machine_modal_intro');

      const infoTitle = machineModalEl.querySelector('h2:nth-of-type(2)');
      if (infoTitle) infoTitle.textContent = t('machine_modal_info_title');

      const infoTextP = machineModalEl.querySelector('p:last-of-type');
      if (infoTextP) infoTextP.textContent = t('machine_modal_info_text');

      const machineLabel = machineModalEl.querySelector('label[for="machineInput"]');
      if (machineLabel) machineLabel.textContent = t('machine_modal_label_machine');

      const dateLabel = machineModalEl.querySelector('label[for="machineDateInput"]');
      if (dateLabel) dateLabel.textContent = t('machine_modal_label_date');

      const creatorLabel = machineModalEl.querySelector('label[for="machineCreatorInput"]');
      if (creatorLabel) creatorLabel.textContent = t('machine_modal_label_creator');

      const machineInputEl = document.getElementById('machineInput');
      if (machineInputEl) machineInputEl.setAttribute('placeholder', t('placeholder_machine_no'));

      const machineDateInputEl = document.getElementById('machineDateInput');
      if (machineDateInputEl) machineDateInputEl.setAttribute('placeholder', t('placeholder_machine_date'));

      const machineCreatorInputEl = document.getElementById('machineCreatorInput');
      if (machineCreatorInputEl) machineCreatorInputEl.setAttribute('placeholder', t('placeholder_machine_creator'));

      const machineCancelBtn = document.getElementById('machineCancel');
      const machineConfirmBtn = document.getElementById('machineConfirm');
      if (machineCancelBtn) machineCancelBtn.textContent = t('btn_cancel');
      if (machineConfirmBtn) machineConfirmBtn.textContent = t('btn_continue_export');
    }

    // Material modal
    const materialModalEl = document.getElementById('materialModal');
    if (materialModalEl) {
      // Titel & Einleitung
      const matTitle = materialModalEl.querySelector('h2');
      if (matTitle) matTitle.textContent = t('material_modal_title');

      const matIntro = materialModalEl.querySelector('p');
      if (matIntro) matIntro.textContent = t('material_modal_intro');

      // Labels
      const matFamilyLabel = materialModalEl.querySelector('label[for="newMatFamily"]');
      if (matFamilyLabel) matFamilyLabel.textContent = t('material_modal_family');

      const matSpecLabel = materialModalEl.querySelector('label[for="newMatSpec"]');
      if (matSpecLabel) matSpecLabel.textContent = t('material_modal_spec');

      const matIdLabel = materialModalEl.querySelector('label[for="newMatId"]');
      if (matIdLabel) matIdLabel.textContent = t('material_modal_id_label');

      const matNameLabel = materialModalEl.querySelector('label[for="newMatName"]');
      if (matNameLabel) matNameLabel.textContent = t('material_modal_name_label');

      const matTargetLabel = materialModalEl.querySelector('label[for="newMatTarget"]');
      if (matTargetLabel) matTargetLabel.textContent = t('material_modal_target_label');

      const matMinLabel = materialModalEl.querySelector('label[for="newMatMin"]');
      if (matMinLabel) matMinLabel.textContent = t('material_modal_min_label');

      const matMaxLabel = materialModalEl.querySelector('label[for="newMatMax"]');
      if (matMaxLabel) matMaxLabel.textContent = t('material_modal_max_label');

      // Buttons
      const newMatCancelBtn = document.getElementById('newMatCancel');
      const newMatConfirmBtn = document.getElementById('newMatConfirm');
      if (newMatCancelBtn) newMatCancelBtn.textContent = t('btn_cancel');
      if (newMatConfirmBtn) newMatConfirmBtn.textContent = t('btn_save_material');

      // Platzhalter
      const newMatIdInput = document.getElementById('newMatId');
      const newMatNameInput = document.getElementById('newMatName');
      const newMatTargetInput = document.getElementById('newMatTarget');
      const newMatMinInput = document.getElementById('newMatMin');
      const newMatMaxInput = document.getElementById('newMatMax');

      if (newMatIdInput) newMatIdInput.placeholder = t('placeholder_newMatId');
      if (newMatNameInput) newMatNameInput.placeholder = t('placeholder_newMatName');
      if (newMatTargetInput) newMatTargetInput.placeholder = t('placeholder_newMatTarget');
      if (newMatMinInput) newMatMinInput.placeholder = t('placeholder_newMatMin');
      if (newMatMaxInput) newMatMaxInput.placeholder = t('placeholder_newMatMax');
    }

    // Language menu item
    const langMenuItem = document.getElementById('langMenuItem');
    if (langMenuItem) {
      if (CURRENT_LANG === 'de') {
        langMenuItem.textContent = '🇩🇪 DE (aktiv)';
      } else {
        langMenuItem.textContent = '🇬🇧 EN (active)';
      }
    }

    // 3-dot menu: design label, cache + add material
    const menuPanel = document.getElementById('menuPanel');
    if (menuPanel) {
      const designLabelEl = menuPanel.querySelector('.menu-label');
      if (designLabelEl) designLabelEl.textContent = '🎨 ' + t('menu_design');

      const cacheBtn = menuPanel.querySelector('button[data-action="clearCache"]');
      if (cacheBtn) cacheBtn.textContent = '♻️ ' + t('menu_cache');

      const addMatBtn = menuPanel.querySelector('button[data-action="addMaterial"]');
      if (addMatBtn) addMatBtn.textContent = '💾 ' + t('menu_add_material');
    }
  } catch (e) {
    console.error('Fehler beim Anwenden der Sprache:', e);
  }
}
function toggleLanguage() {
  CURRENT_LANG = CURRENT_LANG === 'de' ? 'en' : 'de';
  localStorage.setItem('hdt-lang', CURRENT_LANG);
  applyLanguage();
  // Toleranzbox neu rendern, damit Status/Meldungen in neuer Sprache erscheinen
  try {
    if (typeof renderTolerance === 'function') {
      renderTolerance();
    }
  } catch (e) {}
}


// direkt initial anwenden
applyLanguage();

// === Theme Handling ===
function updateThemeMenuItems(currentTheme) {
  try {
    const items = document.querySelectorAll('.menu-item[data-theme]');
    items.forEach((btn) => {
      const tVal = btn.getAttribute('data-theme') || '';
      if (tVal === currentTheme) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  } catch (e) {
    // ignore
  }
}

function applyTheme(val) {
  const theme = val || 'default';
  if (document.body) {
    document.body.classList.remove('theme-default', 'theme-ocean', 'theme-sunset');
    document.body.classList.add('theme-' + theme);
  }
  try {
    localStorage.setItem('hdt-theme', theme);
  } catch (e) {
    // ignore
  }
  if (themeSelect) {
    themeSelect.value = theme;
  }
  updateThemeMenuItems(theme);
}

(function initTheme() {
  let saved = 'default';
  try {
    saved = localStorage.getItem('hdt-theme') || 'default';
  } catch (e) {
    saved = 'default';
  }
  applyTheme(saved);

  if (themeSelect) {
    themeSelect.addEventListener('change', () => {
      const val = themeSelect.value || 'default';
      applyTheme(val);
    });
  }
})();
// === Export Handling ===
function updateExportButtonState() {
  if (!exportBtn) return;
  exportBtn.disabled = results.length === 0;
}

// Elemente für Bericht-Modal
const machineModal = document.getElementById("machineModal");
const machineInput = document.getElementById("machineInput");
const machineDateInput = document.getElementById("machineDateInput");
const machineCreatorInput = document.getElementById("machineCreatorInput");
const machineCancel = document.getElementById("machineCancel");
const machineConfirm = document.getElementById("machineConfirm");

// Hilfsfunktionen für Modal
function formatToday() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return dd + "." + mm + "." + yyyy;
}

function openMachineModal() {
  if (!machineModal) {
    // Falls kein Modal vorhanden, direkt exportieren
    performExport("", formatToday(), "");
    return;
  }
  machineModal.style.display = "flex";

  if (machineInput) {
    machineInput.value = "";
  }
  if (machineDateInput) {
    machineDateInput.value = formatToday();
  }
  if (machineCreatorInput) {
    machineCreatorInput.value = "";
  }

  setTimeout(() => {
    if (machineInput) machineInput.focus();
  }, 10);
}

function closeMachineModal() {
  if (machineModal) {
    machineModal.style.display = "none";
  }
}

// Hilfsfunktion: Bericht wie Vorlage aufbauen
function buildReport(machineNo, reportDate, famText, specText, tolText, meanText, creatorName) {
  const lines = [];
  lines.push("HDT Hochdruck-Dosier-Technik GmbH");
  lines.push("Müllerstraße 7, DE-46242 Bottrop");
  lines.push("");
  lines.push("Datum: " + (reportDate || "-"));
  lines.push("");
  lines.push("-----");
  lines.push("Maschinen-Nr 	: " + (machineNo || "-"));
  lines.push("Materialsorte	: " + (famText || "-"));
  lines.push("Materialtyp 	: " + (specText || "-"));
  lines.push("Dosierung    	: " + (tolText || "-"));
  lines.push("");
  lines.push("Probe   Ergebnis (%)");
  lines.push("-----   ------------");

  results.forEach((val, idx) => {
    const probe = String(idx + 1).padEnd(5, " "); // z.B. "1    ", "2    "
    const wert = val.toFixed(2).replace(".", ",");
    // Keine Tabs am Zeilenanfang, nur einfache Spaltenstruktur mit Leerzeichen
    lines.push(probe + "   " + wert);
  });

  lines.push("");
  lines.push("Mittelwert");
  lines.push("x̄= " + (meanText || "-"));
  lines.push("");
  lines.push("");
  lines.push("Erstellt durch: " + (creatorName || "-"));

  return lines.join("\n");
}


function isIOS() {
  try {
    return /iphone|ipad|ipod/i.test(navigator.userAgent || '');
  } catch (e) {
    return false;
  }
}

function generatePdfReport(machineNo, reportDate, famText, specText, tolText, meanText, creatorName) {
  const root = document.getElementById("pdfReport");
  if (!root || typeof window.html2pdf === "undefined") {
    return;
  }

  // --- 1. Template (das versteckte #pdfReport) befüllen ---

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value || "";
  };

  // Kopfbereich
  setText("pdfDate", reportDate || "");
  setText("pdfMachine", machineNo || "");
  setText("pdfFamily", famText || "");
  setText("pdfSpec", specText || "");
  setText("pdfDose", tolText || "");
  setText("pdfMean", meanText || "");
  setText("pdfCreator", creatorName || "");

  // Probentabelle
  const tbody = document.getElementById("pdfProbes");
  if (tbody) {
    tbody.innerHTML = "";
    if (Array.isArray(results)) {
      results.forEach((val, idx) => {
        const tr = document.createElement("tr");
        const tdProbe = document.createElement("td");
        const tdVal = document.createElement("td");
        tdProbe.textContent = String(idx + 1);
        tdVal.textContent = Number(val).toFixed(2).replace(".", ",");
        tr.appendChild(tdProbe);
        tr.appendChild(tdVal);
        tbody.appendChild(tr);
      });
    }
  }

  // --- 2. Sichtbare Kopie des Templates erzeugen ---

  const clone = root.cloneNode(true);
  clone.style.display = "block";
  clone.style.position = "static";
  clone.style.left = "";
  clone.style.top = "";
  clone.style.margin = "0 auto";
  clone.style.visibility = "visible";

  document.body.appendChild(clone);

  const cleanup = () => {
    if (clone && clone.parentNode) {
      clone.parentNode.removeChild(clone);
    }
  };

  // --- 3. Scrollzustand sichern & nach oben springen ---

  const prevScrollX = window.scrollX || window.pageXOffset || 0;
  const prevScrollY = window.scrollY || window.pageYOffset || 0;
  window.scrollTo(0, 0);

  const filename = "Mischungsverhaeltnis_" + (machineNo || "Bericht") + ".pdf";

  // --- 4. PDF als Blob erzeugen und Download selbst auslösen ---

  const worker = window.html2pdf()
    .from(clone)
    .set({
      margin: 10,
      filename: filename,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        scrollY: 0
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
    })
    .toPdf();

  const pdfPromise = worker
    .outputPdf("blob")   // <--- statt .save(): Blob erzeugen
    .then((blob) => {
      const url = URL.createObjectURL(blob);

      if (isIOS()) {
        // Auf iOS: PDF im neuen Tab/Viewer öffnen, damit Nutzer es speichern/teilen kann
        window.open(url, "_blank");
      } else {
        // Download-Link simulieren
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      // URL nach einer Weile wieder freigeben
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 60000);
    })
    .then(() => {
      window.scrollTo(prevScrollX, prevScrollY);
      cleanup();
    })
    .catch((e) => {
      console.error("PDF-Export fehlgeschlagen:", e);
      window.scrollTo(prevScrollX, prevScrollY);
      cleanup();
    });

  return pdfPromise;
}





// Export-Logik in eigene Funktion ausgelagert
function performExport(machineNo, reportDate, creatorName) {
  // Materialsorte & -typ
  const famEl = materialFamily;
  const specEl = materialSpec;
  const famText =
    famEl && famEl.selectedIndex >= 0
      ? famEl.options[famEl.selectedIndex].textContent.trim()
      : "";
  const specText =
    specEl && specEl.selectedIndex >= 0
      ? specEl.options[specEl.selectedIndex].textContent.trim()
      : "";

  // Toleranzbereich / Zielwert – nur den reinen %-Bereich bzw. Zahlenwert aus der Anzeige übernehmen
  let tolText = "";
  if (tolRange && tolRange.textContent.trim() !== "") {
    let raw = tolRange.textContent.trim();
    // Alles vor dem letzten Doppelpunkt abschneiden (z.B. "Herstellervorgabe nach Gewicht: 6,20% – 6,50 %")
    const colonIdx = raw.lastIndexOf(":");
    if (colonIdx !== -1) {
      raw = raw.slice(colonIdx + 1).trim();
    }
    tolText = raw;
  }

  // Mittelwert
  const meanText = meanResult ? meanResult.textContent.trim() : "";

  // 1) PDF erzeugen (liefert Promise, wenn html2pdf das unterstützt)
  let pdfPromise;
  try {
    pdfPromise = generatePdfReport(
      machineNo,
      reportDate,
      famText,
      specText,
      tolText,
      meanText,
      creatorName
    );
  } catch (e) {
    console.error("PDF-Export fehlgeschlagen:", e);
  }

  // 2) Textbericht für E-Mail erzeugen
  const reportText = buildReport(
    machineNo,
    reportDate,
    famText,
    specText,
    tolText,
    meanText,
    creatorName
  );

  // Hilfsfunktion: Mail öffnen
  const sendMail = () => {
    if (window.EXPORT_EMAIL && typeof window.EXPORT_EMAIL === "string") {
      const subject = encodeURIComponent("Mischungsverhältnis Bericht");
      const body = encodeURIComponent(reportText);
      const mailto =
        "mailto:" +
        encodeURIComponent(window.EXPORT_EMAIL) +
        "?subject=" +
        subject +
        "&body=" +
        body;
      window.location.href = mailto;
    }
  };

  // 3) Auf PDF-Promise warten – dann Mail öffnen
  if (pdfPromise && typeof pdfPromise.then === "function") {
    pdfPromise
      .then(() => {
        // PDF-Finish → jetzt Mail-App öffnen
        sendMail();
      })
      .catch((e) => {
        console.error("PDF-Export fehlgeschlagen (Promise):", e);
        // zur Sicherheit trotzdem Mail öffnen
        sendMail();
      });
  } else {
    // Fallback: wenn kein Promise zurückkommt, verhalten wie bisher
    sendMail();
  }
}


if (exportBtn) {
  exportBtn.addEventListener("click", () => {
    if (!results.length) return;
    openMachineModal();
  });
}

// Modal-Button-Events
if (machineCancel) {
  machineCancel.addEventListener("click", () => {
    closeMachineModal();
  });
}

if (machineConfirm) {
  machineConfirm.addEventListener("click", () => {
    const machineNo = machineInput ? machineInput.value.trim() : "";
    const reportDate = machineDateInput ? machineDateInput.value.trim() : formatToday();
    const creatorName = machineCreatorInput ? machineCreatorInput.value.trim() : "";
    closeMachineModal();
    performExport(machineNo, reportDate, creatorName);
  });
}

// Cache leeren Button: entfernt gespeicherte Einstellungen und setzt Ansicht zurück
function clearAppState() {
  try {
    localStorage.removeItem("hdt-theme");
    localStorage.removeItem("hdt-machine-no");
    localStorage.removeItem("hdt-report-date");
    localStorage.removeItem("hdt-creator-name");
    localStorage.removeItem(CUSTOM_MAT_KEY); // 👈 Custom-Materialien aus localStorage löschen
  } catch (e) {
    // ignore
  }

  // 👇 Custom-Materialien auch im Arbeitsspeicher zurücksetzen
  if (typeof CUSTOM_MATERIALS !== 'undefined') {
    CUSTOM_MATERIALS = { PU: [], PS: [], SI: [] };
  }

  // Material-Dropdowns neu aufbauen, damit sie die entfernten Custom-Mats nicht mehr anzeigen
  if (typeof populateSpecs === "function") {
    populateSpecs();        // setzt die Options neu
  }
  if (typeof renderTolerance === "function") {
    renderTolerance();      // optional, falls du das hast
  }

  // Rest wie gehabt:
  applyTheme('default');

  // Ergebnisse und Anzeige zurücksetzen
  results = [];
  if (typeof updateList === "function") updateList();
  if (typeof updateMean === "function") updateMean();
  if (tolBox) {
    tolBox.style.display = "none";
  }

  // Seite/PWA neu laden, damit alles komplett neu initialisiert wird
  if (typeof window !== 'undefined' && window.location) {
    // kleiner Timeout, damit UI-Änderungen vorher noch gezeichnet werden können
    setTimeout(() => {
      window.location.reload();
    }, 150);
  }
}

if (clearCacheBtn) {
  clearCacheBtn.addEventListener("click", clearAppState);
}

function calcLive() {
  const a = parseFloat(inputA.value);
  const b = parseFloat(inputB.value);
  if (a > 0 && !isNaN(b)) {
    // Verhältnis A zu B berechnen
    const val = (100 * b) / a;
    liveResult.textContent = val.toFixed(2);
    confirmBtn.disabled = false;
  } else {
    liveResult.textContent = "–";
    confirmBtn.disabled = true;
  }
}

[inputA, inputB].forEach((el) =>
  ["input", "change", "keyup"].forEach((event) =>
    el.addEventListener(event, calcLive)
  )
);

confirmBtn.addEventListener("click", () => {
  const val = parseFloat(liveResult.textContent);
  // Neu: Ergebnisse in zeitlicher Reihenfolge (älteste Probe = Ergebnis 1)
  results.push(val);
  if (results.length > 5) results.shift();
  inputA.value = "";
  inputB.value = "";
  calcLive();
  updateList();
  updateMean();
});

function updateList() {
  resultList.innerHTML = "";
  results.forEach((r, i) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="result-label">Probe ${i + 1}</span>
      <span class="value-chip">${r.toFixed(2)}</span>
      <button class="delete-btn" onclick="deleteResult(${i})">❌</button>
    `;
    resultList.appendChild(li);
  });
  updateExportButtonState();
}

function deleteResult(index) {
  results.splice(index, 1);
  updateList();
  updateMean();
  updateExportButtonState();
}

function updateMean() {
  if (!results.length) {
    meanResult.textContent = "–";
    return;
  }
  const sum = results.reduce((a, b) => a + b, 0);
  meanResult.textContent = (sum / results.length).toFixed(2);
}

// INSTALL LOGIK
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (installBtn) installBtn.style.display = "block";
});

installBtn?.addEventListener("click", () => {
  installBtn.style.display = "none";
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => {
      deferredPrompt = null;
    });
  }
});

// iOS Hinweis
if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
  installBtn.style.display = "block";
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js");
}


// === Added: Materials & Tolerance Logic ===

// Data: example specs; replace/extend with your real manufacturer specs
//
// Each spec defines a minimum and maximum allowable percentage of component B
// relative to component A (in percent). There is intentionally no single
// "target" value because manufacturers only provide an acceptable range.
// For example, Emcepren 200 Classic has a range of 6.50 % – 6.80 %.
// Global storage for materials. It will be populated asynchronously from an
// external JSON file (materials.json) at runtime. Initially empty to allow
// early references.
let MATERIALS = {
  PS: [],
  PU: [],
  SI: [],
};

const materialFamily = document.getElementById("materialFamily");
const materialSpec   = document.getElementById("materialSpec");
const tolBox   = document.getElementById("toleranceBox");
const tolStatus= document.getElementById("tolStatus");
const tolMsg   = document.getElementById("tolMsg");
// Range container: used to hide or show the permissible range text
const tolRange = document.getElementById("tolRange");
// The tolerance display shows only the minimum and maximum range; there is no "tolTarget" element.
// tolTarget would be undefined if queried, so we omit it.
const tolMin   = document.getElementById("tolMin");
const tolMax   = document.getElementById("tolMax");

const CUSTOM_MAT_KEY = 'hdt-custom-materials';

function loadCustomMaterials() {
  try {
    const raw = localStorage.getItem(CUSTOM_MAT_KEY);
    if (!raw) {
      return { PU: [], PS: [], SI: [] };
    }
    const parsed = JSON.parse(raw);
    return {
      PU: Array.isArray(parsed.PU) ? parsed.PU : [],
      PS: Array.isArray(parsed.PS) ? parsed.PS : [],
      SI: Array.isArray(parsed.SI) ? parsed.SI : []
    };
  } catch (e) {
    console.error('Fehler beim Laden benutzerdefinierter Materialien:', e);
    return { PU: [], PS: [], SI: [] };
  }
}

function saveCustomMaterials(custom) {
  try {
    localStorage.setItem(CUSTOM_MAT_KEY, JSON.stringify(custom));
  } catch (e) {
    console.error('Fehler beim Speichern benutzerdefinierter Materialien:', e);
  }
}

let CUSTOM_MATERIALS = loadCustomMaterials();

// Elemente für das Material-Hinzufügen-Modal
const materialModal = document.getElementById('materialModal');
const newMatFamily = document.getElementById('newMatFamily');
const newMatId = document.getElementById('newMatId');
const newMatName = document.getElementById('newMatName');
const newMatTarget = document.getElementById('newMatTarget');
const newMatMin = document.getElementById('newMatMin');
const newMatMax = document.getElementById('newMatMax');
const newMatCancel = document.getElementById('newMatCancel');
const newMatConfirm = document.getElementById('newMatConfirm');

function openMaterialModal() {
  if (!materialModal) return;
  materialModal.style.display = 'flex';
  if (newMatId) newMatId.value = '';
  if (newMatName) newMatName.value = '';
  if (newMatTarget) newMatTarget.value = '';
  if (newMatMin) newMatMin.value = '';
  if (newMatMax) newMatMax.value = '';
  if (newMatFamily && materialFamily) {
    newMatFamily.value = materialFamily.value || 'PU';
  }
  if (newMatId) newMatId.focus();
}

function closeMaterialModal() {
  if (!materialModal) return;
  materialModal.style.display = 'none';
}

if (newMatCancel) {
  newMatCancel.addEventListener('click', () => {
    closeMaterialModal();
  });
}

if (newMatConfirm) {
  newMatConfirm.addEventListener('click', () => {
    if (!newMatFamily || !newMatId || !newMatName) return;
    const fam = newMatFamily.value;
    const id = (newMatId.value || '').trim();
    const name = (newMatName.value || '').trim();

    if (!fam || !id || !name) {
      alert('Bitte Materialsorte, ID und Bezeichnung ausfüllen.');
      return;
    }

    const parseNum = (input) => {
      if (!input) return null;
      const v = parseFloat(String(input).replace(',', '.'));
      return Number.isFinite(v) ? v : null;
    };

    const target = parseNum(newMatTarget.value);
    const min = parseNum(newMatMin.value);
    const max = parseNum(newMatMax.value);

    const newMat = {
      id,
      name,
      targetPercentB: target,
      minPercentB: min,
      maxPercentB: max,
      isCustom: true
    };

    if (!CUSTOM_MATERIALS[fam]) {
      CUSTOM_MATERIALS[fam] = [];
    }
    CUSTOM_MATERIALS[fam].push(newMat);
    saveCustomMaterials(CUSTOM_MATERIALS);

    if (!MATERIALS[fam]) {
      MATERIALS[fam] = [];
    }
    MATERIALS[fam].push(newMat);

    if (materialFamily) {
      materialFamily.value = fam;
    }
    if (typeof populateSpecs === 'function') {
      populateSpecs();
    }
    if (materialSpec) {
      materialSpec.value = id;
    }
    if (typeof renderTolerance === 'function') {
      renderTolerance();
    }

    closeMaterialModal();

    alert('Material gespeichert. need to be added in materials.json @ dosing.git');
  });
}





// Populate materials on load
function populateSpecs() {
  if (!materialFamily || !materialSpec) return;
  const family = materialFamily.value || "PU";
  const specs = MATERIALS[family] || [];
  materialSpec.innerHTML = '<option value="" disabled selected>  </option>'; //Dropdown Materialtyp
  specs.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.id;
    // Nur den Materialnamen anzeigen; benutzerdefinierte Materialien mit ★ kennzeichnen
    opt.textContent = (s.isCustom ? '★ ' : '') + s.name;
    materialSpec.appendChild(opt);
  });
}

function getSelectedSpec() {
  const fam = materialFamily?.value;
  const id  = materialSpec?.value;
  if (!fam || !id) return null;
  return (MATERIALS[fam] || []).find((s) => s.id === id) || null;
}

// Parse numeric percentage from meanResult chip (supports decimals)
function getMeanPercent() {
  // Use results array from existing code if available
  try {
    if (typeof results !== 'undefined' && Array.isArray(results) && results.length) {
      const valid = results.filter((v) => typeof v === 'number' && !isNaN(v));
      if (valid.length) {
        const mean = valid.reduce((acc, v) => acc + v, 0) / valid.length;
        return mean;
      }
    }
  } catch (e) {}
  // fallback: parse from DOM
  const el = document.getElementById("meanResult");
  if (!el) return null;
  const t = (el.textContent || '').trim().replace(',', '.');
  const v = parseFloat(t);
  return Number.isFinite(v) ? v : null;
}

function renderTolerance() {
  if (!tolBox) return;
  const spec = getSelectedSpec();
  const mean = getMeanPercent();
  if (!spec || mean == null) { tolBox.style.display = 'none'; return; }
  // Determine whether finite endpoints exist and whether they define a real range
  const hasMin = Number.isFinite(spec.minPercentB);
  const hasMax = Number.isFinite(spec.maxPercentB);
  const hasTarget = Number.isFinite(spec.targetPercentB);
  const isExact =
    hasMin && hasMax && Math.abs(spec.minPercentB - spec.maxPercentB) < 1e-12;

  // Always show the tolerance card when we have a spec and mean
  tolBox.style.display = 'block';
  tolBox.classList.remove('ok', 'low', 'high', 'neutral');

  // Case 1: kein hinterlegter Bereich (weder min noch max)
  // Falls ein Zielwert hinterlegt ist (targetPercentB), wird dieser als reiner
  // Sollwert verwendet. Ohne Zielwert gibt es nur die Hinweisbox ohne Prüfung.
  if (!hasMin && !hasMax) {
    if (hasTarget) {
      const target = spec.targetPercentB;
      if (tolRange) {
        const tv = target.toFixed(2).replace('.', ',');
        tolRange.style.display = '';
        tolRange.innerHTML = 'Zielwert: ' + tv + ' %';
      }
      const eps = 1e-9;
      if (mean <= target - eps) {
        tolStatus.textContent = t('tol_low_title');
        tolMsg.textContent = t('tol_msg_low');
        tolBox.classList.add('low');
      } else if (mean >= target + eps) {
        tolStatus.textContent = t('tol_high_title');
        tolMsg.textContent = t('tol_msg_high');
        tolBox.classList.add('high');
      } else {
        tolStatus.textContent = t('tol_ok_title');
        tolMsg.textContent = t('tol_msg_ok');
        tolBox.classList.add('ok');
      }
    } else {
      if (tolRange) tolRange.style.display = 'none';
      tolStatus.textContent = t('tol_neutral_title');
      tolMsg.textContent = t('tol_msg_neutral');
      tolBox.classList.add('neutral');
    }
    return;
  }

  // Case 2: exact target value (min and max both finite and equal)
  if (isExact) {
    const target = spec.minPercentB;
    // Show the line with "Zielwert" and the target value
    if (tolRange) {
      const tv = target.toFixed(2).replace('.', ',');
      tolRange.style.display = '';
      tolRange.innerHTML = 'Zielwert: ' + tv + ' %';
    }
    const eps = 1e-9;
    if (mean <= target - eps) {
      tolStatus.textContent = t('tol_low_title');
      tolMsg.textContent = t('tol_msg_low');
      tolBox.classList.add('low');
    } else if (mean >= target + eps) {
      tolStatus.textContent = t('tol_high_title');
      tolMsg.textContent = t('tol_msg_high');
      tolBox.classList.add('high');
    } else {
      tolStatus.textContent = t('tol_ok_title');
      tolMsg.textContent = t('tol_msg_ok');
      tolBox.classList.add('ok');
    }
    return;
  }

  // Case 3: real range (min != max)
  if (tolRange) {
    tolRange.style.display = '';
    const min = spec.minPercentB;
    const max = spec.maxPercentB;
    const minStr = min.toFixed(2).replace('.', ',');
    const maxStr = max.toFixed(2).replace('.', ',');
    // Update the range line content
    tolRange.innerHTML = t('target_by_weight') + ' ' + minStr + '% – ' + maxStr + ' %';
  }
  const min = spec.minPercentB;
  const max = spec.maxPercentB;
  const eps = 1e-9;
  if (mean <= min - eps) {
    tolStatus.textContent = t('tol_low_title');
    tolMsg.textContent = t('tol_msg_low');
    tolBox.classList.add('low');
  } else if (mean >= max + eps) {
    tolStatus.textContent = t('tol_high_title');
    tolMsg.textContent = t('tol_msg_high');
    tolBox.classList.add('high');
  } else {
    tolStatus.textContent = t('tol_ok_title');
    tolMsg.textContent = t('tol_msg_ok');
    tolBox.classList.add('ok');
  }
}

// Event wiring
if (materialFamily && materialSpec) {
  materialFamily.addEventListener('change', () => { populateSpecs(); renderTolerance(); });
  materialSpec.addEventListener('change', () => { renderTolerance(); });
  populateSpecs();
}

// Observe meanResult chip to auto-update tolerance
const meanEl = document.getElementById('meanResult');
if (meanEl) {
  const obs = new MutationObserver(() => renderTolerance());
  obs.observe(meanEl, { childList: true, characterData: true, subtree: true });
}

// Also update on confirm/input
if (typeof confirmBtn !== 'undefined') confirmBtn.addEventListener('click', () => setTimeout(renderTolerance, 0));
if (typeof inputA !== 'undefined') inputA.addEventListener('input', () => setTimeout(renderTolerance, 0));
if (typeof inputB !== 'undefined') inputB.addEventListener('input', () => setTimeout(renderTolerance, 0));

// Load materials from external JSON file on startup.
async function loadMaterials() {
  try {
    const res = await fetch('materials.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to load materials.json');
    MATERIALS = await res.json();
    // Benutzerdefinierte Materialien aus localStorage anhängen
    try {
      ['PU','PS','SI'].forEach((fam) => {
        if (!MATERIALS[fam]) {
          MATERIALS[fam] = [];
        }
        const customList = (CUSTOM_MATERIALS && Array.isArray(CUSTOM_MATERIALS[fam])) ? CUSTOM_MATERIALS[fam] : [];
        if (customList.length) {
          const withFlag = customList.map((m) => Object.assign({}, m, { isCustom: true }));
          MATERIALS[fam] = MATERIALS[fam].concat(withFlag);
        }
      });
    } catch (e) {
      console.error('Fehler beim Anhängen benutzerdefinierter Materialien:', e);
    }
    populateSpecs();
    renderTolerance();
  } catch (e) {
    console.error('Fehler beim Laden der Materialien:', e);
  }
}
// Kick off loading when the script is loaded.
loadMaterials();


// === Drei-Punkte-Menü ===
(function initMenu() {
  const menuBtn = document.getElementById('menuBtn');
  const menuPanel = document.getElementById('menuPanel');
  if (!menuBtn || !menuPanel) return;

  function toggleMenu(open) {
    const isOpen = open !== undefined ? open : !menuPanel.classList.contains('open');
    menuPanel.classList.toggle('open', isOpen);
    menuBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  }

  menuBtn.addEventListener('click', () => toggleMenu());

  document.addEventListener('click', (e) => {
    if (!menuPanel.classList.contains('open')) return;
    if (!menuPanel.contains(e.target) && e.target !== menuBtn) {
      toggleMenu(false);
    }
  });

  menuPanel.addEventListener('click', (e) => {
    const btn = e.target.closest('.menu-item');
    if (!btn) return;
    const action = btn.getAttribute('data-action');
    handleMenuAction(action, btn);
    toggleMenu(false);
  });
})();

function handleMenuAction(action, btn) {
  switch (action) {
    case 'lang':
      toggleLanguage();
      break;
    case 'setTheme':
      if (btn) {
        const theme = btn.getAttribute('data-theme') || 'default';
        applyTheme(theme);
      }
      break;
    case 'clearCache':
      if (typeof clearAppState === 'function') {
        clearAppState();
      }
      break;
    case 'addMaterial':
      if (typeof openMaterialModal === 'function') {
        openMaterialModal();
      }
      break;
    default:
      break;
  }
}
// itert die Klickfläche für die Styled Selects:
// Klickt man in den Wrapper (.select) irgendwo neben dem <select>, wird das native
// Select fokussiert und öffnet sich bei Tastatur-/Mouseevent wie gewohnt.
document.querySelectorAll('.select').forEach((wrapper) => {
  wrapper.addEventListener('click', (e) => {
    const sel = wrapper.querySelector('select');
    if (sel && e.target !== sel) {
      sel.focus();
    }
  });
});

// --- App Version automatisch laden ---
async function loadAppVersion() {
  try {
    const res = await fetch('manifest.json', { cache: 'no-store' });
    const manifest = await res.json();
    const version = manifest.version || "FAIL! -> check manifest file!";
    const footer = document.getElementById("appFooter");
    if (footer) {
      footer.textContent = "Version " + version;
    }
  } catch (e) {
    console.error("Version konnte nicht geladen werden:", e);
  }
}

document.addEventListener("DOMContentLoaded", loadAppVersion);
// --- Ende Versionscode ---

