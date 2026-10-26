const $ = (selector) => document.querySelector(selector);
let papers = [];

const escapeHTML = (value) => String(value).replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]);
const paperYear = (paper) => paper.date.split("/").at(-1);
const monthNames = ["", "JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const normalize = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const localISODate = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};
const archiveDateKey = (paper) => {
  const parts = paper.date.split("/").map(Number);
  const [month, day, year] = parts.length === 3 ? parts : [parts[0], 1, parts[1]];
  return year * 10_000 + month * 100 + day;
};

function addPastJournalClubs(archive, meetings) {
  const today = localISODate();
  const knownUrls = new Set(archive.map((paper) => paper.url?.replace(/\/$/, "").toLowerCase()).filter(Boolean));
  const knownCitations = archive.map((paper) => normalize(paper.citation));
  const additions = meetings.filter((meeting) => {
    if (meeting.date >= today || !meeting.type?.toLowerCase().includes("journal club") || !meeting.title) return false;
    const url = meeting.url?.replace(/\/$/, "").toLowerCase();
    const title = normalize(meeting.title);
    return !(url && knownUrls.has(url)) && !knownCitations.some((citation) => citation.includes(title));
  }).map((meeting) => {
    const [year, month, day] = meeting.date.split("-").map(Number);
    return {
      date: `${month}/${day}/${year}`,
      presenter: meeting.presenter || "—",
      citation: meeting.title,
      url: meeting.url || "",
      automatic: true
    };
  });
  return [...archive, ...additions].sort((a, b) => archiveDateKey(b) - archiveDateKey(a));
}

function fillFilters() {
  const years = [...new Set(papers.map(paperYear))].sort((a, b) => Number(b) - Number(a));
  const presenters = [...new Set(papers.map((paper) => paper.presenter).filter((name) => name !== "—"))].sort();
  $("#year-filter").insertAdjacentHTML("beforeend", years.map((year) => `<option value="${year}">${year}</option>`).join(""));
  $("#presenter-filter").insertAdjacentHTML("beforeend", presenters.map((name) => `<option value="${escapeHTML(name)}">${escapeHTML(name)}</option>`).join(""));
  $("#paper-total").textContent = papers.length;
  $("#year-total").textContent = years.length;
}

function render() {
  const query = $("#archive-search").value.trim().toLowerCase();
  const year = $("#year-filter").value;
  const presenter = $("#presenter-filter").value;
  const filtered = papers.filter((paper) => {
    const matchesText = !query || `${paper.presenter} ${paper.citation} ${paper.date}`.toLowerCase().includes(query);
    return matchesText && (!year || paperYear(paper) === year) && (!presenter || paper.presenter === presenter);
  });

  let previousYear = "";
  $("#archive-list").innerHTML = filtered.map((paper) => {
    const yearLabel = paperYear(paper);
    const divider = yearLabel !== previousYear ? `<div class="archive-year-divider">${paper.legacy ? "Legacy archive · " : ""}${yearLabel}</div>` : "";
    previousYear = yearLabel;
    const link = paper.url ? `<a class="archive-row-link" href="${escapeHTML(paper.url)}" target="_blank" rel="noopener" aria-label="Open paper">↗</a>` : `<span></span>`;
    const dateParts = paper.date.split("/");
    const [month] = dateParts;
    const dateLabel = monthNames[Number(month)] || month;
    return `${divider}<article class="archive-row${paper.automatic ? " is-automatic" : ""}">
      <div class="archive-date"><strong>${escapeHTML(dateLabel)}</strong></div>
      <span class="presenter-chip">${escapeHTML(paper.presenter)}</span>
      <p class="archive-citation">${escapeHTML(paper.citation)}</p>${link}
    </article>`;
  }).join("");

  $("#result-count").textContent = `${filtered.length} ${filtered.length === 1 ? "entry" : "entries"}`;
  $("#archive-empty").hidden = filtered.length > 0;
}

async function init() {
  try {
    const cacheKey = Date.now();
    const [archiveResponse, contentResponse] = await Promise.all([
      fetch(`journal-club-papers.json?v=${cacheKey}`, { cache: "no-store" }),
      fetch(`content.json?v=${cacheKey}`, { cache: "no-store" })
    ]);
    if (!archiveResponse.ok) throw new Error("Archive could not be loaded");
    const archive = await archiveResponse.json();
    const schedule = contentResponse.ok ? await contentResponse.json() : { meetings: [] };
    papers = addPastJournalClubs(archive, schedule.meetings || []);
    fillFilters();
    render();
  } catch (error) {
    $("#archive-list").innerHTML = "<p>The archive could not be loaded. Please refresh the page.</p>";
    console.error(error);
  }

  $("#year").textContent = new Date().getFullYear();
  ["#archive-search", "#year-filter", "#presenter-filter"].forEach((selector) => $(selector).addEventListener("input", render));
  $("#clear-filters").addEventListener("click", () => { $("#archive-search").value = ""; $("#year-filter").value = ""; $("#presenter-filter").value = ""; render(); });
}

init();
