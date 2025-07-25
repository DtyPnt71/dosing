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
    const val = 100 / ((b / a) * 100);
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
      <div class="label-row">
        <span>Ergebnis ${i + 1}</span>
        <button onclick="deleteResult(${i})">❌Wert löschen</button>
      </div>
      <div class="value">→ ${r.toFixed(2)}</div>
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