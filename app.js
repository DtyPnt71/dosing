// === Boot / Self-Test (device-agnostic) ===
(function bootSelfTest() {
  const onReady = (fn) => {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  };

  const qs = (id) => document.getElementById(id);
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  function showBootOverlay() {
    const overlay = qs("boot-overlay");
    if (overlay) overlay.style.display = "flex";
  }
  function hideBootOverlay() {
    const overlay = qs("boot-overlay");
    if (overlay) overlay.style.display = "none";
  }

  function bootUI() {
    return {
      titleEl: qs("boot-title"),
      statusEl: qs("boot-status"),
      detailsEl: qs("boot-details"),
      progressEl: qs("boot-progress-bar"),
      progressWrap: document.querySelector(".boot-progress"),
      actionsEl: qs("boot-actions"),
      retryBtn: qs("boot-retry"),
      updateBtn: qs("boot-update"),
      laterBtn: qs("boot-later"),
    };
  }

  function clearDetails(ui) {
    if (!ui.detailsEl) return;
    ui.detailsEl.innerHTML = "";
  }

  function appendDetailLine(ui, text, kind = "bullet") {
    if (!ui.detailsEl) return;

    const el = ui.detailsEl;

    // Auto-scroll nur, wenn der Nutzer nicht bewusst nach oben gescrollt hat
    // (sonst würde es „gegen“ den Nutzer scrollen).
    const nearBottom = (el.scrollHeight - el.scrollTop - el.clientHeight) < 40;

    const line = document.createElement("div");
    line.className = kind === "log" ? "boot-log" : "boot-bullet";
    line.textContent = kind === "log" ? text : "• " + text;
    el.appendChild(line);

    if (nearBottom) {
      // rAF damit Layout/ScrollHeight korrekt ist (iOS/Samsung PWA)
      requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
    }
  }

  function setBootProgress(ui, pct) {
    const clamped = Math.max(0, Math.min(100, pct));
    if (ui.progressEl) ui.progressEl.style.width = clamped + "%";
    if (ui.progressWrap) ui.progressWrap.setAttribute("aria-valuenow", String(clamped));
  }

  function setBootStatus(ui, msg) {
    if (ui.statusEl) ui.statusEl.textContent = msg;
    appendDetailLine(ui, msg, "bullet");
  }

  function bootFail(ui, title, err) {
    if (ui.titleEl) ui.titleEl.textContent = "App konnte nicht vollständig geladen werden";
    if (ui.statusEl) ui.statusEl.textContent = title;

    const details = err && (err.stack || err.message) ? (err.stack || err.message) : String(err || "");
    appendDetailLine(ui, `FEHLER: ${details || title}`, "bullet");

    if (ui.actionsEl) ui.actionsEl.style.display = "flex";
    if (ui.retryBtn) ui.retryBtn.onclick = () => location.reload();

    // Keep overlay visible to prevent a half-broken UI.
    throw err instanceof Error ? err : new Error(details || title);
  }

  function parseBuildMeta(buildStr) {
    const build = String(buildStr || "").trim();
    // Expected examples:
    // "Build:2026-02-19 Fix:pdf-export, Skalierung, PWA-backdrop"
    // "Build:2026-02-19 | Fixes: A, B, C"
    const meta = { buildDate: "", label: build, changes: [] };
    if (!build) return meta;

    const mDate = build.match(/\bBuild\s*:\s*([^\s|]+)\b/i);
    if (mDate) meta.buildDate = mDate[1].trim();

    const mFix = build.match(/\b(?:Fix(?:es)?|Changes?)\s*:\s*(.+)$/i);
    if (mFix && mFix[1]) {
      meta.changes = mFix[1]
        .split(/\s*,\s*/)
        .map((s) => s.trim())
        .filter(Boolean);
    }

    return meta;
  }

  function renderUpdateDetails(ui, meta) {
    clearDetails(ui);

    const wrapper = document.createElement("div");
    wrapper.className = "boot-update-details";

    const versionLine = document.createElement("div");
    versionLine.className = "boot-update-version";
    versionLine.textContent = meta?.version ? `Version ${meta.version}` : "Neue Version";
    wrapper.appendChild(versionLine);

    const buildMeta = parseBuildMeta(meta?.build);
    if (buildMeta.buildDate) {
      const buildLine = document.createElement("div");
      buildLine.className = "boot-update-build";
      buildLine.textContent = `Build: ${buildMeta.buildDate}`;
      wrapper.appendChild(buildLine);
    } else if (meta?.build) {
      const buildLine = document.createElement("div");
      buildLine.className = "boot-update-build";
      buildLine.textContent = String(meta.build);
      wrapper.appendChild(buildLine);
    }

    const sections = [];

    const added = Array.isArray(meta?.added) ? meta.added.filter(Boolean) : [];
    const fixed = Array.isArray(meta?.fixed) ? meta.fixed.filter(Boolean) : [];
    const removed = Array.isArray(meta?.removed) ? meta.removed.filter(Boolean) : [];

    // Backward compat:
    // - "changes" (legacy) is treated as Added
    // - "Fix:" info inside build-string is treated as Fixed (NOT Added)
    const legacyChanges = Array.isArray(meta?.changes) ? meta.changes.filter(Boolean) : [];
    const legacyFixesFromBuild = Array.isArray(buildMeta.changes) ? buildMeta.changes : [];

    const finalAdded = added.length ? added : legacyChanges;
    const finalFixed = fixed.length ? fixed : legacyFixesFromBuild;
    const finalRemoved = removed;

    if (finalAdded.length) sections.push({ title: "Neu", items: finalAdded });
    if (finalFixed.length) sections.push({ title: "Verbessert", items: finalFixed });
    if (finalRemoved.length) sections.push({ title: "Entfernt", items: finalRemoved });

    if (sections.length) {
      sections.forEach((sec) => {
        const title = document.createElement("div");
        title.className = "boot-update-section-title";
        title.textContent = sec.title;
        wrapper.appendChild(title);

        const ul = document.createElement("ul");
        ul.className = "boot-update-list";
        sec.items.slice(0, 12).forEach((c) => {
          const li = document.createElement("li");
          li.textContent = c;
          ul.appendChild(li);
        });
        wrapper.appendChild(ul);
      });
    } else {
      const hint = document.createElement("div");
      hint.className = "boot-update-hint";
      hint.textContent = "Update kann jetzt installiert werden. Offline-Nutzung bleibt erhalten.";
      wrapper.appendChild(hint);
    }

    ui.detailsEl?.appendChild(wrapper);
  }

  async function runPseudoUpdateLog(ui) {
    clearDetails(ui);
    setBootProgress(ui, 0);

    // Pseudo-Fortschritt: bewusst "lesbar" langsam.
    // (Vor allem in PWAs wird sonst sofort neu geladen und der Nutzer sieht nichts.)
    const steps = [
      { p: 12, t: "Neue Dateien werden vorbereitet…", d: 420 },
      { p: 32, t: "App-Cache wird aktualisiert…", d: 520 },
      { p: 58, t: "Offline-Version wird erneuert…", d: 520 },
      { p: 82, t: "Neue Version wird aktiviert…", d: 520 },
      { p: 94, t: "App wird neu geladen…", d: 360 },
    ];

    for (const s of steps) {
      appendDetailLine(ui, s.t, "log");
      setBootProgress(ui, s.p);
      await delay(typeof s.d === "number" ? s.d : 900);
    }

    let p = 90;
    // "Warten" etwas länger, aber nicht zu spammy.
    let spinCount = 0;
    while (p < 98) {
      appendDetailLine(ui, "Aktiviere neue Funktionen…", "log");
      p += 2;
      setBootProgress(ui, p);
      spinCount += 1;
      await delay(spinCount <= 2 ? 1200 : 900);
    }
  }

  function showUpdaterPrompt(ui, meta) {
    showBootOverlay();
    if (ui.titleEl) ui.titleEl.textContent = "Update verfügbar";
    setBootProgress(ui, 100);

    const v = meta && meta.version ? String(meta.version) : "";
    const line = v ? `Neue Version: ${v}` : "Neue Version ist verfügbar!";
    if (ui.statusEl) ui.statusEl.textContent = line;

    renderUpdateDetails(ui, meta);

    if (ui.actionsEl) ui.actionsEl.style.display = "flex";
    if (ui.retryBtn) ui.retryBtn.style.display = "none";
    if (ui.updateBtn) ui.updateBtn.style.display = "inline-flex";
    if (ui.laterBtn) ui.laterBtn.style.display = "inline-flex";

    if (ui.updateBtn) {
      ui.updateBtn.onclick = async () => {
        try {
          ui.updateBtn.disabled = true;
          if (ui.laterBtn) ui.laterBtn.disabled = true;

          if (ui.statusEl) ui.statusEl.textContent = "Update wird installiert…";
          // Pseudo-Log vollständig abspielen, damit man jeden Schritt lesen kann.
          // Erst danach echten Update-Trigger (SW Activation + Reload) starten.
          try {
            await runPseudoUpdateLog(ui);
          } catch (_) {}

          appendDetailLine(ui, "App wird neu gestartet…", "log");
          setBootProgress(ui, 99);
          await delay(900);

          if (typeof meta.onUpdate === "function") await meta.onUpdate();
        } catch (e) {
          if (ui.retryBtn) ui.retryBtn.style.display = "inline-flex";
          if (ui.retryBtn) ui.retryBtn.onclick = () => location.reload();
          if (ui.statusEl) ui.statusEl.textContent = "Update fehlgeschlagen – bitte neu laden.";
          console.error(e);
        }
      };
    }

    if (ui.laterBtn) {
      ui.laterBtn.onclick = () => {
        if (typeof meta.onLater === "function") meta.onLater();
        hideBootOverlay();
      };
    }
  }

  async function runChecks() {
    const ui = bootUI();

    try {
      // Self-test now runs silently. The overlay is only used for real errors or updates.
      const requiredIds = ["menuBtn", "menuPanel", "exportMenuItem", "pdfReport"];
      for (const id of requiredIds) {
        if (!qs(id)) bootFail(ui, `Fehlendes Element: #${id}`, `#${id} nicht gefunden`);
      }

      try {
        const k = "__boot_test__";
        localStorage.setItem(k, "1");
        localStorage.removeItem(k);
      } catch (e) {
        bootFail(ui, "Speicherzugriff blockiert (localStorage)", e);
      }

      hideBootOverlay();
      return true;
    } catch (e) {
      showBootOverlay();
      return false;
    }
  }

  window.__bootReady = new Promise((resolve) => {
    onReady(async () => {
      try {
        const ok = await runChecks();
        resolve(ok);
      } catch (_) {
        resolve(false);
      }
    });
  });

  window.__updaterUI = {
    prompt: (meta) => showUpdaterPrompt(bootUI(), meta),
  };

  window.addEventListener("error", (e) => {
    try {
      const ui = bootUI();
      if (!qs("boot-overlay")) return;
      showBootOverlay();
      bootFail(ui, "Unerwarteter Fehler in der App", e.error || e.message || e);
    } catch (_) {}
  });

  window.addEventListener("unhandledrejection", (e) => {
    try {
      const ui = bootUI();
      if (!qs("boot-overlay")) return;
      showBootOverlay();
      bootFail(ui, "Unerwarteter Fehler (Promise)", e.reason || e);
    } catch (_) {}
  });
})();
// App version is loaded dynamically from version.json.
window.APP_VERSION = "";

window.EXPORT_EMAIL = "info@h-d-tec.de";
// PIN for internal PDF export (change for your deployment)
window.EXPORT_PIN = window.EXPORT_PIN || "4711";

let deferredPrompt;
let results = [];
let resultsMeta = []; // { ts:number, comment:string }

const inputA = document.getElementById("inputA");
const inputB = document.getElementById("inputB");
const liveResult = document.getElementById("liveResult");
const confirmBtn = document.getElementById("confirmBtn");
const resultList = document.getElementById("resultList");
const meanResult = document.getElementById("meanResult");
const installBtn = document.getElementById("installBtn");
const sampleComment = document.getElementById("sampleComment");
const toastHost = document.getElementById("toastHost");

const weightNoticeModal = document.getElementById("weightNoticeModal");
const weightNoticeOk = document.getElementById("weightNoticeOk");

const themeSelect = document.getElementById("themeSelect");
const exportMenuItem = document.getElementById("exportMenuItem");
// Legacy fallback: cache reset is triggered via menu action
const clearCacheBtn = document.getElementById("clearCacheBtn") || document.getElementById("clearCacheMenuItem");


// === Language Handling (DE / EN) ===
// Translations are maintained in i18n.js.
// Fallback keeps the app usable if the file is missing during development.
const TRANSLATIONS = window.HDT_I18N || { de: {}, en: {} };

let CURRENT_LANG = (localStorage.getItem('hdt-lang') === 'en') ? 'en' : 'de';

// Parse user-entered numbers in a locale-tolerant way.
// - Accepts both "6.31" and "6,31"
// - Ignores spaces and common thousands separators

function enforceNumericInput(el) {
  if (!el) return;
  // Allow digits and a single decimal separator (comma or dot). Remove everything else (e.g. letters like "e").
  let v = String(el.value ?? '');
  // Replace minus signs and other characters; keep digits, comma, dot
  v = v.replace(/[^0-9.,]/g, '');

  // If both separators are present, keep the first one and drop the rest
  const firstSepIdx = v.search(/[.,]/);
  if (firstSepIdx !== -1) {
    const head = v.slice(0, firstSepIdx);
    const sep = v[firstSepIdx];
    const tail = v.slice(firstSepIdx + 1).replace(/[.,]/g, '');
    v = head + sep + tail;
  }
  if (v !== el.value) el.value = v;
}

function parseNum(input) {
  if (input == null) return NaN;
  let s = String(input).trim();
  if (!s) return NaN;

  // Remove whitespace (including NBSP) and some common separators
  s = s.replace(/[\s\u00A0]/g, '').replace(/['_]/g, '');

  const hasComma = s.includes(',');
  const hasDot = s.includes('.');

  // If both are present, treat the last occurrence as the decimal separator
  if (hasComma && hasDot) {
    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');
    if (lastComma > lastDot) {
      // 1.234,56 -> 1234.56
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      // 1,234.56 -> 1234.56
      s = s.replace(/,/g, '');
    }
  } else if (hasComma && !hasDot) {
    // 6,31 -> 6.31
    s = s.replace(',', '.');
  } else {
    // Only dot or no separator: Number(...) can handle it
  }

  return Number(s);
}

// Keep the latest computed live value as a number to avoid re-parsing
// formatted UI strings like "6,31" (parseFloat would turn that into 6).
let LAST_LIVE_VAL = null;

function fmt2(val) {
  const num = Number(val);
  if (!Number.isFinite(num)) return '–';
  const s = num.toFixed(2);
  return (CURRENT_LANG === 'de') ? s.replace('.', ',') : s;
}

// === Toasts (replace alert()) ===
let _toastSeq = 0;
function showToast(message, opts = {}) {
  if (!toastHost) return null;
  const {
    type = 'neutral',
    timeout = 2200,
    sticky = false,
  } = opts;

  const id = `t${Date.now()}_${_toastSeq++}`;
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.setAttribute('role', 'status');
  el.dataset.toastId = id;
  el.innerHTML = `<div class="toast-msg"></div><button class="toast-close" aria-label="Close">✕</button>`;
  el.querySelector('.toast-msg').textContent = message;
  el.querySelector('.toast-close').addEventListener('click', () => {
    el.classList.add('closing');
    setTimeout(() => el.remove(), 160);
  });
  toastHost.appendChild(el);
  requestAnimationFrame(() => el.classList.add('open'));

  if (!sticky) {
    setTimeout(() => {
      if (!el.isConnected) return;
      el.classList.add('closing');
      setTimeout(() => el.remove(), 160);
    }, timeout);
  }
  return id;
}

function updateToast(id, message, opts = {}) {
  if (!toastHost || !id) return;
  const el = toastHost.querySelector(`[data-toast-id="${id}"]`);
  if (!el) return;
  if (message != null) {
    const msg = el.querySelector('.toast-msg');
    if (msg) msg.textContent = message;
  }
  if (opts.type) {
    el.className = `toast toast-${opts.type}`;
  }
  if (opts.done) {
    setTimeout(() => {
      if (!el.isConnected) return;
      el.classList.add('closing');
      setTimeout(() => el.remove(), 160);
    }, opts.timeout ?? 1500);
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getStatusForValue(value, spec) {
  if (!spec || value == null || !Number.isFinite(value)) return 'neutral';
  const hasMin = Number.isFinite(spec.minPercentB);
  const hasMax = Number.isFinite(spec.maxPercentB);
  const hasTarget = Number.isFinite(spec.targetPercentB);
  const eps = 1e-9;

  // No range, but a target value exists
  if (!hasMin && !hasMax) {
    if (!hasTarget) return 'neutral';
    if (value <= spec.targetPercentB - eps) return 'low';
    if (value >= spec.targetPercentB + eps) return 'high';
    return 'ok';
  }

  // Exact target (min==max)
  if (hasMin && hasMax && Math.abs(spec.minPercentB - spec.maxPercentB) < 1e-12) {
    const target = spec.minPercentB;
    if (value <= target - eps) return 'low';
    if (value >= target + eps) return 'high';
    return 'ok';
  }

  // Real range
  if (hasMin && value <= spec.minPercentB - eps) return 'low';
  if (hasMax && value >= spec.maxPercentB + eps) return 'high';
  return 'ok';
}


function t(key) {
  const dict = TRANSLATIONS[CURRENT_LANG] || TRANSLATIONS.de || {};
  const fallback = TRANSLATIONS.de || {};
  return (dict && key in dict) ? dict[key] : (fallback[key] || key);
}

function applyDataI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (!key) return;
    const value = t(key);
    if (el.getAttribute('data-i18n-html') === 'true') {
      el.innerHTML = value;
    } else {
      el.textContent = value;
    }
  });

  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) el.setAttribute('placeholder', t(key));
  });

  root.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    if (key) el.setAttribute('title', t(key));
  });

  root.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
    const key = el.getAttribute('data-i18n-aria-label');
    if (key) el.setAttribute('aria-label', t(key));
  });
}

function applyLanguage() {
  try {
    applyDataI18n();
    if (document.documentElement) {
      document.documentElement.lang = CURRENT_LANG;
    }

    // Header
    const headerTitle = document.getElementById('headerTitle');
    if (headerTitle) headerTitle.textContent = t('header_title');
    const headerSubtitle = document.getElementById('headerSubtitle');
    if (headerSubtitle) headerSubtitle.textContent = t('header_subtitle');

    // Steps / section titles
    const step1 = document.getElementById('step1');
    if (step1) step1.textContent = t('step_1');
    const step2 = document.getElementById('step2');
    if (step2) step2.textContent = t('step_2');
    const step3 = document.getElementById('step3');
    if (step3) step3.textContent = t('step_3');
    const historySectionTitle = document.getElementById('historySectionTitle');
    if (historySectionTitle) historySectionTitle.textContent = t('section_history');
    const historyCardTitle = document.getElementById('historyCardTitle');
    if (historyCardTitle) historyCardTitle.textContent = t('history_card_title');

    // Menu headings
    const menuExportTitle = document.getElementById('menuExportTitle');
    if (menuExportTitle) menuExportTitle.textContent = t('menu_export_title');
    const menuDisplayTitle = document.getElementById('menuDisplayTitle');
    if (menuDisplayTitle) menuDisplayTitle.textContent = t('menu_display_title');
    const menuLanguageTitle = document.getElementById('menuLanguageTitle');
    if (menuLanguageTitle) menuLanguageTitle.textContent = t('menu_language_title');
    const menuDataTitle = document.getElementById('menuDataTitle');
    if (menuDataTitle) menuDataTitle.textContent = t('menu_data_title');
    const menuInfoTitle = document.getElementById('menuInfoTitle');
    if (menuInfoTitle) menuInfoTitle.textContent = t('menu_info_title');

    // Menu items
    if (exportMenuItem) exportMenuItem.textContent = t('menu_export_item');
    const addMatItem = document.getElementById('addMaterialMenuItem');
    if (addMatItem) addMatItem.textContent = t('menu_add_material');
    const manageMatItem = document.getElementById('manageMaterialsMenuItem');
    if (manageMatItem) manageMatItem.textContent = t('menu_manage_materials');
    const aboutItem = document.getElementById('aboutMenuItem');
    if (aboutItem) aboutItem.textContent = t('menu_about');
    const clearDataBtn = document.querySelector('.menu-item[data-action="clearCache"]');
    if (clearDataBtn) clearDataBtn.textContent = t('menu_clear_data');

    // Export auth modal
    const expAuthTitle = document.getElementById('exportAuthTitle');
    if (expAuthTitle) expAuthTitle.textContent = t('export_auth_title');
    const expAuthIntro = document.getElementById('exportAuthIntro');
    if (expAuthIntro) expAuthIntro.textContent = t('export_auth_intro');
    const expPwLabel = document.getElementById('exportPasswordLabel');
    if (expPwLabel) expPwLabel.textContent = t('export_password_label');
    const expAuthConfirm = document.getElementById('exportAuthConfirm');
    if (expAuthConfirm) expAuthConfirm.textContent = t('export_password_btn_continue');

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
    const meanLabel = document.getElementById('meanLabel') || document.querySelector('.mean-section span');
    if (meanLabel) meanLabel.textContent = t('mean_label');

    // (Export is in the menu)

    // Current result label
    const resultLabel = document.getElementById('resultCurrentLabel') || document.querySelector('.result-section .result-label');
    if (resultLabel) resultLabel.textContent = t('result_current_label');

    // Optional comment field
    if (sampleComment) sampleComment.placeholder = t('sample_comment_placeholder');

    // Manage materials modal
    const manageTitle = document.getElementById('manageMaterialsTitle');
    if (manageTitle) manageTitle.textContent = t('manage_materials_title');
    const manageIntro = document.getElementById('manageMaterialsIntro');
    if (manageIntro) manageIntro.textContent = t('manage_materials_intro');

    // Status label
    const statusLabel = document.querySelector('.status-label');
    if (statusLabel) statusLabel.textContent = t('status_label');

    // Tolerance range label
    const tolRange = document.getElementById('tolRange');
    if (tolRange && tolRange.firstChild) {
      tolRange.firstChild.textContent = t('tol_range_label') + ' ';
    }

    // PDF labels
    const pdfLabels = document.querySelectorAll('#pdfReport .pdf-label');
    if (pdfLabels[1]) pdfLabels[1].textContent = t('pdf_family');
    if (pdfLabels[2]) pdfLabels[2].textContent = t('pdf_machine');
    if (pdfLabels[3]) pdfLabels[3].textContent = t('pdf_spec');
    if (pdfLabels[4]) pdfLabels[4].textContent = t('pdf_customer');
    const pdfMaterialChargeTitle = document.getElementById('pdfMaterialChargeTitle');
    if (pdfMaterialChargeTitle) pdfMaterialChargeTitle.textContent = t('pdf_material_charge');
    if (pdfLabels[8]) pdfLabels[8].textContent = t('pdf_mean');
    if (pdfLabels[9]) pdfLabels[9].textContent = t('pdf_creator');

    // Confirm button
    if (confirmBtn) {
      confirmBtn.textContent = t('confirm_button');
    }

    // Install button
    if (installBtn) {
      installBtn.textContent = t('install_button');
    }

    const maskRefreshBtn = document.getElementById('maskRefreshBtn');
    if (maskRefreshBtn) {
      maskRefreshBtn.title = t('refresh_mask');
      maskRefreshBtn.setAttribute('aria-label', t('refresh_mask'));
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

      const customerLabel = machineModalEl.querySelector('label[for="machineCustomerInput"]');
      if (customerLabel) customerLabel.textContent = t('machine_modal_label_customer');

      const materialChargeLabel = document.getElementById('materialChargeLabel');
      if (materialChargeLabel) materialChargeLabel.textContent = t('machine_modal_label_material_charge');

      const materialChargeALabel = document.querySelector('label[for="materialChargeAInput"]');
      if (materialChargeALabel) materialChargeALabel.textContent = t('machine_modal_label_material_charge_a');

      const materialChargeBLabel = document.querySelector('label[for="materialChargeBInput"]');
      if (materialChargeBLabel) materialChargeBLabel.textContent = t('machine_modal_label_material_charge_b');

      const creatorLabel = machineModalEl.querySelector('label[for="machineCreatorSelect"]');
      if (creatorLabel) creatorLabel.textContent = t('machine_modal_label_creator');

      const machineInputEl = document.getElementById('machineInput');
      if (machineInputEl) machineInputEl.setAttribute('placeholder', t('placeholder_machine_no'));

      const machineDateInputEl = document.getElementById('machineDateInput');
      if (machineDateInputEl) machineDateInputEl.setAttribute('placeholder', t('placeholder_machine_date'));

      const machineCustomerInputEl = document.getElementById('machineCustomerInput');
      if (machineCustomerInputEl) machineCustomerInputEl.setAttribute('placeholder', t('placeholder_machine_customer'));

      const materialChargeAInputEl = document.getElementById('materialChargeAInput');
      if (materialChargeAInputEl) materialChargeAInputEl.setAttribute('placeholder', t('placeholder_material_charge_a'));

      const materialChargeBInputEl = document.getElementById('materialChargeBInput');
      if (materialChargeBInputEl) materialChargeBInputEl.setAttribute('placeholder', t('placeholder_material_charge_b'));

      const machineCreatorSelectEl = document.getElementById('machineCreatorSelect');
      const machineCreatorOtherEl = document.getElementById('machineCreatorOtherInput');

      // Translate select placeholder & "Other" option (options may be present before async load)
      if (machineCreatorSelectEl) {
        const opts = machineCreatorSelectEl.querySelectorAll('option');
        if (opts && opts.length) {
          // first option is placeholder
          if (opts[0]) opts[0].textContent = t('creator_select_placeholder');
          // last option is "other"
          const last = opts[opts.length - 1];
          if (last) last.textContent = t('creator_select_other');
        }
      }

      if (machineCreatorOtherEl) machineCreatorOtherEl.setAttribute('placeholder', t('placeholder_creator_other'));

      const machineCancelBtn = document.getElementById('machineCancel');
      const machinePdfActionBtn = document.getElementById('machinePdfAction');
      const machineEmailActionBtn = document.getElementById('machineEmailAction');
      if (machineCancelBtn) machineCancelBtn.textContent = t('btn_cancel');
      if (machinePdfActionBtn) machinePdfActionBtn.textContent = t('btn_pdf_create');
      if (machineEmailActionBtn) machineEmailActionBtn.textContent = t('btn_email_send');
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
      if (cacheBtn) cacheBtn.textContent = '♻️ ' + t('menu_clear_data');

      const addMatBtn = menuPanel.querySelector('button[data-action="addMaterial"]');
      if (addMatBtn) addMatBtn.textContent = '💾 ' + t('menu_add_material');

      const manageMatBtn = menuPanel.querySelector('button[data-action="manageMaterials"]');
      if (manageMatBtn) manageMatBtn.textContent = '🗂️ ' + t('menu_manage_materials');
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

// Theme fixed to default (themes removed)
(function initThemeFixed(){
  if (document.body) {
    document.body.classList.remove('theme-default','theme-ocean','theme-sunset');
    document.body.classList.add('theme-default');
  }
  try { localStorage.removeItem('hdt-theme'); } catch(e) {}
})();

// direkt initial anwenden
applyLanguage();

// === Export Handling ===
function updateExportButtonState() {
  if (!exportMenuItem) return;
  exportMenuItem.disabled = results.length === 0;
}

// --- Export UX state (PDF is created first, then opened/shared on explicit user action) ---
let LAST_EXPORT_PDF = { blob: null, url: null, filename: null };

function resetLastExportPdf() {
  try {
    if (LAST_EXPORT_PDF && LAST_EXPORT_PDF.url) {
      URL.revokeObjectURL(LAST_EXPORT_PDF.url);
    }
  } catch (e) {}
  LAST_EXPORT_PDF = { blob: null, url: null, filename: null };
}

function setMachineExportStatus(message, type = 'neutral') {
  if (!machineExportStatus) return;
  machineExportStatus.style.display = message ? 'block' : 'none';
  machineExportStatus.textContent = message || '';
  // Optional: slight color hint
  try {
    if (type === 'danger') machineExportStatus.style.color = 'var(--danger)';
    else if (type === 'ok') machineExportStatus.style.color = 'var(--ok)';
    else machineExportStatus.style.color = '';
  } catch (e) {}
}

function getExportInputsFromModal() {
  const machineNo = machineInput ? machineInput.value.trim() : '';
  const reportDate = machineDateInput ? machineDateInput.value.trim() : formatToday();
  const creatorName = getCreatorNameForExport();
  const exportComment = machineCommentInput ? String(machineCommentInput.value || '').trim() : '';
  const customerName = machineCustomerInput ? String(machineCustomerInput.value || '').trim() : '';
  const materialChargeEnabledValue = !!(materialChargeEnabled && materialChargeEnabled.checked);
  const materialChargeAValue = materialChargeAInput ? String(materialChargeAInput.value || '').trim() : '';
  const materialChargeBValue = materialChargeBInput ? String(materialChargeBInput.value || '').trim() : '';
  return {
    machineNo,
    reportDate,
    creatorName,
    exportComment,
    customerName,
    materialChargeEnabled: materialChargeEnabledValue,
    materialChargeA: materialChargeAValue,
    materialChargeB: materialChargeBValue
  };
}

function getExportContextTexts() {
  const famEl = materialFamily;
  const specEl = materialSpec;
  const famText =
    famEl && famEl.selectedIndex >= 0
      ? famEl.options[famEl.selectedIndex].textContent.trim()
      : '';
  const specText =
    specEl && specEl.selectedIndex >= 0
      ? specEl.options[specEl.selectedIndex].textContent.trim()
      : '';

  let tolText = '';
  if (tolRange && tolRange.textContent.trim() !== '') {
    let raw = tolRange.textContent.trim();
    const colonIdx = raw.lastIndexOf(':');
    if (colonIdx !== -1) raw = raw.slice(colonIdx + 1).trim();
    tolText = raw;
  }

  const meanText = meanResult ? meanResult.textContent.trim() : '';
  return { famText, specText, tolText, meanText };
}

// Elemente für Bericht-Modal
const machineModal = document.getElementById("machineModal");
const machineInput = document.getElementById("machineInput");
const machineDateInput = document.getElementById("machineDateInput");
const machineCustomerInput = document.getElementById("machineCustomerInput");
const materialChargeEnabled = document.getElementById("materialChargeEnabled");
const materialChargeFields = document.getElementById("materialChargeFields");
const materialChargeAInput = document.getElementById("materialChargeAInput");
const materialChargeBInput = document.getElementById("materialChargeBInput");
const machineCreatorSelect = document.getElementById("machineCreatorSelect");
const machineCreatorOtherInput = document.getElementById("machineCreatorOtherInput");
const machineCommentInput = document.getElementById("machineCommentInput");
const machineCancel = document.getElementById("machineCancel");
const machinePdfAction = document.getElementById("machinePdfAction");
const machineEmailAction = document.getElementById("machineEmailAction");
const machineExportStatus = document.getElementById("machineExportStatus");

// === Clear local data confirm modal ===
const clearDataModal = document.getElementById('clearDataModal');
const clearDataCancel = document.getElementById('clearDataCancel');
const clearDataConfirm = document.getElementById('clearDataConfirm');

// === Creator name list (dropdown) ===
// Loaded from external file so names can be maintained without touching JS.
const CREATOR_NAMES_URL = './creator-names.json';

function setCreatorOtherVisible(visible) {
  if (!machineCreatorOtherInput) return;
  machineCreatorOtherInput.style.display = visible ? '' : 'none';
  if (!visible) machineCreatorOtherInput.value = '';
}

function setMaterialChargeVisible(visible) {
  if (materialChargeFields) materialChargeFields.style.display = visible ? '' : 'none';
  if (!visible) {
    if (materialChargeAInput) materialChargeAInput.value = '';
    if (materialChargeBInput) materialChargeBInput.value = '';
  }
}

function getCreatorNameForExport() {
  if (!machineCreatorSelect) return '';
  const val = String(machineCreatorSelect.value || '');
  if (val === '__other__') {
    return (machineCreatorOtherInput?.value || '').trim();
  }
  return val.trim();
}

async function loadCreatorNames() {
  if (!machineCreatorSelect) return;
  try {
    const res = await fetch(CREATOR_NAMES_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error('Failed to load creator names');
    const data = await res.json();
    const names = Array.isArray(data?.names) ? data.names : (Array.isArray(data) ? data : []);

    // Preserve first placeholder option and last "other" option
    const placeholderOpt = machineCreatorSelect.querySelector('option[value=""]') || machineCreatorSelect.options[0];
    const otherOpt = machineCreatorSelect.querySelector('option[value="__other__"]') || null;

    // Clear and rebuild
    machineCreatorSelect.innerHTML = '';
    if (placeholderOpt) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.disabled = true;
      opt.selected = true;
      opt.textContent = t('creator_select_placeholder');
      machineCreatorSelect.appendChild(opt);
    }

    names
      .filter(n => typeof n === 'string' && n.trim().length)
      .forEach(name => {
        const opt = document.createElement('option');
        opt.value = name.trim();
        opt.textContent = name.trim();
        machineCreatorSelect.appendChild(opt);
      });

    const other = document.createElement('option');
    other.value = '__other__';
    other.textContent = t('creator_select_other');
    machineCreatorSelect.appendChild(other);
  } catch (e) {
    // Fallback: keep existing static options
    console.warn('Could not load creator names; using fallback options.', e);
  }
}

if (machineCreatorSelect) {
  machineCreatorSelect.addEventListener('change', () => {
    const isOther = String(machineCreatorSelect.value) === '__other__';
    setCreatorOtherVisible(isOther);
    if (isOther) {
      setTimeout(() => machineCreatorOtherInput?.focus(), 0);
    }
  });
}

if (materialChargeEnabled) {
  materialChargeEnabled.addEventListener('change', () => {
    setMaterialChargeVisible(!!materialChargeEnabled.checked);
    if (materialChargeEnabled.checked) {
      setTimeout(() => materialChargeAInput?.focus(), 0);
    }
  });
}

// Fire once on load
loadCreatorNames();
setMaterialChargeVisible(!!(materialChargeEnabled && materialChargeEnabled.checked));

// Export auth modal (internal function)
const exportAuthModal = document.getElementById('exportAuthModal');
const exportPasswordInput = document.getElementById('exportPasswordInput');
const exportAuthCancel = document.getElementById('exportAuthCancel');
const exportAuthConfirm = document.getElementById('exportAuthConfirm');
const exportAuthError = document.getElementById('exportAuthError');

let exportUnlocked = false;

function closeExportAuthModal() {
  if (exportAuthModal) exportAuthModal.style.display = 'none';
  if (exportPasswordInput) exportPasswordInput.value = '';
  if (exportAuthError) exportAuthError.style.display = 'none';
  try { document.activeElement && document.activeElement.blur(); } catch(e) {}
}

function openExportAuthModal() {
  if (!exportAuthModal) {
    // If the modal is missing, fall back to export (not expected)
    openMachineModal();
    return;
  }
  exportAuthModal.style.display = 'flex';
  if (exportAuthError) exportAuthError.style.display = 'none';
  setTimeout(() => {
    if (exportPasswordInput) exportPasswordInput.focus();
  }, 10);
}

function tryUnlockExport() {
  const entered = (exportPasswordInput?.value || '').trim();
  if (entered && entered === String(window.EXPORT_PIN || '')) {
    exportUnlocked = true;
    closeExportAuthModal();
    openMachineModal();
    return;
  }
  if (exportAuthError) {
    exportAuthError.textContent = t('export_password_error');
    exportAuthError.style.display = 'block';
  }
}

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
    // Fallback: create PDF blob and open in viewer
    try {
      const { famText, specText, tolText, meanText } = getExportContextTexts();
      const machineNo = '';
      const reportDate = formatToday();
      const creatorName = '';
      const exportComment = '';
      const customerName = '';
      const materialChargeEnabled = false;
      const materialChargeA = '';
      const materialChargeB = '';
      const toastId = showToast(t('toast_exporting'), { type: 'neutral', sticky: true });
      const filename = "Mischungsverhaeltnis_" + (machineNo || "Bericht") + ".pdf";
      generatePdfBlob(machineNo, reportDate, famText, specText, tolText, meanText, creatorName, exportComment, customerName, materialChargeEnabled, materialChargeA, materialChargeB)
        .then((blob) => {
          updateToast(toastId, t('toast_export_done'), { type: 'ok', done: true });
          const url = URL.createObjectURL(blob);
          openPdfInViewer(url);
          setTimeout(() => { try { URL.revokeObjectURL(url); } catch(e) {} }, 60000);
        })
        .catch(() => updateToast(toastId, t('export_status_failed'), { type: 'danger', done: true }));
    } catch (e) {}
    return;
  }
  // Reset PDF state when opening the export modal
  resetLastExportPdf();
  setMachineExportStatus('', 'neutral');
  if (machinePdfAction) machinePdfAction.textContent = t('btn_pdf_create');
  machineModal.style.display = "flex";

  // Guard against accidental immediate close on some mobile/PWA environments
  try { machineModal.dataset.openedAt = String(Date.now()); } catch(e) {}

  if (machineInput) {
    machineInput.value = "";
  }
  if (machineDateInput) {
    machineDateInput.value = formatToday();
  }
  if (machineCustomerInput) {
    machineCustomerInput.value = '';
  }
  if (materialChargeEnabled) {
    materialChargeEnabled.checked = false;
  }
  setMaterialChargeVisible(false);
  if (machineCreatorSelect) {
    // reset selection
    machineCreatorSelect.value = '';
  }
  setCreatorOtherVisible(false);
  if (machineCommentInput) {
    machineCommentInput.value = "";
  }

  setTimeout(() => {
    if (machineInput) machineInput.focus();
  }, 10);
}

function closeMachineModal() {
  if (machineModal) {
    machineModal.style.display = "none";
  }
  try { document.activeElement && document.activeElement.blur(); } catch(e) {}
}

function openClearDataModal() {
  if (!clearDataModal) {
    // Fallback: falls Modal fehlt, trotzdem zurücksetzen
    if (typeof clearAppState === 'function') clearAppState();
    window.location.reload();
    return;
  }
  clearDataModal.style.display = 'flex';
  // Fokus auf "Nein" für sicherere Default-Action
  setTimeout(() => {
    try { clearDataCancel?.focus(); } catch (e) {}
  }, 10);
}

function closeClearDataModal() {
  if (clearDataModal) clearDataModal.style.display = 'none';
  try { document.activeElement && document.activeElement.blur(); } catch(e) {}
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
  lines.push("Materialsorte	: " + (famText || "-"));
  lines.push("Materialtyp 	: " + (specText || "-"));
  lines.push("Maschinen-Nr 	: " + (machineNo || "-"));
  lines.push("Dosierung    	: " + (tolText || "-"));
  lines.push("");
  lines.push("Probe   Ergebnis (%)");
  lines.push("-----   ------------");

  results.forEach((val, idx) => {
    const probe = String(idx + 1).padEnd(5, " "); // z.B. "1    ", "2    "
    const wert = fmt2(val);
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

function isAndroid() {
  try {
    return /android/i.test(navigator.userAgent || '');
  } catch (e) {
    return false;
  }
}

function isSamsungInternet() {
  try {
    return /samsungbrowser/i.test(navigator.userAgent || '');
  } catch (e) {
    return false;
  }
}

function isStandalone() {
  try {
    // iOS Safari (installed) uses navigator.standalone
    if (window.navigator && window.navigator.standalone) return true;
    // Modern browsers / Android PWAs
    return window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  } catch (e) {
    return false;
  }
}

function canUseSaveFilePicker() {
  try {
    return !!(window.isSecureContext && typeof window.showSaveFilePicker === 'function');
  } catch (e) {
    return false;
  }
}

function openPdfInViewer(url) {
  // In PWAs, programmatic downloads are often blocked; opening a viewer is more reliable.
  // Keep this function synchronous (user-gesture) when called.
  try {
    const w = window.open(url, '_blank');
    if (!w) {
      // Fallback if popups are blocked
      window.location.href = url;
    }
  } catch (e) {
    try { window.location.href = url; } catch (e2) {}
  }
}

function downloadPdf(url, filename) {
  // NOTE:
  // - iOS Safari (incl. installed PWA) does not reliably support `a[download]` for blob: URLs.
  // - Android PWAs often still download blob URLs correctly, so do not block that path.
  // - If the download is blocked, we fall back to opening the viewer.
  try {
    if (isIOS()) {
      openPdfInViewer(url);
      return false;
    }

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    a.rel = 'noopener';
    document.body.appendChild(a);

    let triggered = false;
    try {
      if (typeof a.click === 'function') {
        a.click();
        triggered = true;
      }
    } catch (e) {}

    if (!triggered) {
      a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      triggered = true;
    }

    window.setTimeout(() => {
      try { a.remove(); } catch (e) {}
    }, 1000);

    return triggered;
  } catch (e) {
    // Fallback: open in viewer
    openPdfInViewer(url);
    return false;
  }
}

async function trySharePdf(blob, filename) {
  try {
    if (!navigator || typeof navigator.share !== 'function') return false;
    const file = new File([blob], filename, { type: 'application/pdf' });
    if (navigator.canShare && !navigator.canShare({ files: [file] })) return false;
    await navigator.share({ files: [file], title: filename });
    return true;
  } catch (e) {
    return false;
  }
}

function getPdfRenderScale() {
  const dpr = window.devicePixelRatio || 1;
  if (isAndroid() && isStandalone()) {
    return Math.max(1.9, Math.min(2.2, dpr * 1.05));
  }
  if (isSamsungInternet()) {
    return Math.max(2.0, Math.min(2.4, dpr * 1.1));
  }
  return Math.max(2.4, Math.min(3.2, dpr * 1.35));
}

function waitForNodeAssets(node, timeoutMs = 4000) {
  const tasks = [];

  try {
    if (document.fonts && typeof document.fonts.ready?.then === 'function') {
      tasks.push(Promise.race([
        document.fonts.ready.catch(() => undefined),
        new Promise((resolve) => setTimeout(resolve, Math.min(timeoutMs, 1500)))
      ]));
    }
  } catch (e) {}

  try {
    const images = Array.from(node.querySelectorAll('img'));
    images.forEach((img) => {
      const alreadyReady = img.complete && (typeof img.naturalWidth !== 'number' || img.naturalWidth > 0);
      if (alreadyReady) return;
      tasks.push(new Promise((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          resolve();
        };
        const timer = setTimeout(finish, timeoutMs);
        const cleanup = () => {
          clearTimeout(timer);
          img.removeEventListener('load', onLoad);
          img.removeEventListener('error', onError);
        };
        const onLoad = () => { cleanup(); finish(); };
        const onError = () => { cleanup(); finish(); };
        img.addEventListener('load', onLoad, { once: true });
        img.addEventListener('error', onError, { once: true });
      }));
    });
  } catch (e) {}

  if (!tasks.length) return Promise.resolve();
  return Promise.allSettled(tasks).then(() => undefined);
}

function triggerPreparedPdfDownload() {
  if (!LAST_EXPORT_PDF || !LAST_EXPORT_PDF.url || !LAST_EXPORT_PDF.filename) return false;

  let handled = false;
  try {
    handled = !!downloadPdf(LAST_EXPORT_PDF.url, LAST_EXPORT_PDF.filename);
  } catch (e) {
    handled = false;
  }

  if (isStandalone() && !handled) {
    openPdfInViewer(LAST_EXPORT_PDF.url);
    handled = true;
  }

  return handled;
}

const PDF_ENGINE_URL = './html2pdf.bundle.js';
let PDF_ENGINE_LOAD_PROMISE = null;

function ensurePdfEngineLoaded() {
  if (typeof window.html2pdf === 'function') return Promise.resolve(true);
  if (PDF_ENGINE_LOAD_PROMISE) return PDF_ENGINE_LOAD_PROMISE;

  PDF_ENGINE_LOAD_PROMISE = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-pdf-engine="html2pdf"]') || document.querySelector('script[src*="html2pdf.bundle.js"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(true), { once: true });
      existing.addEventListener('error', () => reject(new Error('PDF-Modul konnte nicht geladen werden.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = PDF_ENGINE_URL;
    script.async = true;
    script.defer = true;
    script.dataset.pdfEngine = 'html2pdf';
    script.onload = () => resolve(true);
    script.onerror = () => {
      PDF_ENGINE_LOAD_PROMISE = null;
      reject(new Error('PDF-Modul konnte nicht geladen werden.'));
    };
    document.head.appendChild(script);
  }).then(() => {
    if (typeof window.html2pdf !== 'function') {
      PDF_ENGINE_LOAD_PROMISE = null;
      throw new Error('PDF-Modul ist nicht verfügbar.');
    }
    return true;
  });

  return PDF_ENGINE_LOAD_PROMISE;
}

function generatePdfBlob(machineNo, reportDate, famText, specText, tolText, meanText, creatorName, exportComment, customerName, materialChargeEnabledValue, materialChargeAValue, materialChargeBValue) {
  return ensurePdfEngineLoaded().then(() => generatePdfBlobReady(machineNo, reportDate, famText, specText, tolText, meanText, creatorName, exportComment, customerName, materialChargeEnabledValue, materialChargeAValue, materialChargeBValue));
}

function generatePdfBlobReady(machineNo, reportDate, famText, specText, tolText, meanText, creatorName, exportComment, customerName, materialChargeEnabledValue, materialChargeAValue, materialChargeBValue) {
  const root = document.getElementById("pdfReport");
  if (!root || typeof window.html2pdf === "undefined") {
    return Promise.reject(new Error('PDF template (#pdfReport) or html2pdf is missing'));
  }

  // --- 1. Template (das versteckte #pdfReport) befüllen ---

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value || "";
  };

  // Kopfbereich
  setText("pdfDate", reportDate || "");
  setText("pdfMachine", machineNo || "");
  setText("pdfCustomer", customerName || "");
  setText("pdfFamily", famText || "");
  setText("pdfSpec", specText || "");
  setText("pdfDose", tolText || "");
  setText("pdfMean", meanText || "");
  setText("pdfCreator", creatorName || "");
  setText("pdfComment", (exportComment || "").trim());

  const pdfCustomerRow = document.getElementById('pdfCustomer')?.parentElement || null;
  if (pdfCustomerRow) pdfCustomerRow.style.display = customerName ? '' : 'none';

  const pdfMaterialChargeBlock = document.getElementById('pdfMaterialChargeBlock');
  const pdfMaterialChargeValues = document.getElementById('pdfMaterialChargeValues');
  const chargeLines = [];
  if (materialChargeEnabledValue && materialChargeAValue) chargeLines.push(t('machine_modal_label_material_charge_a').replace(/^\d+\.\s*/, '') + ': ' + materialChargeAValue);
  if (materialChargeEnabledValue && materialChargeBValue) chargeLines.push(t('machine_modal_label_material_charge_b').replace(/^\d+\.\s*/, '') + ': ' + materialChargeBValue);
  if (pdfMaterialChargeValues) {
    pdfMaterialChargeValues.innerHTML = '';
    chargeLines.forEach((line) => {
      const row = document.createElement('div');
      row.textContent = line;
      pdfMaterialChargeValues.appendChild(row);
    });
  }
  if (pdfMaterialChargeBlock) pdfMaterialChargeBlock.style.display = chargeLines.length ? '' : 'none';

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
        tdVal.textContent = fmt2(val);
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

  // Give the browser one frame to layout/paint the cloned report.
  // This improves reliability on some Android WebViews/Samsung Internet builds.
  const pdfPromise = Promise.resolve()
    .then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
    .then(() => waitForNodeAssets(clone))
    .then(() => {
      const renderScale = getPdfRenderScale();
      const worker = window.html2pdf()
        .from(clone)
        .set({
          margin: [8, 8, 10, 8],
          filename: filename,
          image: { type: 'png', quality: 1 },
          html2canvas: {
            scale: renderScale,
            useCORS: true,
            scrollY: 0,
            backgroundColor: '#ffffff',
            letterRendering: true
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: false, floatPrecision: 16 }
        })
        .toPdf();

      return worker.outputPdf("blob");   // Blob erzeugen
    })
    .then((blob) => {
      if (!(blob instanceof Blob) || blob.size === 0) {
        throw new Error('Generated PDF blob is empty');
      }
      // Restore scroll and cleanup before returning the blob.
      window.scrollTo(prevScrollX, prevScrollY);
      cleanup();
      return blob;
    })
    .catch((e) => {
      console.error("PDF-Export fehlgeschlagen:", e);
      window.scrollTo(prevScrollX, prevScrollY);
      cleanup();
      throw e;
    });

  return pdfPromise;
}





// Export-Logik in eigene Funktion ausgelagert
function performExport(machineNo, reportDate, creatorName, exportComment, customerName, materialChargeEnabledValue, materialChargeAValue, materialChargeBValue) {
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

  const toastId = showToast(t('toast_exporting'), { type: 'neutral', sticky: true });
  const filename = "Mischungsverhaeltnis_" + (machineNo || "Bericht") + ".pdf";
  Promise.resolve()
    .then(() => generatePdfBlob(machineNo, reportDate, famText, specText, tolText, meanText, creatorName, exportComment, customerName, materialChargeEnabledValue, materialChargeAValue, materialChargeBValue))
    .then((blob) => {
      updateToast(toastId, t('toast_export_done'), { type: 'ok', done: true });
      const url = URL.createObjectURL(blob);
      // Prefer downloads in regular browser mode; in installed PWAs a viewer is typically more reliable.
      if (isStandalone()) openPdfInViewer(url);
      else downloadPdf(url, filename);
      setTimeout(() => { try { URL.revokeObjectURL(url); } catch(e) {} }, 60000);
    })
    .catch((e) => {
      console.error("PDF-Export fehlgeschlagen:", e);
      updateToast(toastId, t('export_status_failed'), { type: 'danger', done: true });
    });
}


// Export auth modal events
if (exportAuthCancel) {
  exportAuthCancel.addEventListener('click', () => closeExportAuthModal());
}

if (exportAuthConfirm) {
  exportAuthConfirm.addEventListener('click', () => tryUnlockExport());
}

if (exportPasswordInput) {
  exportPasswordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      tryUnlockExport();
    }
  });
}

if (exportAuthModal) {
  // Do NOT close on backdrop click.
  // Reason: on mobile/PWA devices accidental taps outside would close the modal and break the flow.
  // Users must explicitly choose "Abbrechen" or "Weiter".
}

// Clear local data modal events
if (clearDataCancel) {
  clearDataCancel.addEventListener('click', () => closeClearDataModal());
}

if (clearDataConfirm) {
  clearDataConfirm.addEventListener('click', () => {
    closeClearDataModal();
    if (typeof clearAppState === 'function') {
      clearAppState();
    }
    // Reload page so app state (materials.json + localStorage) is reinitialized cleanly.
    // App caches are refreshed, but local materials are only deleted because the user confirmed this modal.
    Promise.resolve(typeof refreshAppCachesOnly === 'function' ? refreshAppCachesOnly() : null)
      .finally(() => {
        setTimeout(() => {
          try { window.location.reload(); } catch (e) {}
        }, 80);
      });
  });
}

if (clearDataModal) {
  clearDataModal.addEventListener('click', (e) => {
    if (e.target === clearDataModal) closeClearDataModal();
  });
}

// Modal-Button-Events
if (machineCancel) {
  machineCancel.addEventListener("click", () => {
    closeMachineModal();
  });
}

// Do NOT close the report modal when clicking the backdrop.
// Reason: on touch devices users often tap next to the dialog by accident (especially while scrolling),
// which would discard the form state and interrupt the PDF download/share flow.

if (machinePdfAction) {
  machinePdfAction.addEventListener('click', async () => {
    if (LAST_EXPORT_PDF && LAST_EXPORT_PDF.blob && LAST_EXPORT_PDF.url && LAST_EXPORT_PDF.filename) {
      triggerPreparedPdfDownload();
      return;
    }

    const { machineNo, reportDate, creatorName, exportComment, customerName, materialChargeEnabled: materialChargeEnabledValue, materialChargeA: materialChargeAValue, materialChargeB: materialChargeBValue } = getExportInputsFromModal();
    const { famText, specText, tolText, meanText } = getExportContextTexts();
    const filename = "Mischungsverhaeltnis_" + (machineNo || "Bericht") + ".pdf";

    // In PWAs, programmatic downloads can be blocked. Prefer a real "Save as…" flow when supported.
    let saveHandle = null;
    if (canUseSaveFilePicker()) {
      try {
        saveHandle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: 'PDF', accept: { 'application/pdf': ['.pdf'] } }]
        });
      } catch (e) {
        // User cancelled the save dialog -> abort without errors.
        if (e && (e.name === 'AbortError' || e.name === 'NotAllowedError')) return;
        console.warn('showSaveFilePicker failed, falling back:', e);
        saveHandle = null;
      }
    }

    // Do not pre-open a viewer window in standalone/PWA mode.
    // On Android/Samsung Internet this can trigger an additional system/file-manager
    // save flow that creates a 0-byte file before the real blob download starts.
    // We therefore keep the export to exactly one save/download path here.

    if (machinePdfAction) machinePdfAction.disabled = true;
    setMachineExportStatus(t('export_status_creating'), 'neutral');
    const toastId = showToast(t('toast_exporting'), { type: 'neutral', sticky: true });

    try {
      const blob = await generatePdfBlob(
        machineNo,
        reportDate,
        famText,
        specText,
        tolText,
        meanText,
        creatorName,
        exportComment,
        customerName,
        materialChargeEnabledValue,
        materialChargeAValue,
        materialChargeBValue
      );

      // 1) If we have a save handle, try to write the file directly.
      // Some Android PWAs / Samsung Internet builds expose showSaveFilePicker()
      // but still fail later on createWritable()/write()/close(). In that case we
      // must NOT abort the whole export because the PDF blob is already ready.
      if (saveHandle) {
        try {
          const writable = await saveHandle.createWritable();
          await writable.write(blob);
          await writable.close();

          const url = URL.createObjectURL(blob);
          resetLastExportPdf();
          LAST_EXPORT_PDF = { blob, url, filename };

          updateToast(toastId, t('toast_export_done'), { type: 'ok', done: true });
          setMachineExportStatus(t('export_status_ready'), 'ok');
          if (machinePdfAction) machinePdfAction.textContent = t('btn_pdf_open');
          
          return;
        } catch (writeErr) {
          console.warn('Direct file write failed after showSaveFilePicker(), falling back to viewer/download:', writeErr);
          saveHandle = null;
        }
      }

      // 2) Otherwise: create an object URL and trigger download/open.
      const url = URL.createObjectURL(blob);
      resetLastExportPdf();
      LAST_EXPORT_PDF = { blob, url, filename };

      // Trigger exactly one export path.
      // On Android/Samsung Internet PWA the classic blob download is the only path that
      // reliably produces a valid file. Automatically opening a viewer afterwards can
      // spawn a second save dialog and create a broken 0-byte file.
      let downloadTriggered = false;
      try {
        downloadTriggered = downloadPdf(url, filename);
      } catch (e) {
        console.warn('downloadPdf failed:', e);
      }

      // Only fall back to a viewer outside Android standalone mode.
      // Android standalone/PWA should stay on the working download flow only.
      if (isStandalone() && !isAndroid() && !downloadTriggered) {
        setTimeout(() => {
          openPdfInViewer(url);
        }, 250);
      }

      updateToast(toastId, t('toast_export_done'), { type: 'ok', done: true });
      setMachineExportStatus(t('export_status_ready'), 'ok');
      if (machinePdfAction) machinePdfAction.textContent = t('btn_pdf_open');
      
    } catch (e) {
      console.error('PDF creation failed:', e);
      updateToast(toastId, t('export_status_failed'), { type: 'danger', done: true });
      setMachineExportStatus(t('export_status_failed'), 'danger');
    } finally {
      if (machinePdfAction) machinePdfAction.disabled = false;
    }
  });
}

if (machineEmailAction) {
  machineEmailAction.addEventListener('click', () => {
    const { machineNo, reportDate, creatorName } = getExportInputsFromModal();
    const { famText, specText, tolText, meanText } = getExportContextTexts();
    const reportText = buildReport(machineNo, reportDate, famText, specText, tolText, meanText, creatorName);

    if (window.EXPORT_EMAIL && typeof window.EXPORT_EMAIL === 'string') {
      const subject = encodeURIComponent('Mischungsverhältnis Bericht');
      const body = encodeURIComponent(reportText);
      const mailto =
        'mailto:' +
        encodeURIComponent(window.EXPORT_EMAIL) +
        '?subject=' +
        subject +
        '&body=' +
        body;
      // Must happen as a direct user gesture for best compatibility (especially in PWAs)
      try { window.location.href = mailto; } catch (e) {}
      // Keep modal open; user might come back and still want to create/open the PDF.
      return;
    }

    showToast('Keine Export-E-Mail-Adresse konfiguriert.', { type: 'danger' });
  });
}

// App-Caches aktualisieren, ohne lokale Materialien direkt anzufassen.
// Wird beim bewussten Zurücksetzen genutzt, nachdem der Nutzer bestätigt hat.
async function refreshAppCachesOnly() {
  if (navigator.onLine === false) return false;
  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const channel = typeof MessageChannel !== 'undefined' ? new MessageChannel() : null;
      if (channel) {
        const response = new Promise((resolve) => {
          const timer = setTimeout(() => resolve(false), 2500);
          channel.port1.onmessage = () => { clearTimeout(timer); resolve(true); };
        });
        navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_RELEASE_CACHES' }, [channel.port2]);
        await response;
      }
    }
  } catch (_) {}

  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys
        .filter((key) => /dosing|hdt/i.test(key))
        .map((key) => caches.delete(key)));
    }
  } catch (_) {}
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

  // Ergebnisse und Anzeige zurücksetzen
  results = [];
  resultsMeta = [];
  if (sampleComment) sampleComment.value = '';
  if (typeof updateList === "function") updateList();
  if (typeof updateMean === "function") updateMean();
  if (tolBox) {
    tolBox.style.display = "none";
  }

  updateStepper();
  showToast(t('toast_cleared'), { type: 'neutral' });
}

if (clearCacheBtn) {
  clearCacheBtn.addEventListener("click", (e) => {
    // prevent duplicate handlers when clicked via menu
    try { e.preventDefault(); } catch (err) {}
    if (typeof openClearDataModal === 'function') {
      openClearDataModal();
    } else {
      clearAppState();
      window.location.reload();
    }
  });
}

function resetInputMask() {
  // Startseiten-Refresh: neue Messung beginnen, ohne lokale Materialien oder Einstellungen zu löschen.
  if (inputA) inputA.value = "";
  if (inputB) inputB.value = "";
  if (sampleComment) sampleComment.value = "";

  LAST_LIVE_VAL = null;
  results = [];
  resultsMeta = [];

  if (liveResult) {
    liveResult.textContent = "–";
    liveResult.dataset.status = 'neutral';
  }
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.classList.remove('is-loading', 'is-done');
  }

  if (typeof updateList === 'function') updateList();
  if (typeof updateMean === 'function') updateMean();
  if (typeof resetLastExportPdf === 'function') resetLastExportPdf();
  if (tolBox) tolBox.style.display = 'none';
  if (typeof renderTolerance === 'function') renderTolerance();
  if (typeof updateStepper === 'function') updateStepper();
  showToast(t('toast_mask_reset'), { type: 'neutral' });
}

const maskRefreshBtn = document.getElementById('maskRefreshBtn');
if (maskRefreshBtn) {
  maskRefreshBtn.addEventListener('click', resetInputMask);
}

function calcLive() {
  const a = parseNum(inputA.value);
  const b = parseNum(inputB.value);
  if (Number.isFinite(a) && Number.isFinite(b) && a > 0 && b >= 0) {
    // Verhältnis A zu B berechnen
    const val = (100 * b) / a;
    LAST_LIVE_VAL = val;
    liveResult.textContent = fmt2(val);
    // Ergebnis optisch hervorheben (abhängig von Materialbereich, falls vorhanden)
    try {
      const spec = getSelectedSpec ? getSelectedSpec() : null;
      const status = getStatusForValue(val, spec);
      if (liveResult) {
        liveResult.dataset.status = status;
      }
    } catch (e) {}
    confirmBtn.disabled = false;
  } else {
    LAST_LIVE_VAL = null;
    liveResult.textContent = "–";
    if (liveResult) liveResult.dataset.status = 'neutral';
    confirmBtn.disabled = true;
  }
  updateStepper();
}

function updateStepper() {
  const step1 = document.getElementById('step1');
  const step2 = document.getElementById('step2');
  const step3 = document.getElementById('step3');
  const famOk = !!(materialFamily && materialFamily.value);
  const specOk = !!(materialSpec && materialSpec.value);
  const hasLive = Number.isFinite(LAST_LIVE_VAL);

  let active = 1;
  if (famOk && specOk) active = 2;
  if (hasLive) active = 3;

  [step1, step2, step3].forEach((el, idx) => {
    if (!el) return;
    const n = idx + 1;
    el.classList.toggle('is-active', n === active);
    el.classList.toggle('is-done', n < active);
  });
}

[inputA, inputB].forEach((el) =>
  ["input", "change", "keyup"].forEach((event) =>
    el.addEventListener(event, () => {
      enforceNumericInput(el);
      calcLive();
    })
  )
);

confirmBtn.addEventListener("click", () => {
  const val = LAST_LIVE_VAL;
  if (!Number.isFinite(val)) return;

  // UX: kurzer Loading-/Check-State (Speichern passiert sofort)
  confirmBtn.disabled = true;
  confirmBtn.classList.add('is-loading');

  const comment = (sampleComment ? (sampleComment.value || '').trim() : '');

  // Neu: Ergebnisse in zeitlicher Reihenfolge (älteste Probe = Ergebnis 1)
  results.push(val);
  resultsMeta.push({ ts: Date.now(), comment });
  if (results.length > 5) {
    results.shift();
    resultsMeta.shift();
  }

  if (sampleComment) sampleComment.value = '';
  inputA.value = "";
  inputB.value = "";
  LAST_LIVE_VAL = null;

  calcLive();
  updateList();
  updateMean();

  // Erfolg anzeigen
  confirmBtn.classList.remove('is-loading');
  confirmBtn.classList.add('is-done');
  setTimeout(() => confirmBtn.classList.remove('is-done'), 700);
  showToast(t('toast_saved'), { type: 'ok' });
});

function updateList() {
  resultList.innerHTML = "";
  const historyCard = resultList ? resultList.closest('.history-section') : null;
  const isEmpty = !results.length;
  if (historyCard) historyCard.classList.toggle('is-empty', isEmpty);
  if (resultList) resultList.classList.toggle('is-empty', isEmpty);

  if (isEmpty) {
    const li = document.createElement('li');
    li.className = 'history-empty';
    li.textContent = t('history_empty');
    resultList.appendChild(li);
    updateExportButtonState();
    return;
  }
  results.forEach((r, i) => {
    const meta = resultsMeta[i] || {};
    const ts = typeof meta.ts === 'number' ? new Date(meta.ts) : null;
    const timeStr = ts ? ts.toLocaleString(undefined, { hour: '2-digit', minute: '2-digit' }) : '';
    const comment = (meta.comment || '').trim();

    const li = document.createElement('li');
    li.className = (i === results.length - 1) ? 'is-latest' : '';
    li.innerHTML = `
      <div class="history-main">
        <div class="history-title">
          <span class="result-label">Probe ${i + 1}</span>
          ${timeStr ? `<span class="history-meta">${timeStr}</span>` : ''}
        </div>
        ${comment ? `<div class="history-comment">${escapeHtml(comment)}</div>` : ''}
      </div>
      <span class="value-chip">${fmt2(r)}</span>
      <button class="delete-btn" type="button" data-index="${i}" aria-label="Probe löschen">✕</button>
    `;
    resultList.appendChild(li);
  });

  // Button delegation
  resultList.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.getAttribute('data-index'));
      if (Number.isFinite(idx)) deleteResult(idx);
    });
  });
  updateExportButtonState();
}

function deleteResult(index) {
  results.splice(index, 1);
  resultsMeta.splice(index, 1);
  updateList();
  updateMean();
  updateExportButtonState();
  showToast(t('toast_deleted'), { type: 'neutral' });
}

function updateMean() {
  if (!results.length) {
    meanResult.textContent = "–";
    if (typeof renderTolerance === 'function') renderTolerance();
    return;
  }
  const sum = results.reduce((a, b) => a + b, 0);
  meanResult.textContent = fmt2(sum / results.length);
  if (typeof renderTolerance === 'function') renderTolerance();
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

// PWA update handling lives in pwa-update.js.


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

function syncCustomMaterialsIntoMaterials() {
  try {
    ['PU','PS','SI'].forEach((fam) => {
      if (!MATERIALS[fam]) MATERIALS[fam] = [];
      // remove previous custom entries
      MATERIALS[fam] = MATERIALS[fam].filter((m) => !m || !m.isCustom);
      const customList = (CUSTOM_MATERIALS && Array.isArray(CUSTOM_MATERIALS[fam])) ? CUSTOM_MATERIALS[fam] : [];
      if (customList.length) {
        const withFlag = customList.map((m) => Object.assign({}, m, { isCustom: true }));
        MATERIALS[fam] = MATERIALS[fam].concat(withFlag);
      }
    });
  } catch (e) {
    console.error('Fehler beim Sync der Custom-Materialien:', e);
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

// Manage/edit state
let EDITING_CUSTOM = null; // { fam, id }

const manageMaterialsModal = document.getElementById('manageMaterialsModal');
const manageMaterialsList = document.getElementById('manageMaterialsList');

function openMaterialModal(editCtx = null) {
  if (!materialModal) return;
  EDITING_CUSTOM = editCtx;
  const titleEl = document.getElementById('materialModalTitle');
  const introEl = document.getElementById('materialModalIntro');
  if (titleEl) titleEl.textContent = editCtx ? (CURRENT_LANG === 'de' ? 'Material bearbeiten' : 'Edit material') : t('material_modal_title');
  if (introEl) introEl.textContent = editCtx ? (CURRENT_LANG === 'de' ? 'Bitte Änderungen speichern:' : 'Please save your changes:') : t('material_modal_intro');
  materialModal.style.display = 'flex';
  if (newMatId) newMatId.value = '';
  if (newMatName) newMatName.value = '';
  if (newMatTarget) newMatTarget.value = '';
  if (newMatMin) newMatMin.value = '';
  if (newMatMax) newMatMax.value = '';
  if (newMatFamily && materialFamily) {
    newMatFamily.value = materialFamily.value || 'PU';
  }
  // Prefill when editing
  if (editCtx && CUSTOM_MATERIALS && CUSTOM_MATERIALS[editCtx.fam]) {
    const existing = CUSTOM_MATERIALS[editCtx.fam].find((m) => m.id === editCtx.id);
    if (existing) {
      if (newMatFamily) newMatFamily.value = editCtx.fam;
      if (newMatId) newMatId.value = existing.id || '';
      if (newMatName) newMatName.value = existing.name || '';
      if (newMatTarget) newMatTarget.value = (existing.targetPercentB == null ? '' : String(existing.targetPercentB).replace('.', (CURRENT_LANG === 'de' ? ',' : '.')));
      if (newMatMin) newMatMin.value = (existing.minPercentB == null ? '' : String(existing.minPercentB).replace('.', (CURRENT_LANG === 'de' ? ',' : '.')));
      if (newMatMax) newMatMax.value = (existing.maxPercentB == null ? '' : String(existing.maxPercentB).replace('.', (CURRENT_LANG === 'de' ? ',' : '.')));
      if (newMatId) newMatId.focus();
    }
  } else {
    if (newMatId) newMatId.focus();
  }
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
      showToast(CURRENT_LANG === 'de' ? 'Bitte Materialsorte, ID und Bezeichnung ausfüllen.' : 'Please fill material family, ID and name.', { type: 'danger' });
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

    if (!CUSTOM_MATERIALS[fam]) CUSTOM_MATERIALS[fam] = [];

    // Edit mode: update existing entry (supports moving between families)
    if (EDITING_CUSTOM) {
      const fromFam = EDITING_CUSTOM.fam;
      const fromId = EDITING_CUSTOM.id;
      const fromList = Array.isArray(CUSTOM_MATERIALS[fromFam]) ? CUSTOM_MATERIALS[fromFam] : [];
      const targetList = CUSTOM_MATERIALS[fam];

      // prevent ID collisions
      const collision = targetList.some((m) => m.id === id) && !(fromFam === fam && fromId === id);
      if (collision) {
        showToast(CURRENT_LANG === 'de' ? 'Diese Material-ID existiert bereits.' : 'This material ID already exists.', { type: 'danger' });
        return;
      }

      // remove old
      const oldIdx = fromList.findIndex((m) => m.id === fromId);
      if (oldIdx >= 0) fromList.splice(oldIdx, 1);
      // add updated
      targetList.push(newMat);
      EDITING_CUSTOM = null;
    } else {
      // Create
      const exists = CUSTOM_MATERIALS[fam].some((m) => m.id === id);
      if (exists) {
        showToast(CURRENT_LANG === 'de' ? 'Diese Material-ID existiert bereits.' : 'This material ID already exists.', { type: 'danger' });
        return;
      }
      CUSTOM_MATERIALS[fam].push(newMat);
    }
    saveCustomMaterials(CUSTOM_MATERIALS);

    // Sync into runtime material list
    syncCustomMaterialsIntoMaterials();

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
    showToast(t('toast_saved'), { type: 'ok' });
    // refresh manage list if open
    if (manageMaterialsModal && manageMaterialsModal.style.display === 'flex') {
      renderManageMaterialsList();
    }
  });
}

function openManageMaterialsModal() {
  if (!manageMaterialsModal) return;
  manageMaterialsModal.style.display = 'flex';
  renderManageMaterialsList();
}

function renderManageMaterialsList() {
  if (!manageMaterialsList) return;
  const famOrder = ['PU', 'PS', 'SI'];
  const famLabels = {
    PU: 'PU',
    PS: 'PS',
    SI: 'SI'
  };

  const groups = famOrder.map((fam) => ({
    fam,
    label: famLabels[fam] || fam,
    items: (CUSTOM_MATERIALS && Array.isArray(CUSTOM_MATERIALS[fam])) ? CUSTOM_MATERIALS[fam] : []
  })).filter((group) => group.items.length);

  if (!groups.length) {
    manageMaterialsList.innerHTML = `<div class="empty-state">${escapeHtml(t('manage_materials_empty'))}</div>`;
    return;
  }

  manageMaterialsList.innerHTML = groups.map((group) => {
    const cards = group.items.map((m) => {
      const hasMin = m.minPercentB != null && Number.isFinite(Number(m.minPercentB));
      const hasMax = m.maxPercentB != null && Number.isFinite(Number(m.maxPercentB));
      const hasTarget = m.targetPercentB != null && Number.isFinite(Number(m.targetPercentB));
      const rangeParts = [];
      if (hasMin) rangeParts.push(fmt2(m.minPercentB));
      if (hasMax) rangeParts.push(fmt2(m.maxPercentB));
      const rangeText = rangeParts.length ? `${rangeParts.join(' – ')} %` : '–';
      const targetText = hasTarget ? `${fmt2(m.targetPercentB)} %` : '–';

      return `
        <div class="mm-item" data-fam="${escapeHtml(group.fam)}" data-id="${escapeHtml(m.id)}">
          <div class="mm-main">
            <div class="mm-title">
              <span class="mm-fam">${escapeHtml(group.fam)}</span>
              <span class="mm-name">${escapeHtml(m.name || m.id)}</span>
            </div>
            <div class="mm-meta">
              <div class="mm-meta-line"><span class="mm-meta-label">${escapeHtml(t('material_meta_range'))}</span><span>${escapeHtml(rangeText)}</span></div>
              <div class="mm-meta-line"><span class="mm-meta-label">${escapeHtml(t('material_meta_target'))}</span><span>${escapeHtml(targetText)}</span></div>
            </div>
          </div>
          <div class="mm-actions">
            <button type="button" class="mm-btn" data-action="edit">${escapeHtml(t('btn_edit'))}</button>
            <button type="button" class="mm-btn danger" data-action="delete">${escapeHtml(t('btn_delete'))}</button>
          </div>
        </div>
      `;
    }).join('');

    return `
      <details class="mm-group" data-fam="${escapeHtml(group.fam)}">
        <summary class="mm-group-summary">
          <span class="mm-group-title-wrap">
            <span class="mm-group-kicker">Materialgruppe</span>
            <span class="mm-group-title">${escapeHtml(group.label)}</span>
          </span>
          <span class="mm-group-count">${group.items.length}</span>
        </summary>
        <div class="mm-group-items">${cards}</div>
      </details>
    `;
  }).join('');

  manageMaterialsList.querySelectorAll('.mm-item').forEach((row) => {
    row.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      const fam = row.getAttribute('data-fam');
      const id = row.getAttribute('data-id');
      if (!fam || !id) return;
      if (action === 'edit') {
        openMaterialModal({ fam, id });
      } else if (action === 'delete') {
        deleteCustomMaterial(fam, id);
      }
    });
  });
}

function deleteCustomMaterial(fam, id) {
  if (!fam || !id) return;
  const list = (CUSTOM_MATERIALS && Array.isArray(CUSTOM_MATERIALS[fam])) ? CUSTOM_MATERIALS[fam] : [];
  const idx = list.findIndex((m) => m.id === id);
  if (idx < 0) return;
  list.splice(idx, 1);
  saveCustomMaterials(CUSTOM_MATERIALS);
  syncCustomMaterialsIntoMaterials();
  if (materialFamily && materialFamily.value === fam) {
    populateSpecs();
    // if selected spec was deleted, reset selection
    if (materialSpec && materialSpec.value === id) {
      materialSpec.value = '';
    }
    renderTolerance();
  }
  renderManageMaterialsList();
  showToast(t('toast_deleted'), { type: 'neutral' });
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
        const tv = fmt2(target);
        tolRange.style.display = '';
        tolRange.innerHTML = t('tol_target_label') + ' ' + tv + ' %';
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
      const tv = fmt2(target);
      tolRange.style.display = '';
      tolRange.innerHTML = t('tol_target_label') + ' ' + tv + ' %';
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
    const minStr = fmt2(min);
    const maxStr = fmt2(max);
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
  materialFamily.addEventListener('change', () => { populateSpecs(); renderTolerance(); updateStepper(); });
  materialSpec.addEventListener('change', () => { renderTolerance(); updateStepper(); });
  populateSpecs();
  updateStepper();
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
    const res = await fetch('materials.json');
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
    // Defensive: if an action throws, we still want to close the menu.
    // Otherwise the modal can end up hidden behind the still-open menu on some Android browsers.
    try {
      handleMenuAction(action, btn);
    } catch (err) {
      console.error('Menu action failed:', err);
    } finally {
      toggleMenu(false);
    }
  });
})();

function handleMenuAction(action, btn) {
  switch (action) {
    case 'export':
      if (!results.length) break;
      if (exportUnlocked) {
        openMachineModal();
      } else {
        openExportAuthModal();
      }
      break;
    case 'lang':
      toggleLanguage();
      break;
    case 'clearCache':
      if (typeof openClearDataModal === 'function') {
        openClearDataModal();
      } else if (typeof clearAppState === 'function') {
        clearAppState();
        window.location.reload();
      }
      break;
    case 'addMaterial':
      if (typeof openMaterialModal === 'function') {
        openMaterialModal();
      }
      break;
    case 'manageMaterials':
      openManageMaterialsModal();
      break;
    case 'openAbout':
      {
        const aboutModal = document.getElementById('aboutModal');
        if (aboutModal) aboutModal.style.display = 'flex';
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

// --- App Version automatisch aus version.json laden ---
function renderAboutList(targetId, items) {
  const el = document.getElementById(targetId);
  if (!el) return;
  const values = Array.isArray(items)
    ? items.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  el.innerHTML = '';
  if (!values.length) {
    el.classList.add('is-empty');
    const li = document.createElement('li');
    li.textContent = '–';
    el.appendChild(li);
    return;
  }
  el.classList.remove('is-empty');
  values.forEach((value) => {
    const li = document.createElement('li');
    li.textContent = value;
    el.appendChild(li);
  });
}

function applyVersionMeta(meta) {
  const version = String(meta?.version || '').trim() || '–';
  const build = String(meta?.build || '').trim() || '–';
  window.APP_VERSION = version;
  const aboutVersion = document.getElementById('aboutVersion');
  if (aboutVersion) aboutVersion.textContent = version;
  const footerVersion = document.getElementById('footerVersion');
  if (footerVersion) footerVersion.textContent = version;
  const aboutBuild = document.getElementById('aboutBuild');
  if (aboutBuild) aboutBuild.textContent = build;
  renderAboutList('aboutAddedList', meta?.added);
  renderAboutList('aboutFixedList', meta?.fixed);
  renderAboutList('aboutRemovedList', meta?.removed);
}

async function loadAppVersion() {
  try {
    const res = await fetch('./version.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`version.json HTTP ${res.status}`);
    const meta = await res.json();
    applyVersionMeta(meta);
  } catch (e) {
    console.error('Version konnte nicht geladen werden:', e);
    applyVersionMeta({});
  }
}

function updateOfflineStatus() {
  const statusEl = document.getElementById('footerOfflineStatus');
  const textEl = document.getElementById('footerOfflineText');
  if (!statusEl || !textEl) return;
  const isOnlineNow = navigator.onLine !== false;
  statusEl.classList.toggle('is-online', isOnlineNow);
  statusEl.classList.toggle('is-offline', !isOnlineNow);
  textEl.textContent = isOnlineNow
    ? '🟢 Online'
    : '🔴 Offline (Berichte können trotzdem erstellt werden)';
}

document.addEventListener('DOMContentLoaded', () => {
  loadAppVersion();
  updateOfflineStatus();
  window.addEventListener('online', updateOfflineStatus);
  window.addEventListener('offline', updateOfflineStatus);
});
// --- Ende Versionscode ---



// === Generic Modal Handling (Footer + About) ===
(function initGenericModals() {
  function openModalById(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = 'flex';
    // focus first close button if available
    const closeBtn = el.querySelector('[data-close-modal]');
    if (closeBtn) closeBtn.focus();
  }

  function closeModal(el) {
    if (!el) return;
    el.style.display = 'none';
  }

  // Open via data-open-modal
  document.addEventListener('click', (e) => {
    const openBtn = e.target.closest('[data-open-modal]');
    if (openBtn) {
      e.preventDefault();
      const id = openBtn.getAttribute('data-open-modal');
      if (id) openModalById(id);
      return;
    }

    // Close via data-close-modal
    const closeBtn = e.target.closest('[data-close-modal]');
    if (closeBtn) {
      e.preventDefault();
      const backdrop = closeBtn.closest('.modal-backdrop');
      closeModal(backdrop);
      return;
    }

    // Click on backdrop closes modal (unless explicitly disabled)
    const backdrop = e.target.classList && e.target.classList.contains('modal-backdrop') ? e.target : null;
    if (backdrop) {
      const allow = backdrop.getAttribute('data-backdrop-close');
      if (String(allow).toLowerCase() === 'false') return;
      closeModal(backdrop);
    }
  });

  // Escape closes the top-most open modal
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const openBackdrops = Array.from(document.querySelectorAll('.modal-backdrop'))
      .filter((el) => el.style.display !== 'none');
    if (openBackdrops.length === 0) return;
    closeModal(openBackdrops[openBackdrops.length - 1]);
  });
})();

// === Start-Hinweis: Berechnung nur nach Gewicht (nicht im Wartungsmodus) ===
(function initWeightNoticeModal() {
  function open() {
    if (!weightNoticeModal) return;
    weightNoticeModal.style.display = 'flex';
    if (weightNoticeOk) weightNoticeOk.focus();
  }
  function close() {
    if (!weightNoticeModal) return;
    weightNoticeModal.style.display = 'none';
  }
  function wireUpCloseHandlers() {
    if (!weightNoticeModal) return;

    if (weightNoticeOk && !weightNoticeOk.__hdt_bound) {
      weightNoticeOk.addEventListener('click', () => close());
      weightNoticeOk.__hdt_bound = true;
    }

    if (!weightNoticeModal.__hdt_bound) {
      weightNoticeModal.addEventListener('click', (e) => {
        if (e.target === weightNoticeModal) close();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && weightNoticeModal.style.display !== 'none') close();
      });
      weightNoticeModal.__hdt_bound = true;
    }
  }

  async function isMaintenanceEnabled() {
    // If the maintenance class is already set, trust it.
    if (document.body.classList.contains('is-maintenance')) return true;

    // Also read the manifest flag directly (the maintenance overlay sets the class via an async fetch)
    try {
      const r = await fetch('manifest.json', { cache: 'no-store' });
      const m = await r.json();
      return !!(m && m.maintenance === true);
    } catch (_) {
      return false;
    }
  }

  async function init() {
    if (!weightNoticeModal) return;
    if (await isMaintenanceEnabled()) return;

    wireUpCloseHandlers();
    open();
  }

  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  onReady(async () => { try { await (window.__bootReady || Promise.resolve(true)); } catch(e){} init(); });

})();
