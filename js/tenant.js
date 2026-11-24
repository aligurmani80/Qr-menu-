/* ==========================================================================
   SINGLE-RESTAURANT DATA LAYER + SUPER ADMIN REGISTRY

   One copy of this project serves the installed restaurant. Default identity,
   logins and plan/fee values come from /config.js. A Super Admin can save
   overrides for those values in localStorage; the overrides are applied on
   top of config.js on every page load and survive a refresh.

   Restaurants added from the Super Admin panel are registry records with their
   own admin login, plan and storage-key namespace. They start with an empty
   menu: no sample categories or products are copied into them.

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
  const RESTAURANTS_KEY = storageConfig.restaurantsKey || "qrMenu.v2.restaurants";
  const SUPER_CREDENTIALS_KEY =
    storageConfig.superCredentialsKey || "qrMenu.v2.superAdminCredentials";
  const TENANT_PARAM = storageConfig.restaurantParam || "r";

  const baseKeys = Object.freeze({
    categories: storageConfig.categoriesKey || "qrMenu.v2.categories",
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

  /* ------------------------------------------------------------------------
     Restaurant registry

     config.js and the control overrides describe the copy installed on this
     domain (id "restaurant"). Restaurants added by a Super Admin are kept as
     records here and get their own storage keys, so their menu, orders and
     tables never mix with the installed copy.
     ------------------------------------------------------------------------ */

  function isDefaultSlug(slug) {
    const s = slugify(slug);
    if (!s) return false;
    const defaultNameSlug = slugify(restaurantConfig.name || "Karahi House");
    return s === RESTAURANT_ID || s === defaultNameSlug || s === "karahi-house";
  }

  function isDefaultId(value) {
    const id = String(value == null ? "" : value).trim();
    if (!id || id === RESTAURANT_ID) return true;
    return isDefaultSlug(id);
  }

  function getRestaurantSlug(restaurantId) {
    if (isDefaultId(restaurantId)) {
      return slugify(restaurantConfig.name || "karahi-house") || "karahi-house";
    }
    const record = findRecord(restaurantId);
    return record ? record.id : slugify(restaurantId);
  }

  function storageKeys(restaurantId) {
    if (isDefaultId(restaurantId)) return { ...baseKeys };

    const id = slugify(restaurantId);
    const scoped = {};
    Object.keys(baseKeys).forEach((name) => {
      scoped[name] = `${storageConfig.prefix || "qrMenu.v2"}.r.${id}.${name}`;
    });
    return scoped;
  }

  function clampTableCount(value) {
    const number = Math.round(Number(value));
    if (!Number.isFinite(number)) return 12;
    return Math.max(1, Math.min(999, number));
  }

  function normalizePlan(raw) {
    const plan = isPlainObject(raw) ? raw : {};
    return {
      name: PLAN_NAMES.includes(String(plan.name || "").trim())
        ? String(plan.name).trim()
        : "Standard",
      startDate: isDateKey(plan.startDate) ? String(plan.startDate) : "",
      expiryDate: isDateKey(plan.expiryDate) ? String(plan.expiryDate) : "",
      feeStatus: plan.feeStatus === "Paid" ? "Paid" : "Unpaid",
    };
  }

  /* Order numbers get one thousand-number block per restaurant, so two
     restaurants can never print the same order number even on their first day.
     The installed copy keeps the config block; added restaurants start at 2001. */
  const ORDER_BLOCK_SIZE = 1000;
  const ORDER_BLOCK_FIRST = 2;

  function seqBaseForIndex(index) {
    return (index + ORDER_BLOCK_FIRST) * ORDER_BLOCK_SIZE + 1;
  }

  function normalizeSeqBase(value) {
    const number = Math.round(Number(value));
    const floor = seqBaseForIndex(0);
    return Number.isFinite(number) && number >= floor && number % ORDER_BLOCK_SIZE === 1
      ? number
      : 0;
  }

  function orderStartFor(restaurantId) {
    if (isDefaultId(restaurantId)) return 0;

    const records = readRestaurants();
    const id = slugify(restaurantId);
    const index = records.findIndex((record) => record.id === id);
    if (index === -1) return 0;

    return normalizeSeqBase(records[index].seqBase) || seqBaseForIndex(index);
  }

  function normalizeRecord(raw) {
    if (!isPlainObject(raw)) return null;

    const id = slugify(raw.id || raw.name);
    const name = String(raw.name || "").trim();
    if (!id || !name || id === RESTAURANT_ID) return null;

    const admin = isPlainObject(raw.admin) ? raw.admin : {};
    return {
      id,
      name,
      ownerName: String(raw.ownerName || "").trim(),
      phone: String(raw.phone || "").trim(),
      whatsappNumber: String(raw.whatsappNumber || "").trim(),
      city: String(raw.city || "").trim(),
      address: String(raw.address || "").trim(),
      logo: String(raw.logo || "").trim(),
      tableCount: clampTableCount(raw.tableCount),
      plan: normalizePlan(raw.plan),
      admin: {
        username: String(admin.username || "").trim(),
        password: String(admin.password || ""),
      },
      disabled: raw.disabled === true,
      seqBase: normalizeSeqBase(raw.seqBase),
      createdAt: String(raw.createdAt || ""),
    };
  }

  function readRestaurants() {
    const stored = readJson(RESTAURANTS_KEY);
    if (!Array.isArray(stored)) return [];
    return stored.map(normalizeRecord).filter(Boolean);
  }

  function writeRestaurants(records) {
    writeJson(RESTAURANTS_KEY, Array.isArray(records) ? records : []);
    return Array.isArray(records) ? records : [];
  }

  function findRecord(restaurantId) {
    const id = slugify(restaurantId);
    if (!id) return null;
    return readRestaurants().find((record) => record.id === id) || null;
  }

  function uniqueRecordId(base, records) {
    const taken = new Set(records.map((record) => record.id));
    const root = base || "restaurant";
    let id = root;
    let suffix = 2;
    while (taken.has(id) || id === RESTAURANT_ID) {
      id = `${root}-${suffix}`;
      suffix += 1;
    }
    return id;
  }

  function addRestaurant(details) {
    const source = isPlainObject(details) ? details : {};
    const records = readRestaurants();
    const record = normalizeRecord({
      ...source,
      id: uniqueRecordId(slugify(source.name), records),
      seqBase: seqBaseForIndex(records.length),
      createdAt: new Date().toISOString(),
    });

    if (!record) throw new Error("Enter the restaurant name.");

    writeRestaurants([...records, record]);

    // Give each restaurant its own categories and products container
    // New restaurant starts with 0 categories and 0 products
    const scoped = storageKeys(record.id);
    writeJson(scoped.categories, []);
    writeJson(scoped.menu, []);

    return record;
  }

  function updateRestaurant(restaurantId, patch) {
    const id = slugify(restaurantId);
    const records = readRestaurants();
    const index = records.findIndex((record) => record.id === id);
    if (index === -1) throw new Error("That restaurant could not be found.");

    const source = isPlainObject(patch) ? patch : {};
    const current = records[index];
    const record = normalizeRecord({
      ...current,
      ...source,
      id,
      plan: isPlainObject(source.plan) ? { ...current.plan, ...source.plan } : current.plan,
      admin: isPlainObject(source.admin) ? { ...current.admin, ...source.admin } : current.admin,
    });

    if (!record) throw new Error("Enter the restaurant name.");

    records[index] = record;
    writeRestaurants(records);
    return record;
  }

  function clearRestaurantData(restaurantId) {
    if (isDefaultId(restaurantId)) return;
    Object.values(storageKeys(restaurantId)).forEach((key) => {
      window.localStorage.removeItem(key);
    });
  }

  function deleteRestaurant(restaurantId) {
    const id = slugify(restaurantId);
    if (!id || id === RESTAURANT_ID) throw new Error("This copy cannot be deleted.");

    const records = readRestaurants();
    const remaining = records.filter((record) => record.id !== id);
    if (remaining.length === records.length) throw new Error("That restaurant could not be found.");

    writeRestaurants(remaining);
    clearRestaurantData(id);
    return true;
  }

  function setRestaurantDisabled(restaurantId, disabled) {
    return updateRestaurant(restaurantId, { disabled: Boolean(disabled) });
  }

  function isAdminUsernameTaken(username, exceptId) {
    const wanted = String(username || "").trim().toLowerCase();
    if (!wanted) return false;

    const skip = slugify(exceptId);
    if (String(restaurantAdminCredentials().username || "").toLowerCase() === wanted) {
      return true;
    }

    return readRestaurants().some(
      (record) =>
        record.id !== skip && String(record.admin.username || "").toLowerCase() === wanted
    );
  }

  function restaurantAdminCredentials() {
    const credentials = adminConfig.credentials || {};
    return {
      username: String(credentials.username || "").trim(),
      password: String(credentials.password || ""),
    };
  }

  function planFromRecord(record) {
    const plan = normalizePlan(record && record.plan);
    const prices = config.planPrices || {};
    const amount = Number(prices[plan.name]);
    const expired =
      Boolean(plan.expiryDate) && dateKey() > plan.expiryDate && plan.feeStatus !== "Paid";
    const disabled = Boolean(record && record.disabled);

    return {
      name: plan.name,
      amount: Number.isFinite(amount) && amount > 0 ? amount : 0,
      startDate: plan.startDate,
      expiryDate: plan.expiryDate,
      feeStatus: plan.feeStatus,
      expired,
      disabled,
      blocked: expired || disabled,
      status: disabled ? "Disabled" : expired ? "Expired" : "Active",
    };
  }

  function activeRestaurantId() {
    try {
      const param = String(
        new URLSearchParams(window.location.search).get(TENANT_PARAM) || ""
      ).trim();
      if (!param) return RESTAURANT_ID; // Default installed copy
      const slug = slugify(param);
      if (isDefaultSlug(slug)) return RESTAURANT_ID;
      const record = findRecord(slug);
      return record ? record.id : null; // Invalid slug -> null
    } catch {
      return RESTAURANT_ID;
    }
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

  function getSuperAdminFromConfig() {
    return {
      username: String(superAdminConfig.username || "").trim(),
      password: String(superAdminConfig.password || ""),
    };
  }

  /* The browser only ever keeps the Super Admin username and a SHA-256 hash of
     the password, and only as an offline fallback. The live check happens in
     Postgres. A hash left over from the old plain-text cache is dropped. */
  function getSuperAdmin() {
    const cached = readJson(SUPER_CREDENTIALS_KEY);
    const stored = isPlainObject(cached) ? cached : {};
    const fallback = getSuperAdminFromConfig();
    const username = String(stored.username || "").trim() || fallback.username;
    const rawHash = String(stored.passwordHash || "").trim().toLowerCase();
    const passwordHash = /^[a-f0-9]{64}$/.test(rawHash) ? rawHash : "";

    if (typeof stored.password === "string" && stored.password) {
      try {
        writeJson(SUPER_CREDENTIALS_KEY, { username, passwordHash });
      } catch {
        // Storage is read-only; the plain value is simply not used.
      }
    }

    return {
      username,
      passwordHash,
      sessionKey: SUPER_SESSION_KEY,
      enabled: Boolean(username),
    };
  }

  function saveSuperCredentials(credentials) {
    const source = isPlainObject(credentials) ? credentials : {};
    const username = String(source.username || "").trim();
    const passwordHash = String(source.passwordHash || "").trim().toLowerCase();
    if (!username) throw new Error("Enter a username.");
    if (!/^[a-f0-9]{64}$/.test(passwordHash)) {
      throw new Error("The Super Admin login could not be stored on this device.");
    }

    writeJson(SUPER_CREDENTIALS_KEY, { username, passwordHash });
    return { username, passwordHash };
  }

  function clearSuperCredentialsCache() {
    window.localStorage.removeItem(SUPER_CREDENTIALS_KEY);
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

  function planStatus(restaurantId) {
    if (!isDefaultId(restaurantId)) {
      const record = findRecord(restaurantId);
      return record ? planFromRecord(record) : null;
    }

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

  function getRestaurant(restaurantId) {
    if (restaurantId === null) return null;
    if (restaurantId !== undefined && !isDefaultId(restaurantId)) {
      return getRestaurantById(restaurantId);
    }

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
    if (!id || id === null) return null;
    if (isDefaultId(id)) return getRestaurant();

    const record = findRecord(id);
    if (!record) return null;

    const plan = planFromRecord(record);
    return {
      id: record.id,
      name: record.name,
      ownerName: record.ownerName,
      phone: record.phone,
      whatsapp: record.whatsappNumber,
      city: record.city,
      address: record.address,
      logo: record.logo,
      tableCount: record.tableCount,
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
      adminUsername: record.admin.username,
      adminPassword: record.admin.password,
    };
  }

  function getCategories(restaurantId) {
    const keys = storageKeys(restaurantId);
    const stored = readJson(keys.categories);
    if (Array.isArray(stored)) return stored;
    if (isDefaultId(restaurantId)) {
      return Array.isArray(config.categories) ? config.categories : [];
    }
    return [];
  }

  function saveCategories(restaurantId, categoriesList) {
    const keys = storageKeys(restaurantId);
    const items = Array.isArray(categoriesList) ? categoriesList : [];
    writeJson(keys.categories, items);
    return items;
  }

  function getMenuItems(restaurantId) {
    const keys = storageKeys(restaurantId);
    const stored = readJson(keys.menu);
    if (Array.isArray(stored)) return stored;
    if (isDefaultId(restaurantId)) {
      return Array.isArray(config.menu) ? config.menu : [];
    }
    return [];
  }

  function saveMenuItems(restaurantId, itemsList) {
    const keys = storageKeys(restaurantId);
    const items = Array.isArray(itemsList) ? itemsList : [];
    writeJson(keys.menu, items);
    return items;
  }

  function getRestaurants() {
    const installed = getRestaurant();
    const added = readRestaurants()
      .map((record) => getRestaurantById(record.id))
      .filter(Boolean);
    return [installed, ...added];
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

  function ensureSampleMenuItems(restaurantId) {
    if (!isDefaultId(restaurantId)) return false;

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
    getRestaurants,
    getRestaurantById,
    getRestaurantSlug,
    storageKeys,
    getCategories,
    saveCategories,
    getMenuItems,
    saveMenuItems,
    orderStartFor,
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
    getSuperAdminFromConfig,
    saveSuperCredentials,
    clearSuperCredentialsCache,
    SUPER_CREDENTIALS_KEY,
    RESTAURANTS_KEY,
    TENANT_PARAM,
    isDefaultRestaurant: isDefaultId,
    readRestaurants,
    addRestaurant,
    updateRestaurant,
    deleteRestaurant,
    setRestaurantDisabled,
    clearRestaurantData,
    isAdminUsernameTaken,
    activeRestaurantId,
  };
})();
