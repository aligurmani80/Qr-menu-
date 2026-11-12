/* ==========================================================================
   SHARED RESTAURANT TENANCY — PHASE 4

   The local "database" is browser localStorage. Super Admin owns the
   restaurant registry; every restaurant's menu, orders, tables, offers,
   staff and service requests live under that restaurant's unique ID.

   This file is loaded by the customer menu, the restaurant admin and the
   Super Admin console so all three read the same registry and storage keys.
   ========================================================================== */

(() => {
  "use strict";

  const config = typeof CONFIG !== "undefined" && CONFIG ? CONFIG : {};
  const storageConfig = config.storage || {};
  const ordersConfig = config.orders || {};
  const adminConfig = config.admin || {};
  const restaurantConfig = config.restaurant || {};
  const settingsConfig = config.settings || {};

  const REGISTRY_KEY = "karahiHouse.restaurants.v1";
  const MIGRATION_KEY = "karahiHouse.tenancy.migrated.v1";
  const DEFAULT_RESTAURANT_ID = "karahi-house";
  const BILLING_CYCLE_DAYS = 30;

  const baseKeys = Object.freeze({
    menu: storageConfig.menuKey || "karahiHouse.menu.v1",
    settings: storageConfig.settingsKey || "karahiHouse.settings.v1",
    tables: storageConfig.tablesKey || "karahiHouse.tables.v1",
    offers: storageConfig.offersKey || "karahiHouse.offers.v1",
    deals: storageConfig.dealsKey || "karahiHouse.deals.v1",
    cart: storageConfig.cartKey || "karahiHouse.cart.v1",
    staff: storageConfig.staffKey || "karahiHouse.staff.v1",
    orders: ordersConfig.storageKey || "karahiHouse.orders.v1",
    sequence: ordersConfig.sequenceKey || "karahiHouse.orderSequence.v1",
    waiterCalls: storageConfig.waiterCallsKey || "karahiHouse.waiterCalls.v1",
    billRequests: storageConfig.billRequestsKey || "karahiHouse.billRequests.v1",
    myOrders: storageConfig.myOrdersKey || "karahiHouse.myOrders.v1",
    feedback: storageConfig.feedbackKey || "karahiHouse.feedback.v1",
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

  function normalizeRestaurant(raw) {
    if (!raw || typeof raw !== "object") return null;

    const id = String(raw.id || "").trim();
    const name = String(raw.name || "").trim();
    if (!id || !name) return null;

    const status = ["Active", "Expired", "Disabled"].includes(raw.status) ? raw.status : "Active";

    return {
      id,
      name,
      ownerName: String(raw.ownerName || "").trim(),
      city: String(raw.city || "").trim(),
      whatsapp: String(raw.whatsapp || "").trim(),
      logo: typeof raw.logo === "string" ? raw.logo : "",
      planId: String(raw.planId || "").trim(),
      status,
      startDate: isDateKey(raw.startDate) ? String(raw.startDate) : "",
      dueDate: isDateKey(raw.dueDate) ? String(raw.dueDate) : "",
      paymentStatus: raw.paymentStatus === "Paid" ? "Paid" : "Unpaid",
      lastPaymentDate: isDateKey(raw.lastPaymentDate) ? String(raw.lastPaymentDate) : "",
      adminUsername: String(raw.adminUsername || "").trim(),
      adminPassword: String(raw.adminPassword || ""),
      createdAt: String(raw.createdAt || ""),
      updatedAt: String(raw.updatedAt || ""),
      isDefault: Boolean(raw.isDefault),
    };
  }

  function makeDefaultRestaurant() {
    const now = new Date();
    const today = dateKey(now);
    const credentials = adminConfig.credentials || {};

    return normalizeRestaurant({
      id: DEFAULT_RESTAURANT_ID,
      name: String(restaurantConfig.name || "Restaurant").trim() || "Restaurant",
      ownerName: "Restaurant Owner",
      city: "",
      whatsapp: String(restaurantConfig.whatsappNumber || "[RESTAURANT_WHATSAPP_NUMBER]"),
      logo: String(settingsConfig.logo || ""),
      planId: "premium",
      status: "Active",
      startDate: today,
      dueDate: addDaysKey(today, BILLING_CYCLE_DAYS),
      paymentStatus: "Unpaid",
      lastPaymentDate: "",
      adminUsername: String(credentials.username || "[ADMIN_USERNAME]"),
      adminPassword: String(credentials.password || "[ADMIN_PASSWORD]"),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      isDefault: true,
    });
  }

  function scopedKey(baseKey, restaurantId = DEFAULT_RESTAURANT_ID) {
    const id = String(restaurantId || "").trim() || DEFAULT_RESTAURANT_ID;
    const raw = String(baseKey || "");
    const prefix = "karahiHouse.";
    const suffix = raw.startsWith(prefix) ? raw.slice(prefix.length) : raw;
    return `${prefix}${id}.${suffix}`;
  }

  function storageKeys(restaurantId = DEFAULT_RESTAURANT_ID) {
    const scoped = {};
    Object.keys(baseKeys).forEach((name) => {
      scoped[name] = scopedKey(baseKeys[name], restaurantId);
    });
    return scoped;
  }

  function writeRegistry(restaurants) {
    try {
      window.localStorage.setItem(REGISTRY_KEY, JSON.stringify(restaurants));
    } catch {
      throw new Error("Restaurant data couldn't be saved. Device storage may be full.");
    }
    return restaurants;
  }

  function migrateLegacyData(restaurant) {
    if (!restaurant) return;

    try {
      if (window.localStorage.getItem(MIGRATION_KEY) === "1") return;

      Object.values(baseKeys).forEach((baseKey) => {
        const target = scopedKey(baseKey, restaurant.id);
        const legacy = window.localStorage.getItem(baseKey);
        if (legacy != null && window.localStorage.getItem(target) == null) {
          window.localStorage.setItem(target, legacy);
        }
      });

      window.localStorage.setItem(MIGRATION_KEY, "1");
    } catch {
      // Migration is best-effort; the app still works with config defaults.
    }
  }

  function sweepExpired(restaurants) {
    const today = dateKey();
    let changed = false;

    const next = restaurants.map((restaurant) => {
      if (!restaurant.dueDate || !isDateKey(restaurant.dueDate) || restaurant.dueDate >= today) {
        return restaurant;
      }

      if (restaurant.status === "Disabled") {
        if (restaurant.paymentStatus !== "Unpaid") {
          changed = true;
          return {
            ...restaurant,
            paymentStatus: "Unpaid",
            updatedAt: new Date().toISOString(),
          };
        }
        return restaurant;
      }

      if (restaurant.status !== "Expired" || restaurant.paymentStatus !== "Unpaid") {
        changed = true;
        return {
          ...restaurant,
          status: "Expired",
          paymentStatus: "Unpaid",
          updatedAt: new Date().toISOString(),
        };
      }

      return restaurant;
    });

    if (changed) writeRegistry(next);
    return next;
  }

  function ensureRegistry() {
    let raw = null;
    try {
      raw = window.localStorage.getItem(REGISTRY_KEY);
    } catch {
      return [];
    }

    if (raw === null) {
      const defaultRestaurant = makeDefaultRestaurant();
      const seeded = defaultRestaurant ? [defaultRestaurant] : [];
      try {
        writeRegistry(seeded);
      } catch {
        // Continue with the in-memory record so the menu can still open.
      }
      migrateLegacyData(defaultRestaurant);
      return sweepExpired(seeded);
    }

    const parsed = (() => {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    })();

    if (!Array.isArray(parsed)) {
      const defaultRestaurant = makeDefaultRestaurant();
      const seeded = defaultRestaurant ? [defaultRestaurant] : [];
      try {
        writeRegistry(seeded);
      } catch {
        // Continue with the in-memory record.
      }
      migrateLegacyData(defaultRestaurant);
      return sweepExpired(seeded);
    }

    const normalized = parsed.map(normalizeRestaurant).filter(Boolean);
    if (normalized.length !== parsed.length) {
      try {
        writeRegistry(normalized);
      } catch {
        // Continue with the normalized list in memory.
      }
    }

    return sweepExpired(normalized);
  }

  function getRestaurants() {
    return ensureRegistry();
  }

  function getRestaurant(id) {
    const wanted = String(id || "").trim();
    if (!wanted) return null;
    return getRestaurants().find((restaurant) => restaurant.id === wanted) || null;
  }

  function saveRestaurants(restaurants) {
    const normalized = (Array.isArray(restaurants) ? restaurants : [])
      .map(normalizeRestaurant)
      .filter(Boolean);
    return writeRegistry(normalized);
  }

  function updateRestaurant(id, patch) {
    const wanted = String(id || "").trim();
    if (!wanted) return null;

    const restaurants = getRestaurants();
    const index = restaurants.findIndex((restaurant) => restaurant.id === wanted);
    if (index < 0) return null;

    const next = normalizeRestaurant({
      ...restaurants[index],
      ...(patch && typeof patch === "object" ? patch : {}),
      id: restaurants[index].id,
      updatedAt: new Date().toISOString(),
    });
    if (!next) return null;

    const copy = restaurants.slice();
    copy[index] = next;
    writeRegistry(copy);
    return next;
  }

  function removeRestaurant(id) {
    const wanted = String(id || "").trim();
    const restaurants = getRestaurants().filter((restaurant) => restaurant.id !== wanted);
    writeRegistry(restaurants);
    return restaurants;
  }

  function makeRestaurantId(name) {
    const base = slugify(name) || "restaurant";
    const ids = new Set(getRestaurants().map((restaurant) => restaurant.id));
    if (!ids.has(base)) return base;

    let counter = 2;
    let candidate = `${base}-${counter}`;
    while (ids.has(candidate)) {
      counter += 1;
      candidate = `${base}-${counter}`;
    }
    return candidate;
  }

  function readRestaurantSettings(restaurantId) {
    const stored = readJson(storageKeys(restaurantId).settings);
    return stored && typeof stored === "object" && !Array.isArray(stored) ? stored : null;
  }

  function saveRestaurantSettings(restaurantId, patch) {
    const current = readRestaurantSettings(restaurantId) || {};
    const next = { ...current, ...(patch && typeof patch === "object" ? patch : {}) };
    writeJson(storageKeys(restaurantId).settings, next);
    return next;
  }

  function readRestaurantStaff(restaurantId) {
    const stored = readJson(storageKeys(restaurantId).staff);
    return Array.isArray(stored) ? stored.filter((member) => member && typeof member === "object") : [];
  }

  function ensureSampleMenuItems(restaurantId) {
    const keys = storageKeys(restaurantId);
    const seedKey = scopedKey("karahiHouse.menuSamplesSeeded.v1", restaurantId);

    try {
      if (window.localStorage.getItem(seedKey) === "1") return false;

      const stored = readJson(keys.menu);
      const sampleItems = Array.isArray(config.menu)
        ? config.menu.filter((item) => item && item.sample === true)
        : [];

      if (!Array.isArray(stored) || !sampleItems.length) {
        window.localStorage.setItem(seedKey, "1");
        return false;
      }

      const existingIds = new Set(stored.map((item) => String((item && item.id) || "")));
      const missing = sampleItems.filter((item) => !existingIds.has(String(item.id)));
      if (missing.length) writeJson(keys.menu, [...stored, ...missing.map((item) => ({ ...item }))]);

      window.localStorage.setItem(seedKey, "1");
      return missing.length > 0;
    } catch {
      return false;
    }
  }

  window.Tenant = {
    DEFAULT_RESTAURANT_ID,
    REGISTRY_KEY,
    BILLING_CYCLE_DAYS,
    baseKeys,
    readJson,
    writeJson,
    dateKey,
    isDateKey,
    addDaysKey,
    slugify,
    getRestaurants,
    getRestaurant,
    saveRestaurants,
    updateRestaurant,
    removeRestaurant,
    makeRestaurantId,
    scopedKey,
    storageKeys,
    sweepExpired,
    readRestaurantSettings,
    saveRestaurantSettings,
    readRestaurantStaff,
    ensureSampleMenuItems,
  };
})();
