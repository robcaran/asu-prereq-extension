const STORAGE_MANUAL_STRM = "asuPrereqManualStrm";

function showStatus(text) {
  const el = document.getElementById("status");
  if (el) el.textContent = text;
}

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("manualStrm");
  const save = document.getElementById("save");

  chrome.storage.sync.get(STORAGE_MANUAL_STRM, (r) => {
    const v = r[STORAGE_MANUAL_STRM];
    if (input && v) input.value = String(v);
  });

  save?.addEventListener("click", () => {
    const raw = input?.value.trim() || "";
    if (raw === "") {
      chrome.storage.sync.remove(STORAGE_MANUAL_STRM, () => {
        const err = chrome.runtime.lastError;
        if (err) {
          showStatus(`Error: ${err.message}`);
          return;
        }
        showStatus("Override cleared. Extension will detect term automatically.");
      });
      return;
    }
    if (!/^\d{4}$/.test(raw)) {
      showStatus("Enter exactly four digits (for example 2257), or leave blank.");
      return;
    }
    chrome.storage.sync.set({ [STORAGE_MANUAL_STRM]: raw }, () => {
      const err = chrome.runtime.lastError;
      if (err) {
        showStatus(`Error: ${err.message}`);
        return;
      }
      showStatus("Saved.");
    });
  });
});
