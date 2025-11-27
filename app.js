window.EXPORT_EMAIL = "timo.burian@h-d-tec.de";

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

// === Theme Handling ===
(function initTheme() {
  if (!themeSelect) return;
  const saved = localStorage.getItem("hdt-theme") || "default";
  document.body.classList.remove("theme-default", "theme-ocean", "theme-sunset");
  document.body.classList.add("theme-" + saved);
  themeSelect.value = saved;

  themeSelect.addEventListener("change", () => {
    const val = themeSelect.value || "default";
    document.body.classList.remove("theme-default", "theme-ocean", "theme-sunset");
    document.body.classList.add("theme-" + val);
    localStorage.setItem("hdt-theme", val);
  });
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

  const reportText = buildReport(
    machineNo,
    reportDate,
    famText,
    specText,
    tolText,
    meanText,
    creatorName
  );

  // E-Mail vorbereiten – Bericht direkt in den Body
  if (window.EXPORT_EMAIL && typeof window.EXPORT_EMAIL === "string") {
    const subject = "Mischungsverh%C3%A4ltnis Bericht";
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
if (clearCacheBtn) {
  clearCacheBtn.addEventListener("click", () => {
    try {
      localStorage.removeItem("hdt-theme");
      localStorage.removeItem("hdt-machine-no");
      localStorage.removeItem("hdt-report-date");
      localStorage.removeItem("hdt-creator-name");
    } catch (e) {
      // ignore
    }
    // Theme zurücksetzen
    if (document.body) {
      document.body.classList.remove("theme-default", "theme-ocean", "theme-sunset");
      document.body.classList.add("theme-default");
    }
    if (themeSelect) {
      themeSelect.value = "default";
    }
    // Ergebnisse und Anzeige zurücksetzen
    results = [];
    if (typeof updateList === "function") updateList();
    if (typeof updateMean === "function") updateMean();
    if (tolBox) {
      tolBox.style.display = "none";
    }
  });
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
      <span class="result-label">Ergebnis ${i + 1}</span>
      <span class="value-chip">${r.toFixed(2)}</span>
      <button class="delete-btn" onclick="deleteResult(${i})">×</button>
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

// Populate materials on load
function populateSpecs() {
  if (!materialFamily || !materialSpec) return;
  const family = materialFamily.value || "PU";
  const specs = MATERIALS[family] || [];
  materialSpec.innerHTML = '<option value="" disabled selected> -Bitte wählen- </option>';
  specs.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.id;
    // Only display the material name in the dropdown; the range is shown below
    opt.textContent = s.name;
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
        tolStatus.textContent = 'Härtermangel';
        tolMsg.textContent = 'Dosierung anpassen - Dosierblock richtung Hydraulik';
        tolBox.classList.add('low');
      } else if (mean >= target + eps) {
        tolStatus.textContent = 'Härterüberschuss';
        tolMsg.textContent = 'Dosierung anpassen - Dosierblock richtung Dosierpumpe';
        tolBox.classList.add('high');
      } else {
        tolStatus.textContent = 'Dosierung korrekt';
        tolMsg.textContent = 'Ergebnis liegt im vorgegebenen Bereich.';
        tolBox.classList.add('ok');
      }
    } else {
      if (tolRange) tolRange.style.display = 'none';
      tolStatus.textContent = 'Kein Bereich hinterlegt';
      tolMsg.textContent = 'Keine Toleranz hinterlegt – keine Prüfung.';
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
      tolStatus.textContent = 'Härtermangel';
      tolMsg.textContent = 'Dosierung anpassen - Dosierblock richtung Hydraulik';
      tolBox.classList.add('low');
    } else if (mean >= target + eps) {
      tolStatus.textContent = 'Härterüberschuss';
      tolMsg.textContent = 'Dosierung anpassen - Dosierblock richtung Dosierpumpe';
      tolBox.classList.add('high');
    } else {
      tolStatus.textContent = 'Dosierung korrekt';
      tolMsg.textContent = 'Ergebnis liegt im vorgegebenen Bereich.';
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
    tolRange.innerHTML = 'Herstellervorgabe nach Gewicht: ' + minStr + '% – ' + maxStr + ' %';
  }
  const min = spec.minPercentB;
  const max = spec.maxPercentB;
  const eps = 1e-9;
  if (mean <= min - eps) {
    tolStatus.textContent = 'Härtermangel';
    tolMsg.textContent = 'Dosierung anpassen - Dosierblock richtung Hydraulik';
    tolBox.classList.add('low');
  } else if (mean >= max + eps) {
    tolStatus.textContent = 'Härterüberschuss';
    tolMsg.textContent = 'Dosierung anpassen - Dosierblock richtung Dosierpumpe';
    tolBox.classList.add('high');
  } else {
    tolStatus.textContent = 'Dosierung korrekt';
    tolMsg.textContent = 'Ergebnis liegt im vorgegebenen Bereich.';
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
    populateSpecs();
    renderTolerance();
  } catch (e) {
    console.error('Fehler beim Laden der Materialien:', e);
  }
}
// Kick off loading when the script is loaded.
loadMaterials();
// === Custom Select Click Handling ===
// Erweitert die Klickfläche für die Styled Selects:
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