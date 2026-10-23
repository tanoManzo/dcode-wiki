const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const icons = { terminal: "⌘", database: "▤", network: "◇", server: "▥", chart: "↗", book: "≡" };
let content = { meetings: [], papers: [], projectMeetings: [], people: [], resources: [] };
let showingAll = false;

const formatDate = (iso) => {
  const date = new Date(`${iso}T12:00:00`);
  return {
    short: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    day: date.toLocaleDateString("en-US", { weekday: "short" }),
    chip: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase()
  };
};

function renderMeetings() {
  const rows = showingAll ? content.meetings : content.meetings.slice(0, 4);
  $("#meeting-list").innerHTML = rows.map((meeting) => {
    const date = formatDate(meeting.date);
    const link = meeting.url ? `<a class="meeting-link" href="${meeting.url}" target="_blank" rel="noopener" aria-label="Open paper">↗</a>` : `<span></span>`;
    return `<article class="meeting-row">
      <div class="date-block"><strong>${date.short}</strong><small>${date.day}</small></div>
      <div class="meeting-person">${meeting.presenter}</div>
      <div class="meeting-info"><small>${meeting.type}</small><p>${meeting.title}</p></div>${link}
    </article>`;
  }).join("");
  $("#show-all-meetings").innerHTML = showingAll ? "Show fewer <span>↑</span>" : "Show full schedule <span>↓</span>";
}

function render() {
  renderMeetings();
  $("#paper-grid").innerHTML = content.papers.map((paper) => `<article class="paper-card"><span>${paper.journal}</span><h3>${paper.title}</h3><a href="${paper.url}" target="_blank" rel="noopener">Read paper ↗</a></article>`).join("");
  $("#project-list").innerHTML = content.projectMeetings.map((item) => `<div class="project-row"><strong>${item.time}</strong><span>${item.person}</span></div>`).join("");
  $("#people-grid").innerHTML = content.people.map((person) => {
    const initials = person.name.split(" ").map((part) => part[0]).join("").slice(0, 2);
    return `<article class="person">
      <div class="person-photo-wrap"><img class="person-photo" src="${person.photo}" alt="${person.name}" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false" /><span class="person-avatar" hidden>${initials}</span></div>
      <div class="person-details"><strong>${person.name}</strong><small>${person.role}</small></div>
    </article>`;
  }).join("");
  $("#resource-grid").innerHTML = content.resources.map((resource) => `<a class="resource-card" href="${resource.url}" target="_blank" rel="noopener"><b>${icons[resource.icon] || "•"}</b><h3>${resource.title} ↗</h3><p>${resource.description}</p></a>`).join("");

  if (content.meetings[0]) {
    const next = content.meetings[0];
    $("#next-date-chip").textContent = formatDate(next.date).chip;
    $("#next-paper-title").textContent = next.title;
    $("#next-presenter").textContent = next.presenter;
    $("#next-meeting-title").textContent = next.type;
  }
}

function openSearch() {
  const dialog = $("#search-dialog");
  if (!dialog.open) dialog.showModal();
  requestAnimationFrame(() => $("#search-input").focus());
}

function search(query) {
  const q = query.trim().toLowerCase();
  if (!q) { $("#search-results").innerHTML = "<p>Start typing to search across the wiki.</p>"; return; }
  const items = [
    ...content.meetings.map((x) => ({ category: "Meeting", title: `${x.presenter} — ${x.title}`, href: "#meetings" })),
    ...content.papers.map((x) => ({ category: "Paper", title: x.title, href: x.url })),
    ...content.people.map((x) => ({ category: "Person", title: `${x.name} — ${x.role}`, href: "#people" })),
    ...content.resources.map((x) => ({ category: "Resource", title: `${x.title} — ${x.description}`, href: x.url }))
  ].filter((x) => `${x.category} ${x.title}`.toLowerCase().includes(q)).slice(0, 12);
  $("#search-results").innerHTML = items.length ? items.map((item) => `<a class="search-result" href="${item.href}"><small>${item.category}</small><strong>${item.title}</strong></a>`).join("") : "<p>No results found. Try a broader term.</p>";
}

async function init() {
  try {
    const response = await fetch("content.json");
    if (!response.ok) throw new Error("Content could not be loaded");
    content = await response.json();
    render();
  } catch (error) {
    $("#meeting-list").innerHTML = `<p>Could not load the wiki content. Please refresh the page.</p>`;
    console.error(error);
  }

  $("#year").textContent = new Date().getFullYear();
  $("#show-all-meetings").addEventListener("click", () => { showingAll = !showingAll; renderMeetings(); });
  $("#search-trigger").addEventListener("click", openSearch);
  $("#search-close").addEventListener("click", () => $("#search-dialog").close());
  $("#search-input").addEventListener("input", (event) => search(event.target.value));
  $("#search-results").addEventListener("click", () => $("#search-dialog").close());
  $("#search-dialog").addEventListener("click", (event) => { if (event.target === $("#search-dialog")) $("#search-dialog").close(); });
  document.addEventListener("keydown", (event) => { if (event.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) { event.preventDefault(); openSearch(); } });
  $("#browse-resources").addEventListener("click", () => $("#resources").scrollIntoView({ behavior: "smooth" }));
  $("#menu-button").addEventListener("click", () => {
    const nav = $("#mobile-nav");
    nav.hidden = !nav.hidden;
    $("#menu-button").setAttribute("aria-expanded", String(!nav.hidden));
  });
  $$("#mobile-nav a").forEach((link) => link.addEventListener("click", () => { $("#mobile-nav").hidden = true; $("#menu-button").setAttribute("aria-expanded", "false"); }));
  $("#ack-toggle").addEventListener("click", () => {
    const text = $("#ack-text"); const expanded = text.hidden;
    text.hidden = !expanded; $("#ack-toggle").setAttribute("aria-expanded", String(expanded));
    $("#ack-toggle > span:last-child").textContent = expanded ? "−" : "+";
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); }
    });
  }, { threshold: 0.08 });
  $$(".content-section, .acknowledgement").forEach((section) => { section.classList.add("reveal"); observer.observe(section); });
}

init();
