const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const icons = { terminal: "⌘", database: "▤", network: "◇", server: "▥", chart: "↗", book: "≡" };
let content = { meetings: [], papers: [], projectMeetings: [], people: [], resources: [] };
let showingAll = false;

const localISODate = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

const formatDate = (iso) => {
  const date = new Date(`${iso}T12:00:00`);
  return {
    short: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    day: date.toLocaleDateString("en-US", { weekday: "short" }),
    chip: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase()
  };
};

function renderMeetings() {
  const today = localISODate();
  const sorted = [...content.meetings].sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = sorted.filter((meeting) => meeting.date >= today);
  const past = sorted.filter((meeting) => meeting.date < today).reverse();
  const visibleUpcoming = showingAll ? upcoming : upcoming.slice(0, 4);
  const visiblePast = showingAll ? past : past.slice(0, 2);

  const meetingRows = (rows, isPast = false) => rows.map((meeting) => {
    const date = formatDate(meeting.date);
    const link = meeting.url ? `<a class="meeting-link" href="${meeting.url}" target="_blank" rel="noopener" aria-label="Open paper">↗</a>` : `<span></span>`;
    return `<article class="meeting-row${isPast ? " is-past" : ""}">
      <div class="date-block"><strong>${date.short}</strong><small>${date.day}</small></div>
      <div class="meeting-person">${meeting.presenter}</div>
      <div class="meeting-info"><small>${isPast ? "Past · " : ""}${meeting.type}</small><p>${meeting.title}</p></div>${link}
    </article>`;
  }).join("");

  const upcomingMarkup = visibleUpcoming.length
    ? meetingRows(visibleUpcoming)
    : `<div class="empty-schedule">No upcoming meetings are scheduled yet.</div>`;
  const pastMarkup = visiblePast.length
    ? `<div class="schedule-divider"><span>Past meetings</span></div>${meetingRows(visiblePast, true)}`
    : "";
  $("#meeting-list").innerHTML = upcomingMarkup + pastMarkup;
  $("#show-all-meetings").innerHTML = showingAll ? "Show fewer <span>↑</span>" : "Show full schedule <span>↓</span>";
}

function renderNextMeeting() {
  const today = localISODate();
  const next = [...content.meetings]
    .sort((a, b) => a.date.localeCompare(b.date))
    .find((meeting) => meeting.date >= today);

  if (!next) {
    $("#next-date-chip").textContent = "TBD";
    $("#next-meeting-time").textContent = "New schedule coming soon";
    $("#next-meeting-title").textContent = "Nothing scheduled";
    $("#next-paper-title").textContent = "Add the next meeting in the wiki editor.";
    $("#next-presenter").textContent = "—";
    $("#next-avatar").textContent = "—";
    return;
  }

  const initials = next.presenter
    .split(/[\s&]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  $("#next-date-chip").textContent = formatDate(next.date).chip;
  $("#next-meeting-time").textContent = `${formatDate(next.date).day} · 10:00 AM`;
  $("#next-paper-title").textContent = next.title;
  $("#next-presenter").textContent = next.presenter;
  $("#next-meeting-title").textContent = next.type;
  $("#next-avatar").textContent = initials || "—";
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

  renderNextMeeting();
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
    const response = await fetch(`content.json?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Content could not be loaded");
    content = await response.json();
    render();
  } catch (error) {
    $("#meeting-list").innerHTML = `<p>Could not load the wiki content. Please refresh the page.</p>`;
    console.error(error);
  }

  $("#year").textContent = new Date().getFullYear();
  const topbar = $(".topbar");
  const desktopNavLinks = $$(".desktop-nav a");
  const trackedSections = desktopNavLinks
    .map((link) => ({ link, section: $(link.getAttribute("href")) }))
    .filter((item) => item.section);
  let navigationFrame;
  const updateNavigation = () => {
    topbar.classList.toggle("scrolled", window.scrollY > 8);
    const marker = topbar.offsetHeight + 110;
    let current = trackedSections[0];
    trackedSections.forEach((item) => {
      if (item.section.getBoundingClientRect().top <= marker) current = item;
    });
    desktopNavLinks.forEach((link) => link.classList.toggle("active", link === current.link));
  };
  const requestNavigationUpdate = () => {
    if (navigationFrame) return;
    navigationFrame = requestAnimationFrame(() => { updateNavigation(); navigationFrame = null; });
  };
  updateNavigation();
  window.addEventListener("scroll", requestNavigationUpdate, { passive: true });
  window.addEventListener("resize", requestNavigationUpdate);
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
