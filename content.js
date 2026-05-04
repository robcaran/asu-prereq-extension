const styles = `
  .asu-prereq-card {
    margin-top: 4px;
    margin-left: 28px;
    padding: 4px 6px;
    background: #ffffff;
    color: #191919;
    border: 1px solid #e4e4e4;
    border-radius: 6px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
    font-size: 14px;
    line-height: 1.3;
    white-space: pre-wrap;
    width: fit-content;
    min-width: 140px;
    max-width: min(520px, 92vw);
  }
  .asu-prereq-card p {
    margin: 0;
  }
  .asu-prereq-card p + p {
    margin-top: 0.35em;
  }
  .asu-prereq-card b {
    color: #8c1d40;
  }
`;

const STORAGE_LAST_STRM = "asuPrereqLastStrm";
const STORAGE_MANUAL_STRM = "asuPrereqManualStrm";

const NO_SESSION_MESSAGE =
  "Set the four-digit session code in extension Options (same as Class Search term=), then refresh this page.";

document.head.insertAdjacentHTML("beforeend", `<style>${styles}</style>`);

function hasCourseCode(text) {
  return /\b[A-Z]{3}\s\d{3}\b/.test(text);
}

function expandSubjectShorthand(text) {
  return text.replace(
    /\b([A-Z]{3})\s+(\d{3})\s+or\s+(\d{3})\b/gi,
    (_, subj, a, b) => `${subj.toUpperCase()} ${a} or ${subj.toUpperCase()} ${b}`
  );
}

function keepCourseAlternatives(clause) {
  const parts = clause.split(/\s+OR\s+/).map((p) => p.trim());
  const courses = parts.filter((p) => hasCourseCode(p));
  return courses.length === 0 ? clause.trim() : courses.join(" OR ");
}

function stripGradeNoise(clause) {
  return clause
    .replace(/\bw\/\s*C\s+or\s+better/gi, "")
    .replace(/\bwith\s+C\s+or\s+better/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitPrereqAndCredit(raw) {
  const marker = /\bCredit\s+(?:is\s+)?allowed\s+for\s*(?:only\s*)?/i;
  const m = raw.match(marker);
  if (!m) return { prereqBody: raw.trim(), creditBody: "" };
  return {
    prereqBody: raw.slice(0, m.index).replace(/[;\s]+$/g, "").trim(),
    creditBody: raw.slice(m.index + m[0].length).trim(),
  };
}

function normalizeCreditLine(creditBody) {
  if (!creditBody) return "";
  let s = creditBody.replace(/\s+OR\s+Visiting\s+University\s+Student\s*$/i, "").trim();
  const chunks = s.split(/\s+OR\s+/).map((c) => c.trim()).filter((c) => hasCourseCode(c));
  return chunks.join(" OR ");
}

function parsePrereqLines(prereqBody) {
  if (!prereqBody) return [];
  const seen = new Set();
  const lines = [];
  for (let clause of prereqBody.split(";").map((c) => c.trim()).filter(Boolean)) {
    if (!hasCourseCode(clause)) continue;
    clause = stripGradeNoise(expandSubjectShorthand(keepCourseAlternatives(stripGradeNoise(clause))));
    if (!hasCourseCode(clause)) continue;
    const key = clause.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(clause);
  }
  return lines;
}

function parseRequirementText(raw) {
  if (!raw) return { prereqLines: [], creditLine: "" };
  let text = raw.trim().replace(/^Prereq(?:uisite)?\(s\):\s*/i, "");
  const { prereqBody, creditBody } = splitPrereqAndCredit(text);
  return {
    prereqLines: parsePrereqLines(prereqBody),
    creditLine: normalizeCreditLine(creditBody),
  };
}

function strmFromParams(query) {
  if (!query || query === "?") return null;
  try {
    const params = new URLSearchParams(query.startsWith("?") ? query : `?${query}`);
    for (const key of ["term", "strm", "session_cd", "sessionCode"]) {
      const v = params.get(key);
      if (v && /^\d{4}$/.test(v)) return v;
    }
  } catch { /* ignore */ }
  return null;
}

function detectStrmFromLocation() {
  const fromSearch = strmFromParams(window.location.search);
  if (fromSearch) return fromSearch;
  const hash = window.location.hash || "";
  if (hash.includes("term=") || hash.includes("strm=")) {
    const qi = hash.indexOf("?");
    if (qi !== -1) return strmFromParams(hash.slice(qi));
  }
  return null;
}

function detectStrmFromDom() {
  for (const sel of ['a[href*="term="]', 'a[href*="strm="]', 'a[href*="session_cd="]']) {
    for (const a of document.querySelectorAll(sel)) {
      try {
        const u = new URL(a.href);
        const found = strmFromParams(u.search) || strmFromParams(u.hash.slice(u.hash.indexOf("?")));
        if (found) return found;
      } catch {
        const m = a.href.match(/(?:term|strm|session_cd)=(\d{4})\b/i);
        if (m) return m[1];
      }
    }
  }
  return null;
}

async function resolveStrm() {
  try {
    const sync = await chrome.storage.sync.get(STORAGE_MANUAL_STRM);
    const manual = sync[STORAGE_MANUAL_STRM];
    if (manual && /^\d{4}$/.test(String(manual))) return String(manual);
  } catch { /* ignore */ }

  const fromLoc = detectStrmFromLocation();
  if (fromLoc) {
    chrome.storage.local.set({ [STORAGE_LAST_STRM]: fromLoc }).catch(() => {});
    return fromLoc;
  }

  const fromDom = detectStrmFromDom();
  if (fromDom) {
    chrome.storage.local.set({ [STORAGE_LAST_STRM]: fromDom }).catch(() => {});
    return fromDom;
  }

  try {
    const local = await chrome.storage.local.get(STORAGE_LAST_STRM);
    const last = local[STORAGE_LAST_STRM];
    if (last && /^\d{4}$/.test(String(last))) return String(last);
  } catch { /* ignore */ }

  return null;
}

function fillPrereqCard(card, data, errorMessage) {
  card.replaceChildren();
  if (errorMessage || !data) {
    const p = document.createElement("p");
    p.textContent = errorMessage ? `Prerequisites unavailable: ${errorMessage}` : "Prerequisites unavailable.";
    card.appendChild(p);
    return;
  }
  const p1 = document.createElement("p");
  const b1 = document.createElement("b");
  b1.textContent = "Prereq: ";
  p1.appendChild(b1);
  p1.appendChild(document.createTextNode(data.prereqLines.length ? data.prereqLines.join("; ") : "None"));
  card.appendChild(p1);

  const p2 = document.createElement("p");
  const b2 = document.createElement("b");
  b2.textContent = "Credit for: ";
  p2.appendChild(b2);
  p2.appendChild(document.createTextNode(data.creditLine || "None"));
  card.appendChild(p2);
}

function injectPrereqCard(courseCode, data, errorMessage) {
  document.querySelectorAll(".class-results-cell *").forEach((el) => {
    if (el.children.length === 0 && el.textContent.trim() === courseCode) {
      const container = el.closest(".class-results-cell") || el.parentElement;
      if (!container || container.querySelector(".asu-prereq-card")) return;
      const card = document.createElement("div");
      card.className = "asu-prereq-card";
      fillPrereqCard(card, data, errorMessage);
      container.appendChild(card);
    }
  });
}

function fetchRequirements(subject, catalogNumber, strm) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: "asu-prereq-fetch-requirements", strm, subject, catalogNumber },
      (response) => {
        const err = chrome.runtime.lastError;
        if (err) return resolve({ ok: false, error: err.message });
        if (!response?.ok) return resolve({ ok: false, error: response?.error || "Unknown error" });
        resolve({ ok: true, data: parseRequirementText(response.raw || "") });
      }
    );
  });
}

(async () => {
  const cache = new Map();

  function findCourses() {
    const courses = new Set();
    document.querySelectorAll(".class-results-cell *").forEach((el) => {
      if (el.children.length === 0 && /^([A-Z]{3})\s(\d{3})$/.test(el.textContent.trim())) {
        courses.add(el.textContent.trim());
      }
    });
    return [...courses];
  }

  async function processCourses() {
    const courses = findCourses();
    if (courses.length === 0) return;

    const strm = await resolveStrm();

    if (!strm) {
      courses.forEach((code) => {
        if (!cache.has(`_nostrm\t${code}`)) cache.set(`_nostrm\t${code}`, true);
        injectPrereqCard(code, null, NO_SESSION_MESSAGE);
      });
      return;
    }

    for (const code of courses) {
      const key = `${strm}\t${code}`;
      const cached = cache.get(key);
      if (cached) {
        injectPrereqCard(code, cached.data, cached.error);
        continue;
      }

      const [subject, catalogNumber] = code.split(" ");
      if (!subject || !catalogNumber) continue;

      try {
        const result = await fetchRequirements(subject, catalogNumber, strm);
        const entry = result.ok
          ? { data: result.data, error: undefined }
          : { data: null, error: result.error };
        cache.set(key, entry);
        // retry a few times to catch late-rendering rows
        [0, 1000, 2500, 5000].forEach((delay) =>
          setTimeout(() => injectPrereqCard(code, entry.data, entry.error), delay)
        );
      } catch (e) {
        const msg = String(e?.message || e);
        cache.set(key, { data: null, error: msg });
        console.error(`ASU Prereq Helper: failed to fetch ${code}:`, e);
        [0, 1000, 2500, 5000].forEach((delay) =>
          setTimeout(() => injectPrereqCard(code, null, msg), delay)
        );
      }
    }
  }

  let debounceId = 0;
  function schedule() {
    clearTimeout(debounceId);
    debounceId = window.setTimeout(processCourses, 120);
  }

  processCourses();
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
})();
