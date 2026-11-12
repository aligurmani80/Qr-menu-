/* ==========================================================================
   KARAHI HOUSE — PHASE 4 SUPER ADMIN

   One console for the restaurant registry, plans, monthly fees and plan
   expiry. All numbers come from localStorage; plans are seeded from
   superadmin/js/config.js and can then be managed here.
   ========================================================================== */

(() => {
  "use strict";

  if (typeof SUPERADMIN_CONFIG === "undefined" || typeof Tenant === "undefined") {
    document.body.innerHTML =
      '<div class="boot-error"><h1>Console unavailable</h1>' +
      '<p>The Super Admin scripts could not load. Check that js/config.js, js/tenant.js, ' +
      'superadmin/js/config.js and superadmin/js/superadmin.js are all present.</p></div>';
    return;
  }

  const SA = SUPERADMIN_CONFIG;
  const appConfig = typeof CONFIG !== "undefined" && CONFIG ? CONFIG : {};
  const currency = appConfig.currency || {};
  const currencySymbol = String(currency.symbol || "Rs.");
  const platformName =
    String(SA.platformName || (appConfig.restaurant && appConfig.restaurant.name) || "Karahi House").trim() ||
    "Karahi House";

  const page = document.body.dataset.page || "dashboard";
  const SESSION_KEY = SA.sessionKey || "karahiHouse.superadminSession.v1";
  const PLANS_KEY = SA.plansKey || "karahiHouse.plans.v1";
  const PAYMENTS_KEY = SA.paymentsKey || "karahiHouse.payments.v1";
  const ONBOARDING_KEY = SA.onboardingKey || "karahiHouse.onboarding.v1";
  const DEMO_ID = String((SA.demo && SA.demo.restaurantId) || "demo-karahi-house");
  const DEMO_PATH = String((SA.demo && SA.demo.path) || "../demo/karahi-house/");
  const DEMO_TABLE = Math.max(1, Number(SA.demo && SA.demo.defaultTable) || 5);
  const ONBOARDING_ITEMS = Array.isArray(SA.onboardingItems) && SA.onboardingItems.length
    ? SA.onboardingItems
    : [
        { id: "restaurant", label: "Restaurant Added" },
        { id: "menu", label: "Menu Items Added" },
        { id: "tables", label: "Tables and QR Printed" },
        { id: "staff", label: "Staff Added" },
        { id: "test-order", label: "Test Order Placed" },
        { id: "payment", label: "Plan Paid and Active" },
      ];
  const BILLING_DAYS =
    Number(SA.billingCycleDays) > 0 ? Number(SA.billingCycleDays) : Tenant.BILLING_CYCLE_DAYS;
  const PAYMENT_METHODS = Array.isArray(SA.paymentMethods) ? SA.paymentMethods.slice() : [];
  const PAYMENT_DETAILS = Array.isArray(SA.paymentDetails) ? SA.paymentDetails.slice() : [];
  const STORAGE_KEYS = [Tenant.REGISTRY_KEY, PLANS_KEY, PAYMENTS_KEY, ONBOARDING_KEY];
  const RESERVED_USERNAMES = new Set(["manager", "kitchen", "waiter"]);

  const moneyFormatter = new Intl.NumberFormat(currency.locale || undefined, {
    maximumFractionDigits: 0,
  });
  let dateFormatter;
  let monthFormatter;
  try {
    dateFormatter = new Intl.DateTimeFormat(currency.locale || undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    dateFormatter = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" });
  }
  try {
    monthFormatter = new Intl.DateTimeFormat(currency.locale || undefined, {
      month: "long",
      year: "numeric",
    });
  } catch {
    monthFormatter = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
  }

  const ICONS = {
    grid:
      '<rect x="3.5" y="3.5" width="7" height="7" rx="1.8"></rect>' +
      '<rect x="13.5" y="3.5" width="7" height="7" rx="1.8"></rect>' +
      '<rect x="3.5" y="13.5" width="7" height="7" rx="1.8"></rect>' +
      '<rect x="13.5" y="13.5" width="7" height="7" rx="1.8"></rect>',
    store:
      '<path d="M4 10v9h16v-9"></path>' +
      '<path d="M3 10l1.8-6h14.4L21 10a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0Z"></path>' +
      '<path d="M9.5 19v-4.6h5V19"></path>',
    layers:
      '<path d="m12 3 9 5-9 5-9-5 9-5Z"></path>' +
      '<path d="m3 12.5 9 5 9-5"></path>' +
      '<path d="m3 16.5 9 5 9-5"></path>',
    card:
      '<rect x="2.5" y="5" width="19" height="14" rx="2.5"></rect>' +
      '<path d="M2.5 9.5h19"></path><path d="M6 14.5h4"></path>',
    plus: '<path d="M12 5v14M5 12h14"></path>',
    edit: '<path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path>',
    trash:
      '<path d="M3 6h18"></path><path d="M8 6V4h8v2"></path>' +
      '<path d="m19 6-1 14H6L5 6"></path><path d="M10 10v7M14 10v7"></path>',
    check: '<path d="m5 12.5 4.3 4.3L19 6.5"></path>',
    close: '<path d="M6 6l12 12M18 6 6 18"></path>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"></path>',
    logout:
      '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>' +
      '<path d="m16 17 5-5-5-5"></path><path d="M21 12H9"></path>',
    cash:
      '<rect x="2.5" y="6" width="19" height="12" rx="2.5"></rect>' +
      '<circle cx="12" cy="12" r="2.5"></circle><path d="M6 9.5v.01M18 14.5v.01"></path>',
    download:
      '<path d="M12 3v11M7.5 10l4.5 4.5 4.5-4.5"></path>' +
      '<path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"></path>',
    print:
      '<path d="M6 9V3h12v6"></path>' +
      '<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>' +
      '<rect x="6" y="14" width="12" height="8" rx="1.2"></rect>',
    whatsapp:
      '<path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.4L3 21l2.1-5.6A8.4 8.4 0 1 1 21 11.5Z"></path>' +
      '<path d="M8.6 8.7c.2-.4.5-.5.7-.5h.5c.2 0 .4 0 .6.4l.8 1.9c.1.2 0 .4-.1.6l-.5.6c-.1.2-.2.3 0 .6.5.8 1.2 1.4 2 1.9.3.2.4.1.6 0l.6-.6c.2-.2.4-.2.6-.1l1.9.9c.2.1.4.2.4.4v.7c0 .3-.2 1.2-1.3 1.5-.8.2-1.7.1-2.7-.4-1.1-.5-2.4-1.4-3.4-2.8-.9-1.1-1.3-2.3-1.3-3.3 0-.8.2-1.4.5-1.8Z"></path>',
    copy:
      '<rect x="9" y="9" width="12" height="12" rx="2"></rect>' +
      '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>',
    external:
      '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>' +
      '<path d="M15 3h6v6"></path><path d="M10 14 21 3"></path>',
    alert:
      '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"></path>' +
      '<path d="M12 9v4M12 17h.01"></path>',
    clock: '<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3.2 2"></path>',
    calendar:
      '<rect x="3" y="5" width="18" height="16" rx="2.5"></rect>' +
      '<path d="M16 3v4M8 3v4M3 10h18"></path>',
    users:
      '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>' +
      '<circle cx="9" cy="7" r="4"></circle>' +
      '<path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',
    chart:
      '<path d="M3.5 20.5h17"></path><path d="M6.5 20v-6"></path>' +
      '<path d="M12 20V4.5"></path><path d="M17.5 20v-9"></path>',
    search: '<circle cx="11" cy="11" r="6.4"></circle><path d="m15.8 15.8 4.4 4.4"></path>',
    "arrow-right": '<path d="M4 12h15M13 6l6 6-6 6"></path>',
    "chevron-down": '<path d="m6 9 6 6 6-6"></path>',
    refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4"></path><path d="M21 3v6h-6"></path>',
    image:
      '<rect x="3" y="3" width="18" height="18" rx="2.5"></rect>' +
      '<circle cx="8.7" cy="8.7" r="1.6"></circle><path d="m21 15.5-4.5-4.5L6 21"></path>',
    shield:
      '<path d="M12 3 5 6v5.5c0 4.2 2.9 7.7 7 9.5 4.1-1.8 7-5.3 7-9.5V6l-7-3Z"></path>' +
      '<path d="m9 12 2 2 4-4"></path>',
    ban: '<circle cx="12" cy="12" r="9"></circle><path d="m5.6 5.6 12.8 12.8"></path>',
    play: '<path d="m8 5 11 7-11 7V5Z"></path>',
    pause: '<path d="M8 5v14M16 5v14"></path>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle>',
    receipt:
      '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"></path>' +
      '<path d="M9 8h6M9 12h6M9 16h3"></path>',
    star:
      '<path d="m12 3.6 2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6-4.3-4.2 6-.9L12 3.6Z"></path>',
    list:
      '<path d="M9 6h11M9 12h11M9 18h11"></path>' +
      '<path d="m4 5.5.9.9L6.5 4.7M4 11.5l.9.9 1.6-1.7M4 17.5l.9.9 1.6-1.7"></path>',
  };

  const state = {
    page,
    session: null,
    logoDraft: undefined,
    modalOpen: false,
    modalTrigger: null,
    sidebarOpen: false,
    earningsMonth: Tenant.dateKey(new Date()).slice(0, 7),
  };

  /* ------------------------------------------------------------------------
     Small helpers
     ------------------------------------------------------------------------ */

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (character) => {
      switch (character) {
        case "&": return "&amp;";
        case "<": return "&lt;";
        case ">": return "&gt;";
        case '"': return "&quot;";
        case "'": return "&#39;";
        default: return character;
      }
    });
  }

  function icon(name, extraClass = "") {
    const paths = ICONS[name] || ICONS.grid;
    const className = extraClass ? `icon ${extraClass}` : "icon";
    return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths}</svg>`;
  }

  function formatMoney(value) {
    const amount = Number(value);
    return `${currencySymbol} ${moneyFormatter.format(Number.isFinite(amount) ? amount : 0)}`;
  }

  function pluralise(count, singular, plural) {
    return `${count} ${count === 1 ? singular : plural || `${singular}s`}`;
  }

  function todayKey() {
    return Tenant.dateKey(new Date());
  }

  function parseDateKey(value) {
    if (!Tenant.isDateKey(value)) return null;
    const parts = String(value).split("-");
    const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = parseDateKey(value) || new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
  }

  function formatMonth(monthKey) {
    const match = /^(\d{4})-(\d{2})$/.exec(String(monthKey || ""));
    if (!match) return "—";
    return monthFormatter.format(new Date(Number(match[1]), Number(match[2]) - 1, 1));
  }

  function daysUntil(value) {
    const target = parseDateKey(value);
    if (!target) return null;
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return Math.round((target.getTime() - start.getTime()) / 86400000);
  }

  function dueNote(value) {
    const days = daysUntil(value);
    if (days === null) return "No due date";
    if (days === 0) return "Due today";
    if (days > 0) return `In ${pluralise(days, "day")}`;
    return `${pluralise(Math.abs(days), "day")} overdue`;
  }

  function initialsFor(value) {
    const parts = String(value || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    const first = Array.from(parts[0])[0] || "";
    const second = parts.length > 1 ? Array.from(parts[parts.length - 1])[0] || "" : "";
    return `${first}${second}`.toUpperCase() || "?";
  }

  function currentMonthKey() {
    return todayKey().slice(0, 7);
  }

  function monthOf(value) {
    const match = /^(\d{4}-\d{2})/.exec(String(value || ""));
    return match ? match[1] : "";
  }

  function showToast(message, tone = "success") {
    const stack = document.getElementById("admin-toast");
    if (!stack) return;

    const toast = document.createElement("div");
    toast.className = `toast toast--${tone}`;
    toast.innerHTML =
      `${icon(tone === "success" ? "check" : "alert")}<span>${escapeHtml(message)}</span>`;
    stack.appendChild(toast);

    window.requestAnimationFrame(() => toast.classList.add("is-visible"));
    window.setTimeout(() => {
      toast.classList.remove("is-visible");
      window.setTimeout(() => toast.remove(), 260);
    }, 3600);
  }

  function pageHeaderHtml(options) {
    return (
      `<div class="page-head">` +
      `<div class="page-head-copy">` +
      `<h1 class="page-title">${escapeHtml(options.title)}</h1>` +
      `<p class="page-sub">${escapeHtml(options.subtitle || "")}</p>` +
      `</div>` +
      (options.actions ? `<div class="page-actions">${options.actions}</div>` : "") +
      `</div>`
    );
  }

  function emptyStateHtml(options) {
    return (
      `<div class="empty-state${options.compact ? " empty-state--compact" : ""}">` +
      `<span class="empty-icon">${icon(options.icon || "store")}</span>` +
      `<h3>${escapeHtml(options.title)}</h3>` +
      `<p>${escapeHtml(options.message || "")}</p>` +
      (options.action || "") +
      `</div>`
    );
  }

  function statCardHtml(options) {
    return (
      `<article class="stat-card stat-card--${options.tone}">` +
      `<div class="stat-top"><span class="stat-label">${escapeHtml(options.label)}</span>` +
      `<span class="stat-icon">${icon(options.icon)}</span></div>` +
      `<p class="stat-value">${escapeHtml(options.value)}</p>` +
      `<p class="stat-note">${escapeHtml(options.note)}</p>` +
      `</article>`
    );
  }

  function statusBadge(status) {
    const safe = ["Active", "Expired", "Disabled"].includes(status) ? status : "Active";
    const tone = safe.toLowerCase();
    return (
      `<span class="sa-status sa-status--${tone}"><span class="sa-status-dot" aria-hidden="true"></span>` +
      `${escapeHtml(safe)}</span>`
    );
  }

  function paymentBadge(status) {
    const tone = status === "Paid" ? "paid" : status === "Overdue" ? "overdue" : "unpaid";
    return `<span class="sa-pay sa-pay--${tone}">${escapeHtml(status)}</span>`;
  }

  function paymentState(restaurant) {
    const due = String(restaurant.dueDate || "");
    if (restaurant.paymentStatus === "Paid" && (!due || due >= todayKey())) return "Paid";
    if (due && due < todayKey()) return "Overdue";
    return "Unpaid";
  }

  function logoMarkHtml(restaurant, size = "sm") {
    const logo = restaurant && restaurant.logo ? String(restaurant.logo) : "";
    const inner = logo
      ? `<img src="${escapeHtml(logo)}" alt="">`
      : `<span class="sa-mark-initials">${escapeHtml(initialsFor(restaurant && restaurant.name))}</span>`;
    return `<span class="brand-mark brand-mark--${size} sa-entity-mark">${inner}</span>`;
  }

  function isDemoRestaurant(restaurantId) {
    return String(restaurantId || "").trim() === DEMO_ID;
  }

  function demoBadgeHtml() {
    return `<span class="sa-sample-badge">SAMPLE</span>`;
  }

  function restaurantNameHtml(restaurant) {
    return (
      `<span class="sa-entity-name">${escapeHtml(restaurant.name)}` +
      (isDemoRestaurant(restaurant.id) ? demoBadgeHtml() : "") +
      `</span>`
    );
  }

  function customerMenuUrl(restaurantId) {
    if (isDemoRestaurant(restaurantId)) {
      const demoUrl = new URL(DEMO_PATH, window.location.href);
      const queryParam = (appConfig.table && appConfig.table.queryParam) || "table";
      demoUrl.searchParams.set(queryParam, String(DEMO_TABLE));
      return demoUrl.href;
    }

    const url = new URL("../index.html", window.location.href);
    const queryParam = (appConfig.table && appConfig.table.queryParam) || "table";
    const defaultTable = Number(appConfig.table && appConfig.table.defaultNumber) || 1;
    url.searchParams.set("restaurant", restaurantId);
    url.searchParams.set(queryParam, String(defaultTable));
    return url.href;
  }

  /* ------------------------------------------------------------------------
     Storage: session, plans, payments and restaurants
     ------------------------------------------------------------------------ */

  function getSession() {
    try {
      const raw = window.sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.role !== "Super Admin" || !parsed.username) return null;

      const expected = String((SA.credentials && SA.credentials.username) || "");
      if (expected && parsed.username !== expected) return null;

      return { username: parsed.username, name: "Super Admin", role: "Super Admin" };
    } catch {
      return null;
    }
  }

  function setSession(username) {
    try {
      if (!username) {
        window.sessionStorage.removeItem(SESSION_KEY);
        return;
      }
      window.sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          username,
          role: "Super Admin",
          signedInAt: new Date().toISOString(),
        })
      );
    } catch {
      // If sessionStorage is blocked, the next page will return to sign-in.
    }
  }

  function signOut() {
    setSession(null);
    window.location.replace("login.html");
  }

  function normalizePlan(raw) {
    if (!raw || typeof raw !== "object") return null;

    const name = String(raw.name || "").trim();
    const price = Number(raw.price);
    const id = Tenant.slugify(raw.id || name);

    if (!name || !id || !Number.isFinite(price) || price < 0) return null;

    return {
      id,
      name,
      price: Math.round(price),
      period: "month",
      features: Array.isArray(raw.features)
        ? raw.features.map((feature) => String(feature || "").trim()).filter(Boolean)
        : [],
    };
  }

  function getPlans() {
    const stored = Tenant.readJson(PLANS_KEY);

    if (Array.isArray(stored)) {
      if (!stored.length) return [];
      const normalized = stored.map(normalizePlan).filter(Boolean);
      if (normalized.length) return normalized;
    }

    const seed = (Array.isArray(SA.plans) ? SA.plans : []).map(normalizePlan).filter(Boolean);
    try {
      Tenant.writeJson(PLANS_KEY, seed);
    } catch {
      // The in-memory list still renders; edits will surface a storage error.
    }
    return seed;
  }

  function savePlans(plans) {
    const normalized = (Array.isArray(plans) ? plans : []).map(normalizePlan).filter(Boolean);
    Tenant.writeJson(PLANS_KEY, normalized);
    return normalized;
  }

  function planFor(planId) {
    return getPlans().find((plan) => plan.id === planId) || null;
  }

  function monthlyFeeFor(restaurant) {
    const plan = planFor(restaurant.planId);
    return plan ? plan.price : 0;
  }

  function normalizePayment(raw) {
    if (!raw || typeof raw !== "object") return null;

    const restaurantId = String(raw.restaurantId || "").trim();
    const paymentDate = String(raw.paymentDate || "");
    const amount = Number(raw.amount);

    if (!restaurantId || !Tenant.isDateKey(paymentDate) || !Number.isFinite(amount) || amount < 0) {
      return null;
    }

    return {
      id: String(raw.id || `${restaurantId}-${paymentDate}-${raw.recordedAt || ""}`),
      restaurantId,
      restaurantName: String(raw.restaurantName || "").trim(),
      planName: String(raw.planName || "").trim(),
      amount: Math.round(amount),
      method: String(raw.method || "").trim(),
      paymentDate,
      reference: String(raw.reference || "").trim(),
      recordedAt: String(raw.recordedAt || new Date().toISOString()),
    };
  }

  function getPayments() {
    const stored = Tenant.readJson(PAYMENTS_KEY);
    if (!Array.isArray(stored)) return [];

    return stored
      .map(normalizePayment)
      .filter(Boolean)
      .sort((a, b) => String(b.recordedAt).localeCompare(String(a.recordedAt)));
  }

  function savePayments(payments) {
    Tenant.writeJson(PAYMENTS_KEY, payments);
  }

  function getRestaurants() {
    return Tenant.getRestaurants();
  }

  function recentRestaurants(limit = 10) {
    return getRestaurants()
      .slice()
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
      .slice(0, limit);
  }

  function onboardingFor(restaurantId) {
    const stored = Tenant.readJson(ONBOARDING_KEY);
    const all = stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
    const saved = all[restaurantId];
    const checklist = {};

    ONBOARDING_ITEMS.forEach((item) => {
      checklist[item.id] = Boolean(saved && saved[item.id]);
    });

    return checklist;
  }

  function onboardingProgress(restaurantId) {
    const checklist = onboardingFor(restaurantId);
    const done = ONBOARDING_ITEMS.filter((item) => checklist[item.id]).length;
    return { done, total: ONBOARDING_ITEMS.length };
  }

  function saveOnboarding(restaurantId, checklist) {
    const stored = Tenant.readJson(ONBOARDING_KEY);
    const all = stored && typeof stored === "object" && !Array.isArray(stored) ? { ...stored } : {};
    const next = {};

    ONBOARDING_ITEMS.forEach((item) => {
      next[item.id] = Boolean(checklist[item.id]);
    });

    all[restaurantId] = next;
    Tenant.writeJson(ONBOARDING_KEY, all);
    return next;
  }

  function removeOnboarding(restaurantId) {
    const stored = Tenant.readJson(ONBOARDING_KEY);
    if (!stored || typeof stored !== "object" || Array.isArray(stored)) return;
    if (!(restaurantId in stored)) return;

    const next = { ...stored };
    delete next[restaurantId];
    Tenant.writeJson(ONBOARDING_KEY, next);
  }

  function onboardingBadgeHtml(restaurantId) {
    const progress = onboardingProgress(restaurantId);
    const complete = progress.done === progress.total;
    return (
      `<span class="sa-onboarding-pill${complete ? " is-complete" : ""}" title="Launch checklist">` +
      `${icon(complete ? "check" : "list")}${progress.done}/${progress.total}</span>`
    );
  }

  function ownerStaffFor(restaurantId) {
    return (
      Tenant.readRestaurantStaff(restaurantId).find((member) => member.role === "Owner") || null
    );
  }

  function usernameTaken(username, excludeRestaurantId = "") {
    const wanted = String(username || "").toLowerCase();
    if (!wanted) return false;
    if (RESERVED_USERNAMES.has(wanted)) return true;

    return getRestaurants().some((restaurant) => {
      if (restaurant.id === excludeRestaurantId) return false;
      if (String(restaurant.adminUsername || "").toLowerCase() === wanted) return true;

      return Tenant.readRestaurantStaff(restaurant.id).some(
        (member) => String(member.username || "").toLowerCase() === wanted
      );
    });
  }

  function restaurantIdExists(id) {
    if (getRestaurants().some((restaurant) => restaurant.id === id)) return true;
    const keys = Tenant.storageKeys(id);
    return Object.values(keys).some((key) => {
      try {
        return window.localStorage.getItem(key) != null;
      } catch {
        return false;
      }
    });
  }

  function createRestaurantId(name) {
    const base = Tenant.slugify(name) || "restaurant";
    let candidate = base;
    let counter = 2;

    while (restaurantIdExists(candidate)) {
      candidate = `${base}-${counter}`;
      counter += 1;
    }
    return candidate;
  }

  function seedRestaurantData(fields) {
    const keys = Tenant.storageKeys(fields.id);

    Tenant.writeJson(keys.menu, []);
    Tenant.writeJson(keys.tables, []);
    Tenant.writeJson(keys.offers, []);
    Tenant.writeJson(keys.deals, []);
    Tenant.writeJson(keys.cart, { items: {}, deals: {} });
    Tenant.writeJson(keys.staff, [
      {
        id: "staff-owner",
        name: fields.ownerName,
        role: "Owner",
        username: fields.username,
        password: fields.password,
        active: true,
      },
    ]);
    Tenant.writeJson(keys.settings, {
      restaurantName: fields.name,
      logo: fields.logo || "",
      whatsappNumber: fields.whatsapp,
      openingTiming: "",
      paymentNote: String(
        (appConfig.payment && appConfig.payment.note) || "Pay cash at table"
      ),
    });
  }

  function syncRestaurantBrand(restaurantId, restaurant) {
    try {
      Tenant.saveRestaurantSettings(restaurantId, {
        restaurantName: restaurant.name,
        logo: restaurant.logo,
        whatsappNumber: restaurant.whatsapp,
      });
    } catch {
      // The registry is saved; settings can be updated again from the restaurant admin.
    }

    try {
      const keys = Tenant.storageKeys(restaurantId);
      const staff = Tenant.readRestaurantStaff(restaurantId);
      const index = staff.findIndex((member) => member.role === "Owner");

      if (index >= 0) {
        const owner = ownerStaffFor(restaurantId);
        if (owner && owner.name !== restaurant.ownerName) {
          staff[index] = { ...staff[index], name: restaurant.ownerName };
          Tenant.writeJson(keys.staff, staff);
        }
      }
    } catch {
      // Staff can still be edited from the restaurant admin.
    }
  }

  /* ------------------------------------------------------------------------
     Modals
     ------------------------------------------------------------------------ */

  function openModal(options) {
    const root = document.getElementById("admin-modal-root");
    if (!root) return;

    if (state.modalOpen) closeModal({ immediate: true });

    const sizeClass =
      options.size === "sm" ? " modal--sm" : options.size === "lg" ? " modal--lg" : "";

    root.innerHTML =
      `<div class="modal-overlay">` +
      `<button class="modal-backdrop" type="button" aria-label="Close dialog" tabindex="-1" data-modal-close></button>` +
      `<section class="modal${sizeClass}" role="dialog" aria-modal="true" aria-labelledby="sa-modal-title">` +
      `<header class="modal-head">` +
      `<div>` +
      (options.kicker ? `<p class="modal-kicker">${escapeHtml(options.kicker)}</p>` : "") +
      `<h2 class="modal-title" id="sa-modal-title">${escapeHtml(options.title || "")}</h2>` +
      (options.subtitle ? `<p class="modal-sub">${escapeHtml(options.subtitle)}</p>` : "") +
      `</div>` +
      `<button class="icon-button" type="button" aria-label="Close dialog" data-modal-close>${icon("close")}</button>` +
      `</header>` +
      `<div class="modal-body">${options.body || ""}</div>` +
      (options.footer ? `<footer class="modal-foot">${options.footer}</footer>` : "") +
      `</section>` +
      `</div>`;

    const overlay = root.querySelector(".modal-overlay");
    state.modalTrigger = document.activeElement;
    state.modalOpen = true;
    document.body.classList.add("modal-open");
    window.requestAnimationFrame(() => overlay.classList.add("is-open"));

    const focusTarget =
      overlay.querySelector("[data-autofocus]") ||
      overlay.querySelector(".modal-body input, .modal-body select, .modal-body textarea") ||
      overlay.querySelector(".modal .icon-button");
    if (focusTarget) {
      window.setTimeout(() => focusTarget.focus({ preventScroll: true }), 40);
    }

    if (typeof options.onMount === "function") options.onMount(overlay);
  }

  function closeModal(options = {}) {
    const overlay = document.querySelector("#admin-modal-root .modal-overlay");
    if (!overlay) {
      state.modalOpen = false;
      return;
    }

    const finish = () => {
      overlay.remove();
      state.modalOpen = false;
      document.body.classList.remove("modal-open");
      const trigger = state.modalTrigger;
      state.modalTrigger = null;
      if (trigger && trigger.isConnected && typeof trigger.focus === "function") {
        trigger.focus({ preventScroll: true });
      }
    };

    if (options.immediate) {
      finish();
      return;
    }

    overlay.classList.remove("is-open");
    window.setTimeout(finish, 180);
  }

  function showFormError(form, message) {
    const box = form.querySelector("[data-form-error]");
    if (!box) return;
    box.textContent = message;
    box.hidden = false;
  }

  function clearFormError(form) {
    const box = form.querySelector("[data-form-error]");
    if (!box) return;
    box.textContent = "";
    box.hidden = true;
  }

  /* ------------------------------------------------------------------------
     Shell
     ------------------------------------------------------------------------ */

  const NAV_ITEMS = [
    { id: "dashboard", label: "Overview", href: "index.html", icon: "grid" },
    { id: "restaurants", label: "Restaurants", href: "restaurants.html", icon: "store" },
    { id: "plans", label: "Plans", href: "plans.html", icon: "layers" },
    { id: "payments", label: "Payments", href: "payments.html", icon: "card" },
  ];

  const PAGE_META = {
    dashboard: { title: "Overview", subtitle: "A live summary of the platform." },
    restaurants: { title: "Restaurants", subtitle: "Create outlets, plans and admin access." },
    plans: { title: "Plans", subtitle: "Monthly packages and what they include." },
    payments: { title: "Payments", subtitle: "Fees, dues and monthly earnings." },
  };

  function navLinkHtml(item) {
    const active = item.id === page;
    const overdue =
      item.id === "payments"
        ? getRestaurants().filter(
            (restaurant) => restaurant.paymentStatus !== "Paid" && restaurant.dueDate < todayKey()
          ).length
        : 0;

    return (
      `<a class="nav-link${active ? " is-active" : ""}" href="${item.href}"` +
      `${active ? ' aria-current="page"' : ""}>` +
      `<span class="nav-icon">${icon(item.icon)}</span>` +
      `<span class="nav-label">${escapeHtml(item.label)}</span>` +
      (overdue ? `<span class="nav-badge">${overdue > 99 ? "99+" : overdue}</span>` : "") +
      `</a>`
    );
  }

  function renderShell() {
    const root = document.getElementById("admin-root");
    if (!root) return;

    root.innerHTML =
      `<div class="admin-shell">` +
      `<button class="sidebar-scrim" type="button" aria-label="Close navigation" tabindex="-1" data-shell-action="close-sidebar"></button>` +
      `<aside class="sidebar" id="admin-sidebar" aria-label="Super Admin navigation">` +
      `<div class="sidebar-brand">` +
      `<span class="brand-mark brand-mark--lg sa-brand-mark">${icon("shield")}</span>` +
      `<div class="sidebar-brand-copy">` +
      `<strong>${escapeHtml(platformName)}</strong>` +
      `<span>Super Admin</span>` +
      `</div>` +
      `</div>` +
      `<div class="nav-scroll"><nav class="admin-nav" aria-label="Console sections">` +
      NAV_ITEMS.map(navLinkHtml).join("") +
      `</nav></div>` +
      `<div class="sidebar-foot">` +
      `<div class="sa-sidebar-user">` +
      `<span class="avatar" aria-hidden="true">SA</span>` +
      `<span class="sa-sidebar-copy"><strong>Super Admin</strong><span>Full platform access</span></span>` +
      `</div>` +
      `<button class="sa-sidebar-logout" type="button" data-shell-action="logout">` +
      `${icon("logout")}Log out` +
      `</button>` +
      `<p class="sidebar-note">Data is stored in this browser only.</p>` +
      `</div>` +
      `</aside>` +
      `<div class="main-column">` +
      `<header class="topbar">` +
      `<button class="icon-button sidebar-toggle" type="button" aria-label="Open navigation" aria-controls="admin-sidebar" aria-expanded="false" data-shell-action="toggle-sidebar">${icon("menu")}</button>` +
      `<div class="topbar-brand">` +
      `<span class="brand-mark brand-mark--sm sa-brand-mark">${icon("shield")}</span>` +
      `<div class="topbar-brand-copy">` +
      `<strong>${escapeHtml(platformName)}</strong>` +
      `<span>Super Admin Console</span>` +
      `</div>` +
      `</div>` +
      `<div class="sa-topbar-spacer"></div>` +
      `<div class="topbar-actions">` +
      `<span class="sa-session-chip">${icon("shield")}Super Admin</span>` +
      `<button class="btn btn-secondary btn-sm" type="button" data-shell-action="logout">${icon("logout")}Log out</button>` +
      `</div>` +
      `</header>` +
      `<main class="admin-main" id="admin-view" tabindex="-1">` +
      `<div class="page-loader"><span class="spinner" aria-hidden="true"></span><span>Loading console…</span></div>` +
      `</main>` +
      `</div>` +
      `</div>`;

    updateActiveNav();
  }

  function updateActiveNav() {
    document.querySelectorAll("[data-nav-id]").forEach((link) => {
      const active = link.dataset.navId === state.page;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  function openSidebar() {
    state.sidebarOpen = true;
    document.body.classList.add("sidebar-open");
    const toggle = document.querySelector('[data-shell-action="toggle-sidebar"]');
    if (toggle) toggle.setAttribute("aria-expanded", "true");
    const firstLink = document.querySelector("#admin-sidebar .nav-link");
    if (firstLink) firstLink.focus({ preventScroll: true });
  }

  function closeSidebar(options = {}) {
    if (!state.sidebarOpen) return;
    state.sidebarOpen = false;
    document.body.classList.remove("sidebar-open");
    const toggle = document.querySelector('[data-shell-action="toggle-sidebar"]');
    if (toggle) toggle.setAttribute("aria-expanded", "false");
    if (options.restoreFocus && toggle) toggle.focus({ preventScroll: true });
  }

  /* ------------------------------------------------------------------------
     Dashboard
     ------------------------------------------------------------------------ */

  function renderDashboardPage(view) {
    const restaurants = getRestaurants();
    const active = restaurants.filter((restaurant) => restaurant.status === "Active");
    const expired = restaurants.filter((restaurant) => restaurant.status === "Expired");
    const disabled = restaurants.filter((restaurant) => restaurant.status === "Disabled");
    const demoCount = restaurants.filter((restaurant) => isDemoRestaurant(restaurant.id)).length;
    const billable = restaurants.filter((restaurant) => !isDemoRestaurant(restaurant.id));
    const billableActive = billable.filter((restaurant) => restaurant.status === "Active");
    const payments = getPayments();
    const month = currentMonthKey();

    const monthlyEarnings = billableActive.reduce((sum, restaurant) => sum + monthlyFeeFor(restaurant), 0);
    const collected = payments
      .filter((payment) => monthOf(payment.paymentDate) === month)
      .reduce((sum, payment) => sum + payment.amount, 0);
    const unpaid = billable.filter((restaurant) => restaurant.paymentStatus !== "Paid");
    const pending = unpaid.reduce((sum, restaurant) => sum + monthlyFeeFor(restaurant), 0);

    const recent = recentRestaurants(10);
    const recentPayments = payments.slice(0, 10);

    const stats =
      `<div class="stats-grid sa-stats">` +
      statCardHtml({
        label: "Total restaurants",
        value: String(restaurants.length),
        note: restaurants.length
          ? `${active.length} active now${demoCount ? " · sample demo included" : ""}`
          : "No restaurants yet",
        icon: "store",
        tone: "green",
      }) +
      statCardHtml({
        label: "Active restaurants",
        value: String(active.length),
        note: active.length ? "Menus open for orders" : "No menu is open",
        icon: "check",
        tone: "green",
      }) +
      statCardHtml({
        label: "Expired / disabled",
        value: String(expired.length + disabled.length),
        note: `${expired.length} expired · ${disabled.length} disabled`,
        icon: "ban",
        tone: "orange",
      }) +
      statCardHtml({
        label: "Monthly earnings",
        value: formatMoney(monthlyEarnings),
        note: "Recurring fees from active restaurants",
        icon: "chart",
        tone: "sand",
      }) +
      statCardHtml({
        label: "Collected this month",
        value: formatMoney(collected),
        note: `Payments received in ${formatMonth(month)}`,
        icon: "cash",
        tone: "cream",
      }) +
      statCardHtml({
        label: "Pending dues",
        value: formatMoney(pending),
        note: unpaid.length
          ? `${pluralise(unpaid.length, "restaurant")} unpaid`
          : "Every restaurant is paid",
        icon: "clock",
        tone: "orange",
      }) +
      `</div>`;

    const restaurantRows = recent
      .map(
        (restaurant) =>
          `<tr>` +
          `<td><div class="sa-entity">${logoMarkHtml(restaurant)}` +
          `<div class="sa-entity-copy"><strong>${escapeHtml(restaurant.name)}</strong>` +
          `<span>${escapeHtml(restaurant.ownerName || "Owner not set")}</span></div></div></td>` +
          `<td>${restaurant.planId ? escapeHtml((planFor(restaurant.planId) || {}).name || "Unknown plan") : "No plan"}</td>` +
          `<td>${statusBadge(restaurant.status)}</td>` +
          `<td>${escapeHtml(formatDate(restaurant.dueDate))}</td>` +
          `<td class="cell-amount">${escapeHtml(formatMoney(monthlyFeeFor(restaurant)))}</td>` +
          `</tr>`
      )
      .join("");

    const paymentRows = recentPayments
      .map(
        (payment) =>
          `<tr>` +
          `<td><span class="cell-strong">${escapeHtml(formatDate(payment.paymentDate))}</span>` +
          `<span class="cell-sub">${escapeHtml(payment.method || "Payment")}</span></td>` +
          `<td><span class="cell-strong">${escapeHtml(payment.restaurantName || "Deleted restaurant")}</span>` +
          `<span class="cell-sub">${escapeHtml(payment.planName || "")}</span></td>` +
          `<td class="cell-amount">${escapeHtml(formatMoney(payment.amount))}</td>` +
          `</tr>`
      )
      .join("");

    view.innerHTML =
      pageHeaderHtml({
        title: "Overview",
        subtitle: "Restaurants, monthly fees and collections at a glance.",
        actions:
          `<a class="btn btn-secondary" href="payments.html">${icon("card")}Payments</a>` +
          `<a class="btn btn-primary" href="restaurants.html?add=1">${icon("plus")}Add restaurant</a>`,
      }) +
      stats +
      `<div class="sa-grid-2">` +
      `<section class="panel">` +
      `<div class="panel-head"><div><h2 class="panel-title">Recent restaurants</h2>` +
      `<p class="panel-sub">Latest 10 outlets in the registry.</p></div>` +
      `<a class="panel-link" href="restaurants.html">Manage ${icon("arrow-right")}</a></div>` +
      (recent.length
        ? `<div class="data-table-wrap"><table class="data-table sa-table sa-table--recent sa-table--recent-restaurants">` +
          `<thead><tr><th>Restaurant</th><th>Plan</th><th>Status</th><th>Due date</th><th class="num">Monthly fee</th></tr></thead>` +
          `<tbody>${restaurantRows}</tbody></table></div>`
        : emptyStateHtml({
            compact: true,
            title: "No restaurants yet",
            message: "Add the first restaurant to start tracking plans and fees.",
            action: `<a class="btn btn-primary" href="restaurants.html?add=1">${icon("plus")}Add restaurant</a>`,
          })) +
      `</section>` +
      `<section class="panel">` +
      `<div class="panel-head"><div><h2 class="panel-title">Recent payments</h2>` +
      `<p class="panel-sub">Latest 10 recorded payments.</p></div>` +
      `<a class="panel-link" href="payments.html">Open ledger ${icon("arrow-right")}</a></div>` +
      (recentPayments.length
        ? `<div class="data-table-wrap"><table class="data-table sa-table sa-table--recent">` +
          `<thead><tr><th>Payment</th><th>Restaurant</th><th class="num">Amount</th></tr></thead>` +
          `<tbody>${paymentRows}</tbody></table></div>`
        : emptyStateHtml({
            compact: true,
            icon: "cash",
            title: "No payments yet",
            message: "Payments recorded on the billing page will appear here.",
          })) +
      `</section>` +
      `</div>`;
  }

  /* ------------------------------------------------------------------------
     Restaurants
     ------------------------------------------------------------------------ */

  function restaurantRowHtml(restaurant) {
    const plan = planFor(restaurant.planId);
    const payState = paymentState(restaurant);
    const disabled = restaurant.status === "Disabled";
    const demo = isDemoRestaurant(restaurant.id);

    return (
      `<tr${demo ? ' class="sa-demo-row"' : ""}>` +
      `<td><div class="sa-entity">${logoMarkHtml(restaurant)}` +
      `<div class="sa-entity-copy"><strong class="sa-entity-name-row">${restaurantNameHtml(restaurant)}</strong>` +
      `<span class="sa-id">ID: ${escapeHtml(restaurant.id)}</span></div></div></td>` +
      `<td data-label="Owner">${escapeHtml(restaurant.ownerName || "—")}</td>` +
      `<td data-label="City">${escapeHtml(restaurant.city || "—")}</td>` +
      `<td data-label="WhatsApp">${escapeHtml(restaurant.whatsapp || "—")}</td>` +
      `<td data-label="Plan"><span class="sa-plan-pill">${escapeHtml(plan ? plan.name : "No plan")}</span></td>` +
      `<td data-label="Status">${statusBadge(restaurant.status)}</td>` +
      `<td data-label="Due date"><span class="cell-strong">${escapeHtml(formatDate(restaurant.dueDate))}</span>` +
      `<span class="cell-sub${payState === "Overdue" ? " is-overdue" : ""}">${escapeHtml(dueNote(restaurant.dueDate))}</span></td>` +
      `<td data-label="Launch checklist">${onboardingBadgeHtml(restaurant.id)}</td>` +
      `<td class="cell-amount" data-label="Monthly fee">${escapeHtml(formatMoney(plan ? plan.price : 0))}</td>` +
      `<td class="cell-actions"><div class="sa-row-actions">` +
      `<a class="icon-button" href="${escapeHtml(customerMenuUrl(restaurant.id))}" target="_blank" rel="noopener" aria-label="Open ${escapeHtml(restaurant.name)} menu" title="Open customer menu">${icon("external")}</a>` +
      `<button class="icon-button" type="button" data-action="onboarding" data-id="${escapeHtml(restaurant.id)}" aria-label="Launch checklist for ${escapeHtml(restaurant.name)}" title="Launch checklist">${icon("list")}</button>` +
      `<button class="icon-button" type="button" data-action="edit-restaurant" data-id="${escapeHtml(restaurant.id)}" aria-label="Edit ${escapeHtml(restaurant.name)}" title="Edit restaurant">${icon("edit")}</button>` +
      (demo
        ? ""
        : `<button class="icon-button" type="button" data-action="toggle-restaurant" data-id="${escapeHtml(restaurant.id)}" aria-label="${disabled ? "Enable" : "Disable"} ${escapeHtml(restaurant.name)}" title="${disabled ? "Enable restaurant" : "Disable restaurant"}">${icon(disabled ? "play" : "pause")}</button>` +
          `<button class="icon-button icon-button--danger" type="button" data-action="delete-restaurant" data-id="${escapeHtml(restaurant.id)}" aria-label="Delete ${escapeHtml(restaurant.name)}" title="Delete restaurant">${icon("trash")}</button>`) +
      `</div></td>` +
      `</tr>`
    );
  }

  function demoPanelHtml() {
    const demo = Tenant.getRestaurant(DEMO_ID);
    if (!demo) return "";

    return (
      `<section class="sa-demo-panel">` +
      `<div class="sa-demo-copy">` +
      `<div class="sa-demo-title"><span class="sa-sample-badge">SAMPLE</span>` +
      `<h2>Demo restaurant</h2></div>` +
      `<p>The Karahi House demo opens from the sales landing page. Resetting it clears only demo orders and feedback, then restores the 10 sample dishes and 12 tables.</p>` +
      `<span class="sa-demo-link">${icon("external")}demo/karahi-house/?table=${DEMO_TABLE}</span>` +
      `</div>` +
      `<div class="sa-demo-actions">` +
      `<a class="btn btn-secondary" href="${escapeHtml(customerMenuUrl(DEMO_ID))}" target="_blank" rel="noopener">${icon("external")}Open demo menu</a>` +
      `<button class="btn btn-primary" type="button" data-action="reset-demo">${icon("refresh")}Reset Demo Data</button>` +
      `</div>` +
      `</section>`
    );
  }

  function renderRestaurantsPage(view) {
    const restaurants = recentRestaurants(500);

    view.innerHTML =
      pageHeaderHtml({
        title: "Restaurants",
        subtitle: "Each restaurant has its own ID, menu, orders, tables and admin login.",
        actions:
          `<a class="btn btn-secondary" href="plans.html">${icon("layers")}Plans</a>` +
          `<button class="btn btn-primary" type="button" data-action="add-restaurant">${icon("plus")}Add restaurant</button>`,
      }) +
      demoPanelHtml() +
      `<section class="panel">` +
      `<div class="panel-head"><div><h2 class="panel-title">All restaurants</h2>` +
      `<p class="panel-sub">${restaurants.length ? pluralise(restaurants.length, "restaurant") + " in the registry." : "No restaurants yet."}</p></div>` +
      `<span class="sa-panel-chip">${icon("store")}${restaurants.length}</span>` +
      `</div>` +
      (restaurants.length
        ? `<div class="data-table-wrap"><table class="data-table sa-table sa-table--restaurants">` +
          `<thead><tr><th>Restaurant</th><th>Owner</th><th>City</th><th>WhatsApp</th><th>Plan</th>` +
          `<th>Status</th><th>Due date</th><th>Launch checklist</th><th class="num">Monthly fee</th><th class="th-actions"><span class="sr-only">Actions</span></th></tr></thead>` +
          `<tbody>${restaurants.map(restaurantRowHtml).join("")}</tbody>` +
          `</table></div>`
        : emptyStateHtml({
            title: "No restaurants yet",
            message: "Add a restaurant to create its menu, tables and Restaurant Admin login.",
            action: `<button class="btn btn-primary" type="button" data-action="add-restaurant">${icon("plus")}Add restaurant</button>`,
          })) +
      `</section>`;

    if (new URLSearchParams(window.location.search).get("add") === "1") {
      const url = new URL(window.location.href);
      url.searchParams.delete("add");
      window.history.replaceState({}, "", url.href);
      window.setTimeout(openAddRestaurantModal, 120);
    }
  }

  function logoFieldHtml(logo, name) {
    return (
      `<div class="sa-logo-field">` +
      `<span class="brand-mark sa-logo-preview" data-logo-preview>${logoPreviewContent(logo, name)}</span>` +
      `<div class="sa-logo-copy">` +
      `<div class="sa-logo-actions">` +
      `<label class="btn btn-secondary btn-sm" for="restaurant-logo">${icon("image")}Upload logo</label>` +
      `<input id="restaurant-logo" class="sr-only" type="file" accept="image/png,image/jpeg,image/webp" data-logo-input>` +
      `<button class="btn btn-ghost btn-sm" type="button" data-action="remove-logo">Remove</button>` +
      `</div>` +
      `<p class="field-hint">PNG or JPG. Resized to 256 px automatically.</p>` +
      `</div>` +
      `</div>`
    );
  }

  function logoPreviewContent(logo, name) {
    return logo
      ? `<img src="${escapeHtml(logo)}" alt="">`
      : `<span class="sa-mark-initials">${escapeHtml(initialsFor(name || "Restaurant"))}</span>`;
  }

  function planOptionsHtml(selectedId) {
    const plans = getPlans();
    if (!plans.length) {
      return `<option value="">Create a plan first</option>`;
    }
    return plans
      .map(
        (plan) =>
          `<option value="${escapeHtml(plan.id)}"${plan.id === selectedId ? " selected" : ""}>` +
          `${escapeHtml(plan.name)} — ${escapeHtml(formatMoney(plan.price))}/month</option>`
      )
      .join("");
  }

  function openAddRestaurantModal() {
    const plans = getPlans();
    state.logoDraft = undefined;

    if (!plans.length) {
      openModal({
        title: "Add a plan first",
        subtitle: "Every restaurant needs a monthly plan.",
        size: "sm",
        body:
          `<p class="sa-modal-text">There are no plans in the console yet. Create a plan, then add the restaurant.</p>`,
        footer:
          `<button class="btn btn-secondary" type="button" data-modal-close>Cancel</button>` +
          `<a class="btn btn-primary" href="plans.html">${icon("layers")}Go to plans</a>`,
      });
      return;
    }

    const today = todayKey();

    openModal({
      kicker: "New restaurant",
      title: "Add restaurant",
      subtitle: "This creates the restaurant, its admin login and its own data space.",
      size: "lg",
      body:
        `<form id="restaurant-form" class="sa-form" novalidate>` +
        `<div class="form-error" data-form-error role="alert" hidden></div>` +
        `<section class="sa-form-section">` +
        `<h3 class="sa-form-heading">Restaurant details</h3>` +
        `<div class="form-grid form-grid--2">` +
        `<div class="field"><label for="r-name">Restaurant name</label>` +
        `<input id="r-name" name="name" type="text" autocomplete="organization" required data-autofocus></div>` +
        `<div class="field"><label for="r-owner">Owner name</label>` +
        `<input id="r-owner" name="ownerName" type="text" autocomplete="name" required></div>` +
        `<div class="field"><label for="r-whatsapp">Owner mobile / WhatsApp</label>` +
        `<input id="r-whatsapp" name="whatsapp" type="tel" autocomplete="tel" placeholder="03XX XXXXXXX" required></div>` +
        `<div class="field"><label for="r-city">City</label>` +
        `<input id="r-city" name="city" type="text" autocomplete="address-level2" required></div>` +
        `<div class="field"><label for="r-plan">Plan</label>` +
        `<select id="r-plan" name="planId" required>${planOptionsHtml(plans[0].id)}</select></div>` +
        `<div class="field"><label for="r-start">Start date</label>` +
        `<input id="r-start" name="startDate" type="date" value="${today}" required>` +
        `<span class="field-hint">Due date is ${BILLING_DAYS} days after the start date.</span></div>` +
        `</div>` +
        logoFieldHtml("", "") +
        `</section>` +
        `<section class="sa-form-section">` +
        `<h3 class="sa-form-heading">Restaurant Admin login</h3>` +
        `<p class="sa-section-note">The owner uses this login at <code>admin/login.html</code>. Keep it separate from your Super Admin login.</p>` +
        `<div class="form-grid form-grid--2">` +
        `<div class="field"><label for="r-username">Admin username</label>` +
        `<input id="r-username" name="username" type="text" autocomplete="off" spellcheck="false" placeholder="e.g. karahi-house" required></div>` +
        `<div class="field"><label for="r-password">Admin password</label>` +
        `<input id="r-password" name="password" type="text" autocomplete="new-password" placeholder="At least 6 characters" required>` +
        `<span class="field-hint">Share this with the owner after saving.</span></div>` +
        `</div>` +
        `</section>` +
        `</form>`,
      footer:
        `<button class="btn btn-secondary" type="button" data-modal-close>Cancel</button>` +
        `<button class="btn btn-primary" type="submit" form="restaurant-form">${icon("check")}Create restaurant</button>`,
      onMount: (overlay) => {
        const form = overlay.querySelector("#restaurant-form");
        bindLogoField(overlay, form);

        form.addEventListener("submit", (event) => {
          event.preventDefault();
          clearFormError(form);

          const data = new FormData(form);
          const name = String(data.get("name") || "").trim();
          const ownerName = String(data.get("ownerName") || "").trim();
          const whatsapp = String(data.get("whatsapp") || "").trim();
          const city = String(data.get("city") || "").trim();
          const planId = String(data.get("planId") || "").trim();
          const startDate = String(data.get("startDate") || "").trim();
          const username = String(data.get("username") || "").trim();
          const password = String(data.get("password") || "");
          const digits = whatsapp.replace(/\D/g, "");

          if (!name) return fail(form, "Enter the restaurant name.", "name");
          if (!ownerName) return fail(form, "Enter the owner name.", "ownerName");
          if (digits.length < 7 || digits.length > 15) {
            return fail(form, "Enter a valid mobile / WhatsApp number.", "whatsapp");
          }
          if (!city) return fail(form, "Enter the city.", "city");
          if (!planFor(planId)) return fail(form, "Choose a plan for this restaurant.", "planId");
          if (!Tenant.isDateKey(startDate)) {
            return fail(form, "Choose a valid start date.", "startDate");
          }
          if (!/^[a-zA-Z0-9._-]{3,32}$/.test(username)) {
            return fail(
              form,
              "Username must be 3–32 characters using letters, numbers, dots, dashes or underscores.",
              "username"
            );
          }
          if (usernameTaken(username)) {
            return fail(form, "That admin username is already in use.", "username");
          }
          if (password.length < 6) {
            return fail(form, "Admin password must be at least 6 characters.", "password");
          }

          const id = createRestaurantId(name);
          const dueDate = Tenant.addDaysKey(startDate, BILLING_DAYS);
          const now = new Date().toISOString();
          const logo = state.logoDraft === undefined ? "" : state.logoDraft;

          const restaurant = {
            id,
            name,
            ownerName,
            city,
            whatsapp,
            logo,
            planId,
            status: dueDate < today ? "Expired" : "Active",
            startDate,
            dueDate,
            paymentStatus: "Unpaid",
            lastPaymentDate: "",
            adminUsername: username,
            adminPassword: password,
            createdAt: now,
            updatedAt: now,
            isDefault: false,
          };

          try {
            seedRestaurantData({ id, name, ownerName, whatsapp, logo, username, password });
            Tenant.saveRestaurants(getRestaurants().concat(restaurant));
          } catch (error) {
            showFormError(
              form,
              error && error.message
                ? error.message
                : "The restaurant could not be saved. Device storage may be full."
            );
            return;
          }

          closeModal();
          renderCurrentPage();
          showToast(
            dueDate < today
              ? `${name} was added, but its plan is already expired because the start date is over ${BILLING_DAYS} days ago.`
              : `${name} created. Share the admin login and menu link with the owner.`,
            dueDate < today ? "warning" : "success"
          );
        });
      },
    });
  }

  function openEditRestaurantModal(restaurantId) {
    const restaurant = Tenant.getRestaurant(restaurantId);
    if (!restaurant) {
      showToast("That restaurant could not be found.", "error");
      return;
    }

    const plans = getPlans();
    if (!plans.length) {
      showToast("Create a plan before editing restaurants.", "error");
      return;
    }

    state.logoDraft = undefined;

    openModal({
      kicker: "Edit restaurant",
      title: restaurant.name,
      subtitle: `Restaurant ID: ${restaurant.id}`,
      size: "lg",
      body:
        `<form id="restaurant-edit-form" class="sa-form" novalidate>` +
        `<div class="form-error" data-form-error role="alert" hidden></div>` +
        `<div class="form-grid form-grid--2">` +
        `<div class="field"><label for="re-name">Restaurant name</label>` +
        `<input id="re-name" name="name" type="text" value="${escapeHtml(restaurant.name)}" required data-autofocus></div>` +
        `<div class="field"><label for="re-owner">Owner name</label>` +
        `<input id="re-owner" name="ownerName" type="text" value="${escapeHtml(restaurant.ownerName)}" required></div>` +
        `<div class="field"><label for="re-whatsapp">Owner mobile / WhatsApp</label>` +
        `<input id="re-whatsapp" name="whatsapp" type="tel" value="${escapeHtml(restaurant.whatsapp)}" required></div>` +
        `<div class="field"><label for="re-city">City</label>` +
        `<input id="re-city" name="city" type="text" value="${escapeHtml(restaurant.city)}" required></div>` +
        `<div class="field"><label for="re-plan">Plan</label>` +
        `<select id="re-plan" name="planId" required>${planOptionsHtml(restaurant.planId)}</select>` +
        `<span class="field-hint">Changing the plan changes the monthly fee from this billing cycle.</span></div>` +
        `<div class="field"><label>Status</label>` +
        `<div class="sa-readonly">${statusBadge(restaurant.status)}<span>${escapeHtml(dueNote(restaurant.dueDate))}</span></div>` +
        `</div>` +
        `</div>` +
        logoFieldHtml(restaurant.logo, restaurant.name) +
        `</form>`,
      footer:
        `<button class="btn btn-secondary" type="button" data-modal-close>Cancel</button>` +
        `<button class="btn btn-primary" type="submit" form="restaurant-edit-form">${icon("check")}Save changes</button>`,
      onMount: (overlay) => {
        const form = overlay.querySelector("#restaurant-edit-form");
        bindLogoField(overlay, form);

        form.addEventListener("submit", (event) => {
          event.preventDefault();
          clearFormError(form);

          const data = new FormData(form);
          const name = String(data.get("name") || "").trim();
          const ownerName = String(data.get("ownerName") || "").trim();
          const whatsapp = String(data.get("whatsapp") || "").trim();
          const city = String(data.get("city") || "").trim();
          const planId = String(data.get("planId") || "").trim();
          const digits = whatsapp.replace(/\D/g, "");

          if (!name) return fail(form, "Enter the restaurant name.", "name");
          if (!ownerName) return fail(form, "Enter the owner name.", "ownerName");
          if (digits.length < 7 || digits.length > 15) {
            return fail(form, "Enter a valid mobile / WhatsApp number.", "whatsapp");
          }
          if (!city) return fail(form, "Enter the city.", "city");
          if (!planFor(planId)) return fail(form, "Choose a plan for this restaurant.", "planId");

          const logo =
            state.logoDraft === undefined ? String(restaurant.logo || "") : state.logoDraft;

          let updated;
          try {
            updated = Tenant.updateRestaurant(restaurant.id, {
              name,
              ownerName,
              whatsapp,
              city,
              logo,
              planId,
            });
          } catch (error) {
            showFormError(
              form,
              error && error.message
                ? error.message
                : "The changes could not be saved. Device storage may be full."
            );
            return;
          }

          if (!updated) {
            showFormError(form, "That restaurant could not be found.");
            return;
          }

          syncRestaurantBrand(restaurant.id, updated);
          closeModal();
          renderCurrentPage();
          showToast("Restaurant updated.");
        });
      },
    });
  }

  function bindLogoField(overlay, form) {
    const input = overlay.querySelector("[data-logo-input]");
    const preview = overlay.querySelector("[data-logo-preview]");
    const nameField = form.elements.namedItem("name");

    if (nameField && preview) {
      nameField.addEventListener("input", () => {
        if (state.logoDraft !== undefined && state.logoDraft !== "") return;
        preview.innerHTML = logoPreviewContent("", nameField.value);
      });
    }

    if (input) {
      input.addEventListener("change", () => {
        const file = input.files && input.files[0];
        if (!file) return;

        input.disabled = true;
        readLogoFile(file)
          .then((dataUrl) => {
            state.logoDraft = dataUrl;
            if (preview) preview.innerHTML = logoPreviewContent(dataUrl, "");
          })
          .catch((error) => showToast(error.message || "That image could not be read.", "error"))
          .finally(() => {
            input.disabled = false;
            input.value = "";
          });
      });
    }

    overlay.addEventListener("click", (event) => {
      if (!event.target.closest('[data-action="remove-logo"]')) return;
      state.logoDraft = "";
      if (preview) {
        preview.innerHTML = logoPreviewContent("", nameField ? nameField.value : "");
      }
    });
  }

  function readLogoFile(file) {
    return new Promise((resolve, reject) => {
      if (!file.type || !file.type.startsWith("image/")) {
        reject(new Error("Choose a PNG or JPG image."));
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        reject(new Error("Choose an image under 5 MB."));
        return;
      }

      const reader = new FileReader();
      reader.onerror = () => reject(new Error("That image could not be read."));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error("That image could not be read."));
        image.onload = () => {
          try {
            const max = 256;
            const scale = Math.min(1, max / Math.max(image.width, image.height));
            const width = Math.max(1, Math.round(image.width * scale));
            const height = Math.max(1, Math.round(image.height * scale));
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext("2d");
            context.drawImage(image, 0, 0, width, height);
            resolve(canvas.toDataURL("image/png"));
          } catch {
            resolve(String(reader.result));
          }
        };
        image.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });
  }

  function toggleRestaurant(restaurantId) {
    const restaurant = Tenant.getRestaurant(restaurantId);
    if (!restaurant) {
      showToast("That restaurant could not be found.", "error");
      return;
    }

    const enable = restaurant.status === "Disabled";
    const updated = Tenant.updateRestaurant(restaurantId, {
      status: enable ? "Active" : "Disabled",
    });

    if (!updated) {
      showToast("The status could not be changed.", "error");
      return;
    }

    renderCurrentPage();

    if (!enable) {
      showToast("Restaurant disabled. Its menu and admin login are blocked.", "warning");
      return;
    }

    const current = Tenant.getRestaurant(restaurantId);
    if (current && current.status === "Expired") {
      showToast(
        "Restaurant enabled, but its fee is overdue so it stays expired. Mark the payment as paid to restore it.",
        "warning"
      );
    } else {
      showToast("Restaurant enabled. Its menu and admin login are live.");
    }
  }

  function openDeleteRestaurantModal(restaurantId) {
    const restaurant = Tenant.getRestaurant(restaurantId);
    if (!restaurant) {
      showToast("That restaurant could not be found.", "error");
      return;
    }

    const disableFirst =
      restaurant.status !== "Disabled"
        ? `<button class="btn btn-secondary" type="button" data-action="modal-disable-restaurant" data-id="${escapeHtml(restaurant.id)}">${icon("pause")}Disable instead</button>`
        : "";

    openModal({
      kicker: "Permanent action",
      title: `Delete ${restaurant.name}?`,
      subtitle: "This cannot be undone.",
      size: "sm",
      body:
        `<div class="sa-callout sa-callout--danger">${icon("alert")}` +
        `<p>Deleting removes the restaurant from this console. Its customer menu and Restaurant Admin login stop working immediately.</p></div>` +
        `<ul class="sa-fact-list">` +
        `<li>Past orders and payment records are kept.</li>` +
        `<li>The restaurant's saved menu and table data stay on this device.</li>` +
        `<li>You can disable the restaurant instead to keep it in the registry.</li>` +
        `</ul>`,
      footer:
        `<button class="btn btn-secondary" type="button" data-modal-close>Cancel</button>` +
        disableFirst +
        `<button class="btn btn-danger" type="button" data-action="confirm-delete-restaurant" data-id="${escapeHtml(restaurant.id)}">${icon("trash")}Delete permanently</button>`,
    });
  }

  function openOnboardingModal(restaurantId) {
    const restaurant = Tenant.getRestaurant(restaurantId);
    if (!restaurant) {
      showToast("That restaurant could not be found.", "error");
      return;
    }

    const checklist = onboardingFor(restaurant.id);
    const items = ONBOARDING_ITEMS.map(
      (item) =>
        `<label class="sa-onboarding-item">` +
        `<input type="checkbox" name="${escapeHtml(item.id)}"${checklist[item.id] ? " checked" : ""}>` +
        `<span class="sa-onboarding-check" aria-hidden="true">${icon("check")}</span>` +
        `<span>${escapeHtml(item.label)}</span>` +
        `</label>`
    ).join("");

    openModal({
      kicker: "Launch checklist",
      title: `Onboarding — ${restaurant.name}`,
      subtitle: "Tick each step as the restaurant gets ready to go live. Changes are saved on this device.",
      size: "md",
      body:
        `<form id="onboarding-form" class="sa-onboarding-form" data-restaurant-id="${escapeHtml(restaurant.id)}">` +
        `<div class="sa-onboarding-progress"><span data-onboarding-count>${onboardingProgress(restaurant.id).done}</span> of ${ONBOARDING_ITEMS.length} complete</div>` +
        `<div class="sa-onboarding-list">${items}</div>` +
        `</form>`,
      footer:
        `<button class="btn btn-secondary" type="button" data-modal-close>Cancel</button>` +
        `<button class="btn btn-primary" type="submit" form="onboarding-form">${icon("check")}Save checklist</button>`,
      onMount(overlay) {
        const form = overlay.querySelector("#onboarding-form");
        if (!form) return;

        const count = overlay.querySelector("[data-onboarding-count]");
        const updateCount = () => {
          if (!count) return;
          const checked = form.querySelectorAll('input[type="checkbox"]:checked').length;
          count.textContent = String(checked);
        };

        form.addEventListener("change", updateCount);
        form.addEventListener("submit", (event) => {
          event.preventDefault();
          const next = {};
          ONBOARDING_ITEMS.forEach((item) => {
            const input = form.elements.namedItem(item.id);
            next[item.id] = Boolean(input && input.checked);
          });

          try {
            saveOnboarding(restaurant.id, next);
          } catch (error) {
            showToast(
              error && error.message ? error.message : "The checklist could not be saved.",
              "error"
            );
            return;
          }

          closeModal();
          renderCurrentPage();
          const progress = onboardingProgress(restaurant.id);
          showToast(
            progress.done === progress.total
              ? `${restaurant.name} onboarding complete.`
              : `${restaurant.name} checklist saved (${progress.done}/${progress.total}).`
          );
        });
      },
    });
  }

  function openResetDemoModal() {
    const demo = Tenant.getRestaurant(DEMO_ID);
    if (!demo) {
      showToast("The demo restaurant is not available yet.", "error");
      return;
    }

    openModal({
      kicker: "Sample data",
      title: "Reset demo data?",
      subtitle: "Only the Karahi House demo restaurant is affected.",
      size: "sm",
      body:
        `<div class="sa-callout sa-callout--warning">${icon("alert")}` +
        `<p>This clears demo orders, waiter calls, bill requests, feedback and the demo order counter, then restores the 10 sample dishes and 12 tables.</p></div>` +
        `<ul class="sa-fact-list">` +
        `<li>Real restaurants and their orders are never touched.</li>` +
        `<li>Demo feedback and test orders are permanently removed.</li>` +
        `<li>The demo restaurant stays active and shareable.</li>` +
        `</ul>`,
      footer:
        `<button class="btn btn-secondary" type="button" data-modal-close>Cancel</button>` +
        `<button class="btn btn-primary" type="button" data-action="confirm-reset-demo">${icon("refresh")}Reset demo data</button>`,
    });
  }

  /* ------------------------------------------------------------------------
     Plans
     ------------------------------------------------------------------------ */

  function planUsage(planId) {
    return getRestaurants().filter((restaurant) => restaurant.planId === planId).length;
  }

  function planCardHtml(plan) {
    const usage = planUsage(plan.id);
    const features = plan.features.length
      ? `<ul class="sa-plan-features">` +
        plan.features
          .map((feature) => `<li>${icon("check")}<span>${escapeHtml(feature)}</span></li>`)
          .join("") +
        `</ul>`
      : `<p class="sa-plan-no-features">No features listed yet.</p>`;

    return (
      `<article class="sa-plan-card">` +
      `<div class="sa-plan-head">` +
      `<span class="sa-plan-icon">${icon("layers")}</span>` +
      `<div class="sa-plan-title"><h2>${escapeHtml(plan.name)}</h2><span>Monthly plan</span></div>` +
      `</div>` +
      `<p class="sa-plan-price">${escapeHtml(formatMoney(plan.price))}<span>/ month</span></p>` +
      features +
      `<div class="sa-plan-foot">` +
      `<span class="sa-plan-usage">${usage ? `Used by ${pluralise(usage, "restaurant")}` : "Not assigned yet"}</span>` +
      `<div class="sa-row-actions">` +
      `<button class="btn btn-secondary btn-sm" type="button" data-action="edit-plan" data-id="${escapeHtml(plan.id)}">${icon("edit")}Edit</button>` +
      `<button class="btn btn-ghost btn-sm sa-btn-danger" type="button" data-action="delete-plan" data-id="${escapeHtml(plan.id)}">${icon("trash")}Delete</button>` +
      `</div>` +
      `</div>` +
      `</article>`
    );
  }

  function renderPlansPage(view) {
    const plans = getPlans();

    view.innerHTML =
      pageHeaderHtml({
        title: "Plans",
        subtitle: "Set the monthly price and feature list restaurants can choose from.",
        actions: `<button class="btn btn-primary" type="button" data-action="add-plan">${icon("plus")}Add plan</button>`,
      }) +
      (plans.length
        ? `<div class="sa-plan-grid">${plans.map(planCardHtml).join("")}</div>`
        : `<section class="panel">` +
          emptyStateHtml({
            icon: "layers",
            title: "No plans yet",
            message: "Add a plan before creating restaurants. Prices are set here, not in the restaurant forms.",
            action: `<button class="btn btn-primary" type="button" data-action="add-plan">${icon("plus")}Add plan</button>`,
          }) +
          `</section>`) +
      `<p class="sa-page-note">` +
      `${icon("refresh")}<span>Default plans come from <code>superadmin/js/config.js</code>. Changes here are stored in this browser and take over from those defaults.</span>` +
      `</p>`;
  }

  function openPlanModal(planId) {
    const plans = getPlans();
    const existing = planId ? plans.find((plan) => plan.id === planId) : null;
    if (planId && !existing) {
      showToast("That plan could not be found.", "error");
      return;
    }

    openModal({
      kicker: existing ? "Edit plan" : "New plan",
      title: existing ? `Edit ${existing.name}` : "Add plan",
      subtitle: "The monthly fee is used for every restaurant on this plan.",
      size: "md",
      body:
        `<form id="plan-form" class="sa-form" novalidate>` +
        `<div class="form-error" data-form-error role="alert" hidden></div>` +
        `<div class="form-grid form-grid--2">` +
        `<div class="field"><label for="p-name">Plan name</label>` +
        `<input id="p-name" name="name" type="text" value="${escapeHtml(existing ? existing.name : "")}" placeholder="e.g. Standard" required data-autofocus></div>` +
        `<div class="field"><label for="p-price">Monthly fee (Rs.)</label>` +
        `<input id="p-price" name="price" type="number" min="0" step="50" value="${existing ? existing.price : ""}" placeholder="e.g. 3500" required></div>` +
        `</div>` +
        `<div class="field"><label for="p-features">Features</label>` +
        `<textarea id="p-features" name="features" rows="5" placeholder="One feature per line">${escapeHtml(existing ? existing.features.join("\n") : "")}</textarea>` +
        `<span class="field-hint">One feature per line. Each becomes a checkmark on the plan card.</span></div>` +
        `</form>`,
      footer:
        `<button class="btn btn-secondary" type="button" data-modal-close>Cancel</button>` +
        `<button class="btn btn-primary" type="submit" form="plan-form">${icon("check")}${existing ? "Save plan" : "Create plan"}</button>`,
      onMount: (overlay) => {
        const form = overlay.querySelector("#plan-form");

        form.addEventListener("submit", (event) => {
          event.preventDefault();
          clearFormError(form);

          const data = new FormData(form);
          const name = String(data.get("name") || "").trim();
          const priceValue = Number(data.get("price"));
          const features = String(data.get("features") || "")
            .split(/\r?\n/)
            .map((feature) => feature.trim())
            .filter(Boolean);

          if (!name) return fail(form, "Enter a plan name.", "name");
          if (!Number.isFinite(priceValue) || priceValue < 0) {
            return fail(form, "Enter a valid monthly fee.", "price");
          }

          const duplicate = plans.find(
            (plan) =>
              plan.name.toLowerCase() === name.toLowerCase() &&
              (!existing || plan.id !== existing.id)
          );
          if (duplicate) return fail(form, "A plan with that name already exists.", "name");

          let id = existing ? existing.id : Tenant.slugify(name) || "plan";
          if (!existing) {
            const ids = new Set(plans.map((plan) => plan.id));
            let counter = 2;
            let candidate = id;
            while (ids.has(candidate)) {
              candidate = `${id}-${counter}`;
              counter += 1;
            }
            id = candidate;
          }

          const nextPlan = {
            id,
            name,
            price: Math.round(priceValue),
            period: "month",
            features: Array.from(new Set(features)),
          };

          const nextPlans = existing
            ? plans.map((plan) => (plan.id === existing.id ? nextPlan : plan))
            : plans.concat(nextPlan);

          try {
            savePlans(nextPlans);
          } catch (error) {
            showFormError(
              form,
              error && error.message
                ? error.message
                : "The plan could not be saved. Device storage may be full."
            );
            return;
          }

          closeModal();
          renderCurrentPage();
          showToast(existing ? "Plan updated. New fees apply to assigned restaurants." : "Plan created.");
        });
      },
    });
  }

  function openDeletePlanModal(planId) {
    const plan = planFor(planId);
    if (!plan) {
      showToast("That plan could not be found.", "error");
      return;
    }

    const usage = planUsage(plan.id);
    if (usage > 0) {
      openModal({
        kicker: "Plan in use",
        title: `${plan.name} cannot be deleted`,
        size: "sm",
        body:
          `<p class="sa-modal-text">${pluralise(usage, "restaurant")} ${usage === 1 ? "is" : "are"} on this plan. ` +
          `Move ${usage === 1 ? "it" : "them"} to another plan before deleting <strong>${escapeHtml(plan.name)}</strong>.</p>`,
        footer:
          `<button class="btn btn-secondary" type="button" data-modal-close>Close</button>` +
          `<a class="btn btn-primary" href="restaurants.html">${icon("store")}Manage restaurants</a>`,
      });
      return;
    }

    openModal({
      kicker: "Delete plan",
      title: `Delete ${plan.name}?`,
      subtitle: "This cannot be undone.",
      size: "sm",
      body:
        `<div class="sa-callout sa-callout--danger">${icon("alert")}` +
        `<p>No restaurant uses this plan, so it can be removed safely.</p></div>`,
      footer:
        `<button class="btn btn-secondary" type="button" data-modal-close>Cancel</button>` +
        `<button class="btn btn-danger" type="button" data-action="confirm-delete-plan" data-id="${escapeHtml(plan.id)}">${icon("trash")}Delete plan</button>`,
    });
  }

  /* ------------------------------------------------------------------------
     Payments
     ------------------------------------------------------------------------ */

  function billingRowHtml(restaurant) {
    const plan = planFor(restaurant.planId);
    const payState = paymentState(restaurant);

    return (
      `<tr>` +
      `<td><div class="sa-entity">${logoMarkHtml(restaurant)}` +
      `<div class="sa-entity-copy"><strong>${escapeHtml(restaurant.name)}</strong>` +
      `<span>${escapeHtml(restaurant.ownerName || "Owner not set")}</span></div></div></td>` +
      `<td data-label="Plan">${plan ? `<span class="sa-plan-pill">${escapeHtml(plan.name)}</span>` : `<span class="cell-sub">No plan</span>`}</td>` +
      `<td class="cell-amount" data-label="Monthly fee">${escapeHtml(formatMoney(plan ? plan.price : 0))}</td>` +
      `<td data-label="Due date"><span class="cell-strong">${escapeHtml(formatDate(restaurant.dueDate))}</span>` +
      `<span class="cell-sub${payState === "Overdue" ? " is-overdue" : ""}">${escapeHtml(dueNote(restaurant.dueDate))}</span></td>` +
      `<td data-label="Payment status">${paymentBadge(payState)}</td>` +
      `<td data-label="Last payment">${restaurant.lastPaymentDate ? escapeHtml(formatDate(restaurant.lastPaymentDate)) : `<span class="cell-sub">No payment yet</span>`}</td>` +
      `<td class="cell-actions">` +
      `<button class="btn btn-secondary btn-sm" type="button" data-action="mark-paid" data-id="${escapeHtml(restaurant.id)}"${plan ? "" : " disabled"}>${icon("cash")}Mark as Paid</button>` +
      `</td>` +
      `</tr>`
    );
  }

  function overdueRowHtml(restaurant) {
    const plan = planFor(restaurant.planId);
    const days = daysUntil(restaurant.dueDate);
    const overdueDays = days === null ? 0 : Math.abs(Math.min(days, 0));

    return (
      `<div class="sa-overdue-row">` +
      `<div class="sa-overdue-main">${logoMarkHtml(restaurant)}` +
      `<div class="sa-entity-copy"><strong>${escapeHtml(restaurant.name)}</strong>` +
      `<span>${escapeHtml(restaurant.ownerName || "Owner not set")} · ${escapeHtml(plan ? plan.name : "No plan")}</span></div></div>` +
      `<div class="sa-overdue-meta">` +
      `<strong>${escapeHtml(formatMoney(plan ? plan.price : 0))}</strong>` +
      `<span>Due ${escapeHtml(formatDate(restaurant.dueDate))} · ${pluralise(overdueDays, "day")} late</span>` +
      `</div>` +
      `<div class="sa-row-actions">` +
      `<button class="btn btn-secondary btn-sm" type="button" data-action="send-reminder" data-id="${escapeHtml(restaurant.id)}">${icon("whatsapp")}Copy reminder</button>` +
      `<button class="btn btn-accent btn-sm" type="button" data-action="mark-paid" data-id="${escapeHtml(restaurant.id)}"${plan ? "" : " disabled"}>${icon("cash")}Mark as Paid</button>` +
      `</div>` +
      `</div>`
    );
  }

  function earningsForMonth(month) {
    const payments = getPayments().filter((payment) => monthOf(payment.paymentDate) === month);
    const collected = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const pendingRestaurants = getRestaurants().filter(
      (restaurant) =>
        restaurant.paymentStatus !== "Paid" && monthOf(restaurant.dueDate) === month
    );
    const pending = pendingRestaurants.reduce(
      (sum, restaurant) => sum + monthlyFeeFor(restaurant),
      0
    );
    return { payments, collected, pending, pendingRestaurants };
  }

  function renderPaymentsPage(view) {
    const restaurants = recentRestaurants(500);
    const overdue = restaurants
      .filter(
        (restaurant) =>
          restaurant.paymentStatus !== "Paid" && restaurant.dueDate < todayKey()
      )
      .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));

    if (!Tenant.isDateKey(`${state.earningsMonth}-01`) || !/^\d{4}-\d{2}$/.test(state.earningsMonth)) {
      state.earningsMonth = currentMonthKey();
    }

    const report = earningsForMonth(state.earningsMonth);
    const paymentRows = report.payments
      .map(
        (payment) =>
          `<tr>` +
          `<td>${escapeHtml(formatDate(payment.paymentDate))}</td>` +
          `<td><span class="cell-strong">${escapeHtml(payment.restaurantName || "Deleted restaurant")}</span>` +
          `<span class="cell-sub">${escapeHtml(payment.planName || "")}</span></td>` +
          `<td>${escapeHtml(payment.method || "—")}</td>` +
          `<td>${escapeHtml(payment.reference || "—")}</td>` +
          `<td class="cell-amount">${escapeHtml(formatMoney(payment.amount))}</td>` +
          `</tr>`
      )
      .join("");

    view.innerHTML =
      pageHeaderHtml({
        title: "Payments",
        subtitle: "Record manual payments, chase dues and review monthly earnings.",
        actions:
          `<a class="btn btn-secondary" href="restaurants.html">${icon("store")}Restaurants</a>`,
      }) +
      `<section class="panel">` +
      `<div class="panel-head"><div><h2 class="panel-title">Billing</h2>` +
      `<p class="panel-sub">Monthly fee, due date and payment status for each restaurant.</p></div>` +
      `<span class="sa-panel-chip">${icon("cash")}${restaurants.length}</span></div>` +
      (restaurants.length
        ? `<div class="data-table-wrap"><table class="data-table sa-table sa-table--billing">` +
          `<thead><tr><th>Restaurant</th><th>Plan</th><th class="num">Monthly fee</th><th>Due date</th>` +
          `<th>Payment status</th><th>Last payment</th><th class="th-actions"><span class="sr-only">Actions</span></th></tr></thead>` +
          `<tbody>${restaurants.map(billingRowHtml).join("")}</tbody>` +
          `</table></div>`
        : emptyStateHtml({
            icon: "store",
            title: "No restaurants yet",
            message: "Add a restaurant first, then record its monthly payments here.",
            action: `<a class="btn btn-primary" href="restaurants.html?add=1">${icon("plus")}Add restaurant</a>`,
          })) +
      `</section>` +
      `<section class="panel">` +
      `<div class="panel-head"><div><h2 class="panel-title">Overdue</h2>` +
      `<p class="panel-sub">Restaurants whose due date has passed and payment is still unpaid.</p></div>` +
      (overdue.length ? `<span class="sa-panel-chip sa-panel-chip--alert">${icon("alert")}${overdue.length}</span>` : "") +
      `</div>` +
      (overdue.length
        ? `<div class="sa-overdue-list">${overdue.map(overdueRowHtml).join("")}</div>`
        : `<p class="sa-quiet">${icon("check")}No overdue payments. Every restaurant is up to date.</p>`) +
      `</section>` +
      `<section class="panel">` +
      `<div class="panel-head sa-report-head">` +
      `<div><h2 class="panel-title">Earnings report</h2>` +
      `<p class="panel-sub">Collected and pending fees for the selected month.</p></div>` +
      `<div class="sa-report-tools">` +
      `<label class="sa-month-field"><span class="sr-only">Report month</span>` +
      `<input id="earnings-month" type="month" value="${escapeHtml(state.earningsMonth)}" max="${currentMonthKey()}"></label>` +
      `<button class="btn btn-secondary btn-sm" type="button" data-action="download-csv">${icon("download")}Download CSV</button>` +
      `<button class="btn btn-secondary btn-sm" type="button" data-action="print-earnings">${icon("print")}Print</button>` +
      `</div>` +
      `</div>` +
      `<div class="sa-report-stats">` +
      `<article class="sa-report-stat"><span class="stat-label">Total collected</span>` +
      `<strong>${escapeHtml(formatMoney(report.collected))}</strong>` +
      `<span>${pluralise(report.payments.length, "payment")} in ${escapeHtml(formatMonth(state.earningsMonth))}</span></article>` +
      `<article class="sa-report-stat"><span class="stat-label">Total pending</span>` +
      `<strong>${escapeHtml(formatMoney(report.pending))}</strong>` +
      `<span>${pluralise(report.pendingRestaurants.length, "restaurant")} due in this month</span></article>` +
      `</div>` +
      (report.payments.length
        ? `<div class="data-table-wrap"><table class="data-table sa-table">` +
          `<thead><tr><th>Payment date</th><th>Restaurant</th><th>Method</th><th>Reference</th><th class="num">Amount</th></tr></thead>` +
          `<tbody>${paymentRows}</tbody></table></div>`
        : `<div class="sa-quiet">${icon("receipt")}No payments recorded for ${escapeHtml(formatMonth(state.earningsMonth))}.</div>`) +
      `<p class="sa-page-note">${icon("clock")}<span>Pending counts unpaid fees whose due date falls in the selected month.</span></p>` +
      `</section>`;
  }

  function openMarkPaidModal(restaurantId) {
    const restaurant = Tenant.getRestaurant(restaurantId);
    if (!restaurant) {
      showToast("That restaurant could not be found.", "error");
      return;
    }

    const plan = planFor(restaurant.planId);
    if (!plan) {
      showToast("Assign a plan to this restaurant first.", "error");
      return;
    }

    if (!PAYMENT_METHODS.length) {
      showToast("No payment methods are configured.", "error");
      return;
    }

    const accounts = PAYMENT_DETAILS.length
      ? `<div class="sa-payment-accounts">` +
        `<span class="sa-payment-accounts-label">Receive payment to</span>` +
        PAYMENT_DETAILS.map(
          (detail) =>
            `<span class="sa-account-line"><strong>${escapeHtml(detail.label || "Account")}</strong>` +
            `<code>${escapeHtml(detail.value || "")}</code></span>`
        ).join("") +
        `</div>`
      : "";

    openModal({
      kicker: "Record payment",
      title: `Mark ${restaurant.name} as paid`,
      subtitle: `New due date will be ${BILLING_DAYS} days after the payment date.`,
      size: "md",
      body:
        `<div class="sa-pay-summary">` +
        `<span><span class="stat-label">Plan</span><strong>${escapeHtml(plan.name)}</strong></span>` +
        `<span><span class="stat-label">Amount</span><strong>${escapeHtml(formatMoney(plan.price))}</strong></span>` +
        `<span><span class="stat-label">Current due</span><strong>${escapeHtml(formatDate(restaurant.dueDate))}</strong></span>` +
        `</div>` +
        `<form id="payment-form" class="sa-form" novalidate>` +
        `<div class="form-error" data-form-error role="alert" hidden></div>` +
        `<div class="form-grid form-grid--2">` +
        `<div class="field"><label for="pay-method">Payment method</label>` +
        `<select id="pay-method" name="method" required data-autofocus>` +
        PAYMENT_METHODS.map(
          (method) => `<option value="${escapeHtml(method)}">${escapeHtml(method)}</option>`
        ).join("") +
        `</select></div>` +
        `<div class="field"><label for="pay-date">Payment date</label>` +
        `<input id="pay-date" name="paymentDate" type="date" value="${todayKey()}" max="${todayKey()}" required></div>` +
        `</div>` +
        `<div class="field"><label for="pay-reference">Transaction note / reference</label>` +
        `<input id="pay-reference" name="reference" type="text" maxlength="120" placeholder="e.g. JazzCash TID 8842103">` +
        `<span class="field-hint">Optional. Saved with the payment record.</span></div>` +
        accounts +
        `</form>`,
      footer:
        `<button class="btn btn-secondary" type="button" data-modal-close>Cancel</button>` +
        `<button class="btn btn-primary" type="submit" form="payment-form">${icon("check")}Record payment</button>`,
      onMount: (overlay) => {
        const form = overlay.querySelector("#payment-form");

        form.addEventListener("submit", (event) => {
          event.preventDefault();
          clearFormError(form);

          const data = new FormData(form);
          const method = String(data.get("method") || "");
          const paymentDate = String(data.get("paymentDate") || "");
          const reference = String(data.get("reference") || "").trim();

          if (!PAYMENT_METHODS.includes(method)) {
            return fail(form, "Choose a payment method.", "method");
          }
          if (!Tenant.isDateKey(paymentDate)) {
            return fail(form, "Choose a valid payment date.", "paymentDate");
          }
          if (paymentDate > todayKey()) {
            return fail(form, "Payment date cannot be in the future.", "paymentDate");
          }

          const nextDue = Tenant.addDaysKey(paymentDate, BILLING_DAYS);

          try {
            const updated = Tenant.updateRestaurant(restaurant.id, {
              status: "Active",
              paymentStatus: "Paid",
              lastPaymentDate: paymentDate,
              dueDate: nextDue,
            });

            if (!updated) {
              showFormError(form, "That restaurant could not be found.");
              return;
            }

            const payments = getPayments();
            payments.unshift({
              id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              restaurantId: restaurant.id,
              restaurantName: restaurant.name,
              planName: plan.name,
              amount: plan.price,
              method,
              paymentDate,
              reference,
              recordedAt: new Date().toISOString(),
            });
            savePayments(payments);
          } catch (error) {
            showFormError(
              form,
              error && error.message
                ? error.message
                : "The payment could not be saved. Device storage may be full."
            );
            return;
          }

          closeModal();
          renderCurrentPage();

          if (nextDue < todayKey()) {
            showToast(
              `Payment recorded, but the new due date ${formatDate(nextDue)} is already past. The plan will expire again.`,
              "warning"
            );
          } else {
            showToast(`Payment recorded. ${restaurant.name} is active until ${formatDate(nextDue)}.`);
          }
        });
      },
    });
  }

  function buildReminder(restaurant) {
    const plan = planFor(restaurant.planId);
    const amount = formatMoney(plan ? plan.price : 0);
    const template = String(
      SA.reminderTemplate ||
        "Hello {owner}, this is a reminder from {platform}. The {plan} plan for {restaurant} ({amount}) was due on {dueDate}. Please renew to keep the restaurant menu active."
    );

    return template
      .split("{owner}").join(restaurant.ownerName || "there")
      .split("{platform}").join(platformName)
      .split("{plan}").join(plan ? plan.name : "monthly")
      .split("{restaurant}").join(restaurant.name)
      .split("{amount}").join(amount)
      .split("{dueDate}").join(formatDate(restaurant.dueDate));
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        const ok = document.execCommand("copy");
        area.remove();
        return ok;
      } catch {
        return false;
      }
    }
  }

  async function sendReminder(restaurantId) {
    const restaurant = Tenant.getRestaurant(restaurantId);
    if (!restaurant) {
      showToast("That restaurant could not be found.", "error");
      return;
    }

    const text = buildReminder(restaurant);
    const copied = await copyText(text);

    if (copied) {
      showToast(`Reminder copied for ${restaurant.name}. Paste it into WhatsApp.`);
    } else {
      showToast("Could not copy automatically. Use the reminder panel to copy manually.", "error");
    }
  }

  function csvCell(value) {
    let text = String(value == null ? "" : value);
    if (/^[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  }

  function downloadCsv() {
    const month = state.earningsMonth;
    const report = earningsForMonth(month);
    const rows = [
      ["Payment date", "Restaurant", "Plan", "Method", "Reference", "Amount (Rs.)"],
    ].concat(
      report.payments.map((payment) => [
        payment.paymentDate,
        payment.restaurantName,
        payment.planName,
        payment.method,
        payment.reference,
        payment.amount,
      ])
    );
    rows.push(["", "", "", "", "Total collected", report.collected]);

    const csv = "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `karahi-house-earnings-${month}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(`CSV downloaded for ${formatMonth(month)}.`);
  }

  function printEarnings() {
    const month = state.earningsMonth;
    const report = earningsForMonth(month);
    const rows = report.payments
      .map(
        (payment) =>
          `<tr><td>${escapeHtml(formatDate(payment.paymentDate))}</td>` +
          `<td>${escapeHtml(payment.restaurantName)}</td>` +
          `<td>${escapeHtml(payment.planName)}</td>` +
          `<td>${escapeHtml(payment.method)}</td>` +
          `<td>${escapeHtml(payment.reference || "—")}</td>` +
          `<td class="num">${escapeHtml(formatMoney(payment.amount))}</td></tr>`
      )
      .join("");

    const win = window.open("", "_blank", "width=900,height=720");
    if (!win) {
      showToast("Allow pop-ups to print the earnings report.", "error");
      return;
    }

    win.document.write(
      `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">` +
        `<title>${escapeHtml(formatMonth(month))} earnings | ${escapeHtml(platformName)}</title>` +
        `<style>` +
        `body{font-family:Segoe UI,Arial,sans-serif;margin:36px;color:#1A1A1A}` +
        `h1{font-size:22px;margin:0 0 4px;color:#0F2E1F}` +
        `p{margin:0;color:#6C675D;font-size:12px}` +
        `.head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0F2E1F;padding-bottom:14px;margin-bottom:18px}` +
        `.totals{display:flex;gap:28px;margin:16px 0 20px}` +
        `.totals div{border:1px solid #E8E4DB;border-radius:10px;padding:12px 16px;min-width:150px}` +
        `.totals span{display:block;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#6C675D}` +
        `.totals strong{display:block;font-size:20px;margin-top:4px;color:#0F2E1F}` +
        `table{width:100%;border-collapse:collapse;font-size:12px}` +
        `th,td{text-align:left;padding:9px 8px;border-bottom:1px solid #E8E4DB}` +
        `th{background:#F6F6F4;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#6C675D}` +
        `.num{text-align:right}` +
        `tfoot th,tfoot td{font-weight:700;background:#FFF9F1}` +
        `footer{margin-top:24px;font-size:10px;color:#6C675D}` +
        `</style></head><body>` +
        `<div class="head"><div><h1>${escapeHtml(platformName)} — Super Admin</h1>` +
        `<p>Earnings report · ${escapeHtml(formatMonth(month))}</p></div>` +
        `<p>Generated ${escapeHtml(formatDate(todayKey()))}</p></div>` +
        `<div class="totals"><div><span>Total collected</span><strong>${escapeHtml(formatMoney(report.collected))}</strong></div>` +
        `<div><span>Total pending</span><strong>${escapeHtml(formatMoney(report.pending))}</strong></div></div>` +
        `<table><thead><tr><th>Date</th><th>Restaurant</th><th>Plan</th><th>Method</th><th>Reference</th><th class="num">Amount</th></tr></thead>` +
        `<tbody>${rows || '<tr><td colspan="6">No payments recorded for this month.</td></tr>'}</tbody>` +
        `<tfoot><tr><th colspan="5">Collected</th><td class="num">${escapeHtml(formatMoney(report.collected))}</td></tr></tfoot></table>` +
        `<footer>Pending counts unpaid fees whose due date falls in ${escapeHtml(formatMonth(month))}. ` +
        `Recorded manually in the Super Admin console.</footer>` +
        `</body></html>`
    );
    win.document.close();
    win.focus();
    win.print();
  }

  /* ------------------------------------------------------------------------
     Events and start-up
     ------------------------------------------------------------------------ */

  function handleActionClick(event) {
    const trigger = event.target.closest("[data-action]");
    if (!trigger) return;

    const action = trigger.dataset.action;
    const id = trigger.dataset.id || "";

    switch (action) {
      case "add-restaurant":
        openAddRestaurantModal();
        break;
      case "onboarding":
        openOnboardingModal(id);
        break;
      case "reset-demo":
        openResetDemoModal();
        break;
      case "confirm-reset-demo": {
        if (!window.DemoData || typeof window.DemoData.reset !== "function") {
          closeModal();
          showToast("The demo data script could not be loaded.", "error");
          break;
        }
        try {
          window.DemoData.reset();
        } catch (error) {
          closeModal();
          showToast(
            error && error.message ? error.message : "The demo data could not be reset.",
            "error"
          );
          break;
        }
        closeModal();
        renderCurrentPage();
        showToast("Demo data reset. Sample menu, 12 tables and a clean order history are ready.");
        break;
      }
      case "edit-restaurant":
        openEditRestaurantModal(id);
        break;
      case "toggle-restaurant":
        toggleRestaurant(id);
        break;
      case "delete-restaurant":
        openDeleteRestaurantModal(id);
        break;
      case "modal-disable-restaurant": {
        closeModal();
        const restaurant = Tenant.getRestaurant(id);
        if (restaurant && restaurant.status !== "Disabled") {
          Tenant.updateRestaurant(id, { status: "Disabled" });
          renderCurrentPage();
          showToast("Restaurant disabled. Its menu and admin login are blocked.", "warning");
        }
        break;
      }
      case "confirm-delete-restaurant": {
        const restaurant = Tenant.getRestaurant(id);
        try {
          Tenant.removeRestaurant(id);
          removeOnboarding(id);
        } catch (error) {
          closeModal();
          showToast(
            error && error.message ? error.message : "The restaurant could not be deleted.",
            "error"
          );
          break;
        }
        closeModal();
        renderCurrentPage();
        showToast(
          restaurant
            ? `${restaurant.name} deleted. Past orders and payments were kept.`
            : "Restaurant deleted.",
          "warning"
        );
        break;
      }
      case "add-plan":
        openPlanModal("");
        break;
      case "edit-plan":
        openPlanModal(id);
        break;
      case "delete-plan":
        openDeletePlanModal(id);
        break;
      case "confirm-delete-plan": {
        try {
          savePlans(getPlans().filter((plan) => plan.id !== id));
        } catch (error) {
          closeModal();
          showToast(error && error.message ? error.message : "The plan could not be deleted.", "error");
          break;
        }
        closeModal();
        renderCurrentPage();
        showToast("Plan deleted.", "warning");
        break;
      }
      case "mark-paid":
        openMarkPaidModal(id);
        break;
      case "send-reminder":
        sendReminder(id);
        break;
      case "download-csv":
        downloadCsv();
        break;
      case "print-earnings":
        printEarnings();
        break;
      default:
        break;
    }
  }

  function bindEvents() {
    document.addEventListener("click", (event) => {
      const closer = event.target.closest("[data-modal-close]");
      if (closer) {
        closeModal();
        return;
      }

      const shellAction = event.target.closest("[data-shell-action]");
      if (shellAction) {
        const action = shellAction.dataset.shellAction;
        if (action === "toggle-sidebar") {
          if (state.sidebarOpen) closeSidebar({ restoreFocus: true });
          else openSidebar();
        } else if (action === "close-sidebar") {
          closeSidebar({ restoreFocus: true });
        } else if (action === "logout") {
          signOut();
        }
        return;
      }

      handleActionClick(event);
    });

    document.addEventListener("change", (event) => {
      if (event.target && event.target.id === "earnings-month") {
        const value = String(event.target.value || "");
        state.earningsMonth = /^\d{4}-\d{2}$/.test(value) ? value : currentMonthKey();
        renderCurrentPage({ keepScroll: true });
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        if (state.modalOpen) {
          event.preventDefault();
          closeModal();
          return;
        }
        if (state.sidebarOpen) {
          closeSidebar({ restoreFocus: true });
        }
        return;
      }

      if (event.key !== "Tab" || !state.modalOpen) return;

      const dialog = document.querySelector("#admin-modal-root .modal");
      if (!dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => element.offsetParent !== null);

      if (!focusable.length) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !focusable.includes(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !focusable.includes(active))) {
        event.preventDefault();
        first.focus();
      }
    });

    window.addEventListener("storage", (event) => {
      if (!event.key || STORAGE_KEYS.includes(event.key)) {
        renderCurrentPage({ keepScroll: true });
      }
    });
  }

  function fail(form, message, fieldName) {
    showFormError(form, message);
    const field = form.elements.namedItem(fieldName);
    if (field && typeof field.focus === "function") field.focus();
  }

  function renderCurrentPage(options = {}) {
    const view = document.getElementById("admin-view");
    if (!view) return;

    const scroll = options.keepScroll ? window.scrollY : 0;

    switch (state.page) {
      case "restaurants":
        renderRestaurantsPage(view);
        break;
      case "plans":
        renderPlansPage(view);
        break;
      case "payments":
        renderPaymentsPage(view);
        break;
      case "dashboard":
      default:
        renderDashboardPage(view);
        break;
    }

    const meta = PAGE_META[state.page];
    document.title = meta
      ? `${meta.title} | ${platformName} Super Admin`
      : `Super Admin | ${platformName}`;

    updateActiveNav();

    if (options.keepScroll) {
      window.scrollTo({ top: scroll });
    }
  }

  /* ------------------------------------------------------------------------
     Login
     ------------------------------------------------------------------------ */

  function initLogin() {
    if (getSession()) {
      window.location.replace("index.html");
      return;
    }

    document.querySelectorAll("[data-platform-name]").forEach((element) => {
      element.textContent = platformName;
    });

    const form = document.getElementById("superadmin-login-form");
    if (!form) return;

    const errorBox = document.querySelector("[data-login-error]");
    const usernameInput = form.elements.namedItem("username");
    const passwordInput = form.elements.namedItem("password");

    const showError = (message) => {
      if (!errorBox) return;
      errorBox.textContent = message || "Wrong username or password";
      errorBox.hidden = false;
    };

    const clearError = () => {
      if (!errorBox) return;
      errorBox.textContent = "";
      errorBox.hidden = true;
    };

    [usernameInput, passwordInput].forEach((input) => {
      if (input) input.addEventListener("input", clearError);
    });

    const toggle = document.querySelector("[data-password-toggle]");
    if (toggle && passwordInput) {
      toggle.addEventListener("click", () => {
        const showing = passwordInput.type === "text";
        passwordInput.type = showing ? "password" : "text";
        toggle.setAttribute("aria-pressed", showing ? "false" : "true");
        toggle.setAttribute("aria-label", showing ? "Show password" : "Hide password");
        passwordInput.focus();
      });
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      clearError();

      const username = String((usernameInput && usernameInput.value) || "").trim();
      const password = String((passwordInput && passwordInput.value) || "");
      const credentials = SA.credentials || {};

      const valid =
        username.length > 0 &&
        password.length > 0 &&
        username === String(credentials.username || "") &&
        password === String(credentials.password || "");

      if (!valid) {
        showError("Wrong username or password");
        if (passwordInput) {
          passwordInput.value = "";
          passwordInput.focus();
        }
        return;
      }

      setSession(username);
      window.location.replace("index.html");
    });
  }

  if (page === "login") {
    initLogin();
    return;
  }

  state.session = getSession();
  if (!state.session) {
    window.location.replace("login.html");
    return;
  }

  if (window.DemoData && typeof window.DemoData.ensure === "function") {
    window.DemoData.ensure();
  }

  renderShell();
  renderCurrentPage();
  bindEvents();
})();
