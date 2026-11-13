/* ==========================================================================
   KARAHI HOUSE — PHASE 3B CUSTOMER MENU
   Menu, cart, order modes, waiter calls, bill requests and live tracking.
   The interface is English-only. All data stays in localStorage.
   Restaurant content and copy come from config.js at the project root.
   ========================================================================== */

(() => {
  "use strict";

  if (typeof CONFIG === "undefined" || typeof Tenant === "undefined") {
    const menu = document.getElementById("menu-content");
    if (menu) {
      menu.innerHTML =
        '<div class="empty-state"><h2 class="empty-title">Menu unavailable</h2>' +
        '<p class="empty-text">The menu could not be loaded. Please ask our staff for a printed menu.</p></div>';
    }
    return;
  }

  const MODAL_CLOSE_MS = 340;
  const ALL_CATEGORY = Object.freeze({ id: "all", icon: "grid" });
  const DINE_IN = "dine-in";
  const TAKEAWAY = "takeaway";
  const DELIVERY = "delivery";
  const ORDER_MODES = Object.freeze([DINE_IN, TAKEAWAY, DELIVERY]);
  const STATUS_ORDER = Object.freeze(["Received", "Preparing", "Ready", "Served", "Paid"]);
  const TRACKING_STEPS = Object.freeze(["Received", "Preparing", "Ready", "Served"]);
  const STATUS_MESSAGES = Object.freeze({
    Received: "Preparing your food",
    Preparing: "Preparing your food",
    Ready: "Your food is ready",
    Served: "Served — enjoy your meal",
    Paid: "Paid — thank you for dining with us",
  });
  const STATUS_TITLES = Object.freeze({
    Received: "Order received",
    Preparing: "Preparing your food",
    Ready: "Your food is ready",
    Served: "Served — enjoy your meal",
    Paid: "Paid — thank you for dining with us",
  });
  const MODE_LABELS = Object.freeze({
    [DINE_IN]: "Dine-in",
    [TAKEAWAY]: "Takeaway",
    [DELIVERY]: "Home Delivery",
  });
  const MODE_PAYMENT_LABELS = Object.freeze({
    [DINE_IN]: "Pay cash at table",
    [TAKEAWAY]: "Pay cash on pickup",
    [DELIVERY]: "Cash on delivery",
  });
  const MIN_QUANTITY = 1;
  const MAX_QUANTITY = 10;

  const COPY_CONFIG = typeof COPY !== "undefined" && COPY ? COPY : {};

  /* ------------------------------------------------------------------------
     DOM references
     ------------------------------------------------------------------------ */

  const app = document.getElementById("app");
  const skipLink = document.querySelector(".skip-link");
  const menuContent = document.getElementById("menu-content");
  const menuStatus = document.getElementById("menu-status");
  const searchInput = document.getElementById("dish-search");
  const clearSearchButton = document.getElementById("clear-search");
  const categoryRail = document.getElementById("category-rail");
  const brandMark = document.getElementById("brand-mark");
  const brandLogo = document.getElementById("brand-logo");
  const tableBadge = document.getElementById("table-badge");
  const tableNumberLabel = document.getElementById("table-number");
  const restaurantNameLabel = document.getElementById("restaurant-name");
  const footerPaymentNote = document.getElementById("footer-payment-note");
  const footerHours = document.getElementById("footer-hours");
  const offersRail = document.getElementById("offers-rail");
  const currencySymbolLabel = document.getElementById("currency-symbol");
  const modeOptions = document.getElementById("mode-options");
  const modeNote = document.getElementById("mode-note");

  const activeOrderStrip = document.getElementById("active-order-strip");
  const activeOrderNumber = document.getElementById("active-order-number");
  const activeOrderStatus = document.getElementById("active-order-status");

  const cartBar = document.getElementById("cart-bar");
  const cartCountBadge = document.getElementById("cart-count-badge");
  const cartCountLabel = document.getElementById("cart-count");
  const cartTotalValue = document.getElementById("cart-total-value");
  const viewCartButton = document.getElementById("view-cart-button");
  const cartModal = document.getElementById("cart-modal");
  const cartBody = document.getElementById("cart-body");
  const cartFooter = document.getElementById("cart-footer");
  const cartTableLabel = document.getElementById("cart-table");
  const cartSubtitle = document.getElementById("cart-subtitle");
  const cartAnnouncer = document.getElementById("cart-announcer");

  const serviceRail = document.getElementById("service-rail");
  const callWaiterButton = document.getElementById("call-waiter-btn");
  const callWaiterLabel = document.getElementById("call-waiter-label");
  const requestBillButton = document.getElementById("request-bill-btn");
  const requestBillLabel = document.getElementById("request-bill-label");

  const billModal = document.getElementById("bill-modal");
  const billTable = document.getElementById("bill-table");
  const billSubtitle = document.getElementById("bill-subtitle");
  const billBody = document.getElementById("bill-body");
  const billFooter = document.getElementById("bill-footer");

  const successScreen = document.getElementById("success-screen");
  const successBrand = document.getElementById("success-brand");
  const successTitle = document.getElementById("success-title");
  const successDesc = document.getElementById("success-desc");
  const successOrderNumber = document.getElementById("success-order-number");
  const successTableLabel = document.getElementById("success-table-label");
  const successTable = document.getElementById("success-table");
  const successTotal = document.getElementById("success-total");
  const successTime = document.getElementById("success-time");
  const successNameRow = document.getElementById("success-name-row");
  const successName = document.getElementById("success-name");
  const successMobileRow = document.getElementById("success-mobile-row");
  const successMobile = document.getElementById("success-mobile");
  const successBack = document.getElementById("success-back");
  const successStamp = successScreen.querySelector(".status-stamp");
  const successSteps = document.getElementById("success-steps");
  const successStatusMessage = document.getElementById("success-status-message");
  const successCashNote = document.getElementById("success-cash-note");

  const guestReviews = document.getElementById("guest-reviews");
  const reviewsList = document.getElementById("reviews-list");
  const feedbackCard = document.getElementById("feedback-card");
  const feedbackForm = document.getElementById("feedback-form");
  const feedbackStars = document.getElementById("feedback-stars");
  const feedbackComment = document.getElementById("feedback-comment");
  const feedbackError = document.getElementById("feedback-error");
  const feedbackThanks = document.getElementById("feedback-thanks");

  const toast = document.getElementById("toast");

  /* ------------------------------------------------------------------------
     Restaurant tenancy
     ------------------------------------------------------------------------ */

  function renderPlanExpired(record) {
    const name =
      String((record && record.name) || (CONFIG.restaurant && CONFIG.restaurant.name) || "Restaurant").trim() ||
      "Restaurant";
    const initials =
      name
        .split(/\s+/)
        .map((word) => word.charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase() || "R";

    document.title = `Plan expired | ${name}`;
    document.body.className = "menu-blocked-page";
    document.body.innerHTML =
      '<main class="blocked-menu">' +
        '<div class="blocked-card">' +
          `<span class="blocked-mark" aria-hidden="true">${escapeHtml(initials)}</span>` +
          `<p class="blocked-kicker">${escapeHtml(name)}</p>` +
          '<h1 class="blocked-title">Plan expired</h1>' +
          '<p class="blocked-text">Plan expired. Contact support.</p>' +
        '</div>' +
      '</main>';
  }

  const tenantRestaurant = Tenant.getRestaurant();
  const plan = Tenant.planStatus();

  if (plan.expired || plan.disabled) {
    renderPlanExpired(tenantRestaurant);
    return;
  }

  const restaurantId = tenantRestaurant.id;
  const tenantKeys = Tenant.storageKeys(restaurantId);

  /* ------------------------------------------------------------------------
     Config-derived values and helpers
     ------------------------------------------------------------------------ */

  const currency = CONFIG.currency || {};
  const ordersConfig = CONFIG.orders || {};
  const themeColors = (CONFIG.theme && CONFIG.theme.colors) || {};
  const storageConfig = CONFIG.storage || {};
  const deliveryConfig = CONFIG.delivery || {};
  const paymentConfig = CONFIG.payment || {};
  const defaultRestaurantName =
    String(tenantRestaurant.name || (CONFIG.restaurant && CONFIG.restaurant.name) || "Restaurant").trim() ||
    "Restaurant";
  const initialStatus = String(ordersConfig.initialStatus || "Received");
  const ordersKey = tenantKeys.orders;
  const sequenceKey = tenantKeys.sequence;
  const startingNumber = toPositiveInteger(ordersConfig.startingNumber, 1025);
  const menuStorageKey = tenantKeys.menu;
  const settingsStorageKey = tenantKeys.settings;
  const offersStorageKey = tenantKeys.offers;
  const legacyDealsStorageKey = tenantKeys.deals;
  const cartStorageKey = tenantKeys.cart;
  const waiterCallsKey = tenantKeys.waiterCalls;
  const billRequestsKey = tenantKeys.billRequests;
  const myOrdersKey = tenantKeys.myOrders;
  const feedbackKey = tenantKeys.feedback;
  const categories = Array.isArray(CONFIG.categories) ? CONFIG.categories : [];
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const defaultMenuItems = Array.isArray(CONFIG.menu) ? CONFIG.menu : [];
  const defaultSettings = {
    restaurantName: defaultRestaurantName,
    logo: String(tenantRestaurant.logo || ""),
    openingTiming: String(
      (CONFIG.restaurant && CONFIG.restaurant.openingTiming) || ""
    ).trim(),
    paymentNote: String(paymentConfig.note || "Pay cash at table"),
  };
  const deliveryCharge = Math.max(0, Number(deliveryConfig.charge) || 0);
  const storedPaymentNotes = {
    [DINE_IN]: String(paymentConfig.note || "Pay cash at table"),
    [TAKEAWAY]: String(paymentConfig.takeawayNote || "Pay cash on pickup"),
    [DELIVERY]: String(paymentConfig.deliveryNote || "Cash on delivery"),
  };

  let restaurantName = defaultRestaurantName;
  let settings = { ...defaultSettings };
  let baseMenuItems = [];
  let menuItems = [];
  let menuById = new Map();
  let offers = [];
  let deals = [];
  let dealSignature = "";

  let moneyFormatter;
  try {
    moneyFormatter = new Intl.NumberFormat(currency.locale || undefined, {
      maximumFractionDigits: Number.isFinite(Number(currency.maximumFractionDigits))
        ? Number(currency.maximumFractionDigits)
        : 0,
      minimumFractionDigits: 0,
    });
  } catch {
    moneyFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
  }

  let timeFormatter;
  try {
    timeFormatter = new Intl.DateTimeFormat(currency.locale || undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    timeFormatter = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
  }

  let dateTimeFormatter;
  try {
    dateTimeFormatter = new Intl.DateTimeFormat(currency.locale || undefined, {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  let offerDateFormatter;
  try {
    offerDateFormatter = new Intl.DateTimeFormat(currency.locale || undefined, {
      day: "numeric",
      month: "short",
    });
  } catch {
    offerDateFormatter = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });
  }

  const initialTable = resolveTableNumber();

  const state = {
    table: initialTable,
    query: "",
    categoryId: ALL_CATEGORY.id,
    cart: new Map(),
    activeModal: null,
    modalTrigger: null,
    successOpen: false,
    placingOrder: false,
    mode: initialTable ? DINE_IN : TAKEAWAY,
    customer: { name: "", mobile: "", address: "" },
    trackingOrderNumber: null,
    billViewMode: null,
    billSignature: "",
    billDraft: null,
    feedbackOrderNumber: null,
    feedbackStars: 0,
  };

  let toastTimer = 0;
  let toastHideTimer = 0;
  let announceTimer = 0;
  let cartBumpTimer = 0;

  function toPositiveInteger(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  function resolveTableNumber() {
    const queryParam = (CONFIG.table && CONFIG.table.queryParam) || "table";
    let queryValue = null;

    try {
      queryValue = new URLSearchParams(window.location.search).get(queryParam);
    } catch {
      queryValue = null;
    }

    if (queryValue !== null) {
      const trimmed = queryValue.trim();
      if (/^\d{1,3}$/.test(trimmed)) {
        const parsed = Number.parseInt(trimmed, 10);
        if (parsed > 0) return parsed;
      }
    }

    return null;
  }

  function hasTable() {
    return Number.isInteger(Number(state.table)) && Number(state.table) > 0;
  }

  function isDineIn() {
    return state.mode === DINE_IN && hasTable();
  }

  function copy(key, vars) {
    let text = COPY_CONFIG[key] != null ? COPY_CONFIG[key] : key;

    if (vars && typeof text === "string") {
      Object.keys(vars).forEach((name) => {
        text = text.split(`{${name}}`).join(String(vars[name]));
      });
    }

    return text;
  }

  function formatMoney(value) {
    const amount = Number(value);
    const safeAmount = Number.isFinite(amount) ? amount : 0;
    const formatted = moneyFormatter.format(safeAmount);
    const symbol = currency.symbol ? String(currency.symbol) : "";
    return symbol ? `${symbol} ${formatted}` : formatted;
  }

  function pluralise(count, singular, plural) {
    return `${count} ${count === 1 ? singular : plural || `${singular}s`}`;
  }

  function menuCountLabel(count) {
    return pluralise(count, "item");
  }

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
    const safeName = document.getElementById(`icon-${name}`) ? name : "grid";
    const classes = extraClass ? `icon ${extraClass}` : "icon";
    return `<svg class="${classes}" aria-hidden="true"><use href="#icon-${safeName}"></use></svg>`;
  }

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function normalizeMode(value) {
    return ORDER_MODES.includes(value) ? value : DINE_IN;
  }

  function normalizeStatus(value) {
    const text = String(value || "");
    return STATUS_ORDER.includes(text) ? text : initialStatus;
  }

  function statusLabel(status) {
    return normalizeStatus(status);
  }

  function modeLabel(mode) {
    return MODE_LABELS[normalizeMode(mode)] || MODE_LABELS[DINE_IN];
  }

  function formatTableLabel(tableNumber = state.table) {
    const parsed = Number(tableNumber);
    return Number.isInteger(parsed) && parsed > 0 ? `Table ${parsed}` : "Table";
  }

  function categoryLabel(category) {
    if (!category) return "";
    if (category.id === ALL_CATEGORY.id) return "All";
    return category.label;
  }

  function paymentNoteForMode() {
    return MODE_PAYMENT_LABELS[state.mode] || MODE_PAYMENT_LABELS[DINE_IN];
  }

  function storedPaymentNote(mode) {
    return storedPaymentNotes[normalizeMode(mode)];
  }

  function modeNoteText() {
    if (state.mode === DINE_IN) {
      return hasTable() ? copy("modeDineNote", { table: state.table }) : copy("modeDineUnavailable");
    }
    if (state.mode === TAKEAWAY) {
      return copy("modeTakeawayNote");
    }
    return copy("modeDeliveryNote", { fee: formatMoney(deliveryCharge) });
  }

  /* ------------------------------------------------------------------------
     Storage helpers
     ------------------------------------------------------------------------ */

  function readStoredJson(key) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function writeStoredJson(key, value) {
    window.localStorage.setItem(key, JSON.stringify(value));
  }

  function readWaiterCalls() {
    const stored = readStoredJson(waiterCallsKey);
    return Array.isArray(stored) ? stored.filter((call) => call && typeof call === "object") : [];
  }

  function readBillRequests() {
    const stored = readStoredJson(billRequestsKey);
    return Array.isArray(stored) ? stored.filter((request) => request && typeof request === "object") : [];
  }

  function readFeedback() {
    const stored = readStoredJson(feedbackKey);
    return Array.isArray(stored)
      ? stored.filter((entry) => entry && typeof entry === "object" && entry.orderNumber)
      : [];
  }

  function findFeedbackForOrder(orderNumber) {
    const wanted = String(orderNumber || "");
    return readFeedback().find((entry) => String(entry.orderNumber) === wanted) || null;
  }

  function requestTime(request) {
    const date = new Date(request && request.time);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }

  function latestRequest(requests) {
    return requests.slice().sort((a, b) => requestTime(b) - requestTime(a))[0] || null;
  }

  function getPendingWaiterCall(tableNumber) {
    return (
      readWaiterCalls().find(
        (call) =>
          Number(call.tableNumber) === Number(tableNumber) &&
          String(call.status || "Pending") === "Pending"
      ) || null
    );
  }

  function getPendingBillRequest(tableNumber) {
    return (
      readBillRequests().find(
        (request) =>
          Number(request.tableNumber) === Number(tableNumber) &&
          String(request.status || "Pending") === "Pending"
      ) || null
    );
  }

  function getLatestPaidBillRequest(tableNumber) {
    return latestRequest(
      readBillRequests().filter(
        (request) =>
          Number(request.tableNumber) === Number(tableNumber) &&
          String(request.status) === "Paid"
      )
    );
  }

  function readOrders() {
    const stored = readStoredJson(ordersKey);
    return Array.isArray(stored) ? stored.filter((order) => order && typeof order === "object") : [];
  }

  function getUnpaidOrdersForTable(tableNumber = state.table) {
    return readOrders().filter(
      (order) =>
        normalizeMode(order.mode) === DINE_IN &&
        Number(order.tableNumber) === Number(tableNumber) &&
        normalizeStatus(order.status) !== "Paid"
    );
  }

  function getMyOrderNumbers() {
    const stored = readStoredJson(myOrdersKey);
    return Array.isArray(stored)
      ? stored.filter((orderNumber) => typeof orderNumber === "string" && orderNumber)
      : [];
  }

  function rememberMyOrder(orderNumber) {
    const list = getMyOrderNumbers();
    if (!list.includes(orderNumber)) list.push(orderNumber);
    writeStoredJson(myOrdersKey, list.slice(-25));
  }

  function getOrderByNumber(orderNumber) {
    return readOrders().find((order) => String(order.orderNumber) === String(orderNumber)) || null;
  }

  function getTrackedOrder(orderNumber) {
    if (!orderNumber || !getMyOrderNumbers().includes(orderNumber)) return null;

    const order = getOrderByNumber(orderNumber);
    if (!order) return null;

    if (normalizeMode(order.mode) === DINE_IN && Number(order.tableNumber) !== Number(state.table)) {
      return null;
    }

    return order;
  }

  function findActiveTrackedOrder() {
    const orderNumbers = getMyOrderNumbers().slice().reverse();

    for (const orderNumber of orderNumbers) {
      const order = getTrackedOrder(orderNumber);
      if (order && normalizeStatus(order.status) !== "Paid") return order;
    }

    return null;
  }

  /* ------------------------------------------------------------------------
     Menu data shared with the admin pages
     ------------------------------------------------------------------------ */

  function normalizeMenu(rawItems) {
    if (!Array.isArray(rawItems)) return null;

    return rawItems
      .map((item) => {
        if (!item || typeof item !== "object") return null;

        const name = String(item.name || "").trim();
        const id = String(item.id || slugify(name)).trim();
        const category = String(item.category || "").trim();
        const price = Number(item.price);

        if (!id || !name || !Number.isFinite(price) || price < 0) return null;
        if (!categoryById.has(category)) return null;

        return {
          id,
          name,
          description: String(item.description || "").trim(),
          price,
          category,
          image: typeof item.image === "string" ? item.image.trim() : "",
          popular: Boolean(item.popular),
          signature: Boolean(item.signature || item.isSignature),
          sample: Boolean(item.sample),
          active: item.active !== false,
        };
      })
      .filter(Boolean);
  }

  function pruneCartToMenu() {
    let removed = false;
    state.cart.forEach((_quantity, itemId) => {
      if (!menuById.has(itemId)) {
        state.cart.delete(itemId);
        removed = true;
      }
    });
    return removed;
  }

  function normalizeCartQuantity(value) {
    const quantity = Math.round(Number(value));
    if (!Number.isInteger(quantity) || quantity < MIN_QUANTITY) return 0;
    return Math.min(quantity, MAX_QUANTITY);
  }

  function loadCart() {
    state.cart.clear();

    const stored = readStoredJson(cartStorageKey);
    if (!stored || typeof stored !== "object") return;

    const items = stored.items && typeof stored.items === "object" ? stored.items : {};
    let changed = false;
    Object.entries(items).forEach(([itemId, value]) => {
      const quantity = normalizeCartQuantity(value);
      if (quantity && menuById.has(itemId)) {
        state.cart.set(itemId, quantity);
      } else {
        changed = true;
      }
    });

    // Carts saved by the earlier separate deal cart stored deal IDs in their own map.
    const legacyDeals = stored.deals && typeof stored.deals === "object" ? stored.deals : {};
    Object.keys(legacyDeals).forEach(() => {
      changed = true;
    });
    Object.entries(legacyDeals).forEach(([dealId, value]) => {
      const quantity = normalizeCartQuantity(value);
      if (!quantity) return;
      const itemId = `deal:${dealId}`;
      if (menuById.has(itemId)) state.cart.set(itemId, quantity);
    });

    if (changed) persistCart();
  }

  function persistCart() {
    try {
      writeStoredJson(cartStorageKey, {
        items: Object.fromEntries(state.cart),
      });
    } catch {
      // The on-screen cart still works; the next change will try saving again.
    }
  }

  function loadMenu() {
    const stored = normalizeMenu(readStoredJson(menuStorageKey));
    const source = stored || normalizeMenu(defaultMenuItems) || [];

    baseMenuItems = source.filter((item) => item.active);
    mergeDealsIntoMenu();
  }

  function mergeDealsIntoMenu() {
    const dealItems = deals.map(dealToMenuItem).filter(Boolean);
    menuItems = [...baseMenuItems, ...dealItems];
    menuById = new Map(menuItems.map((item) => [item.id, item]));
  }

  function rebuildMenuWithDeals() {
    mergeDealsIntoMenu();
    if (pruneCartToMenu()) persistCart();
  }

  function loadSettings() {
    const stored = readStoredJson(settingsStorageKey);

    if (stored && typeof stored === "object" && !Array.isArray(stored)) {
      if (typeof stored.openingTiming === "string") {
        settings.openingTiming = stored.openingTiming.trim();
      }
      if (typeof stored.paymentNote === "string" && stored.paymentNote.trim()) {
        settings.paymentNote = stored.paymentNote.trim();
      }
    }

    restaurantName = defaultRestaurantName;
    settings.restaurantName = defaultRestaurantName;
    settings.logo = defaultSettings.logo;
  }

  function loadOffers() {
    const stored = readStoredJson(offersStorageKey);
    const records = Array.isArray(stored)
      ? stored.filter((entry) => entry && typeof entry === "object")
      : [];

    offers = records.filter((entry) => entry.type !== "deal" && !Array.isArray(entry.items));

    const offerDeals = records
      .filter((entry) => entry.type === "deal" || Array.isArray(entry.items))
      .map(normalizeDealRecord)
      .filter(Boolean);

    // Deals saved by the earlier separate deal store stay readable until the
    // admin migrates them into the offers store.
    const legacy = readStoredJson(legacyDealsStorageKey);
    const legacyDeals = Array.isArray(legacy)
      ? legacy.map(normalizeDealRecord).filter(Boolean)
      : [];

    const byId = new Map();
    legacyDeals.concat(offerDeals).forEach((deal) => byId.set(deal.id, deal));
    deals = Array.from(byId.values()).sort(
      (first, second) => Date.parse(second.updatedAt) - Date.parse(first.updatedAt) || 0
    );
  }

  function normalizeDealRecord(raw) {
    if (!raw || typeof raw !== "object") return null;
    if (raw.type && raw.type !== "deal") return null;

    const name = String(raw.name || raw.title || "").trim();
    const items = (Array.isArray(raw.items) ? raw.items : [])
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const menuItem = menuById.get(String(entry.productId || entry.id || "").trim());
        const itemName = String(entry.name || (menuItem && menuItem.name) || "").trim();
        const price = Math.round(Number(entry.price != null ? entry.price : menuItem && menuItem.price));
        const quantity = Math.round(Number(entry.quantity));
        if (!itemName || !Number.isFinite(price) || price < 0) return null;
        if (!Number.isInteger(quantity) || quantity < 1) return null;
        return {
          productId: String(entry.productId || entry.id || (menuItem && menuItem.id) || ""),
          name: itemName,
          price,
          quantity: Math.min(quantity, MAX_QUANTITY),
          image: String(entry.image || (menuItem && menuItem.image) || "").trim(),
        };
      })
      .filter(Boolean);

    if (!name || !items.length) return null;

    const originalTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (originalTotal <= 0) return null;

    const pricingMode = ["price", "percent", "fixed"].includes(raw.pricingMode)
      ? raw.pricingMode
      : "price";
    const discountValue = Math.max(0, Number(raw.discountValue) || 0);
    const rawPrice = Number(raw.dealPrice != null ? raw.dealPrice : raw.price);
    let dealPrice = Number.isFinite(rawPrice) ? Math.round(rawPrice) : 0;

    if (dealPrice <= 0) {
      if (pricingMode === "percent" && discountValue > 0 && discountValue < 100) {
        dealPrice = Math.round(originalTotal * (1 - discountValue / 100));
      } else if (pricingMode === "fixed" && discountValue > 0) {
        dealPrice = Math.max(0, originalTotal - Math.round(discountValue));
      }
    }

    if (dealPrice <= 0 || dealPrice >= originalTotal) return null;

    const image =
      String(raw.image || "").trim() || (items.find((item) => item.image) || {}).image || "";

    return {
      id: String(raw.id || slugify(name)),
      name,
      description: String(raw.description || "").trim(),
      image,
      items,
      includedLabel: items.map((item) => `${item.quantity}x ${item.name}`).join(" + "),
      pricingMode,
      discountValue,
      dealPrice,
      originalTotal,
      savings: originalTotal - dealPrice,
      startDate: String(raw.startDate || ""),
      startTime: String(raw.startTime || ""),
      endDate: String(raw.endDate || ""),
      endTime: String(raw.endTime || ""),
      active: raw.active !== false,
      updatedAt: String(raw.updatedAt || raw.createdAt || ""),
    };
  }

  function combineDealDateTime(dateValue, timeValue, endOfDay) {
    const date = parseDateOnly(dateValue);
    if (!date) return null;
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(timeValue || "").trim());
    const hours = match ? Number(match[1]) : endOfDay ? 23 : 0;
    const minutes = match ? Number(match[2]) : endOfDay ? 59 : 0;
    const combined = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes);
    if (endOfDay) combined.setSeconds(59, 999);
    return combined;
  }

  function dealIsLive(deal) {
    if (deal.active === false) return false;
    const now = new Date();
    const start = combineDealDateTime(deal.startDate, deal.startTime, false);
    const end = combineDealDateTime(deal.endDate, deal.endTime, true);
    if (start && now < start) return false;
    if (end && now > end) return false;
    return true;
  }

  function dealToMenuItem(deal) {
    if (!dealIsLive(deal)) return null;
    return {
      id: `deal:${deal.id}`,
      name: deal.name,
      description: deal.description,
      price: deal.dealPrice,
      category: "deals",
      image: deal.image,
      popular: false,
      active: true,
      isDeal: true,
      dealId: deal.id,
      includedLabel: deal.includedLabel,
      includedItems: deal.items,
      originalTotal: deal.originalTotal,
      savings: deal.savings,
    };
  }

  function liveDealSignature() {
    return deals
      .filter(dealIsLive)
      .map((deal) => `${deal.id}:${deal.dealPrice}`)
      .join("|");
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

  function getVisibleOffers() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return offers
      .filter(
        (offer) =>
          offer &&
          typeof offer === "object" &&
          offer.active !== false &&
          offer.type !== "deal" &&
          !Array.isArray(offer.items)
      )
      .map((offer) => {
        const discount = Math.round(Number(offer.discount));
        return {
          title: String(offer.title || "").trim(),
          description: String(offer.description || "").trim(),
          discount: Number.isFinite(discount) ? discount : 0,
          start: parseDateOnly(offer.startDate),
          end: parseDateOnly(offer.endDate),
        };
      })
      .filter((offer) => {
        if (!offer.title) return false;
        if (offer.start && today < offer.start) return false;
        if (offer.end && today > offer.end) return false;
        return true;
      });
  }

  function initialFor(value) {
    const first = Array.from(String(value || "?"))[0] || "?";
    return first.toUpperCase();
  }

  function getCategory(categoryId) {
    return categoryById.get(categoryId);
  }

  function getItemQuantity(itemId) {
    return state.cart.get(itemId) || 0;
  }

  function getCartEntries() {
    return Array.from(state.cart.entries())
      .map(([itemId, quantity]) => {
        const item = menuById.get(itemId);
        if (!item || quantity <= 0) return null;
        return { item, quantity, lineTotal: item.price * quantity };
      })
      .filter(Boolean);
  }

  function getCartTotals(entries = getCartEntries()) {
    const totals = entries.reduce(
      (summary, entry) => {
        summary.count += entry.quantity;
        summary.subtotal += entry.lineTotal;
        return summary;
      },
      { count: 0, subtotal: 0, deliveryFee: 0, total: 0 }
    );

    totals.deliveryFee = state.mode === DELIVERY && entries.length ? deliveryCharge : 0;
    totals.total = totals.subtotal + totals.deliveryFee;
    return totals;
  }

  function announce(message) {
    window.clearTimeout(announceTimer);
    cartAnnouncer.textContent = "";
    announceTimer = window.setTimeout(() => {
      cartAnnouncer.textContent = message;
    }, 60);
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    window.clearTimeout(toastHideTimer);
    toast.textContent = message;
    toast.hidden = false;
    void toast.offsetWidth;
    toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => {
      toast.classList.remove("is-visible");
      toastHideTimer = window.setTimeout(() => {
        toast.hidden = true;
      }, 220);
    }, 3400);
  }

  function bumpCartBar() {
    window.clearTimeout(cartBumpTimer);
    cartBar.classList.remove("is-bumping");
    void cartBar.offsetWidth;
    cartBar.classList.add("is-bumping");
    cartBumpTimer = window.setTimeout(() => {
      cartBar.classList.remove("is-bumping");
    }, 340);
  }

  function bumpValue(element) {
    if (!element) return;
    element.classList.remove("is-bumping");
    void element.offsetWidth;
    element.classList.add("is-bumping");
    window.setTimeout(() => {
      element.classList.remove("is-bumping");
    }, 240);
  }

  /* ------------------------------------------------------------------------
     Theme and static chrome
     ------------------------------------------------------------------------ */

  function applyTheme() {
    Object.entries(themeColors).forEach(([key, value]) => {
      if (typeof value !== "string" || !value.trim()) return;
      const cssName = `--${key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)}`;
      document.documentElement.style.setProperty(cssName, value);
    });

    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
      themeMeta.setAttribute("content", themeColors.primary || "#0F2E1F");
    }
  }

  function updateBrandLogo() {
    if (settings.logo) {
      if (brandLogo.getAttribute("src") !== settings.logo) brandLogo.src = settings.logo;
      brandMark.hidden = false;
      return;
    }

    brandLogo.removeAttribute("src");
    brandMark.hidden = true;
  }

  function updateModeButtons() {
    modeOptions.classList.toggle("is-two", !hasTable());
    modeOptions.querySelectorAll("[data-mode]").forEach((button) => {
      const isDineButton = button.dataset.mode === DINE_IN;
      button.hidden = isDineButton && !hasTable();
      const active = button.dataset.mode === state.mode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function applyChrome() {
    const dineIn = isDineIn();
    const tableLabel = formatTableLabel();

    document.title = dineIn
      ? `${restaurantName} | ${copy("menu")} - ${tableLabel}`
      : `${restaurantName} | ${copy("menu")}`;
    const descriptionMeta = document.querySelector('meta[name="description"]');
    if (descriptionMeta) {
      descriptionMeta.setAttribute(
        "content",
        `Browse the ${restaurantName} menu, add dishes to your cart and place your order. Prices in ${
          String(currency.symbol || "").replace(/\.$/, "") || "Rs"
        }.`
      );
    }

    restaurantNameLabel.textContent = restaurantName;
    tableNumberLabel.textContent = dineIn ? tableLabel : modeLabel(state.mode);
    tableBadge.classList.toggle("is-mode", !dineIn);
    tableBadge.setAttribute(
      "aria-label",
      dineIn ? copy("tableLocked", { table: tableLabel }) : modeLabel(state.mode)
    );

    cartTableLabel.textContent = dineIn ? tableLabel : modeLabel(state.mode);
    cartTableLabel.title = dineIn ? copy("tableLocked", { table: tableLabel }) : modeLabel(state.mode);

    modeNote.textContent = modeNoteText();
    footerPaymentNote.textContent = paymentNoteForMode();
    footerHours.textContent = settings.openingTiming
      ? copy("openHours", { hours: settings.openingTiming })
      : "";
    footerHours.hidden = !settings.openingTiming;
    currencySymbolLabel.textContent = currency.symbol || "";

    successBrand.textContent = restaurantName;
    successCashNote.textContent = paymentNoteForMode();

    updateBrandLogo();
    updateModeButtons();
  }

  /* ------------------------------------------------------------------------
     Menu rendering
     ------------------------------------------------------------------------ */

  function renderCategoryRail() {
    const railItems = [ALL_CATEGORY, ...categories];
    categoryRail.innerHTML = railItems
      .map((category) => {
        const active = category.id === state.categoryId;
        return (
          `<button class="category-pill${active ? " is-active" : ""}" type="button" ` +
          `data-category-id="${escapeHtml(category.id)}" aria-pressed="${active ? "true" : "false"}">` +
          `${icon(category.icon)}<span>${escapeHtml(categoryLabel(category))}</span></button>`
        );
      })
      .join("");
  }

  function updateCategoryRail() {
    categoryRail.querySelectorAll("[data-category-id]").forEach((pill) => {
      const active = pill.dataset.categoryId === state.categoryId;
      pill.classList.toggle("is-active", active);
      pill.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function renderOfferCard(offer, index) {
    const titleId = `offer-title-${index}`;
    const discount =
      offer.discount > 0
        ? `<div class="offer-stub" aria-hidden="true">` +
          `<span class="offer-discount">${escapeHtml(offer.discount)}%</span>` +
          `<span class="offer-off">OFF</span>` +
          `</div>`
        : "";
    const windowCopy = offer.end
      ? copy("offerEnds", { date: offerDateFormatter.format(offer.end) })
      : offer.start
        ? copy("offerFrom", { date: offerDateFormatter.format(offer.start) })
        : "";

    return (
      `<article class="offer-card" aria-labelledby="${titleId}">` +
      discount +
      `<div class="offer-copy">` +
      `<p class="offer-kicker">${escapeHtml(copy("offerLabel"))}</p>` +
      `<h2 class="offer-title" id="${titleId}">${escapeHtml(offer.title)}</h2>` +
      (offer.description ? `<p class="offer-desc">${escapeHtml(offer.description)}</p>` : "") +
      (windowCopy ? `<p class="offer-window">${escapeHtml(windowCopy)}</p>` : "") +
      `</div>` +
      `</article>`
    );
  }

  function renderOffers() {
    const visibleOffers = getVisibleOffers();

    if (!visibleOffers.length) {
      offersRail.hidden = true;
      offersRail.innerHTML = "";
      return;
    }

    offersRail.innerHTML = visibleOffers.map(renderOfferCard).join("");
    offersRail.hidden = false;
  }

  function reviewStarsHtml(stars) {
    return Array.from({ length: 5 }, (_, index) =>
      `<span class="review-star${index < stars ? " is-filled" : ""}" aria-hidden="true">${icon("star")}</span>`
    ).join("");
  }

  function renderReviews() {
    if (!guestReviews || !reviewsList) return;

    const entries = readFeedback()
      .filter((entry) => String(entry.status) === "Approved" && entry.visible === true)
      .map((entry) => ({ ...entry, stars: Math.round(Number(entry.stars)) }))
      .filter((entry) => entry.stars >= 1 && entry.stars <= 5)
      .sort((first, second) => new Date(second.time).getTime() - new Date(first.time).getTime())
      .slice(0, 6);

    if (!entries.length) {
      guestReviews.hidden = true;
      reviewsList.innerHTML = "";
      return;
    }

    reviewsList.innerHTML = entries
      .map((entry) => {
        const stars = entry.stars;
        const meta =
          Number(entry.tableNumber) > 0
            ? copy("reviewTable", { table: entry.tableNumber })
            : modeLabel(entry.mode);

        return (
          `<article class="review-card">` +
          `<div class="review-stars" role="img" aria-label="${escapeHtml(copy("reviewStars", { stars }))}">` +
          reviewStarsHtml(stars) +
          `</div>` +
          (entry.comment ? `<p class="review-comment">${escapeHtml(entry.comment)}</p>` : "") +
          `<p class="review-meta">${escapeHtml(meta)}</p>` +
          `</article>`
        );
      })
      .join("");
    guestReviews.hidden = false;
  }

  function itemMatchesSearch(item) {
    if (!state.query) return true;
    const category = getCategory(item.category);
    const haystack = `${item.name || ""} ${item.description || ""} ${
      category ? category.label : ""
    } ${category ? categoryLabel(category) : ""}`.toLowerCase();
    return state.query
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .every((part) => haystack.includes(part));
  }

  function getTrendingStats() {
    const stats = new Map();

    readOrders().forEach((order) => {
      const items = Array.isArray(order.items) ? order.items : [];
      items.forEach((entry) => {
        if (!entry || typeof entry !== "object") return;
        const quantity = Math.round(Number(entry.quantity ?? entry.qty));
        if (!Number.isFinite(quantity) || quantity < 1) return;

        const isDealEntry = entry.isDeal === true || entry.type === "deal";
        const baseId = String((isDealEntry ? entry.dealId || entry.id : entry.id) || "").trim();
        if (!baseId) return;

        const itemId = isDealEntry ? `deal:${baseId}` : baseId;
        if (!menuById.has(itemId)) return;
        stats.set(itemId, (stats.get(itemId) || 0) + quantity);
      });
    });

    return stats;
  }

  function itemMatchesCategory(item, trendingStats) {
    if (state.categoryId === ALL_CATEGORY.id) return true;
    if (state.categoryId === "trending") return Boolean(trendingStats && trendingStats.has(item.id));
    if (state.categoryId === "signature") return item.signature === true;
    return item.category === state.categoryId;
  }

  function renderDishCard(item, trendingStats) {
    if (item.isDeal) return renderDealDishCard(item);

    const quantity = getItemQuantity(item.id);
    const itemId = escapeHtml(item.id);
    const itemName = escapeHtml(item.name);
    const hasQuantity = quantity > 0;
    const category = getCategory(item.category);
    const chipParts = [category ? categoryLabel(category) : ""];
    if (item.signature) chipParts.push(copy("signatureLabel"));
    const orderCount = trendingStats ? trendingStats.get(item.id) || 0 : 0;
    if (orderCount > 0 && state.categoryId === "trending") {
      chipParts.push(`${orderCount} ${orderCount === 1 ? "order" : "orders"}`);
    }
    const chip = chipParts.filter(Boolean).join(" · ");

    return (
      `<article class="dish-card" data-item-id="${itemId}">` +
      `<div class="dish-photo-wrap" data-initial="${escapeHtml(initialFor(item.name))}">` +
      `<img class="dish-photo" src="${escapeHtml(item.image || "")}" alt="" width="600" height="600" loading="lazy" decoding="async">` +
      `</div>` +
      `<div class="dish-info">` +
      (chip ? `<p class="dish-category">${escapeHtml(chip)}</p>` : "") +
      `<h3 class="dish-name">${itemName}</h3>` +
      `<p class="dish-desc">${escapeHtml(item.description || "")}</p>` +
      `<p class="dish-price">${formatMoney(item.price)}</p>` +
      `</div>` +
      `<div class="dish-action">` +
      `<button class="add-button" type="button" data-cart-action="add" data-item-id="${itemId}" ` +
      `aria-label="${escapeHtml(copy("addToOrder", { name: item.name }))}"${hasQuantity ? " hidden" : ""}>${escapeHtml(copy("add"))} ${icon("plus")}</button>` +
      `<div class="qty-stepper" role="group" aria-label="${itemName} ${escapeHtml(copy("quantity"))}"${hasQuantity ? "" : " hidden"}>` +
      `<button class="qty-btn" type="button" data-cart-action="dec" data-item-id="${itemId}" aria-label="${escapeHtml(copy("decreaseQty", { name: item.name }))}"${quantity <= MIN_QUANTITY ? " disabled" : ""}>${icon("minus")}</button>` +
      `<span class="qty-value">${quantity}</span>` +
      `<button class="qty-btn qty-btn--plus" type="button" data-cart-action="inc" data-item-id="${itemId}" aria-label="${escapeHtml(copy("increaseQty", { name: item.name }))}"${quantity >= MAX_QUANTITY ? " disabled" : ""}>${icon("plus")}</button>` +
      `</div>` +
      `</div>` +
      `</article>`
    );
  }

  function renderDealDishCard(item) {
    const quantity = getItemQuantity(item.id);
    const itemId = escapeHtml(item.id);
    const itemName = escapeHtml(item.name);
    const hasQuantity = quantity > 0;
    const savePercent =
      item.originalTotal > 0 ? Math.round((item.savings / item.originalTotal) * 100) : 0;

    return (
      `<article class="dish-card dish-card--deal" data-item-id="${itemId}">` +
      `<div class="dish-photo-wrap" data-initial="${escapeHtml(initialFor(item.name))}">` +
      `<img class="dish-photo" src="${escapeHtml(item.image || "")}" alt="" width="600" height="600" loading="lazy" decoding="async">` +
      `<span class="deal-save-badge">${escapeHtml(copy("saveBadge", { amount: formatMoney(item.savings) }))}</span>` +
      `</div>` +
      `<div class="dish-info">` +
      `<p class="deal-kicker">${escapeHtml(copy("dealLabel"))}${savePercent > 0 ? ` · ${escapeHtml(copy("savePercent", { percent: savePercent }))}` : ""}</p>` +
      `<h3 class="dish-name">${itemName}</h3>` +
      (item.description ? `<p class="dish-desc">${escapeHtml(item.description)}</p>` : "") +
      `<p class="deal-includes">${escapeHtml(item.includedLabel)}</p>` +
      `<p class="dish-price dish-price--deal">${formatMoney(item.price)} <s>${formatMoney(item.originalTotal)}</s></p>` +
      `</div>` +
      `<div class="dish-action">` +
      `<button class="add-button add-button--deal" type="button" data-cart-action="add" data-item-id="${itemId}" ` +
      `aria-label="${escapeHtml(copy("addDealToOrder", { name: item.name }))}"${hasQuantity ? " hidden" : ""}>${escapeHtml(copy("addDeal"))} ${icon("plus")}</button>` +
      `<div class="qty-stepper" role="group" aria-label="${itemName} ${escapeHtml(copy("dealQuantity"))}"${hasQuantity ? "" : " hidden"}>` +
      `<button class="qty-btn" type="button" data-cart-action="dec" data-item-id="${itemId}" aria-label="${escapeHtml(copy("decreaseDealQty", { name: item.name }))}"${quantity <= MIN_QUANTITY ? " disabled" : ""}>${icon("minus")}</button>` +
      `<span class="qty-value">${quantity}</span>` +
      `<button class="qty-btn qty-btn--plus" type="button" data-cart-action="inc" data-item-id="${itemId}" aria-label="${escapeHtml(copy("increaseDealQty", { name: item.name }))}"${quantity >= MAX_QUANTITY ? " disabled" : ""}>${icon("plus")}</button>` +
      `</div>` +
      `</div>` +
      `</article>`
    );
  }

  function renderMenuSection(key, title, items, iconName, isPopular = false, trendingStats = null, emptyHtml = "") {
    const headingId = `menu-heading-${slugify(key) || "section"}`;
    const body = items.length ? items.map((item) => renderDishCard(item, trendingStats)).join("") : emptyHtml;
    return (
      `<section class="menu-section" aria-labelledby="${headingId}">` +
      `<div class="section-heading">` +
      `<div class="section-heading-main">` +
      `<span class="section-icon${isPopular ? " is-popular" : ""}">${icon(iconName)}</span>` +
      `<h2 class="section-title" id="${headingId}">${escapeHtml(title)}</h2>` +
      `</div>` +
      `<span class="section-count">${escapeHtml(menuCountLabel(items.length))}</span>` +
      `</div>` +
      `<div class="dish-list">${body}</div>` +
      `</section>`
    );
  }

  function renderEmptyState() {
    const category = getCategory(state.categoryId);
    let title = copy("nothingHere");
    let message;

    if (state.query && category && category.id !== ALL_CATEGORY.id) {
      title = copy("noDishesFound");
      message = copy("noMatchCategory", { category: categoryLabel(category), query: state.query });
    } else if (state.query) {
      title = copy("noDishesFound");
      message = copy("noMatch", { query: state.query });
    } else if (category && category.id === "trending") {
      title = copy("noTrending");
      message = copy("noTrendingHint");
    } else if (category && category.id === "signature") {
      title = copy("noSignature");
      message = copy("noSignatureHint");
    } else if (category && category.id === "deals") {
      title = copy("noCategoryItems");
      message = copy("noDeals");
    } else if (category && category.id !== ALL_CATEGORY.id) {
      title = copy("noCategoryItems");
      message = copy("noCategoryItemsHint");
    } else {
      message = copy("noDishesCategory");
    }

    return (
      `<div class="empty-state">` +
      `<div class="empty-icon">${icon(state.query ? "search" : "pot")}</div>` +
      `<h2 class="empty-title">${escapeHtml(title)}</h2>` +
      `<p class="empty-text">${escapeHtml(message)}</p>` +
      `<button class="empty-action" type="button" data-empty-action="reset">${escapeHtml(copy("showFullMenu"))}</button>` +
      `</div>`
    );
  }

  function renderMenu() {
    const trendingStats = state.categoryId === "trending" ? getTrendingStats() : null;
    const filteredItems = menuItems.filter(
      (item) => itemMatchesCategory(item, trendingStats) && itemMatchesSearch(item)
    );
    let html = "";

    if (state.query) {
      html = filteredItems.length
        ? renderMenuSection("search", copy("searchResults"), filteredItems, "search")
        : renderEmptyState();
    } else if (state.categoryId !== ALL_CATEGORY.id) {
      const category = getCategory(state.categoryId);
      if (!category) {
        html = renderEmptyState();
      } else {
        let categoryItems = filteredItems;
        if (category.id === "trending") {
          categoryItems = filteredItems
            .slice()
            .sort(
              (a, b) =>
                (trendingStats.get(b.id) || 0) - (trendingStats.get(a.id) || 0) ||
                a.name.localeCompare(b.name)
            );
        }
        html = renderMenuSection(
          `category-${category.id}`,
          categoryLabel(category),
          categoryItems,
          category.icon,
          false,
          trendingStats,
          renderEmptyState()
        );
      }
    } else {
      const popularItems = filteredItems.filter((item) => item.popular);
      const sections = [];

      if (popularItems.length) {
        sections.push(renderMenuSection("popular", copy("popularItems"), popularItems, "flame", true));
      }

      categories.forEach((category) => {
        const categoryItems = filteredItems.filter((item) => item.category === category.id);
        if (categoryItems.length) {
          sections.push(
            renderMenuSection(`category-${category.id}`, categoryLabel(category), categoryItems, category.icon)
          );
        }
      });

      html = sections.length ? sections.join("") : renderEmptyState();
    }

    menuContent.innerHTML = html;
    updateMenuStatus(filteredItems.length);
  }

  function updateMenuStatus(count) {
    let status;

    if (state.query) {
      status = copy("resultsFor", { count, query: state.query });
    } else if (state.categoryId !== ALL_CATEGORY.id) {
      const category = getCategory(state.categoryId);
      status = copy("dishesIn", {
        count,
        category: category ? categoryLabel(category) : "",
      });
    } else {
      status = copy("dishesOnMenu", { count });
    }

    menuStatus.textContent = status;
  }

  function syncMenuControls(itemId) {
    const quantity = getItemQuantity(itemId);
    menuContent.querySelectorAll(".dish-card").forEach((card) => {
      if (card.dataset.itemId !== itemId) return;
      const addButton = card.querySelector(".add-button");
      const stepper = card.querySelector(".qty-stepper");
      const value = card.querySelector(".qty-value");
      const decrease = card.querySelector('[data-cart-action="dec"]');
      const increase = card.querySelector('[data-cart-action="inc"]');
      if (addButton) addButton.hidden = quantity > 0;
      if (stepper) stepper.hidden = quantity === 0;
      if (value) value.textContent = String(quantity);
      if (decrease) decrease.disabled = quantity <= MIN_QUANTITY;
      if (increase) increase.disabled = quantity >= MAX_QUANTITY;
    });
  }

  function syncAllMenuControls() {
    menuById.forEach((_item, itemId) => syncMenuControls(itemId));
  }

  /* ------------------------------------------------------------------------
     Cart totals and drawer
     ------------------------------------------------------------------------ */

  function updateCartSummary() {
    const totals = getCartTotals();
    const countLabel = menuCountLabel(totals.count);

    cartCountBadge.textContent = totals.count > 99 ? "99+" : String(totals.count);
    cartCountLabel.textContent = countLabel;
    cartTotalValue.textContent = formatMoney(totals.total);
    cartSubtitle.textContent = `${countLabel} · ${paymentNoteForMode()}`;
  }

  function checkoutDetailsHtml() {
    const isDelivery = state.mode === DELIVERY;
    const note =
      state.mode === DINE_IN
        ? copy("detailsForDineIn")
        : isDelivery
          ? copy("detailsForDelivery")
          : copy("detailsForTakeaway");

    return (
      `<div class="checkout-details">` +
      `<p class="checkout-title">${escapeHtml(copy("yourDetails"))}</p>` +
      `<div class="checkout-grid">` +
      `<label class="checkout-field">${escapeHtml(copy("name"))}` +
      `<input type="text" data-checkout="name" autocomplete="name" value="${escapeHtml(state.customer.name)}" placeholder="${escapeHtml(copy("namePlaceholder"))}">` +
      `</label>` +
      `<label class="checkout-field">${escapeHtml(copy("mobileNumber"))}` +
      `<input type="tel" inputmode="tel" data-checkout="mobile" autocomplete="tel" value="${escapeHtml(state.customer.mobile)}" placeholder="${escapeHtml(copy("mobilePlaceholder"))}">` +
      `</label>` +
      (isDelivery
        ? `<label class="checkout-field checkout-field--wide">${escapeHtml(copy("deliveryAddress"))}` +
          `<input type="text" data-checkout="address" autocomplete="street-address" value="${escapeHtml(state.customer.address)}" placeholder="${escapeHtml(copy("addressPlaceholder"))}">` +
          `</label>`
        : "") +
      `</div>` +
      `<p class="checkout-note">${escapeHtml(note)}</p>` +
      `</div>`
    );
  }

  function renderCartItem(entry) {
    const { item, quantity, lineTotal } = entry;
    const itemId = escapeHtml(item.id);
    const itemName = escapeHtml(item.name);
    const isDeal = item.isDeal === true;
    const ariaIncrease = isDeal
      ? copy("increaseDealQty", { name: item.name })
      : copy("increaseQty", { name: item.name });
    const ariaDecrease = isDeal
      ? copy("decreaseDealQty", { name: item.name })
      : copy("decreaseQty", { name: item.name });
    const ariaRemove = isDeal
      ? copy("removeDealName", { name: item.name })
      : copy("removeItemName", { name: item.name });

    return (
      `<div class="cart-item${isDeal ? " cart-item--deal" : ""}" data-cart-item-id="${itemId}">` +
      `<div class="cart-photo-wrap" data-initial="${escapeHtml(initialFor(item.name))}">` +
      `<img class="cart-photo" src="${escapeHtml(item.image || "")}" alt="" width="58" height="58" loading="lazy" decoding="async">` +
      `</div>` +
      `<div class="cart-item-main">` +
      `<div class="cart-item-top">` +
      `<div>` +
      `<p class="cart-item-name">${quantity}x ${itemName}${isDeal ? ` <span class="cart-deal-chip">${escapeHtml(copy("dealLabel"))}</span>` : ""}</p>` +
      (isDeal
        ? `<p class="cart-item-deal">${escapeHtml(item.includedLabel)}</p>` +
          `<p class="cart-item-save">${escapeHtml(copy("saveBadge", { amount: formatMoney(item.savings * quantity) }))}</p>`
        : "") +
      `<p class="cart-item-price">${formatMoney(item.price)} ${escapeHtml(copy("each"))}</p>` +
      `</div>` +
      `<button class="cart-remove" type="button" data-cart-action="remove" data-item-id="${itemId}" aria-label="${escapeHtml(ariaRemove)}">${escapeHtml(copy("remove"))}</button>` +
      `</div>` +
      `<div class="cart-item-controls">` +
      `<div class="qty-stepper" role="group" aria-label="${itemName} ${escapeHtml(isDeal ? copy("dealQuantity") : copy("quantity"))}">` +
      `<button class="qty-btn" type="button" data-cart-action="dec" data-item-id="${itemId}" aria-label="${escapeHtml(ariaDecrease)}"${quantity <= MIN_QUANTITY ? " disabled" : ""}>${icon("minus")}</button>` +
      `<span class="qty-value">${quantity}</span>` +
      `<button class="qty-btn qty-btn--plus" type="button" data-cart-action="inc" data-item-id="${itemId}" aria-label="${escapeHtml(ariaIncrease)}"${quantity >= MAX_QUANTITY ? " disabled" : ""}>${icon("plus")}</button>` +
      `</div>` +
      `<span class="cart-line-total">${formatMoney(lineTotal)}</span>` +
      `</div>` +
      `</div>` +
      `</div>`
    );
  }

  function renderCartFooter(totals) {
    const pendingBill = state.mode === DINE_IN ? getPendingBillRequest(state.table) : null;
    const hasUnpaidOrders = state.mode === DINE_IN && getUnpaidOrdersForTable().length > 0;
    const showBillButton = Boolean(pendingBill) || hasUnpaidOrders;
    const deliveryRow =
      totals.deliveryFee > 0
        ? `<div class="total-row"><span>${escapeHtml(copy("deliveryCharges"))}</span><span class="amount">${formatMoney(totals.deliveryFee)}</span></div>`
        : "";

    return (
      `<div class="totals">` +
      `<div class="total-row"><span>${escapeHtml(copy("subtotal"))}</span><span class="amount">${formatMoney(totals.subtotal)}</span></div>` +
      deliveryRow +
      `<div class="total-row total-row--grand"><span>${escapeHtml(copy("total"))}</span><span class="amount">${formatMoney(totals.total)}</span></div>` +
      `</div>` +
      `<p class="cash-note">${icon("cash")}<span>${escapeHtml(paymentNoteForMode())}</span></p>` +
      `<button class="place-order-btn" type="button" data-place-order>${escapeHtml(copy("placeOrder"))} ${icon("arrow-right", "icon--directional")}</button>` +
      (showBillButton
        ? `<button class="request-bill-btn" type="button" data-request-bill>${icon("receipt")}` +
          `${escapeHtml(pendingBill ? copy("viewBill") : copy("requestBill"))}</button>`
        : "")
    );
  }

  function renderCartContent(focusSpec) {
    const entries = getCartEntries();
    const previousScrollTop = cartBody.scrollTop;

    if (!entries.length) {
      cartBody.innerHTML =
        `<div class="cart-empty">` +
        `<div class="empty-icon">${icon("cart")}</div>` +
        `<h3 class="empty-title">${escapeHtml(copy("yourCartEmpty"))}</h3>` +
        `<p class="empty-text">${escapeHtml(copy("yourCartEmptyText"))}</p>` +
        `<button class="empty-action" type="button" data-close-modal="cart-modal">${escapeHtml(copy("browseMenu"))}</button>` +
        `</div>`;
      cartFooter.hidden = true;
      cartFooter.innerHTML = "";
    } else {
      const totals = getCartTotals(entries);
      cartBody.innerHTML =
        checkoutDetailsHtml() + `<div class="cart-list">${entries.map(renderCartItem).join("")}</div>`;
      cartFooter.innerHTML = renderCartFooter(totals);
      cartFooter.hidden = false;
    }

    cartBody.scrollTop = previousScrollTop;

    if (focusSpec) {
      focusCartControl(focusSpec);
    }
  }

  function focusCartControl(focusSpec) {
    const itemElement = Array.from(cartBody.querySelectorAll(".cart-item")).find(
      (element) => element.dataset.cartItemId === focusSpec.itemId
    );

    let target = null;
    if (itemElement) {
      if (focusSpec.action === "inc") target = itemElement.querySelector('[data-cart-action="inc"]');
      if (focusSpec.action === "dec") target = itemElement.querySelector('[data-cart-action="dec"]');
      if (focusSpec.action === "remove") target = cartModal.querySelector(".close-btn");
    }

    if (!target) target = cartBody.querySelector('[data-cart-action="inc"]');
    if (!target) target = cartModal.querySelector(".close-btn");
    if (target) target.focus({ preventScroll: true });
  }

  function focusCheckoutField(field) {
    const input = cartBody.querySelector(`[data-checkout="${field}"]`);
    if (input) input.focus({ preventScroll: false });
  }

  function handleCheckoutInput(event) {
    const input = event.target.closest("[data-checkout]");
    if (!input) return;

    const field = input.dataset.checkout;
    if (field in state.customer) {
      state.customer[field] = input.value;
    }
  }

  function normalizeMobile(value) {
    return String(value || "").replace(/[\s-]/g, "");
  }

  function isValidMobile(value) {
    return /^03\d{9}$/.test(normalizeMobile(value));
  }

  function validateCheckout() {
    const name = state.customer.name.trim();
    const mobile = state.customer.mobile.trim();

    if (!name) {
      showToast(copy("nameRequired"));
      focusCheckoutField("name");
      return false;
    }

    if (!mobile) {
      if (state.mode !== DINE_IN) {
        showToast(copy("mobileRequired"));
        focusCheckoutField("mobile");
        return false;
      }
    } else if (!isValidMobile(mobile)) {
      showToast(copy("mobileInvalid"));
      focusCheckoutField("mobile");
      return false;
    }

    if (state.mode === DELIVERY && !state.customer.address.trim()) {
      showToast(copy("addressRequired"));
      focusCheckoutField("address");
      return false;
    }

    return true;
  }

  function updateQuantity(itemId, delta) {
    const item = menuById.get(itemId);
    if (!item) return null;

    const previous = getItemQuantity(itemId);
    if (previous === 0 && delta < 0) return null;
    const next = Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, previous + delta));
    if (next === previous) return null;

    state.cart.set(itemId, next);
    syncMenuControls(itemId);
    updateCartSummary();
    persistCart();
    return { item, previous, next };
  }

  function removeCartItem(itemId) {
    const item = menuById.get(itemId);
    if (!item || !state.cart.has(itemId)) return;
    state.cart.delete(itemId);
    syncMenuControls(itemId);
    updateCartSummary();
    persistCart();
    renderCartContent({ itemId, action: "remove" });
    announce(copy("removedFromOrder", { name: item.name }));
  }

  function announceQuantity(item, quantity) {
    if (quantity === 0) {
      announce(copy("removedFromOrder", { name: item.name }));
    } else {
      announce(copy("addedToOrder", { name: item.name, count: quantity }));
    }
  }

  function handleMenuQuantity(button) {
    const itemId = button.dataset.itemId;
    const action = button.dataset.cartAction;
    const delta = action === "dec" ? -1 : 1;
    const card = button.closest(".dish-card");
    const change = updateQuantity(itemId, delta);

    if (!change) return;

    if (card) {
      if (action === "add") {
        const plusButton = card.querySelector(".qty-btn--plus");
        if (plusButton) plusButton.focus({ preventScroll: true });
      }

      bumpValue(card.querySelector(".qty-value"));
    }

    if (delta > 0) bumpCartBar();
    announceQuantity(change.item, change.next);
  }

  function handleCartAction(button) {
    const itemId = button.dataset.itemId;
    const action = button.dataset.cartAction;

    if (action === "remove") {
      removeCartItem(itemId);
      return;
    }

    if (action !== "inc" && action !== "dec") return;

    const delta = action === "inc" ? 1 : -1;
    const change = updateQuantity(itemId, delta);
    if (!change) return;

    renderCartContent({ itemId, action });
    if (delta > 0) bumpCartBar();
    announceQuantity(change.item, change.next);
  }

  function openCart() {
    if (state.successOpen) return;
    updateCartSummary();
    renderCartContent();
    cartBody.scrollTop = 0;
    openModal("cart-modal", viewCartButton);
  }

  /* ------------------------------------------------------------------------
     Modal management
     ------------------------------------------------------------------------ */

  function setBackgroundInert(isInert) {
    [app, cartBar, skipLink, serviceRail].forEach((element) => {
      if (!element) return;
      if (isInert) {
        element.setAttribute("inert", "");
      } else {
        element.removeAttribute("inert");
      }
    });
  }

  function openModal(modalId, trigger) {
    if (state.successOpen) return;
    const overlay = document.getElementById(modalId);
    if (!overlay) return;

    if (state.activeModal && state.activeModal !== modalId) {
      closeModal(state.activeModal, { restoreFocus: false, immediate: true });
    }

    state.activeModal = modalId;
    state.modalTrigger = trigger || document.activeElement;

    overlay.hidden = false;
    void overlay.offsetWidth;
    overlay.classList.add("is-open");
    document.body.classList.add("no-scroll");
    setBackgroundInert(true);

    const closeButton = overlay.querySelector(".close-btn");
    window.setTimeout(() => {
      if (state.activeModal === modalId && closeButton) {
        closeButton.focus({ preventScroll: true });
      }
    }, 0);
  }

  function closeModal(modalId, options = {}) {
    const { restoreFocus = true, immediate = false } = options;
    const id = modalId || state.activeModal;
    if (!id) return;

    const overlay = document.getElementById(id);
    if (!overlay) return;

    overlay.classList.remove("is-open");
    if (state.activeModal === id) state.activeModal = null;

    const finishClose = () => {
      if (!overlay.classList.contains("is-open")) overlay.hidden = true;
    };

    if (immediate) {
      finishClose();
    } else {
      window.setTimeout(finishClose, MODAL_CLOSE_MS);
    }

    if (!state.activeModal && !state.successOpen) {
      document.body.classList.remove("no-scroll");
      setBackgroundInert(false);
    }

    if (restoreFocus) {
      const target = state.modalTrigger;
      state.modalTrigger = null;
      if (target && typeof target.focus === "function") {
        target.focus({ preventScroll: true });
      }
    }
  }

  function getModalSheet(modalId) {
    const overlay = document.getElementById(modalId);
    return overlay ? overlay.querySelector(".sheet") : null;
  }

  function getFocusable(container) {
    return Array.from(
      container.querySelectorAll("a[href], button, input, select, textarea, [tabindex]")
    ).filter(
      (element) =>
        !element.disabled &&
        element.tabIndex >= 0 &&
        !element.hidden &&
        element.getClientRects().length > 0
    );
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      if (state.successOpen) {
        closeSuccess();
      } else if (state.activeModal) {
        closeModal(state.activeModal);
      }
      return;
    }

    if (event.key !== "Tab") return;

    const dialog = state.successOpen
      ? successScreen
      : state.activeModal
        ? getModalSheet(state.activeModal)
        : null;

    if (!dialog) return;

    const focusable = getFocusable(dialog);
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
  }

  /* ------------------------------------------------------------------------
     Order placement and live tracking
     ------------------------------------------------------------------------ */

  function formatOrderNumber(sequence) {
    return `ORD-${String(sequence).padStart(4, "0")}`;
  }

  function readSequence() {
    try {
      const raw = window.localStorage.getItem(sequenceKey);
      const parsed = Number.parseInt(raw || "", 10);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    } catch {
      // Fall back to the configured starting number.
    }
    return startingNumber;
  }

  function appendOrder(order) {
    const existing = readOrders();
    existing.push(order);
    window.localStorage.setItem(ordersKey, JSON.stringify(existing));
  }

  function writeSequence(nextSequence) {
    try {
      window.localStorage.setItem(sequenceKey, String(nextSequence));
    } catch {
      // The order itself is already saved; a missed sequence only affects the next number.
    }
  }

  function placeOrder() {
    if (state.placingOrder) return;

    const entries = getCartEntries();
    if (!entries.length) return;

    const mode = state.mode;
    let tableNumber;

    if (mode === DINE_IN) {
      tableNumber = Number(state.table);
      if (!Number.isInteger(tableNumber) || tableNumber < 1) {
        showToast(copy("tableMissing"));
        return;
      }
    } else if (mode === DELIVERY) {
      tableNumber = "Delivery";
    } else {
      tableNumber = "Takeaway";
    }

    if (!validateCheckout()) return;

    state.placingOrder = true;
    const placeButton = cartFooter.querySelector("[data-place-order]");
    if (placeButton) {
      placeButton.disabled = true;
      placeButton.textContent = copy("placingOrder");
    }

    const totals = getCartTotals(entries);
    const now = new Date();
    const sequence = readSequence();
    const order = {
      orderNumber: formatOrderNumber(sequence),
      restaurantId,
      restaurantName: settings.restaurantName || restaurantName,
      mode,
      tableNumber,
      customerName: state.customer.name.trim(),
      customerMobile: normalizeMobile(state.customer.mobile),
      deliveryAddress: mode === DELIVERY ? state.customer.address.trim() : "",
      items: entries.map((entry) => {
        const { item, quantity, lineTotal } = entry;

        if (item.isDeal) {
          return {
            type: "deal",
            id: item.dealId,
            name: item.name,
            price: item.price,
            quantity,
            lineTotal,
            isDeal: true,
            dealId: item.dealId,
            dealName: item.name,
            originalTotal: item.originalTotal,
            savings: item.savings * quantity,
            contents: item.includedItems.map((dealItem) => ({
              id: dealItem.productId,
              name: dealItem.name,
              quantity: dealItem.quantity,
            })),
          };
        }

        return {
          type: "item",
          id: item.id,
          name: item.name,
          price: item.price,
          quantity,
          lineTotal,
        };
      }),
      subtotal: totals.subtotal,
      deliveryFee: totals.deliveryFee,
      total: totals.total,
      currency: currency.symbol || "",
      paymentMethod: "cash",
      paymentNote: storedPaymentNote(mode),
      time: now.toISOString(),
      status: initialStatus,
    };

    try {
      appendOrder(order);
      rememberMyOrder(order.orderNumber);
    } catch {
      state.placingOrder = false;
      renderCartContent();
      const retryButton = cartFooter.querySelector("[data-place-order]");
      if (retryButton) retryButton.focus({ preventScroll: true });
      showToast(copy("saveFailed"));
      return;
    }

    writeSequence(sequence + 1);
    state.placingOrder = false;
    state.cart.clear();
    persistCart();
    updateCartSummary();
    syncAllMenuControls();

    cartModal.classList.remove("is-open");
    cartModal.hidden = true;
    state.activeModal = null;
    state.modalTrigger = null;

    presentTracking(order, now);
  }

  function presentTracking(order, placedAt) {
    state.trackingOrderNumber = order.orderNumber;
    renderTracking(order, placedAt);
    openSuccessScreen();
  }

  function openTrackedOrder(orderNumber) {
    const order = getTrackedOrder(orderNumber);
    if (!order) {
      showToast(copy("noTrackedOrder"));
      updateActiveOrderStrip();
      return;
    }

    const placedAt = new Date(order.time);
    presentTracking(order, Number.isNaN(placedAt.getTime()) ? null : placedAt);
  }

  function renderTracking(order, placedAt) {
    const status = normalizeStatus(order.status);
    const mode = normalizeMode(order.mode);
    const statusText = statusLabel(status);

    successStamp.textContent = statusText;
    successStamp.setAttribute("aria-label", `Status: ${statusText}`);
    successTitle.textContent = STATUS_TITLES[status] || "Order received";
    successDesc.textContent = copy(
      mode === TAKEAWAY
        ? "orderReceivedDescTakeaway"
        : mode === DELIVERY
          ? "orderReceivedDescDelivery"
          : "orderReceivedDesc"
    );
    successDesc.hidden = status !== "Received";
    successOrderNumber.textContent = order.orderNumber;
    successTotal.textContent = formatMoney(order.total);
    successTime.textContent =
      placedAt && !Number.isNaN(placedAt.getTime()) ? timeFormatter.format(placedAt) : "—";

    successTableLabel.textContent = mode === DINE_IN ? "Table" : "Order mode";
    successTable.textContent =
      mode === DINE_IN ? String(order.tableNumber || state.table) : modeLabel(mode);

    const customerName = String(order.customerName || "").trim();
    const customerMobile = String(order.customerMobile || "").trim();
    if (successNameRow && successName) {
      successNameRow.hidden = !customerName;
      successName.textContent = customerName || "—";
    }
    if (successMobileRow && successMobile) {
      successMobileRow.hidden = !customerMobile;
      successMobile.textContent = customerMobile || "—";
    }

    successSteps.setAttribute("aria-label", "Order tracking");
    successSteps.innerHTML = buildTrackingSteps(status);
    successStatusMessage.textContent = STATUS_MESSAGES[status] || "Preparing your food";
    successCashNote.textContent = MODE_PAYMENT_LABELS[mode] || MODE_PAYMENT_LABELS[DINE_IN];

    syncFeedbackCard(order, status);
  }

  function buildTrackingSteps(status) {
    const currentIndex = STATUS_ORDER.indexOf(status);

    return TRACKING_STEPS.map((step, index) => {
      const done = status === "Paid" || currentIndex > index;
      const current = currentIndex === index;
      const classes = ["tracking-step"];

      if (done) classes.push("is-done");
      else if (current) classes.push("is-current");

      return (
        `<li class="${classes.join(" ")}"${current ? ' aria-current="step"' : ""}>` +
        `<span class="tracking-dot" aria-hidden="true">${done ? icon("check") : index + 1}</span>` +
        `<span class="tracking-label">${escapeHtml(step)}</span>` +
        `</li>`
      );
    }).join("");
  }

  function updateFeedbackStars() {
    feedbackStars.querySelectorAll("[data-star]").forEach((button) => {
      const stars = Number(button.dataset.star);
      const active = stars <= state.feedbackStars;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
      button.setAttribute("aria-label", copy("reviewStars", { stars }));
    });
  }

  function syncFeedbackCard(order, status) {
    const isFeedbackStatus = status === "Served" || status === "Paid";
    if (!isFeedbackStatus) {
      feedbackCard.hidden = true;
      return;
    }

    const orderNumber = String(order.orderNumber || "");
    if (state.feedbackOrderNumber !== orderNumber) {
      state.feedbackOrderNumber = orderNumber;
      state.feedbackStars = 0;
      feedbackForm.reset();
      feedbackError.hidden = true;
    }

    const existing = findFeedbackForOrder(orderNumber);
    feedbackCard.hidden = false;
    feedbackForm.hidden = Boolean(existing);
    feedbackThanks.hidden = !existing;

    if (!existing) updateFeedbackStars();
  }

  function handleFeedbackStarClick(event) {
    const button = event.target.closest("[data-star]");
    if (!button) return;

    const stars = Number(button.dataset.star);
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) return;

    state.feedbackStars = stars;
    feedbackError.hidden = true;
    updateFeedbackStars();
  }

  function submitFeedback(event) {
    event.preventDefault();

    const order = state.trackingOrderNumber ? getTrackedOrder(state.trackingOrderNumber) : null;
    if (!order) return;

    if (!state.feedbackStars) {
      feedbackError.textContent = copy("feedbackRatingRequired");
      feedbackError.hidden = false;
      return;
    }

    if (findFeedbackForOrder(order.orderNumber)) {
      feedbackForm.hidden = true;
      feedbackThanks.hidden = false;
      return;
    }

    const tableNumber = Number(order.tableNumber);
    const entry = {
      id: `feedback-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      orderNumber: String(order.orderNumber),
      tableNumber: Number.isInteger(tableNumber) && tableNumber > 0 ? tableNumber : null,
      restaurantId,
      mode: normalizeMode(order.mode),
      stars: state.feedbackStars,
      comment: feedbackComment.value.trim().slice(0, 300),
      time: new Date().toISOString(),
      status: "Pending",
      visible: false,
    };

    try {
      const entries = readFeedback();
      entries.push(entry);
      writeStoredJson(feedbackKey, entries);
    } catch {
      feedbackError.textContent = copy("feedbackSaveFailed");
      feedbackError.hidden = false;
      return;
    }

    state.feedbackStars = 0;
    feedbackForm.reset();
    feedbackForm.hidden = true;
    feedbackThanks.hidden = false;
    showToast(copy("feedbackSubmitted"));
    announce(copy("feedbackSubmitted"));
  }

  function refreshTrackingView() {
    if (!state.trackingOrderNumber) return;
    const order = getTrackedOrder(state.trackingOrderNumber);
    if (!order) {
      state.trackingOrderNumber = null;
      closeSuccess();
      return;
    }

    const placedAt = new Date(order.time);
    renderTracking(order, Number.isNaN(placedAt.getTime()) ? null : placedAt);
  }

  function openSuccessScreen() {
    state.successOpen = true;
    successScreen.hidden = false;
    successScreen.scrollTop = 0;
    void successScreen.offsetWidth;
    successScreen.classList.add("is-open");
    document.body.classList.add("no-scroll");
    setBackgroundInert(true);
    syncServiceState();
    updateActiveOrderStrip();

    window.setTimeout(() => {
      if (state.successOpen) {
        successTitle.focus({ preventScroll: true });
      }
    }, 60);
  }

  function closeSuccess() {
    if (!state.successOpen) return;

    state.successOpen = false;
    state.feedbackOrderNumber = null;
    state.feedbackStars = 0;
    feedbackForm.reset();
    feedbackError.hidden = true;
    successScreen.classList.remove("is-open");
    successScreen.hidden = true;
    document.body.classList.remove("no-scroll");
    setBackgroundInert(false);
    updateActiveOrderStrip();
    syncServiceState();

    const target = activeOrderStrip.hidden ? viewCartButton : activeOrderStrip;
    target.focus({ preventScroll: true });
    announce(copy("backToMenu"));
  }

  function updateActiveOrderStrip() {
    const order = state.successOpen ? null : findActiveTrackedOrder();

    if (!order) {
      activeOrderStrip.hidden = true;
      return;
    }

    activeOrderNumber.textContent = order.orderNumber;
    activeOrderStatus.textContent = statusLabel(order.status);
    activeOrderStrip.setAttribute(
      "aria-label",
      `${copy("trackOrder")} ${order.orderNumber}, ${statusLabel(order.status)}`
    );
    activeOrderStrip.hidden = false;
  }

  /* ------------------------------------------------------------------------
     Waiter calls and bill requests
     ------------------------------------------------------------------------ */

  function syncServiceState() {
    const dineIn = isDineIn();
    serviceRail.hidden = !dineIn || state.successOpen;

    if (!dineIn) return;

    const pendingCall = getPendingWaiterCall(state.table);
    const pendingBill = getPendingBillRequest(state.table);

    callWaiterButton.disabled = Boolean(pendingCall);
    callWaiterLabel.textContent = pendingCall ? copy("waiterCalled") : copy("callWaiter");
    callWaiterButton.setAttribute(
      "aria-label",
      pendingCall ? copy("waiterAlready") : copy("callWaiter")
    );

    requestBillButton.disabled = false;
    requestBillLabel.textContent = pendingBill ? copy("billRequested") : copy("requestBill");
    requestBillButton.setAttribute(
      "aria-label",
      pendingBill ? copy("billRequested") : copy("requestBill")
    );
  }

  function callWaiter() {
    if (state.mode !== DINE_IN) {
      showToast(copy("waiterNeedsTable"));
      return;
    }

    const tableNumber = Number(state.table);
    if (!Number.isInteger(tableNumber) || tableNumber < 1) {
      showToast(copy("waiterNeedsTable"));
      return;
    }

    if (getPendingWaiterCall(tableNumber)) {
      showToast(copy("waiterAlready"));
      syncServiceState();
      return;
    }

    const calls = readWaiterCalls();
    calls.push({
      id: `WAITER-${Date.now()}`,
      tableNumber,
      time: new Date().toISOString(),
      status: "Pending",
    });

    try {
      writeStoredJson(waiterCallsKey, calls);
    } catch {
      showToast(copy("saveFailed"));
      return;
    }

    syncServiceState();
    showToast(copy("waiterCallSent", { table: tableNumber }));
  }

  function mergeBillItems(orders) {
    const merged = new Map();

    orders.forEach((order) => {
      (Array.isArray(order.items) ? order.items : []).forEach((item) => {
        if (!item) return;

        const id = String(item.id || item.name || "item");
        const name = String(item.name || id);
        const price = Number(item.price) || 0;
        const quantity = Number(item.quantity) || 0;
        const type = item.type === "deal" || Array.isArray(item.contents) ? "deal" : "item";
        const contents =
          type === "deal" && Array.isArray(item.contents)
            ? item.contents.map((entry) => ({
                id: String((entry && entry.id) || ""),
                name: String((entry && entry.name) || ""),
                quantity: Math.max(0, Math.round(Number(entry && entry.quantity) || 0)),
              }))
            : [];

        if (quantity <= 0) return;

        const key = `${type}:${id}::${price}`;
        const existing = merged.get(key);

        if (existing) {
          existing.quantity += quantity;
        } else {
          merged.set(key, { type, id, name, price, quantity, contents });
        }
      });
    });

    return Array.from(merged.values()).map((item) => ({
      ...item,
      lineTotal: item.price * item.quantity,
    }));
  }

  function buildBillDraft(orders) {
    const items = mergeBillItems(orders);
    const total = orders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);

    return {
      orderNumbers: orders.map((order) => order.orderNumber),
      items,
      total,
      time: new Date().toISOString(),
    };
  }

  function billSignatureFor(mode, request, orders) {
    return [
      mode,
      request ? request.id : "",
      request ? request.status : "",
      orders ? orders.map((order) => `${order.orderNumber}:${order.status}`).join(",") : "",
    ].join("|");
  }

  function formatBillTime(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : dateTimeFormatter.format(date);
  }

  function renderBillSheet(mode, request, orders) {
    const draft = mode === "preview" ? buildBillDraft(orders || []) : null;
    const items = mode === "preview" ? draft.items : Array.isArray(request && request.items) ? request.items : [];
    const total = mode === "preview" ? draft.total : Number(request && request.total) || 0;
    const orderNumbers =
      mode === "preview" ? draft.orderNumbers : Array.isArray(request && request.orderNumbers) ? request.orderNumbers : [];
    const time = mode === "preview" ? draft.time : request && request.time;

    state.billViewMode = mode;
    state.billDraft = draft;
    state.billSignature = billSignatureFor(mode, request, orders);

    billTable.textContent = formatTableLabel();
    billSubtitle.textContent =
      mode === "pending" ? copy("billRequestNote") : mode === "paid" ? copy("paidNote") : copy("billNote");

    const rows = items
      .map(
        (item) =>
          `<tr>` +
          `<td><span class="bill-item-name">${escapeHtml(item.name)}</span></td>` +
          `<td class="num">${escapeHtml(item.quantity)}</td>` +
          `<td class="num">${formatMoney(item.price * item.quantity)}</td>` +
          `</tr>`
      )
      .join("");

    const statusBadge =
      mode === "pending"
        ? `<span class="bill-status">${escapeHtml(copy("billStatusPending"))}</span>`
        : mode === "paid"
          ? `<span class="bill-status bill-status--paid">${escapeHtml(copy("billStatusPaid"))}</span>`
          : "";

    billBody.innerHTML =
      mode === "empty"
        ? `<p class="bill-requested-note">${escapeHtml(copy("noUnpaidOrders"))}</p>`
        : `<div class="bill-venue">` +
          `<p class="bill-restaurant">${escapeHtml(restaurantName)}</p>` +
          `<p class="bill-table-line">${icon("pot")}${escapeHtml(formatTableLabel())}</p>` +
          `<p class="bill-meta-line">${escapeHtml(formatBillTime(time))}</p>` +
          `<p class="bill-order-line">${escapeHtml(copy("orderNumbers"))}: ${escapeHtml(orderNumbers.join(", "))}</p>` +
          `</div>` +
          `<table class="bill-table-grid">` +
          `<thead><tr><th>${escapeHtml(copy("orderItems"))}</th>` +
          `<th class="num">${escapeHtml(copy("quantity"))}</th>` +
          `<th class="num">${escapeHtml(copy("price"))}</th></tr></thead>` +
          `<tbody>${rows}</tbody>` +
          `</table>` +
          `<div class="bill-total-block">` +
          `<div class="bill-total-row bill-total-row--grand"><span>${escapeHtml(copy("total"))}</span>` +
          `<span class="amount">${formatMoney(total)}</span></div>` +
          `</div>` +
          `<p class="bill-note">${icon("cash")}<span>${escapeHtml(copy("billNote"))}</span></p>` +
          statusBadge;

    if (mode === "preview") {
      billFooter.innerHTML =
        `<button class="bill-confirm-btn" type="button" data-confirm-bill>` +
        `${icon("receipt")}<span>${escapeHtml(copy("requestBillAction"))}</span></button>`;
    } else if (mode === "pending") {
      billFooter.innerHTML =
        `<p class="bill-requested-note">${escapeHtml(copy("billAlreadyRequested"))}</p>` +
        `<p class="bill-requested-note">${escapeHtml(
          copy("billRequestedTime", { time: formatBillTime(request && request.time) })
        )}</p>`;
    } else if (mode === "paid") {
      billFooter.innerHTML = `<p class="bill-paid-note">${escapeHtml(copy("paidNote"))}</p>`;
    } else {
      billFooter.innerHTML = "";
    }
  }

  function openBillModal(trigger) {
    if (state.mode !== DINE_IN) {
      showToast(copy("billNeedsTable"));
      return;
    }

    const pending = getPendingBillRequest(state.table);
    const unpaid = getUnpaidOrdersForTable();
    const paid = getLatestPaidBillRequest(state.table);

    if (pending) {
      renderBillSheet("pending", pending, null);
    } else if (unpaid.length) {
      renderBillSheet("preview", null, unpaid);
    } else if (paid) {
      renderBillSheet("paid", paid, null);
    } else {
      showToast(copy("billNeedsOrders"));
      return;
    }

    openModal("bill-modal", trigger || requestBillButton);
  }

  function confirmBillRequest() {
    if (state.mode !== DINE_IN) return;

    const draft = state.billDraft;
    if (!draft || !draft.items.length) return;

    if (getPendingBillRequest(state.table)) {
      refreshBillModalIfOpen();
      return;
    }

    const request = {
      id: `BILL-${Date.now()}`,
      tableNumber: Number(state.table),
      orderNumbers: draft.orderNumbers,
      items: draft.items,
      total: draft.total,
      time: new Date().toISOString(),
      status: "Pending",
    };

    const requests = readBillRequests();
    requests.push(request);

    try {
      writeStoredJson(billRequestsKey, requests);
    } catch {
      showToast(copy("saveFailed"));
      return;
    }

    state.billDraft = null;
    closeModal("bill-modal", { restoreFocus: false });
    syncServiceState();
    updateCartSummary();
    updateActiveOrderStrip();

    requestBillButton.focus({ preventScroll: true });
    showToast(copy("billRequestSent", { table: state.table }));
  }

  function resolveBillView() {
    const pending = getPendingBillRequest(state.table);
    const unpaid = getUnpaidOrdersForTable();
    const paid = getLatestPaidBillRequest(state.table);

    if (pending) return { mode: "pending", request: pending, orders: null };
    if (unpaid.length) return { mode: "preview", request: null, orders: unpaid };
    if (paid) return { mode: "paid", request: paid, orders: null };
    return { mode: "empty", request: null, orders: null };
  }

  function refreshBillModalIfOpen() {
    if (state.activeModal !== "bill-modal") return;

    const view = resolveBillView();
    if (billSignatureFor(view.mode, view.request, view.orders) === state.billSignature) return;

    renderBillSheet(view.mode, view.request, view.orders);
  }

  /* ------------------------------------------------------------------------
     Live refresh
     ------------------------------------------------------------------------ */

  function refreshLiveState() {
    refreshDealAvailability();
    syncServiceState();
    updateActiveOrderStrip();

    if (state.successOpen) {
      refreshTrackingView();
    }

    refreshBillModalIfOpen();
  }

  function refreshDealAvailability() {
    const signature = liveDealSignature();
    if (signature === dealSignature) return;
    dealSignature = signature;
    rebuildMenuWithDeals();
    renderMenu();
    updateCartSummary();
    if (state.activeModal === "cart-modal") renderCartContent();
  }

  /* ------------------------------------------------------------------------
     Search and category controls
     ------------------------------------------------------------------------ */

  function handleSearchInput() {
    const rawValue = searchInput.value;
    const trimmed = rawValue.trim();
    const wasEmpty = state.query === "";

    clearSearchButton.hidden = rawValue.length === 0;
    state.query = trimmed;

    if (trimmed && wasEmpty && state.categoryId !== ALL_CATEGORY.id) {
      state.categoryId = ALL_CATEGORY.id;
      updateCategoryRail();
      categoryRail.scrollLeft = 0;
    }

    renderMenu();
  }

  function clearSearch() {
    searchInput.value = "";
    state.query = "";
    clearSearchButton.hidden = true;
    renderMenu();
    searchInput.focus({ preventScroll: true });
  }

  function resetFilters() {
    searchInput.value = "";
    state.query = "";
    state.categoryId = ALL_CATEGORY.id;
    clearSearchButton.hidden = true;
    updateCategoryRail();
    categoryRail.scrollLeft = 0;
    renderMenu();
    searchInput.focus({ preventScroll: true });
  }

  function handleCategoryClick(event) {
    const pill = event.target.closest("[data-category-id]");
    if (!pill) return;

    const categoryId = pill.dataset.categoryId;
    if (categoryId === state.categoryId) return;
    if (categoryId !== ALL_CATEGORY.id && !categoryById.has(categoryId)) return;

    state.categoryId = categoryId;
    updateCategoryRail();
    renderMenu();
  }

  /* ------------------------------------------------------------------------
     Order mode and cross-tab refresh
     ------------------------------------------------------------------------ */

  function setMode(mode) {
    if (!ORDER_MODES.includes(mode) || mode === state.mode) return;

    if (mode === DINE_IN && !hasTable()) {
      showToast(copy("modeDineUnavailable"));
      return;
    }

    if (state.activeModal === "bill-modal") {
      closeModal("bill-modal", { restoreFocus: false });
    }

    state.mode = mode;
    applyChrome();
    updateCartSummary();
    syncServiceState();
    updateActiveOrderStrip();

    if (state.activeModal === "cart-modal") {
      renderCartContent();
    }
  }

  function refreshFromStorage(event) {
    if (event && event.key !== null && [ordersKey, waiterCallsKey, billRequestsKey].includes(event.key)) {
      refreshLiveState();
      return;
    }

    const relevantKeys = [
      menuStorageKey,
      settingsStorageKey,
      offersStorageKey,
      legacyDealsStorageKey,
      cartStorageKey,
      feedbackKey,
    ];
    if (event && event.key !== null && !relevantKeys.includes(event.key)) {
      return;
    }

    loadSettings();
    loadMenu();
    loadOffers();
    rebuildMenuWithDeals();
    loadCart();
    dealSignature = liveDealSignature();

    if (state.categoryId !== ALL_CATEGORY.id && !categoryById.has(state.categoryId)) {
      state.categoryId = ALL_CATEGORY.id;
      categoryRail.scrollLeft = 0;
    }

    applyChrome();
    renderCategoryRail();
    renderOffers();
    renderReviews();
    renderMenu();
    updateCartSummary();

    if (state.activeModal === "cart-modal") {
      renderCartContent();
    }

    refreshLiveState();
  }

  /* ------------------------------------------------------------------------
     Event wiring and start-up
     ------------------------------------------------------------------------ */

  function bindEvents() {
    modeOptions.addEventListener("click", (event) => {
      const button = event.target.closest("[data-mode]");
      if (button) setMode(button.dataset.mode);
    });

    searchInput.addEventListener("input", handleSearchInput);
    clearSearchButton.addEventListener("click", clearSearch);
    categoryRail.addEventListener("click", handleCategoryClick);

    menuContent.addEventListener("click", (event) => {
      const resetButton = event.target.closest("[data-empty-action]");
      if (resetButton && menuContent.contains(resetButton)) {
        resetFilters();
        return;
      }

      const quantityButton = event.target.closest("[data-cart-action]");
      if (quantityButton && menuContent.contains(quantityButton)) {
        handleMenuQuantity(quantityButton);
      }
    });

    viewCartButton.addEventListener("click", openCart);
    activeOrderStrip.addEventListener("click", () => {
      const active = findActiveTrackedOrder();
      if (!active) {
        updateActiveOrderStrip();
        showToast(copy("noTrackedOrder"));
        return;
      }
      openTrackedOrder(active.orderNumber);
    });

    serviceRail.addEventListener("click", (event) => {
      const button = event.target.closest("[data-service-action]");
      if (!button || button.disabled) return;

      if (button.dataset.serviceAction === "waiter") {
        callWaiter();
      } else {
        openBillModal(button);
      }
    });

    cartModal.addEventListener("click", (event) => {
      const actionButton = event.target.closest("[data-cart-action]");
      if (actionButton) {
        handleCartAction(actionButton);
        return;
      }

      const placeButton = event.target.closest("[data-place-order]");
      if (placeButton) {
        placeOrder();
        return;
      }

      const billButton = event.target.closest("[data-request-bill]");
      if (billButton) {
        openBillModal(viewCartButton);
      }
    });

    cartBody.addEventListener("input", handleCheckoutInput);

    billModal.addEventListener("click", (event) => {
      const confirmButton = event.target.closest("[data-confirm-bill]");
      if (confirmButton) confirmBillRequest();
    });

    document.addEventListener("click", (event) => {
      const closer = event.target.closest("[data-close-modal]");
      if (!closer) return;
      closeModal(closer.dataset.closeModal || state.activeModal);
    });

    successBack.addEventListener("click", closeSuccess);

    feedbackStars.addEventListener("click", handleFeedbackStarClick);
    feedbackForm.addEventListener("submit", submitFeedback);
    feedbackComment.addEventListener("input", () => {
      feedbackError.hidden = true;
    });

    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("storage", refreshFromStorage);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) refreshLiveState();
    });

    brandLogo.addEventListener("error", () => {
      brandLogo.removeAttribute("src");
      brandMark.hidden = true;
    });

    document.addEventListener(
      "error",
      (event) => {
        const target = event.target;
        if (!(target instanceof HTMLImageElement)) return;

        const photoWrap = target.closest(".dish-photo-wrap, .cart-photo-wrap");
        if (!photoWrap) return;

        photoWrap.classList.add("is-photo-missing");
        target.hidden = true;
      },
      true
    );
  }

  applyTheme();
  if (window.Tenant && typeof Tenant.ensureSampleMenuItems === "function") {
    Tenant.ensureSampleMenuItems();
  }
  loadSettings();
  loadMenu();
  loadOffers();
  rebuildMenuWithDeals();
  loadCart();
  dealSignature = liveDealSignature();
  applyChrome();
  renderCategoryRail();
  bindEvents();
  renderOffers();
  renderReviews();
  updateCartSummary();
  syncAllMenuControls();
  renderMenu();
  syncServiceState();
  updateActiveOrderStrip();

  window.setInterval(refreshLiveState, 10000);
})();
