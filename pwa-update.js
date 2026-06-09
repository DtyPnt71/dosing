// HDT Dosing – PWA update manager
// Keeps installed PWAs current without deleting local materials.

if ("serviceWorker" in navigator) {
  (async () => {
    let reg;
    try {
      reg = await navigator.serviceWorker.register("./service-worker.js", { updateViaCache: "none" });
    } catch (e) {
      console.warn("Service Worker konnte nicht registriert werden:", e);
      return;
    }

    const VER_KEY = "hdt_installed_version";
    const BUILD_KEY = "hdt_installed_build";
    const SNOOZE_KEY = "hdt_update_snoozed_version";

    function normalizeVersionMeta(j) {
      j = j || {};
      const assets = Array.isArray(j.assets)
        ? j.assets
        : (j.cache && Array.isArray(j.cache.assets) ? j.cache.assets : []);
      return {
        version: j.version || "",
        build: j.build || "",
        added: Array.isArray(j.added) ? j.added : (Array.isArray(j.Added) ? j.Added : []),
        fixed: Array.isArray(j.fixed) ? j.fixed : (Array.isArray(j.Fixed) ? j.Fixed : (Array.isArray(j.fixes) ? j.fixes : [])),
        removed: Array.isArray(j.removed) ? j.removed : (Array.isArray(j.Removed) ? j.Removed : []),
        changes: Array.isArray(j.changes) ? j.changes : (Array.isArray(j.Changes) ? j.Changes : []),
        assets,
        forceReload: j.forceReload !== false
      };
    }

    async function fetchVersion() {
      try {
        const res = await fetch("./version.json?ts=" + Date.now(), { cache: "no-store" });
        if (!res.ok) throw new Error(`version.json HTTP ${res.status}`);
        return normalizeVersionMeta(await res.json());
      } catch (e) {
        return null;
      }
    }

    function getInstalledVersion() {
      try { return String(localStorage.getItem(VER_KEY) || "").trim(); }
      catch (_) { return ""; }
    }

    function storeCurrent(meta) {
      try {
        if (!meta) return;
        const version = String(meta.version || "").trim();
        if (version) {
          localStorage.setItem(VER_KEY, version);
          window.APP_VERSION = version;
        }
        if (meta.build) localStorage.setItem(BUILD_KEY, String(meta.build));
      } catch (_) {}
    }

    function snoozeForSession(meta) {
      try {
        const version = String(meta?.version || "").trim();
        if (version) sessionStorage.setItem(SNOOZE_KEY, version);
      } catch (_) {}
    }

    function isSnoozed(meta) {
      try {
        return String(sessionStorage.getItem(SNOOZE_KEY) || "") === String(meta?.version || "").trim();
      } catch (_) { return false; }
    }

    function shouldPromptForVersion(meta) {
      const nextVersion = String(meta?.version || "").trim();
      if (!nextVersion) return false;
      if (isSnoozed(meta)) return false;
      return nextVersion !== getInstalledVersion();
    }

    function messageWorker(worker, data, timeoutMs = 15000) {
      return new Promise((resolve) => {
        if (!worker || typeof MessageChannel === "undefined") return resolve({ ok: false, reason: "no-worker" });
        const channel = new MessageChannel();
        let done = false;
        const finish = (payload) => {
          if (done) return;
          done = true;
          try { channel.port1.close(); } catch (_) {}
          resolve(payload || { ok: false });
        };
        const timer = setTimeout(() => finish({ ok: false, reason: "timeout" }), timeoutMs);
        channel.port1.onmessage = (event) => {
          clearTimeout(timer);
          finish(event.data || { ok: true });
        };
        try {
          worker.postMessage(data, [channel.port2]);
        } catch (e) {
          clearTimeout(timer);
          finish({ ok: false, reason: e && e.message ? e.message : "postMessage failed" });
        }
      });
    }

    async function warmReleaseCache(meta) {
      const worker = reg.waiting || reg.active || navigator.serviceWorker.controller;
      if (!worker) return false;
      const response = await messageWorker(worker, { type: "CACHE_RELEASE", meta }, 20000);
      return !!(response && response.ok);
    }

    function waitForControllerChange(timeoutMs = 8000) {
      return new Promise((resolve) => {
        let done = false;
        const finish = (changed) => {
          if (done) return;
          done = true;
          try { navigator.serviceWorker.removeEventListener("controllerchange", onChange); } catch (_) {}
          resolve(changed);
        };
        const onChange = () => finish(true);
        navigator.serviceWorker.addEventListener("controllerchange", onChange, { once: true });
        setTimeout(() => finish(false), timeoutMs);
      });
    }

    async function activateWaitingWorker(meta) {
      if (!reg.waiting) return false;
      try { await messageWorker(reg.waiting, { type: "CACHE_RELEASE", meta }, 20000); } catch (_) {}
      const changedPromise = waitForControllerChange(9000);
      try { reg.waiting.postMessage({ type: "SKIP_WAITING" }); } catch (_) {}
      return await changedPromise;
    }

    async function installUpdate(meta) {
      // Try both paths:
      // 1) A changed service-worker.js can become waiting and then be activated.
      // 2) If only app assets/version.json changed, the active worker refreshes the release cache.
      try { await reg.update(); } catch (_) {}
      if (reg.waiting) {
        await activateWaitingWorker(meta);
      } else {
        try { await warmReleaseCache(meta); } catch (_) {}
      }
      storeCurrent(meta);
      // Replace reload prevents the back button from jumping into the old asset state.
      location.replace(location.href.split('#')[0]);
    }

    function promptUpdate(meta) {
      if (!window.__updaterUI || typeof window.__updaterUI.prompt !== "function") return;
      window.__updaterUI.prompt({
        version: meta?.version,
        build: meta?.build,
        added: meta?.added,
        fixed: meta?.fixed,
        removed: meta?.removed,
        changes: meta?.changes,
        onLater: () => snoozeForSession(meta),
        onUpdate: () => installUpdate(meta)
      });
    }

    try { await window.__bootReady; } catch (_) {}

    // Wartungsmodus hat Vorrang vor Update-Hinweisen.
    try {
      if (document.body.classList.contains('is-maintenance')) return;
      const mr = await fetch('manifest.json?ts=' + Date.now(), { cache: 'no-store' });
      const mm = await mr.json();
      if (mm && mm.maintenance === true) return;
    } catch (_) {}

    const currentMeta = await fetchVersion();
    if (currentMeta) applyVersionMeta(currentMeta);

    const storedVersion = getInstalledVersion();
    if (currentMeta && currentMeta.version && !storedVersion) {
      // Erste Installation / erstes Öffnen: aktuelle Version merken, keine Update-Meldung anzeigen.
      storeCurrent(currentMeta);
    } else if (currentMeta && shouldPromptForVersion(currentMeta)) {
      promptUpdate(currentMeta);
    }

    // Falls der Browser parallel eine neue service-worker.js findet.
    reg.addEventListener("updatefound", () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener("statechange", async () => {
        if (nw.state === "installed" && navigator.serviceWorker.controller) {
          const meta = await fetchVersion();
          if (meta) applyVersionMeta(meta);
          if (shouldPromptForVersion(meta)) promptUpdate(meta);
        }
      });
    });
  })();
}
