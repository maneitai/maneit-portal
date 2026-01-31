
/* Page-isolated: Home (final pass UI widgets)
   - UI-only placeholders
   - Persists a small activity feed in localStorage
*/

(function () {
  const LS_KEY = "home_final_activity_v1";

  const $ = (sel, root = document) => root.querySelector(sel);

  const els = {
    calMonth: $("#hfCalMonth"),
    calPrev: $("#hfCalPrev"),
    calNext: $("#hfCalNext"),
    calGrid: $("#hfCalGrid"),
    calTodayPill: $("#hfTodayPill"),

    teamsMsg: $("#hfTeamsMsg"),
    teamsChannel: $("#hfTeamsChannel"),
    teamsSend: $("#hfTeamsSend"),

    discMsg: $("#hfDiscMsg"),
    discChannel: $("#hfDiscChannel"),
    discSend: $("#hfDiscSend"),

    meetingTitle: $("#hfMeetingTitle"),
    meetingDate: $("#hfMeetingDate"),
    meetingTime: $("#hfMeetingTime"),
    meetingCreate: $("#hfMeetingCreate"),

    activityList: $("#hfActivityList"),
    activityClear: $("#hfActivityClear"),
  };

  let view = new Date();

  function loadActivity() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveActivity(items) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(items.slice(0, 60)));
    } catch {}
  }

  function pushActivity(type, text) {
    const items = loadActivity();
    items.unshift({
      ts: new Date().toISOString(),
      type,
      text,
    });
    saveActivity(items);
    renderActivity();
  }

  function renderActivity() {
    if (!els.activityList) return;
    const items = loadActivity();
    els.activityList.innerHTML = "";

    if (items.length === 0) {
      const div = document.createElement("div");
      div.className = "hf-item";
      div.innerHTML = `<div class="t">No activity yet</div><div class="m">This is UI-only. Actions will appear here.</div>`;
      els.activityList.appendChild(div);
      return;
    }

    items.slice(0, 12).forEach((it) => {
      const when = formatLocal(it.ts);
      const div = document.createElement("div");
      div.className = "hf-item";
      div.innerHTML = `
        <div class="t">${escapeHtml(it.type)} <span style="opacity:.65;font-size:12px;">• ${escapeHtml(when)}</span></div>
        <div class="m">${escapeHtml(it.text)}</div>
      `;
      els.activityList.appendChild(div);
    });
  }

  function formatLocal(iso) {
    try {
      const d = new Date(iso);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return iso;
    }
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function monthLabel(d) {
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  function renderCalendar() {
    if (!els.calGrid || !els.calMonth) return;

    els.calMonth.textContent = monthLabel(view);

    // start at first of month
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const startDay = (first.getDay() + 6) % 7; // Monday=0
    const start = new Date(first);
    start.setDate(first.getDate() - startDay);

    els.calGrid.innerHTML = "";
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`;
    if (els.calTodayPill) els.calTodayPill.textContent = `Today: ${todayKey}`;

    for (let i = 0; i < 14; i++) { // 2-week visual (fast, not cluttered)
      const d = new Date(start);
      d.setDate(start.getDate() + i);

      const key = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
      const div = document.createElement("div");
      div.className = "hf-day" + (key === todayKey ? " is-today" : "");
      div.title = "Click to create a visual meeting";

      div.innerHTML = `
        <div class="d">${escapeHtml(key)}</div>
        <div class="e">${d.getMonth() === view.getMonth() ? "in view" : "adjacent"}</div>
      `;

      div.addEventListener("click", () => {
        // Pre-fill meeting form
        if (els.meetingDate) els.meetingDate.value = key;
        if (els.meetingTime && !els.meetingTime.value) els.meetingTime.value = "13:00";
        if (els.meetingTitle && !els.meetingTitle.value) els.meetingTitle.value = "Info meeting";
        pushActivity("Calendar", `Selected date ${key} (visual).`);
      });

      els.calGrid.appendChild(div);
    }
  }

  function wire() {
    // Calendar nav
    els.calPrev?.addEventListener("click", () => {
      view = new Date(view.getFullYear(), view.getMonth() - 1, 1);
      renderCalendar();
    });
    els.calNext?.addEventListener("click", () => {
      view = new Date(view.getFullYear(), view.getMonth() + 1, 1);
      renderCalendar();
    });

    // Teams
    els.teamsSend?.addEventListener("click", () => {
      const chan = (els.teamsChannel?.value || "General").trim();
      const msg = (els.teamsMsg?.value || "").trim();
      if (!msg) return;
      pushActivity("Teams", `#${chan}: ${msg}`);
      els.teamsMsg.value = "";
    });

    // Discord
    els.discSend?.addEventListener("click", () => {
      const chan = (els.discChannel?.value || "general").trim();
      const msg = (els.discMsg?.value || "").trim();
      if (!msg) return;
      pushActivity("Discord", `#${chan}: ${msg}`);
      els.discMsg.value = "";
    });

    // Meeting create (visual)
    els.meetingCreate?.addEventListener("click", () => {
      const title = (els.meetingTitle?.value || "Info meeting").trim();
      const date = (els.meetingDate?.value || "").trim();
      const time = (els.meetingTime?.value || "").trim();
      if (!date || !time) return;

      pushActivity("Calendar", `Created meeting "${title}" on ${date} at ${time} (visual).`);
    });

    // Activity clear
    els.activityClear?.addEventListener("click", () => {
      saveActivity([]);
      renderActivity();
      pushActivity("System", "Activity cleared.");
    });

    renderCalendar();
    renderActivity();
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  document.addEventListener("DOMContentLoaded", wire);
})();
