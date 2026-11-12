/* ==========================================================================
   KARAHI HOUSE — PHASE 2 ADMIN + PHASE 3A OPERATIONS
   Shared admin shell, local data store and page logic for /admin.
   Front-end only: every change is saved to localStorage on this device.
   ========================================================================== */

(() => {
  "use strict";

  if (typeof CONFIG === "undefined" || typeof Tenant === "undefined") {
    document.body.innerHTML =
      '<div class="boot-error"><h1>Admin unavailable</h1>' +
      "<p>The shared restaurant configuration could not be loaded. Check the file paths and reload.</p></div>";
    return;
  }

  if (window.DemoData && typeof window.DemoData.ensure === "function") {
    window.DemoData.ensure();
  }

  const page = document.body.dataset.page || "dashboard";
  const currency = CONFIG.currency || {};
  const storageConfig = CONFIG.storage || {};
  const adminConfig = CONFIG.admin || {};
  const restaurantConfig = CONFIG.restaurant || {};
  const categories = Array.isArray(CONFIG.categories) ? CONFIG.categories : [];
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const currencySymbol = String(currency.symbol || "Rs.");
  const sessionKey = adminConfig.sessionKey || "karahiHouse.adminSession.v1";

  function readRawAdminSession() {
    try {
      const raw = window.sessionStorage.getItem(sessionKey);
      if (!raw || raw === "1") return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }

  const initialAdminSession = readRawAdminSession();
  let tenantRestaurantId =
    initialAdminSession && initialAdminSession.restaurantId
      ? String(initialAdminSession.restaurantId)
      : Tenant.DEFAULT_RESTAURANT_ID;

  function buildScopedKeys(restaurantId) {
    const scoped = Tenant.storageKeys(restaurantId);
    return {
      menu: scoped.menu,
      settings: scoped.settings,
      tables: scoped.tables,
      offers: scoped.offers,
      deals: scoped.deals,
      staff: scoped.staff,
      orders: scoped.orders,
      sequence: scoped.sequence,
      waiterCalls: scoped.waiterCalls,
      billRequests: scoped.billRequests,
      feedback: scoped.feedback,
    };
  }

  let KEYS = buildScopedKeys(tenantRestaurantId);
  let DATA_KEYS = new Set(Object.values(KEYS));

  function setTenantContext(restaurantId) {
    const next = String(restaurantId || "").trim() || Tenant.DEFAULT_RESTAURANT_ID;
    if (next === tenantRestaurantId) return;
    tenantRestaurantId = next;
    KEYS = buildScopedKeys(next);
    DATA_KEYS = new Set(Object.values(KEYS));
  }

  const SOUND_KEY = storageConfig.soundKey || "karahiHouse.soundEnabled.v1";
  const ALERT_SOUND_SRC = "../assets/alert.mp3";
  const STATUS_FLOW = ["Received", "Preparing", "Ready", "Served", "Paid"];
  const KITCHEN_STATUSES = ["Received", "Preparing"];
  const PENDING_STATUSES = ["Received", "Preparing", "Ready"];
  const ORDER_MODES = ["dine-in", "takeaway", "delivery"];
  const ORDER_MODE_LABELS = { "dine-in": "Dine-in", takeaway: "Takeaway", delivery: "Delivery" };
  const SERVICE_PENDING = "Pending";
  const SERVICE_ATTENDED = "Attended";
  const BILL_PAID = "Paid";
  const SERVICE_HISTORY_LIMIT = 8;
  const STAFF_ROLES = ["Owner", "Manager", "Kitchen", "Waiter"];
  const DEFAULT_STAFF_PASSWORD = "[STAFF_PASSWORD]";
  const ROLE_ACCESS = {
    Owner: ["dashboard", "menu", "orders", "kitchen", "tables", "offers", "reports", "feedback", "staff", "settings"],
    Manager: ["dashboard", "menu", "orders", "tables", "offers", "reports", "feedback"],
    Kitchen: ["kitchen", "orders"],
    Waiter: ["orders"],
  };
  const ROLE_HOME = {
    Owner: "index.html",
    Manager: "index.html",
    Kitchen: "kitchen.html",
    Waiter: "orders.html",
  };
  const KITCHEN_HIGHLIGHT_MS = 60000;
  const ORDER_WATCH_MS = 5000;
  const KITCHEN_REFRESH_MS = 10000;
  const QR_LIBRARY_URL = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
  const QR_LIBRARY_TIMEOUT = 12000;
  const MODAL_CLOSE_MS = 200;

  const PAGE_META = {
    dashboard: { title: "Dashboard", subtitle: "Live orders, sales and table activity." },
    menu: { title: "Menu Items", subtitle: "Manage dishes, prices and what guests can see." },
    orders: { title: "Orders", subtitle: "Track every table order from Received to Paid." },
    kitchen: { title: "Kitchen", subtitle: "Live tickets for Received and Preparing orders." },
    tables: { title: "Tables & QR Codes", subtitle: "One menu link and QR code for every table." },
    offers: { title: "Offers", subtitle: "Build combo deals and run date-based promotions." },
    reports: { title: "Reports", subtitle: "Sales and best sellers from real orders on this device." },
    feedback: { title: "Guest Feedback", subtitle: "Review guest ratings before they appear on the menu." },
    staff: { title: "Staff", subtitle: "Manage who can sign in and what each role can open." },
    settings: { title: "Settings", subtitle: "Restaurant name, logo, timings and service details." },
  };

  const NAV_ITEMS = [
    { id: "dashboard", label: "Dashboard", href: "index.html", icon: "grid" },
    { id: "menu", label: "Menu Items", href: "menu.html", icon: "book" },
    { id: "orders", label: "Orders", href: "orders.html", icon: "receipt", badge: true },
    { id: "kitchen", label: "Kitchen", href: "kitchen.html", icon: "flame", badge: true },
    { id: "tables", label: "Tables & QR Codes", href: "tables.html", icon: "qr" },
    { id: "offers", label: "Offers", href: "offers.html", icon: "tag" },
    { id: "reports", label: "Reports", href: "reports.html", icon: "chart", divider: true },
    { id: "feedback", label: "Guest Feedback", href: "feedback.html", icon: "star" },
    { id: "staff", label: "Staff", href: "staff.html", icon: "users" },
    { id: "settings", label: "Settings", href: "settings.html", icon: "gear" },
  ];

  const ICONS = {
    grid:
      '<rect x="3.5" y="3.5" width="7" height="7" rx="1.8"></rect>' +
      '<rect x="13.5" y="3.5" width="7" height="7" rx="1.8"></rect>' +
      '<rect x="3.5" y="13.5" width="7" height="7" rx="1.8"></rect>' +
      '<rect x="13.5" y="13.5" width="7" height="7" rx="1.8"></rect>',
    book:
      '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v16H6.5A2.5 2.5 0 0 0 4 21.5V5.5Z"></path>' +
      '<path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H19"></path><path d="M8 7.5h7"></path>',
    receipt:
      '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"></path>' +
      '<path d="M9 8h6M9 12h6M9 16h3"></path>',
    qr:
      '<rect x="3.5" y="3.5" width="6.4" height="6.4" rx="1.4"></rect>' +
      '<rect x="14.1" y="3.5" width="6.4" height="6.4" rx="1.4"></rect>' +
      '<rect x="3.5" y="14.1" width="6.4" height="6.4" rx="1.4"></rect>' +
      '<path d="M6.6 6.6h.8M17.1 6.6h.8M6.6 17.1h.8"></path>' +
      '<path d="M14.1 14.1h2.7v2.7h-2.7zM19.8 14.1h.7M14.1 19.8h2.7M19.6 19.6h.9"></path>',
    tag:
      '<path d="m20.6 13.1-7.5 7.5a2 2 0 0 1-2.8 0L3 13.3V4h9.3l8.3 8.3a2 2 0 0 1 0 2.8Z"></path>' +
      '<circle cx="7.8" cy="8.8" r="1.2"></circle>',
    chart:
      '<path d="M3.5 20.5h17"></path><path d="M6.5 20v-6"></path>' +
      '<path d="M12 20V4.5"></path><path d="M17.5 20v-9"></path>',
    gear:
      '<circle cx="12" cy="12" r="3.2"></circle>' +
      '<path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 8.96 4.6h.08A1.7 1.7 0 0 0 10 3.05V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9v.08a1.7 1.7 0 0 0 1.55 1.02H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51.9Z"></path>',
    logout:
      '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>' +
      '<path d="m16 17 5-5-5-5"></path><path d="M21 12H9"></path>',
    search: '<circle cx="11" cy="11" r="6.4"></circle><path d="m15.8 15.8 4.4 4.4"></path>',
    bell:
      '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"></path>' +
      '<path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"></path>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"></path>',
    close: '<path d="M6 6l12 12M18 6 6 18"></path>',
    plus: '<path d="M12 5v14M5 12h14"></path>',
    minus: '<path d="M5 12h14"></path>',
    check: '<path d="m5 12.5 4.3 4.3L19 6.5"></path>',
    "chevron-down": '<path d="m6 9 6 6 6-6"></path>',
    "arrow-right": '<path d="M4 12h15M13 6l6 6-6 6"></path>',
    edit: '<path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path>',
    trash:
      '<path d="M3 6h18"></path><path d="M8 6V4h8v2"></path>' +
      '<path d="m19 6-1 14H6L5 6"></path><path d="M10 10v7M14 10v7"></path>',
    download:
      '<path d="M12 3v11M7.5 10l4.5 4.5 4.5-4.5"></path>' +
      '<path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"></path>',
    upload:
      '<path d="M12 16V5M7.5 9 12 4.5 16.5 9"></path>' +
      '<path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"></path>',
    print:
      '<path d="M6 9V3h12v6"></path>' +
      '<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>' +
      '<rect x="6" y="14" width="12" height="8" rx="1.2"></rect>',
    copy:
      '<rect x="9" y="9" width="12" height="12" rx="2"></rect>' +
      '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>',
    external:
      '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>' +
      '<path d="M15 3h6v6"></path><path d="M10 14 21 3"></path>',
    image:
      '<rect x="3" y="3" width="18" height="18" rx="2.5"></rect>' +
      '<circle cx="8.7" cy="8.7" r="1.6"></circle><path d="m21 15.5-4.5-4.5L6 21"></path>',
    cash:
      '<rect x="2.5" y="6" width="19" height="12" rx="2.5"></rect>' +
      '<circle cx="12" cy="12" r="2.5"></circle><path d="M6 9.5v.01M18 14.5v.01"></path>',
    clock: '<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3.2 2"></path>',
    alert:
      '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"></path>' +
      '<path d="M12 9v4M12 17h.01"></path>',
    dots:
      '<circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none"></circle>' +
      '<circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"></circle>' +
      '<circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none"></circle>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle>',
    "eye-off":
      '<path d="M3 3l18 18"></path>' +
      '<path d="M10.6 5.2A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a17.3 17.3 0 0 1-3.2 4.2"></path>' +
      '<path d="M6.6 6.6A16.7 16.7 0 0 0 2 12s3.5 7 10 7a10.7 10.7 0 0 0 5.4-1.4"></path>' +
      '<path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"></path>',
    "refresh":
      '<path d="M21 12a9 9 0 1 1-2.6-6.4"></path><path d="M21 3v6h-6"></path>',
    calendar:
      '<rect x="3" y="5" width="18" height="16" rx="2.5"></rect>' +
      '<path d="M16 3v4M8 3v4M3 10h18"></path>',
    percent: '<path d="M19 5 5 19"></path><circle cx="6.5" cy="6.5" r="2.5"></circle><circle cx="17.5" cy="17.5" r="2.5"></circle>',
    flame:
      '<path d="M12 3c.6 2.6 2.3 3.9 3.6 5.2A6 6 0 0 1 18 12.8 6 6 0 0 1 6 12.8c0-1.6.7-2.9 1.8-4 .2 1.2.8 2.1 1.9 2.6-.4-3 .6-5.8 2.3-8.4Z"></path>' +
      '<path d="M12 21a3 3 0 0 0 3-3c0-1.4-1-2.4-1.8-3.3-.4-.5-.7-1-.9-1.7-1.2 1.1-3.3 2.6-3.3 5a3 3 0 0 0 3 3Z"></path>',
    server:
      '<rect x="3" y="4" width="18" height="7" rx="2"></rect>' +
      '<rect x="3" y="13" width="18" height="7" rx="2"></rect><path d="M7 7.5h.01M7 16.5h.01"></path>',
    users:
      '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>' +
      '<circle cx="9" cy="7" r="4"></circle>' +
      '<path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',
    volume:
      '<path d="M11 5 6 9H2v6h4l5 4V5Z"></path>' +
      '<path d="M15.5 8.5a5 5 0 0 1 0 7"></path><path d="M18.5 5.5a9 9 0 0 1 0 13"></path>',
    "volume-off":
      '<path d="M11 5 6 9H2v6h4l5 4V5Z"></path><path d="m16 9 5 6M21 9l-5 6"></path>',
    whatsapp:
      '<path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.4L3 21l2.1-5.6A8.4 8.4 0 1 1 21 11.5Z"></path>' +
      '<path d="M8.6 8.7c.2-.4.5-.5.7-.5h.5c.2 0 .4 0 .6.4l.8 1.9c.1.2 0 .4-.1.6l-.5.6c-.1.2-.2.3 0 .6.5.8 1.2 1.4 2 1.9.3.2.4.1.6 0l.6-.6c.2-.2.4-.2.6-.1l1.9.9c.2.1.4.2.4.4v.7c0 .3-.2 1.2-1.3 1.5-.8.2-1.7.1-2.7-.4-1.1-.5-2.4-1.4-3.4-2.8-.9-1.1-1.3-2.3-1.3-3.3 0-.8.2-1.4.5-1.8Z"></path>',
    bag:
      '<path d="M5 8h14l-1 12H6Z"></path>' +
      '<path d="M9 10V6.5a3 3 0 0 1 6 0V10"></path>',
    truck:
      '<path d="M3 6.5h10v10H3z"></path>' +
      '<path d="M13 9.5h4.2l3.3 3.5v3.5H13z"></path>' +
      '<circle cx="7" cy="18" r="1.6"></circle><circle cx="17" cy="18" r="1.6"></circle>',
    star:
      '<path d="m12 3.6 2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6-4.3-4.2 6-.9L12 3.6Z"></path>',
  };

  const state = {
    page,
    session: null,
    menuQuery: "",
    menuCategory: "all",
    ordersQuery: new URLSearchParams(window.location.search).get("q") || "",
    ordersStatus: "all",
    ordersTable: "all",
    reportRange: "7",
    reportsRange: "today",
    reportsStart: dateInputValue(addDays(startOfDay(), -6)),
    reportsEnd: dateInputValue(startOfDay()),
    menuDraftImage: "",
    settingsLogoDraft: null,
    dealDraft: null,
    dealImageDraft: null,
    dealPickerQuery: "",
    dealPickerCategory: "all",
    modalOpen: false,
    modalTrigger: null,
    pendingRefresh: false,
    openPopover: null,
    sidebarOpen: false,
    kitchenInitialized: false,
    kitchenFirstSeen: new Map(),
    kitchenSignature: "",
    seenOrderNumbers: null,
    audioPrimed: false,
  };

  let moneyFormatter;
  try {
    moneyFormatter = new Intl.NumberFormat(currency.locale || undefined, {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    });
  } catch {
    moneyFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
  }

  const dateShortFormatter = new Intl.DateTimeFormat(currency.locale || undefined, {
    day: "numeric",
    month: "short",
  });
  const dateFullFormatter = new Intl.DateTimeFormat(currency.locale || undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timeFormatter = new Intl.DateTimeFormat(currency.locale || undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  const weekdayFormatter = new Intl.DateTimeFormat(currency.locale || undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

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
    const safeAmount = Number.isFinite(amount) ? amount : 0;
    return `${currencySymbol} ${moneyFormatter.format(safeAmount)}`;
  }

  function pluralise(count, singular, plural) {
    return `${count} ${count === 1 ? singular : plural || `${singular}s`}`;
  }

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function initialFor(value) {
    const first = Array.from(String(value || "?"))[0] || "?";
    return first.toUpperCase();
  }

  function initialsFor(value) {
    const parts = String(value || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    const first = Array.from(parts[0])[0] || "";
    const second = parts.length > 1 ? Array.from(parts[parts.length - 1])[0] || "" : "";
    return `${first}${second}`.toUpperCase() || "?";
  }

  function toDate(value) {
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function localDateKey(value) {
    const date = typeof value === "string" || typeof value === "number" ? toDate(value) : value;
    if (!date || Number.isNaN(date.getTime())) return "";
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function dateInputValue(value) {
    const date = value instanceof Date ? value : toDate(value);
    if (!date) return "";
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function parseDateOnly(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || "").trim());
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const date = new Date(year, month, day);

    if (
      Number.isNaN(date.getTime()) ||
      date.getFullYear() !== year ||
      date.getMonth() !== month ||
      date.getDate() !== day
    ) {
      return null;
    }

    return date;
  }

  function startOfDay(date = new Date()) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function addDays(date, days) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  function formatDate(value) {
    const date = toDate(value);
    return date ? dateShortFormatter.format(date) : "—";
  }

  function formatDateFull(value) {
    const date = toDate(value);
    return date ? dateFullFormatter.format(date) : "—";
  }

  function formatTime(value) {
    const date = toDate(value);
    return date ? timeFormatter.format(date) : "—";
  }

  function formatDateTime(value) {
    const date = toDate(value);
    if (!date) return "—";
    return `${dateShortFormatter.format(date)}, ${timeFormatter.format(date)}`;
  }

  function categoryLabel(categoryId) {
    const category = categoryById.get(categoryId);
    return category ? category.label : String(categoryId || "Uncategorised");
  }

  function resolveImageSource(source) {
    const value = String(source || "").trim();
    if (!value) return "";
    if (value.startsWith("assets/")) return `../${value}`;
    return value;
  }

  function imageFallbackMarkup(source, name, className = "thumb") {
    const src = resolveImageSource(source);
    const initial = escapeHtml(initialFor(name));
    return (
      `<span class="${className}" data-image-fallback data-initial="${initial}">` +
      (src ? `<img src="${escapeHtml(src)}" alt="">` : "") +
      `</span>`
    );
  }

  function errorMessage(error) {
    if (error && typeof error.message === "string" && error.message) return error.message;
    return "Something went wrong. Please try again.";
  }

  /* ------------------------------------------------------------------------
     Local data store
     ------------------------------------------------------------------------ */

  function readJson(key) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function writeJson(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      throw new Error("This change couldn't be saved. Device storage may be full — try a smaller photo.");
    }
  }

  const settingsDefaults = {
    restaurantName: String(restaurantConfig.name || "Restaurant").trim() || "Restaurant",
    logo: String((CONFIG.settings && CONFIG.settings.logo) || "").trim(),
    whatsappNumber: String(restaurantConfig.whatsappNumber || "[RESTAURANT_WHATSAPP_NUMBER]"),
    openingTiming: String((CONFIG.settings && CONFIG.settings.openingTiming) || "").trim(),
    paymentNote: String((CONFIG.payment && CONFIG.payment.note) || "Pay cash at table").trim(),
  };

  function getSettings() {
    const stored = readJson(KEYS.settings);
    const merged = { ...settingsDefaults };

    if (stored && typeof stored === "object" && !Array.isArray(stored)) {
      if (typeof stored.restaurantName === "string" && stored.restaurantName.trim()) {
        merged.restaurantName = stored.restaurantName.trim();
      }
      if (typeof stored.logo === "string") merged.logo = stored.logo;
      if (typeof stored.whatsappNumber === "string") merged.whatsappNumber = stored.whatsappNumber;
      if (typeof stored.openingTiming === "string") merged.openingTiming = stored.openingTiming;
      if (typeof stored.paymentNote === "string" && stored.paymentNote.trim()) {
        merged.paymentNote = stored.paymentNote.trim();
      }
    }

    return merged;
  }

  function saveSettings(nextSettings) {
    const payload = {
      restaurantName: nextSettings.restaurantName,
      logo: nextSettings.logo,
      whatsappNumber: nextSettings.whatsappNumber,
      openingTiming: nextSettings.openingTiming,
      paymentNote: nextSettings.paymentNote,
    };
    writeJson(KEYS.settings, payload);
    return payload;
  }

  function defaultMenuItems() {
    return (Array.isArray(CONFIG.menu) ? CONFIG.menu : []).map((item) => ({
      ...item,
      active: item.active !== false,
    }));
  }

  function getMenuItems() {
    if (window.Tenant && typeof Tenant.ensureSampleMenuItems === "function") {
      Tenant.ensureSampleMenuItems(tenantRestaurantId);
    }

    const stored = readJson(KEYS.menu);
    if (Array.isArray(stored)) {
      return stored
        .filter((item) => item && typeof item === "object" && item.id && item.name)
        .map((item) => ({ ...item, active: item.active !== false }));
    }
    return defaultMenuItems();
  }

  function saveMenuItems(items) {
    writeJson(KEYS.menu, items);
  }

  function getTables() {
    const stored = readJson(KEYS.tables);
    const source = Array.isArray(stored)
      ? stored
      : Array.isArray(CONFIG.tables && CONFIG.tables.defaults)
        ? CONFIG.tables.defaults
        : [];

    return source
      .map((table) => {
        const number = Number(table && table.number);
        const name = String((table && table.name) || "").trim();
        return {
          number,
          name: name || (Number.isInteger(number) ? `Table ${number}` : ""),
        };
      })
      .filter((table) => Number.isInteger(table.number) && table.number > 0)
      .sort((a, b) => a.number - b.number);
  }

  function saveTables(tables) {
    writeJson(KEYS.tables, tables);
  }

  const DEAL_MIN_PRODUCTS = 1;
  const DEAL_MIN_QUANTITY = 1;
  const DEAL_MAX_QUANTITY = 10;

  function normalizeOfferTime(value) {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(value || "").trim());
    return match ? `${match[1]}:${match[2]}` : "";
  }

  function normalizeDealItems(rawItems) {
    if (!Array.isArray(rawItems)) return [];

    return rawItems
      .map((raw) => {
        if (!raw || typeof raw !== "object") return null;
        const name = String(raw.name || "").trim();
        const price = Number(raw.price);
        const quantity = Math.min(
          DEAL_MAX_QUANTITY,
          Math.max(DEAL_MIN_QUANTITY, Math.round(Number(raw.quantity) || DEAL_MIN_QUANTITY))
        );
        if (!name || !Number.isFinite(price) || price < 0) return null;

        return {
          productId: String(raw.productId || raw.id || "").trim(),
          name,
          price: Math.round(price),
          quantity,
          image: typeof raw.image === "string" ? raw.image : "",
        };
      })
      .filter(Boolean);
  }

  function getOffers() {
    const stored = readJson(KEYS.offers);
    if (!Array.isArray(stored)) return [];

    return stored
      .map((raw) => {
        if (!raw || typeof raw !== "object") return null;

        const name = String(raw.name || raw.title || "").trim();
        if (!name) return null;

        const base = {
          id: String(raw.id || slugify(name)),
          title: name,
          name,
          description: String(raw.description || "").trim(),
          startDate: String(raw.startDate || ""),
          endDate: String(raw.endDate || ""),
          startTime: normalizeOfferTime(raw.startTime),
          endTime: normalizeOfferTime(raw.endTime),
          active: raw.active !== false,
          createdAt: String(raw.createdAt || ""),
          updatedAt: String(raw.updatedAt || ""),
        };

        const items = normalizeDealItems(raw.items);
        const isDeal = raw.type === "deal" || Array.isArray(raw.items);

        if (!isDeal) {
          return {
            ...base,
            type: "offer",
            discount: Math.max(0, Math.min(100, Math.round(Number(raw.discount) || 0))),
          };
        }

        const originalTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const dealPrice = Math.max(0, Math.round(Number(raw.dealPrice) || 0));

        return {
          ...base,
          type: "deal",
          image: typeof raw.image === "string" ? raw.image : "",
          items,
          pricingMode: ["price", "percent", "fixed"].includes(raw.pricingMode)
            ? raw.pricingMode
            : "price",
          dealPrice,
          discountValue: Math.max(0, Number(raw.discountValue) || 0),
          originalTotal,
          savings: Math.max(0, originalTotal - dealPrice),
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        const stampA = a.type === "deal" ? a.updatedAt || a.createdAt : a.startDate;
        const stampB = b.type === "deal" ? b.updatedAt || b.createdAt : b.startDate;
        return String(stampB || "").localeCompare(String(stampA || ""));
      });
  }

  function saveOffers(offers) {
    writeJson(KEYS.offers, offers);
  }

  function getDeals() {
    return getOffers().filter((offer) => offer.type === "deal");
  }

  function getLegacyOffers() {
    return getOffers().filter((offer) => offer.type !== "deal");
  }

  function migrateLegacyDealRecords() {
    const legacyDeals = readJson(KEYS.deals);
    if (!Array.isArray(legacyDeals) || !legacyDeals.length) return;

    const storedOffers = readJson(KEYS.offers);
    const offers = Array.isArray(storedOffers)
      ? storedOffers.filter((entry) => entry && typeof entry === "object")
      : [];
    const menuById = new Map(getMenuItems().map((item) => [item.id, item]));
    const existingIds = new Set(offers.map((entry) => String(entry.id || "")));

    legacyDeals.forEach((deal) => {
      if (!deal || typeof deal !== "object") return;

      const name = String(deal.title || deal.name || "").trim();
      if (!name) return;

      const id = String(deal.id || slugify(name));
      if (existingIds.has(id)) return;

      const items = (Array.isArray(deal.items) ? deal.items : [])
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;
          const menuItem = menuById.get(String(entry.id || ""));
          const itemName = String(entry.name || (menuItem && menuItem.name) || "").trim();
          const price = Number(menuItem ? menuItem.price : entry.price);
          const quantity = Math.max(1, Math.round(Number(entry.quantity) || 1));
          if (!itemName || !Number.isFinite(price)) return null;
          return {
            productId: String(entry.id || ""),
            name: itemName,
            price: Math.round(price),
            quantity,
            image: String((menuItem && menuItem.image) || entry.image || ""),
          };
        })
        .filter(Boolean);

      if (!items.length) return;

      const originalTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const dealPrice = Math.max(0, Math.round(Number(deal.price || deal.dealPrice) || 0));

      offers.push({
        id,
        type: "deal",
        name,
        title: name,
        description: String(deal.description || "").trim(),
        image: "",
        items,
        pricingMode: "price",
        dealPrice,
        discountValue: 0,
        originalTotal,
        savings: Math.max(0, originalTotal - dealPrice),
        startDate: String(deal.startDate || ""),
        endDate: String(deal.endDate || ""),
        startTime: "",
        endTime: "",
        active: deal.active !== false,
        createdAt: String(deal.createdAt || ""),
        updatedAt: String(deal.updatedAt || new Date().toISOString()),
      });
      existingIds.add(id);
    });

    try {
      writeJson(KEYS.offers, offers);
      window.localStorage.removeItem(KEYS.deals);
    } catch {
      // Leave the old records in place if the migrated copy could not be written.
    }
  }

  const FEEDBACK_STATUSES = ["Pending", "Approved", "Rejected"];

  function normalizeFeedback(raw) {
    if (!raw || typeof raw !== "object") return null;

    const stars = Math.round(Number(raw.stars));
    const orderNumber = String(raw.orderNumber || "").trim();
    if (!Number.isInteger(stars) || stars < 1 || stars > 5 || !orderNumber) return null;

    const tableNumber = Number(raw.tableNumber);
    const status = FEEDBACK_STATUSES.includes(raw.status) ? raw.status : "Pending";
    const mode = ORDER_MODES.includes(raw.mode) ? raw.mode : "dine-in";

    return {
      id: String(raw.id || `${orderNumber}-${raw.time || Date.now()}`),
      orderNumber,
      restaurantId: String(raw.restaurantId || tenantRestaurantId),
      tableNumber: Number.isInteger(tableNumber) && tableNumber > 0 ? tableNumber : null,
      mode,
      stars,
      comment: String(raw.comment || "").trim().slice(0, 300),
      time: String(raw.time || new Date().toISOString()),
      status,
      visible: raw.visible === true,
      moderatedAt: String(raw.moderatedAt || ""),
    };
  }

  function getFeedback() {
    const stored = readJson(KEYS.feedback);
    if (!Array.isArray(stored)) return [];
    return stored
      .map(normalizeFeedback)
      .filter(Boolean)
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }

  function saveFeedback(entries) {
    writeJson(KEYS.feedback, entries);
    return entries;
  }

  function moderateFeedback(feedbackId, status, visible) {
    const feedback = getFeedback();
    const entry = feedback.find((item) => item.id === feedbackId);
    if (!entry) {
      showToast("That feedback could not be found.", "error");
      return;
    }

    entry.status = status;
    entry.visible = Boolean(visible);
    entry.moderatedAt = new Date().toISOString();

    try {
      saveFeedback(feedback);
    } catch (error) {
      showToast(errorMessage(error), "error");
      return;
    }

    renderCurrentPage({ keepScroll: true });
    showToast(
      status === "Approved"
        ? visible
          ? "Feedback approved and shown on the customer menu."
          : "Feedback approved. Use Show to publish it on the menu."
        : status === "Rejected"
          ? "Feedback rejected. It stays hidden from the customer menu."
          : "Feedback updated."
    );
  }

  function setFeedbackVisibility(feedbackId, visible) {
    const feedback = getFeedback();
    const entry = feedback.find((item) => item.id === feedbackId);
    if (!entry) {
      showToast("That feedback could not be found.", "error");
      return;
    }

    entry.visible = Boolean(visible);
    entry.moderatedAt = new Date().toISOString();

    try {
      saveFeedback(feedback);
    } catch (error) {
      showToast(errorMessage(error), "error");
      return;
    }

    renderCurrentPage({ keepScroll: true });
    showToast(visible ? "Feedback shown on the customer menu." : "Feedback hidden from the customer menu.");
  }

  function feedbackStarsHtml(stars) {
    const rating = Math.max(0, Math.min(5, Math.round(Number(stars) || 0)));
    return (
      `<span class="feedback-stars" role="img" aria-label="${rating} out of 5 stars">` +
      Array.from({ length: 5 }, (_, index) =>
        `<span class="feedback-star${index < rating ? " is-filled" : ""}" aria-hidden="true">${icon("star")}</span>`
      ).join("") +
      `</span>`
    );
  }

  function feedbackTableLabel(feedback) {
    if (feedback.tableNumber) return `Table ${feedback.tableNumber}`;
    return ORDER_MODE_LABELS[feedback.mode] || "No table";
  }

  function feedbackItemHtml(feedback) {
    const statusTone = feedback.status.toLowerCase();
    const approved = feedback.status === "Approved";
    const rejected = feedback.status === "Rejected";
    const feedbackId = escapeHtml(feedback.id);

    return (
      `<article class="feedback-item feedback-item--${statusTone}">` +
      `<div class="feedback-item-top">` +
      feedbackStarsHtml(feedback.stars) +
      `<div class="feedback-chips">` +
      `<span class="feedback-status feedback-status--${statusTone}">${escapeHtml(feedback.status)}</span>` +
      `<span class="feedback-visibility${feedback.visible ? " is-shown" : ""}">${feedback.visible ? "Shown" : "Hidden"}</span>` +
      `</div>` +
      `</div>` +
      `<p class="feedback-comment">${escapeHtml(feedback.comment || "No comment left.")}</p>` +
      `<div class="feedback-meta">` +
      `<span>${icon("qr")}${escapeHtml(feedbackTableLabel(feedback))}</span>` +
      `<span>${icon("receipt")}${escapeHtml(feedback.orderNumber)}</span>` +
      `<span>${icon("clock")}${escapeHtml(formatDateTime(feedback.time))}</span>` +
      `</div>` +
      `<div class="feedback-actions">` +
      `<button class="btn btn-secondary btn-xs" type="button" data-action="feedback-approve" data-feedback-id="${feedbackId}"${approved ? " disabled" : ""}>${icon("check")}Approve</button>` +
      `<button class="btn btn-secondary btn-xs" type="button" data-action="feedback-reject" data-feedback-id="${feedbackId}"${rejected ? " disabled" : ""}>${icon("alert")}Reject</button>` +
      `<button class="btn btn-secondary btn-xs" type="button" data-action="feedback-show" data-feedback-id="${feedbackId}"${feedback.visible ? " disabled" : ""}>${icon("eye")}Show</button>` +
      `<button class="btn btn-secondary btn-xs" type="button" data-action="feedback-hide" data-feedback-id="${feedbackId}"${feedback.visible ? "" : " disabled"}>${icon("eye-off")}Hide</button>` +
      `<button class="icon-button icon-button--sm icon-button--danger" type="button" data-action="feedback-delete" data-feedback-id="${feedbackId}" aria-label="Delete feedback ${escapeHtml(feedback.orderNumber)}">${icon("trash")}</button>` +
      `</div>` +
      `</article>`
    );
  }

  function renderFeedbackPage(view) {
    const feedback = getFeedback();
    const shown = feedback.filter((entry) => entry.status === "Approved" && entry.visible);
    const pending = feedback.filter((entry) => entry.status === "Pending");
    const average = feedback.length
      ? (feedback.reduce((sum, entry) => sum + entry.stars, 0) / feedback.length).toFixed(1)
      : "—";

    view.innerHTML =
      pageHeaderHtml({
        title: "Guest Feedback",
        subtitle: "Only approved feedback marked Shown appears on the customer menu.",
      }) +
      `<section class="panel feedback-panel">` +
      `<div class="panel-head"><div><h2 class="panel-title">Feedback inbox</h2>` +
      `<p class="panel-sub">Newest first. Guest comments are saved with their order and table.</p></div>` +
      `<div class="feedback-summary">` +
      `<span><strong>${escapeHtml(average)}</strong> average</span>` +
      `<span><strong>${pending.length}</strong> pending</span>` +
      `<span><strong>${shown.length}</strong> shown</span>` +
      `</div>` +
      `</div>` +
      (feedback.length
        ? `<div class="feedback-list">${feedback.map(feedbackItemHtml).join("")}</div>`
        : emptyStateHtml({
            icon: "star",
            title: "No feedback yet",
            message: "When a served guest rates their order, the feedback appears here for review.",
          })) +
      `</section>`;
  }

  function deleteFeedbackEntry(feedbackId) {
    const feedback = getFeedback();
    const entry = feedback.find((item) => item.id === feedbackId);
    if (!entry) {
      showToast("That feedback could not be found.", "error");
      return;
    }

    confirmDialog({
      title: "Delete feedback?",
      message: `Feedback for ${entry.orderNumber} will be permanently removed from this device.`,
      confirmLabel: "Delete feedback",
      tone: "danger",
      onConfirm() {
        try {
          saveFeedback(feedback.filter((item) => item.id !== feedbackId));
        } catch (error) {
          showToast(errorMessage(error), "error");
          return false;
        }
        showToast("Feedback deleted.", "warning");
        renderCurrentPage({ keepScroll: true });
        return true;
      },
    });
  }

  function getOrders() {
    const stored = readJson(KEYS.orders);
    if (!Array.isArray(stored)) return [];

    return stored
      .filter((order) => order && typeof order === "object")
      .map((order) => {
        const mode = ORDER_MODES.includes(order.mode) ? order.mode : "dine-in";
        if (mode !== "dine-in" && !String(order.tableNumber || "").trim()) {
          return { ...order, mode, tableNumber: ORDER_MODE_LABELS[mode] };
        }
        return order;
      });
  }

  function saveOrders(orders) {
    writeJson(KEYS.orders, orders);
  }

  function sortByTimeDesc(entries) {
    return [...entries].sort((a, b) => {
      const timeA = new Date(a && a.time).getTime();
      const timeB = new Date(b && b.time).getTime();
      return (Number.isFinite(timeB) ? timeB : 0) - (Number.isFinite(timeA) ? timeA : 0);
    });
  }

  function getWaiterCalls() {
    const stored = readJson(KEYS.waiterCalls);
    if (!Array.isArray(stored)) return [];

    return sortByTimeDesc(
      stored
        .filter((call) => call && typeof call === "object")
        .map((call) => {
          const tableNumber = Number(call.tableNumber);
          if (!Number.isInteger(tableNumber) || tableNumber < 1) return null;
          return {
            id: String(call.id || `WAITER-${tableNumber}-${call.time || ""}`),
            tableNumber,
            time: call.time || "",
            status: call.status === SERVICE_ATTENDED ? SERVICE_ATTENDED : SERVICE_PENDING,
            attendedTime: call.attendedTime || "",
            attendedBy: call.attendedBy || "",
          };
        })
        .filter(Boolean)
    );
  }

  function saveWaiterCalls(calls) {
    writeJson(KEYS.waiterCalls, calls);
  }

  function normalizeBillItem(item) {
    if (!item || typeof item !== "object") return null;
    const name = String(item.name || "").trim();
    const price = Number(item.price);
    const quantity = Number(item.quantity);
    if (!name || !Number.isFinite(quantity) || quantity <= 0) return null;
    const safePrice = Number.isFinite(price) && price >= 0 ? price : 0;
    return {
      id: String(item.id || name),
      name,
      price: safePrice,
      quantity,
      lineTotal: safePrice * quantity,
    };
  }

  function getBillRequests() {
    const stored = readJson(KEYS.billRequests);
    if (!Array.isArray(stored)) return [];

    return sortByTimeDesc(
      stored
        .filter((request) => request && typeof request === "object")
        .map((request) => {
          const tableNumber = Number(request.tableNumber);
          if (!Number.isInteger(tableNumber) || tableNumber < 1) return null;
          const total = Number(request.total);
          return {
            id: String(request.id || `BILL-${tableNumber}-${request.time || ""}`),
            tableNumber,
            orderNumbers: Array.isArray(request.orderNumbers)
              ? request.orderNumbers.map((number) => String(number || "").trim()).filter(Boolean)
              : [],
            items: (Array.isArray(request.items) ? request.items : [])
              .map(normalizeBillItem)
              .filter(Boolean),
            total: Number.isFinite(total) && total >= 0 ? total : 0,
            time: request.time || "",
            status: request.status === BILL_PAID ? BILL_PAID : SERVICE_PENDING,
            paidTime: request.paidTime || "",
            paidBy: request.paidBy || "",
          };
        })
        .filter(Boolean)
    );
  }

  function saveBillRequests(requests) {
    writeJson(KEYS.billRequests, requests);
  }

  function sortOrders(orders) {
    return [...orders].sort((a, b) => {
      const timeA = new Date(a && a.time).getTime();
      const timeB = new Date(b && b.time).getTime();
      const safeA = Number.isFinite(timeA) ? timeA : 0;
      const safeB = Number.isFinite(timeB) ? timeB : 0;
      if (safeA !== safeB) return safeB - safeA;

      const numberA = Number.parseInt(String((a && a.orderNumber) || "").replace(/\D/g, ""), 10) || 0;
      const numberB = Number.parseInt(String((b && b.orderNumber) || "").replace(/\D/g, ""), 10) || 0;
      return numberB - numberA;
    });
  }

  function orderTotal(order) {
    const total = Number(order && order.total);
    if (Number.isFinite(total)) return total;
    const subtotal = Number(order && order.subtotal);
    return Number.isFinite(subtotal) ? subtotal : 0;
  }

  function orderItemTotal(order) {
    const items = Array.isArray(order && order.items) ? order.items : [];
    return items.reduce((sum, item) => sum + (Number(item && item.quantity) || 0), 0);
  }

  function orderItemContentsText(item) {
    const contents = Array.isArray(item && item.contents) ? item.contents : [];
    return contents
      .map((entry) => {
        const quantity = Math.max(0, Math.round(Number(entry && entry.quantity) || 0));
        const name = String((entry && entry.name) || "").trim();
        if (!name || !quantity) return "";
        return `${quantity}x ${name}`;
      })
      .filter(Boolean)
      .join(" + ");
  }

  function isDealOrderItem(item) {
    return Boolean(item && (item.type === "deal" || item.isDeal === true || item.dealId));
  }

  function orderItemDealName(item) {
    return String((item && (item.dealName || item.name)) || "").trim() || "Deal";
  }

  function orderItemDisplayName(item) {
    const name = String((item && item.name) || "").trim() || "Item";
    const quantity = Math.max(0, Math.round(Number(item && item.quantity) || 0));
    const contentsText = orderItemContentsText(item);
    const base = quantity > 0 ? `${quantity}x ${name}` : name;
    if (!contentsText) return base;
    return `${base} (${isDealOrderItem(item) ? "Includes" : "each"}: ${contentsText})`;
  }

  function orderItemsLabel(order) {
    const items = Array.isArray(order && order.items) ? order.items : [];
    const names = items.map(orderItemDisplayName).filter(Boolean);
    if (!names.length) return "No items recorded";
    if (names.length === 1) return names[0];
    return `${names[0]} +${names.length - 1} more`;
  }

  function getPendingOrders(orders = getOrders()) {
    return sortOrders(orders).filter((order) => PENDING_STATUSES.includes(order && order.status));
  }

  function tableLabel(number) {
    const tableNumber = Number(number);
    const table = getTables().find((entry) => entry.number === tableNumber);
    return table ? table.name : `Table ${Number.isFinite(tableNumber) ? tableNumber : "—"}`;
  }

  function orderTableNumber(order) {
    const tableNumber = Number(order && order.tableNumber);
    return Number.isInteger(tableNumber) && tableNumber > 0 ? tableNumber : null;
  }

  function orderMode(order) {
    const mode = String((order && order.mode) || "").trim();
    return ORDER_MODES.includes(mode) ? mode : "dine-in";
  }

  function orderModeLabel(orderOrMode) {
    const mode = typeof orderOrMode === "string" ? orderOrMode : orderMode(orderOrMode);
    return ORDER_MODE_LABELS[mode] || ORDER_MODE_LABELS["dine-in"];
  }

  function orderModeFlagHtml(mode, options = {}) {
    const safeMode = ORDER_MODES.includes(mode) ? mode : "dine-in";
    const sizeClass = options.large ? " mode-flag--lg" : "";
    const iconName = safeMode === "takeaway" ? "bag" : safeMode === "delivery" ? "truck" : "receipt";
    return (
      `<span class="mode-flag mode-flag--${safeMode}${sizeClass}">` +
      `${icon(iconName)}<span>${escapeHtml(orderModeLabel(safeMode))}</span>` +
      `</span>`
    );
  }

  function orderCustomerLine(order) {
    const name = String((order && order.customerName) || "").trim();
    const mobile = String((order && order.customerMobile) || "").trim();
    return [name, mobile].filter(Boolean).join(" · ");
  }

  function orderDestinationText(order) {
    const mode = orderMode(order);
    if (mode === "dine-in") {
      const tableNumber = orderTableNumber(order);
      return tableNumber ? tableLabel(tableNumber) : "Dine-in · No table";
    }
    if (mode === "delivery") {
      const address = String((order && order.deliveryAddress) || "").trim();
      return address ? `Delivery · ${address}` : "Delivery";
    }
    return "Takeaway";
  }

  function paymentNoteForOrder(order) {
    const paymentConfig = CONFIG.payment || {};
    const mode = orderMode(order);
    const fallback =
      mode === "takeaway"
        ? paymentConfig.takeawayNote
        : mode === "delivery"
          ? paymentConfig.deliveryNote
          : paymentConfig.note;
    return String(
      (order && order.paymentNote) || fallback || settingsDefaults.paymentNote || "Pay cash at table"
    ).trim();
  }

  function orderDestinationHtml(order, options = {}) {
    const mode = orderMode(order);

    if (mode === "dine-in") {
      return (
        `<span class="order-destination">` +
        tableFlagHtml(orderTableNumber(order), options) +
        `<span class="mode-tag">Dine-in</span>` +
        `</span>`
      );
    }

    const customer = orderCustomerLine(order);
    const address = mode === "delivery" ? String((order && order.deliveryAddress) || "").trim() : "";

    return (
      `<span class="order-destination order-destination--mode">` +
      orderModeFlagHtml(mode) +
      (customer ? `<span class="mode-contact">${escapeHtml(customer)}</span>` : "") +
      (address ? `<span class="mode-address">${escapeHtml(address)}</span>` : "") +
      `</span>`
    );
  }

  function tableFlagHtml(number, options = {}) {
    const tableNumber = Number(number);
    const hasTable = Number.isInteger(tableNumber) && tableNumber > 0;
    const sizeClass = options.large ? " table-flag--lg" : "";

    if (!hasTable) {
      return `<span class="table-flag table-flag--missing${sizeClass}"><span class="table-flag-label">No table</span></span>`;
    }

    return (
      `<span class="table-flag${sizeClass}" aria-label="${escapeHtml(tableLabel(tableNumber))}">` +
      `<span class="table-flag-label">Table</span>` +
      `<span class="table-flag-number">${tableNumber}</span>` +
      `</span>`
    );
  }

  function orderIdentityHtml(order) {
    return (
      `<div class="order-identity">` +
      `<div class="order-identity-copy">` +
      `<span class="cell-strong">#${escapeHtml((order && order.orderNumber) || "—")}</span>` +
      `<span class="cell-sub">${escapeHtml(formatDateTime(order && order.time))}</span>` +
      `</div>` +
      orderDestinationHtml(order) +
      `</div>`
    );
  }

  function getNextStatus(status) {
    const index = STATUS_FLOW.indexOf(status);
    if (index < 0 || index >= STATUS_FLOW.length - 1) return null;
    return STATUS_FLOW[index + 1];
  }

  function allowedNextStatus(order) {
    const nextStatus = getNextStatus(order && order.status);
    if (!nextStatus) return null;

    const role = currentRole();
    if (role === "Owner" || role === "Manager") return nextStatus;
    if (role === "Kitchen") {
      return KITCHEN_STATUSES.includes(order.status) ? nextStatus : null;
    }
    if (role === "Waiter") {
      return order.status === "Ready" ? "Served" : null;
    }
    return null;
  }

  function isNewOrder(order) {
    return Boolean(order) && order.status === "Received";
  }

  function statusBadge(status) {
    const safeStatus = STATUS_FLOW.includes(status) ? status : "Received";
    return (
      `<span class="status status--${safeStatus.toLowerCase()}">` +
      `<span class="status-dot" aria-hidden="true"></span>${escapeHtml(safeStatus)}</span>`
    );
  }

  function offerState(offer) {
    if (offer.active === false) return { label: "Hidden", tone: "muted" };
    const today = startOfDay();
    const start = parseDateOnly(offer.startDate);
    const end = parseDateOnly(offer.endDate);
    if (start && today < start) return { label: "Scheduled", tone: "warning" };
    if (end && today > end) return { label: "Expired", tone: "muted" };
    return { label: "Active", tone: "success" };
  }

  /* ------------------------------------------------------------------------
     Auth
     ------------------------------------------------------------------------ */

  function getRestaurantRecord(restaurantId = tenantRestaurantId) {
    return Tenant.getRestaurant(restaurantId);
  }

  function ownerCredentialsFor(restaurantId = tenantRestaurantId) {
    const restaurant = getRestaurantRecord(restaurantId);
    const fallback = adminConfig.credentials || {};
    return {
      username: String((restaurant && restaurant.adminUsername) || fallback.username || "[ADMIN_USERNAME]"),
      password: String((restaurant && restaurant.adminPassword) || fallback.password || "[ADMIN_PASSWORD]"),
    };
  }

  function seedStaff(restaurantId = tenantRestaurantId) {
    const restaurant = getRestaurantRecord(restaurantId);
    const credentials = ownerCredentialsFor(restaurantId);
    const owner = {
      id: "staff-owner",
      name: String((restaurant && restaurant.ownerName) || "Restaurant Owner").trim() || "Restaurant Owner",
      role: "Owner",
      username: credentials.username,
      password: credentials.password,
      active: true,
    };

    if (restaurantId !== Tenant.DEFAULT_RESTAURANT_ID) return [owner];

    return [
      owner,
      {
        id: "staff-manager",
        name: "Duty Manager",
        role: "Manager",
        username: "manager",
        password: DEFAULT_STAFF_PASSWORD,
        active: true,
      },
      {
        id: "staff-kitchen",
        name: "Kitchen Lead",
        role: "Kitchen",
        username: "kitchen",
        password: DEFAULT_STAFF_PASSWORD,
        active: true,
      },
      {
        id: "staff-waiter",
        name: "Floor Waiter",
        role: "Waiter",
        username: "waiter",
        password: DEFAULT_STAFF_PASSWORD,
        active: true,
      },
    ];
  }

  function normalizeStaffMember(member, index = 0) {
    if (!member || typeof member !== "object") return null;

    const name = String(member.name || "").trim();
    const username = String(member.username || "").trim();
    const role = STAFF_ROLES.includes(member.role) ? member.role : "";

    if (!name || !username || !role) return null;

    return {
      id: String(member.id || `staff-${index + 1}`),
      name,
      role,
      username,
      password: String(member.password == null ? "" : member.password),
      active: member.active !== false,
    };
  }

  function readStaffFor(restaurantId, options = {}) {
    const seed = options.seed !== false;
    const stored = readJson(Tenant.storageKeys(restaurantId).staff);
    if (!Array.isArray(stored) || !stored.length) {
      return seed ? seedStaff(restaurantId) : [];
    }

    const members = stored.map((member, index) => normalizeStaffMember(member, index)).filter(Boolean);
    return members.length ? members : seed ? seedStaff(restaurantId) : [];
  }

  function getStaff() {
    return readStaffFor(tenantRestaurantId);
  }

  function saveStaffMembers(members) {
    writeJson(KEYS.staff, members);
  }

  function sessionFromStaff(member, restaurantId = tenantRestaurantId) {
    return {
      id: member.id,
      username: member.username,
      name: member.name,
      role: member.role,
      restaurantId,
    };
  }

  function getSession() {
    try {
      const raw = window.sessionStorage.getItem(sessionKey);
      if (!raw) return null;

      if (raw === "1") {
        const restaurantId = Tenant.DEFAULT_RESTAURANT_ID;
        const owner = readStaffFor(restaurantId).find(
          (member) => member.role === "Owner" && member.active
        );
        return owner ? sessionFromStaff(owner, restaurantId) : null;
      }

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || !STAFF_ROLES.includes(parsed.role)) return null;

      return {
        id: String(parsed.id || ""),
        username: String(parsed.username || ""),
        name: String(parsed.name || "Staff"),
        role: parsed.role,
        restaurantId:
          String(parsed.restaurantId || "").trim() || Tenant.DEFAULT_RESTAURANT_ID,
      };
    } catch {
      return null;
    }
  }

  function setSession(member) {
    try {
      if (member) {
        window.sessionStorage.setItem(
          sessionKey,
          JSON.stringify({
            id: member.id,
            username: member.username,
            name: member.name,
            role: member.role,
            restaurantId: member.restaurantId || tenantRestaurantId,
          })
        );
      } else {
        window.sessionStorage.removeItem(sessionKey);
      }
    } catch {
      // A blocked sessionStorage means the guard redirects on the next page.
    }
  }

  function getActiveSession() {
    const session = getSession();
    if (!session) return null;

    const restaurantId = session.restaurantId || Tenant.DEFAULT_RESTAURANT_ID;
    if (!Tenant.getRestaurant(restaurantId)) return null;

    const staff = readStaffFor(restaurantId).find(
      (member) =>
        (session.id && member.id === session.id) ||
        member.username.toLowerCase() === session.username.toLowerCase()
    );

    if (!staff || !staff.active) return null;
    return sessionFromStaff(staff, restaurantId);
  }

  function isLoggedIn() {
    return Boolean(getActiveSession());
  }

  function authenticateLogin(username, password) {
    const wanted = String(username || "").trim().toLowerCase();
    const secret = String(password || "");
    if (!wanted || !secret) {
      return { ok: false, message: "Wrong username or password" };
    }

    const restaurants = Tenant.getRestaurants();
    for (const restaurant of restaurants) {
      const member = readStaffFor(restaurant.id).find(
        (staff) =>
          staff.active &&
          staff.username.toLowerCase() === wanted &&
          staff.password === secret
      );

      if (!member) continue;

      if (restaurant.status === "Expired") {
        return {
          ok: false,
          blocked: true,
          message: "Your plan has expired. Please contact support to renew.",
        };
      }

      if (restaurant.status === "Disabled") {
        return {
          ok: false,
          blocked: true,
          message: "This restaurant is disabled. Please contact support.",
        };
      }

      return {
        ok: true,
        member: sessionFromStaff(member, restaurant.id),
        restaurant,
      };
    }

    return { ok: false, message: "Wrong username or password" };
  }

  function currentSession() {
    return state.session || getSession();
  }

  function currentRole() {
    const session = currentSession();
    return session && STAFF_ROLES.includes(session.role) ? session.role : "Owner";
  }

  function roleHome(role = currentRole()) {
    return ROLE_HOME[role] || "index.html";
  }

  function canAccessPage(pageId, role = currentRole()) {
    if (role === "Owner") return true;
    return (ROLE_ACCESS[role] || []).includes(pageId);
  }

  function isOwner() {
    return currentRole() === "Owner";
  }

  function canSendOrderAlerts() {
    const role = currentRole();
    return role === "Owner" || role === "Manager";
  }

  function signOut() {
    setSession(null);
    window.location.replace("login.html");
  }

  /* ------------------------------------------------------------------------
     Toasts, dialogs and popovers
     ------------------------------------------------------------------------ */

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

  function openModal(options) {
    const root = document.getElementById("admin-modal-root");
    if (!root) return;

    if (state.modalOpen) closeModal({ immediate: true });

    const sizeClass =
      options.size === "sm"
        ? " modal--sm"
        : options.size === "xl"
          ? " modal--xl"
          : options.size === "lg"
            ? " modal--lg"
            : "";
    root.innerHTML =
      `<div class="modal-overlay">` +
      `<button class="modal-backdrop" type="button" aria-label="Close dialog" tabindex="-1" data-modal-close></button>` +
      `<section class="modal${sizeClass}" role="dialog" aria-modal="true" aria-labelledby="admin-modal-title">` +
      `<header class="modal-head">` +
      `<div>` +
      (options.kicker ? `<p class="modal-kicker">${escapeHtml(options.kicker)}</p>` : "") +
      `<h2 class="modal-title" id="admin-modal-title">${escapeHtml(options.title || "")}</h2>` +
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
    overlay.hidden = false;
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
    if (!overlay) return;

    const finish = () => {
      overlay.remove();
      state.modalOpen = false;
      document.body.classList.remove("modal-open");

      const trigger = state.modalTrigger;
      state.modalTrigger = null;
      if (trigger && trigger.isConnected && typeof trigger.focus === "function") {
        trigger.focus({ preventScroll: true });
      }

      if (state.pendingRefresh) {
        state.pendingRefresh = false;
        renderCurrentPage({ keepScroll: true });
      }
    };

    if (options.immediate) {
      finish();
      return;
    }

    overlay.classList.remove("is-open");
    window.setTimeout(finish, MODAL_CLOSE_MS);
  }

  function confirmDialog(options) {
    const confirmClass = options.tone === "danger" ? "btn-danger" : "btn-primary";
    openModal({
      title: options.title,
      subtitle: options.subtitle || "",
      size: "sm",
      body: options.body || `<p class="confirm-message">${escapeHtml(options.message || "")}</p>`,
      footer:
        `<button class="btn btn-secondary" type="button" data-modal-close>Cancel</button>` +
        `<button class="btn ${confirmClass}" type="button" data-confirm-action>${escapeHtml(options.confirmLabel || "Confirm")}</button>`,
      onMount(overlay) {
        const confirmButton = overlay.querySelector("[data-confirm-action]");
        confirmButton.addEventListener("click", () => {
          confirmButton.disabled = true;
          try {
            const shouldStayOpen = options.onConfirm();
            if (shouldStayOpen !== false) closeModal();
          } catch (error) {
            showToast(errorMessage(error), "error");
          } finally {
            confirmButton.disabled = false;
          }
        });
      },
    });
  }

  function closePopovers() {
    document.querySelectorAll(".popover").forEach((popover) => {
      popover.hidden = true;
    });
    document.querySelectorAll("[data-popover-trigger]").forEach((trigger) => {
      trigger.setAttribute("aria-expanded", "false");
    });
    state.openPopover = null;
  }

  function togglePopover(popoverId, trigger) {
    const popover = document.getElementById(popoverId);
    if (!popover) return;

    const isOpen = !popover.hidden;
    closePopovers();
    if (isOpen) return;

    popover.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    state.openPopover = popoverId;
  }

  function closeRowMenus() {
    document.querySelectorAll(".row-menu").forEach((menu) => {
      menu.hidden = true;
      menu.style.removeProperty("top");
      menu.style.removeProperty("left");
    });
    document.querySelectorAll("[data-row-menu-toggle]").forEach((button) => {
      button.setAttribute("aria-expanded", "false");
    });
  }

  function toggleRowMenu(button) {
    const wrap = button.closest(".row-menu-wrap");
    const menu = wrap ? wrap.querySelector(".row-menu") : null;
    if (!menu) return;

    const isOpen = !menu.hidden;
    closeRowMenus();
    if (isOpen) return;

    menu.hidden = false;
    button.setAttribute("aria-expanded", "true");

    const rect = button.getBoundingClientRect();
    const width = 196;
    const height = menu.offsetHeight;
    let left = rect.right - width;
    left = Math.max(12, Math.min(left, window.innerWidth - width - 12));

    let top = rect.bottom + 6;
    if (top + height > window.innerHeight - 12) {
      top = Math.max(12, rect.top - height - 6);
    }

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  }

  /* ------------------------------------------------------------------------
     Images and downloads
     ------------------------------------------------------------------------ */

  function compressImage(file, options = {}) {
    return new Promise((resolve, reject) => {
      if (!file || !String(file.type).startsWith("image/")) {
        reject(new Error("Choose an image file such as JPG, PNG or WebP."));
        return;
      }

      if (file.size > 15 * 1024 * 1024) {
        reject(new Error("That image is larger than 15 MB. Choose a smaller photo."));
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      const image = new Image();

      image.onload = () => {
        try {
          const maxDimension = options.maxDimension || 720;
          const ratio = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
          const width = Math.max(1, Math.round(image.naturalWidth * ratio));
          const height = Math.max(1, Math.round(image.naturalHeight * ratio));
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const context = canvas.getContext("2d");
          if (!context) throw new Error("The image could not be processed.");

          if (options.background) {
            context.fillStyle = options.background;
            context.fillRect(0, 0, width, height);
          }

          context.drawImage(image, 0, 0, width, height);
          const mime = options.mime || "image/jpeg";
          resolve(canvas.toDataURL(mime, options.quality == null ? 0.82 : options.quality));
        } catch (error) {
          reject(error);
        } finally {
          URL.revokeObjectURL(objectUrl);
        }
      };

      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("That image could not be read. Try a JPG or PNG."));
      };

      image.src = objectUrl;
    });
  }

  function saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("The image could not be created."));
      }, "image/png");
    });
  }

  function waitForFonts() {
    if (!document.fonts) return Promise.resolve();
    return Promise.race([
      document.fonts.ready.catch(() => {}),
      new Promise((resolve) => window.setTimeout(resolve, 1200)),
    ]);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }

    return new Promise((resolve, reject) => {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();

      try {
        const copied = document.execCommand("copy");
        textarea.remove();
        if (copied) resolve();
        else reject(new Error("Copy failed"));
      } catch (error) {
        textarea.remove();
        reject(error);
      }
    });
  }

  function csvCell(value) {
    const text = String(value == null ? "" : value);
    return `"${text.replace(/"/g, '""')}"`;
  }

  function downloadOrdersCsv(orders) {
    if (!orders.length) {
      showToast("There are no orders to export yet.", "warning");
      return;
    }

    const rows = [
      [
        "Order number",
        "Date",
        "Time",
        "Mode",
        "Table",
        "Customer",
        "Mobile",
        "Delivery address",
        "Items",
        "Quantity",
        "Subtotal (Rs.)",
        "Delivery (Rs.)",
        "Total (Rs.)",
        "Status",
        "Payment",
      ],
    ];

    sortOrders(orders).forEach((order) => {
      const items = Array.isArray(order.items) ? order.items : [];
      const mode = orderMode(order);
      const fee = Number(order.deliveryFee) || 0;
      const subtotal = Number.isFinite(Number(order.subtotal))
        ? Number(order.subtotal)
        : Math.max(0, orderTotal(order) - fee);
      rows.push([
        order.orderNumber || "",
        formatDateFull(order.time),
        formatTime(order.time),
        orderModeLabel(mode),
        mode === "dine-in" ? tableLabel(orderTableNumber(order)) : "—",
        order.customerName || "",
        order.customerMobile || "",
        order.deliveryAddress || "",
        items.map((item) => `${item.name || "Item"} x ${Number(item.quantity) || 0}`).join("; "),
        orderItemTotal(order),
        subtotal,
        fee,
        orderTotal(order),
        order.status || "Received",
        paymentNoteForOrder(order),
      ]);
    });

    const csv = "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const filename = `${slugify(getSettings().restaurantName) || "restaurant"}-orders-${localDateKey(new Date())}.csv`;
    saveBlob(blob, filename);
    showToast("Report downloaded as CSV.");
  }

  /* ------------------------------------------------------------------------
     Sound alerts
     ------------------------------------------------------------------------ */

  function isSoundEnabled() {
    try {
      return window.localStorage.getItem(SOUND_KEY) !== "0";
    } catch {
      return true;
    }
  }

  function setSoundEnabled(enabled) {
    try {
      window.localStorage.setItem(SOUND_KEY, enabled ? "1" : "0");
    } catch {
      showToast("Sound preference couldn't be saved in this browser.", "error");
    }
    updateSoundToggles();
  }

  function soundToggleHtml() {
    const enabled = isSoundEnabled();
    return (
      `<button class="sound-toggle${enabled ? "" : " is-off"}" type="button" data-sound-toggle data-shell-action="toggle-sound" ` +
      `aria-pressed="${enabled ? "true" : "false"}" title="${enabled ? "Sound alerts on" : "Sound alerts off"}">` +
      `<span class="sound-toggle-icon" data-sound-icon>${icon(enabled ? "volume" : "volume-off")}</span>` +
      `<span class="sound-toggle-label" data-sound-label>Sound ${enabled ? "on" : "off"}</span>` +
      `</button>`
    );
  }

  function updateSoundToggles() {
    const enabled = isSoundEnabled();
    document.querySelectorAll("[data-sound-toggle]").forEach((button) => {
      button.setAttribute("aria-pressed", enabled ? "true" : "false");
      button.classList.toggle("is-off", !enabled);
      button.title = enabled ? "Sound alerts on" : "Sound alerts off";
      const label = button.querySelector("[data-sound-label]");
      if (label) label.textContent = `Sound ${enabled ? "on" : "off"}`;
      const iconHolder = button.querySelector("[data-sound-icon]");
      if (iconHolder) iconHolder.innerHTML = icon(enabled ? "volume" : "volume-off");
    });
  }

  function playFallbackBeep() {
    try {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return;

      const context = new AudioCtor();
      const start = context.currentTime + 0.01;
      [
        { frequency: 880, at: 0, duration: 0.12 },
        { frequency: 1245, at: 0.17, duration: 0.15 },
      ].forEach((tone) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = tone.frequency;
        gain.gain.setValueAtTime(0.0001, start + tone.at);
        gain.gain.exponentialRampToValueAtTime(0.18, start + tone.at + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.at + tone.duration);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(start + tone.at);
        oscillator.stop(start + tone.at + tone.duration + 0.03);
      });

      window.setTimeout(() => {
        try {
          context.close();
        } catch {
          // Context already closed.
        }
      }, 900);
    } catch {
      // No Web Audio support: the visual toast still alerts the admin.
    }
  }

  function playAlertSound() {
    if (!isSoundEnabled()) return;

    let usedFallback = false;
    const fallback = () => {
      if (usedFallback) return;
      usedFallback = true;
      playFallbackBeep();
    };

    try {
      const audio = new Audio(ALERT_SOUND_SRC);
      audio.preload = "auto";
      audio.volume = 0.8;
      audio.addEventListener("error", fallback, { once: true });
      const playback = audio.play();
      if (playback && typeof playback.catch === "function") playback.catch(fallback);
    } catch {
      fallback();
    }
  }

  function toggleSoundAlerts() {
    const enabled = !isSoundEnabled();
    setSoundEnabled(enabled);
    showToast(
      enabled ? "Sound alerts on. One beep plays for each new order." : "Sound alerts off.",
      enabled ? "success" : "warning"
    );
    if (enabled) playAlertSound();
  }

  function primeAudio() {
    if (state.audioPrimed) return;
    state.audioPrimed = true;
    try {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return;
      const context = new AudioCtor();
      if (context.state === "suspended") context.resume().catch(() => {});
      window.setTimeout(() => {
        try {
          context.close();
        } catch {
          // Context already closed.
        }
      }, 400);
    } catch {
      // Autoplay rules may still block audio; the toast remains.
    }
  }

  /* ------------------------------------------------------------------------
     Shell
     ------------------------------------------------------------------------ */

  function customerMenuHref() {
    const url = new URL("../index.html", window.location.href);
    const queryParam = (CONFIG.table && CONFIG.table.queryParam) || "table";
    const defaultTable = Number(CONFIG.table && CONFIG.table.defaultNumber) || 1;
    url.searchParams.set("restaurant", tenantRestaurantId);
    url.searchParams.set(queryParam, String(defaultTable));
    return url.href;
  }

  function brandMarkHtml(settings, size = "md") {
    const inner = settings.logo
      ? `<img src="${escapeHtml(settings.logo)}" alt="">`
      : `${icon("qr")}<span class="brand-dot" aria-hidden="true"></span>`;

    return (
      `<span class="brand-mark brand-mark--${size}" data-brand-mark ` +
      `data-image-fallback data-initial="${escapeHtml(initialFor(settings.restaurantName))}">${inner}</span>`
    );
  }

  function navItemHtml(item, activeId, pendingCount, showDivider = Boolean(item.divider)) {
    const active = item.id === activeId;
    const divider = showDivider ? '<span class="nav-divider" aria-hidden="true"></span>' : "";
    const badge =
      item.badge && pendingCount
        ? `<span class="nav-badge" data-pending-badge>${pendingCount > 99 ? "99+" : pendingCount}</span>`
        : item.badge
          ? '<span class="nav-badge" data-pending-badge hidden>0</span>'
          : "";

    return (
      divider +
      `<a class="nav-link${active ? " is-active" : ""}" href="${item.href}" data-nav-id="${item.id}"` +
      `${active ? ' aria-current="page"' : ""}>` +
      `<span class="nav-icon">${icon(item.icon)}</span>` +
      `<span class="nav-label">${escapeHtml(item.label)}</span>` +
      badge +
      `</a>`
    );
  }

  function getActiveNavId() {
    if (state.page === "dashboard" && window.location.hash === "#reports") return "reports";
    return state.page;
  }

  function notificationItemsHtml() {
    const pending = getPendingOrders().slice(0, 4);

    if (!pending.length) {
      return (
        `<div class="popover-empty">` +
        `<span class="popover-empty-icon">${icon("check")}</span>` +
        `<p>No pending orders right now.</p>` +
        `</div>`
      );
    }

    return pending
      .map(
        (order) =>
          `<a class="notification-item" href="orders.html?order=${encodeURIComponent(order.orderNumber)}">` +
          `<span class="notification-icon">${icon("receipt")}</span>` +
          `<span class="notification-copy">` +
          `<strong>${escapeHtml(order.orderNumber)}</strong>` +
          `<span>${escapeHtml(orderDestinationText(order))} · ${formatMoney(orderTotal(order))}</span>` +
          `</span>` +
          statusBadge(order.status) +
          `</a>`
      )
      .join("");
  }

  function renderShell() {
    const root = document.getElementById("admin-root");
    if (!root) return;

    const settings = getSettings();
    const session = state.session || getSession() || { id: "", name: "Restaurant Admin", role: "Owner", username: "" };
    const pending = getPendingOrders().length;
    const activeId = getActiveNavId();
    const navItems = NAV_ITEMS.filter((item) => canAccessPage(item.id, session.role));

    root.innerHTML =
      `<div class="admin-shell">` +
      `<button class="sidebar-scrim" type="button" aria-label="Close navigation" tabindex="-1" data-shell-action="close-sidebar"></button>` +
      `<aside class="sidebar" id="admin-sidebar" aria-label="Admin navigation">` +
      `<div class="sidebar-brand">` +
      brandMarkHtml(settings, "lg") +
      `<div class="sidebar-brand-copy">` +
      `<strong data-restaurant-name>${escapeHtml(settings.restaurantName)}</strong>` +
      `<span>Restaurant Admin</span>` +
      `</div>` +
      `</div>` +
      `<div class="nav-scroll"><nav class="admin-nav" aria-label="Admin sections">` +
      navItems
        .map((item, index) => navItemHtml(item, activeId, pending, Boolean(item.divider) && index > 0))
        .join("") +
      `</nav></div>` +
      `<div class="sidebar-foot">` +
      `<a class="customer-link" href="${escapeHtml(customerMenuHref())}" target="_blank" rel="noopener">` +
      `<span class="customer-link-icon">${icon("external")}</span>` +
      `<span class="customer-link-copy"><strong>View customer menu</strong><span>Opens in a new tab</span></span>` +
      `</a>` +
      `<p class="sidebar-note">Data is stored on this device only.</p>` +
      `</div>` +
      `</aside>` +
      `<div class="main-column">` +
      `<header class="topbar">` +
      `<button class="icon-button sidebar-toggle" type="button" aria-label="Open navigation" aria-controls="admin-sidebar" aria-expanded="false" data-shell-action="toggle-sidebar">${icon("menu")}</button>` +
      `<div class="topbar-brand">` +
      brandMarkHtml(settings, "sm") +
      `<div class="topbar-brand-copy">` +
      `<strong data-restaurant-name>${escapeHtml(settings.restaurantName)}</strong>` +
      `<span>Restaurant Admin · ${escapeHtml(session.role)}</span>` +
      `</div>` +
      `</div>` +
      `<form class="topbar-search" role="search" data-global-search>` +
      `<label class="sr-only" for="global-search-input">Search orders</label>` +
      `<span class="topbar-search-icon">${icon("search")}</span>` +
      `<input id="global-search-input" type="search" name="q" placeholder="Search orders or tables…" autocomplete="off">` +
      `</form>` +
      `<div class="topbar-actions">` +
      soundToggleHtml() +
      `<div class="popover-wrap">` +
      `<button class="icon-button topbar-icon" type="button" aria-label="Notifications" aria-haspopup="true" aria-expanded="false" aria-controls="notification-popover" data-popover-trigger data-shell-action="toggle-notifications">` +
      `${icon("bell")}<span class="icon-badge" data-pending-badge${pending ? "" : " hidden"}>${pending > 99 ? "99+" : pending}</span>` +
      `</button>` +
      `<div class="popover notification-popover" id="notification-popover" hidden>` +
      `<div class="popover-head"><strong>Notifications</strong><span>Pending orders</span></div>` +
      `<div class="popover-list" data-notification-list>${notificationItemsHtml()}</div>` +
      `<a class="popover-link" href="orders.html">View all orders ${icon("arrow-right")}</a>` +
      `</div>` +
      `</div>` +
      `<div class="popover-wrap">` +
      `<button class="profile-button" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="profile-popover" data-popover-trigger data-shell-action="toggle-profile">` +
      `<span class="avatar" aria-hidden="true">${escapeHtml(initialsFor(session.name))}</span>` +
      `<span class="profile-text"><strong>${escapeHtml(session.name)}</strong><span>${escapeHtml(session.role)}</span></span>` +
      `${icon("chevron-down", "chevron")}` +
      `</button>` +
      `<div class="popover profile-popover" id="profile-popover" hidden>` +
      `<div class="profile-popover-head"><strong data-restaurant-name>${escapeHtml(settings.restaurantName)}</strong><span>${escapeHtml(session.name)} · ${escapeHtml(session.role)}</span></div>` +
      (session.role === "Owner" ? `<a href="staff.html">${icon("users")}Staff</a>` : "") +
      (session.role === "Owner" ? `<a href="settings.html">${icon("gear")}Settings</a>` : "") +
      `<button type="button" data-shell-action="logout">${icon("logout")}Log out</button>` +
      `</div>` +
      `</div>` +
      `</div>` +
      `</header>` +
      `<main class="admin-main" id="admin-view" tabindex="-1">` +
      `<div class="page-loader"><span class="spinner" aria-hidden="true"></span><span>Loading admin…</span></div>` +
      `</main>` +
      `</div>` +
      `</div>`;

    refreshShell();
  }

  function refreshShell() {
    const settings = getSettings();
    const pending = getPendingOrders().length;

    document.querySelectorAll("[data-restaurant-name]").forEach((element) => {
      element.textContent = settings.restaurantName;
    });

    document.querySelectorAll("[data-brand-mark]").forEach((element) => {
      element.setAttribute("data-initial", initialFor(settings.restaurantName));
      element.classList.remove("is-image-broken");
      element.innerHTML = settings.logo
        ? `<img src="${escapeHtml(settings.logo)}" alt="">`
        : `${icon("qr")}<span class="brand-dot" aria-hidden="true"></span>`;
    });

    document.querySelectorAll("[data-pending-badge]").forEach((element) => {
      if (pending > 0) {
        element.hidden = false;
        element.textContent = pending > 99 ? "99+" : String(pending);
      } else {
        element.hidden = true;
        element.textContent = "0";
      }
    });

    const notificationList = document.querySelector("[data-notification-list]");
    if (notificationList) notificationList.innerHTML = notificationItemsHtml();

    const meta = PAGE_META[state.page];
    if (meta) document.title = `${meta.title} | ${settings.restaurantName} Admin`;

    updateSoundToggles();
  }

  function updateActiveNav() {
    const activeId = getActiveNavId();
    document.querySelectorAll("[data-nav-id]").forEach((link) => {
      const active = link.dataset.navId === activeId;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  function openSidebar() {
    document.body.classList.add("sidebar-open");
    state.sidebarOpen = true;
    document.querySelectorAll('[data-shell-action="toggle-sidebar"]').forEach((button) => {
      button.setAttribute("aria-expanded", "true");
    });
    const firstLink = document.querySelector("#admin-sidebar .nav-link");
    if (firstLink) firstLink.focus({ preventScroll: true });
  }

  function closeSidebar(options = {}) {
    if (!state.sidebarOpen) return;
    document.body.classList.remove("sidebar-open");
    state.sidebarOpen = false;
    const toggle = document.querySelector('[data-shell-action="toggle-sidebar"]');
    if (toggle) toggle.setAttribute("aria-expanded", "false");
    if (options.restoreFocus && toggle) toggle.focus({ preventScroll: true });
  }

  function handleStorage(event) {
    if (event.key === SOUND_KEY) {
      updateSoundToggles();
      return;
    }
    if (event.key && !DATA_KEYS.has(event.key)) return;
    detectNewOrders({ refresh: false });
    refreshShell();
    if (state.modalOpen) {
      state.pendingRefresh = true;
      return;
    }
    renderCurrentPage({ keepScroll: true });
  }

  function bindShell() {
    document.addEventListener("click", (event) => {
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
        } else if (action === "toggle-sound") {
          toggleSoundAlerts();
        } else if (action === "toggle-notifications") {
          togglePopover("notification-popover", shellAction);
        } else if (action === "toggle-profile") {
          togglePopover("profile-popover", shellAction);
        }
        return;
      }

      if (!event.target.closest(".popover-wrap")) closePopovers();
    });

    document.addEventListener("click", (event) => {
      const toggle = event.target.closest("[data-row-menu-toggle]");
      if (toggle) {
        event.preventDefault();
        toggleRowMenu(toggle);
        return;
      }
      if (!event.target.closest(".row-menu")) closeRowMenus();
    });

    const searchForm = document.querySelector("[data-global-search]");
    if (searchForm) {
      searchForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const input = searchForm.querySelector("input[name='q']");
        const query = input ? input.value.trim() : "";
        window.location.href = query ? `orders.html?q=${encodeURIComponent(query)}` : "orders.html";
      });
    }

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      closePopovers();
      closeRowMenus();
      closeSidebar({ restoreFocus: true });
    });

    document.addEventListener("keydown", (event) => {
      if (!state.modalOpen) return;

      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
        return;
      }

      if (event.key !== "Tab") return;

      const modal = document.querySelector("#admin-modal-root .modal");
      if (!modal) return;

      const focusable = Array.from(
        modal.querySelectorAll("a[href], button, input, select, textarea, [tabindex]")
      ).filter(
        (element) =>
          !element.disabled &&
          element.tabIndex >= 0 &&
          !element.hidden &&
          element.getClientRects().length > 0
      );

      if (!focusable.length) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      const activeIsFocusable = focusable.includes(active);

      if (event.shiftKey) {
        if (active === first || !activeIsFocusable) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !activeIsFocusable) {
        event.preventDefault();
        first.focus();
      }
    });

    const modalRoot = document.getElementById("admin-modal-root");
    if (modalRoot) {
      modalRoot.addEventListener("submit", handleViewSubmit);

      modalRoot.addEventListener("click", (event) => {
        if (event.target.closest("[data-modal-close]")) {
          closeModal();
          return;
        }

        const advanceButton = event.target.closest("[data-order-advance]");
        if (advanceButton) {
          advanceOrder(advanceButton.dataset.orderNumber, { fromModal: true });
          return;
        }

        const printButton = event.target.closest("[data-order-print]");
        if (printButton) {
          const order = findOrder(printButton.dataset.orderNumber);
          if (order) printOrderReceipt(order);
          return;
        }

        const copyButton = event.target.closest("[data-order-copy]");
        if (copyButton) {
          const order = findOrder(copyButton.dataset.orderNumber);
          if (order) {
            copyText(buildOrderSummaryText(order))
              .then(() => showToast("Order summary copied."))
              .catch(() => showToast("The order could not be copied.", "error"));
          }
          return;
        }

        const billPrintButton = event.target.closest("[data-bill-print]");
        if (billPrintButton) {
          const request = getBillRequests().find((entry) => entry.id === billPrintButton.dataset.billId);
          if (request) printBillRequest(request);
          return;
        }

        const billPaidButton = event.target.closest("[data-bill-paid]");
        if (billPaidButton) {
          confirmBillRequestPaid(billPaidButton.dataset.billId);
        }
      });
    }

    window.addEventListener("resize", closeRowMenus);
    window.addEventListener("scroll", closeRowMenus, true);
    window.addEventListener("storage", handleStorage);

    window.addEventListener("hashchange", () => {
      updateActiveNav();
      if (state.page === "dashboard" && window.location.hash === "#reports") {
        const reports = document.getElementById("reports");
        if (reports) reports.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });

    document.addEventListener(
      "error",
      (event) => {
        const target = event.target;
        if (!(target instanceof HTMLImageElement)) return;
        const holder = target.closest("[data-image-fallback]");
        if (!holder) return;
        holder.classList.add("is-image-broken");
        target.remove();
      },
      true
    );
  }

  /* ------------------------------------------------------------------------
     Orders
     ------------------------------------------------------------------------ */

  function orderActions(order, options = {}) {
    const nextStatus = allowedNextStatus(order);
    const orderNumber = escapeHtml(order.orderNumber);

    const advanceOption =
      options.includeAdvance && nextStatus
        ? `<button type="button" data-action="order-advance" data-order-number="${orderNumber}">` +
          `${icon("arrow-right")}Mark ${escapeHtml(nextStatus.toLowerCase())}</button>`
        : "";
    const whatsappOption =
      canSendOrderAlerts() && isNewOrder(order)
        ? `<button type="button" data-action="order-whatsapp" data-order-number="${orderNumber}">` +
          `${icon("whatsapp")}Send on WhatsApp</button>`
        : "";

    return (
      `<div class="row-actions">` +
      (options.showAdvanceButton && nextStatus
        ? `<button class="btn btn-xs btn-secondary" type="button" data-action="order-advance" data-order-number="${orderNumber}">` +
          `${escapeHtml(nextStatus)}</button>`
        : "") +
      `<div class="row-menu-wrap">` +
      `<button class="icon-button icon-button--sm" type="button" aria-label="More actions for ${orderNumber}" aria-haspopup="true" aria-expanded="false" data-row-menu-toggle>${icon("dots")}</button>` +
      `<div class="row-menu" hidden>` +
      `<button type="button" data-action="order-view" data-order-number="${orderNumber}">${icon("eye")}View details</button>` +
      advanceOption +
      whatsappOption +
      `<button type="button" data-action="order-print" data-order-number="${orderNumber}">${icon("print")}Print receipt</button>` +
      `<button type="button" data-action="order-copy" data-order-number="${orderNumber}">${icon("copy")}Copy summary</button>` +
      `</div>` +
      `</div>` +
      `</div>`
    );
  }

  function updateOrderStatus(orderNumber, nextStatus) {
    const orders = getOrders();
    const order = orders.find((entry) => entry.orderNumber === orderNumber);
    if (!order) {
      showToast("That order could not be found.", "error");
      return false;
    }

    const allowed = allowedNextStatus(order);
    if (!nextStatus || allowed !== nextStatus) {
      showToast("That status change isn't allowed for this order and role.", "warning");
      return false;
    }

    if (nextStatus === "Served" && orderMode(order) === "dine-in" && !orderTableNumber(order)) {
      showToast("This order has no table number. Add a table before marking it served.", "error");
      return false;
    }

    order.status = nextStatus;

    try {
      saveOrders(orders);
    } catch (error) {
      showToast(errorMessage(error), "error");
      return false;
    }

    showToast(`${orderNumber} marked ${nextStatus}.`);
    refreshShell();
    return true;
  }

  function confirmServeOrder(order) {
    const mode = orderMode(order);
    const tableNumber = orderTableNumber(order);

    if (mode === "dine-in" && !tableNumber) {
      showToast("This order has no table number and cannot be marked served.", "error");
      return;
    }

    const isDineIn = mode === "dine-in";
    const confirmLabel = isDineIn
      ? `Serve to Table ${tableNumber}`
      : `Mark ${orderModeLabel(mode).toLowerCase()} order served`;

    confirmDialog({
      title: isDineIn ? "Confirm the table" : "Confirm handover",
      subtitle: `${order.orderNumber} is ready to serve`,
      body:
        `<div class="serve-confirm">` +
        `<p class="serve-confirm-lead">${isDineIn ? "Deliver this order to" : "Hand this order to the customer"}</p>` +
        (isDineIn ? tableFlagHtml(tableNumber, { large: true }) : orderModeFlagHtml(mode, { large: true })) +
        `<p class="serve-confirm-order">#${escapeHtml(order.orderNumber)}</p>` +
        `<p class="serve-confirm-note">${
          isDineIn
            ? "Check the table number before marking this order as Served."
            : `${escapeHtml(orderModeLabel(mode))} order${orderCustomerLine(order) ? ` · ${escapeHtml(orderCustomerLine(order))}` : ""}`
        }</p>` +
        `</div>`,
      confirmLabel,
      onConfirm() {
        if (!updateOrderStatus(order.orderNumber, "Served")) return false;
        renderCurrentPage({ keepScroll: true });
        return true;
      },
    });
  }

  function advanceOrder(orderNumber, options = {}) {
    const order = getOrders().find((entry) => entry.orderNumber === orderNumber);
    if (!order) {
      showToast("That order could not be found.", "error");
      return;
    }

    const nextStatus = allowedNextStatus(order);
    if (!nextStatus) {
      showToast(
        order.status === "Paid"
          ? "This order is already marked paid."
          : "This order can't move forward from your role.",
        "warning"
      );
      return;
    }

    if (nextStatus === "Served") {
      confirmServeOrder(order);
      return;
    }

    if (!updateOrderStatus(orderNumber, nextStatus)) return;

    const modal = document.querySelector("#admin-modal-root .modal");
    if (options.fromModal && modal && state.modalOpen) {
      const updatedOrder = getOrders().find((entry) => entry.orderNumber === orderNumber);
      if (updatedOrder) updateOrderModal(updatedOrder);
      state.pendingRefresh = true;
      return;
    }

    renderCurrentPage({ keepScroll: true });
  }

  /* ------------------------------------------------------------------------
     Waiter calls and bill requests
     ------------------------------------------------------------------------ */

  function canHandleService() {
    return ["Owner", "Manager", "Waiter"].includes(currentRole());
  }

  function canMarkBillsPaid() {
    return ["Owner", "Manager"].includes(currentRole());
  }

  function pendingWaiterCalls(calls = getWaiterCalls()) {
    return calls.filter((call) => call.status === SERVICE_PENDING);
  }

  function pendingBillRequests(requests = getBillRequests()) {
    return requests.filter((request) => request.status === SERVICE_PENDING);
  }

  function servicePanelsHtml() {
    if (currentRole() === "Kitchen") return "";
    return (
      `<div class="service-grid">` +
      waiterCallsPanelHtml() +
      billRequestsPanelHtml() +
      `</div>`
    );
  }

  function waiterCallsPanelHtml() {
    const calls = getWaiterCalls();
    const pending = pendingWaiterCalls(calls);
    const history = calls
      .filter((call) => call.status === SERVICE_ATTENDED)
      .slice(0, SERVICE_HISTORY_LIMIT);
    const canAttend = canHandleService();

    const pendingHtml = pending.length
      ? `<div class="service-call-list">` +
        pending
          .map(
            (call) =>
              `<article class="service-call">` +
              `<span class="service-big-table" aria-label="Table ${call.tableNumber}">` +
              `<span class="service-big-label">Table</span>` +
              `<span class="service-big-number">${call.tableNumber}</span>` +
              `</span>` +
              `<div class="service-card-copy">` +
              `<p class="service-card-title">Waiter requested</p>` +
              `<p class="service-card-meta">${icon("clock")}${escapeHtml(formatDateTime(call.time))}</p>` +
              `<span class="service-status service-status--pending">` +
              `<span class="service-status-dot" aria-hidden="true"></span>Pending</span>` +
              `</div>` +
              (canAttend
                ? `<button class="btn btn-primary btn-sm service-card-action" type="button" data-action="waiter-attend" data-call-id="${escapeHtml(call.id)}">` +
                  `${icon("check")}Mark attended</button>`
                : `<span class="service-note">Floor staff action</span>`) +
              `</article>`
          )
          .join("") +
        `</div>`
      : `<div class="service-empty">${icon("check")}<p>No waiter calls waiting.</p></div>`;

    const historyHtml = history.length
      ? `<details class="service-history">` +
        `<summary><span>Attended history</span><span class="service-history-count">${history.length}</span>${icon("chevron-down")}</summary>` +
        `<ul class="service-history-list">` +
        history
          .map(
            (call) =>
              `<li class="service-history-row">` +
              `<span class="service-history-table">Table ${call.tableNumber}</span>` +
              `<span class="service-history-meta">${escapeHtml(formatDateTime(call.time))}` +
              (call.attendedTime ? ` → ${escapeHtml(formatTime(call.attendedTime))}` : "") +
              `</span>` +
              `<span class="service-status service-status--done">Attended</span>` +
              `</li>`
          )
          .join("") +
        `</ul>` +
        `</details>`
      : "";

    return (
      `<section class="panel service-panel service-panel--waiter" id="waiter-calls" aria-labelledby="waiter-calls-title">` +
      `<div class="panel-head">` +
      `<div class="service-head">` +
      `<span class="service-head-icon">${icon("bell")}</span>` +
      `<div><h2 class="panel-title" id="waiter-calls-title">Waiter calls</h2>` +
      `<p class="panel-sub">Guest requests from table QR menus.</p></div>` +
      `</div>` +
      `<span class="service-count${pending.length ? " is-live" : ""}">${pending.length} waiting</span>` +
      `</div>` +
      pendingHtml +
      historyHtml +
      `</section>`
    );
  }

  function billItemsLabel(request) {
    const items = Array.isArray(request.items) ? request.items : [];
    if (!items.length) return "No items recorded";
    const parts = items.map((item) => `${item.quantity}× ${item.name}`);
    return parts.length > 3
      ? `${parts.slice(0, 3).join(", ")} +${parts.length - 3} more`
      : parts.join(", ");
  }

  function billRequestsPanelHtml() {
    const requests = getBillRequests();
    const pending = pendingBillRequests(requests);
    const history = requests
      .filter((request) => request.status === BILL_PAID)
      .slice(0, SERVICE_HISTORY_LIMIT);
    const canPay = canMarkBillsPaid();

    const pendingHtml = pending.length
      ? `<div class="service-bill-list">` +
        pending
          .map(
            (request) =>
              `<article class="service-bill">` +
              `<div class="service-bill-top">` +
              `<span class="service-big-table" aria-label="Table ${request.tableNumber}">` +
              `<span class="service-big-label">Table</span>` +
              `<span class="service-big-number">${request.tableNumber}</span>` +
              `</span>` +
              `<div class="service-card-copy">` +
              `<p class="service-card-title">Bill requested</p>` +
              `<p class="service-card-meta">${icon("clock")}${escapeHtml(formatDateTime(request.time))}</p>` +
              `<p class="service-bill-orders">${icon("receipt")}${escapeHtml(
                request.orderNumbers.length ? request.orderNumbers.join(", ") : "No order numbers"
              )}</p>` +
              `<p class="service-bill-items">${escapeHtml(billItemsLabel(request))}</p>` +
              `<span class="service-status service-status--pending">` +
              `<span class="service-status-dot" aria-hidden="true"></span>Pending</span>` +
              `</div>` +
              `<div class="service-bill-total">` +
              `<span>Total</span><strong>${escapeHtml(formatMoney(request.total))}</strong>` +
              `</div>` +
              `</div>` +
              `<div class="service-bill-actions">` +
              `<button class="btn btn-secondary btn-sm" type="button" data-action="bill-view" data-bill-id="${escapeHtml(request.id)}">${icon("eye")}View bill</button>` +
              `<button class="btn btn-secondary btn-sm" type="button" data-action="bill-print" data-bill-id="${escapeHtml(request.id)}">${icon("print")}Print</button>` +
              (canPay
                ? `<button class="btn btn-primary btn-sm" type="button" data-action="bill-paid" data-bill-id="${escapeHtml(request.id)}">${icon("cash")}Mark as paid</button>`
                : `<span class="service-note">Admin marks payment</span>`) +
              `</div>` +
              `</article>`
          )
          .join("") +
        `</div>`
      : `<div class="service-empty">${icon("check")}<p>No bill requests waiting.</p></div>`;

    const historyHtml = history.length
      ? `<details class="service-history">` +
        `<summary><span>Paid history</span><span class="service-history-count">${history.length}</span>${icon("chevron-down")}</summary>` +
        `<ul class="service-history-list">` +
        history
          .map(
            (request) =>
              `<li class="service-history-row service-history-row--bill">` +
              `<span class="service-history-table">Table ${request.tableNumber}</span>` +
              `<span class="service-history-meta">${escapeHtml(formatMoney(request.total))}` +
              (request.paidTime ? ` · Paid ${escapeHtml(formatTime(request.paidTime))}` : "") +
              `</span>` +
              `<span class="service-status service-status--paid">Paid</span>` +
              `<button class="icon-button icon-button--sm" type="button" data-action="bill-view" data-bill-id="${escapeHtml(request.id)}" aria-label="View paid bill for Table ${request.tableNumber}">${icon("eye")}</button>` +
              `</li>`
          )
          .join("") +
        `</ul>` +
        `</details>`
      : "";

    return (
      `<section class="panel service-panel service-panel--bill" id="bill-requests" aria-labelledby="bill-requests-title">` +
      `<div class="panel-head">` +
      `<div class="service-head">` +
      `<span class="service-head-icon service-head-icon--bill">${icon("receipt")}</span>` +
      `<div><h2 class="panel-title" id="bill-requests-title">Bill requests</h2>` +
      `<p class="panel-sub">Cash bills waiting to be settled at the table.</p></div>` +
      `</div>` +
      `<span class="service-count${pending.length ? " is-live" : ""}">${pending.length} pending</span>` +
      `</div>` +
      pendingHtml +
      historyHtml +
      `</section>`
    );
  }

  function markWaiterCallAttended(callId) {
    if (!canHandleService()) {
      showToast("Your role can't update waiter calls.", "warning");
      return;
    }

    const calls = getWaiterCalls();
    const call = calls.find((entry) => entry.id === callId && entry.status === SERVICE_PENDING);
    if (!call) {
      showToast("That waiter call is no longer waiting.", "warning");
      renderCurrentPage({ keepScroll: true });
      return;
    }

    const session = currentSession();
    call.status = SERVICE_ATTENDED;
    call.attendedTime = new Date().toISOString();
    call.attendedBy = String((session && session.name) || currentRole());

    try {
      saveWaiterCalls(calls);
    } catch (error) {
      showToast(errorMessage(error), "error");
      return;
    }

    showToast(`Waiter call for Table ${call.tableNumber} marked attended.`);
    renderCurrentPage({ keepScroll: true });
  }

  function markBillRequestPaid(billId) {
    if (!canMarkBillsPaid()) {
      showToast("Only Admin or Manager can mark a bill as paid.", "warning");
      return false;
    }

    const requests = getBillRequests();
    const request = requests.find((entry) => entry.id === billId);
    if (!request) {
      showToast("That bill request could not be found.", "error");
      return false;
    }
    if (request.status === BILL_PAID) {
      showToast("This bill is already marked paid.", "warning");
      return false;
    }

    const linkedNumbers = new Set(request.orderNumbers);
    const orders = getOrders();
    let updatedOrders = 0;

    orders.forEach((order) => {
      if (linkedNumbers.has(order.orderNumber) && order.status !== "Paid") {
        order.status = "Paid";
        updatedOrders += 1;
      }
    });

    const session = currentSession();
    request.status = BILL_PAID;
    request.paidTime = new Date().toISOString();
    request.paidBy = String((session && session.name) || currentRole());

    try {
      if (updatedOrders) saveOrders(orders);
      saveBillRequests(requests);
    } catch (error) {
      showToast(errorMessage(error), "error");
      return false;
    }

    showToast(
      `Bill for Table ${request.tableNumber} marked paid` +
        (updatedOrders ? ` · ${pluralise(updatedOrders, "order")} updated` : "") +
        "."
    );
    refreshShell();
    return true;
  }

  function confirmBillRequestPaid(billId) {
    const request = getBillRequests().find((entry) => entry.id === billId);
    if (!request) {
      showToast("That bill request could not be found.", "error");
      return;
    }
    if (request.status === BILL_PAID) {
      showToast("This bill is already marked paid.", "warning");
      return;
    }
    if (!canMarkBillsPaid()) {
      showToast("Only Admin or Manager can mark a bill as paid.", "warning");
      return;
    }

    confirmDialog({
      title: "Mark bill as paid?",
      subtitle: `Table ${request.tableNumber} · ${formatMoney(request.total)}`,
      body:
        `<div class="bill-pay-confirm">` +
        tableFlagHtml(request.tableNumber, { large: true }) +
        `<p class="bill-pay-orders">${escapeHtml(
          request.orderNumbers.length ? request.orderNumbers.join(", ") : "No order numbers"
        )}</p>` +
        `<p class="confirm-message">This marks the bill request and ${
          request.orderNumbers.length
            ? pluralise(request.orderNumbers.length, "linked order")
            : "no linked orders"
        } as Paid. Payment is cash at the table.</p>` +
        `</div>`,
      confirmLabel: "Mark as paid",
      onConfirm() {
        if (!markBillRequestPaid(request.id)) return false;
        renderCurrentPage({ keepScroll: true });
        return true;
      },
    });
  }

  function buildBillRequestHtml(request) {
    const settings = getSettings();
    const items = Array.isArray(request.items) ? request.items : [];
    const paid = request.status === BILL_PAID;
    const rows = items.length
      ? items
          .map(
            (item) =>
              `<tr>` +
              `<td><span class="bill-doc-item">${escapeHtml(item.name)}</span></td>` +
              `<td class="num">${item.quantity}</td>` +
              `<td class="num">${escapeHtml(formatMoney(item.price))}</td>` +
              `<td class="num">${escapeHtml(formatMoney(item.lineTotal))}</td>` +
              `</tr>`
          )
          .join("")
      : `<tr><td colspan="4" class="bill-doc-empty">No items recorded</td></tr>`;

    return (
      `<div class="bill-doc">` +
      `<header class="bill-doc-head">` +
      `<div class="bill-doc-heading">` +
      `<p class="bill-doc-kicker">Bill</p>` +
      `<h3 class="bill-doc-venue">${escapeHtml(settings.restaurantName)}</h3>` +
      `</div>` +
      tableFlagHtml(request.tableNumber, { large: true }) +
      `</header>` +
      `<p class="bill-doc-meta">${icon("clock")}${escapeHtml(formatDateTime(request.time))}</p>` +
      `<p class="bill-doc-orders">${icon("receipt")}Order numbers: ${escapeHtml(
        request.orderNumbers.length ? request.orderNumbers.join(", ") : "—"
      )}</p>` +
      `<table class="bill-doc-table">` +
      `<thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Price</th><th class="num">Amount</th></tr></thead>` +
      `<tbody>${rows}</tbody>` +
      `</table>` +
      `<div class="bill-doc-total"><span>Total</span><strong>${escapeHtml(formatMoney(request.total))}</strong></div>` +
      `<p class="bill-doc-note">${icon("cash")}${escapeHtml(settings.paymentNote || "Pay cash at table")}</p>` +
      (paid
        ? `<p class="bill-doc-paid">${icon("check")}Paid${request.paidTime ? ` ${escapeHtml(formatDateTime(request.paidTime))}` : ""}${request.paidBy ? ` · ${escapeHtml(request.paidBy)}` : ""}</p>`
        : `<p class="bill-doc-status"><span class="service-status service-status--pending">` +
          `<span class="service-status-dot" aria-hidden="true"></span>Pending payment</span></p>`) +
      `</div>`
    );
  }

  function openBillRequestModal(billId) {
    const request = getBillRequests().find((entry) => entry.id === billId);
    if (!request) {
      showToast("That bill request could not be found.", "error");
      return;
    }

    const paid = request.status === BILL_PAID;
    openModal({
      title: `Bill · Table ${request.tableNumber}`,
      subtitle: `${formatMoney(request.total)} · ${formatDateTime(request.time)}`,
      kicker: "Bill requests",
      size: "md",
      body: buildBillRequestHtml(request),
      footer:
        `<button class="btn btn-secondary" type="button" data-bill-print data-bill-id="${escapeHtml(request.id)}">${icon("print")}Print bill</button>` +
        (!paid && canMarkBillsPaid()
          ? `<button class="btn btn-primary" type="button" data-bill-paid data-bill-id="${escapeHtml(request.id)}">${icon("cash")}Mark as paid</button>`
          : "") +
        `<button class="btn btn-secondary" type="button" data-modal-close>Close</button>`,
    });
  }

  function printBillRequest(request) {
    const settings = getSettings();
    const items = Array.isArray(request.items) ? request.items : [];
    const paid = request.status === BILL_PAID;
    const printWindow = window.open("", "_blank", "width=440,height=680");
    if (!printWindow) {
      showToast("Allow pop-ups in the browser to print the bill.", "error");
      return;
    }

    const rows = items
      .map(
        (item) =>
          `<tr><td>${escapeHtml(item.name)} × ${item.quantity}</td>` +
          `<td class="num">${escapeHtml(formatMoney(item.lineTotal))}</td></tr>`
      )
      .join("");

    printWindow.document.write(
      `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Bill · Table ${request.tableNumber} · ${escapeHtml(
        settings.restaurantName
      )}</title>` +
      `<style>` +
      `body{margin:0;padding:28px;background:#fff;color:#1a1a1a;font:13px/1.5 "Manrope",Arial,sans-serif;}` +
      `h1{margin:0 0 2px;font:600 24px Georgia,serif;color:#0f2e1f;}` +
      `.muted{color:#6c675d;font-size:11px;}` +
      `.rule{border-top:1px dashed #cfc9bd;margin:16px 0;}` +
      `.table-flag{display:inline-block;margin-top:10px;padding:8px 12px;border-radius:8px;background:#0f2e1f;color:#fff9f1;font-weight:800;}` +
      `.table-flag small{display:block;font-size:9px;letter-spacing:.12em;text-transform:uppercase;opacity:.7;}` +
      `.table-flag strong{font:600 30px Georgia,serif;line-height:1;}` +
      `table{width:100%;border-collapse:collapse;}` +
      `td{padding:5px 0;vertical-align:top;}` +
      `.num{text-align:right;white-space:nowrap;padding-left:14px;}` +
      `.total td{font-weight:800;font-size:16px;padding-top:10px;border-top:1px solid #e8e4db;}` +
      `.stamp{display:inline-block;margin-top:16px;padding:6px 12px;border-radius:999px;background:#fdf1e4;color:#a65a16;font-weight:800;font-size:11px;letter-spacing:.08em;text-transform:uppercase;}` +
      `.stamp.paid{background:#eaf0e9;color:#276442;}` +
      `.cash{margin-top:16px;font-weight:700;color:#0f2e1f;}` +
      `</style></head><body onload="window.print()">` +
      `<h1>${escapeHtml(settings.restaurantName)}</h1>` +
      `<div class="muted">Bill · ${escapeHtml(formatDateTime(request.time))}</div>` +
      `<div class="table-flag"><small>Table</small><strong>${request.tableNumber}</strong></div>` +
      `<div class="rule"></div>` +
      `<div class="muted">Order numbers: ${escapeHtml(
        request.orderNumbers.length ? request.orderNumbers.join(", ") : "—"
      )}</div>` +
      `<div class="rule"></div>` +
      `<table>${rows}</table>` +
      `<table><tr class="total"><td>Total</td><td class="num">${escapeHtml(
        formatMoney(request.total)
      )}</td></tr></table>` +
      `<p class="cash">${escapeHtml(settings.paymentNote || "Pay cash at table")}</p>` +
      `<div class="stamp${paid ? " paid" : ""}">${paid ? "Paid" : "Pending"}</div>` +
      (paid && request.paidTime
        ? `<p class="muted">Paid ${escapeHtml(formatDateTime(request.paidTime))}${
            request.paidBy ? ` · ${escapeHtml(request.paidBy)}` : ""
          }</p>`
        : "") +
      `</body></html>`
    );
    printWindow.document.close();
  }

  function buildOrderSummaryText(order) {
    const settings = getSettings();
    const items = Array.isArray(order.items) ? order.items : [];
    const mode = orderMode(order);
    const customer = orderCustomerLine(order);
    const address = String(order.deliveryAddress || "").trim();
    const fee = Number(order.deliveryFee) || 0;
    const subtotal = Number.isFinite(Number(order.subtotal))
      ? Number(order.subtotal)
      : Math.max(0, orderTotal(order) - fee);
    const headline =
      mode === "dine-in"
        ? `${orderModeLabel(mode)} · ${tableLabel(orderTableNumber(order))}`
        : orderModeLabel(mode);

    const lines = [
      `${settings.restaurantName} — Order ${order.orderNumber}`,
      `${headline} · ${formatDateTime(order.time)}`,
      ...(customer ? [`Customer: ${customer}`] : []),
      ...(address ? [`Address: ${address}`] : []),
      `Status: ${order.status || "Received"}`,
      "",
      ...items.map(
        (item) =>
          `${orderItemDisplayName(item)} — ${formatMoney(
            (Number(item.price) || 0) * (Number(item.quantity) || 0)
          )}`
      ),
      "",
      ...(fee > 0
        ? [`Subtotal: ${formatMoney(subtotal)}`, `Delivery charges: ${formatMoney(fee)}`]
        : []),
      `Total: ${formatMoney(orderTotal(order))}`,
      paymentNoteForOrder(order),
    ];
    return lines.join("\n");
  }

  function sanitizeWhatsAppNumber(value) {
    const raw = String(value || "").trim();
    if (!raw || raw.includes("[") || raw.includes("]") || /placeholder/i.test(raw)) return "";
    const digits = raw.replace(/\D/g, "");
    return digits.length >= 8 ? digits : "";
  }

  function buildWhatsAppMessage(order) {
    const mode = orderMode(order);
    const destination =
      mode === "dine-in" ? `Table ${orderTableNumber(order) || "—"}` : orderModeLabel(mode);
    const address =
      mode === "delivery" ? String((order && order.deliveryAddress) || "").trim() : "";
    return (
      `New Order #${order.orderNumber || "—"}, ${destination}, Total ${formatMoney(orderTotal(order))}` +
      (address ? `, Address: ${address}` : "")
    );
  }

  function buildWhatsAppLink(order) {
    const number = sanitizeWhatsAppNumber(getSettings().whatsappNumber);
    const message = encodeURIComponent(buildWhatsAppMessage(order));
    return `https://wa.me/${number ? number : ""}?text=${message}`;
  }

  function openWhatsAppAlert(order) {
    if (!order) return;
    const popup = window.open(buildWhatsAppLink(order), "_blank", "noopener,noreferrer");
    if (!popup) showToast("Allow pop-ups in this browser to open WhatsApp.", "error");
  }

  function whatsappAlertHtml(order) {
    if (!order || !canSendOrderAlerts() || !isNewOrder(order)) return "";

    const numberMissing = !sanitizeWhatsAppNumber(getSettings().whatsappNumber);
    const note = numberMissing
      ? "The restaurant number is still a placeholder in Settings. WhatsApp will ask you to choose a contact."
      : "Nothing is sent until you press Send on WhatsApp.";

    return (
      `<section class="whatsapp-alert" aria-label="New order WhatsApp alert">` +
      `<span class="whatsapp-alert-icon">${icon("whatsapp")}</span>` +
      `<div class="whatsapp-alert-copy">` +
      `<p class="whatsapp-alert-title">New order alert</p>` +
      `<p class="whatsapp-alert-message">${escapeHtml(buildWhatsAppMessage(order))}</p>` +
      `<p class="whatsapp-alert-note">${escapeHtml(note)}</p>` +
      `</div>` +
      `<a class="btn btn-primary" href="${escapeHtml(buildWhatsAppLink(order))}" target="_blank" rel="noopener noreferrer">${icon("whatsapp")}Send on WhatsApp</a>` +
      `</section>`
    );
  }

  function printOrderReceipt(order) {
    const settings = getSettings();
    const items = Array.isArray(order.items) ? order.items : [];
    const mode = orderMode(order);
    const customer = orderCustomerLine(order);
    const address = String(order.deliveryAddress || "").trim();
    const fee = Number(order.deliveryFee) || 0;
    const subtotal = Number.isFinite(Number(order.subtotal))
      ? Number(order.subtotal)
      : Math.max(0, orderTotal(order) - fee);
    const printWindow = window.open("", "_blank", "width=420,height=640");
    if (!printWindow) {
      showToast("Allow pop-ups in the browser to print the receipt.", "error");
      return;
    }

    const rows = items
      .map(
        (item) =>
          `<tr><td>${escapeHtml(orderItemDisplayName(item))}</td>` +
          `<td class="num">${escapeHtml(formatMoney((Number(item.price) || 0) * (Number(item.quantity) || 0)))}</td></tr>`
      )
      .join("");

    const feeRows =
      fee > 0
        ? `<tr><td>Subtotal</td><td class="num">${escapeHtml(formatMoney(subtotal))}</td></tr>` +
          `<tr><td>Delivery charges</td><td class="num">${escapeHtml(formatMoney(fee))}</td></tr>`
        : "";

    printWindow.document.write(
      `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escapeHtml(order.orderNumber)} · ${escapeHtml(settings.restaurantName)}</title>` +
      `<style>` +
      `body{margin:0;padding:28px;background:#fff;color:#1a1a1a;font:13px/1.5 "Manrope",Arial,sans-serif;}` +
      `h1{margin:0 0 2px;font:600 22px Georgia,serif;color:#0f2e1f;}` +
      `.muted{color:#6c675d;font-size:11px;}` +
      `.rule{border-top:1px dashed #cfc9bd;margin:16px 0;}` +
      `table{width:100%;border-collapse:collapse;}` +
      `td{padding:5px 0;vertical-align:top;}` +
      `.num{text-align:right;white-space:nowrap;padding-left:14px;}` +
      `.total td{font-weight:800;font-size:15px;padding-top:10px;border-top:1px solid #e8e4db;}` +
      `.stamp{display:inline-block;margin-top:14px;padding:6px 12px;border-radius:999px;background:#fdf1e4;color:#a65a16;font-weight:800;font-size:11px;letter-spacing:.08em;text-transform:uppercase;}` +
      `.cash{margin-top:16px;font-weight:700;color:#0f2e1f;}` +
      `</style></head><body onload="window.print()">` +
      `<h1>${escapeHtml(settings.restaurantName)}</h1>` +
      `<div class="muted">${escapeHtml(orderDestinationText(order))} · ${escapeHtml(formatDateTime(order.time))}</div>` +
      (mode !== "dine-in" && customer
        ? `<div class="muted">Customer: ${escapeHtml(customer)}</div>`
        : "") +
      (address ? `<div class="muted">Address: ${escapeHtml(address)}</div>` : "") +
      `<div class="rule"></div>` +
      `<strong>${escapeHtml(order.orderNumber)}</strong>` +
      `<div class="stamp">${escapeHtml(order.status || "Received")}</div>` +
      `<div class="rule"></div>` +
      `<table>${rows}</table>` +
      `<table>${feeRows}` +
      `<tr class="total"><td>Total</td><td class="num">${escapeHtml(formatMoney(orderTotal(order)))}</td></tr></table>` +
      `<p class="cash">${escapeHtml(paymentNoteForOrder(order))}</p>` +
      `<p class="muted">Thank you for your order.</p>` +
      `</body></html>`
    );
    printWindow.document.close();
  }

  function buildOrderDetailHtml(order) {
    const items = Array.isArray(order.items) ? order.items : [];
    const mode = orderMode(order);
    const customer = orderCustomerLine(order);
    const address = String(order.deliveryAddress || "").trim();
    const fee = Number(order.deliveryFee) || 0;
    const subtotal = Number.isFinite(Number(order.subtotal))
      ? Number(order.subtotal)
      : Math.max(0, orderTotal(order) - fee);

    const itemRows = items.length
      ? items
          .map((item) => {
            const contentsText = orderItemContentsText(item);
            const isDeal = isDealOrderItem(item);
            return (
              `<li class="order-detail-item${isDeal ? " order-detail-item--deal" : ""}">` +
              `<span class="order-detail-qty">${Number(item.quantity) || 0}x</span>` +
              `<span class="order-detail-name">${escapeHtml(item.name || "Item")}` +
              (isDeal ? `<span class="deal-order-tag">Deal</span>` : "") +
              (contentsText
                ? `<span class="order-detail-contents">${isDeal ? "Includes: " : "each: "}${escapeHtml(contentsText)}</span>`
                : "") +
              `</span>` +
              `<span class="order-detail-price">${escapeHtml(
                formatMoney((Number(item.price) || 0) * (Number(item.quantity) || 0))
              )}</span>` +
              `</li>`
            );
          })
          .join("")
      : `<li class="order-detail-item"><span class="order-detail-name">No items recorded</span></li>`;

    const destinationRow =
      mode === "dine-in"
        ? `<div><dt>Table</dt><dd>${escapeHtml(tableLabel(orderTableNumber(order)))}</dd></div>`
        : `<div><dt>Destination</dt><dd>${escapeHtml(orderModeLabel(mode))}</dd></div>`;

    return (
      `<div class="order-detail-top">` +
      `<div><p class="detail-kicker">Order</p><h3 class="order-detail-number">#${escapeHtml(order.orderNumber)}</h3></div>` +
      `<div class="order-detail-flags">` +
      (mode === "dine-in"
        ? tableFlagHtml(orderTableNumber(order), { large: true })
        : orderModeFlagHtml(mode, { large: true })) +
      statusBadge(order.status) +
      `</div>` +
      `</div>` +
      `<dl class="detail-grid">` +
      `<div><dt>Order mode</dt><dd>${escapeHtml(orderModeLabel(mode))}</dd></div>` +
      destinationRow +
      `<div><dt>Placed</dt><dd>${escapeHtml(formatDateTime(order.time))}</dd></div>` +
      `<div><dt>Items</dt><dd>${pluralise(orderItemTotal(order), "item")}</dd></div>` +
      (customer
        ? `<div class="detail-grid-wide"><dt>Customer</dt><dd>${escapeHtml(customer)}</dd></div>`
        : "") +
      (address
        ? `<div class="detail-grid-wide"><dt>Delivery address</dt><dd>${escapeHtml(address)}</dd></div>`
        : "") +
      `<div class="detail-grid-wide"><dt>Payment</dt><dd>${escapeHtml(paymentNoteForOrder(order))}</dd></div>` +
      `</dl>` +
      `<div class="detail-section">` +
      `<p class="detail-label">Order items</p>` +
      `<ul class="order-detail-list">${itemRows}</ul>` +
      `</div>` +
      (fee > 0
        ? `<div class="order-detail-subtotal"><span>Subtotal</span><strong>${escapeHtml(formatMoney(subtotal))}</strong></div>` +
          `<div class="order-detail-subtotal"><span>Delivery charges</span><strong>${escapeHtml(formatMoney(fee))}</strong></div>`
        : "") +
      `<div class="order-detail-total"><span>Total</span><strong>${escapeHtml(formatMoney(orderTotal(order)))}</strong></div>` +
      `<p class="order-detail-note">${icon("cash")}${escapeHtml(paymentNoteForOrder(order))}</p>` +
      `<p class="order-detail-note">${icon("clock")}Received ${escapeHtml(formatDateTime(order.time))}</p>`
    );
  }

  function buildOrderDetailFooter(order) {
    const nextStatus = allowedNextStatus(order);
    const whatsappButton =
      canSendOrderAlerts() && isNewOrder(order)
        ? `<a class="btn btn-secondary" href="${escapeHtml(buildWhatsAppLink(order))}" target="_blank" rel="noopener noreferrer">${icon("whatsapp")}Send on WhatsApp</a>`
        : "";

    return (
      `<button class="btn btn-secondary" type="button" data-order-print data-order-number="${escapeHtml(order.orderNumber)}">${icon("print")}Print receipt</button>` +
      `<button class="btn btn-secondary" type="button" data-order-copy data-order-number="${escapeHtml(order.orderNumber)}">${icon("copy")}Copy summary</button>` +
      whatsappButton +
      (nextStatus
        ? `<button class="btn btn-primary" type="button" data-order-advance data-order-number="${escapeHtml(order.orderNumber)}">Mark ${escapeHtml(nextStatus.toLowerCase())}</button>`
        : "")
    );
  }

  function updateOrderModal(order) {
    const modal = document.querySelector("#admin-modal-root .modal");
    if (!modal) return;

    const body = modal.querySelector(".modal-body");
    const footer = modal.querySelector(".modal-foot");
    if (body) body.innerHTML = buildOrderDetailHtml(order);
    if (footer) footer.innerHTML = buildOrderDetailFooter(order);
  }

  function openOrderModal(orderNumber) {
    const order = getOrders().find((entry) => entry.orderNumber === orderNumber);
    if (!order) {
      showToast("That order could not be found.", "error");
      return;
    }

    openModal({
      title: "Order details",
      subtitle: `${order.orderNumber} · ${orderDestinationText(order)}`,
      kicker: "Orders",
      size: "md",
      body: buildOrderDetailHtml(order),
      footer: buildOrderDetailFooter(order),
    });
  }

  /* ------------------------------------------------------------------------
     Page rendering and shared page events
     ------------------------------------------------------------------------ */

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
      `<span class="empty-icon">${icon(options.icon || "receipt")}</span>` +
      `<h3>${escapeHtml(options.title)}</h3>` +
      `<p>${escapeHtml(options.message || "")}</p>` +
      (options.action || "") +
      `</div>`
    );
  }

  function renderAccessDenied(session) {
    const root = document.getElementById("admin-root");
    const home = roleHome(session.role);
    const settings = getSettings();
    document.title = `Access denied | ${settings.restaurantName} Admin`;

    if (root) {
      root.innerHTML =
        `<main class="access-denied">` +
        `<section class="access-denied-card" role="alert">` +
        `<span class="access-denied-icon">${icon("alert")}</span>` +
        `<p class="access-denied-kicker">${escapeHtml(session.name)} · ${escapeHtml(session.role)}</p>` +
        `<h1>You do not have access to this page</h1>` +
        `<p>Your role opens only the pages assigned to it. Taking you to your home screen now.</p>` +
        `<a class="btn btn-primary" href="${escapeHtml(home)}">${icon("arrow-right")}Go to my home</a>` +
        `<p class="access-denied-note">Ask the owner if you need access to another section.</p>` +
        `</section>` +
        `</main>`;
    }

    window.setTimeout(() => {
      window.location.replace(home);
    }, 2200);
  }

  function renderRestaurantBlocked(message, title) {
    const root = document.getElementById("admin-root");
    const settings = getSettings();
    document.title = `${title} | ${settings.restaurantName} Admin`;

    if (!root) return;

    root.innerHTML =
      `<main class="access-denied">` +
      `<section class="access-denied-card" role="alert">` +
      `<span class="access-denied-icon">${icon("alert")}</span>` +
      `<p class="access-denied-kicker">Restaurant Admin</p>` +
      `<h1>${escapeHtml(title)}</h1>` +
      `<p>${escapeHtml(message)}</p>` +
      `<a class="btn btn-primary" href="login.html">${icon("logout")}Back to sign in</a>` +
      `<p class="access-denied-note">Contact the Super Admin to renew or enable this restaurant.</p>` +
      `</section>` +
      `</main>`;
  }

  function renderCurrentPage(options = {}) {
    const view = document.getElementById("admin-view");
    if (!view) return;

    const previousScroll = window.scrollY;
    closePopovers();
    closeRowMenus();

    switch (state.page) {
      case "menu": renderMenuPage(view); break;
      case "orders": renderOrdersPage(view); break;
      case "kitchen": renderKitchenPage(view); break;
      case "tables": renderTablesPage(view); break;
      case "offers": renderOffersPage(view); break;
      case "reports": renderReportsPage(view); break;
      case "feedback": renderFeedbackPage(view); break;
      case "staff": renderStaffPage(view); break;
      case "settings": renderSettingsPage(view); break;
      case "dashboard":
      default:
        renderDashboardPage(view);
        break;
    }

    updateActiveNav();

    if (options.keepScroll) {
      window.requestAnimationFrame(() => window.scrollTo(0, previousScroll));
    } else if (state.page === "dashboard" && window.location.hash === "#reports") {
      window.requestAnimationFrame(() => {
        const reports = document.getElementById("reports");
        if (reports) reports.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } else {
      window.scrollTo(0, 0);
    }
  }

  function showFormError(form, message) {
    const errorBox = form.querySelector("[data-form-error]");
    if (!errorBox) return;
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  function clearFormError(form) {
    const errorBox = form.querySelector("[data-form-error]");
    if (!errorBox) return;
    errorBox.textContent = "";
    errorBox.hidden = true;
  }

  function findOrder(orderNumber) {
    return getOrders().find((entry) => entry.orderNumber === orderNumber);
  }

  function handleViewClick(event) {
    const actionElement = event.target.closest("[data-action]");
    if (!actionElement) return;

    const action = actionElement.dataset.action;
    closeRowMenus();

    switch (action) {
      case "download-report":
        downloadOrdersCsv(getOrders());
        break;
      case "report-print":
        printSalesReport(state.reportRange);
        break;
      case "order-view":
        openOrderModal(actionElement.dataset.orderNumber);
        break;
      case "order-advance":
        advanceOrder(actionElement.dataset.orderNumber);
        break;
      case "order-whatsapp": {
        const order = findOrder(actionElement.dataset.orderNumber);
        if (order) openWhatsAppAlert(order);
        break;
      }
      case "kitchen-advance":
        advanceKitchenOrder(actionElement.dataset.orderNumber);
        break;
      case "order-print": {
        const order = findOrder(actionElement.dataset.orderNumber);
        if (order) printOrderReceipt(order);
        break;
      }
      case "order-copy": {
        const order = findOrder(actionElement.dataset.orderNumber);
        if (order) {
          copyText(buildOrderSummaryText(order))
            .then(() => showToast("Order summary copied."))
            .catch(() => showToast("The order could not be copied.", "error"));
        }
        break;
      }
      case "orders-clear":
        state.ordersQuery = "";
        state.ordersStatus = "all";
        state.ordersTable = "all";
        renderOrdersPage(document.getElementById("admin-view"));
        break;
      case "waiter-attend":
        markWaiterCallAttended(actionElement.dataset.callId);
        break;
      case "bill-view":
        openBillRequestModal(actionElement.dataset.billId);
        break;
      case "bill-print": {
        const request = getBillRequests().find((entry) => entry.id === actionElement.dataset.billId);
        if (request) printBillRequest(request);
        break;
      }
      case "bill-paid":
        confirmBillRequestPaid(actionElement.dataset.billId);
        break;
      case "orders-filter":
        selectOrdersStatus(actionElement.dataset.status);
        break;
      case "menu-add":
        openMenuForm(null);
        break;
      case "menu-edit":
        openMenuForm(actionElement.dataset.itemId);
        break;
      case "menu-delete":
        deleteMenuItem(actionElement.dataset.itemId);
        break;
      case "table-add":
        openTableForm(null);
        break;
      case "table-edit":
        openTableForm(Number(actionElement.dataset.tableNumber));
        break;
      case "table-delete":
        deleteTable(Number(actionElement.dataset.tableNumber));
        break;
      case "table-qr-retry":
        renderTableQrHolders();
        break;
      case "table-generate":
        generateTableQr(Number(actionElement.dataset.tableNumber), actionElement);
        break;
      case "table-download":
        downloadTableQr(Number(actionElement.dataset.tableNumber), actionElement);
        break;
      case "table-print":
        printTableQr(Number(actionElement.dataset.tableNumber));
        break;
      case "table-print-all":
        printAllTableQrs();
        break;
      case "table-copy": {
        const tableNumber = Number(actionElement.dataset.tableNumber);
        copyText(getMenuUrl(tableNumber))
          .then(() => showToast(`${tableLabel(tableNumber)} menu link copied.`))
          .catch(() => showToast("The menu link could not be copied.", "error"));
        break;
      }
      case "offer-add":
        openOfferForm(null);
        break;
      case "offer-edit":
        openOfferForm(actionElement.dataset.offerId);
        break;
      case "offer-delete":
        deleteOffer(actionElement.dataset.offerId);
        break;
      case "deal-add":
        openDealForm(null);
        break;
      case "deal-edit":
        openDealForm(actionElement.dataset.dealId);
        break;
      case "deal-duplicate":
        duplicateDeal(actionElement.dataset.dealId);
        break;
      case "deal-delete":
        deleteDeal(actionElement.dataset.dealId);
        break;
      case "feedback-approve":
        moderateFeedback(actionElement.dataset.feedbackId, "Approved", true);
        break;
      case "feedback-reject":
        moderateFeedback(actionElement.dataset.feedbackId, "Rejected", false);
        break;
      case "feedback-show":
        setFeedbackVisibility(actionElement.dataset.feedbackId, true);
        break;
      case "feedback-hide":
        setFeedbackVisibility(actionElement.dataset.feedbackId, false);
        break;
      case "feedback-delete":
        deleteFeedbackEntry(actionElement.dataset.feedbackId);
        break;
      case "settings-logo-remove":
        removeSettingsLogo();
        break;
      case "reports-apply":
        renderReportsContent();
        break;
      case "reports-download":
        downloadReportsCsv();
        break;
      case "reports-print":
        printReports();
        break;
      case "staff-add":
        openStaffForm(null);
        break;
      case "staff-edit":
        openStaffForm(actionElement.dataset.staffId);
        break;
      case "staff-delete":
        deleteStaffMember(actionElement.dataset.staffId);
        break;
      default:
        break;
    }
  }

  function handleViewInput(event) {
    const target = event.target;

    if (target.matches("[data-menu-search]")) {
      state.menuQuery = target.value;
      renderMenuList();
      return;
    }

    if (target.matches("[data-orders-search]")) {
      state.ordersQuery = target.value;
      renderOrdersList();
    }
  }

  function handleViewChange(event) {
    const target = event.target;

    if (target.matches("[data-menu-category]")) {
      state.menuCategory = target.value;
      renderMenuList();
      return;
    }

    if (target.matches("[data-orders-status]")) {
      state.ordersStatus = target.value;
      renderOrdersList();
      return;
    }

    if (target.matches("[data-orders-table]")) {
      state.ordersTable = target.value;
      renderOrdersList();
      return;
    }

    if (target.matches("[data-report-range]")) {
      state.reportRange = target.value;
      renderReportContent();
      return;
    }

    if (target.matches("[data-reports-range]")) {
      state.reportsRange = target.value;
      renderReportsPage(document.getElementById("admin-view"));
      return;
    }

    if (target.matches("[data-reports-start]")) {
      state.reportsStart = target.value;
      renderReportsContent();
      return;
    }

    if (target.matches("[data-reports-end]")) {
      state.reportsEnd = target.value;
      renderReportsContent();
      return;
    }

    if (target.matches("[data-staff-active]")) {
      toggleStaffActive(target.dataset.staffId, target.checked);
      return;
    }

    if (target.matches("[data-menu-live]")) {
      toggleMenuItemVisibility(target.dataset.menuId, target.checked);
      return;
    }

    if (target.matches("[data-offer-live]")) {
      toggleOfferVisibility(target.dataset.offerId, target.checked);
      return;
    }

    if (target.matches("[data-deal-live]")) {
      toggleDealVisibility(target.dataset.dealId, target.checked);
      return;
    }

    if (target.matches("[data-menu-photo]")) {
      handleMenuPhotoSelection(target);
      return;
    }

    if (target.matches("[data-logo-input]")) {
      handleLogoSelection(target);
    }
  }

  function handleViewSubmit(event) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;

    if (form.dataset.form === "menu-item") {
      event.preventDefault();
      saveMenuForm(form);
      return;
    }

    if (form.dataset.form === "table") {
      event.preventDefault();
      saveTableForm(form);
      return;
    }

    if (form.dataset.form === "offer") {
      event.preventDefault();
      saveOfferForm(form);
      return;
    }

    if (form.dataset.form === "deal") {
      event.preventDefault();
      saveDealForm(form);
      return;
    }

    if (form.dataset.form === "settings") {
      event.preventDefault();
      saveSettingsForm(form);
      return;
    }

    if (form.dataset.form === "staff") {
      event.preventDefault();
      saveStaffForm(form);
    }
  }

  /* ------------------------------------------------------------------------
     Dashboard and reports
     ------------------------------------------------------------------------ */

  const RANGE_LABELS = {
    today: "Today",
    "7": "Last 7 days",
    "30": "Last 30 days",
    all: "All time",
  };

  function rangeStartDate(range) {
    const today = startOfDay();
    if (range === "today") return today;
    if (range === "7") return addDays(today, -6);
    if (range === "30") return addDays(today, -29);
    return null;
  }

  function getOrdersInRange(range) {
    const start = rangeStartDate(range);

    return sortOrders(getOrders()).filter((order) => {
      const date = toDate(order.time);
      if (!date) return false;
      return !start || startOfDay(date) >= start;
    });
  }

  function getDailyReport(range) {
    const orders = getOrdersInRange(range);
    const days = new Map();

    orders.forEach((order) => {
      const date = toDate(order.time);
      if (!date) return;

      const key = localDateKey(date);
      const entry =
        days.get(key) ||
        { key, date: startOfDay(date), orders: 0, sales: 0, paid: 0, awaiting: 0 };
      const total = orderTotal(order);
      const notPaid = order.status !== "Paid";

      entry.orders += 1;
      entry.sales += total;
      if (notPaid) entry.awaiting += total;
      else entry.paid += total;
      days.set(key, entry);
    });

    return {
      orders,
      days: Array.from(days.values()).sort((a, b) => b.date - a.date),
    };
  }

  function reportSummaryHtml(orders) {
    const totalSales = orders.reduce((sum, order) => sum + orderTotal(order), 0);
    const average = orders.length ? totalSales / orders.length : 0;
    const paidSales = orders
      .filter((order) => order.status === "Paid")
      .reduce((sum, order) => sum + orderTotal(order), 0);
    const awaitingSales = Math.max(0, totalSales - paidSales);

    return (
      `<div class="report-metrics">` +
      `<div class="report-metric"><span>Orders</span><strong>${orders.length}</strong><small>${escapeHtml(RANGE_LABELS[state.reportRange] || "Selected period")}</small></div>` +
      `<div class="report-metric"><span>Sales</span><strong>${escapeHtml(formatMoney(totalSales))}</strong><small>Order value</small></div>` +
      `<div class="report-metric"><span>Average order</span><strong>${escapeHtml(formatMoney(average))}</strong><small>Per order</small></div>` +
      `<div class="report-metric"><span>Paid</span><strong>${escapeHtml(formatMoney(paidSales))}</strong><small>${escapeHtml(formatMoney(awaitingSales))} awaiting payment</small></div>` +
      `</div>`
    );
  }

  function renderReportContent() {
    const container = document.getElementById("report-content");
    if (!container) return;

    const { orders, days } = getDailyReport(state.reportRange);
    const totalSales = orders.reduce((sum, order) => sum + orderTotal(order), 0);
    const paidSales = orders
      .filter((order) => order.status === "Paid")
      .reduce((sum, order) => sum + orderTotal(order), 0);
    const awaitingSales = Math.max(0, totalSales - paidSales);

    const table = days.length
      ? `<div class="data-table-wrap">` +
        `<table class="data-table report-days-table">` +
        `<thead><tr><th>Date</th><th>Orders</th><th>Sales</th><th>Paid</th><th>Awaiting</th></tr></thead>` +
        `<tbody>` +
        days
          .map(
            (day) =>
              `<tr>` +
              `<td><span class="cell-strong">${escapeHtml(weekdayFormatter.format(day.date))}</span></td>` +
              `<td>${day.orders}</td>` +
              `<td class="cell-amount">${escapeHtml(formatMoney(day.sales))}</td>` +
              `<td>${escapeHtml(formatMoney(day.paid))}</td>` +
              `<td>${escapeHtml(formatMoney(day.awaiting))}</td>` +
              `</tr>`
          )
          .join("") +
        `</tbody>` +
        `<tfoot><tr><th>Total</th><td>${orders.length}</td><td>${escapeHtml(formatMoney(totalSales))}</td><td>${escapeHtml(formatMoney(paidSales))}</td><td>${escapeHtml(formatMoney(awaitingSales))}</td></tr></tfoot>` +
        `</table></div>`
      : emptyStateHtml({
          compact: true,
          icon: "chart",
          title: "No sales in this period",
          message: "Orders placed in this date range will appear here automatically.",
        });

    const dealSalesBlock =
      `<div class="report-deals">` +
      `<div class="report-deals-head">` +
      `<h3 class="report-deals-title">Deal sales</h3>` +
      `<p class="report-deals-sub">Deals ordered in this period. Calculated from saved orders only.</p>` +
      `</div>` +
      dealSalesTableHtml(reportDealSales(orders)) +
      `</div>`;

    container.innerHTML = reportSummaryHtml(orders) + table + dealSalesBlock;
  }

  function printSalesReport(range) {
    const { orders, days } = getDailyReport(range);
    if (!orders.length) {
      showToast("There are no orders in this report yet.", "warning");
      return;
    }

    const settings = getSettings();
    const totalSales = orders.reduce((sum, order) => sum + orderTotal(order), 0);
    const paidSales = orders
      .filter((order) => order.status === "Paid")
      .reduce((sum, order) => sum + orderTotal(order), 0);
    const awaitingSales = Math.max(0, totalSales - paidSales);
    const rangeLabel = RANGE_LABELS[range] || "Selected period";
    const rows = days
      .map(
        (day) =>
          `<tr><td>${escapeHtml(weekdayFormatter.format(day.date))}</td><td>${day.orders}</td>` +
          `<td class="num">${escapeHtml(formatMoney(day.sales))}</td>` +
          `<td class="num">${escapeHtml(formatMoney(day.paid))}</td>` +
          `<td class="num">${escapeHtml(formatMoney(day.awaiting))}</td></tr>`
      )
      .join("");
    const dealRows = reportDealSales(orders)
      .map(
        (entry) =>
          `<tr><td>${escapeHtml(entry.name)}</td><td class="num">${entry.quantity}</td>` +
          `<td class="num">${escapeHtml(formatMoney(entry.sales))}</td></tr>`
      )
      .join("");

    const printWindow = window.open("", "_blank", "width=760,height=760");
    if (!printWindow) {
      showToast("Allow pop-ups in the browser to print the report.", "error");
      return;
    }

    printWindow.document.write(
      `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Sales report · ${escapeHtml(settings.restaurantName)}</title>` +
      `<style>` +
      `body{margin:0;padding:36px;background:#fff;color:#1a1a1a;font:12px/1.5 "Manrope",Arial,sans-serif;}` +
      `h1{margin:0;font:600 26px Georgia,serif;color:#0f2e1f;}` +
      `h2{margin:24px 0 8px;font:600 16px Georgia,serif;color:#0f2e1f;}` +
      `.muted{color:#6c675d;font-size:11px;margin-top:2px;}` +
      `.summary{display:flex;gap:26px;margin:22px 0 26px;flex-wrap:wrap;}` +
      `.summary div{border-left:3px solid #e67e22;padding-left:10px;min-width:120px;}` +
      `.summary span{display:block;color:#6c675d;font-size:10px;text-transform:uppercase;letter-spacing:.08em;}` +
      `.summary strong{font-size:17px;color:#0f2e1f;}` +
      `table{width:100%;border-collapse:collapse;}` +
      `th,td{text-align:left;padding:8px 6px;border-bottom:1px solid #e8e4db;}` +
      `th{font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:#6c675d;}` +
      `.num{text-align:right;}` +
      `tfoot th,tfoot td{font-weight:800;color:#0f2e1f;border-bottom:0;border-top:2px solid #0f2e1f;}` +
      `</style></head><body onload="window.print()">` +
      `<h1>${escapeHtml(settings.restaurantName)}</h1>` +
      `<div class="muted">Sales report · ${escapeHtml(rangeLabel)} · Generated ${escapeHtml(formatDateTime(new Date()))}</div>` +
      `<div class="summary">` +
      `<div><span>Orders</span><strong>${orders.length}</strong></div>` +
      `<div><span>Sales</span><strong>${escapeHtml(formatMoney(totalSales))}</strong></div>` +
      `<div><span>Paid</span><strong>${escapeHtml(formatMoney(paidSales))}</strong></div>` +
      `<div><span>Awaiting</span><strong>${escapeHtml(formatMoney(awaitingSales))}</strong></div>` +
      `</div>` +
      `<table><thead><tr><th>Date</th><th>Orders</th><th class="num">Sales</th><th class="num">Paid</th><th class="num">Awaiting</th></tr></thead><tbody>${rows}</tbody>` +
      `<tfoot><tr><th>Total</th><td>${orders.length}</td><td class="num">${escapeHtml(formatMoney(totalSales))}</td><td class="num">${escapeHtml(formatMoney(paidSales))}</td><td class="num">${escapeHtml(formatMoney(awaitingSales))}</td></tr></tfoot></table>` +
      `<h2>Deal sales</h2>` +
      (dealRows
        ? `<table><thead><tr><th>Deal</th><th class="num">Times ordered</th><th class="num">Revenue</th></tr></thead><tbody>${dealRows}</tbody></table>`
        : `<p class="muted">No deal sales in this period.</p>`) +
      `</body></html>`
    );
    printWindow.document.close();
  }

  function statCardHtml(options) {
    return (
      `<article class="stat-card stat-card--${options.tone}">` +
      `<div class="stat-top"><span class="stat-label">${escapeHtml(options.label)}</span><span class="stat-icon">${icon(options.icon)}</span></div>` +
      `<p class="stat-value">${escapeHtml(options.value)}</p>` +
      `<p class="stat-note">${escapeHtml(options.note)}</p>` +
      `</article>`
    );
  }

  function recentOrdersTableHtml(orders) {
    const rows = orders
      .map(
        (order) =>
          `<tr>` +
          `<td>${orderIdentityHtml(order)}</td>` +
          `<td><span class="cell-strong">${pluralise(orderItemTotal(order), "item")}</span><span class="cell-sub">${escapeHtml(orderItemsLabel(order))}</span></td>` +
          `<td class="cell-amount">${escapeHtml(formatMoney(orderTotal(order)))}</td>` +
          `<td>${statusBadge(order.status)}</td>` +
          `<td class="cell-actions">${orderActions(order, { includeAdvance: true })}</td>` +
          `</tr>`
      )
      .join("");

    return (
      `<div class="data-table-wrap">` +
      `<table class="data-table data-table--orders">` +
      `<thead><tr><th>Order · Destination</th><th>Items</th><th>Amount</th><th>Status</th><th class="th-actions"><span class="sr-only">Actions</span></th></tr></thead>` +
      `<tbody>${rows}</tbody>` +
      `</table></div>`
    );
  }

  function renderDashboardPage(view) {
    const orders = sortOrders(getOrders());
    const todayKey = localDateKey(new Date());
    const todayOrders = orders.filter((order) => localDateKey(order.time) === todayKey);
    const todaySales = todayOrders.reduce((sum, order) => sum + orderTotal(order), 0);
    const pendingOrders = orders.filter((order) => PENDING_STATUSES.includes(order.status));
    const receivedCount = pendingOrders.filter((order) => order.status === "Received").length;
    const preparingCount = pendingOrders.filter((order) => order.status === "Preparing").length;
    const readyCount = pendingOrders.filter((order) => order.status === "Ready").length;
    const tables = getTables();
    const recentOrders = orders.slice(0, 10);
    const settings = getSettings();

    const pendingNote = pendingOrders.length
      ? `${receivedCount} received · ${preparingCount} preparing${readyCount ? ` · ${readyCount} ready` : ""}`
      : "No orders waiting";
    const tableNote = tables.length
      ? `${pluralise(tables.length, "table")} with QR menus`
      : "Add your first table";

    const stats =
      `<div class="stats-grid">` +
      statCardHtml({
        label: "Today's orders",
        value: String(todayOrders.length),
        note: todayOrders.length ? "Placed from the customer menu today" : "No orders placed today",
        icon: "receipt",
        tone: "orange",
      }) +
      statCardHtml({
        label: "Today's sales",
        value: formatMoney(todaySales),
        note: "Order value placed today",
        icon: "cash",
        tone: "green",
      }) +
      statCardHtml({
        label: "Pending orders",
        value: String(pendingOrders.length),
        note: pendingNote,
        icon: "clock",
        tone: "sand",
      }) +
      statCardHtml({
        label: "Total tables",
        value: String(tables.length),
        note: tableNote,
        icon: "grid",
        tone: "cream",
      }) +
      `</div>`;

    const emptyAction =
      `<a class="btn btn-secondary btn-sm" href="${escapeHtml(customerMenuHref())}" target="_blank" rel="noopener">` +
      `${icon("external")}Open customer menu</a>`;

    const recentPanel =
      `<section class="panel recent-panel">` +
      `<div class="panel-head">` +
      `<div><h2 class="panel-title">Recent orders</h2><p class="panel-sub">Newest orders from the customer menu.</p></div>` +
      `<a class="text-link" href="orders.html">View all orders ${icon("arrow-right")}</a>` +
      `</div>` +
      (recentOrders.length
        ? recentOrdersTableHtml(recentOrders)
        : emptyStateHtml({
            icon: "receipt",
            title: "No orders yet",
            message: "Orders placed from the customer menu will appear here automatically.",
            action: emptyAction,
          })) +
      `</section>`;

    const reportOptions = Object.entries(RANGE_LABELS)
      .map(
        ([value, label]) =>
          `<option value="${value}"${state.reportRange === value ? " selected" : ""}>${escapeHtml(label)}</option>`
      )
      .join("");

    const reportPanel =
      `<section class="panel report-panel" id="reports">` +
      `<div class="panel-head">` +
      `<div><h2 class="panel-title">Sales report</h2><p class="panel-sub">Calculated from orders saved on this device.</p></div>` +
      `<div class="panel-actions">` +
      `<label class="select-field select-field--sm"><span class="sr-only">Report period</span>` +
      `<select id="report-range" name="report-range" data-report-range>${reportOptions}</select><span class="select-chevron" aria-hidden="true">${icon("chevron-down")}</span></label>` +
      `<button class="btn btn-secondary btn-sm" type="button" data-action="report-print">${icon("print")}Print report</button>` +
      `</div>` +
      `</div>` +
      `<div id="report-content"></div>` +
      `</section>`;

    view.innerHTML =
      pageHeaderHtml({
        title: "Dashboard",
        subtitle: `Overview for ${settings.restaurantName}. Every figure comes from orders placed on this device.`,
        actions:
          `<button class="btn btn-secondary" type="button" data-action="download-report">${icon("download")}Download Report</button>` +
          `<a class="btn btn-accent" href="tables.html">${icon("qr")}Generate QR Menu</a>`,
      }) +
      stats +
      servicePanelsHtml() +
      recentPanel +
      reportPanel;

    renderReportContent();
  }

  /* ------------------------------------------------------------------------
     Menu items
     ------------------------------------------------------------------------ */

  function getFilteredMenuItems() {
    const query = state.menuQuery.trim().toLowerCase();

    return getMenuItems().filter((item) => {
      if (state.menuCategory !== "all" && item.category !== state.menuCategory) return false;
      if (!query) return true;
      const haystack = `${item.name || ""} ${item.description || ""} ${categoryLabel(item.category)}`.toLowerCase();
      return query.split(/\s+/).filter(Boolean).every((part) => haystack.includes(part));
    });
  }

  function menuRowHtml(item) {
    const itemId = escapeHtml(item.id);
    const itemName = escapeHtml(item.name);

    return (
      `<article class="menu-row${item.active ? "" : " is-hidden"}">` +
      imageFallbackMarkup(item.image, item.name, "menu-thumb") +
      `<div class="menu-row-main">` +
      `<div class="menu-row-title">` +
      `<h3>${itemName}</h3>` +
      (item.popular ? '<span class="tag tag--popular">Popular</span>' : "") +
      (item.signature ? '<span class="tag tag--signature">Signature</span>' : "") +
      (item.sample ? '<span class="tag tag--sample">Sample</span>' : "") +
      (item.active ? "" : '<span class="tag tag--muted">Hidden</span>') +
      `</div>` +
      `<p class="menu-row-desc">${escapeHtml(item.description || "No description")}</p>` +
      `<div class="menu-row-meta">` +
      `<span class="tag tag--category">${escapeHtml(categoryLabel(item.category))}</span>` +
      `<span class="menu-price">${escapeHtml(formatMoney(item.price))}</span>` +
      `</div>` +
      `</div>` +
      `<div class="menu-row-side">` +
      `<label class="switch-field">` +
      `<input type="checkbox" name="menu-live-${itemId}" data-menu-live data-menu-id="${itemId}"${item.active ? " checked" : ""} aria-label="Show ${itemName} on the customer menu">` +
      `<span class="switch" aria-hidden="true"></span>` +
      `<span class="switch-text">${item.active ? "Live" : "Hidden"}</span>` +
      `</label>` +
      `<div class="row-actions">` +
      `<button class="icon-button icon-button--sm" type="button" data-action="menu-edit" data-item-id="${itemId}" aria-label="Edit ${itemName}">${icon("edit")}</button>` +
      `<button class="icon-button icon-button--sm icon-button--danger" type="button" data-action="menu-delete" data-item-id="${itemId}" aria-label="Delete ${itemName}">${icon("trash")}</button>` +
      `</div>` +
      `</div>` +
      `</article>`
    );
  }

  function renderMenuList() {
    const container = document.getElementById("menu-list");
    if (!container) return;

    const allItems = getMenuItems();
    const filteredItems = getFilteredMenuItems();
    const liveCount = allItems.filter((item) => item.active).length;

    container.innerHTML = filteredItems.length
      ? filteredItems.map(menuRowHtml).join("")
      : emptyStateHtml({
          icon: "book",
          title: allItems.length ? "No items match your filters" : "No menu items yet",
          message: allItems.length
            ? "Try another search or choose a different category."
            : "Add your first dish to start building the customer menu.",
          action:
            `<button class="btn btn-primary btn-sm" type="button" data-action="menu-add">${icon("plus")}Add item</button>`,
        });

    const meta = document.getElementById("menu-result-meta");
    if (meta) {
      const filtering = state.menuQuery.trim() || state.menuCategory !== "all";
      meta.textContent = filtering
        ? `${filteredItems.length} of ${allItems.length} items`
        : `${allItems.length} items · ${liveCount} live`;
    }
  }

  function renderMenuPage(view) {
    const categoryOptions =
      `<option value="all">All categories</option>` +
      categories
        .map(
          (category) =>
            `<option value="${escapeHtml(category.id)}"${state.menuCategory === category.id ? " selected" : ""}>${escapeHtml(category.label)}</option>`
        )
        .join("");

    view.innerHTML =
      pageHeaderHtml({
        title: "Menu Items",
        subtitle: "Changes go live on the customer menu as soon as you save.",
        actions:
          `<button class="btn btn-primary" type="button" data-action="menu-add">${icon("plus")}Add item</button>`,
      }) +
      `<section class="panel">` +
      `<div class="toolbar">` +
      `<div class="search-box">${icon("search")}<input id="menu-search" name="menu-search" type="search" placeholder="Search dishes…" autocomplete="off" value="${escapeHtml(state.menuQuery)}" data-menu-search aria-label="Search menu items"></div>` +
      `<label class="select-field"><span class="sr-only">Filter by category</span><select id="menu-category" name="menu-category" data-menu-category>${categoryOptions}</select><span class="select-chevron" aria-hidden="true">${icon("chevron-down")}</span></label>` +
      `</div>` +
      `<p class="list-meta" id="menu-result-meta"></p>` +
      `<div class="menu-list" id="menu-list"></div>` +
      `</section>`;

    renderMenuList();
  }

  function uniqueMenuId(name, items) {
    const base = slugify(name) || "item";
    let candidate = base;
    let suffix = 2;

    while (items.some((item) => item.id === candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }

  function menuFormHtml(item) {
    const isEditing = Boolean(item);
    const categoryOptions = categories
      .map(
        (category) =>
          `<option value="${escapeHtml(category.id)}"${item && item.category === category.id ? " selected" : ""}>${escapeHtml(category.label)}</option>`
      )
      .join("");

    return (
      `<form class="admin-form" data-form="menu-item" data-item-id="${item ? escapeHtml(item.id) : ""}" novalidate>` +
      `<p class="form-error" data-form-error role="alert" hidden></p>` +
      `<div class="photo-field">` +
      `<div class="photo-preview-holder" data-menu-photo-preview></div>` +
      `<div class="photo-field-copy">` +
      `<p class="field-label">Dish photo</p>` +
      `<div class="inline-actions">` +
      `<label class="btn btn-secondary btn-sm">${icon("upload")}Upload photo<input type="file" accept="image/*" data-menu-photo hidden></label>` +
      `<button class="btn btn-ghost btn-sm" type="button" data-menu-photo-remove>Remove</button>` +
      `</div>` +
      `<p class="field-hint">JPG, PNG or WebP. Photos are compressed before saving.</p>` +
      `<p class="field-hint field-hint--warn">Real restaurant photos only. Never use AI food photos as final.</p>` +
      `</div>` +
      `</div>` +
      `<div class="field"><label for="menu-name">Item name</label>` +
      `<input id="menu-name" name="name" type="text" maxlength="60" required value="${item ? escapeHtml(item.name) : ""}" placeholder="e.g. Chicken Tikka" data-autofocus>` +
      `</div>` +
      `<div class="form-grid form-grid--2">` +
      `<div class="field"><label for="menu-price">Price (${escapeHtml(currencySymbol)})</label>` +
      `<input id="menu-price" name="price" type="number" min="1" step="1" required value="${item ? escapeHtml(item.price) : ""}" placeholder="520">` +
      `</div>` +
      `<div class="field"><label for="menu-category">Category</label>` +
      `<select id="menu-category" name="category" required>${categoryOptions}</select>` +
      `</div>` +
      `</div>` +
      `<div class="field"><label for="menu-description">Description</label>` +
      `<textarea id="menu-description" name="description" rows="2" maxlength="120" placeholder="Short description shown under the dish name">${item ? escapeHtml(item.description || "") : ""}</textarea>` +
      `</div>` +
      `<div class="toggle-row">` +
      `<label class="switch-field switch-field--boxed">` +
      `<input type="checkbox" name="popular"${item && item.popular ? " checked" : ""}>` +
      `<span class="switch" aria-hidden="true"></span>` +
      `<span class="switch-copy"><strong>Popular item</strong><span>Show this dish in Popular Items first.</span></span>` +
      `</label>` +
      `<label class="switch-field switch-field--boxed">` +
      `<input type="checkbox" name="signature"${item && item.signature ? " checked" : ""}>` +
      `<span class="switch" aria-hidden="true"></span>` +
      `<span class="switch-copy"><strong>Signature dish</strong><span>Show this dish in Signature. Its food category stays the same.</span></span>` +
      `</label>` +
      `<label class="switch-field switch-field--boxed">` +
      `<input type="checkbox" name="active"${!item || item.active ? " checked" : ""}>` +
      `<span class="switch" aria-hidden="true"></span>` +
      `<span class="switch-copy"><strong>Visible on menu</strong><span>Hidden items stay saved but are not orderable.</span></span>` +
      `</label>` +
      `</div>` +
      `<p class="field-hint">${isEditing ? "Saving updates the customer menu immediately. Past orders keep the item name and price they were placed with." : "The item appears on the customer menu as soon as it is saved."}</p>` +
      `</form>`
    );
  }

  function updateMenuPhotoPreview(overlay) {
    const holder = overlay.querySelector("[data-menu-photo-preview]");
    if (!holder) return;

    const nameInput = overlay.querySelector("[name='name']");
    const name = nameInput && nameInput.value.trim() ? nameInput.value.trim() : "Dish";
    holder.innerHTML = imageFallbackMarkup(state.menuDraftImage, name, "photo-preview");
  }

  function openMenuForm(itemId) {
    const item = itemId ? getMenuItems().find((entry) => entry.id === itemId) : null;
    if (itemId && !item) {
      showToast("That menu item could not be found.", "error");
      return;
    }

    state.menuDraftImage = item ? String(item.image || "") : "";
    const isEditing = Boolean(item);

    openModal({
      title: isEditing ? "Edit menu item" : "Add menu item",
      subtitle: isEditing ? "Update how this dish appears on the customer menu." : "Create a dish for the customer menu.",
      kicker: "Menu",
      size: "lg",
      body: menuFormHtml(item),
      footer:
        `<button class="btn btn-secondary" type="button" data-modal-close>Cancel</button>` +
        `<button class="btn btn-primary" type="submit" form="admin-menu-form">${isEditing ? "Save changes" : "Add item"}</button>`,
      onMount(overlay) {
        const form = overlay.querySelector("[data-form='menu-item']");
        if (form) form.id = "admin-menu-form";

        updateMenuPhotoPreview(overlay);

        const photoInput = overlay.querySelector("[data-menu-photo]");
        if (photoInput) {
          photoInput.addEventListener("change", () => handleMenuPhotoSelection(photoInput));
        }

        const removePhoto = overlay.querySelector("[data-menu-photo-remove]");
        if (removePhoto) {
          removePhoto.addEventListener("click", () => {
            state.menuDraftImage = "";
            updateMenuPhotoPreview(overlay);
            showToast("Photo removed. Save the item to apply.", "warning");
          });
        }

        const nameInput = overlay.querySelector("[name='name']");
        if (nameInput) {
          nameInput.addEventListener("input", () => {
            if (state.menuDraftImage) return;
            updateMenuPhotoPreview(overlay);
          });
        }
      },
    });
  }

  function handleMenuPhotoSelection(input) {
    const file = input.files && input.files[0];
    if (!file) return;

    const overlay = input.closest(".modal-overlay") || document;
    input.disabled = true;

    compressImage(file, { maxDimension: 720, mime: "image/jpeg", quality: 0.82, background: "#FFFFFF" })
      .then((dataUrl) => {
        state.menuDraftImage = dataUrl;
        updateMenuPhotoPreview(overlay);
        showToast("Photo ready. Save the item to apply.", "success");
      })
      .catch((error) => showToast(errorMessage(error), "error"))
      .finally(() => {
        input.disabled = false;
        input.value = "";
      });
  }

  function saveMenuForm(form) {
    clearFormError(form);

    const itemId = form.dataset.itemId;
    const name = String(form.elements.name.value || "").trim();
    const description = String(form.elements.description.value || "").trim();
    const price = Number(form.elements.price.value);
    const category = String(form.elements.category.value || "");
    const popular = Boolean(form.elements.popular.checked);
    const signature = Boolean(form.elements.signature.checked);
    const active = Boolean(form.elements.active.checked);

    if (!name) {
      showFormError(form, "Enter the item name.");
      form.elements.name.focus();
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      showFormError(form, "Enter a price greater than zero.");
      form.elements.price.focus();
      return;
    }

    if (!categoryById.has(category)) {
      showFormError(form, "Choose a category for this item.");
      form.elements.category.focus();
      return;
    }

    const items = getMenuItems();
    const existingIndex = items.findIndex((item) => item.id === itemId);
    const existing = existingIndex >= 0 ? items[existingIndex] : null;
    const id = existing ? existing.id : uniqueMenuId(name, items);
    const nextItem = {
      ...(existing || {}),
      id,
      name,
      description,
      price: Math.round(price),
      category,
      image: state.menuDraftImage,
      popular,
      signature,
      active,
    };

    if (existingIndex >= 0) items[existingIndex] = nextItem;
    else items.push(nextItem);

    try {
      saveMenuItems(items);
    } catch (error) {
      showFormError(form, errorMessage(error));
      showToast(errorMessage(error), "error");
      return;
    }

    closeModal();
    showToast(
      existingIndex >= 0
        ? `${name} updated.`
        : active
          ? `${name} added to the menu.`
          : `${name} added and hidden from the customer menu.`
    );
    renderCurrentPage({ keepScroll: true });
  }

  function toggleMenuItemVisibility(itemId, active) {
    const items = getMenuItems();
    const item = items.find((entry) => entry.id === itemId);
    if (!item) return;

    item.active = Boolean(active);

    try {
      saveMenuItems(items);
    } catch (error) {
      showToast(errorMessage(error), "error");
      renderCurrentPage({ keepScroll: true });
      return;
    }

    showToast(`${item.name} is now ${item.active ? "live" : "hidden"} on the customer menu.`);
    renderCurrentPage({ keepScroll: true });
  }

  function deleteMenuItem(itemId) {
    const item = getMenuItems().find((entry) => entry.id === itemId);
    if (!item) return;

    confirmDialog({
      title: "Delete menu item?",
      message: `"${item.name}" will be removed from the customer menu. Past orders keep their item name and price. To remove it temporarily, hide it instead.`,
      confirmLabel: "Delete item",
      tone: "danger",
      onConfirm() {
        const items = getMenuItems().filter((entry) => entry.id !== itemId);
        try {
          saveMenuItems(items);
        } catch (error) {
          showToast(errorMessage(error), "error");
          return false;
        }
        showToast(`${item.name} deleted.`);
        renderCurrentPage({ keepScroll: true });
        return true;
      },
    });
  }

  /* ------------------------------------------------------------------------
     Orders page
     ------------------------------------------------------------------------ */

  function orderRowHtml(order, options = {}) {
    return (
      `<tr>` +
      `<td>${orderIdentityHtml(order)}</td>` +
      `<td><span class="cell-strong">${pluralise(orderItemTotal(order), "item")}</span><span class="cell-sub">${escapeHtml(orderItemsLabel(order))}</span></td>` +
      `<td class="cell-amount">${escapeHtml(formatMoney(orderTotal(order)))}</td>` +
      `<td>${statusBadge(order.status)}</td>` +
      `<td class="cell-actions">${orderActions(order, {
        showAdvanceButton: options.showAdvanceButton !== false,
        includeAdvance: false,
      })}</td>` +
      `</tr>`
    );
  }

  function filterOrders(orders) {
    const query = state.ordersQuery.trim().toLowerCase();

    return orders.filter((order) => {
      if (state.ordersStatus !== "all" && order.status !== state.ordersStatus) return false;
      if (state.ordersTable !== "all" && String(orderTableNumber(order) || "") !== state.ordersTable) {
        return false;
      }
      if (!query) return true;

      const tableNumber = orderTableNumber(order);
      const haystack = `${order.orderNumber || ""} ${orderModeLabel(order)} ${
        tableNumber ? `table ${tableNumber} ${tableLabel(tableNumber)}` : ""
      } ${order.customerName || ""} ${order.customerMobile || ""} ${order.deliveryAddress || ""}`.toLowerCase();
      return query.split(/\s+/).filter(Boolean).every((part) => haystack.includes(part));
    });
  }

  function orderTableFilterOptions(orders) {
    const numbers = new Set(getTables().map((table) => table.number));
    orders.forEach((order) => {
      const tableNumber = orderTableNumber(order);
      if (tableNumber) numbers.add(tableNumber);
    });

    return [...numbers]
      .sort((a, b) => a - b)
      .map(
        (number) =>
          `<option value="${number}"${state.ordersTable === String(number) ? " selected" : ""}>` +
          `${escapeHtml(tableLabel(number))}</option>`
      )
      .join("");
  }

  function renderOrdersList() {
    const container = document.getElementById("orders-list");
    if (!container) return;

    const allOrders = sortOrders(getOrders());
    const visibleOrders = filterOrders(allOrders);
    const meta = document.getElementById("orders-result-meta");

    if (meta) {
      const tableNote =
        state.ordersTable === "all" ? "" : ` · ${tableLabel(Number(state.ordersTable))}`;
      meta.textContent = allOrders.length
        ? `Showing ${visibleOrders.length} of ${allOrders.length} orders${tableNote}`
        : "No orders have been placed yet";
    }

    if (!visibleOrders.length) {
      const noOrders = allOrders.length === 0;
      container.innerHTML = emptyStateHtml({
        icon: noOrders ? "receipt" : "search",
        title: noOrders ? "No orders yet" : "No orders match",
        message: noOrders
          ? "Orders placed from the customer menu will appear here automatically."
          : "Try another order number, table, or status filter.",
        action: noOrders
          ? `<a class="btn btn-secondary btn-sm" href="${escapeHtml(customerMenuHref())}" target="_blank" rel="noopener">${icon("external")}Open customer menu</a>`
          : `<button class="btn btn-secondary btn-sm" type="button" data-action="orders-clear">${icon("refresh")}Clear filters</button>`,
      });
      return;
    }

    container.innerHTML =
      `<div class="data-table-wrap">` +
      `<table class="data-table data-table--orders">` +
      `<thead><tr><th>Order · Destination</th><th>Items</th><th>Amount</th><th>Status</th><th class="th-actions"><span class="sr-only">Actions</span></th></tr></thead>` +
      `<tbody>${visibleOrders.map((order) => orderRowHtml(order)).join("")}</tbody>` +
      `</table></div>`;
  }

  function renderOrdersPage(view) {
    const allOrders = getOrders();
    const counts = {
      all: allOrders.length,
      Received: allOrders.filter((order) => order.status === "Received").length,
      Preparing: allOrders.filter((order) => order.status === "Preparing").length,
      Ready: allOrders.filter((order) => order.status === "Ready").length,
      Served: allOrders.filter((order) => order.status === "Served").length,
      Paid: allOrders.filter((order) => order.status === "Paid").length,
    };

    const filterButtons = ["all", ...STATUS_FLOW]
      .map((status) => {
        const active = state.ordersStatus === status;
        const label = status === "all" ? "All" : status;
        const count = status === "all" ? counts.all : counts[status];
        return (
          `<button class="filter-pill${active ? " is-active" : ""}" type="button" data-action="orders-filter" data-status="${status}" aria-pressed="${active ? "true" : "false"}">` +
          `${escapeHtml(label)}<span>${count}</span></button>`
        );
      })
      .join("");

    const role = currentRole();
    let subtitle = "Table orders will appear here as soon as guests place them.";
    if (allOrders.length) {
      if (role === "Waiter") {
        subtitle = "Delivery view. You can mark a Ready order as Served when it reaches the table.";
      } else if (role === "Kitchen") {
        subtitle = `${pluralise(allOrders.length, "order")} saved. Use Received → Preparing → Ready; Served and Paid stay with Admin Orders.`;
      } else {
        subtitle = `${pluralise(allOrders.length, "order")} saved on this device. Status changes update immediately.`;
      }
    }

    const latestNewOrder = sortOrders(allOrders).find((order) => isNewOrder(order));

    view.innerHTML =
      pageHeaderHtml({
        title: "Orders",
        subtitle,
        actions: `<a class="btn btn-secondary" href="${escapeHtml(customerMenuHref())}" target="_blank" rel="noopener">${icon("external")}Open customer menu</a>`,
      }) +
      whatsappAlertHtml(latestNewOrder) +
      servicePanelsHtml() +
      `<section class="panel">` +
      `<div class="toolbar toolbar--stack">` +
      `<div class="orders-filter-row">` +
      `<div class="search-box">${icon("search")}<input id="orders-search" name="orders-search" type="search" placeholder="Search order number or table…" autocomplete="off" value="${escapeHtml(state.ordersQuery)}" data-orders-search aria-label="Search orders"></div>` +
      `<label class="select-field select-field--table"><span class="sr-only">Filter orders by table</span>` +
      `<select id="orders-table-filter" name="orders-table-filter" data-orders-table>` +
      `<option value="all"${state.ordersTable === "all" ? " selected" : ""}>All tables</option>` +
      orderTableFilterOptions(allOrders) +
      `</select><span class="select-chevron" aria-hidden="true">${icon("chevron-down")}</span></label>` +
      `</div>` +
      `<div class="filter-pills" role="group" aria-label="Filter orders by status">${filterButtons}</div>` +
      `</div>` +
      `<p class="list-meta" id="orders-result-meta"></p>` +
      `<div id="orders-list"></div>` +
      `</section>`;

    renderOrdersList();
  }

  function selectOrdersStatus(status) {
    if (status !== "all" && !STATUS_FLOW.includes(status)) return;
    state.ordersStatus = status;

    document.querySelectorAll("[data-action='orders-filter']").forEach((button) => {
      const active = button.dataset.status === status;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });

    renderOrdersList();
  }

  /* ------------------------------------------------------------------------
     Reports page
     ------------------------------------------------------------------------ */

  const REPORTS_RANGE_LABELS = {
    today: "Today",
    yesterday: "Yesterday",
    "7": "Last 7 days",
    "30": "Last 30 days",
    custom: "Custom range",
  };

  function reportsRangeOptionsHtml() {
    return Object.entries(REPORTS_RANGE_LABELS)
      .map(
        ([value, label]) =>
          `<option value="${value}"${state.reportsRange === value ? " selected" : ""}>${escapeHtml(label)}</option>`
      )
      .join("");
  }

  function reportsDateRange() {
    const today = startOfDay();
    const range = state.reportsRange;

    if (range === "yesterday") {
      const day = addDays(today, -1);
      return { start: day, end: day };
    }
    if (range === "7") return { start: addDays(today, -6), end: today };
    if (range === "30") return { start: addDays(today, -29), end: today };
    if (range === "custom") {
      let start = parseDateOnly(state.reportsStart) || addDays(today, -6);
      let end = parseDateOnly(state.reportsEnd) || today;
      if (start > end) [start, end] = [end, start];
      return { start: startOfDay(start), end: startOfDay(end) };
    }
    return { start: today, end: today };
  }

  function reportsRangeLabel() {
    if (state.reportsRange === "custom") {
      const { start, end } = reportsDateRange();
      return `${formatDateFull(start)} – ${formatDateFull(end)}`;
    }
    return REPORTS_RANGE_LABELS[state.reportsRange] || "Selected range";
  }

  function filteredReportOrders() {
    const { start, end } = reportsDateRange();

    return sortOrders(getOrders()).filter((order) => {
      const date = toDate(order && order.time);
      if (!date) return false;
      const day = startOfDay(date);
      return day >= start && day <= end;
    });
  }

  function reportBestSellers(orders) {
    const items = new Map();

    orders.forEach((order) => {
      const orderItems = Array.isArray(order.items) ? order.items : [];
      orderItems.forEach((item) => {
        const name = String((item && item.name) || "").trim() || "Item";
        const quantity = Number(item.quantity) || 0;
        const lineTotal =
          Number(item.lineTotal) || (Number(item.price) || 0) * quantity;
        const entry = items.get(name) || { name, quantity: 0, sales: 0 };
        entry.quantity += quantity;
        entry.sales += lineTotal;
        items.set(name, entry);
      });
    });

    return [...items.values()].sort(
      (a, b) => b.quantity - a.quantity || b.sales - a.sales || a.name.localeCompare(b.name)
    );
  }

  function reportDealSales(orders) {
    const dealsSold = new Map();

    orders.forEach((order) => {
      const orderItems = Array.isArray(order.items) ? order.items : [];
      orderItems.forEach((item) => {
        if (!isDealOrderItem(item)) return;
        const name = orderItemDealName(item);
        const quantity = Number(item.quantity) || 0;
        const lineTotal = Number(item.lineTotal) || (Number(item.price) || 0) * quantity;
        const entry = dealsSold.get(name) || { name, quantity: 0, sales: 0 };
        entry.quantity += quantity;
        entry.sales += lineTotal;
        dealsSold.set(name, entry);
      });
    });

    return [...dealsSold.values()].sort(
      (a, b) => b.quantity - a.quantity || b.sales - a.sales || a.name.localeCompare(b.name)
    );
  }

  function dealSalesTableHtml(dealSales) {
    if (!dealSales.length) {
      return emptyStateHtml({
        compact: true,
        icon: "tag",
        title: "No deal sales",
        message: "Deals ordered from the customer menu will appear here automatically.",
      });
    }

    const rows = dealSales
      .map(
        (entry) =>
          `<tr>` +
          `<td><span class="cell-strong">${escapeHtml(entry.name)}</span></td>` +
          `<td>${entry.quantity}</td>` +
          `<td class="cell-amount">${escapeHtml(formatMoney(entry.sales))}</td>` +
          `</tr>`
      )
      .join("");

    return (
      `<div class="data-table-wrap">` +
      `<table class="data-table reports-table deal-sales-table">` +
      `<thead><tr><th>Deal</th><th>Times ordered</th><th>Revenue</th></tr></thead>` +
      `<tbody>${rows}</tbody>` +
      `</table></div>`
    );
  }

  function reportTableSales(orders) {
    const tables = new Map();

    orders.forEach((order) => {
      const tableNumber = orderTableNumber(order);
      const key = tableNumber || 0;
      const entry = tables.get(key) || { tableNumber, orders: 0, sales: 0 };
      entry.orders += 1;
      entry.sales += orderTotal(order);
      tables.set(key, entry);
    });

    return [...tables.values()].sort(
      (a, b) =>
        b.sales - a.sales ||
        b.orders - a.orders ||
        (a.tableNumber || 9999) - (b.tableNumber || 9999)
    );
  }

  function reportSummary(orders) {
    const totalSales = orders.reduce((sum, order) => sum + orderTotal(order), 0);
    const bestSellers = reportBestSellers(orders);
    const dealSales = reportDealSales(orders);

    return {
      totalOrders: orders.length,
      totalSales,
      averageOrder: orders.length ? totalSales / orders.length : 0,
      bestSellers,
      bestSeller: bestSellers[0] || null,
      dealSales,
      dealSalesRevenue: dealSales.reduce((sum, entry) => sum + entry.sales, 0),
    };
  }

  function reportStatsHtml(summary, rangeLabel) {
    return (
      `<div class="stats-grid reports-stats">` +
      statCardHtml({
        label: "Total orders",
        value: String(summary.totalOrders),
        note: summary.totalOrders ? rangeLabel : "No orders in this range",
        icon: "receipt",
        tone: "orange",
      }) +
      statCardHtml({
        label: "Total sales",
        value: formatMoney(summary.totalSales),
        note: summary.totalOrders ? "Order value in this range" : "No sales in this range",
        icon: "cash",
        tone: "green",
      }) +
      statCardHtml({
        label: "Average order value",
        value: formatMoney(summary.averageOrder),
        note: summary.totalOrders ? "Per order" : "No orders to average",
        icon: "chart",
        tone: "sand",
      }) +
      statCardHtml({
        label: "Best selling item",
        value: summary.bestSeller ? summary.bestSeller.name : "No sales",
        note: summary.bestSeller
          ? `${pluralise(summary.bestSeller.quantity, "item")} sold`
          : "No items sold in this range",
        icon: "flame",
        tone: "cream",
      }) +
      `</div>`
    );
  }

  function bestSellersListHtml(bestSellers) {
    if (!bestSellers.length) {
      return emptyStateHtml({
        compact: true,
        icon: "flame",
        title: "No items sold",
        message: "Best sellers will appear once orders are placed in this range.",
      });
    }

    return (
      `<ol class="bestseller-list">` +
      bestSellers
        .slice(0, 5)
        .map(
          (entry, index) =>
            `<li class="bestseller-row">` +
            `<span class="bestseller-rank">${index + 1}</span>` +
            `<span class="bestseller-copy">` +
            `<span class="bestseller-name">${escapeHtml(entry.name)}</span>` +
            `<span class="bestseller-meta">${pluralise(entry.quantity, "item")} sold</span>` +
            `</span>` +
            `<span class="bestseller-sales">${escapeHtml(formatMoney(entry.sales))}</span>` +
            `</li>`
        )
        .join("") +
      `</ol>`
    );
  }

  function tableSalesTableHtml(tableSales) {
    if (!tableSales.length) {
      return emptyStateHtml({
        compact: true,
        icon: "grid",
        title: "No table sales",
        message: "Table-wise sales will appear once orders are placed in this range.",
      });
    }

    const rows = tableSales
      .map(
        (entry) =>
          `<tr>` +
          `<td><span class="cell-strong">${entry.tableNumber ? `Table ${entry.tableNumber}` : "No table"}</span></td>` +
          `<td>${entry.orders}</td>` +
          `<td class="cell-amount">${escapeHtml(formatMoney(entry.sales))}</td>` +
          `</tr>`
      )
      .join("");

    return (
      `<div class="data-table-wrap">` +
      `<table class="data-table reports-table">` +
      `<thead><tr><th>Table No.</th><th>Orders</th><th>Sales</th></tr></thead>` +
      `<tbody>${rows}</tbody>` +
      `</table></div>`
    );
  }

  function renderReportsContent() {
    const container = document.getElementById("reports-content");
    if (!container) return;

    const orders = filteredReportOrders();
    const summary = reportSummary(orders);
    const rangeLabel = reportsRangeLabel();
    const tableSales = reportTableSales(orders);

    container.innerHTML =
      reportStatsHtml(summary, rangeLabel) +
      `<div class="reports-grid">` +
      `<section class="panel">` +
      `<div class="panel-head">` +
      `<div><h2 class="panel-title">Best sellers</h2><p class="panel-sub">Top 5 items by quantity sold in this range.</p></div>` +
      `</div>` +
      bestSellersListHtml(summary.bestSellers) +
      `</section>` +
      `<section class="panel">` +
      `<div class="panel-head">` +
      `<div><h2 class="panel-title">Table-wise sales</h2><p class="panel-sub">Orders and sales for each table in this range.</p></div>` +
      `</div>` +
      tableSalesTableHtml(tableSales) +
      `</section>` +
      `<section class="panel">` +
      `<div class="panel-head">` +
      `<div><h2 class="panel-title">Deal sales</h2><p class="panel-sub">Deals ordered in this range, counted from saved orders only.</p></div>` +
      `</div>` +
      dealSalesTableHtml(summary.dealSales) +
      `</section>` +
      `</div>`;
  }

  function renderReportsPage(view) {
    const customRange = state.reportsRange === "custom";

    view.innerHTML =
      pageHeaderHtml({
        title: "Reports",
        subtitle: "Every figure below is calculated from orders saved on this device.",
        actions:
          `<button class="btn btn-secondary" type="button" data-action="reports-print">${icon("print")}Print</button>` +
          `<button class="btn btn-primary" type="button" data-action="reports-download">${icon("download")}Download CSV</button>`,
      }) +
      `<section class="panel reports-filter-panel">` +
      `<div class="reports-filter-row">` +
      `<label class="select-field reports-range-field">` +
      `<span class="reports-filter-label">Date range</span>` +
      `<select id="reports-range" name="reports-range" data-reports-range>${reportsRangeOptionsHtml()}</select>` +
      `<span class="select-chevron" aria-hidden="true">${icon("chevron-down")}</span>` +
      `</label>` +
      (customRange
        ? `<label class="reports-date-field"><span class="reports-filter-label">From</span>` +
          `<input id="reports-start" name="reports-start" type="date" data-reports-start value="${escapeHtml(state.reportsStart)}"></label>` +
          `<label class="reports-date-field"><span class="reports-filter-label">To</span>` +
          `<input id="reports-end" name="reports-end" type="date" data-reports-end value="${escapeHtml(state.reportsEnd)}"></label>`
        : `<span class="reports-range-note">${icon("calendar")}${escapeHtml(reportsRangeLabel())}</span>`) +
      `</div>` +
      `</section>` +
      `<div id="reports-content"></div>`;

    renderReportsContent();
  }

  function downloadReportsCsv() {
    const orders = filteredReportOrders();
    const summary = reportSummary(orders);
    const tableSales = reportTableSales(orders);
    const rangeLabel = reportsRangeLabel();

    const rows = [
      ["Report", "Restaurant orders"],
      ["Range", rangeLabel],
      ["Generated", formatDateTime(new Date())],
      [],
      ["Total orders", orders.length],
      ["Total sales", formatMoney(summary.totalSales)],
      ["Average order value", formatMoney(summary.averageOrder)],
      ["Best selling item", summary.bestSeller ? summary.bestSeller.name : "No sales"],
      ["Best seller quantity", summary.bestSeller ? summary.bestSeller.quantity : 0],
      [],
      ["Table No.", "Orders", "Sales"],
    ];

    if (tableSales.length) {
      tableSales.forEach((entry) => {
        rows.push([
          entry.tableNumber ? `Table ${entry.tableNumber}` : "No table",
          entry.orders,
          formatMoney(entry.sales),
        ]);
      });
    } else {
      rows.push(["No table sales in this range", 0, formatMoney(0)]);
    }

    rows.push([], ["Deal", "Times ordered", "Revenue"]);
    if (summary.dealSales.length) {
      summary.dealSales.forEach((entry) => {
        rows.push([entry.name, entry.quantity, formatMoney(entry.sales)]);
      });
    } else {
      rows.push(["No deal sales in this range", 0, formatMoney(0)]);
    }

    rows.push([], ["Best seller", "Quantity", "Sales"]);
    if (summary.bestSellers.length) {
      summary.bestSellers.slice(0, 5).forEach((entry) => {
        rows.push([entry.name, entry.quantity, formatMoney(entry.sales)]);
      });
    } else {
      rows.push(["No items sold in this range", 0, formatMoney(0)]);
    }

    rows.push([], ["Order number", "Date", "Time", "Table", "Items", "Quantity", "Total", "Status"]);
    if (orders.length) {
      sortOrders(orders).forEach((order) => {
        const items = Array.isArray(order.items) ? order.items : [];
        rows.push([
          order.orderNumber || "",
          formatDateFull(order.time),
          formatTime(order.time),
          tableLabel(order.tableNumber),
          items.map((item) => `${item.name || "Item"} x ${Number(item.quantity) || 0}`).join("; "),
          orderItemTotal(order),
          orderTotal(order),
          order.status || "Received",
        ]);
      });
    } else {
      rows.push(["No orders in this range", "", "", "", "", 0, formatMoney(0), ""]);
    }

    const csv = "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const filename = `${slugify(getSettings().restaurantName) || "restaurant"}-report-${localDateKey(
      new Date()
    )}.csv`;
    saveBlob(blob, filename);
    showToast("Filtered report downloaded as CSV.");
  }

  function printReports() {
    const orders = filteredReportOrders();
    if (!orders.length) {
      showToast("There are no orders in this range to print.", "warning");
      return;
    }

    const summary = reportSummary(orders);
    const tableSales = reportTableSales(orders);
    const rangeLabel = reportsRangeLabel();
    const settings = getSettings();

    const tableRows = tableSales
      .map(
        (entry) =>
          `<tr><td>${entry.tableNumber ? `Table ${entry.tableNumber}` : "No table"}</td>` +
          `<td class="num">${entry.orders}</td>` +
          `<td class="num">${escapeHtml(formatMoney(entry.sales))}</td></tr>`
      )
      .join("");

    const bestRows = summary.bestSellers
      .slice(0, 5)
      .map(
        (entry, index) =>
          `<tr><td>${index + 1}</td><td>${escapeHtml(entry.name)}</td>` +
          `<td class="num">${entry.quantity}</td>` +
          `<td class="num">${escapeHtml(formatMoney(entry.sales))}</td></tr>`
      )
      .join("");

    const dealRows = summary.dealSales
      .map(
        (entry) =>
          `<tr><td>${escapeHtml(entry.name)}</td><td class="num">${entry.quantity}</td>` +
          `<td class="num">${escapeHtml(formatMoney(entry.sales))}</td></tr>`
      )
      .join("");

    const printWindow = window.open("", "_blank", "width=820,height=820");
    if (!printWindow) {
      showToast("Allow pop-ups in the browser to print the report.", "error");
      return;
    }

    printWindow.document.write(
      `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Reports · ${escapeHtml(settings.restaurantName)}</title>` +
      `<style>` +
      `body{margin:0;padding:36px;background:#fff;color:#1a1a1a;font:12px/1.5 "Manrope",Arial,sans-serif;}` +
      `h1{margin:0;font:600 26px Georgia,serif;color:#0f2e1f;}` +
      `h2{margin:28px 0 10px;font:600 17px Georgia,serif;color:#0f2e1f;}` +
      `.muted{color:#6c675d;font-size:11px;margin-top:2px;}` +
      `.summary{display:flex;gap:22px;margin:22px 0 4px;flex-wrap:wrap;}` +
      `.summary div{border-left:3px solid #e67e22;padding-left:10px;min-width:130px;}` +
      `.summary span{display:block;color:#6c675d;font-size:10px;text-transform:uppercase;letter-spacing:.08em;}` +
      `.summary strong{font-size:17px;color:#0f2e1f;}` +
      `table{width:100%;border-collapse:collapse;}` +
      `th,td{text-align:left;padding:8px 6px;border-bottom:1px solid #e8e4db;}` +
      `th{font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:#6c675d;}` +
      `.num{text-align:right;}` +
      `</style></head><body onload="window.print()">` +
      `<h1>${escapeHtml(settings.restaurantName)}</h1>` +
      `<div class="muted">Reports · ${escapeHtml(rangeLabel)} · Generated ${escapeHtml(formatDateTime(new Date()))}</div>` +
      `<div class="summary">` +
      `<div><span>Total orders</span><strong>${orders.length}</strong></div>` +
      `<div><span>Total sales</span><strong>${escapeHtml(formatMoney(summary.totalSales))}</strong></div>` +
      `<div><span>Average order</span><strong>${escapeHtml(formatMoney(summary.averageOrder))}</strong></div>` +
      `<div><span>Best seller</span><strong>${escapeHtml(summary.bestSeller ? summary.bestSeller.name : "No sales")}</strong></div>` +
      `</div>` +
      `<h2>Table-wise sales</h2>` +
      (tableSales.length
        ? `<table><thead><tr><th>Table No.</th><th class="num">Orders</th><th class="num">Sales</th></tr></thead><tbody>${tableRows}</tbody></table>`
        : `<p class="muted">No table sales in this range.</p>`) +
      `<h2>Deal sales</h2>` +
      (summary.dealSales.length
        ? `<table><thead><tr><th>Deal</th><th class="num">Times ordered</th><th class="num">Revenue</th></tr></thead><tbody>${dealRows}</tbody></table>`
        : `<p class="muted">No deal sales in this range.</p>`) +
      `<h2>Best sellers</h2>` +
      (summary.bestSellers.length
        ? `<table><thead><tr><th>#</th><th>Item</th><th class="num">Quantity</th><th class="num">Sales</th></tr></thead><tbody>${bestRows}</tbody></table>`
        : `<p class="muted">No items sold in this range.</p>`) +
      `</body></html>`
    );
    printWindow.document.close();
  }

  /* ------------------------------------------------------------------------
     Staff page
     ------------------------------------------------------------------------ */

  const ROLE_DESCRIPTIONS = {
    Owner: "Full access, including Settings and Staff.",
    Manager: "Dashboard, Menu, Orders, Tables, Offers and Reports.",
    Kitchen: "Kitchen screen and order status updates only.",
    Waiter: "Orders view only, and can mark Ready orders as Served.",
  };

  function staffRoleBadge(role) {
    const safeRole = STAFF_ROLES.includes(role) ? role : "Waiter";
    return `<span class="role-badge role-badge--${safeRole.toLowerCase()}">${escapeHtml(safeRole)}</span>`;
  }

  function staffRowHtml(member) {
    const session = currentSession();
    const isSelf =
      Boolean(session) &&
      (session.id === member.id ||
        String(session.username).toLowerCase() === member.username.toLowerCase());
    const isOwnerAccount = member.role === "Owner";

    return (
      `<tr>` +
      `<td><span class="cell-strong">${escapeHtml(member.name)}</span>` +
      `<span class="cell-sub">${isSelf ? "Signed in" : escapeHtml(ROLE_DESCRIPTIONS[member.role] || "")}</span></td>` +
      `<td>${staffRoleBadge(member.role)}</td>` +
      `<td><span class="staff-username">${escapeHtml(member.username)}</span></td>` +
      `<td>` +
      `<label class="switch-field staff-status">` +
      `<input type="checkbox" data-staff-active data-staff-id="${escapeHtml(member.id)}"${member.active ? " checked" : ""}${isOwnerAccount ? " disabled" : ""}>` +
      `<span class="switch" aria-hidden="true"></span>` +
      `<span class="switch-text">${member.active ? "Active" : "Hidden"}</span>` +
      `</label>` +
      `</td>` +
      `<td class="cell-actions">` +
      `<div class="inline-actions">` +
      `<button class="icon-button" type="button" data-action="staff-edit" data-staff-id="${escapeHtml(member.id)}" aria-label="Edit ${escapeHtml(member.name)}">${icon("edit")}</button>` +
      (isOwnerAccount
        ? ""
        : `<button class="icon-button icon-button--danger" type="button" data-action="staff-delete" data-staff-id="${escapeHtml(member.id)}" aria-label="Delete ${escapeHtml(member.name)}">${icon("trash")}</button>`) +
      `</div>` +
      `</td>` +
      `</tr>`
    );
  }

  function staffRoleCardsHtml() {
    return (
      `<div class="staff-role-grid">` +
      STAFF_ROLES.map(
        (role) =>
          `<div class="staff-role-card">` +
          staffRoleBadge(role) +
          `<p>${escapeHtml(ROLE_DESCRIPTIONS[role])}</p>` +
          `</div>`
      ).join("") +
      `</div>`
    );
  }

  function renderStaffPage(view) {
    const members = getStaff();
    const activeCount = members.filter((member) => member.active).length;

    view.innerHTML =
      pageHeaderHtml({
        title: "Staff",
        subtitle: `${pluralise(members.length, "staff account")} · ${activeCount} active. Login roles stay in this browser.`,
        actions: `<button class="btn btn-primary" type="button" data-action="staff-add">${icon("plus")}Add staff</button>`,
      }) +
      `<section class="panel">` +
      `<div class="panel-head">` +
      `<div><h2 class="panel-title">Staff accounts</h2><p class="panel-sub">Hover a status switch to activate or hide a login.</p></div>` +
      `</div>` +
      `<div class="data-table-wrap">` +
      `<table class="data-table data-table--staff">` +
      `<thead><tr><th>Name</th><th>Role</th><th>Username</th><th>Status</th><th class="th-actions"><span class="sr-only">Actions</span></th></tr></thead>` +
      `<tbody>${members.map((member) => staffRowHtml(member)).join("")}</tbody>` +
      `</table></div>` +
      `</section>` +
      `<section class="panel staff-roles-panel">` +
      `<div class="panel-head">` +
      `<div><h2 class="panel-title">Role access</h2><p class="panel-sub">Every role opens its own home page and cannot enter a blocked page.</p></div>` +
      `</div>` +
      staffRoleCardsHtml() +
      `<p class="staff-password-note">${icon("lock")}Passwords are placeholders stored locally. Replace <code>${escapeHtml(
        DEFAULT_STAFF_PASSWORD
      )}</code> with each staff member's real password when the backend is added.</p>` +
      `</section>`;
  }

  function openStaffForm(staffId) {
    const member = staffId ? getStaff().find((entry) => entry.id === staffId) : null;
    if (staffId && !member) {
      showToast("That staff member could not be found.", "error");
      return;
    }

    const isEditing = Boolean(member);
    const selectedRole = member ? member.role : "Waiter";
    const roleOptions = STAFF_ROLES.map(
      (role) =>
        `<option value="${role}"${role === selectedRole ? " selected" : ""}>${role}</option>`
    ).join("");

    openModal({
      title: isEditing ? "Edit staff member" : "Add staff member",
      subtitle: isEditing
        ? "Update this person's name, role or login."
        : "Create a login for a manager, kitchen or waiter account.",
      kicker: "Staff & access",
      body:
        `<form class="admin-form" id="admin-staff-form" data-form="staff" data-staff-id="${member ? escapeHtml(member.id) : ""}" novalidate>` +
        `<p class="form-error" data-form-error role="alert" hidden></p>` +
        `<div class="field"><label for="staff-name">Full name</label>` +
        `<input id="staff-name" name="name" type="text" maxlength="60" required value="${member ? escapeHtml(member.name) : ""}" placeholder="e.g. Duty Manager" data-autofocus>` +
        `</div>` +
        `<div class="form-grid form-grid--2">` +
        `<div class="field"><label for="staff-role">Role</label>` +
        `<select id="staff-role" name="role" required>${roleOptions}</select>` +
        `<p class="field-hint" data-staff-role-hint>${escapeHtml(ROLE_DESCRIPTIONS[selectedRole])}</p>` +
        `</div>` +
        `<div class="field"><label for="staff-username">Username</label>` +
        `<input id="staff-username" name="username" type="text" maxlength="30" autocomplete="off" spellcheck="false" required value="${member ? escapeHtml(member.username) : ""}" placeholder="e.g. manager">` +
        `</div>` +
        `</div>` +
        `<div class="field"><label for="staff-password">Password</label>` +
        `<input id="staff-password" name="password" type="text" maxlength="60" autocomplete="new-password" spellcheck="false" value="${isEditing ? "" : escapeHtml(
          DEFAULT_STAFF_PASSWORD
        )}" placeholder="${escapeHtml(DEFAULT_STAFF_PASSWORD)}">` +
        `<p class="field-hint">${isEditing ? "Leave blank to keep the current password. " : ""}Placeholder only — real passwords are entered by the owner and stored in this browser.</p>` +
        `</div>` +
        (isEditing
          ? `<label class="switch-field switch-field--boxed">` +
            `<input type="checkbox" name="active"${member.active ? " checked" : ""}${member.role === "Owner" ? " disabled" : ""}>` +
            `<span class="switch" aria-hidden="true"></span>` +
            `<span class="switch-copy"><strong>Login active</strong><span>Hidden staff keep their data but cannot sign in.</span></span>` +
            `</label>`
          : "") +
        `</form>`,
      footer:
        `<button class="btn btn-secondary" type="button" data-modal-close>Cancel</button>` +
        `<button class="btn btn-primary" type="submit" form="admin-staff-form">${isEditing ? "Save changes" : "Add staff"}</button>`,
      onMount(overlay) {
        const roleSelect = overlay.querySelector("#staff-role");
        const roleHint = overlay.querySelector("[data-staff-role-hint]");
        if (!roleSelect || !roleHint) return;
        roleSelect.addEventListener("change", () => {
          roleHint.textContent = ROLE_DESCRIPTIONS[roleSelect.value] || "";
        });
      },
    });
  }

  function saveStaffForm(form) {
    const errorBox = form.querySelector("[data-form-error]");
    const setError = (message) => {
      if (errorBox) {
        errorBox.textContent = message;
        errorBox.hidden = false;
      }
      showToast(message, "error");
    };

    const name = String(form.elements.name.value || "").trim();
    const role = String(form.elements.role.value || "");
    const username = String(form.elements.username.value || "").trim();
    const password = String(form.elements.password.value || "").trim();
    const activeToggle = form.elements.active;
    const staffId = form.dataset.staffId || "";
    const members = getStaff();
    const existingIndex = staffId ? members.findIndex((entry) => entry.id === staffId) : -1;
    const existing = existingIndex >= 0 ? members[existingIndex] : null;

    if (!name) return setError("Enter the staff member's name.");
    if (!STAFF_ROLES.includes(role)) return setError("Choose a valid staff role.");
    if (username.length < 3) return setError("Use at least 3 characters for the username.");
    if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
      return setError("Use letters, numbers, dots, dashes or underscores for the username.");
    }
    if (
      members.some(
        (entry) =>
          entry.username.toLowerCase() === username.toLowerCase() && (!existing || entry.id !== existing.id)
      )
    ) {
      return setError("That username is already used by another staff member.");
    }
    if (existing && existing.role === "Owner" && role !== "Owner") {
      return setError("The Owner account must keep the Owner role.");
    }

    const nextActive = activeToggle ? Boolean(activeToggle.checked) : existing ? existing.active : true;

    if (existing && existing.role === "Owner" && !nextActive) {
      return setError("The Owner account must stay active.");
    }

    const session = currentSession();
    if (existing && session && (session.id === existing.id || session.username === existing.username) && !nextActive) {
      return setError("You can't hide the account you're signed in with.");
    }

    const nextMember = {
      id: existing ? existing.id : `staff-${Date.now().toString(36)}`,
      name,
      role,
      username,
      password: password || (existing ? existing.password : DEFAULT_STAFF_PASSWORD),
      active: nextActive,
    };

    const nextMembers = [...members];
    if (existing) nextMembers[existingIndex] = nextMember;
    else nextMembers.push(nextMember);

    try {
      saveStaffMembers(nextMembers);
    } catch (error) {
      setError(errorMessage(error));
      return;
    }

    if (existing && session && (session.id === existing.id || session.username === existing.username)) {
      setSession(sessionFromStaff(nextMember));
      state.session = sessionFromStaff(nextMember);
    }

    closeModal();
    refreshShell();
    renderCurrentPage({ keepScroll: true });
    showToast(existing ? `${name} updated.` : `${name} added. They can sign in with this username.`);
  }

  function toggleStaffActive(staffId, active) {
    const members = getStaff();
    const member = members.find((entry) => entry.id === staffId);
    if (!member) return;

    if (member.role === "Owner" && !active) {
      showToast("The Owner account must stay active.", "warning");
      renderCurrentPage({ keepScroll: true });
      return;
    }

    const session = currentSession();
    if (session && session.id === member.id && !active) {
      showToast("You can't hide the account you're signed in with.", "warning");
      renderCurrentPage({ keepScroll: true });
      return;
    }

    member.active = Boolean(active);

    try {
      saveStaffMembers(members);
    } catch (error) {
      showToast(errorMessage(error), "error");
      renderCurrentPage({ keepScroll: true });
      return;
    }

    showToast(`${member.name} is now ${member.active ? "active" : "hidden"}.`);
    renderCurrentPage({ keepScroll: true });
  }

  function deleteStaffMember(staffId) {
    const member = getStaff().find((entry) => entry.id === staffId);
    if (!member) return;

    if (member.role === "Owner") {
      showToast("The Owner account can't be deleted.", "warning");
      return;
    }

    const session = currentSession();
    if (session && session.id === member.id) {
      showToast("You can't delete the account you're signed in with.", "warning");
      return;
    }

    confirmDialog({
      title: "Delete staff member?",
      message: `${member.name} (${member.username}) will no longer be able to sign in. This cannot be undone.`,
      confirmLabel: "Delete staff",
      tone: "danger",
      onConfirm() {
        try {
          saveStaffMembers(getStaff().filter((entry) => entry.id !== staffId));
        } catch (error) {
          showToast(errorMessage(error), "error");
          return false;
        }
        showToast(`${member.name} deleted.`);
        renderCurrentPage({ keepScroll: true });
        return true;
      },
    });
  }

  /* ------------------------------------------------------------------------
     Kitchen view
     ------------------------------------------------------------------------ */

  const KITCHEN_ACTION_LABELS = {
    Preparing: "Start preparing",
    Ready: "Mark food ready",
  };

  function liveKitchenOrders() {
    return getOrders()
      .filter((order) => KITCHEN_STATUSES.includes(order && order.status))
      .sort((a, b) => {
        const timeA = new Date(a && a.time).getTime() || 0;
        const timeB = new Date(b && b.time).getTime() || 0;
        return timeB - timeA;
      });
  }

  function minutesSinceTime(value) {
    const placedAt = new Date(value).getTime();
    if (!Number.isFinite(placedAt)) return 0;
    return Math.max(0, Math.floor((Date.now() - placedAt) / 60000));
  }

  function minutesSinceOrder(order) {
    return minutesSinceTime(order && order.time);
  }

  function elapsedToneClass(minutes) {
    if (minutes >= 25) return " is-late";
    if (minutes >= 15) return " is-warning";
    return "";
  }

  function kitchenSpecialNote(order) {
    if (!order) return "";
    const candidates = [
      order.note,
      order.specialNote,
      order.instructions,
      order.specialInstructions,
      order.kitchenNote,
      order.comment,
    ];
    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
    }
    return "";
  }

  function kitchenTicketHtml(order, isNewArrival) {
    const nextStatus = KITCHEN_STATUSES.includes(order.status) ? getNextStatus(order.status) : null;
    const actionLabel = nextStatus ? KITCHEN_ACTION_LABELS[nextStatus] || "" : "";
    const items = Array.isArray(order.items) ? order.items : [];
    const elapsed = minutesSinceOrder(order);
    const note = kitchenSpecialNote(order);
    const mode = orderMode(order);
    const isDineIn = mode === "dine-in";
    const destinationLabel = isDineIn ? "Table" : orderModeLabel(mode);
    const destinationValue = isDineIn
      ? orderTableNumber(order) || "—"
      : String(order.customerName || "").trim() || "—";

    const itemRows = items.length
      ? items
          .map((item) => {
            const contentsText = orderItemContentsText(item);
            const isDeal = isDealOrderItem(item);
            return (
              `<li class="kds-item${isDeal ? " kds-item--deal" : ""}">` +
              `<span class="kds-item-qty">${Number(item.quantity) || 0}x</span>` +
              `<span class="kds-item-name">${escapeHtml(item.name || "Item")}` +
              (isDeal ? `<span class="kds-deal-tag">Deal</span>` : "") +
              (contentsText
                ? `<span class="kds-item-contents">${isDeal ? "Includes: " : "each: "}${escapeHtml(contentsText)}</span>`
                : "") +
              `</span>` +
              `</li>`
            );
          })
          .join("")
      : `<li class="kds-item kds-item--empty">No items recorded</li>`;

    return (
      `<article class="kds-card${isNewArrival ? " is-new" : ""}" data-order-number="${escapeHtml(order.orderNumber)}">` +
      (isNewArrival ? `<span class="kds-new-badge">New order</span>` : "") +
      `<header class="kds-card-head">` +
      `<div class="kds-table${isDineIn ? "" : " kds-table--mode"}">` +
      `<span class="kds-table-label">${escapeHtml(destinationLabel)}</span>` +
      `<span class="kds-table-number${isDineIn ? "" : " kds-table-number--text"}">${escapeHtml(
        String(destinationValue)
      )}</span>` +
      `</div>` +
      `<div class="kds-meta">` +
      `<span class="kds-order">#${escapeHtml(order.orderNumber)}</span>` +
      `<span class="kds-elapsed${elapsedToneClass(elapsed)}" data-kds-elapsed data-time="${escapeHtml(order.time || "")}">` +
      `${icon("clock")}<span data-kds-minutes>${elapsed}</span> min</span>` +
      `</div>` +
      `</header>` +
      `<ul class="kds-items">${itemRows}</ul>` +
      (note ? `<p class="kds-note"><span>Note</span>${escapeHtml(note)}</p>` : "") +
      `<footer class="kds-card-foot">` +
      statusBadge(order.status) +
      (nextStatus
        ? `<button class="btn btn-sm btn-primary" type="button" data-action="kitchen-advance" data-order-number="${escapeHtml(order.orderNumber)}">` +
          `${escapeHtml(actionLabel)}${icon("arrow-right")}</button>`
        : "") +
      `</footer>` +
      `</article>`
    );
  }

  function renderKitchenPage(view) {
    const orders = liveKitchenOrders();
    const now = Date.now();
    const liveNumbers = new Set(orders.map((order) => order.orderNumber));

    for (const number of state.kitchenFirstSeen.keys()) {
      if (!liveNumbers.has(number)) state.kitchenFirstSeen.delete(number);
    }

    if (!state.kitchenInitialized) {
      orders.forEach((order) => {
        if (!state.kitchenFirstSeen.has(order.orderNumber)) {
          state.kitchenFirstSeen.set(order.orderNumber, now - KITCHEN_HIGHLIGHT_MS - 1000);
        }
      });
      state.kitchenInitialized = true;
    } else {
      orders.forEach((order) => {
        if (!state.kitchenFirstSeen.has(order.orderNumber)) state.kitchenFirstSeen.set(order.orderNumber, now);
      });
    }

    const received = orders.filter((order) => order.status === "Received").length;
    const preparing = orders.filter((order) => order.status === "Preparing").length;
    const cards = orders
      .map((order) => {
        const firstSeen = state.kitchenFirstSeen.get(order.orderNumber) || 0;
        return kitchenTicketHtml(order, now - firstSeen < KITCHEN_HIGHLIGHT_MS);
      })
      .join("");

    view.innerHTML =
      pageHeaderHtml({
        title: "Kitchen",
        subtitle: orders.length
          ? `${pluralise(orders.length, "live order")} · ${received} new · ${preparing} preparing`
          : "Live kitchen tickets for this restaurant.",
        actions: `<a class="btn btn-secondary" href="orders.html">${icon("receipt")}All orders</a>`,
      }) +
      (orders.length
        ? `<div class="kds-toolbar">` +
          `<div class="kds-counts">` +
          `<span class="kds-count">${icon("bell")}${received} new</span>` +
          `<span class="kds-count kds-count--preparing">${icon("flame")}${preparing} preparing</span>` +
          `</div>` +
          `<span class="kds-refresh">${icon("refresh")}Refreshes every 10 seconds</span>` +
          `</div>` +
          `<div class="kds-grid">${cards}</div>`
        : `<section class="panel">` +
          emptyStateHtml({
            icon: "check",
            title: "No live orders",
            message: "New table orders will appear here automatically.",
            action: `<a class="btn btn-secondary btn-sm" href="${escapeHtml(customerMenuHref())}" target="_blank" rel="noopener">${icon("external")}Open customer menu</a>`,
          }) +
          `</section>`);

    state.kitchenSignature = kitchenOrdersSignature(orders);
  }

  function kitchenOrdersSignature(orders) {
    return orders
      .map((order) => {
        const itemCount = Array.isArray(order.items) ? order.items.length : 0;
        return `${order.orderNumber}:${order.status}:${order.time || ""}:${itemCount}`;
      })
      .join("|");
  }

  function refreshKitchenLive() {
    if (state.page !== "kitchen" || state.modalOpen) return;

    const orders = liveKitchenOrders();
    if (kitchenOrdersSignature(orders) !== state.kitchenSignature) {
      renderCurrentPage({ keepScroll: true });
      return;
    }

    document.querySelectorAll("#admin-view [data-kds-elapsed]").forEach((node) => {
      const minutes = minutesSinceTime(node.dataset.time);
      const label = node.querySelector("[data-kds-minutes]");
      if (label && label.textContent !== String(minutes)) label.textContent = String(minutes);
      const nextClass = `kds-elapsed${elapsedToneClass(minutes)}`;
      if (node.className !== nextClass) node.className = nextClass;
    });

    const now = Date.now();
    document.querySelectorAll("#admin-view .kds-card.is-new").forEach((card) => {
      const firstSeen = state.kitchenFirstSeen.get(card.dataset.orderNumber) || 0;
      if (now - firstSeen < KITCHEN_HIGHLIGHT_MS) return;
      card.classList.remove("is-new");
      const badge = card.querySelector(".kds-new-badge");
      if (badge) badge.remove();
    });
  }

  function advanceKitchenOrder(orderNumber) {
    const order = getOrders().find((entry) => entry.orderNumber === orderNumber);
    if (!order) {
      showToast("That order could not be found.", "error");
      return;
    }

    if (!KITCHEN_STATUSES.includes(order.status)) {
      showToast("This order has left the kitchen queue.", "warning");
      renderCurrentPage({ keepScroll: true });
      return;
    }

    const nextStatus = getNextStatus(order.status);
    if (!nextStatus || !KITCHEN_ACTION_LABELS[nextStatus]) {
      showToast("This order can't move forward from the kitchen.", "warning");
      return;
    }

    if (!updateOrderStatus(orderNumber, nextStatus)) return;
    renderCurrentPage({ keepScroll: true });
  }

  /* ------------------------------------------------------------------------
     New order watcher (sound alert, kitchen refresh)
     ------------------------------------------------------------------------ */

  let orderWatchTimer = null;
  let kitchenRefreshTimer = null;

  function detectNewOrders() {
    const orders = getOrders();
    const numbers = new Set(orders.map((order) => order.orderNumber).filter(Boolean));

    if (!state.seenOrderNumbers) {
      state.seenOrderNumbers = numbers;
      return [];
    }

    const fresh = orders.filter(
      (order) => order && order.orderNumber && !state.seenOrderNumbers.has(order.orderNumber)
    );
    fresh.forEach((order) => state.seenOrderNumbers.add(order.orderNumber));

    if (!fresh.length) return [];
    if (!["dashboard", "orders", "kitchen"].includes(state.page)) return fresh;

    playAlertSound();
    fresh.slice(0, 3).forEach((order) => {
      const tableNumber = orderTableNumber(order);
      showToast(
        `New order #${order.orderNumber}${tableNumber ? ` · Table ${tableNumber}` : ""}`,
        "success"
      );
    });

    if (state.page === "kitchen") {
      state.kitchenFirstSeen.set(fresh[0].orderNumber, Date.now());
      refreshKitchenLive();
    }

    return fresh;
  }

  function startOrderWatch() {
    if (orderWatchTimer) return;

    state.seenOrderNumbers = new Set(getOrders().map((order) => order.orderNumber).filter(Boolean));

    orderWatchTimer = window.setInterval(() => {
      if (document.hidden) return;
      detectNewOrders();
    }, ORDER_WATCH_MS);

    kitchenRefreshTimer = window.setInterval(() => {
      if (document.hidden) return;
      refreshKitchenLive();
    }, KITCHEN_REFRESH_MS);

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) return;
      detectNewOrders();
      refreshKitchenLive();
    });

    document.addEventListener("pointerdown", primeAudio, { once: true });
    document.addEventListener("keydown", primeAudio, { once: true });
  }

  /* ------------------------------------------------------------------------
     Tables and QR codes
     ------------------------------------------------------------------------ */

  const themeColors = (CONFIG.theme && CONFIG.theme.colors) || {};
  const TABLE_NUMBER_LIMIT = 999;
  const DEMO_MENU_PATH = "../demo/karahi-house/";
  let qrLibraryPromise = null;

  function getMenuUrl(tableNumber) {
    const queryParam = (CONFIG.table && CONFIG.table.queryParam) || "table";

    if (tenantRestaurantId === (window.DemoData ? window.DemoData.id : "demo-karahi-house")) {
      const demoUrl = new URL(DEMO_MENU_PATH, window.location.href);
      demoUrl.searchParams.set(queryParam, String(tableNumber));
      return demoUrl.href;
    }

    const url = new URL("../index.html", window.location.href);
    url.searchParams.set("restaurant", tenantRestaurantId);
    url.searchParams.set(queryParam, String(tableNumber));
    return url.href;
  }

  function loadQrLibrary() {
    if (window.QRCode) return Promise.resolve(window.QRCode);
    if (qrLibraryPromise) return qrLibraryPromise;

    qrLibraryPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = QR_LIBRARY_URL;
      script.async = true;

      let settled = false;
      const finish = (error) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);

        if (error || !window.QRCode) {
          script.remove();
          qrLibraryPromise = null;
          reject(error || new Error("QR library unavailable"));
          return;
        }

        resolve(window.QRCode);
      };

      const timer = window.setTimeout(() => finish(new Error("QR library timed out")), QR_LIBRARY_TIMEOUT);

      script.addEventListener("load", () => finish(null), { once: true });
      script.addEventListener("error", () => finish(new Error("QR library failed to load")), { once: true });
      document.head.appendChild(script);
    });

    return qrLibraryPromise;
  }

  function qrErrorMarkup() {
    return (
      `<div class="qr-error">` +
      `<span class="qr-error-icon">${icon("alert")}</span>` +
      `<p>The QR code couldn't load.</p>` +
      `<button class="btn btn-secondary btn-xs" type="button" data-action="table-qr-retry">${icon("refresh")}Try again</button>` +
      `</div>`
    );
  }

  function paintTableQrHolder(holder, QRCode) {
    const tableNumber = Number(holder.dataset.qrTable);

    try {
      holder.innerHTML = "";
      new QRCode(holder, {
        text: getMenuUrl(tableNumber),
        width: 152,
        height: 152,
        colorDark: themeColors.primary || "#0F2E1F",
        colorLight: "#FFFFFF",
        correctLevel: QRCode.CorrectLevel ? QRCode.CorrectLevel.M : 0,
      });

      if (!holder.querySelector("canvas, img")) throw new Error("QR code could not render");

      holder.setAttribute("aria-busy", "false");
      holder.setAttribute("role", "img");
      holder.setAttribute("aria-label", `QR code for ${tableLabel(tableNumber)}`);
    } catch {
      holder.setAttribute("aria-busy", "false");
      holder.innerHTML = qrErrorMarkup();
    }
  }

  function renderTableQrHolders() {
    const holders = Array.from(document.querySelectorAll("[data-qr-table]"));
    if (!holders.length) return;

    holders.forEach((holder) => {
      holder.setAttribute("aria-busy", "true");
      holder.removeAttribute("role");
      holder.removeAttribute("aria-label");
      holder.innerHTML = `<div class="qr-loading"><span class="spinner" aria-hidden="true"></span><span>Preparing QR…</span></div>`;
    });

    loadQrLibrary()
      .then((QRCode) => {
        holders.forEach((holder) => {
          if (!holder.isConnected) return;
          paintTableQrHolder(holder, QRCode);
        });
      })
      .catch(() => {
        holders.forEach((holder) => {
          if (!holder.isConnected) return;
          holder.setAttribute("aria-busy", "false");
          holder.innerHTML = qrErrorMarkup();
        });
      });
  }

  function generateTableQr(tableNumber, trigger) {
    const holder = document.querySelector(`[data-qr-table="${tableNumber}"]`);
    if (!holder) {
      showToast("The QR code area could not be found. Reload the page and try again.", "error");
      return;
    }

    if (trigger) trigger.disabled = true;
    holder.classList.add("is-generating");
    holder.setAttribute("aria-busy", "true");
    holder.innerHTML = `<div class="qr-loading"><span class="spinner" aria-hidden="true"></span><span>Generating QR…</span></div>`;

    loadQrLibrary()
      .then((QRCode) => {
        paintTableQrHolder(holder, QRCode);
        holder.classList.add("qr-frame--generated");
        holder.scrollIntoView({ behavior: "smooth", block: "center" });
        window.setTimeout(() => holder.classList.remove("qr-frame--generated"), 1600);
        showToast(`${tableLabel(tableNumber)} QR code generated.`, "success");
      })
      .catch(() => {
        holder.setAttribute("aria-busy", "false");
        holder.innerHTML = qrErrorMarkup();
        showToast("The QR code couldn't be generated. Check your connection and try again.", "error");
      })
      .finally(() => {
        holder.classList.remove("is-generating");
        if (trigger) trigger.disabled = false;
      });
  }

  function renderQrCanvas(text, size, highCorrection) {
    const holder = document.createElement("div");
    holder.style.position = "fixed";
    holder.style.left = "-10000px";
    holder.style.top = "0";
    holder.setAttribute("aria-hidden", "true");
    document.body.appendChild(holder);

    try {
      const level = highCorrection ? window.QRCode.CorrectLevel.H : window.QRCode.CorrectLevel.M;
      new window.QRCode(holder, {
        text,
        width: size,
        height: size,
        colorDark: themeColors.primary || "#0F2E1F",
        colorLight: "#FFFFFF",
        correctLevel: level == null ? 0 : level,
      });

      const canvas = holder.querySelector("canvas");
      if (!canvas) throw new Error("QR canvas unavailable");
      return canvas;
    } finally {
      holder.remove();
    }
  }

  function roundRectPath(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();

    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(x, y, width, height, r);
      return;
    }

    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function drawSpacedText(ctx, text, centerX, y, spacing) {
    const characters = Array.from(text);
    const widths = characters.map((character) => ctx.measureText(character).width);
    const totalWidth = widths.reduce((sum, width) => sum + width, 0) + spacing * (characters.length - 1);
    let x = centerX - totalWidth / 2;

    ctx.textAlign = "left";
    characters.forEach((character, index) => {
      ctx.fillText(character, x, y);
      x += widths[index] + spacing;
    });
  }

  function fitCanvasText(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;

    let fitted = text;
    while (fitted.length > 1 && ctx.measureText(`${fitted}…`).width > maxWidth) {
      fitted = fitted.slice(0, -1);
    }
    return `${fitted.trimEnd()}…`;
  }

  function composeTableQrCard(qrCanvas, tableNumber) {
    const settings = getSettings();
    const width = 840;
    const height = 1140;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");

    ctx.fillStyle = "#FFF9F1";
    ctx.fillRect(0, 0, width, height);

    const headerGradient = ctx.createLinearGradient(0, 0, width, 272);
    headerGradient.addColorStop(0, themeColors.primary || "#0F2E1F");
    headerGradient.addColorStop(1, themeColors.primaryDeep || themeColors.primary || "#123524");
    ctx.fillStyle = headerGradient;
    ctx.fillRect(0, 0, width, 272);

    ctx.fillStyle = "rgba(253, 241, 228, 0.7)";
    ctx.font = '700 18px "Manrope", sans-serif';
    drawSpacedText(ctx, "TABLE MENU", width / 2, 72, 6);

    ctx.textAlign = "center";
    ctx.fillStyle = "#FFF9F1";
    ctx.font = '600 58px "Fraunces", Georgia, serif';
    ctx.fillText(fitCanvasText(ctx, settings.restaurantName, 700), width / 2, 148);

    const tableName = tableLabel(tableNumber).toUpperCase();
    ctx.font = '700 22px "Manrope", sans-serif';
    const pillLabel = fitCanvasText(ctx, tableName, 540);
    const pillWidth = Math.ceil(ctx.measureText(pillLabel).width) + 64;
    const pillY = 184;
    roundRectPath(ctx, (width - pillWidth) / 2, pillY, pillWidth, 46, 23);
    ctx.fillStyle = themeColors.accent || "#E67E22";
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(pillLabel, width / 2, pillY + 30);

    ctx.save();
    ctx.shadowColor = "rgba(15, 46, 31, 0.16)";
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 18;
    roundRectPath(ctx, 48, 250, 744, 850, 36);
    ctx.fillStyle = "#FFFDF8";
    ctx.fill();
    ctx.restore();

    roundRectPath(ctx, 116, 300, 608, 608, 24);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.strokeStyle = "#E8E4DB";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.drawImage(qrCanvas, 140, 324, 560, 560);

    ctx.textAlign = "center";
    ctx.fillStyle = themeColors.ink || "#1A1A1A";
    ctx.font = '700 30px "Manrope", sans-serif';
    ctx.fillText("Scan to open the menu", width / 2, 952);

    ctx.fillStyle = themeColors.muted || "#6C675D";
    ctx.font = '500 21px "Manrope", sans-serif';
    ctx.fillText("Point your phone camera at the code", width / 2, 988);

    ctx.strokeStyle = "#D8D1C2";
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(150, 1028);
    ctx.lineTo(690, 1028);
    ctx.stroke();
    ctx.setLineDash([]);

    const cashLabel = settings.paymentNote || "Pay cash at table";
    ctx.font = '700 22px "Manrope", sans-serif';
    const cashWidth = ctx.measureText(cashLabel).width;
    const dotSize = 10;
    const gap = 12;
    const cashStart = width / 2 - (cashWidth + dotSize + gap) / 2;

    ctx.fillStyle = themeColors.accent || "#E67E22";
    ctx.beginPath();
    ctx.arc(cashStart + dotSize / 2, 1068, dotSize / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.textAlign = "left";
    ctx.fillStyle = themeColors.primary || "#0F2E1F";
    ctx.fillText(cashLabel, cashStart + dotSize + gap, 1076);

    return canvas;
  }

  async function buildTableQrCard(tableNumber) {
    if (!window.QRCode) throw new Error("QR library unavailable");
    await waitForFonts();

    const qrCanvas = renderQrCanvas(getMenuUrl(tableNumber), 560, true);
    return composeTableQrCard(qrCanvas, tableNumber);
  }

  async function downloadTableQr(tableNumber, button) {
    const settings = getSettings();
    const label = tableLabel(tableNumber);
    const originalMarkup = button ? button.innerHTML : "";

    if (button) {
      button.disabled = true;
      button.textContent = "Preparing…";
    }

    try {
      await loadQrLibrary();
      const cardCanvas = await buildTableQrCard(tableNumber);
      const blob = await canvasToBlob(cardCanvas);
      const filename =
        `${slugify(settings.restaurantName) || "restaurant"}-table-${tableNumber}-qr.png`;
      saveBlob(blob, filename);
      showToast(`${label} QR code downloaded.`);
    } catch {
      showToast("We couldn't create this QR image. Please try again.", "error");
    } finally {
      if (button && button.isConnected) {
        button.disabled = false;
        button.innerHTML = originalMarkup;
      }
    }
  }

  async function printTableQr(tableNumber) {
    const printWindow = window.open("", "_blank", "width=540,height=760");
    if (!printWindow) {
      showToast("Allow pop-ups in the browser to print this QR code.", "error");
      return;
    }

    const settings = getSettings();
    const label = tableLabel(tableNumber);

    try {
      await loadQrLibrary();
      const cardCanvas = await buildTableQrCard(tableNumber);
      const dataUrl = cardCanvas.toDataURL("image/png");

      printWindow.document.write(
        `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escapeHtml(label)} QR · ${escapeHtml(settings.restaurantName)}</title>` +
        `<style>` +
        `body{margin:0;padding:24px;background:#f6f6f4;display:flex;align-items:center;justify-content:center;min-height:100vh;}` +
        `img{display:block;width:420px;max-width:100%;height:auto;box-shadow:0 12px 40px rgba(15,46,31,.18);border-radius:12px;}` +
        `@media print{body{padding:0;background:#fff;}img{box-shadow:none;width:100%;}}` +
        `</style></head><body><img src="${dataUrl}" alt="${escapeHtml(label)} QR code" onload="window.print()">` +
        `</body></html>`
      );
      printWindow.document.close();
    } catch {
      printWindow.close();
      showToast("We couldn't prepare this QR code for printing.", "error");
    }
  }

  async function printAllTableQrs() {
    const tables = getTables().slice().sort((first, second) => first.number - second.number);
    if (!tables.length) {
      showToast("Add a table before printing QR codes.", "error");
      return;
    }

    const printWindow = window.open("", "_blank", "width=900,height=780");
    if (!printWindow) {
      showToast("Allow pop-ups in the browser to print QR codes.", "error");
      return;
    }

    const settings = getSettings();
    const restaurantName = settings.restaurantName || "Restaurant";
    const pageStyle =
      `<style>` +
      `*{box-sizing:border-box;}` +
      `body{margin:0;padding:32px;background:#f6f6f4;color:#0F2E1F;font-family:"Manrope","Segoe UI",sans-serif;text-align:center;}` +
      `.qr-preparing{font-size:15px;color:#6C675D;padding:48px 0;}` +
      `.qr-page{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;min-height:90vh;}` +
      `.qr-restaurant{font-size:22px;font-weight:700;margin:0;}` +
      `img{width:340px;max-width:100%;height:auto;background:#fff;border-radius:12px;}` +
      `.qr-table{font-size:46px;font-weight:800;letter-spacing:.5px;margin:8px 0 0;}` +
      `@media print{` +
      `@page{size:A4 portrait;margin:12mm;}` +
      `body{padding:0;background:#fff;}` +
      `.qr-page{min-height:0;height:calc(297mm - 24mm);page-break-after:always;}` +
      `.qr-page:last-child{page-break-after:auto;}` +
      `}` +
      `</style>`;

    printWindow.document.write(
      `<!DOCTYPE html><html><head><meta charset="UTF-8">` +
      `<title>Table QR codes · ${escapeHtml(restaurantName)}</title>${pageStyle}</head>` +
      `<body><p class="qr-preparing">Preparing QR codes…</p></body></html>`
    );
    printWindow.document.close();

    try {
      await loadQrLibrary();
      await waitForFonts();

      const pages = tables
        .map((table) => {
          const qrCanvas = renderQrCanvas(getMenuUrl(table.number), 640, true);
          const dataUrl = qrCanvas.toDataURL("image/png");
          return (
            `<section class="qr-page">` +
            `<p class="qr-restaurant">${escapeHtml(restaurantName)}</p>` +
            `<img src="${dataUrl}" alt="QR code for Table ${table.number}">` +
            `<p class="qr-table">Table ${table.number}</p>` +
            `</section>`
          );
        })
        .join("");

      printWindow.document.open();
      printWindow.document.write(
        `<!DOCTYPE html><html><head><meta charset="UTF-8">` +
        `<title>Table QR codes · ${escapeHtml(restaurantName)}</title>${pageStyle}</head>` +
        `<body>${pages}` +
        `<script>window.addEventListener("load", function () { window.focus(); window.print(); });</script>` +
        `</body></html>`
      );
      printWindow.document.close();
    } catch {
      printWindow.close();
      showToast("We couldn't prepare the QR codes for printing.", "error");
    }
  }

  function nextTableNumber(tables) {
    let candidate = 1;
    while (tables.some((table) => table.number === candidate)) candidate += 1;
    return candidate;
  }

  function tableFormHtml(table, tables) {
    const isEditing = Boolean(table);
    const number = table ? table.number : nextTableNumber(tables);
    const name = table ? table.name : "";
    const url = getMenuUrl(number);

    return (
      `<form class="admin-form" data-form="table" data-original-number="${isEditing ? number : ""}" novalidate>` +
      `<p class="form-error" data-form-error role="alert" hidden></p>` +
      `<div class="form-grid form-grid--2">` +
      `<div class="field"><label for="table-number">Table number</label>` +
      `<input id="table-number" name="number" type="number" min="1" max="${TABLE_NUMBER_LIMIT}" step="1" required value="${number}" data-autofocus>` +
      `</div>` +
      `<div class="field"><label for="table-name">Table name</label>` +
      `<input id="table-name" name="name" type="text" maxlength="40" value="${escapeHtml(name)}" placeholder="e.g. Table ${number} or Family Booth">` +
      `</div>` +
      `</div>` +
      `<div class="link-preview">` +
      `<span class="field-label">Customer menu link</span>` +
      `<code data-table-link-preview>${escapeHtml(url)}</code>` +
      `<p class="field-hint">This link is what the QR code opens. It updates as soon as the table is saved.</p>` +
      `</div>` +
      (isEditing
        ? `<p class="field-hint field-hint--warn">Changing the number updates the link and QR code immediately. Past orders keep the table they were placed with.</p>`
        : "") +
      `</form>`
    );
  }

  function openTableForm(tableNumber) {
    const tables = getTables();
    const table = tableNumber == null ? null : tables.find((entry) => entry.number === tableNumber);
    if (tableNumber != null && !table) {
      showToast("That table could not be found.", "error");
      return;
    }

    openModal({
      title: table ? "Edit table" : "Add table",
      subtitle: table
        ? "Update the table name or number. The QR code follows the number."
        : "Create a table and get its menu link and QR code.",
      kicker: "Tables",
      size: "md",
      body: tableFormHtml(table, tables),
      footer:
        `<button class="btn btn-secondary" type="button" data-modal-close>Cancel</button>` +
        `<button class="btn btn-primary" type="submit" form="admin-table-form">${table ? "Save table" : "Add table"}</button>`,
      onMount(overlay) {
        const form = overlay.querySelector("[data-form='table']");
        if (form) form.id = "admin-table-form";

        const numberInput = overlay.querySelector("[name='number']");
        const nameInput = overlay.querySelector("[name='name']");
        const preview = overlay.querySelector("[data-table-link-preview]");

        if (numberInput && preview) {
          numberInput.addEventListener("input", () => {
            const value = Number(numberInput.value);
            preview.textContent =
              Number.isInteger(value) && value > 0 && value <= TABLE_NUMBER_LIMIT
                ? getMenuUrl(value)
                : "Enter a table number to see its link.";
          });
        }

        if (nameInput && numberInput) {
          nameInput.addEventListener("input", () => {
            if (nameInput.value.trim()) return;
            nameInput.placeholder = `Table ${numberInput.value || ""}`.trim();
          });
        }
      },
    });
  }

  function saveTableForm(form) {
    clearFormError(form);

    const originalValue = String(form.dataset.originalNumber || "");
    const originalNumber = originalValue ? Number(originalValue) : null;
    const number = Number(form.elements.number.value);
    const name = String(form.elements.name.value || "").trim();

    if (!Number.isInteger(number) || number < 1 || number > TABLE_NUMBER_LIMIT) {
      showFormError(form, `Enter a table number from 1 to ${TABLE_NUMBER_LIMIT}.`);
      form.elements.number.focus();
      return;
    }

    const tables = getTables();
    const clash = tables.some((table) => table.number === number && table.number !== originalNumber);
    if (clash) {
      showFormError(form, `Table ${number} already exists. Choose a different number.`);
      form.elements.number.focus();
      return;
    }

    const entry = { number, name: name || `Table ${number}` };
    const index = originalNumber ? tables.findIndex((table) => table.number === originalNumber) : -1;

    if (index >= 0) tables[index] = entry;
    else tables.push(entry);
    tables.sort((a, b) => a.number - b.number);

    try {
      saveTables(tables);
    } catch (error) {
      showFormError(form, errorMessage(error));
      showToast(errorMessage(error), "error");
      return;
    }

    closeModal();
    showToast(index >= 0 ? `${entry.name} updated.` : `${entry.name} added with a fresh QR code.`);
    renderCurrentPage({ keepScroll: true });
  }

  function deleteTable(tableNumber) {
    const table = getTables().find((entry) => entry.number === tableNumber);
    if (!table) return;

    confirmDialog({
      title: "Delete table?",
      message: `${table.name} will be removed from the table list. Its menu link and QR code stop being listed here. Past orders keep this table number.`,
      confirmLabel: "Delete table",
      tone: "danger",
      onConfirm() {
        const nextTables = getTables().filter((entry) => entry.number !== tableNumber);
        try {
          saveTables(nextTables);
        } catch (error) {
          showToast(errorMessage(error), "error");
          return false;
        }
        showToast(`${table.name} deleted.`);
        renderCurrentPage({ keepScroll: true });
        return true;
      },
    });
  }

  function renderTablesPage(view) {
    const tables = getTables();

    const cards = tables.length
      ? tables
          .map((table) => {
            const label = table.name;
            const menuUrl = getMenuUrl(table.number);
            const displayNumber = String(table.number).padStart(2, "0");

            return (
              `<article class="table-card">` +
              `<div class="table-card-head">` +
              `<div class="table-card-title">` +
              `<span class="table-number">${escapeHtml(displayNumber)}</span>` +
              `<div><h3>${escapeHtml(label)}</h3><p>Menu link and QR code</p></div>` +
              `</div>` +
              `<div class="row-actions">` +
              `<button class="icon-button icon-button--sm" type="button" data-action="table-edit" data-table-number="${table.number}" aria-label="Edit ${escapeHtml(label)}">${icon("edit")}</button>` +
              `<button class="icon-button icon-button--sm icon-button--danger" type="button" data-action="table-delete" data-table-number="${table.number}" aria-label="Delete ${escapeHtml(label)}">${icon("trash")}</button>` +
              `</div>` +
              `</div>` +
              `<div class="qr-frame" data-qr-table="${table.number}" aria-busy="true">` +
              `<div class="qr-loading"><span class="spinner" aria-hidden="true"></span><span>Preparing QR…</span></div>` +
              `</div>` +
              `<label class="table-url-field">` +
              `<span class="field-label">Menu link</span>` +
              `<span class="table-url-row">` +
              `<input id="table-link-${table.number}" name="table-link-${table.number}" type="text" readonly value="${escapeHtml(menuUrl)}" aria-label="Menu link for ${escapeHtml(label)}">` +
              `<button class="icon-button icon-button--sm" type="button" data-action="table-copy" data-table-number="${table.number}" aria-label="Copy menu link for ${escapeHtml(label)}">${icon("copy")}</button>` +
              `</span>` +
              `</label>` +
              `<div class="table-card-actions">` +
              `<button class="btn btn-secondary btn-xs" type="button" data-action="table-generate" data-table-number="${table.number}">${icon("refresh")}Generate QR</button>` +
              `<button class="btn btn-secondary btn-xs" type="button" data-action="table-download" data-table-number="${table.number}">${icon("download")}Download QR</button>` +
              `<button class="btn btn-secondary btn-xs" type="button" data-action="table-print" data-table-number="${table.number}">${icon("print")}Print QR</button>` +
              `<a class="btn btn-ghost btn-xs" href="${escapeHtml(menuUrl)}" target="_blank" rel="noopener">${icon("external")}Preview</a>` +
              `</div>` +
              `</article>`
            );
          })
          .join("")
      : emptyStateHtml({
          icon: "qr",
          title: "No tables yet",
          message: "Add a table to create its customer menu link and QR code.",
          action: `<button class="btn btn-primary btn-sm" type="button" data-action="table-add">${icon("plus")}Add table</button>`,
        });

    view.innerHTML =
      pageHeaderHtml({
        title: "Tables & QR Codes",
        subtitle: "Each table opens the same customer menu with its own table number attached.",
        actions:
          (tables.length
            ? `<button class="btn btn-secondary" type="button" data-action="table-print-all">${icon("print")}Print All QR Codes</button>`
            : "") +
          `<button class="btn btn-primary" type="button" data-action="table-add">${icon("plus")}Add table</button>`,
      }) +
      `<section class="panel tables-panel">` +
      `<div class="panel-head">` +
      `<div><h2 class="panel-title">${pluralise(tables.length, "table")}</h2><p class="panel-sub">Print or download a QR code for each table. Links update the moment a table is saved.</p></div>` +
      `</div>` +
      `<div class="table-grid" id="table-grid">${cards}</div>` +
      `</section>`;

    renderTableQrHolders();
  }

  /* ------------------------------------------------------------------------
     Offers
     ------------------------------------------------------------------------ */

  function combineDateTime(dateValue, timeValue, edge) {
    const date = parseDateOnly(dateValue);
    if (!date) return null;

    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(timeValue || "").trim());
    const hours = match ? Number(match[1]) : edge === "end" ? 23 : 0;
    const minutes = match ? Number(match[2]) : edge === "end" ? 59 : 0;
    const combined = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes);

    if (edge === "end") combined.setSeconds(59, 999);
    return combined;
  }

  function dealStartBound(deal) {
    return combineDateTime(deal.startDate, deal.startTime, "start");
  }

  function dealEndBound(deal) {
    return combineDateTime(deal.endDate, deal.endTime, "end");
  }

  function dealState(deal) {
    if (deal.active === false) return { label: "Inactive", tone: "muted" };

    const now = new Date();
    const start = dealStartBound(deal);
    const end = dealEndBound(deal);

    if (start && now < start) return { label: "Scheduled", tone: "warning" };
    if (end && now > end) return { label: "Expired", tone: "muted" };
    return { label: "Active", tone: "success" };
  }

  function dealDateLabel(deal) {
    const start = dealStartBound(deal);
    const end = dealEndBound(deal);
    const stamp = (date, time) => (time ? `${formatDate(date)}, ${formatTime(date)}` : formatDate(date));

    if (start && end) return `${stamp(start, deal.startTime)} – ${stamp(end, deal.endTime)}`;
    if (start) return `From ${stamp(start, deal.startTime)}`;
    if (end) return `Until ${stamp(end, deal.endTime)}`;
    return "Always available";
  }

  function dealIncludedLabel(deal) {
    return deal.items.map((item) => `${item.quantity}x ${item.name}`).join(" + ");
  }

  function dealSavingsPercent(deal) {
    const original = Number(deal.originalTotal) || 0;
    if (original <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round(((Number(deal.savings) || 0) / original) * 100)));
  }

  function dealDisplayImage(deal) {
    if (deal.image) return deal.image;
    const first = deal.items.find((item) => item.image);
    return first ? first.image : "";
  }

  function offerDateLabel(offer) {
    const start = parseDateOnly(offer.startDate);
    const end = parseDateOnly(offer.endDate);
    if (start && end) return `${formatDateFull(start)} – ${formatDateFull(end)}`;
    if (start) return `From ${formatDateFull(start)}`;
    if (end) return `Until ${formatDateFull(end)}`;
    return "No dates set";
  }

  function offerStateTag(state) {
    return `<span class="tag tag--${state.tone}">${escapeHtml(state.label)}</span>`;
  }

  function offerRowHtml(offer) {
    const stateInfo = offerState(offer);
    const offerId = escapeHtml(offer.id);
    const offerTitle = escapeHtml(offer.title);

    return (
      `<article class="offer-row${offer.active ? "" : " is-hidden"}">` +
      `<div class="offer-badge"><strong>${Number(offer.discount) || 0}%</strong><span>off</span></div>` +
      `<div class="offer-row-main">` +
      `<div class="offer-row-title">` +
      `<h3>${offerTitle}</h3>` +
      offerStateTag(stateInfo) +
      `</div>` +
      `<p class="offer-row-desc">${escapeHtml(offer.description || "No description added.")}</p>` +
      `<div class="offer-row-meta">` +
      `<span>${icon("calendar")}${escapeHtml(offerDateLabel(offer))}</span>` +
      `</div>` +
      `</div>` +
      `<div class="offer-row-side">` +
      `<label class="switch-field">` +
      `<input type="checkbox" name="offer-live-${offerId}" data-offer-live data-offer-id="${offerId}"${offer.active ? " checked" : ""} aria-label="Show ${offerTitle} on the customer menu when its dates are active">` +
      `<span class="switch" aria-hidden="true"></span>` +
      `<span class="switch-text">${offer.active ? "Shown" : "Hidden"}</span>` +
      `</label>` +
      `<div class="row-actions">` +
      `<button class="icon-button icon-button--sm" type="button" data-action="offer-edit" data-offer-id="${offerId}" aria-label="Edit ${offerTitle}">${icon("edit")}</button>` +
      `<button class="icon-button icon-button--sm icon-button--danger" type="button" data-action="offer-delete" data-offer-id="${offerId}" aria-label="Delete ${offerTitle}">${icon("trash")}</button>` +
      `</div>` +
      `</div>` +
      `</article>`
    );
  }

  function dealRowHtml(deal) {
    const status = dealState(deal);
    const dealId = escapeHtml(deal.id);
    const dealName = escapeHtml(deal.name);
    const includedLabel = dealIncludedLabel(deal);

    return (
      `<tr class="${deal.active ? "" : " is-hidden"}">` +
      `<td data-label="Deal name"><div class="deal-cell">` +
      imageFallbackMarkup(dealDisplayImage(deal), deal.name, "menu-thumb deal-thumb") +
      `<div class="deal-cell-copy">` +
      `<span class="cell-strong">${dealName}</span>` +
      `<span class="cell-sub">${escapeHtml(deal.description || pluralise(deal.items.length, "product"))}</span>` +
      `</div>` +
      `</div></td>` +
      `<td data-label="Included products"><span class="deal-includes" title="${escapeHtml(includedLabel)}">${escapeHtml(includedLabel)}</span></td>` +
      `<td data-label="Original price"><span class="deal-original">${escapeHtml(formatMoney(deal.originalTotal))}</span></td>` +
      `<td data-label="Deal price"><span class="cell-strong deal-price-cell">${escapeHtml(formatMoney(deal.dealPrice))}</span></td>` +
      `<td data-label="Savings"><span class="tag tag--success">Save ${escapeHtml(formatMoney(deal.savings))} (${dealSavingsPercent(deal)}%)</span></td>` +
      `<td data-label="Valid from-to"><span class="cell-sub">${escapeHtml(dealDateLabel(deal))}</span></td>` +
      `<td data-label="Status">${offerStateTag(status)}</td>` +
      `<td data-label="Actions" class="cell-actions">` +
      `<div class="deal-actions">` +
      `<label class="switch-field" title="${deal.active ? "Hide from customer menu" : "Show on customer menu"}">` +
      `<input type="checkbox" data-deal-live data-deal-id="${dealId}"${deal.active ? " checked" : ""} aria-label="Show ${dealName} on the customer menu">` +
      `<span class="switch" aria-hidden="true"></span>` +
      `</label>` +
      `<button class="icon-button icon-button--sm" type="button" data-action="deal-edit" data-deal-id="${dealId}" aria-label="Edit ${dealName}">${icon("edit")}</button>` +
      `<button class="icon-button icon-button--sm" type="button" data-action="deal-duplicate" data-deal-id="${dealId}" aria-label="Duplicate ${dealName}">${icon("copy")}</button>` +
      `<button class="icon-button icon-button--sm icon-button--danger" type="button" data-action="deal-delete" data-deal-id="${dealId}" aria-label="Delete ${dealName}">${icon("trash")}</button>` +
      `</div>` +
      `</td>` +
      `</tr>`
    );
  }

  function renderOffersPage(view) {
    const deals = getDeals();
    const legacyOffers = getLegacyOffers();
    const activeNow = deals.filter((deal) => dealState(deal).label === "Active").length;

    view.innerHTML =
      pageHeaderHtml({
        title: "Offers & Deals",
        subtitle: "Build combo deals from your menu. Active deals appear in the Deals category.",
        actions:
          `<button class="btn btn-secondary" type="button" data-action="offer-add">${icon("percent")}Add % offer</button>` +
          `<button class="btn btn-primary" type="button" data-action="deal-add">${icon("plus")}Create New Deal</button>`,
      }) +
      `<section class="panel deals-panel">` +
      `<div class="panel-head">` +
      `<div><h2 class="panel-title">Deals</h2><p class="panel-sub">${
        deals.length
          ? `${pluralise(deals.length, "deal")} · ${activeNow} active on the customer menu.`
          : "Pick products from your menu and set a combined deal price."
      }</p></div>` +
      `</div>` +
      (deals.length
        ? `<div class="deal-table-wrap">` +
          `<table class="data-table deal-table">` +
          `<thead><tr>` +
          `<th>Deal name</th><th>Included products</th><th>Original price</th><th>Deal price</th><th>Savings</th><th>Valid from-to</th><th>Status</th><th>Actions</th>` +
          `</tr></thead>` +
          `<tbody>${deals.map(dealRowHtml).join("")}</tbody>` +
          `</table>` +
          `</div>`
        : emptyStateHtml({
            icon: "tag",
            title: "No deals yet. Create your first deal.",
            message: "Choose products, set a deal price and the deal appears in the Deals category for your guests.",
            action: `<button class="btn btn-primary btn-sm" type="button" data-action="deal-add">${icon("plus")}Create New Deal</button>`,
          })) +
      `</section>` +
      (legacyOffers.length
        ? `<section class="panel offers-panel">` +
          `<div class="panel-head">` +
          `<div><h2 class="panel-title">Percentage offers</h2><p class="panel-sub">Older offers saved on this device. They still show on the customer menu during their dates.</p></div>` +
          `<button class="btn btn-secondary btn-sm" type="button" data-action="offer-add">${icon("plus")}Add % offer</button>` +
          `</div>` +
          `<div class="offer-list">${legacyOffers.map(offerRowHtml).join("")}</div>` +
          `</section>`
        : "");
  }

  function uniqueOfferId(title, offers) {
    const base = slugify(title) || "offer";
    let candidate = base;
    let suffix = 2;

    while (offers.some((offer) => offer.id === candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }

  function createDealDraft(deal) {
    const draft = {
      id: deal ? deal.id : "",
      name: deal ? deal.name : "",
      description: deal ? deal.description : "",
      items: new Map(),
      pricingMode: deal ? deal.pricingMode : "price",
      dealPrice: deal ? String(deal.dealPrice || "") : "",
      discountValue: deal && deal.pricingMode !== "price" ? String(deal.discountValue || "") : "",
      startDate: deal ? deal.startDate : "",
      startTime: deal ? deal.startTime : "",
      endDate: deal ? deal.endDate : "",
      endTime: deal ? deal.endTime : "",
      active: deal ? deal.active : true,
      createdAt: deal ? deal.createdAt : "",
    };

    (deal ? deal.items : []).forEach((item) => {
      const key = item.productId ? item.productId : `name:${slugify(item.name)}`;
      draft.items.set(key, {
        productId: item.productId || "",
        name: item.name,
        price: item.price,
        image: item.image || "",
        quantity: item.quantity,
      });
    });

    return draft;
  }

  function dealDraftItemList(draft) {
    return [...draft.items.values()];
  }

  function dealDraftOriginal(draft) {
    return dealDraftItemList(draft).reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  function dealDraftPrice(draft, original) {
    if (!original) return 0;

    if (draft.pricingMode === "percent") {
      const percent = Number(draft.discountValue);
      if (!Number.isFinite(percent) || percent <= 0 || percent >= 100) return 0;
      return Math.round(original * (1 - percent / 100));
    }

    if (draft.pricingMode === "fixed") {
      const off = Number(draft.discountValue);
      if (!Number.isFinite(off) || off <= 0) return 0;
      return Math.max(0, original - Math.round(off));
    }

    const typed = Number(draft.dealPrice);
    if (!Number.isFinite(typed) || typed <= 0) return 0;
    return Math.round(typed);
  }

  function dealPickerItems() {
    const query = state.dealPickerQuery.trim().toLowerCase();

    return getMenuItems().filter((item) => {
      if (state.dealPickerCategory !== "all" && item.category !== state.dealPickerCategory) return false;
      if (!query) return true;
      return `${item.name} ${categoryLabel(item.category)}`.toLowerCase().includes(query);
    });
  }

  function dealPickerRowHtml(item, draft) {
    const selected = draft.items.has(item.id);
    const itemName = escapeHtml(item.name);

    return (
      `<label class="deal-pick-row${selected ? " is-selected" : ""}">` +
      `<input type="checkbox" data-deal-pick data-product-id="${escapeHtml(item.id)}"${selected ? " checked" : ""}>` +
      `<span class="deal-pick-check" aria-hidden="true">${icon("check")}</span>` +
      imageFallbackMarkup(item.image, item.name, "deal-pick-thumb") +
      `<span class="deal-pick-info">` +
      `<strong>${itemName}${item.active === false ? ' <span class="deal-pick-flag">Hidden</span>' : ""}</strong>` +
      `<span>${escapeHtml(categoryLabel(item.category))}</span>` +
      `</span>` +
      `<span class="deal-pick-price">${escapeHtml(formatMoney(item.price))}</span>` +
      `</label>`
    );
  }

  function dealSelectedRowHtml(entry, key) {
    return (
      `<div class="deal-selected-row">` +
      imageFallbackMarkup(entry.image, entry.name, "deal-selected-thumb") +
      `<div class="deal-selected-info">` +
      `<strong>${escapeHtml(entry.name)}</strong>` +
      `<span>${escapeHtml(formatMoney(entry.price))} each</span>` +
      `</div>` +
      `<div class="deal-qty-stepper">` +
      `<button type="button" data-deal-qty="-1" data-deal-key="${escapeHtml(key)}" aria-label="Decrease ${escapeHtml(entry.name)} quantity"${entry.quantity <= DEAL_MIN_QUANTITY ? " disabled" : ""}>${icon("minus")}</button>` +
      `<span>${entry.quantity}</span>` +
      `<button type="button" data-deal-qty="1" data-deal-key="${escapeHtml(key)}" aria-label="Increase ${escapeHtml(entry.name)} quantity"${entry.quantity >= DEAL_MAX_QUANTITY ? " disabled" : ""}>${icon("plus")}</button>` +
      `</div>` +
      `<button class="icon-button icon-button--sm icon-button--danger" type="button" data-deal-remove data-deal-key="${escapeHtml(key)}" aria-label="Remove ${escapeHtml(entry.name)}">${icon("trash")}</button>` +
      `</div>`
    );
  }

  function renderDealPickerList(overlay) {
    const draft = state.dealDraft;
    const list = overlay.querySelector("[data-deal-picker-list]");
    if (!draft || !list) return;

    const items = dealPickerItems();
    const total = getMenuItems().length;

    list.innerHTML = items.length
      ? items.map((item) => dealPickerRowHtml(item, draft)).join("")
      : `<div class="deal-picker-empty">${icon("search")}<span>${
          total ? "No menu items match your search." : "Add menu items before building a deal."
        }</span></div>`;

    const meta = overlay.querySelector("[data-deal-picker-meta]");
    if (meta) {
      meta.textContent = total ? `${items.length} of ${total} menu items` : "No menu items yet";
    }
  }

  function renderDealTotals(overlay) {
    const draft = state.dealDraft;
    const holder = overlay.querySelector("[data-deal-totals]");
    if (!draft || !holder) return;

    const original = dealDraftOriginal(draft);
    const price = dealDraftPrice(draft, original);
    const savings = Math.max(0, original - price);
    const percent = original > 0 ? Math.round((savings / original) * 100) : 0;
    const valid = original > 0 && price > 0 && price < original;

    holder.innerHTML =
      `<div class="deal-total-row"><span>Original total</span><strong>${escapeHtml(formatMoney(original))}</strong></div>` +
      `<div class="deal-total-row deal-total-row--price"><span>Deal price</span><strong>${price > 0 ? escapeHtml(formatMoney(price)) : "—"}</strong></div>` +
      (valid
        ? `<p class="deal-savings">You Save ${escapeHtml(formatMoney(savings))} (${percent}%)</p>`
        : `<p class="deal-savings deal-savings--muted">${
            original > 0 ? "Set a deal price below the original total." : "Select products to see the savings."
          }</p>`);

    const computed = overlay.querySelector("[data-deal-computed]");
    if (computed) computed.textContent = price > 0 ? formatMoney(price) : "—";
  }

  function renderDealSelection(overlay) {
    const draft = state.dealDraft;
    if (!draft) return;

    const holder = overlay.querySelector("[data-deal-selected]");
    if (holder) {
      holder.innerHTML = draft.items.size
        ? [...draft.items.entries()].map(([key, entry]) => dealSelectedRowHtml(entry, key)).join("")
        : `<p class="deal-selected-empty">Tick products in the list to build this deal.</p>`;
    }

    const count = overlay.querySelector("[data-deal-count]");
    if (count) {
      count.textContent = `${pluralise(draft.items.size, "product")} selected · at least ${DEAL_MIN_PRODUCTS} required`;
    }

    renderDealTotals(overlay);
  }

  function syncDealPricingFields(overlay) {
    const draft = state.dealDraft;
    if (!draft) return;

    const priceField = overlay.querySelector("[data-deal-price-field]");
    const discountField = overlay.querySelector("[data-deal-discount-field]");
    const discountLabel = overlay.querySelector("[data-deal-discount-label]");
    const discountInput = overlay.querySelector("[name='discountValue']");

    if (priceField) priceField.hidden = draft.pricingMode !== "price";
    if (discountField) discountField.hidden = draft.pricingMode === "price";
    if (discountLabel) {
      discountLabel.textContent =
        draft.pricingMode === "percent" ? "Discount (%)" : "Fixed amount off (Rs.)";
    }
    if (discountInput) {
      discountInput.min = "1";
      if (draft.pricingMode === "percent") discountInput.max = "99";
      else discountInput.removeAttribute("max");
      discountInput.placeholder = draft.pricingMode === "percent" ? "e.g. 15" : "e.g. 300";
    }
  }

  function updateDealImagePreview(overlay) {
    const holder = overlay.querySelector("[data-deal-image-preview]");
    if (!holder) return;

    const draft = state.dealDraft;
    const firstItem = draft ? dealDraftItemList(draft).find((item) => item.image) : null;
    const source = state.dealImageDraft === null ? (firstItem ? firstItem.image : "") : state.dealImageDraft;
    const name = draft && draft.name.trim() ? draft.name.trim() : firstItem ? firstItem.name : "Deal";

    holder.innerHTML = imageFallbackMarkup(source, name, "photo-preview");
  }

  function dealFormHtml(draft) {
    const isEditing = Boolean(draft.id);
    const categoryOptions =
      `<option value="all">All categories</option>` +
      categories
        .map(
          (category) =>
            `<option value="${escapeHtml(category.id)}"${state.dealPickerCategory === category.id ? " selected" : ""}>${escapeHtml(category.label)}</option>`
        )
        .join("");
    const modeChecked = (mode) => (draft.pricingMode === mode ? " checked" : "");

    return (
      `<form class="admin-form deal-form" data-form="deal" data-deal-id="${escapeHtml(draft.id)}" novalidate>` +
      `<p class="form-error" data-form-error role="alert" hidden></p>` +
      `<div class="deal-builder-grid">` +
      `<section class="deal-block deal-block--picker">` +
      `<div class="deal-block-head"><div><h3>1. Select products</h3><p class="deal-block-sub" data-deal-picker-meta></p></div></div>` +
      `<div class="deal-picker-tools">` +
      `<div class="search-box">${icon("search")}<input type="search" placeholder="Search menu items…" autocomplete="off" data-deal-search value="${escapeHtml(state.dealPickerQuery)}" aria-label="Search menu items for this deal"></div>` +
      `<label class="select-field"><span class="sr-only">Filter products by category</span><select data-deal-category>${categoryOptions}</select><span class="select-chevron" aria-hidden="true">${icon("chevron-down")}</span></label>` +
      `</div>` +
      `<div class="deal-picker-list" data-deal-picker-list></div>` +
      `</section>` +
      `<aside class="deal-block deal-block--selected">` +
      `<div class="deal-block-head"><h3>Selected products</h3><span class="deal-count" data-deal-count>0 products selected</span></div>` +
      `<div class="deal-selected" data-deal-selected></div>` +
      `<div class="deal-totals" data-deal-totals></div>` +
      `</aside>` +
      `</div>` +
      `<section class="deal-block">` +
      `<div class="deal-block-head"><h3>2. Deal details</h3></div>` +
      `<div class="deal-details-grid">` +
      `<div class="deal-image-column">` +
      `<div class="photo-preview-holder" data-deal-image-preview></div>` +
      `<div class="inline-actions">` +
      `<label class="btn btn-secondary btn-sm">${icon("upload")}Upload<input type="file" accept="image/*" data-deal-image hidden></label>` +
      `<button class="btn btn-ghost btn-sm" type="button" data-deal-image-reset>First product</button>` +
      `</div>` +
      `<p class="field-hint">Optional. Defaults to the first selected product photo.</p>` +
      `</div>` +
      `<div class="deal-details-fields">` +
      `<div class="field"><label for="deal-name">Deal name</label>` +
      `<input id="deal-name" name="name" type="text" maxlength="60" required value="${escapeHtml(draft.name)}" placeholder="e.g. Family Deal" data-autofocus>` +
      `</div>` +
      `<div class="field"><label for="deal-description">Description (optional)</label>` +
      `<textarea id="deal-description" name="description" rows="2" maxlength="140" placeholder="Short description shown under the deal name">${escapeHtml(draft.description)}</textarea>` +
      `</div>` +
      `<div class="field"><span class="field-label">Pricing method</span>` +
      `<div class="deal-mode-group" role="radiogroup" aria-label="Pricing method">` +
      `<label class="deal-mode"><input type="radio" name="pricingMode" value="price" data-deal-mode${modeChecked("price")}><span>Set deal price</span></label>` +
      `<label class="deal-mode"><input type="radio" name="pricingMode" value="percent" data-deal-mode${modeChecked("percent")}><span>Discount %</span></label>` +
      `<label class="deal-mode"><input type="radio" name="pricingMode" value="fixed" data-deal-mode${modeChecked("fixed")}><span>Fixed Rs. off</span></label>` +
      `</div>` +
      `</div>` +
      `<div class="deal-price-grid">` +
      `<div class="field" data-deal-price-field>` +
      `<label for="deal-price">Deal price (${escapeHtml(currencySymbol)})</label>` +
      `<input id="deal-price" name="dealPrice" type="number" min="1" step="1" value="${escapeHtml(draft.dealPrice)}" placeholder="e.g. 1500">` +
      `</div>` +
      `<div class="field" data-deal-discount-field hidden>` +
      `<label for="deal-discount" data-deal-discount-label>Discount (%)</label>` +
      `<input id="deal-discount" name="discountValue" type="number" min="1" step="1" value="${escapeHtml(draft.discountValue)}" placeholder="e.g. 15">` +
      `<p class="field-hint">Calculated deal price: <strong data-deal-computed>—</strong></p>` +
      `</div>` +
      `</div>` +
      `</div>` +
      `</div>` +
      `</section>` +
      `<section class="deal-block">` +
      `<div class="deal-block-head"><h3>3. Validity &amp; visibility</h3></div>` +
      `<div class="deal-validity-grid">` +
      `<div class="field"><label for="deal-start-date">Valid from (optional)</label><input id="deal-start-date" name="startDate" type="date" value="${escapeHtml(draft.startDate)}"></div>` +
      `<div class="field"><label for="deal-start-time">Start time</label><input id="deal-start-time" name="startTime" type="time" value="${escapeHtml(draft.startTime)}"></div>` +
      `<div class="field"><label for="deal-end-date">Valid to (optional)</label><input id="deal-end-date" name="endDate" type="date" value="${escapeHtml(draft.endDate)}"></div>` +
      `<div class="field"><label for="deal-end-time">End time</label><input id="deal-end-time" name="endTime" type="time" value="${escapeHtml(draft.endTime)}"></div>` +
      `<div class="field field--switch">` +
      `<span class="field-label">Visibility</span>` +
      `<label class="switch-field switch-field--boxed">` +
      `<input type="checkbox" name="active"${draft.active !== false ? " checked" : ""}>` +
      `<span class="switch" aria-hidden="true"></span>` +
      `<span class="switch-copy"><strong>Active deal</strong><span>Inactive deals stay saved but never show to guests.</span></span>` +
      `</label>` +
      `</div>` +
      `</div>` +
      `<p class="field-hint">Leave dates empty for an always-available deal. Expired deals hide from the customer menu automatically.</p>` +
      `</section>` +
      `<p class="field-hint">${
        isEditing
          ? "Saving updates the deal on the customer menu. Past orders keep the deal name and price they were placed with."
          : "The deal appears in the Deals category as soon as it is active and inside its dates."
      }</p>` +
      `</form>`
    );
  }

  function mountDealBuilder(overlay) {
    const draft = state.dealDraft;
    const form = overlay.querySelector("[data-form='deal']");
    if (!draft || !form) return;

    renderDealPickerList(overlay);
    renderDealSelection(overlay);
    syncDealPricingFields(overlay);
    updateDealImagePreview(overlay);

    form.addEventListener("input", (event) => {
      const target = event.target;

      if (target.matches("[data-deal-search]")) {
        state.dealPickerQuery = target.value;
        renderDealPickerList(overlay);
        return;
      }

      if (target.matches("[name='dealPrice']")) {
        draft.dealPrice = target.value;
        renderDealTotals(overlay);
        return;
      }

      if (target.matches("[name='discountValue']")) {
        draft.discountValue = target.value;
        renderDealTotals(overlay);
        return;
      }

      if (target.matches("[name='name']")) {
        draft.name = target.value;
        updateDealImagePreview(overlay);
      }
    });

    form.addEventListener("change", (event) => {
      const target = event.target;

      if (target.matches("[data-deal-category]")) {
        state.dealPickerCategory = target.value;
        renderDealPickerList(overlay);
        return;
      }

      if (target.matches("[data-deal-pick]")) {
        const item = getMenuItems().find((entry) => entry.id === target.dataset.productId);
        if (!item) return;

        if (target.checked) {
          draft.items.set(item.id, {
            productId: item.id,
            name: item.name,
            price: Math.round(Number(item.price) || 0),
            image: String(item.image || ""),
            quantity: DEAL_MIN_QUANTITY,
          });
        } else {
          draft.items.delete(item.id);
        }

        renderDealSelection(overlay);
        renderDealPickerList(overlay);
        updateDealImagePreview(overlay);
        return;
      }

      if (target.matches("[data-deal-mode]")) {
        if (draft.pricingMode !== target.value) {
          draft.pricingMode = target.value;
          draft.discountValue = "";
          const discountInput = overlay.querySelector("[name='discountValue']");
          if (discountInput) discountInput.value = "";
        }
        syncDealPricingFields(overlay);
        renderDealTotals(overlay);
      }
    });

    form.addEventListener("click", (event) => {
      const quantityButton = event.target.closest("[data-deal-qty]");
      if (quantityButton) {
        const key = quantityButton.dataset.dealKey;
        const entry = draft.items.get(key);
        if (!entry) return;
        const step = Number(quantityButton.dataset.dealQty) || 0;
        entry.quantity = Math.max(
          DEAL_MIN_QUANTITY,
          Math.min(DEAL_MAX_QUANTITY, entry.quantity + step)
        );
        renderDealSelection(overlay);
        return;
      }

      const removeButton = event.target.closest("[data-deal-remove]");
      if (removeButton) {
        draft.items.delete(removeButton.dataset.dealKey);
        renderDealSelection(overlay);
        renderDealPickerList(overlay);
        updateDealImagePreview(overlay);
        return;
      }

      if (event.target.closest("[data-deal-image-reset]")) {
        state.dealImageDraft = null;
        updateDealImagePreview(overlay);
        showToast("Using the first selected product photo.");
      }
    });

    const imageInput = overlay.querySelector("[data-deal-image]");
    if (imageInput) {
      imageInput.addEventListener("change", () => handleDealImageSelection(imageInput));
    }
  }

  function openDealForm(dealId, options = {}) {
    const sourceDeal = dealId ? getDeals().find((entry) => entry.id === dealId) : null;
    if (dealId && !sourceDeal && !options.duplicateOf) {
      showToast("That deal could not be found.", "error");
      return;
    }

    const isDuplicate = Boolean(options.duplicateOf);
    const baseDeal = isDuplicate ? options.duplicateOf : sourceDeal;
    const draft = createDealDraft(baseDeal);

    if (isDuplicate) {
      draft.id = "";
      draft.name = `${baseDeal.name} (copy)`;
      draft.createdAt = "";
    }

    state.dealDraft = draft;
    state.dealImageDraft = baseDeal && baseDeal.image ? baseDeal.image : null;
    state.dealPickerQuery = "";
    state.dealPickerCategory = "all";

    const isEditing = Boolean(sourceDeal) && !isDuplicate;

    openModal({
      title: isEditing ? "Edit deal" : isDuplicate ? "Duplicate deal" : "Create New Deal",
      subtitle: isEditing
        ? "Update products, pricing and validity for this deal."
        : isDuplicate
          ? "Review the copied deal and save it as a new deal."
          : "Pick products, set the deal price and publish it to the Deals category.",
      kicker: "Deal Builder",
      size: "xl",
      body: dealFormHtml(draft),
      footer:
        `<button class="btn btn-secondary" type="button" data-modal-close>Cancel</button>` +
        `<button class="btn btn-primary" type="submit" form="admin-deal-form">${isEditing ? "Save changes" : isDuplicate ? "Save duplicate" : "Create deal"}</button>`,
      onMount(overlay) {
        const form = overlay.querySelector("[data-form='deal']");
        if (form) form.id = "admin-deal-form";
        mountDealBuilder(overlay);
      },
    });
  }

  function handleDealImageSelection(input) {
    const file = input.files && input.files[0];
    if (!file) return;

    const overlay = input.closest(".modal-overlay") || document;
    input.disabled = true;

    compressImage(file, { maxDimension: 900, mime: "image/jpeg", quality: 0.82, background: "#FFFFFF" })
      .then((dataUrl) => {
        state.dealImageDraft = dataUrl;
        updateDealImagePreview(overlay);
        showToast("Deal image ready. Save the deal to apply.", "success");
      })
      .catch((error) => showToast(errorMessage(error), "error"))
      .finally(() => {
        input.disabled = false;
        input.value = "";
      });
  }

  function saveDealForm(form) {
    clearFormError(form);

    const draft = state.dealDraft;
    if (!draft) return;

    const name = String(form.elements.name.value || "").trim();
    const description = String(form.elements.description.value || "").trim();
    const active = Boolean(form.elements.active.checked);
    const pricingMode = ["price", "percent", "fixed"].includes(draft.pricingMode) ? draft.pricingMode : "price";
    const startDate = String(form.elements.startDate.value || "");
    const startTime = normalizeOfferTime(form.elements.startTime.value);
    const endDate = String(form.elements.endDate.value || "");
    const endTime = normalizeOfferTime(form.elements.endTime.value);
    const items = dealDraftItemList(draft).map((item) => ({
      productId: item.productId || "",
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      image: item.image || "",
    }));

    if (!name) {
      showFormError(form, "Enter a deal name.");
      form.elements.name.focus();
      return;
    }

    if (items.length < DEAL_MIN_PRODUCTS) {
      showFormError(form, "Select at least 1 product");
      return;
    }

    if (
      items.some(
        (item) =>
          !Number.isInteger(item.quantity) ||
          item.quantity < DEAL_MIN_QUANTITY ||
          item.quantity > DEAL_MAX_QUANTITY
      )
    ) {
      showFormError(form, "Har product ki quantity 1 se 10 ke darmiyan honi chahiye.");
      return;
    }

    const originalTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (originalTotal <= 0) {
      showFormError(form, "Selected products need a price above zero.");
      return;
    }

    let dealPrice = 0;
    let discountValue = 0;

    if (pricingMode === "price") {
      dealPrice = Math.round(Number(draft.dealPrice));
      if (!Number.isFinite(dealPrice) || dealPrice <= 0) {
        showFormError(form, "Enter a valid deal price greater than zero.");
        if (form.elements.dealPrice) form.elements.dealPrice.focus();
        return;
      }
    } else if (pricingMode === "percent") {
      discountValue = Math.round(Number(draft.discountValue));
      if (!Number.isFinite(discountValue) || discountValue < 1 || discountValue > 99) {
        showFormError(form, "Enter a discount from 1% to 99%.");
        if (form.elements.discountValue) form.elements.discountValue.focus();
        return;
      }
      dealPrice = Math.round(originalTotal * (1 - discountValue / 100));
    } else {
      discountValue = Math.round(Number(draft.discountValue));
      if (!Number.isFinite(discountValue) || discountValue <= 0) {
        showFormError(form, "Enter a fixed amount off greater than zero.");
        if (form.elements.discountValue) form.elements.discountValue.focus();
        return;
      }
      dealPrice = originalTotal - discountValue;
    }

    if (dealPrice >= originalTotal) {
      showFormError(form, "Deal price must be less than the original total.");
      return;
    }

    if (dealPrice <= 0) {
      showFormError(form, "Deal price must be greater than zero.");
      return;
    }

    if (startDate && !parseDateOnly(startDate)) {
      showFormError(form, "Choose a valid valid-from date.");
      form.elements.startDate.focus();
      return;
    }

    if (endDate && !parseDateOnly(endDate)) {
      showFormError(form, "Choose a valid valid-to date.");
      form.elements.endDate.focus();
      return;
    }

    const startBound = combineDateTime(startDate, startTime, "start");
    const endBound = combineDateTime(endDate, endTime, "end");
    if (startBound && endBound && endBound <= startBound) {
      showFormError(form, "The valid-to date must be after the valid-from date.");
      form.elements.endDate.focus();
      return;
    }

    const offers = getOffers();
    const existingIndex = offers.findIndex((entry) => entry.id === draft.id && entry.type === "deal");
    const nowStamp = new Date().toISOString();
    const id = existingIndex >= 0 ? offers[existingIndex].id : uniqueOfferId(name, offers);
    const payload = {
      id,
      type: "deal",
      name,
      title: name,
      description,
      image: state.dealImageDraft === null ? "" : state.dealImageDraft,
      items,
      pricingMode,
      dealPrice,
      discountValue,
      originalTotal,
      savings: originalTotal - dealPrice,
      startDate,
      startTime,
      endDate,
      endTime,
      active,
      createdAt:
        existingIndex >= 0
          ? offers[existingIndex].createdAt || nowStamp
          : draft.createdAt || nowStamp,
      updatedAt: nowStamp,
    };

    if (existingIndex >= 0) offers[existingIndex] = payload;
    else offers.push(payload);

    try {
      saveOffers(offers);
    } catch (error) {
      showFormError(form, errorMessage(error));
      showToast(errorMessage(error), "error");
      return;
    }

    closeModal();
    state.dealDraft = null;
    state.dealImageDraft = null;
    showToast(
      existingIndex >= 0
        ? `${name} updated.`
        : active
          ? `${name} created. It appears in the Deals category.`
          : `${name} saved as inactive.`
    );
    renderCurrentPage({ keepScroll: true });
  }

  function toggleDealVisibility(dealId, active) {
    const offers = getOffers();
    const deal = offers.find((entry) => entry.id === dealId && entry.type === "deal");
    if (!deal) return;

    deal.active = Boolean(active);
    deal.updatedAt = new Date().toISOString();

    try {
      saveOffers(offers);
    } catch (error) {
      showToast(errorMessage(error), "error");
      renderCurrentPage({ keepScroll: true });
      return;
    }

    showToast(
      deal.active
        ? `${deal.name} is active on the customer menu.`
        : `${deal.name} is inactive and hidden from guests.`
    );
    renderCurrentPage({ keepScroll: true });
  }

  function duplicateDeal(dealId) {
    const deal = getDeals().find((entry) => entry.id === dealId);
    if (!deal) return;

    openDealForm(null, { duplicateOf: deal });
  }

  function removeDealFromCart(dealId) {
    const cartKey = Tenant.storageKeys(tenantRestaurantId).cart;
    const cart = readJson(cartKey);
    if (!cart || typeof cart !== "object") return;

    const itemId = `deal:${dealId}`;
    let changed = false;
    const items =
      cart.items && typeof cart.items === "object" ? { ...cart.items } : {};
    if (Object.prototype.hasOwnProperty.call(items, itemId)) {
      delete items[itemId];
      changed = true;
    }

    const legacyDeals =
      cart.deals && typeof cart.deals === "object" ? { ...cart.deals } : {};
    if (Object.prototype.hasOwnProperty.call(legacyDeals, dealId)) {
      delete legacyDeals[dealId];
      changed = true;
    }

    if (!changed) return;

    const nextCart = { ...cart, items };
    if (Object.keys(legacyDeals).length) nextCart.deals = legacyDeals;
    else delete nextCart.deals;

    try {
      writeJson(cartKey, nextCart);
    } catch {
      // The customer menu also prunes deleted deals the next time it loads.
    }
  }

  function deleteDeal(dealId) {
    const deal = getDeals().find((entry) => entry.id === dealId);
    if (!deal) return;

    confirmDialog({
      title: "Delete deal?",
      message: `"${deal.name}" will be removed from the customer menu and cart. This can't be undone.`,
      confirmLabel: "Delete deal",
      tone: "danger",
      onConfirm() {
        const offers = getOffers().filter((entry) => !(entry.id === dealId && entry.type === "deal"));
        try {
          saveOffers(offers);
        } catch (error) {
          showToast(errorMessage(error), "error");
          return false;
        }
        removeDealFromCart(dealId);
        showToast(`${deal.name} deleted.`);
        renderCurrentPage({ keepScroll: true });
        return true;
      },
    });
  }

  function offerFormHtml(offer) {
    const isEditing = Boolean(offer);
    const today = dateInputValue(new Date());
    const weekAhead = dateInputValue(addDays(new Date(), 7));
    const startDate = offer ? offer.startDate : today;
    const endDate = offer ? offer.endDate : weekAhead;

    return (
      `<form class="admin-form" data-form="offer" data-offer-id="${offer ? escapeHtml(offer.id) : ""}" novalidate>` +
      `<p class="form-error" data-form-error role="alert" hidden></p>` +
      `<div class="field"><label for="offer-title">Offer title</label>` +
      `<input id="offer-title" name="title" type="text" maxlength="70" required value="${offer ? escapeHtml(offer.title) : ""}" placeholder="e.g. Family dinner deal" data-autofocus>` +
      `</div>` +
      `<div class="field"><label for="offer-description">Description</label>` +
      `<textarea id="offer-description" name="description" rows="2" maxlength="140" placeholder="Short description shown on the customer menu">${offer ? escapeHtml(offer.description || "") : ""}</textarea>` +
      `</div>` +
      `<div class="form-grid form-grid--2">` +
      `<div class="field"><label for="offer-discount">Discount (%)</label>` +
      `<input id="offer-discount" name="discount" type="number" min="1" max="100" step="1" required value="${offer ? Number(offer.discount) || "" : ""}" placeholder="15">` +
      `</div>` +
      `<div class="field"><label for="offer-start">Starts</label>` +
      `<input id="offer-start" name="startDate" type="date" required value="${escapeHtml(startDate)}">` +
      `</div>` +
      `</div>` +
      `<div class="form-grid form-grid--2">` +
      `<div class="field"><label for="offer-end">Ends</label>` +
      `<input id="offer-end" name="endDate" type="date" required value="${escapeHtml(endDate)}">` +
      `</div>` +
      `<div class="field field--switch">` +
      `<span class="field-label">Visibility</span>` +
      `<label class="switch-field switch-field--boxed">` +
      `<input type="checkbox" name="active"${!offer || offer.active ? " checked" : ""}>` +
      `<span class="switch" aria-hidden="true"></span>` +
      `<span class="switch-copy"><strong>Show offer</strong><span>Appears on the menu only between these dates.</span></span>` +
      `</label>` +
      `</div>` +
      `</div>` +
      `<p class="field-hint">${isEditing ? "Saving updates the customer menu on this device immediately." : "The offer appears on the customer menu only while it is active and in date."}</p>` +
      `</form>`
    );
  }

  function openOfferForm(offerId) {
    const offer = offerId ? getLegacyOffers().find((entry) => entry.id === offerId) : null;
    if (offerId && !offer) {
      showToast("That offer could not be found.", "error");
      return;
    }

    const isEditing = Boolean(offer);

    openModal({
      title: isEditing ? "Edit offer" : "Add offer",
      subtitle: isEditing ? "Update the offer shown on the customer menu." : "Create a date-based offer for the customer menu.",
      kicker: "Offers",
      size: "md",
      body: offerFormHtml(offer),
      footer:
        `<button class="btn btn-secondary" type="button" data-modal-close>Cancel</button>` +
        `<button class="btn btn-primary" type="submit" form="admin-offer-form">${isEditing ? "Save changes" : "Add offer"}</button>`,
      onMount(overlay) {
        const form = overlay.querySelector("[data-form='offer']");
        if (form) form.id = "admin-offer-form";
      },
    });
  }

  function saveOfferForm(form) {
    clearFormError(form);

    const offerId = String(form.dataset.offerId || "");
    const title = String(form.elements.title.value || "").trim();
    const description = String(form.elements.description.value || "").trim();
    const discount = Number(form.elements.discount.value);
    const startValue = String(form.elements.startDate.value || "");
    const endValue = String(form.elements.endDate.value || "");
    const active = Boolean(form.elements.active.checked);

    if (!title) {
      showFormError(form, "Enter an offer title.");
      form.elements.title.focus();
      return;
    }

    if (!Number.isFinite(discount) || discount < 1 || discount > 100) {
      showFormError(form, "Enter a discount from 1% to 100%.");
      form.elements.discount.focus();
      return;
    }

    const start = parseDateOnly(startValue);
    const end = parseDateOnly(endValue);

    if (!start) {
      showFormError(form, "Choose a valid start date.");
      form.elements.startDate.focus();
      return;
    }

    if (!end) {
      showFormError(form, "Choose a valid end date.");
      form.elements.endDate.focus();
      return;
    }

    if (end < start) {
      showFormError(form, "The end date must be on or after the start date.");
      form.elements.endDate.focus();
      return;
    }

    const offers = getOffers();
    const existingIndex = offers.findIndex((offer) => offer.id === offerId && offer.type !== "deal");
    const id = existingIndex >= 0 ? offers[existingIndex].id : uniqueOfferId(title, offers);
    const nextOffer = {
      id,
      type: "offer",
      title,
      name: title,
      description,
      discount: Math.round(discount),
      startDate: startValue,
      endDate: endValue,
      active,
    };

    if (existingIndex >= 0) offers[existingIndex] = nextOffer;
    else offers.push(nextOffer);

    try {
      saveOffers(offers);
    } catch (error) {
      showFormError(form, errorMessage(error));
      showToast(errorMessage(error), "error");
      return;
    }

    closeModal();
    showToast(
      existingIndex >= 0
        ? `${title} updated.`
        : active
          ? `${title} added. It appears on the menu during its dates.`
          : `${title} added and hidden from the customer menu.`
    );
    renderCurrentPage({ keepScroll: true });
  }

  function toggleOfferVisibility(offerId, active) {
    const offers = getOffers();
    const offer = offers.find((entry) => entry.id === offerId && entry.type !== "deal");
    if (!offer) return;

    offer.active = Boolean(active);

    try {
      saveOffers(offers);
    } catch (error) {
      showToast(errorMessage(error), "error");
      renderCurrentPage({ keepScroll: true });
      return;
    }

    showToast(
      offer.active
        ? `${offer.title} is shown during its scheduled dates.`
        : `${offer.title} is hidden from the customer menu.`
    );
    renderCurrentPage({ keepScroll: true });
  }

  function deleteOffer(offerId) {
    const offer = getOffers().find((entry) => entry.id === offerId && entry.type !== "deal");
    if (!offer) return;

    confirmDialog({
      title: "Delete offer?",
      message: `"${offer.title}" will be removed from the customer menu. This can't be undone.`,
      confirmLabel: "Delete offer",
      tone: "danger",
      onConfirm() {
        const offers = getOffers().filter((entry) => entry.id !== offerId);
        try {
          saveOffers(offers);
        } catch (error) {
          showToast(errorMessage(error), "error");
          return false;
        }
        showToast(`${offer.title} deleted.`);
        renderCurrentPage({ keepScroll: true });
        return true;
      },
    });
  }

  /* ------------------------------------------------------------------------
     Settings
     ------------------------------------------------------------------------ */

  function logoPreviewHtml(logo, restaurantName) {
    return (
      `<span class="logo-preview${logo ? "" : " logo-preview--empty"}" data-logo-preview data-image-fallback data-initial="${escapeHtml(initialFor(restaurantName))}">` +
      (logo ? `<img src="${escapeHtml(logo)}" alt="Restaurant logo">` : `${icon("image")}<span class="logo-preview-initial">${escapeHtml(initialFor(restaurantName))}</span>`) +
      `</span>`
    );
  }

  function updateSettingsLogoPreview(root) {
    const holder = root.querySelector("[data-logo-preview]");
    if (!holder) return;

    const settings = getSettings();
    const nameInput = root.querySelector("[name='restaurantName']");
    const restaurantName = nameInput && nameInput.value.trim() ? nameInput.value.trim() : settings.restaurantName;
    const logo = state.settingsLogoDraft === null ? settings.logo : state.settingsLogoDraft;

    const fresh = document.createElement("span");
    fresh.className = `logo-preview${logo ? "" : " logo-preview--empty"}`;
    fresh.setAttribute("data-logo-preview", "");
    fresh.setAttribute("data-image-fallback", "");
    fresh.setAttribute("data-initial", initialFor(restaurantName));
    fresh.innerHTML = logo
      ? `<img src="${escapeHtml(logo)}" alt="Restaurant logo">`
      : `${icon("image")}<span class="logo-preview-initial">${escapeHtml(initialFor(restaurantName))}</span>`;

    holder.replaceWith(fresh);
  }

  function settingsFormHtml(settings) {
    return (
      `<form class="admin-form settings-form" data-form="settings" novalidate>` +
      `<p class="form-error" data-form-error role="alert" hidden></p>` +
      `<section class="panel">` +
      `<div class="panel-head"><div><h2 class="panel-title">Restaurant identity</h2><p class="panel-sub">Shown in the admin and at the top of the customer menu.</p></div></div>` +
      `<div class="settings-block">` +
      `<div class="field"><label for="settings-name">Restaurant name</label>` +
      `<input id="settings-name" name="restaurantName" type="text" maxlength="60" required value="${escapeHtml(settings.restaurantName)}" data-autofocus>` +
      `<p class="field-hint">Use the real restaurant name before going live. “Karahi House” is a sample.</p>` +
      `</div>` +
      `<div class="logo-field">` +
      `<span class="field-label">Restaurant logo</span>` +
      `<div class="logo-field-row">` +
      logoPreviewHtml(settings.logo, settings.restaurantName) +
      `<div class="inline-actions">` +
      `<label class="btn btn-secondary btn-sm">${icon("upload")}Upload logo<input type="file" accept="image/png,image/jpeg,image/webp" data-logo-input hidden></label>` +
      `<button class="btn btn-ghost btn-sm" type="button" data-action="settings-logo-remove">Remove</button>` +
      `</div>` +
      `</div>` +
      `<p class="field-hint">PNG, JPG or WebP. The logo is resized to 256 px before saving.</p>` +
      `</div>` +
      `</div>` +
      `</section>` +
      `<section class="panel">` +
      `<div class="panel-head"><div><h2 class="panel-title">Service details</h2><p class="panel-sub">Guest-facing timings and contact details.</p></div></div>` +
      `<div class="form-grid form-grid--2">` +
      `<div class="field"><label for="settings-whatsapp">WhatsApp number</label>` +
      `<input id="settings-whatsapp" name="whatsappNumber" type="text" maxlength="40" value="${escapeHtml(settings.whatsappNumber)}" placeholder="[RESTAURANT_WHATSAPP_NUMBER]">` +
      `<p class="field-hint">Placeholder only. Replace it when the restaurant's real WhatsApp number is confirmed.</p>` +
      `</div>` +
      `<div class="field"><label for="settings-hours">Opening timing</label>` +
      `<input id="settings-hours" name="openingTiming" type="text" maxlength="60" value="${escapeHtml(settings.openingTiming)}" placeholder="12:00 pm – 11:00 pm">` +
      `<p class="field-hint">Shown as “Open …” in the customer menu footer.</p>` +
      `</div>` +
      `</div>` +
      `<div class="readonly-note">` +
      `<span class="readonly-note-icon">${icon("cash")}</span>` +
      `<div><strong>${escapeHtml(settings.paymentNote || "Pay cash at table")}</strong>` +
      `<p>Cash is the only payment method in Phase 1. Card, wallet and bank payments are not part of this build.</p></div>` +
      `</div>` +
      `</section>` +
      `<div class="settings-save">` +
      `<button class="btn btn-primary" type="submit">${icon("check")}Save settings</button>` +
      `<p class="field-hint">Changes save in this browser and appear on the customer menu right away.</p>` +
      `</div>` +
      `</form>` +
      `<section class="panel settings-staff-panel">` +
      `<div class="panel-head">` +
      `<div><h2 class="panel-title">Staff &amp; access</h2><p class="panel-sub">Manage who can sign in and which pages each role opens.</p></div>` +
      `<a class="btn btn-secondary btn-sm" href="staff.html">${icon("users")}Manage staff</a>` +
      `</div>` +
      `<p class="settings-staff-note">Owner manages staff logins. Manager, Kitchen and Waiter accounts use placeholder passwords in this phase.</p>` +
      `</section>` +
      `<section class="panel note-panel">` +
      `<span class="note-icon">${icon("alert")}</span>` +
      `<div><h2 class="panel-title">Before going live</h2>` +
      `<p>Replace the sample restaurant name, dish photos and prices. This Phase 2 build is local-only: orders and settings live in this browser and do not sync between devices. A backend is needed later for real multi-device ordering.</p></div>` +
      `</section>`
    );
  }

  function renderSettingsPage(view) {
    state.settingsLogoDraft = null;
    const settings = getSettings();

    view.innerHTML =
      pageHeaderHtml({
        title: "Settings",
        subtitle: "Everything here is stored on this device and used by the customer menu.",
        actions: `<a class="btn btn-secondary" href="${escapeHtml(customerMenuHref())}" target="_blank" rel="noopener">${icon("external")}View customer menu</a>`,
      }) +
      settingsFormHtml(settings);
  }

  function handleLogoSelection(input) {
    const file = input.files && input.files[0];
    if (!file) return;

    input.disabled = true;

    compressImage(file, { maxDimension: 256, mime: "image/png" })
      .then((dataUrl) => {
        state.settingsLogoDraft = dataUrl;
        updateSettingsLogoPreview(document);
        showToast("Logo ready. Save settings to apply.", "success");
      })
      .catch((error) => showToast(errorMessage(error), "error"))
      .finally(() => {
        input.disabled = false;
        input.value = "";
      });
  }

  function removeSettingsLogo() {
    const settings = getSettings();
    const currentLogo = state.settingsLogoDraft === null ? settings.logo : state.settingsLogoDraft;
    if (!currentLogo) return;

    state.settingsLogoDraft = "";
    updateSettingsLogoPreview(document);
    showToast("Logo removed. Save settings to apply.", "warning");
  }

  function saveSettingsForm(form) {
    clearFormError(form);

    const current = getSettings();
    const restaurantName = String(form.elements.restaurantName.value || "").trim();
    const whatsappNumber = String(form.elements.whatsappNumber.value || "").trim();
    const openingTiming = String(form.elements.openingTiming.value || "").trim();

    if (!restaurantName) {
      showFormError(form, "Enter the restaurant name.");
      form.elements.restaurantName.focus();
      return;
    }

    const nextSettings = {
      restaurantName,
      logo: state.settingsLogoDraft === null ? current.logo : state.settingsLogoDraft,
      whatsappNumber: whatsappNumber || settingsDefaults.whatsappNumber,
      openingTiming,
      paymentNote: current.paymentNote,
    };

    try {
      saveSettings(nextSettings);
    } catch (error) {
      showFormError(form, errorMessage(error));
      showToast(errorMessage(error), "error");
      return;
    }

    try {
      const restaurant = Tenant.getRestaurant(tenantRestaurantId);
      if (restaurant && (restaurant.name !== restaurantName || restaurant.logo !== nextSettings.logo)) {
        Tenant.updateRestaurant(tenantRestaurantId, {
          name: restaurantName,
          logo: nextSettings.logo,
        });
      }
    } catch {
      // The menu branding is already saved; the registry can catch up later.
    }

    state.settingsLogoDraft = null;
    refreshShell();
    showToast("Settings saved. The customer menu is updated on this device.");
    renderCurrentPage({ keepScroll: true });
  }

  /* ------------------------------------------------------------------------
     Sign-in and start-up
     ------------------------------------------------------------------------ */

  function initLogin() {
    let initialError = "";
    const activeSession = getActiveSession();

    if (activeSession) {
      const restaurant = Tenant.getRestaurant(activeSession.restaurantId);
      if (!restaurant) {
        setSession(null);
      } else if (restaurant.status === "Expired") {
        setSession(null);
        initialError = "Your plan has expired. Please contact support to renew.";
      } else if (restaurant.status === "Disabled") {
        setSession(null);
        initialError = "This restaurant is disabled. Please contact support.";
      } else {
        window.location.replace(roleHome(activeSession.role));
        return;
      }
    }

    const settings = getSettings();
    document.title = `Sign in | ${settings.restaurantName} Admin`;

    document.querySelectorAll("[data-login-name]").forEach((element) => {
      element.textContent = settings.restaurantName;
    });

    document.querySelectorAll("[data-login-logo]").forEach((logoHolder) => {
      logoHolder.setAttribute("data-initial", initialFor(settings.restaurantName));
      logoHolder.innerHTML = settings.logo
        ? `<img src="${escapeHtml(settings.logo)}" alt="">`
        : `${icon("qr")}<span class="brand-dot" aria-hidden="true"></span>`;
    });

    const form = document.getElementById("login-form");
    const errorBox = document.querySelector("[data-login-error]");
    if (!form) return;

    const usernameInput = form.elements.username;
    const passwordInput = form.elements.password;
    const submitButton = form.querySelector("[type='submit']");

    const clearError = () => {
      if (!errorBox) return;
      errorBox.textContent = "";
      errorBox.hidden = true;
    };

    const showError = (message) => {
      if (!errorBox) return;
      errorBox.textContent = message;
      errorBox.hidden = false;
    };

    if (initialError) showError(initialError);

    form.addEventListener("input", clearError);

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      clearError();

      const username = String(usernameInput.value || "").trim();
      const password = String(passwordInput.value || "");

      if (!username || !password) {
        showError("Enter your username and password.");
        (username ? passwordInput : usernameInput).focus();
        return;
      }

      const result = authenticateLogin(username, password);
      if (!result.ok) {
        showError(result.message || "Wrong username or password");
        passwordInput.value = "";
        passwordInput.focus();
        return;
      }

      setSession(result.member);
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Signing in…";
      }
      window.location.replace(roleHome(result.member.role));
    });

    const passwordToggle = document.querySelector("[data-password-toggle]");
    if (passwordToggle) {
      passwordToggle.addEventListener("click", () => {
        const isPassword = passwordInput.type === "password";
        passwordInput.type = isPassword ? "text" : "password";
        passwordToggle.setAttribute("aria-pressed", isPassword ? "true" : "false");
        passwordToggle.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
        passwordToggle.innerHTML = icon(isPassword ? "eye-off" : "eye");
        passwordInput.focus({ preventScroll: true });
      });
    }
  }

  function bindViewEvents() {
    const view = document.getElementById("admin-view");
    if (!view) return;

    view.addEventListener("click", handleViewClick);
    view.addEventListener("input", handleViewInput);
    view.addEventListener("change", handleViewChange);
    view.addEventListener("submit", handleViewSubmit);
  }

  function initAdmin() {
    const session = getActiveSession();
    if (!session) {
      setSession(null);
      window.location.replace("login.html");
      return;
    }

    setTenantContext(session.restaurantId);

    const restaurant = Tenant.getRestaurant(session.restaurantId);
    if (!restaurant) {
      setSession(null);
      window.location.replace("login.html");
      return;
    }

    if (restaurant.status === "Expired") {
      setSession(null);
      renderRestaurantBlocked(
        "Your plan has expired. Please contact support to renew.",
        "Plan expired"
      );
      return;
    }

    if (restaurant.status === "Disabled") {
      setSession(null);
      renderRestaurantBlocked(
        "This restaurant is disabled. Please contact support.",
        "Restaurant disabled"
      );
      return;
    }

    state.session = session;
    migrateLegacyDealRecords();

    if (!canAccessPage(page, session.role)) {
      renderAccessDenied(session);
      return;
    }

    renderShell();
    bindShell();
    bindViewEvents();
    renderCurrentPage();
    startOrderWatch();

    const orderNumber = new URLSearchParams(window.location.search).get("order");
    if (orderNumber && findOrder(orderNumber)) openOrderModal(orderNumber);
  }

  if (page === "login") {
    initLogin();
  } else {
    initAdmin();
  }
})();
