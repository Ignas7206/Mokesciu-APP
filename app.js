const STORAGE_KEY = "tax-set-aside-v1";
const AUTH_KEY = "tax-set-aside-auth-v1";
const META_KEY = "tax-set-aside-meta-v1";
const APP_VERSION = "v0.3.0";

const defaultState = {
  settings: {
    taxYear: 2026
  },
  records: []
};

const els = {
  appShell: document.querySelector("#appShell"),
  lockScreen: document.querySelector("#lockScreen"),
  pinInput: document.querySelector("#pinInput"),
  pinMessage: document.querySelector("#pinMessage"),
  unlockButton: document.querySelector("#unlockButton"),
  connectionStatus: document.querySelector("#connectionStatus"),
  backupReminder: document.querySelector("#backupReminder"),
  amount: document.querySelector("#amount"),
  date: document.querySelector("#date"),
  note: document.querySelector("#note"),
  todayButton: document.querySelector("#todayButton"),
  yesterdayButton: document.querySelector("#yesterdayButton"),
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
  totalProfit: document.querySelector("#totalProfit"),
  totalSocialBase: document.querySelector("#totalSocialBase"),
  totalGpm: document.querySelector("#totalGpm"),
  totalPsd: document.querySelector("#totalPsd"),
  totalVsd: document.querySelector("#totalVsd"),
  totalNet: document.querySelector("#totalNet"),
  recordCount: document.querySelector("#recordCount"),
  activeMonths: document.querySelector("#activeMonths"),
  averageMonth: document.querySelector("#averageMonth"),
  largestRecord: document.querySelector("#largestRecord"),
  settingsButton: document.querySelector("#settingsButton"),
  settingsDialog: document.querySelector("#settingsDialog"),
  aboutDialog: document.querySelector("#aboutDialog"),
  editDialog: document.querySelector("#editDialog"),
  editAmount: document.querySelector("#editAmount"),
  editDate: document.querySelector("#editDate"),
  editNote: document.querySelector("#editNote"),
  editMessage: document.querySelector("#editMessage"),
  saveEditButton: document.querySelector("#saveEditButton"),
  toast: document.querySelector("#toast"),
  taxYear: document.querySelector("#taxYear"),
  newPin: document.querySelector("#newPin"),
  savePinButton: document.querySelector("#savePinButton"),
  removePinButton: document.querySelector("#removePinButton"),
  pinStatus: document.querySelector("#pinStatus"),
  aboutButton: document.querySelector("#aboutButton"),
  whatsNewButton: document.querySelector("#whatsNewButton"),
  whatsNewDialog: document.querySelector("#whatsNewDialog"),
  versionText: document.querySelector("#versionText"),
  saveSettingsButton: document.querySelector("#saveSettingsButton"),
  clearButton: document.querySelector("#clearButton"),
  exportButton: document.querySelector("#exportButton"),
  searchInput: document.querySelector("#searchInput"),
  yearFilter: document.querySelector("#yearFilter"),
  monthFilter: document.querySelector("#monthFilter"),
  clearFiltersButton: document.querySelector("#clearFiltersButton"),
  filteredCount: document.querySelector("#filteredCount"),
  backupButton: document.querySelector("#backupButton"),
  backupStatus: document.querySelector("#backupStatus"),
  restoreButton: document.querySelector("#restoreButton"),
  restoreInput: document.querySelector("#restoreInput"),
  recordsView: document.querySelector("#recordsView"),
  summaryView: document.querySelector("#summaryView"),
  monthsView: document.querySelector("#monthsView"),
  tabs: document.querySelectorAll(".tab")
};

let state = loadState();
let meta = loadMeta();
let editingRecordId = null;
let toastTimer = null;
let filters = {
  query: "",
  year: String(state.settings.taxYear),
  month: ""
};

function loadAuth() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY));
  } catch {
    return null;
  }
}

function saveAuth(auth) {
  if (!auth) {
    localStorage.removeItem(AUTH_KEY);
    return;
  }
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}

function randomSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashPin(pin, salt) {
  const input = new TextEncoder().encode(`${salt}:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", input);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hasPin() {
  const auth = loadAuth();
  return Boolean(auth?.salt && auth?.hash);
}

async function verifyPin(pin) {
  const auth = loadAuth();
  if (!auth?.salt || !auth?.hash) return true;
  return hashPin(pin, auth.salt).then((hash) => hash === auth.hash);
}

function refreshPinStatus() {
  els.pinStatus.textContent = hasPin() ? "PIN užraktas įjungtas." : "PIN neužstatytas.";
  els.removePinButton.disabled = !hasPin();
}

function showLockIfNeeded() {
  if (!hasPin()) {
    els.lockScreen.hidden = true;
    els.appShell.removeAttribute("aria-hidden");
    document.body.classList.remove("locked");
    return;
  }
  els.lockScreen.hidden = false;
  els.appShell.setAttribute("aria-hidden", "true");
  document.body.classList.add("locked");
  els.pinInput.focus();
}

async function unlock() {
  const pin = els.pinInput.value.trim();
  if (!pin) return;
  const ok = await verifyPin(pin);
  if (!ok) {
    els.pinMessage.textContent = "Neteisingas PIN.";
    els.pinInput.value = "";
    els.pinInput.focus();
    return;
  }
  els.pinInput.value = "";
  els.pinMessage.textContent = "";
  els.lockScreen.hidden = true;
  els.appShell.removeAttribute("aria-hidden");
  document.body.classList.remove("locked");
}

async function savePin() {
  const pin = els.newPin.value.trim();
  if (pin.length < 4 || !/^\d+$/.test(pin)) {
    els.pinStatus.textContent = "PIN turi būti bent 4 skaičiai.";
    return;
  }
  const salt = randomSalt();
  saveAuth({ salt, hash: await hashPin(pin, salt), updatedAt: new Date().toISOString() });
  els.newPin.value = "";
  refreshPinStatus();
  showToast("PIN išsaugotas.");
}

function removePin() {
  saveAuth(null);
  els.newPin.value = "";
  refreshPinStatus();
  showToast("PIN išjungtas.");
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return sanitizeState({
      ...defaultState,
      ...saved,
      settings: { ...defaultState.settings, ...saved?.settings },
      records: Array.isArray(saved?.records) ? saved.records : []
    });
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadMeta() {
  try {
    return JSON.parse(localStorage.getItem(META_KEY)) || {};
  } catch {
    return {};
  }
}

function saveMeta() {
  localStorage.setItem(META_KEY, JSON.stringify(meta));
}

function sanitizeState(value) {
  const settings = { ...defaultState.settings, ...value?.settings };
  const records = Array.isArray(value?.records)
    ? value.records
        .filter((record) => Number.isFinite(Number(record.amount)) && Number(record.amount) > 0 && /^\d{4}-\d{2}-\d{2}$/.test(record.date || ""))
        .map((record) => ({
          id: record.id || crypto.randomUUID(),
          amount: Number(record.amount),
          date: record.date,
          note: String(record.note || ""),
          createdAt: record.createdAt || new Date().toISOString(),
          updatedAt: record.updatedAt
        }))
    : [];

  return {
    ...defaultState,
    ...value,
    settings,
    records
  };
}

function daysSince(dateText) {
  if (!dateText) return Infinity;
  const time = Date.parse(dateText);
  if (!Number.isFinite(time)) return Infinity;
  return Math.floor((Date.now() - time) / 86400000);
}

function showToast(message) {
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.hidden = false;
  toastTimer = setTimeout(() => {
    els.toast.hidden = true;
  }, 2400);
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

function isoDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
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

function yearlyRecords() {
  const currentYear = String(state.settings.taxYear);
  return state.records.filter((record) => record.date?.startsWith(currentYear));
}

function availableYears() {
  const years = new Set(state.records.map((record) => record.date?.slice(0, 4)).filter(Boolean));
  years.add(String(state.settings.taxYear));
  return [...years].sort((a, b) => b.localeCompare(a));
}

function syncFilterOptions() {
  const selectedYear = filters.year || String(state.settings.taxYear);
  const years = availableYears();
  els.yearFilter.innerHTML = years
    .map((year) => `<option value="${year}">${year}</option>`)
    .join("");
  els.yearFilter.value = years.includes(selectedYear) ? selectedYear : String(state.settings.taxYear);
  filters.year = els.yearFilter.value;
  els.monthFilter.value = filters.month;
  els.searchInput.value = filters.query;
}

function matchesFilters(record) {
  const query = filters.query.trim().toLowerCase();
  const recordMonth = record.date?.slice(5, 7);
  const recordYear = record.date?.slice(0, 4);
  const searchable = [record.note, record.date, String(record.amount).replace(".", ","), String(record.amount)]
    .join(" ")
    .toLowerCase();

  return (!filters.year || recordYear === filters.year)
    && (!filters.month || recordMonth === filters.month)
    && (!query || searchable.includes(query));
}

function filteredRecords() {
  return state.records.filter(matchesFilters);
}

function hasDuplicate(amount, date) {
  return state.records.some((record) => record.date === date && Math.abs(record.amount - amount) < 0.01);
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
  const records = yearlyRecords();
  const months = new Set(records.map((record) => record.date?.slice(0, 7)).filter(Boolean));
  const largest = records.reduce((max, record) => Math.max(max, record.amount), 0);
  const average = months.size ? calc.income / months.size : 0;
  els.yearIncome.textContent = money(calc.income);
  els.yearTax.textContent = money(calc.tax);
  els.yearNet.textContent = money(calc.net);
  els.totalIncome.textContent = money(calc.income);
  els.totalTax.textContent = money(calc.tax);
  els.totalProfit.textContent = money(calc.profit);
  els.totalSocialBase.textContent = money(calc.socialBase);
  els.totalGpm.textContent = money(calc.gpm);
  els.totalPsd.textContent = money(calc.psd);
  els.totalVsd.textContent = money(calc.vsd);
  els.totalNet.textContent = money(calc.net);
  els.recordCount.textContent = String(records.length);
  els.activeMonths.textContent = String(months.size);
  els.averageMonth.textContent = money(average);
  els.largestRecord.textContent = money(largest);
}

function renderBackupStatus() {
  const lastBackup = meta.lastBackupAt;
  const age = daysSince(lastBackup);
  const hasRecords = state.records.length > 0;
  const needsBackup = hasRecords && age >= 30;
  const backupText = Number.isFinite(age)
    ? `Paskutinė atsarginė kopija: prieš ${age} d.`
    : "Atsarginė kopija dar nekurta.";

  els.backupStatus.textContent = backupText;
  els.backupReminder.hidden = !needsBackup;
  if (needsBackup) {
    els.backupReminder.textContent = age === Infinity ? "Pasidaryk atsarginę kopiją" : `Kopija daryta prieš ${age} d.`;
  }
}

function updateConnectionStatus() {
  const online = navigator.onLine;
  els.connectionStatus.textContent = online ? "Online" : "Offline";
  els.connectionStatus.classList.toggle("offline", !online);
}

function renderRecords() {
  const records = filteredRecords().sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  els.filteredCount.textContent = `${records.length} ${recordWord(records.length)}`;
  els.emptyState.textContent = state.records.length ? "Pagal filtrus įrašų nėra." : "Įvesk pirmą gautą sumą.";
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
          <button class="icon-button small" type="button" data-edit="${record.id}" aria-label="Redaguoti įrašą" title="Redaguoti">✎</button>
          <button class="icon-button small" type="button" data-delete="${record.id}" aria-label="Ištrinti įrašą" title="Ištrinti">×</button>
        </div>
      </article>
    `;
  }).join("");
}

function renderMonths() {
  const groups = new Map();
  for (const record of filteredRecords()) {
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

function recordWord(count) {
  const last = count % 10;
  const lastTwo = count % 100;
  if (last === 1 && lastTwo !== 11) return "įrašas";
  if (last >= 2 && last <= 9 && (lastTwo < 10 || lastTwo >= 20)) return "įrašai";
  return "įrašų";
}

function render() {
  syncFilterOptions();
  renderSummary();
  renderBackupStatus();
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
  const date = els.date.value || isoToday();
  if (hasDuplicate(amount, date) && !confirm("Tą pačią dieną jau yra tokia pati suma. Vis tiek pridėti?")) {
    return;
  }

  state.records.push({
    id: crypto.randomUUID(),
    amount,
    date,
    note: els.note.value.trim(),
    createdAt: new Date().toISOString()
  });

  filters.year = date.slice(0, 4);
  filters.month = "";
  filters.query = "";
  els.amount.value = "";
  els.note.value = "";
  saveState();
  render();
  showToast("Įrašas pridėtas.");
  els.amount.focus();
}

function openEditDialog(recordId) {
  const record = state.records.find((item) => item.id === recordId);
  if (!record) return;
  editingRecordId = recordId;
  els.editAmount.value = String(record.amount).replace(".", ",");
  els.editDate.value = record.date;
  els.editNote.value = record.note || "";
  els.editMessage.textContent = "";
  els.editDialog.showModal();
  els.editAmount.focus();
}

function saveEditedRecord() {
  const amount = parseAmount(els.editAmount.value);
  if (!amount) {
    els.editMessage.textContent = "Įvesk teisingą sumą.";
    els.editAmount.focus();
    return;
  }
  const record = state.records.find((item) => item.id === editingRecordId);
  if (!record) return;
  record.amount = amount;
  record.date = els.editDate.value || isoToday();
  record.note = els.editNote.value.trim();
  record.updatedAt = new Date().toISOString();
  filters.year = record.date.slice(0, 4);
  saveState();
  render();
  els.editDialog.close();
  showToast("Įrašas atnaujintas.");
}

function openSettings() {
  els.taxYear.value = state.settings.taxYear;
  refreshPinStatus();
  els.settingsDialog.showModal();
}

function saveSettings() {
  state.settings = {
    taxYear: Number(els.taxYear.value) || 2026
  };
  filters.year = String(state.settings.taxYear);
  filters.month = "";
  saveState();
  render();
  showToast("Nustatymai išsaugoti.");
}

function exportCsv() {
  const header = ["data", "suma", "gpm", "psd", "vsd", "mokesciai_is_viso", "pastaba"];
  const rows = filteredRecords()
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
  showToast(`CSV eksportas paruoštas: ${rows.length} ${recordWord(rows.length)}.`);
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
  meta.lastBackupAt = new Date().toISOString();
  saveMeta();
  downloadJson(`mokesciai-backup-${new Date().toISOString().slice(0, 10)}.json`, {
    app: "tax-set-aside",
    version: 1,
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    state
  });
  renderBackupStatus();
  showToast("Atsarginė kopija sukurta.");
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
      state = sanitizeState(state);
      saveState();
      render();
      els.settingsDialog.close();
      showToast(`Kopija atkurta: ${state.records.length} ${recordWord(state.records.length)}.`);
    } catch {
      alert("Nepavyko atkurti kopijos. Patikrink, ar pasirinktas teisingas JSON failas.");
    } finally {
      els.restoreInput.value = "";
    }
  });
  reader.readAsText(file);
}

els.date.value = isoToday();
els.versionText.textContent = `Versija ${APP_VERSION}`;
saveState();
refreshPinStatus();
updateConnectionStatus();
showLockIfNeeded();
if (meta.lastSeenVersion !== APP_VERSION) {
  meta.lastSeenVersion = APP_VERSION;
  saveMeta();
  setTimeout(() => els.whatsNewDialog.showModal(), 300);
}
els.unlockButton.addEventListener("click", unlock);
els.pinInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") unlock();
});
els.amount.addEventListener("input", updatePreview);
els.addButton.addEventListener("click", addRecord);
els.amount.addEventListener("keydown", (event) => {
  if (event.key === "Enter") addRecord();
});
els.todayButton.addEventListener("click", () => {
  els.date.value = isoToday();
  showToast("Data pakeista į šiandien.");
});
els.yesterdayButton.addEventListener("click", () => {
  els.date.value = isoDaysAgo(1);
  showToast("Data pakeista į vakar.");
});
els.settingsButton.addEventListener("click", openSettings);
els.aboutButton.addEventListener("click", () => els.aboutDialog.showModal());
els.whatsNewButton.addEventListener("click", () => els.whatsNewDialog.showModal());
els.savePinButton.addEventListener("click", savePin);
els.removePinButton.addEventListener("click", removePin);
els.saveEditButton.addEventListener("click", saveEditedRecord);
els.editAmount.addEventListener("keydown", (event) => {
  if (event.key === "Enter") saveEditedRecord();
});
els.saveSettingsButton.addEventListener("click", saveSettings);
els.exportButton.addEventListener("click", exportCsv);
els.searchInput.addEventListener("input", () => {
  filters.query = els.searchInput.value;
  render();
});
els.yearFilter.addEventListener("change", () => {
  filters.year = els.yearFilter.value;
  render();
});
els.monthFilter.addEventListener("change", () => {
  filters.month = els.monthFilter.value;
  render();
});
els.clearFiltersButton.addEventListener("click", () => {
  filters = {
    query: "",
    year: String(state.settings.taxYear),
    month: ""
  };
  render();
  showToast("Filtrai išvalyti.");
});
els.backupButton.addEventListener("click", exportBackup);
els.restoreButton.addEventListener("click", () => els.restoreInput.click());
els.restoreInput.addEventListener("change", () => restoreBackup(els.restoreInput.files[0]));
els.recordList.addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit]");
  if (editButton) {
    openEditDialog(editButton.dataset.edit);
    return;
  }
  const button = event.target.closest("[data-delete]");
  if (!button) return;
  if (!confirm("Ištrinti šį įrašą?")) return;
  state.records = state.records.filter((record) => record.id !== button.dataset.delete);
  saveState();
  render();
  showToast("Įrašas ištrintas.");
});
els.clearButton.addEventListener("click", () => {
  if (!confirm("Išvalyti visus įrašus? Prieš tai verta pasidaryti atsarginę kopiją.")) return;
  const answer = prompt("Įvesk ISVALYTI, jei tikrai nori pašalinti visus įrašus.");
  if (answer !== "ISVALYTI") return;
  state.records = [];
  saveState();
  render();
  els.settingsDialog.close();
  showToast("Duomenys išvalyti.");
});
window.addEventListener("online", updateConnectionStatus);
window.addEventListener("offline", updateConnectionStatus);
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
