/* ==========================================================================
   SINGLE-RESTAURANT DATA LAYER

   One copy of this project serves exactly one restaurant. Default identity,
   logins and plan/fee values come from /config.js. A Super Admin can save
   overrides for those values in localStorage; the overrides are applied on
   top of config.js on every page load and survive a refresh.

   Operational data (menu edits, orders, tables, offers, feedback) lives in
   localStorage on this device only.
   ========================================================================== */

(() => {
  "use strict";

  const config =
    typeof RESTAURANT_CONFIG !== "undefined"
      ? RESTAURANT_CONFIG
      : typeof CONFIG !== "undefined"
        ? CONFIG
        : {};

  const restaurantConfig = config.restaurant || {};
  const adminConfig = config.admin || {};
  const superAdminConfig = config.superAdmin || {};
  const planConfig = config.plan || {};
  const storageConfig = config.storage || {};
  const ordersConfig = config.orders || {};
  const copyStrings = typeof COPY !== "undefined" && COPY && typeof COPY === "object" ? COPY : null;

  const RESTAURANT_ID = "restaurant";
  const PLAN_NAMES = ["Basic", "Standard", "Premium"];
  const CONTROL_KEY = storageConfig.controlKey || "qrMenu.v2.control";
  const SUPER_SESSION_KEY = superAdminConfig.sessionKey || "qrMenu.v2.superAdminSession";

  const baseKeys = Object.freeze({
    menu: storageConfig.menuKey || "qrMenu.v2.menu",
    settings: storageConfig.settingsKey || "qrMenu.v2.settings",
    tables: storageConfig.tablesKey || "qrMenu.v2.tables",
    offers: storageConfig.offersKey || "qrMenu.v2.offers",
    deals: storageConfig.dealsKey || "qrMenu.v2.deals",
    cart: storageConfig.cartKey || "qrMenu.v2.cart",
    staff: storageConfig.staffKey || "qrMenu.v2.staff",
    orders: ordersConfig.storageKey || "qrMenu.v2.orders",
    sequence: ordersConfig.sequenceKey || "qrMenu.v2.orderSequence",
    waiterCalls: storageConfig.waiterCallsKey || "qrMenu.v2.waiterCalls",
    billRequests: storageConfig.billRequestsKey || "qrMenu.v2.billRequests",
    myOrders: storageConfig.myOrdersKey || "qrMenu.v2.myOrders",
    feedback: storageConfig.feedbackKey || "qrMenu.v2.feedback",
  });

  function readJson(key) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function writeJson(key, value) {
    window.localStorage.setItem(key, JSON.stringify(value));
    return value;
  }

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function readControl() {
    const stored = readJson(CONTROL_KEY);
    return isPlainObject(stored) ? stored : {};
  }

  function applyControlOverrides() {
    const control = readControl();
    const restaurant = isPlainObject(control.restaurant) ? control.restaurant : null;
    if (restaurant) {
      if (typeof restaurant.name === "string" && restaurant.name.trim()) {
        restaurantConfig.name = restaurant.name.trim();
      }
      ["ownerName", "phone", "whatsappNumber", "city", "address", "openingTiming", "paymentNote"].forEach(
        (field) => {
          if (typeof restaurant[field] === "string") {
            restaurantConfig[field] = restaurant[field].trim();
          }
        }
      );
      if (typeof restaurant.logo === "string") {
        restaurantConfig.logo = restaurant.logo.trim();
      }
      if (restaurant.tableCount != null && Number.isFinite(Number(restaurant.tableCount))) {
        restaurantConfig.tableCount = Math.max(1, Math.min(999, Math.round(Number(restaurant.tableCount))));
      }
      if (typeof restaurant.paymentNote === "string" && restaurant.paymentNote.trim()) {
        config.payment = config.payment || {};
        config.payment.note = restaurant.paymentNote.trim();
      }
    }

    const admin = isPlainObject(control.admin) ? control.admin : null;
    if (admin) {
      adminConfig.credentials = adminConfig.credentials || {};
      if (typeof admin.username === "string" && admin.username.trim()) {
        adminConfig.credentials.username = admin.username.trim();
      }
      if (typeof admin.password === "string" && admin.password.length >= 8) {
        adminConfig.credentials.password = admin.password;
      }
    }

    const plan = isPlainObject(control.plan) ? control.plan : null;
    if (plan) {
      if (PLAN_NAMES.includes(String(plan.name || "").trim())) {
        planConfig.name = String(plan.name).trim();
      }
      if (isDateKey(plan.startDate)) planConfig.startDate = String(plan.startDate);
      if (isDateKey(plan.expiryDate)) planConfig.expiryDate = String(plan.expiryDate);
      if (plan.feeStatus === "Paid" || plan.feeStatus === "Unpaid") {
        planConfig.feeStatus = plan.feeStatus;
      }
    }

    const theme = isPlainObject(control.theme) ? control.theme : null;
    const themeColors = theme && isPlainObject(theme.colors) ? theme.colors : null;
    if (themeColors) {
      config.theme = config.theme || {};
      config.theme.colors = config.theme.colors || {};
      Object.entries(themeColors).forEach(([key, value]) => {
        if (/^#[0-9a-f]{3,8}$/i.test(String(value || "").trim())) {
          config.theme.colors[key] = String(value).trim();
        }
      });
    }

    const copy = isPlainObject(control.copy) ? control.copy : null;
    if (copyStrings && copy) {
      Object.entries(copy).forEach(([key, value]) => {
        if (typeof copyStrings[key] === "string" && typeof value === "string") {
          copyStrings[key] = value;
        }
      });
    }

    return control;
  }

  function saveControl(patch) {
    const current = readControl();
    const next = { ...current };
    const source = isPlainObject(patch) ? patch : {};

    ["restaurant", "admin", "plan", "copy"].forEach((section) => {
      if (isPlainObject(source[section])) {
        next[section] = { ...(isPlainObject(current[section]) ? current[section] : {}), ...source[section] };
      }
    });

    if (isPlainObject(source.theme)) {
      next.theme = { ...(isPlainObject(current.theme) ? current.theme : {}) };
      if (isPlainObject(source.theme.colors)) {
        next.theme.colors = {
          ...(isPlainObject(current.theme && current.theme.colors) ? current.theme.colors : {}),
          ...source.theme.colors,
        };
      }
    }

    if (typeof source.disabled === "boolean") next.disabled = source.disabled;

    writeJson(CONTROL_KEY, next);
    applyControlOverrides();
    return next;
  }

  function clearControl() {
    window.localStorage.removeItem(CONTROL_KEY);
  }

  function getSuperAdmin() {
    return {
      username: String(superAdminConfig.username || "").trim(),
      password: String(superAdminConfig.password || ""),
      sessionKey: SUPER_SESSION_KEY,
      enabled:
        Boolean(String(superAdminConfig.username || "").trim()) &&
        String(superAdminConfig.password || "").length >= 8,
    };
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function dateKey(date = new Date()) {
    const safeDate = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(safeDate.getTime())) return "";
    return `${safeDate.getFullYear()}-${pad(safeDate.getMonth() + 1)}-${pad(safeDate.getDate())}`;
  }

  function isDateKey(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || "").trim());
    if (!match) return false;
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const date = new Date(year, month, day);
    return (
      !Number.isNaN(date.getTime()) &&
      date.getFullYear() === year &&
      date.getMonth() === month &&
      date.getDate() === day
    );
  }

  function addDaysKey(value, days) {
    const key = isDateKey(value) ? String(value) : dateKey(value);
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
    if (!match) return "";
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    date.setDate(date.getDate() + (Number(days) || 0));
    return dateKey(date);
  }

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function planName() {
    const name = String(planConfig.name || "").trim();
    return PLAN_NAMES.includes(name) ? name : "Standard";
  }

  function planAmount() {
    const prices = config.planPrices || {};
    const amount = Number(prices[planName()]);
    return Number.isFinite(amount) && amount > 0 ? amount : 0;
  }

  function planStatus() {
    const control = readControl();
    const disabled = control.disabled === true;
    const feeStatus = planConfig.feeStatus === "Paid" ? "Paid" : "Unpaid";
    const expiryDate = isDateKey(planConfig.expiryDate) ? String(planConfig.expiryDate) : "";
    const expired = Boolean(expiryDate) && dateKey() > expiryDate && feeStatus !== "Paid";

    return {
      name: planName(),
      amount: planAmount(),
      startDate: isDateKey(planConfig.startDate) ? String(planConfig.startDate) : "",
      expiryDate,
      feeStatus,
      expired,
      disabled,
      blocked: expired || disabled,
      status: disabled ? "Disabled" : expired ? "Expired" : "Active",
    };
  }

  function getRestaurant() {
    const plan = planStatus();
    const credentials = adminConfig.credentials || {};

    return {
      id: RESTAURANT_ID,
      name: String(restaurantConfig.name || "Restaurant").trim() || "Restaurant",
      ownerName: String(restaurantConfig.ownerName || "").trim(),
      phone: String(restaurantConfig.phone || "").trim(),
      whatsapp: String(restaurantConfig.whatsappNumber || "").trim(),
      city: String(restaurantConfig.city || "").trim(),
      address: String(restaurantConfig.address || "").trim(),
      logo: String(restaurantConfig.logo || "").trim(),
      tableCount: Math.max(1, Math.min(999, Math.round(Number(restaurantConfig.tableCount) || 12))),
      status: plan.status,
      planId: plan.name.toLowerCase(),
      planName: plan.name,
      planAmount: plan.amount,
      startDate: plan.startDate,
      dueDate: plan.expiryDate,
      paymentStatus: plan.feeStatus,
      planExpired: plan.expired,
      disabled: plan.disabled,
      blocked: plan.blocked,
      adminUsername: String(credentials.username || "").trim(),
      adminPassword: String(credentials.password || ""),
    };
  }

  function getRestaurantById(id) {
    if (!id || String(id).trim() === RESTAURANT_ID) return getRestaurant();
    return null;
  }

  function storageKeys() {
    return { ...baseKeys };
  }

  function readRestaurantSettings() {
    const stored = readJson(baseKeys.settings);
    return stored && typeof stored === "object" && !Array.isArray(stored) ? stored : null;
  }

  function saveRestaurantSettings(patch) {
    const current = readRestaurantSettings() || {};
    const next = { ...current, ...(patch && typeof patch === "object" ? patch : {}) };
    writeJson(baseKeys.settings, next);
    return next;
  }

  function readRestaurantStaff() {
    const stored = readJson(baseKeys.staff);
    return Array.isArray(stored) ? stored.filter((member) => member && typeof member === "object") : [];
  }

  function ensureSampleMenuItems() {
    const seedKey = `${baseKeys.menu}.samplesSeeded`;
    try {
      if (window.localStorage.getItem(seedKey) === "1") return false;

      const stored = readJson(baseKeys.menu);
      const sampleItems = Array.isArray(config.menu)
        ? config.menu.filter((item) => item && item.sample === true)
        : [];

      if (!Array.isArray(stored) || !sampleItems.length) {
        window.localStorage.setItem(seedKey, "1");
        return false;
      }

      const existingIds = new Set(stored.map((item) => String((item && item.id) || "")));
      const activeCategories = new Set(
        stored
          .filter((item) => item && item.active !== false)
          .map((item) => String(item.category || ""))
      );
      const missing = sampleItems.filter(
        (item) => !existingIds.has(String(item.id)) && !activeCategories.has(String(item.category))
      );
      if (missing.length) {
        writeJson(baseKeys.menu, [...stored, ...missing.map((item) => ({ ...item }))]);
      }

      window.localStorage.setItem(seedKey, "1");
      return missing.length > 0;
    } catch {
      return false;
    }
  }

  function configIssues() {
    const issues = [];
    const credentials = adminConfig.credentials || {};

    if (!String(credentials.username || "").trim()) {
      issues.push("Set admin.credentials.username in config.js.");
    }
    if (String(credentials.password || "").length < 8) {
      issues.push("Admin password in config.js must be at least 8 characters.");
    }
    if (!String(superAdminConfig.username || "").trim()) {
      issues.push("Set superAdmin.username in config.js.");
    }
    if (String(superAdminConfig.password || "").length < 8) {
      issues.push("Super Admin password in config.js must be at least 8 characters.");
    }
    if (!isDateKey(planConfig.expiryDate)) {
      issues.push("Set a valid plan.expiryDate (YYYY-MM-DD) in config.js.");
    }
    if (!PLAN_NAMES.includes(String(planConfig.name || "").trim())) {
      issues.push("plan.name must be Basic, Standard or Premium.");
    }

    return issues;
  }

  applyControlOverrides();

  window.Tenant = {
    RESTAURANT_ID,
    DEFAULT_RESTAURANT_ID: RESTAURANT_ID,
    baseKeys,
    readJson,
    writeJson,
    dateKey,
    isDateKey,
    addDaysKey,
    slugify,
    planStatus,
    getRestaurant,
    getRestaurants: () => [getRestaurant()],
    getRestaurantById,
    storageKeys,
    readRestaurantSettings,
    saveRestaurantSettings,
    readRestaurantStaff,
    ensureSampleMenuItems,
    configIssues,
    CONTROL_KEY,
    SUPER_SESSION_KEY,
    readControl,
    saveControl,
    clearControl,
    applyControlOverrides,
    getSuperAdmin,
  };
})();
