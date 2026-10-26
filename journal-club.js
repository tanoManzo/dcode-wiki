const $ = (selector) => document.querySelector(selector);
let papers = [];

const escapeHTML = (value) => String(value).replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]);
const paperYear = (paper) => paper.date.split("/").at(-1);

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
    const [month, day] = paper.date.split("/");
    const dateLabel = paper.date.split("/").length === 3 ? `${month}/${day}` : month;
    const dateUnit = paper.date.split("/").length === 3 ? "date" : "month";
    return `${divider}<article class="archive-row">
      <div class="archive-date"><strong>${escapeHTML(dateLabel)}</strong><small>${dateUnit}</small></div>
      <span class="presenter-chip">${escapeHTML(paper.presenter)}</span>
      <p class="archive-citation">${escapeHTML(paper.citation)}</p>${link}
    </article>`;
  }).join("");

  $("#result-count").textContent = `${filtered.length} ${filtered.length === 1 ? "entry" : "entries"}`;
  $("#archive-empty").hidden = filtered.length > 0;
}

async function init() {
  try {
    const response = await fetch(`journal-club-papers.json?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Archive could not be loaded");
    papers = await response.json();
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
