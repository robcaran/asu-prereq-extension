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

/** Shown when no term can be detected and none is saved in Options. */
const NO_SESSION_MESSAGE =
  "Set the four-digit session code in extension Options (same as Class Search term=), then refresh this page.";

document.head.insertAdjacentHTML("beforeend", `<style>${styles}</style>`);

/** @param {string} segment */
function hasCourseCode(segment) {
  return /\b[A-Z]{3}\s\d{3}\b/.test(segment);
}

/** @param {string} text */
function expandSubjectOrNumberShorthand(text) {
  return text.replace(
    /\b([A-Z]{3})\s+(\d{3})\s+or\s+(\d{3})\b/gi,
    (_, subj, a, b) =>
      `${subj.toUpperCase()} ${a} or ${subj.toUpperCase()} ${b}`,
  );
}

/** @param {string} clause */
function keepOnlyCourseAlternatives(clause) {
  const parts = clause.split(/\s+OR\s+/).map((p) => p.trim());
  const courseParts = parts.filter((p) => hasCourseCode(p));
  if (courseParts.length === 0) return clause.trim();
  return courseParts.join(" OR ");
}

/** @param {string} clause */
function stripGradeAndNoise(clause) {
  return clause
    .replace(/\bw\/\s*C\s+or\s+better/gi, "")
    .replace(/\bwith\s+C\s+or\s+better/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** @param {string} raw */
function splitPrereqBodyAndCredit(raw) {
  const creditMarker =
    /\bCredit\s+(?:is\s+)?allowed\s+for\s*(?:only\s*)?/i;
  const m = raw.match(creditMarker);
  if (!m) {
    return { prereqBody: raw.trim(), creditBody: "" };
  }
  const idx = m.index;
  const prereqBody = raw.slice(0, idx).replace(/[;\s]+$/g, "").trim();
  const creditBody = raw.slice(idx + m[0].length).trim();
  return { prereqBody, creditBody };
}

/** @param {string} creditBody */
function normalizeCreditLine(creditBody) {
  if (!creditBody) return "";
  let s = creditBody.replace(
    /\s+OR\s+Visiting\s+University\s+Student\s*$/i,
    "",
  );
  s = s.trim();
  const orChunks = s.split(/\s+OR\s+/).map((c) => c.trim());
  const courseChunks = orChunks.filter((c) => hasCourseCode(c));
  return courseChunks.join(" OR ");
}

/** @param {string} prereqBody */
function parsePrereqLines(prereqBody) {
  if (!prereqBody) return [];

  const clauses = prereqBody
    .split(";")
    .map((c) => c.trim())
    .filter(Boolean);

  const seen = new Set();
  const lines = [];

  for (let clause of clauses) {
    if (!hasCourseCode(clause)) continue;

    clause = stripGradeAndNoise(clause);
    clause = expandSubjectOrNumberShorthand(clause);
    clause = keepOnlyCourseAlternatives(clause);
    clause = stripGradeAndNoise(clause);

    if (!hasCourseCode(clause)) continue;

    const key = clause.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(clause);
  }

  return lines;
}

/**
 * @param {string} raw
 * @returns {{ prereqLines: string[]; creditLine: string }}
 */
function parseRequirementText(raw) {
  if (!raw) {
    return { prereqLines: [], creditLine: "" };
  }

  let text = raw.trim();
  text = text.replace(/^Prereq(?:uisite)?\(s\):\s*/i, "");

  const { prereqBody, creditBody } = splitPrereqBodyAndCredit(text);
  return {
    prereqLines: parsePrereqLines(prereqBody),
    creditLine: normalizeCreditLine(creditBody),
  };
}

/** @param {string} queryWithQ */
function strmFromSearchParams(queryWithQ) {
  if (!queryWithQ || queryWithQ === "?") return null;
  const q = queryWithQ.startsWith("?") ? queryWithQ : `?${queryWithQ}`;
  try {
    const params = new URLSearchParams(q);
    for (const key of ["term", "strm", "session_cd", "sessionCode"]) {
      const v = params.get(key);
      if (v && /^\d{4}$/.test(v)) return v;
    }
  } catch {
    // ignore
  }
  return null;
}

function detectStrmFromLocation() {
  const fromSearch = strmFromSearchParams(window.location.search);
  if (fromSearch) return fromSearch;

  const hash = window.location.hash || "";
  if (hash.includes("term=") || hash.includes("strm=")) {
    const qi = hash.indexOf("?");
    if (qi !== -1) {
      const fromHash = strmFromSearchParams(hash.slice(qi));
      if (fromHash) return fromHash;
    }
  }
  return null;
}

function strmFromHash(hash) {
  if (!hash || !hash.includes("?")) return null;
  return strmFromSearchParams(hash.slice(hash.indexOf("?")));
}

function detectStrmFromDom() {
  for (const sel of [
    'a[href*="term="]',
    'a[href*="strm="]',
    'a[href*="session_cd="]',
  ]) {
    for (const a of document.querySelectorAll(sel)) {
      try {
        const u = new URL(/** @type {HTMLAnchorElement} */ (a).href);
        const fromLink =
          strmFromSearchParams(u.search) || strmFromHash(u.hash || "");
        if (fromLink) return fromLink;
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
    if (manual && /^\d{4}$/.test(String(manual))) {
      return String(manual);
    }
  } catch {
    // storage may be unavailable in rare cases
  }

  const fromLoc = detectStrmFromLocation();
  if (fromLoc) {
    try {
      await chrome.storage.local.set({ [STORAGE_LAST_STRM]: fromLoc });
    } catch {
      // ignore
    }
    return fromLoc;
  }

  const fromDom = detectStrmFromDom();
  if (fromDom) {
    try {
      await chrome.storage.local.set({ [STORAGE_LAST_STRM]: fromDom });
    } catch {
      // ignore
    }
    return fromDom;
  }

  try {
    const local = await chrome.storage.local.get(STORAGE_LAST_STRM);
    const last = local[STORAGE_LAST_STRM];
    if (last && /^\d{4}$/.test(String(last))) {
      return String(last);
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * @param {HTMLElement} root
 * @param {{ prereqLines: string[]; creditLine: string } | null} data
 * @param {string} [errorMessage]
 */
function fillPrereqCard(root, data, errorMessage) {
  root.replaceChildren();

  if (errorMessage) {
    const p = document.createElement("p");
    p.textContent = `Prerequisites unavailable: ${errorMessage}`;
    root.appendChild(p);
    return;
  }

  if (!data) {
    const p = document.createElement("p");
    p.textContent = "Prerequisites unavailable.";
    root.appendChild(p);
    return;
  }

  const p1 = document.createElement("p");
  const b1 = document.createElement("b");
  b1.textContent = "Prereq: ";
  p1.appendChild(b1);
  p1.appendChild(
    document.createTextNode(
      data.prereqLines.length ? data.prereqLines.join("; ") : "None",
    ),
  );
  root.appendChild(p1);

  const p2 = document.createElement("p");
  const b2 = document.createElement("b");
  b2.textContent = "Credit for: ";
  p2.appendChild(b2);
  p2.appendChild(
    document.createTextNode(data.creditLine || "None"),
  );
  root.appendChild(p2);
}

/**
 * @param {string} courseCode
 * @param {{ prereqLines: string[]; creditLine: string } | null} data
 * @param {string} [errorMessage]
 */
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

/**
 * @param {string} subject
 * @param {string} catalogNumber
 * @param {string} strm
 * @returns {Promise<{ ok: true, data: ReturnType<typeof parseRequirementText> } | { ok: false, error: string }>}
 */
function fetchRequirementsViaBackground(subject, catalogNumber, strm) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        type: "asu-prereq-fetch-requirements",
        strm,
        subject,
        catalogNumber,
      },
      (response) => {
        const err = chrome.runtime.lastError;
        if (err) {
          resolve({ ok: false, error: err.message });
          return;
        }
        if (!response?.ok) {
          resolve({
            ok: false,
            error: response?.error || "Unknown error",
          });
          return;
        }
        resolve({
          ok: true,
          data: parseRequirementText(response.raw || ""),
        });
      },
    );
  });
}

(async () => {
  const cache = new Map();

  const findCourses = () => {
    const courses = new Set();
    document.querySelectorAll(".class-results-cell *").forEach((el) => {
      if (el.children.length === 0) {
        const text = el.textContent.trim();
        if (/^([A-Z]{3})\s(\d{3})$/.test(text)) courses.add(text);
      }
    });
    return Array.from(courses);
  };

  const processCourses = async () => {
    const courses = findCourses();
    if (courses.length === 0) return;

    const strm = await resolveStrm();

    if (!strm) {
      for (const courseCode of courses) {
        const cacheKey = `_nostrm\t${courseCode}`;
        if (!cache.has(cacheKey)) {
          cache.set(cacheKey, {
            data: null,
            error: NO_SESSION_MESSAGE,
          });
        }
        injectPrereqCard(courseCode, null, NO_SESSION_MESSAGE);
      }
      return;
    }

    for (const courseCode of courses) {
      const cacheKey = `${strm}\t${courseCode}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        injectPrereqCard(courseCode, cached.data, cached.error);
        continue;
      }

      const parts = courseCode.split(" ");
      if (parts.length !== 2) continue;

      const [subject, catalogNumber] = parts;

      try {
        const result = await fetchRequirementsViaBackground(
          subject,
          catalogNumber,
          strm,
        );
        if (result.ok) {
          cache.set(cacheKey, { data: result.data, error: undefined });
          [0, 1000, 2500, 5000].forEach((delay) =>
            setTimeout(
              () => injectPrereqCard(courseCode, result.data, undefined),
              delay,
            ),
          );
        } else {
          cache.set(cacheKey, {
            data: null,
            error: result.error,
          });
          [0, 1000, 2500, 5000].forEach((delay) =>
            setTimeout(
              () => injectPrereqCard(courseCode, null, result.error),
              delay,
            ),
          );
        }
      } catch (e) {
        const msg = String(/** @type {Error} */ (e)?.message || e);
        cache.set(cacheKey, { data: null, error: msg });
        console.error(`Failed to fetch data for ${courseCode}:`, e);
        [0, 1000, 2500, 5000].forEach((delay) =>
          setTimeout(() => injectPrereqCard(courseCode, null, msg), delay),
        );
      }
    }
  };

  let processDebounceId = 0;
  const scheduleProcessCourses = () => {
    clearTimeout(processDebounceId);
    processDebounceId = window.setTimeout(() => {
      processCourses();
    }, 120);
  };

  processCourses();

  const observer = new MutationObserver(() => scheduleProcessCourses());
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: false,
  });
})();
