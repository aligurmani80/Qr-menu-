/* ==========================================================================
   UNIFIED DATA LAYER & REAL-TIME SYNC (FIREBASE + LOCAL BROADCAST)
   Seamless, High-speed Synchronization for Orders, Tables, Menu & Settings
   ========================================================================== */

(() => {
  "use strict";

  // Storage keys matching the customer QR Menu system
  const STORAGE_KEYS = Object.freeze({
    orders: "qrMenu.v2.orders",
    sequence: "qrMenu.v2.orderSequence",
    tables: "qrMenu.v2.tables",
    menu: "qrMenu.v2.menu",
    deals: "qrMenu.v2.deals",
    offers: "qrMenu.v2.offers",
    feedback: "qrMenu.v2.feedback",
    control: "qrMenu.v2.control",
    settings: "qrMenu.v2.settings",
    staff: "qrMenu.v2.staff",
    restaurants: "qrMenu.v2.restaurants"
  });

  // Default Categories
  const DEFAULT_CATEGORIES = [
    { id: "trending", label: "Trending", icon: "flame" },
    { id: "signature", label: "Signature", icon: "star" },
    { id: "deals", label: "Deals", icon: "tag" },
    { id: "pizza", label: "Pizza", icon: "pizza" },
    { id: "burger", label: "Burger", icon: "burger" },
    { id: "pasta", label: "Pasta", icon: "pasta" },
    { id: "bbq", label: "BBQ", icon: "flame" },
    { id: "desi", label: "Desi", icon: "pot" },
    { id: "fast-food", label: "Fast Food", icon: "burger" },
    { id: "drinks", label: "Drinks", icon: "cup" }
  ];

  // Default Restaurant Configuration
  const DEFAULT_SETTINGS = {
    restaurantName: "Karahi House",
    ownerName: "Restaurant Owner",
    phone: "0300-1234567",
    whatsapp: "0300-1234567",
    city: "Lahore",
    address: "Gulberg III, Lahore",
    logo: "assets/logo.svg",
    tableCount: 12,
    openingTiming: "12:00 pm – 11:00 pm",
    paymentNote: "Pay cash at table",
    currency: "Rs.",
    plan: "Standard",
    feeStatus: "Paid",
    startDate: "2026-11-01",
    expiryDate: "2026-12-01",
    disabled: false
  };

  // Broadcast Channel for sub-millisecond local/cross-tab sync
  let syncChannel = null;
  try {
    syncChannel = new BroadcastChannel("qr_menu_realtime_sync");
  } catch (e) {
    console.log("BroadcastChannel not supported in this context; falling back to storage events.");
  }

  // Active listener callbacks
  const subscribers = {
    orders: new Set(),
    tables: new Set(),
    menu: new Set(),
    deals: new Set(),
    feedback: new Set(),
    settings: new Set(),
    restaurants: new Set()
  };

  function notifySubscribers(type, data) {
    if (subscribers[type]) {
      subscribers[type].forEach((cb) => {
        try { cb(data); } catch (err) { console.error("Subscriber error:", err); }
      });
    }
  }

  // Listen to cross-tab broadcast
  if (syncChannel) {
    syncChannel.onmessage = (event) => {
      const { type, data } = event.data || {};
      if (type && subscribers[type]) {
        notifySubscribers(type, data);
      }
    };
  }

  // Listen to window storage events
  window.addEventListener("storage", (event) => {
    if (!event.key) return;
    if (event.key === STORAGE_KEYS.orders) notifySubscribers("orders", getOrders());
    if (event.key === STORAGE_KEYS.tables) notifySubscribers("tables", getTables());
    if (event.key === STORAGE_KEYS.menu) notifySubscribers("menu", getMenuItems());
    if (event.key === STORAGE_KEYS.deals) notifySubscribers("deals", getDeals());
    if (event.key === STORAGE_KEYS.feedback) notifySubscribers("feedback", getFeedback());
    if (event.key === STORAGE_KEYS.restaurants) notifySubscribers("restaurants", getRestaurants());
    if (event.key === STORAGE_KEYS.control || event.key === STORAGE_KEYS.settings) {
      notifySubscribers("settings", getSettings());
    }
  });

  // LocalStorage JSON helpers
  function readJson(key, defaultValue = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error("Failed to write to localStorage:", e);
    }
    return value;
  }

  function broadcast(type, data) {
    notifySubscribers(type, data);
    if (syncChannel) {
      try {
        syncChannel.postMessage({ type, data });
      } catch (e) {
        // Ignored
      }
    }
  }

  function resolveContextRestaurantId(explicitId) {
    if (explicitId) return explicitId;
    try {
      const sessionRaw = (typeof sessionStorage !== "undefined" && sessionStorage.getItem("qrMenu.v2.activePortalSession")) ||
                         (typeof localStorage !== "undefined" && localStorage.getItem("qrMenu.v2.activePortalSession"));
      if (sessionRaw) {
        const sess = JSON.parse(sessionRaw);
        if (sess && sess.restaurantId && sess.restaurantId !== "default") {
          return sess.restaurantId;
        }
      }
    } catch {}
    return null;
  }

  /* ------------------------------------------------------------------------
     ORDERS REPOSITORY
     ------------------------------------------------------------------------ */
  function getOrders(rid) {
    const targetId = resolveContextRestaurantId(rid);
    if (targetId) {
      const list = readJson(`qrMenu.v2.orders_${targetId}`, []);
      return Array.isArray(list) ? list.filter((item) => item && typeof item === "object") : [];
    }
    const list = readJson(STORAGE_KEYS.orders, []);
    return Array.isArray(list) ? list.filter((item) => item && typeof item === "object") : [];
  }

  function saveOrders(orders, rid) {
    const targetId = resolveContextRestaurantId(rid);
    if (targetId) {
      writeJson(`qrMenu.v2.orders_${targetId}`, orders);
      broadcast("orders", orders);
      return orders;
    }
    writeJson(STORAGE_KEYS.orders, orders);
    broadcast("orders", orders);
    fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orders)
    }).catch(() => {});
    return orders;
  }

  // Background server sync listener (for multi-device phone / tablet sync)
  setInterval(() => {
    fetch("/api/orders")
      .then((r) => r.json())
      .then((serverOrders) => {
        if (Array.isArray(serverOrders) && serverOrders.length) {
          const local = getOrders();
          if (JSON.stringify(local) !== JSON.stringify(serverOrders)) {
            writeJson(STORAGE_KEYS.orders, serverOrders);
            broadcast("orders", serverOrders);
          }
        }
      })
      .catch(() => {});
  }, 1500);

  function getOrderById(orderNumber) {
    return getOrders().find((o) => String(o.orderNumber) === String(orderNumber)) || null;
  }

  function saveOrder(order) {
    const orders = getOrders();
    const existingIndex = orders.findIndex((o) => String(o.orderNumber) === String(order.orderNumber));
    if (existingIndex >= 0) {
      orders[existingIndex] = { ...orders[existingIndex], ...order, updatedAt: new Date().toISOString() };
    } else {
      orders.unshift({
        ...order,
        createdAt: order.createdAt || new Date().toISOString(),
        time: order.time || new Date().toISOString()
      });
    }
    saveOrders(orders);
    return order;
  }

  function updateOrderStatus(orderNumber, newStatus) {
    const orders = getOrders();
    const order = orders.find((o) => String(o.orderNumber) === String(orderNumber));
    if (order) {
      order.status = newStatus;
      order.updatedAt = new Date().toISOString();
      if (newStatus === "Paid") {
        order.paidAt = new Date().toISOString();
      }
      saveOrders(orders);
      return order;
    }
    return null;
  }

  function deleteOrder(orderNumber) {
    const orders = getOrders().filter((o) => String(o.orderNumber) !== String(orderNumber));
    saveOrders(orders);
    return true;
  }

  function clearAllOrders() {
    saveOrders([]);
    return true;
  }

  /* ------------------------------------------------------------------------
     TABLES REPOSITORY
     ------------------------------------------------------------------------ */
  function getTables(rid) {
    const targetId = resolveContextRestaurantId(rid);
    if (targetId) {
      const stored = readJson(`qrMenu.v2.tables_${targetId}`, []);
      return Array.isArray(stored) ? stored.sort((a, b) => Number(a.number) - Number(b.number)) : [];
    }
    let tables = readJson(STORAGE_KEYS.tables);
    if (!Array.isArray(tables) || !tables.length) {
      // Initialize default tables from settings or default 12 tables
      const settings = getSettings();
      const count = Math.max(1, Math.min(99, Number(settings.tableCount) || 12));
      tables = [];
      for (let i = 1; i <= count; i++) {
        tables.push({
          id: `table-${i}`,
          number: i,
          name: `Table ${i}`,
          seats: 4,
          active: true
        });
      }
      writeJson(STORAGE_KEYS.tables, tables);
    }
    return tables.sort((a, b) => Number(a.number) - Number(b.number));
  }

  function saveTables(tables, rid) {
    const targetId = resolveContextRestaurantId(rid);
    if (targetId) {
      writeJson(`qrMenu.v2.tables_${targetId}`, tables);
      broadcast("tables", tables);
      return tables;
    }
    writeJson(STORAGE_KEYS.tables, tables);
    broadcast("tables", tables);
    return tables;
  }

  function addTable(tableData) {
    const tables = getTables();
    let num = Number(tableData.number);
    if (!num || isNaN(num) || num <= 0) {
      // Find highest existing table number + 1
      const maxNum = tables.reduce((max, t) => Math.max(max, Number(t.number) || 0), 0);
      num = maxNum + 1;
    }
    
    // Check if table already exists
    const existing = tables.find((t) => Number(t.number) === num);
    if (existing) {
      existing.name = tableData.name || `Table ${num}`;
      existing.seats = Number(tableData.seats) || 4;
      existing.active = tableData.active !== false;
    } else {
      tables.push({
        id: `table-${num}`,
        number: num,
        name: tableData.name || `Table ${num}`,
        seats: Number(tableData.seats) || 4,
        active: tableData.active !== false
      });
    }
    saveTables(tables);
    return num;
  }

  function deleteTable(tableNumber) {
    const tables = getTables().filter((t) => Number(t.number) !== Number(tableNumber));
    saveTables(tables);
    return true;
  }

  /* ------------------------------------------------------------------------
     MENU REPOSITORY
     ------------------------------------------------------------------------ */
  function getCategories(rid) {
    const targetId = resolveContextRestaurantId(rid);
    if (targetId) {
      const stored = readJson(`qrMenu.v2.categories_${targetId}`, []);
      return Array.isArray(stored) ? stored : [];
    }
    const stored = readJson("qrMenu.v2.customCategories", []);
    const combined = [...DEFAULT_CATEGORIES];
    if (Array.isArray(stored)) {
      stored.forEach((cat) => {
        if (cat && cat.id && !combined.some((c) => c.id === cat.id)) {
          combined.push(cat);
        }
      });
    }
    return combined;
  }

  function addCategory(categoryName) {
    const name = String(categoryName || "").trim();
    if (!name) return null;
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const custom = readJson("qrMenu.v2.customCategories", []);
    if (!custom.some((c) => c.id === id)) {
      custom.push({ id, label: name, icon: "tag" });
      writeJson("qrMenu.v2.customCategories", custom);
    }
    return { id, label: name };
  }

  function getMenuItems(rid) {
    const targetId = resolveContextRestaurantId(rid);
    if (targetId) {
      const stored = readJson(`qrMenu.v2.menu_${targetId}`, []);
      return Array.isArray(stored) ? stored : [];
    }
    const stored = readJson(STORAGE_KEYS.menu);
    if (Array.isArray(stored) && stored.length) {
      return stored;
    }
    // Default menu items if fresh copy
    const defaults = [
      {
        id: "chicken-tikka",
        name: "Chicken Tikka",
        description: "Tender grilled bonfire chicken, spices & lemon",
        price: 520,
        category: "bbq",
        image: "assets/chicken-tikka.jpg",
        popular: true,
        signature: true,
        active: true
      },
      {
        id: "zinger-burger",
        name: "Zinger Burger",
        description: "Crispy chicken burger with mayo & lettuce",
        price: 480,
        category: "fast-food",
        image: "assets/zinger-burger.jpg",
        popular: true,
        signature: false,
        active: true
      },
      {
        id: "chicken-karahi",
        name: "Chicken Karahi",
        description: "Classic spicy karahi with garlic & ginger",
        price: 450,
        category: "desi",
        image: "assets/chicken-karahi.jpg",
        popular: true,
        signature: true,
        active: true
      },
      {
        id: "beef-biryani",
        name: "Beef Biryani",
        description: "Traditional aromatic beef biryani with raita",
        price: 350,
        category: "desi",
        image: "assets/beef-biryani.jpg",
        popular: false,
        signature: false,
        active: true
      },
      {
        id: "seekh-kebab",
        name: "Seekh Kebab",
        description: "Seekh kebab 6 pcs with mint chutney",
        price: 600,
        category: "bbq",
        image: "assets/seekh-kebab.jpg",
        popular: true,
        signature: false,
        active: true
      },
      {
        id: "chicken-tikka-pizza",
        name: "Chicken Tikka Pizza",
        description: "Loaded tikka chunks, capsicum, olives & rich mozzarella cheese",
        price: 850,
        category: "pizza",
        image: "assets/chicken-tikka-pizza.jpg",
        popular: true,
        signature: false,
        active: true
      },
      {
        id: "mint-lassi",
        name: "Mint Lassi",
        description: "Fresh refreshing mint yogurt drink",
        price: 150,
        category: "drinks",
        image: "assets/mint-lassi.jpg",
        popular: false,
        signature: false,
        active: true
      }
    ];
    writeJson(STORAGE_KEYS.menu, defaults);
    return defaults;
  }

  function saveMenuItems(items, rid) {
    const targetId = resolveContextRestaurantId(rid);
    if (targetId) {
      writeJson(`qrMenu.v2.menu_${targetId}`, items);
      broadcast("menu", items);
      return items;
    }
    writeJson(STORAGE_KEYS.menu, items);
    broadcast("menu", items);
    return items;
  }

  function addMenuItem(item) {
    const items = getMenuItems();
    const id = item.id || `item-${Date.now()}`;
    const newItem = {
      id,
      name: item.name,
      description: item.description || "",
      price: Number(item.price) || 0,
      category: item.category || "desi",
      image: item.image || "assets/placeholder.jpg",
      popular: Boolean(item.popular),
      signature: Boolean(item.signature),
      active: item.active !== false
    };
    items.unshift(newItem);
    saveMenuItems(items);
    return newItem;
  }

  function updateMenuItem(id, patch) {
    const items = getMenuItems();
    const idx = items.findIndex((i) => i.id === id);
    if (idx >= 0) {
      items[idx] = { ...items[idx], ...patch };
      saveMenuItems(items);
      return items[idx];
    }
    return null;
  }

  function deleteMenuItem(id) {
    const items = getMenuItems().filter((i) => i.id !== id);
    saveMenuItems(items);
    return true;
  }

  /* ------------------------------------------------------------------------
     OFFERS & DEALS BUILDER
     ------------------------------------------------------------------------ */
  function getDeals() {
    const stored = readJson(STORAGE_KEYS.deals, []);
    return Array.isArray(stored) ? stored : [];
  }

  function saveDeals(deals) {
    writeJson(STORAGE_KEYS.deals, deals);
    broadcast("deals", deals);
    return deals;
  }

  function addDeal(deal) {
    const deals = getDeals();
    const id = deal.id || `deal-${Date.now()}`;
    const newDeal = {
      id,
      name: deal.name,
      description: deal.description || "",
      price: Number(deal.price) || 0,
      originalPrice: Number(deal.originalPrice) || 0,
      image: deal.image || "assets/placeholder.jpg",
      products: Array.isArray(deal.products) ? deal.products : [],
      active: deal.active !== false
    };
    deals.unshift(newDeal);
    saveDeals(deals);
    return newDeal;
  }

  function deleteDeal(id) {
    const deals = getDeals().filter((d) => d.id !== id);
    saveDeals(deals);
    return true;
  }

  /* ------------------------------------------------------------------------
     FEEDBACK REPOSITORY (1-5 STARS, ADMIN APPROVE/REJECT)
     ------------------------------------------------------------------------ */
  function getFeedback() {
    const list = readJson(STORAGE_KEYS.feedback, []);
    return Array.isArray(list) ? list : [];
  }

  function saveFeedback(feedbackList) {
    writeJson(STORAGE_KEYS.feedback, feedbackList);
    broadcast("feedback", feedbackList);
    return feedbackList;
  }

  function setFeedbackStatus(feedbackId, approved) {
    const list = getFeedback();
    const item = list.find((f) => String(f.id) === String(feedbackId));
    if (item) {
      item.approved = approved;
      saveFeedback(list);
      return item;
    }
    return null;
  }

  function deleteFeedback(feedbackId) {
    const list = getFeedback().filter((f) => String(f.id) !== String(feedbackId));
    saveFeedback(list);
    return true;
  }

  /* ------------------------------------------------------------------------
     STAFF REPOSITORY
     ------------------------------------------------------------------------ */
  function getStaff() {
    const list = readJson(STORAGE_KEYS.staff, []);
    if (!Array.isArray(list) || !list.length) {
      return [
        { id: "staff-1", name: "Manager Ali", role: "Manager", phone: "0300-1112233", pin: "1234", active: true },
        { id: "staff-2", name: "Chef Usman", role: "Kitchen Chef", phone: "0300-4445566", pin: "2233", active: true },
        { id: "staff-3", name: "Waiter Hamza", role: "Waiter", phone: "0300-7778899", pin: "3344", active: true }
      ];
    }
    return list;
  }

  function saveStaff(staffList) {
    writeJson(STORAGE_KEYS.staff, staffList);
    broadcast("staff", staffList);
    return staffList;
  }

  /* ------------------------------------------------------------------------
     SETTINGS & CONTROL (SUPER ADMIN & RESTAURANT INFO)
     ------------------------------------------------------------------------ */
  function getSettings(rid) {
    const targetId = resolveContextRestaurantId(rid);
    if (targetId) {
      const rest = getRestaurantById(targetId);
      if (rest) {
        return {
          id: rest.id,
          restaurantName: rest.restaurantName,
          ownerName: rest.ownerName,
          phone: rest.phone,
          whatsapp: rest.whatsapp,
          city: rest.city,
          address: rest.address,
          logo: rest.logo,
          tableCount: rest.tableCount,
          openingTiming: "12:00 pm – 11:00 pm",
          paymentNote: "Pay cash at table",
          currency: "Rs.",
          plan: rest.plan,
          feeStatus: rest.feeStatus,
          startDate: rest.startDate,
          expiryDate: rest.expiryDate,
          disabled: Boolean(rest.disabled)
        };
      }
    }
    const control = readJson(STORAGE_KEYS.control, {}) || {};
    const settings = readJson(STORAGE_KEYS.settings, {}) || {};
    const rest = control.restaurant || {};
    const plan = control.plan || {};

    return {
      restaurantName: rest.name || settings.restaurantName || DEFAULT_SETTINGS.restaurantName,
      ownerName: rest.ownerName || settings.ownerName || DEFAULT_SETTINGS.ownerName,
      phone: rest.phone || settings.phone || DEFAULT_SETTINGS.phone,
      whatsapp: rest.whatsappNumber || rest.whatsapp || settings.whatsapp || DEFAULT_SETTINGS.whatsapp,
      city: rest.city || settings.city || DEFAULT_SETTINGS.city,
      address: rest.address || settings.address || DEFAULT_SETTINGS.address,
      logo: rest.logo || settings.logo || DEFAULT_SETTINGS.logo,
      tableCount: rest.tableCount || settings.tableCount || DEFAULT_SETTINGS.tableCount,
      openingTiming: rest.openingTiming || settings.openingTiming || DEFAULT_SETTINGS.openingTiming,
      paymentNote: rest.paymentNote || settings.paymentNote || DEFAULT_SETTINGS.paymentNote,
      currency: "Rs.",
      plan: plan.name || settings.plan || DEFAULT_SETTINGS.plan,
      feeStatus: plan.feeStatus || settings.feeStatus || DEFAULT_SETTINGS.feeStatus,
      startDate: plan.startDate || settings.startDate || DEFAULT_SETTINGS.startDate,
      expiryDate: plan.expiryDate || settings.expiryDate || DEFAULT_SETTINGS.expiryDate,
      disabled: control.disabled === true
    };
  }

  function saveSettings(patch, rid) {
    const targetId = resolveContextRestaurantId(rid);
    if (targetId) {
      updateRestaurant(targetId, patch);
      const updated = getSettings(targetId);
      broadcast("settings", updated);
      return updated;
    }
    const current = getSettings();
    const next = { ...current, ...patch };
    writeJson(STORAGE_KEYS.settings, next);

    // Also sync to control key for customer website compatibility
    const control = readJson(STORAGE_KEYS.control, {}) || {};
    control.restaurant = {
      name: next.restaurantName,
      ownerName: next.ownerName,
      phone: next.phone,
      whatsappNumber: next.whatsapp,
      city: next.city,
      address: next.address,
      logo: next.logo,
      tableCount: next.tableCount,
      openingTiming: next.openingTiming,
      paymentNote: next.paymentNote
    };
    control.plan = {
      name: next.plan,
      feeStatus: next.feeStatus,
      startDate: next.startDate,
      expiryDate: next.expiryDate
    };
    if (typeof patch.disabled === "boolean") {
      control.disabled = patch.disabled;
    }
    writeJson(STORAGE_KEYS.control, control);
    broadcast("settings", next);
    return next;
  }

  /* ------------------------------------------------------------------------
     RESTAURANTS REPOSITORY (SUPER ADMIN MULTI-TENANCY & MASTER CONTROL)
     Real numbers, zero demo/fake restaurants, complete A to Z isolation.
     ------------------------------------------------------------------------ */
  function isValidPakistaniMobile(phone) {
    if (!phone) return false;
    const cleaned = String(phone).replace(/[\s\-\(\)\.]/g, "");
    return /^((\+92)|0092|92|0)?3[0-9]{9}$/.test(cleaned);
  }

  function getRestaurants() {
    const list = readJson(STORAGE_KEYS.restaurants, []);
    if (!Array.isArray(list)) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return list.map((r) => {
      let status = "Active";
      const isDisabled = Boolean(r.disabled) || r.status === "Disabled";
      const isExpired = Boolean(r.expiryDate && new Date(r.expiryDate) < today);

      if (isDisabled) {
        status = "Disabled";
      } else if (isExpired) {
        status = "Expired";
      } else {
        status = "Active";
      }
      return { ...r, status, disabled: isDisabled };
    });
  }

  function saveRestaurants(restaurants) {
    writeJson(STORAGE_KEYS.restaurants, restaurants);
    broadcast("restaurants", restaurants);
    return restaurants;
  }

  function getRestaurantById(id) {
    return getRestaurants().find((r) => r.id === id) || null;
  }

  function isUsernameTaken(username, excludeId = null) {
    const u = String(username || "").trim().toLowerCase();
    if (!u) return false;
    if (u === "superadmin") return true;
    const list = getRestaurants();
    return list.some((r) => r.id !== excludeId && String(r.adminUsername || "").trim().toLowerCase() === u);
  }

  function addRestaurant(data) {
    const errors = [];
    const name = String(data.restaurantName || "").trim();
    const owner = String(data.ownerName || "").trim();
    const phone = String(data.phone || "").trim();
    const whatsapp = String(data.whatsapp || "").trim();
    const city = String(data.city || "").trim();
    const address = String(data.address || "").trim();
    const adminUsername = String(data.adminUsername || "").trim();
    const adminPassword = String(data.adminPassword || "");
    const confirmPassword = String(data.confirmPassword || "");

    if (!name) errors.push("Restaurant Name is required");
    if (!owner) errors.push("Owner Name is required");
    if (!phone) errors.push("Phone Number is required");
    if (!whatsapp) {
      errors.push("WhatsApp Number is required");
    } else if (!isValidPakistaniMobile(whatsapp)) {
      errors.push("WhatsApp must be a valid Pakistani mobile number (e.g. 0300-1234567)");
    }
    if (!city) errors.push("City is required");
    if (!address) errors.push("Address is required");
    if (!adminUsername) {
      errors.push("Admin Username is required");
    } else if (isUsernameTaken(adminUsername)) {
      errors.push(`Admin Username '${adminUsername}' is already taken. Please choose another.`);
    }
    if (!adminPassword || adminPassword.length < 8) {
      errors.push("Admin Password must be at least 8 characters");
    }
    if (confirmPassword && adminPassword !== confirmPassword) {
      errors.push("Admin Password and Confirm Password do not match");
    }

    if (errors.length > 0) {
      throw new Error(errors.join(" | "));
    }

    const id = data.id || `rest-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const tableCount = Math.max(1, Math.min(99, Number(data.tableCount) || 10));

    const plan = data.plan || "Standard";
    let monthlyFee = Number(data.monthlyFee);
    if (isNaN(monthlyFee) || monthlyFee <= 0) {
      if (plan === "Basic") monthlyFee = 2000;
      else if (plan === "Standard") monthlyFee = 3500;
      else if (plan === "Premium") monthlyFee = 5000;
      else monthlyFee = 3500;
    }

    const startDate = data.startDate || new Date().toISOString().slice(0, 10);
    let expiryDate = data.expiryDate;
    if (!expiryDate) {
      const s = new Date(startDate);
      s.setDate(s.getDate() + 30);
      expiryDate = s.toISOString().slice(0, 10);
    }

    const newRest = {
      id,
      restaurantName: name,
      ownerName: owner,
      phone,
      whatsapp,
      city,
      address,
      logo: (data.logo && data.logo.trim()) ? data.logo.trim() : "assets/logo.svg",
      tableCount,
      adminUsername,
      adminPassword,
      plan,
      monthlyFee,
      feeStatus: data.feeStatus === "Unpaid" ? "Unpaid" : "Paid",
      startDate,
      expiryDate,
      status: "Active",
      disabled: false,
      createdAt: new Date().toISOString()
    };

    // Strictly empty: 0 categories, 0 products, 0 orders. No demo data.
    writeJson(`qrMenu.v2.orders_${id}`, []);
    writeJson(`qrMenu.v2.menu_${id}`, []);
    writeJson(`qrMenu.v2.categories_${id}`, []);

    // Create tables for this restaurant
    const tables = [];
    for (let i = 1; i <= tableCount; i++) {
      tables.push({
        id: `table-${id}-${i}`,
        number: i,
        name: `Table ${i}`,
        seats: 4,
        active: true
      });
    }
    writeJson(`qrMenu.v2.tables_${id}`, tables);

    const restaurants = getRestaurants();
    restaurants.unshift(newRest);
    saveRestaurants(restaurants);

    return newRest;
  }

  function updateRestaurant(id, patch) {
    const restaurants = getRestaurants();
    const idx = restaurants.findIndex((r) => r.id === id);
    if (idx < 0) return null;

    if (patch.adminUsername) {
      const u = String(patch.adminUsername).trim();
      if (isUsernameTaken(u, id)) {
        throw new Error(`Admin Username '${u}' is already taken.`);
      }
      patch.adminUsername = u;
    }

    if (patch.adminPassword !== undefined && patch.adminPassword !== "") {
      if (patch.adminPassword.length < 8) {
        throw new Error("Admin Password must be at least 8 characters");
      }
    } else {
      delete patch.adminPassword;
    }

    if (patch.whatsapp && !isValidPakistaniMobile(patch.whatsapp)) {
      throw new Error("WhatsApp must be a valid Pakistani mobile number (e.g. 0300-1234567)");
    }

    if (patch.tableCount && Number(patch.tableCount) !== Number(restaurants[idx].tableCount)) {
      const newCount = Number(patch.tableCount);
      const existingTables = readJson(`qrMenu.v2.tables_${id}`, []);
      const tables = [];
      for (let i = 1; i <= newCount; i++) {
        const ex = existingTables.find((t) => Number(t.number) === i);
        tables.push(ex || {
          id: `table-${id}-${i}`,
          number: i,
          name: `Table ${i}`,
          seats: 4,
          active: true
        });
      }
      writeJson(`qrMenu.v2.tables_${id}`, tables);
    }

    restaurants[idx] = {
      ...restaurants[idx],
      ...patch,
      updatedAt: new Date().toISOString()
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (restaurants[idx].disabled) {
      restaurants[idx].status = "Disabled";
    } else if (restaurants[idx].expiryDate && new Date(restaurants[idx].expiryDate) < today) {
      restaurants[idx].status = "Expired";
    } else {
      restaurants[idx].status = "Active";
    }

    saveRestaurants(restaurants);
    return restaurants[idx];
  }

  function deleteRestaurant(id) {
    const restaurants = getRestaurants();
    const target = restaurants.find((r) => r.id === id);
    if (!target) return false;

    const next = restaurants.filter((r) => r.id !== id);
    saveRestaurants(next);

    try {
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem(`qrMenu.v2.orders_${id}`);
        localStorage.removeItem(`qrMenu.v2.menu_${id}`);
        localStorage.removeItem(`qrMenu.v2.categories_${id}`);
        localStorage.removeItem(`qrMenu.v2.tables_${id}`);
      }
    } catch {}

    return true;
  }

  function toggleRestaurantStatus(id) {
    const restaurants = getRestaurants();
    const r = restaurants.find((item) => item.id === id);
    if (!r) return null;

    r.disabled = !r.disabled;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (r.disabled) {
      r.status = "Disabled";
    } else {
      const isExpired = r.expiryDate && (new Date(r.expiryDate) < today);
      r.status = isExpired ? "Expired" : "Active";
    }
    saveRestaurants(restaurants);
    return r;
  }

  function getSuperAdminStats() {
    const restaurants = getRestaurants();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const total = restaurants.length;
    let active = 0;
    let expiredOrDisabled = 0;
    let totalMonthlyFee = 0;

    restaurants.forEach((r) => {
      const isExpired = Boolean(r.expiryDate && new Date(r.expiryDate) < today);
      const isDisabled = Boolean(r.disabled) || r.status === "Disabled";

      if (isDisabled || isExpired) {
        expiredOrDisabled++;
      } else {
        active++;
      }

      // Total Monthly Fee (this month, real Paid fees only)
      if (r.feeStatus === "Paid" && !isDisabled) {
        totalMonthlyFee += Number(r.monthlyFee || 0);
      }
    });

    return {
      totalRestaurants: total,
      activeRestaurants: active,
      expiredOrDisabledRestaurants: expiredOrDisabled,
      totalMonthlyFee
    };
  }

  /* ------------------------------------------------------------------------
     PROFIT & REPORTS CALCULATION (LAST 15 DAYS)
     Strictly real numbers from real orders only. 0 if none.
     ------------------------------------------------------------------------ */
  function formatDateKey(d) {
    const date = d instanceof Date ? d : new Date(d);
    if (isNaN(date.getTime())) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function getOrderTotal(order) {
    if (!order) return 0;
    if (typeof order.total === "number") return order.total;
    if (typeof order.totalAmount === "number") return order.totalAmount;
    if (Array.isArray(order.items)) {
      return order.items.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || item.qty || 1)), 0);
    }
    return 0;
  }

  // Today's Stats
  function getTodayStats() {
    const orders = getOrders();
    const todayKey = formatDateKey(new Date());

    const todayOrders = orders.filter((order) => {
      const orderDateKey = formatDateKey(order.time || order.createdAt);
      return orderDateKey === todayKey;
    });

    // Rule: Today's Profit = sum of today's real orders that are Paid (matching existing system paid sales rule)
    const paidOrders = todayOrders.filter((o) => o.status === "Paid");
    const todayProfit = paidOrders.reduce((sum, o) => sum + getOrderTotal(o), 0);
    const todaySales = todayOrders.reduce((sum, o) => sum + getOrderTotal(o), 0);
    const awaitingPayment = Math.max(0, todaySales - todayProfit);

    const pendingOrders = todayOrders.filter((o) => ["Received", "Preparing", "Ready"].includes(o.status));

    return {
      todayOrdersCount: todayOrders.length,
      todayProfit,
      todaySales,
      awaitingPayment,
      pendingOrdersCount: pendingOrders.length,
      ruleUsed: "Today's Profit = Sum of orders placed today with status 'Paid' (matching existing QR Menu system rule)"
    };
  }

  // Last 15 Days Report (Strictly last 15 days, newest day first)
  function getLast15DaysReport() {
    const orders = getOrders();
    const days = [];
    const now = new Date();

    let total15DayOrders = 0;
    let total15DayProfit = 0;
    let total15DaySales = 0;

    for (let i = 0; i < 15; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dayKey = formatDateKey(d);

      const dayOrders = orders.filter((o) => formatDateKey(o.time || o.createdAt) === dayKey);
      const paidOrders = dayOrders.filter((o) => o.status === "Paid");

      const daySales = dayOrders.reduce((sum, o) => sum + getOrderTotal(o), 0);
      const dayProfit = paidOrders.reduce((sum, o) => sum + getOrderTotal(o), 0);
      const dayAwaiting = Math.max(0, daySales - dayProfit);

      total15DayOrders += dayOrders.length;
      total15DayProfit += dayProfit;
      total15DaySales += daySales;

      days.push({
        date: d,
        dateKey: dayKey,
        label: i === 0 ? "Today" : i === 1 ? "Yesterday" : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
        ordersCount: dayOrders.length,
        profit: dayProfit,
        sales: daySales,
        awaiting: dayAwaiting
      });
    }

    return {
      days,
      totalOrders: total15DayOrders,
      totalProfit: total15DayProfit,
      totalSales: total15DaySales,
      averageProfit: total15DayOrders > 0 ? Math.round(total15DayProfit / 15) : 0
    };
  }

  // Subscribe to collection updates
  function subscribe(collection, callback) {
    if (subscribers[collection]) {
      subscribers[collection].add(callback);
    }
    return () => {
      if (subscribers[collection]) {
        subscribers[collection].delete(callback);
      }
    };
  }

  window.DB = {
    STORAGE_KEYS,
    getOrders,
    saveOrders,
    getOrderById,
    saveOrder,
    updateOrderStatus,
    deleteOrder,
    clearAllOrders,
    getTables,
    saveTables,
    addTable,
    deleteTable,
    getCategories,
    addCategory,
    getMenuItems,
    saveMenuItems,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    getDeals,
    saveDeals,
    addDeal,
    deleteDeal,
    getFeedback,
    saveFeedback,
    setFeedbackStatus,
    deleteFeedback,
    getStaff,
    saveStaff,
    getSettings,
    saveSettings,
    getRestaurants,
    saveRestaurants,
    getRestaurantById,
    addRestaurant,
    updateRestaurant,
    deleteRestaurant,
    toggleRestaurantStatus,
    getSuperAdminStats,
    isValidPakistaniMobile,
    isUsernameTaken,
    getTodayStats,
    getLast15DaysReport,
    getOrderTotal,
    subscribe,
    broadcast
  };
})();
