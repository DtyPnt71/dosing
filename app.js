let deferredPrompt;
let results = [];

const inputA = document.getElementById("inputA");
const inputB = document.getElementById("inputB");
const liveResult = document.getElementById("liveResult");
const confirmBtn = document.getElementById("confirmBtn");
const resultList = document.getElementById("resultList");
const meanResult = document.getElementById("meanResult");
const installBtn = document.getElementById("installBtn");

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
  results.unshift(val);
  if (results.length > 5) results.pop();
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
}

function deleteResult(index) {
  results.splice(index, 1);
  updateList();
  updateMean();
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
  const isExact =
    hasMin && hasMax && Math.abs(spec.minPercentB - spec.maxPercentB) < 1e-12;

  // Always show the tolerance card when we have a spec and mean
  tolBox.style.display = 'block';
  tolBox.classList.remove('ok', 'low', 'high', 'neutral');

  // Case 1: no tolerance at all (neither min nor max is defined)
  if (!hasMin && !hasMax) {
    if (tolRange) tolRange.style.display = 'none';
    tolStatus.textContent = 'Kein Bereich hinterlegt';
    tolMsg.textContent = 'Keine Toleranz hinterlegt – keine Prüfung.';
    tolBox.classList.add('neutral');
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
      tolStatus.textContent = 'Zu wenig Härter';
      tolMsg.textContent = 'Wiegebalken von Dosierpumpe weg verstellen.';
      tolBox.classList.add('low');
    } else if (mean >= target + eps) {
      tolStatus.textContent = 'Zu viel Härter';
      tolMsg.textContent = 'Wiegebalken zur Dosierpumpe hin verstellen.';
      tolBox.classList.add('high');
    } else {
      tolStatus.textContent = 'Im Bereich';
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
    tolRange.innerHTML = 'Bereich: ' + minStr + '% – ' + maxStr + ' %';
  }
  const min = spec.minPercentB;
  const max = spec.maxPercentB;
  const eps = 1e-9;
  if (mean <= min - eps) {
    tolStatus.textContent = 'Zu wenig Härter';
    tolMsg.textContent = 'Wiegebalken von Dosierpumpe weg verstellen.';
    tolBox.classList.add('low');
  } else if (mean >= max + eps) {
    tolStatus.textContent = 'Zu viel Härter';
    tolMsg.textContent = 'Wiegebalken zur Dosierpumpe hin verstellen.';
    tolBox.classList.add('high');
  } else {
    tolStatus.textContent = 'Im Bereich';
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
