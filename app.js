const STORAGE_KEY = "tax-set-aside-v1";
const SECURE_STORAGE_KEY = "tax-set-aside-secure-v1";
const AUTH_KEY = "tax-set-aside-auth-v1";
const META_KEY = "tax-set-aside-meta-v1";
const APP_VERSION = "v0.6.0";

const defaultState = { settings: { taxYear: 2026 }, records: [] };
const $ = (id) => document.querySelector(`#${id}`);
const els = {
  appShell: $("appShell"), lockScreen: $("lockScreen"), pinInput: $("pinInput"), pinMessage: $("pinMessage"), unlockButton: $("unlockButton"),
  connectionStatus: $("connectionStatus"), storageStatus: $("storageStatus"), securityStatus: $("securityStatus"), backupReminder: $("backupReminder"),
  amount: $("amount"), date: $("date"), note: $("note"), todayButton: $("todayButton"), yesterdayButton: $("yesterdayButton"),
  previewTax: $("previewTax"), previewNet: $("previewNet"), previewGpm: $("previewGpm"), previewPsd: $("previewPsd"), previewVsd: $("previewVsd"), addButton: $("addButton"),
  recordList: $("recordList"), monthList: $("monthList"), emptyState: $("emptyState"), yearIncome: $("yearIncome"), yearTax: $("yearTax"), yearNet: $("yearNet"),
  totalIncome: $("totalIncome"), totalTax: $("totalTax"), totalProfit: $("totalProfit"), totalSocialBase: $("totalSocialBase"), totalGpm: $("totalGpm"), totalPsd: $("totalPsd"), totalVsd: $("totalVsd"), totalNet: $("totalNet"),
  recordCount: $("recordCount"), activeMonths: $("activeMonths"), averageMonth: $("averageMonth"), largestRecord: $("largestRecord"),
  settingsButton: $("settingsButton"), settingsDialog: $("settingsDialog"), aboutDialog: $("aboutDialog"), editDialog: $("editDialog"), editAmount: $("editAmount"), editDate: $("editDate"), editNote: $("editNote"), editMessage: $("editMessage"), saveEditButton: $("saveEditButton"),
  toast: $("toast"), taxYear: $("taxYear"), newPin: $("newPin"), newPinConfirm: $("newPinConfirm"), savePinButton: $("savePinButton"), removePinButton: $("removePinButton"), pinStatus: $("pinStatus"),
  aboutButton: $("aboutButton"), privacyButton: $("privacyButton"), privacyPolicyButton: $("privacyPolicyButton"), privacyDialog: $("privacyDialog"), privacyPinText: $("privacyPinText"),
  onboardingDialog: $("onboardingDialog"), onboardingTaxYear: $("onboardingTaxYear"), onboardingPinChoice: $("onboardingPinChoice"), finishOnboardingButton: $("finishOnboardingButton"),
  whatsNewButton: $("whatsNewButton"), whatsNewDialog: $("whatsNewDialog"), versionText: $("versionText"), saveSettingsButton: $("saveSettingsButton"), clearButton: $("clearButton"), exportButton: $("exportButton"),
  searchInput: $("searchInput"), yearFilter: $("yearFilter"), monthFilter: $("monthFilter"), clearFiltersButton: $("clearFiltersButton"), filteredCount: $("filteredCount"),
  backupButton: $("backupButton"), backupStatus: $("backupStatus"), restoreButton: $("restoreButton"), restoreInput: $("restoreInput"), deviceStorageStatus: $("deviceStorageStatus"), cloudSyncStatus: $("cloudSyncStatus"), securityDetail: $("securityDetail"), storageHealth: $("storageHealth"), testDataButton: $("testDataButton"),
  recordsView: $("recordsView"), summaryView: $("summaryView"), monthsView: $("monthsView"), tabs: document.querySelectorAll(".tab")
};

let state = loadState();
let meta = loadMeta();
let sessionPin = null;
let editingRecordId = null;
let toastTimer = null;
let filters = { query: "", year: String(state.settings.taxYear), month: "" };

function cloneDefault() { return structuredClone(defaultState); }
function loadMeta() { try { return JSON.parse(localStorage.getItem(META_KEY)) || {}; } catch { return {}; } }
function saveMeta() { localStorage.setItem(META_KEY, JSON.stringify(meta)); }
function loadAuth() { try { return JSON.parse(localStorage.getItem(AUTH_KEY)); } catch { return null; } }
function saveAuth(auth) { auth ? localStorage.setItem(AUTH_KEY, JSON.stringify(auth)) : localStorage.removeItem(AUTH_KEY); }
function bytesToBase64(bytes) { let out = ""; for (const byte of bytes) out += String.fromCharCode(byte); return btoa(out); }
function base64ToBytes(value) { return Uint8Array.from(atob(value), (char) => char.charCodeAt(0)); }
function randomHex() { const bytes = crypto.getRandomValues(new Uint8Array(16)); return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join(""); }
async function hashPin(pin, salt) { const data = new TextEncoder().encode(`${salt}:${pin}`); const hash = await crypto.subtle.digest("SHA-256", data); return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join(""); }
async function deriveStorageKey(pin, salt) { const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveKey"]); return crypto.subtle.deriveKey({ name: "PBKDF2", salt: base64ToBytes(salt), iterations: 180000, hash: "SHA-256" }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]); }
function hasPin() { const auth = loadAuth(); return Boolean(auth?.salt && auth?.hash); }
function isEncryptedStorage() { const auth = loadAuth(); return Boolean(auth?.encrypted && localStorage.getItem(SECURE_STORAGE_KEY)); }
async function verifyPin(pin) { const auth = loadAuth(); return !auth?.hash || await hashPin(pin, auth.salt) === auth.hash; }

function sanitizeState(value) {
  const settings = { ...defaultState.settings, ...value?.settings };
  const records = Array.isArray(value?.records) ? value.records
    .filter((record) => Number(record.amount) > 0 && /^\d{4}-\d{2}-\d{2}$/.test(record.date || ""))
    .map((record) => ({ id: record.id || crypto.randomUUID(), amount: Number(record.amount), date: record.date, note: String(record.note || ""), createdAt: record.createdAt || new Date().toISOString(), updatedAt: record.updatedAt })) : [];
  return { settings, records };
}
function loadState() { if (localStorage.getItem(SECURE_STORAGE_KEY)) return cloneDefault(); try { return sanitizeState({ ...cloneDefault(), ...JSON.parse(localStorage.getItem(STORAGE_KEY)) }); } catch { return cloneDefault(); } }
async function encryptState(pin) { const auth = loadAuth(); if (!auth?.encrypted || !auth?.storageSalt) return; const iv = crypto.getRandomValues(new Uint8Array(12)); const key = await deriveStorageKey(pin, auth.storageSalt); const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(state))); localStorage.setItem(SECURE_STORAGE_KEY, JSON.stringify({ version: 1, iv: bytesToBase64(iv), data: bytesToBase64(new Uint8Array(encrypted)) })); localStorage.removeItem(STORAGE_KEY); }
async function decryptState(pin) { const auth = loadAuth(); const secure = JSON.parse(localStorage.getItem(SECURE_STORAGE_KEY) || "null"); if (!auth?.encrypted || !secure?.iv || !secure?.data) return; const key = await deriveStorageKey(pin, auth.storageSalt); const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(secure.iv) }, key, base64ToBytes(secure.data)); state = sanitizeState(JSON.parse(new TextDecoder().decode(decrypted))); }
function saveState() { if (isEncryptedStorage()) { if (sessionPin) encryptState(sessionPin).catch(() => showToast("Nepavyko issaugoti sifruotai.")); } else { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } meta.lastLocalSaveAt = new Date().toISOString(); saveMeta(); renderStorageStatus(); }

function money(value) { return new Intl.NumberFormat("lt-LT", { style: "currency", currency: "EUR" }).format(value || 0); }
function parseAmount(value) { const amount = Number.parseFloat(String(value).replace(/\s/g, "").replace(",", ".")); return Number.isFinite(amount) && amount > 0 ? amount : 0; }
function isoToday() { return new Date().toISOString().slice(0, 10); }
function isoDaysAgo(days) { const date = new Date(); date.setDate(date.getDate() - days); return date.toISOString().slice(0, 10); }
function calc(income) { const profit = Math.max(0, income * 0.7); const socialBase = profit * 0.9; const gpm = profit * 0.05; const psd = socialBase * 0.0698; const vsd = socialBase * 0.1552; const tax = gpm + psd + vsd; return { income, profit, socialBase, gpm, psd, vsd, tax, net: Math.max(0, income - tax) }; }
function yearRecords(records = state.records) { return records.filter((record) => record.date?.startsWith(String(state.settings.taxYear))); }
function yearCalc(records = state.records) { return calc(yearRecords(records).reduce((sum, record) => sum + record.amount, 0)); }
function daysSince(dateText) { const time = Date.parse(dateText || ""); return Number.isFinite(time) ? Math.floor((Date.now() - time) / 86400000) : Infinity; }
function recordWord(count) { const last = count % 10, lastTwo = count % 100; if (last === 1 && lastTwo !== 11) return "irasas"; if (last >= 2 && last <= 9 && (lastTwo < 10 || lastTwo >= 20)) return "irasai"; return "irasu"; }
function escapeHtml(value) { return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function showToast(message) { clearTimeout(toastTimer); els.toast.textContent = message; els.toast.hidden = false; toastTimer = setTimeout(() => { els.toast.hidden = true; }, 2400); }

function filteredRecords() { const query = filters.query.trim().toLowerCase(); return state.records.filter((record) => { const text = [record.note, record.date, record.amount, String(record.amount).replace(".", ",")].join(" ").toLowerCase(); return (!filters.year || record.date.slice(0, 4) === filters.year) && (!filters.month || record.date.slice(5, 7) === filters.month) && (!query || text.includes(query)); }); }
function syncFilters() { const years = [...new Set([String(state.settings.taxYear), ...state.records.map((record) => record.date.slice(0, 4))])].sort((a, b) => b.localeCompare(a)); els.yearFilter.innerHTML = years.map((year) => `<option value="${year}">${year}</option>`).join(""); els.yearFilter.value = years.includes(filters.year) ? filters.year : String(state.settings.taxYear); filters.year = els.yearFilter.value; els.monthFilter.value = filters.month; els.searchInput.value = filters.query; }
function renderSummary() { const summary = yearCalc(); const records = yearRecords(); const months = new Set(records.map((record) => record.date.slice(0, 7))); const largest = records.reduce((max, record) => Math.max(max, record.amount), 0); [[els.yearIncome, summary.income], [els.yearTax, summary.tax], [els.yearNet, summary.net], [els.totalIncome, summary.income], [els.totalTax, summary.tax], [els.totalProfit, summary.profit], [els.totalSocialBase, summary.socialBase], [els.totalGpm, summary.gpm], [els.totalPsd, summary.psd], [els.totalVsd, summary.vsd], [els.totalNet, summary.net], [els.averageMonth, months.size ? summary.income / months.size : 0], [els.largestRecord, largest]].forEach(([el, value]) => { el.textContent = money(value); }); els.recordCount.textContent = String(records.length); els.activeMonths.textContent = String(months.size); }
function renderRecords() { const records = filteredRecords().sort((a, b) => b.date.localeCompare(a.date) || String(b.createdAt).localeCompare(String(a.createdAt))); els.filteredCount.textContent = `${records.length} ${recordWord(records.length)}`; els.emptyState.textContent = state.records.length ? "Pagal filtrus irasu nera." : "Ivesk pirma gauta suma."; els.emptyState.hidden = records.length > 0; els.recordList.innerHTML = records.map((record) => `<article class="record"><div><div class="record-title"><strong>${money(record.amount)}</strong><small>${record.date}</small></div>${record.note ? `<small>${escapeHtml(record.note)}</small>` : ""}</div><div class="record-actions"><div class="tax-pill">${money(calc(record.amount).tax)}</div><button class="icon-button small" type="button" data-edit="${record.id}" aria-label="Redaguoti irasa" title="Redaguoti">&#9998;</button><button class="icon-button small" type="button" data-delete="${record.id}" aria-label="Istrinti irasa" title="Istrinti">&times;</button></div></article>`).join(""); }
function renderMonths() { const groups = new Map(); filteredRecords().forEach((record) => groups.set(record.date.slice(0, 7), (groups.get(record.date.slice(0, 7)) || 0) + record.amount)); els.monthList.innerHTML = [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([month, income]) => `<article class="record"><div><div class="record-title"><strong>${month}</strong><small>${money(income)} pajamu</small></div><small>Lieka ${money(calc(income).net)}</small></div><div class="tax-pill">${money(calc(income).tax)}</div></article>`).join("") || `<div class="empty-state">Menesiu suvestine atsiras pridejus irasu.</div>`; }
function renderBackupStatus() { const age = daysSince(meta.lastBackupAt); const needsBackup = state.records.length > 0 && age >= 30; els.backupStatus.textContent = Number.isFinite(age) ? `Paskutine atsargine kopija: pries ${age} d.` : "Atsargine kopija dar nekurta."; els.backupReminder.hidden = !needsBackup; if (needsBackup) els.backupReminder.textContent = Number.isFinite(age) ? `Kopija daryta pries ${age} d.` : "Pasidaryk atsargine kopija"; }
function renderStorageStatus() { const time = meta.lastLocalSaveAt ? new Intl.DateTimeFormat("lt-LT", { hour: "2-digit", minute: "2-digit" }).format(new Date(meta.lastLocalSaveAt)) : ""; const encrypted = isEncryptedStorage(); els.storageStatus.textContent = time ? `Issaugota telefone ${time}` : "Saugoma telefone"; els.deviceStorageStatus.textContent = `${time ? `Kiekvienas irasas iskart saugomas siame telefone. Paskutinis issaugojimas: ${time}.` : "Kiekvienas irasas iskart saugomas siame telefone."}${encrypted ? " PIN ijungtas, todel irasai sifruojami." : ""}`; els.cloudSyncStatus.textContent = "Dar neprijungta. Veliau bus galima prisijungti ir sinchronizuoti."; }
function refreshPinStatus() { const encrypted = isEncryptedStorage(); els.pinStatus.textContent = hasPin() ? encrypted ? "PIN ijungtas. Irasai sifruojami telefone." : "PIN ijungtas." : "PIN neijungtas."; els.securityStatus.textContent = encrypted ? "Sifruota PIN" : hasPin() ? "PIN ijungtas" : "PIN neijungtas"; const detail = encrypted ? "PIN ijungtas. Irasai siame telefone saugomi sifruotai." : "PIN neijungtas. Ijungus PIN, irasai bus sifruojami siame telefone."; els.securityDetail.textContent = detail; els.privacyPinText.textContent = detail; els.removePinButton.disabled = !hasPin(); }
function checkStorageHealth() { try { const key = "tax-set-aside-health-check"; localStorage.setItem(key, "ok"); localStorage.removeItem(key); els.storageHealth.textContent = "Saugykla veikia. Irasai automatiskai issaugomi siame irenginyje."; els.storageHealth.classList.remove("error-text"); } catch { els.storageHealth.textContent = "Irenginio saugykla nepasiekiama. Patikrink narsykles arba programeles leidimus."; els.storageHealth.classList.add("error-text"); } }
function updatePreview() { const preview = calc(parseAmount(els.amount.value)); els.previewTax.textContent = money(preview.tax); els.previewNet.textContent = money(preview.net); els.previewGpm.textContent = money(preview.gpm); els.previewPsd.textContent = money(preview.psd); els.previewVsd.textContent = money(preview.vsd); }
function render() { syncFilters(); renderSummary(); renderBackupStatus(); renderStorageStatus(); refreshPinStatus(); checkStorageHealth(); renderRecords(); renderMonths(); updatePreview(); }

function maybeShowOnboarding() { if (meta.onboardingDone) return; els.onboardingTaxYear.value = state.settings.taxYear; setTimeout(() => els.onboardingDialog.showModal(), 200); }
function maybeShowWhatsNew() { if (!meta.onboardingDone || meta.lastSeenVersion === APP_VERSION) return; meta.lastSeenVersion = APP_VERSION; saveMeta(); setTimeout(() => els.whatsNewDialog.showModal(), 300); }
function openApp() { els.lockScreen.hidden = true; els.appShell.removeAttribute("aria-hidden"); document.body.classList.remove("locked"); maybeShowOnboarding(); maybeShowWhatsNew(); }
function showLockIfNeeded() { if (!hasPin()) return openApp(); els.lockScreen.hidden = false; els.appShell.setAttribute("aria-hidden", "true"); document.body.classList.add("locked"); els.pinInput.focus(); }
async function unlock() { const pin = els.pinInput.value.trim(); if (!pin) return; if (!await verifyPin(pin)) { els.pinMessage.textContent = "Neteisingas PIN."; els.pinInput.value = ""; els.pinInput.focus(); return; } try { if (isEncryptedStorage()) { await decryptState(pin); sessionPin = pin; } } catch { els.pinMessage.textContent = "Nepavyko atrakinti sifruotu duomenu."; return; } els.pinInput.value = ""; els.pinMessage.textContent = ""; render(); openApp(); }
async function savePin() { const pin = els.newPin.value.trim(); const pinConfirm = els.newPinConfirm.value.trim(); if (pin.length < 4 || !/^\d+$/.test(pin)) { els.pinStatus.textContent = "PIN turi buti bent 4 skaiciai."; return; } if (pin !== pinConfirm) { els.pinStatus.textContent = "PIN pakartojimas nesutampa."; els.newPinConfirm.focus(); return; } const salt = randomHex(); const storageSalt = bytesToBase64(crypto.getRandomValues(new Uint8Array(16))); saveAuth({ salt, storageSalt, hash: await hashPin(pin, salt), encrypted: true, updatedAt: new Date().toISOString() }); sessionPin = pin; await encryptState(pin); els.newPin.value = ""; els.newPinConfirm.value = ""; render(); showToast("PIN ijungtas. Irasai sifruojami telefone."); }
function removePin() { if (isEncryptedStorage() && !sessionPin) { alert("Pirma atrakink programele PIN kodu, tada galesi isjungti PIN."); return; } if (isEncryptedStorage()) { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); localStorage.removeItem(SECURE_STORAGE_KEY); } saveAuth(null); sessionPin = null; els.newPin.value = ""; els.newPinConfirm.value = ""; render(); showToast("PIN isjungtas."); }
function finishOnboarding() { state.settings.taxYear = Number(els.onboardingTaxYear.value) || state.settings.taxYear; filters.year = String(state.settings.taxYear); meta.onboardingDone = true; saveMeta(); saveState(); render(); els.onboardingDialog.close(); if (els.onboardingPinChoice.checked) { openSettings(); els.newPin.focus(); } else maybeShowWhatsNew(); }

function addRecord() { const amount = parseAmount(els.amount.value); if (!amount) { els.amount.focus(); return; } const date = els.date.value || isoToday(); if (state.records.some((record) => record.date === date && Math.abs(record.amount - amount) < 0.01) && !confirm("Ta pacia diena jau yra tokia pati suma. Vis tiek prideti?")) return; state.records.push({ id: crypto.randomUUID(), amount, date, note: els.note.value.trim(), createdAt: new Date().toISOString() }); filters = { query: "", year: date.slice(0, 4), month: "" }; els.amount.value = ""; els.note.value = ""; saveState(); render(); showToast("Irasas pridetas."); els.amount.focus(); }
function openEditDialog(id) { const record = state.records.find((item) => item.id === id); if (!record) return; editingRecordId = id; els.editAmount.value = String(record.amount).replace(".", ","); els.editDate.value = record.date; els.editNote.value = record.note || ""; els.editMessage.textContent = ""; els.editDialog.showModal(); els.editAmount.focus(); }
function saveEditedRecord() { const record = state.records.find((item) => item.id === editingRecordId); const amount = parseAmount(els.editAmount.value); if (!record || !amount) { els.editMessage.textContent = "Ivesk teisinga suma."; return; } record.amount = amount; record.date = els.editDate.value || isoToday(); record.note = els.editNote.value.trim(); record.updatedAt = new Date().toISOString(); filters.year = record.date.slice(0, 4); saveState(); render(); els.editDialog.close(); showToast("Irasas atnaujintas."); }
function openSettings() { els.taxYear.value = state.settings.taxYear; refreshPinStatus(); checkStorageHealth(); els.settingsDialog.showModal(); }
function saveSettings() { state.settings.taxYear = Number(els.taxYear.value) || 2026; filters.year = String(state.settings.taxYear); filters.month = ""; saveState(); render(); showToast("Nustatymai issaugoti."); }
function download(filename, content, type) { const url = URL.createObjectURL(new Blob([content], { type })); const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url); }
function exportCsv() { const rows = filteredRecords().sort((a, b) => a.date.localeCompare(b.date)).map((record) => { const c = calc(record.amount); return [record.date, record.amount.toFixed(2), c.gpm.toFixed(2), c.psd.toFixed(2), c.vsd.toFixed(2), c.tax.toFixed(2), `"${String(record.note || "").replaceAll('"', '""')}"`]; }); download(`mokesciai-${state.settings.taxYear}.csv`, [["data", "suma", "gpm", "psd", "vsd", "mokesciai_is_viso", "pastaba"], ...rows].map((row) => row.join(",")).join("\n"), "text/csv;charset=utf-8"); showToast(`CSV eksportas paruostas: ${rows.length} ${recordWord(rows.length)}.`); }
function exportBackup() { if (isEncryptedStorage() && !confirm("Atsargine kopija bus sukurta kaip JSON failas. Laikyk ja saugioje vietoje.")) return; meta.lastBackupAt = new Date().toISOString(); saveMeta(); download(`mokesciai-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ app: "tax-set-aside", version: 1, exportedAt: new Date().toISOString(), appVersion: APP_VERSION, state }, null, 2), "application/json;charset=utf-8"); renderBackupStatus(); showToast("Atsargine kopija sukurta."); }
function restoreBackup(file) { if (!file) return; const reader = new FileReader(); reader.addEventListener("load", () => { try { const data = JSON.parse(reader.result); if (data?.app !== "tax-set-aside" || data?.version !== 1 || !Array.isArray(data?.state?.records)) throw new Error(); state = sanitizeState(data.state); saveState(); render(); els.settingsDialog.close(); showToast(`Kopija atkurta: ${state.records.length} ${recordWord(state.records.length)}.`); } catch { alert("Nepavyko atkurti kopijos. Patikrink, ar pasirinktas teisingas JSON failas."); } finally { els.restoreInput.value = ""; } }); reader.readAsText(file); }
function addTestData() { if (!confirm("Prideti kelis testinius irasus screenshots ir bandymams?")) return; const now = new Date(); [{ amount: 120, offset: 0, note: "Testinis irasas" }, { amount: 340, offset: 7, note: "Testinis klientas" }, { amount: 85.5, offset: 22, note: "Testine saskaita" }].forEach((sample) => { const date = new Date(now); date.setDate(date.getDate() - sample.offset); state.records.push({ id: crypto.randomUUID(), amount: sample.amount, date: date.toISOString().slice(0, 10), note: sample.note, createdAt: new Date().toISOString() }); }); filters = { query: "", year: String(now.getFullYear()), month: "" }; saveState(); render(); showToast("Testiniai irasai prideti."); }
function updateConnectionStatus() { els.connectionStatus.textContent = navigator.onLine ? "Online" : "Offline"; els.connectionStatus.classList.toggle("offline", !navigator.onLine); }

els.date.value = isoToday();
els.versionText.textContent = `Versija ${APP_VERSION}`;
els.unlockButton.addEventListener("click", unlock);
els.pinInput.addEventListener("keydown", (event) => { if (event.key === "Enter") unlock(); });
els.amount.addEventListener("input", updatePreview);
els.amount.addEventListener("keydown", (event) => { if (event.key === "Enter") addRecord(); });
els.addButton.addEventListener("click", addRecord);
els.todayButton.addEventListener("click", () => { els.date.value = isoToday(); showToast("Data pakeista i siandien."); });
els.yesterdayButton.addEventListener("click", () => { els.date.value = isoDaysAgo(1); showToast("Data pakeista i vakar."); });
els.settingsButton.addEventListener("click", openSettings);
els.aboutButton.addEventListener("click", () => els.aboutDialog.showModal());
els.privacyButton.addEventListener("click", () => els.privacyDialog.showModal());
els.privacyPolicyButton.addEventListener("click", () => window.open("privacy-policy.html", "_blank", "noopener"));
els.finishOnboardingButton.addEventListener("click", finishOnboarding);
els.whatsNewButton.addEventListener("click", () => els.whatsNewDialog.showModal());
els.savePinButton.addEventListener("click", savePin);
els.removePinButton.addEventListener("click", removePin);
els.saveEditButton.addEventListener("click", saveEditedRecord);
els.editAmount.addEventListener("keydown", (event) => { if (event.key === "Enter") saveEditedRecord(); });
els.saveSettingsButton.addEventListener("click", saveSettings);
els.exportButton.addEventListener("click", exportCsv);
els.searchInput.addEventListener("input", () => { filters.query = els.searchInput.value; render(); });
els.yearFilter.addEventListener("change", () => { filters.year = els.yearFilter.value; render(); });
els.monthFilter.addEventListener("change", () => { filters.month = els.monthFilter.value; render(); });
els.clearFiltersButton.addEventListener("click", () => { filters = { query: "", year: String(state.settings.taxYear), month: "" }; render(); showToast("Filtrai isvalyti."); });
els.backupButton.addEventListener("click", exportBackup);
els.restoreButton.addEventListener("click", () => els.restoreInput.click());
els.restoreInput.addEventListener("change", () => restoreBackup(els.restoreInput.files[0]));
els.testDataButton.addEventListener("click", addTestData);
els.recordList.addEventListener("click", (event) => { const edit = event.target.closest("[data-edit]"); const del = event.target.closest("[data-delete]"); if (edit) return openEditDialog(edit.dataset.edit); if (!del || !confirm("Istrinti si irasa?")) return; state.records = state.records.filter((record) => record.id !== del.dataset.delete); saveState(); render(); showToast("Irasas istrintas."); });
els.clearButton.addEventListener("click", () => { if (!confirm("Isvalyti visus irasus? Pries tai verta pasidaryti atsargine kopija.")) return; if (prompt("Ivesk ISVALYTI, jei tikrai nori pasalinti visus irasus.") !== "ISVALYTI") return; state.records = []; saveState(); render(); els.settingsDialog.close(); showToast("Duomenys isvalyti."); });
els.tabs.forEach((tab) => tab.addEventListener("click", () => { els.tabs.forEach((item) => item.classList.toggle("active", item === tab)); els.recordsView.hidden = tab.dataset.tab !== "records"; els.summaryView.hidden = tab.dataset.tab !== "summary"; els.monthsView.hidden = tab.dataset.tab !== "months"; }));
window.addEventListener("online", updateConnectionStatus);
window.addEventListener("offline", updateConnectionStatus);
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
updateConnectionStatus();
render();
showLockIfNeeded();
