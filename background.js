/**
 * Fetches course requirement text from ASU DPL (My ASU platform API).
 * Runs in the service worker so CORS does not block extension-originated requests.
 */

const API_BASE = "https://api.myasuplat-dpl.asu.edu";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "asu-prereq-fetch-requirements") {
    return;
  }

  const { strm, subject, catalogNumber } = message;
  if (
    !strm ||
    typeof strm !== "string" ||
    !/^\d{4}$/.test(strm) ||
    !subject ||
    !catalogNumber
  ) {
    sendResponse({
      ok: false,
      error: "Missing or invalid session (strm), subject, or catalog number.",
    });
    return;
  }

  const path = `/api/course/${encodeURIComponent(strm)}/subject/${encodeURIComponent(subject)}/${encodeURIComponent(catalogNumber)}`;
  const url = `${API_BASE}${path}`;

  fetch(url)
    .then(async (response) => {
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        sendResponse({
          ok: false,
          error: `Invalid JSON (${response.status})`,
        });
        return;
      }
      if (!response.ok) {
        sendResponse({
          ok: false,
          error: `HTTP ${response.status}`,
        });
        return;
      }
      const raw =
        (Array.isArray(data) && data[0]?.requirementGroupDescription) || "";
      sendResponse({ ok: true, raw });
    })
    .catch((err) => {
      sendResponse({ ok: false, error: String(err?.message || err) });
    });

  return true;
});
