const STORAGE_KEY = "tax-set-aside-v1";

const defaultState = {
  settings: {
    taxYear: 2026
  },
  records: []
};

const els = {
  amount: document.querySelector("#amount"),
  date: document.querySelector("#date"),
  note: document.querySelector("#note"),
  previewTax: document.querySelector("#previewTax"),
  previewNet: document.querySelector("#previewNet"),
  previewGpm: document.querySelector("#previewGpm"),
  previewPsd: document.querySelector("#previewPsd"),
  previewVsd: document.querySelector("#previewVsd"),
  addButton: document.querySelector("#addButton"),
  recordList: document.querySelector("#recordList"),
  monthList: document.querySelector("#monthList"),
  emptyState: document.querySelector("#emptyState"),
  yearIncome: document.querySelector("#yearIncome"),
  yearTax: document.querySelector("#yearTax"),
  yearNet: document.querySelector("#yearNet"),
  totalIncome: document.querySelector("#totalIncome"),
  totalTax: document.querySelector("#totalTax"),
  totalGpm: document.querySelector("#totalGpm"),
  totalPsd: document.querySelector("#totalPsd"),
  totalVsd: document.querySelector("#totalVsd"),
  totalNet: document.querySelector("#totalNet"),
  settingsButton: document.querySelector("#settingsButton"),
  settingsDialog: document.querySelector("#settingsDialog"),
  taxYear: document.querySelector("#taxYear"),
  saveSettingsButton: document.querySelector("#saveSettingsButton"),
  clearButton: document.querySelector("#clearButton"),
  exportButton: document.querySelector("#exportButton"),
  backupButton: document.querySelector("#backupButton"),
  restoreButton: document.querySelector("#restoreButton"),
  restoreInput: document.querySelector("#restoreInput"),
  recordsView: document.querySelector("#recordsView"),
  summaryView: document.querySelector("#summaryView"),
  monthsView: document.querySelector("#monthsView"),
  tabs: document.querySelectorAll(".tab")
};

let state = loadState();

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return {
      ...defaultState,
      ...saved,
      settings: { ...defaultState.settings, ...saved?.settings },
      records: Array.isArray(saved?.records) ? saved.records : []
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function money(value) {
  return new Intl.NumberFormat("lt-LT", {
    style: "currency",
    currency: "EUR"
  }).format(value || 0);
}

function parseAmount(value) {
  const normalized = String(value).replace(/\s/g, "").replace(",", ".");
  const amount = Number.parseFloat(normalized);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function taxableProfit(income) {
  const expenses = income * 0.3;
  return Math.max(0, income - expenses);
}

function calculateForIncome(income) {
  const profit = taxableProfit(income);
  const socialBase = profit * 0.9;
  const gpmRate = 0.05;
  const psdRate = 0.0698;
  const vsdRate = 0.1552;
  const gpm = profit * gpmRate;
  const psd = socialBase * psdRate;
  const vsd = socialBase * vsdRate;
  const tax = gpm + vsd + psd;

  return {
    income,
    profit,
    socialBase,
    gpm,
    psd,
    vsd,
    tax,
    net: Math.max(0, income - tax)
  };
}

function yearlyCalc(records = state.records) {
  const currentYear = String(state.settings.taxYear);
  const yearRecords = records.filter((record) => record.date?.startsWith(currentYear));
  const income = yearRecords.reduce((sum, record) => sum + record.amount, 0);
  return calculateForIncome(income);
}

function proportionalTaxForRecord(record) {
  return calculateForIncome(record.amount).tax;
}

function updatePreview() {
  const amount = parseAmount(els.amount.value);
  const calc = calculateForIncome(amount);
  els.previewTax.textContent = money(calc.tax);
  els.previewNet.textContent = money(calc.net);
  els.previewGpm.textContent = money(calc.gpm);
  els.previewPsd.textContent = money(calc.psd);
  els.previewVsd.textContent = money(calc.vsd);
}

function renderSummary() {
  const calc = yearlyCalc();
  els.yearIncome.textContent = money(calc.income);
  els.yearTax.textContent = money(calc.tax);
  els.yearNet.textContent = money(calc.net);
  els.totalIncome.textContent = money(calc.income);
  els.totalTax.textContent = money(calc.tax);
  els.totalGpm.textContent = money(calc.gpm);
  els.totalPsd.textContent = money(calc.psd);
  els.totalVsd.textContent = money(calc.vsd);
  els.totalNet.textContent = money(calc.net);
}

function renderRecords() {
  const records = [...state.records].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  els.emptyState.hidden = records.length > 0;
  els.recordList.innerHTML = records.map((record) => {
    const tax = proportionalTaxForRecord(record);
    const note = record.note ? `<small>${escapeHtml(record.note)}</small>` : "";
    return `
      <article class="record">
        <div>
          <div class="record-title">
            <strong>${money(record.amount)}</strong>
            <small>${record.date}</small>
          </div>
          ${note}
        </div>
        <div class="record-actions">
          <div class="tax-pill">${money(tax)}</div>
          <button class="icon-button small" type="button" data-delete="${record.id}" aria-label="Ištrinti įrašą" title="Ištrinti">×</button>
        </div>
      </article>
    `;
  }).join("");
}

function renderMonths() {
  const groups = new Map();
  for (const record of state.records) {
    const key = record.date.slice(0, 7);
    groups.set(key, (groups.get(key) || 0) + record.amount);
  }

  els.monthList.innerHTML = [...groups.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([month, income]) => {
      const calc = calculateForIncome(income);
      return `
        <article class="record">
          <div>
            <div class="record-title">
              <strong>${month}</strong>
              <small>${money(income)} pajamų</small>
            </div>
            <small>Lieka ${money(calc.net)}</small>
          </div>
          <div class="tax-pill">${money(calc.tax)}</div>
        </article>
      `;
    }).join("") || `<div class="empty-state">Mėnesių suvestinė atsiras pridėjus įrašų.</div>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function render() {
  renderSummary();
  renderRecords();
  renderMonths();
  updatePreview();
}

function addRecord() {
  const amount = parseAmount(els.amount.value);
  if (!amount) {
    els.amount.focus();
    return;
  }

  state.records.push({
    id: crypto.randomUUID(),
    amount,
    date: els.date.value || isoToday(),
    note: els.note.value.trim(),
    createdAt: new Date().toISOString()
  });

  els.amount.value = "";
  els.note.value = "";
  saveState();
  render();
  els.amount.focus();
}

function openSettings() {
  els.taxYear.value = state.settings.taxYear;
  els.settingsDialog.showModal();
}

function saveSettings() {
  state.settings = {
    taxYear: Number(els.taxYear.value) || 2026
  };
  saveState();
  render();
}

function exportCsv() {
  const header = ["data", "suma", "gpm", "psd", "vsd", "mokesciai_is_viso", "pastaba"];
  const rows = state.records
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((record) => {
      const calc = calculateForIncome(record.amount);
      return [
        record.date,
        record.amount.toFixed(2),
        calc.gpm.toFixed(2),
        calc.psd.toFixed(2),
        calc.vsd.toFixed(2),
        calc.tax.toFixed(2),
        `"${String(record.note || "").replaceAll('"', '""')}"`
      ];
    });
  const csv = [header, ...rows].map((row) => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `mokesciai-${state.settings.taxYear}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportBackup() {
  downloadJson(`mokesciai-backup-${new Date().toISOString().slice(0, 10)}.json`, {
    app: "tax-set-aside",
    version: 1,
    exportedAt: new Date().toISOString(),
    state
  });
}

function validBackup(data) {
  return data?.app === "tax-set-aside"
    && data?.version === 1
    && Array.isArray(data?.state?.records)
    && data?.state?.settings;
}

function restoreBackup(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const data = JSON.parse(reader.result);
      if (!validBackup(data)) throw new Error("Bad backup");
      state = {
        ...defaultState,
        ...data.state,
        settings: { ...defaultState.settings, ...data.state.settings },
        records: data.state.records
      };
      saveState();
      render();
      els.settingsDialog.close();
    } catch {
      alert("Nepavyko atkurti kopijos. Patikrink, ar pasirinktas teisingas JSON failas.");
    } finally {
      els.restoreInput.value = "";
    }
  });
  reader.readAsText(file);
}

els.date.value = isoToday();
els.amount.addEventListener("input", updatePreview);
els.addButton.addEventListener("click", addRecord);
els.amount.addEventListener("keydown", (event) => {
  if (event.key === "Enter") addRecord();
});
els.settingsButton.addEventListener("click", openSettings);
els.saveSettingsButton.addEventListener("click", saveSettings);
els.exportButton.addEventListener("click", exportCsv);
els.backupButton.addEventListener("click", exportBackup);
els.restoreButton.addEventListener("click", () => els.restoreInput.click());
els.restoreInput.addEventListener("change", () => restoreBackup(els.restoreInput.files[0]));
els.recordList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete]");
  if (!button) return;
  state.records = state.records.filter((record) => record.id !== button.dataset.delete);
  saveState();
  render();
});
els.clearButton.addEventListener("click", () => {
  if (!confirm("Išvalyti visus įrašus?")) return;
  state.records = [];
  saveState();
  render();
  els.settingsDialog.close();
});
els.tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    els.tabs.forEach((item) => item.classList.toggle("active", item === tab));
    els.recordsView.hidden = tab.dataset.tab !== "records";
    els.summaryView.hidden = tab.dataset.tab !== "summary";
    els.monthsView.hidden = tab.dataset.tab !== "months";
  });
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

render();
