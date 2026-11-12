/* ==========================================================================
   SAMPLE DEMO RESTAURANT — PHASE 5

   Every value in this file is SAMPLE data for the sales demo only.
   The demo restaurant lives in the same local registry as real restaurants
   but keeps its own restaurant ID, so demo orders, feedback, tables and
   menu never mix with a real restaurant's data.

   Loaded after js/tenant.js on the customer menu and in the Super Admin
   console. Nothing here touches another restaurant's storage keys.
   ========================================================================== */

(() => {
  "use strict";

  if (typeof window === "undefined" || typeof Tenant === "undefined") return;

  const DEMO_RESTAURANT_ID = "demo-karahi-house";
  const DEMO_NAME = "Karahi House";
  const DEMO_OWNER = "Demo Owner";
  const DEMO_CITY = "Lahore";
  const DEMO_WHATSAPP = "[DEMO_WHATSAPP_NUMBER]";
  const BILLING_DAYS = 30;

  // SAMPLE demo admin login. This restaurant is clearly marked SAMPLE in the
  // Super Admin console and only owns demo data.
  const DEMO_ADMIN = Object.freeze({
    username: "demo",
    password: "demo1234",
  });

  // Final category order used by the demo menu. Category labels live in CONFIG.
  const DEMO_CATEGORY_ORDER = Object.freeze([
    "trending",
    "signature",
    "deals",
    "pizza",
    "burger",
    "pasta",
    "bbq",
    "desi",
    "fast-food",
    "drinks",
  ]);

  // SAMPLE menu — 10 items, exact demo prices. No invented dishes.
  const DEMO_MENU = Object.freeze([
    {
      id: "demo-chicken-tikka",
      name: "Chicken Tikka",
      description: "Tender grilled bonfire chicken, spices & lemon",
      price: 520,
      category: "bbq",
      image: "assets/chicken-tikka.jpg",
      popular: true,
      active: true,
    },
    {
      id: "demo-zinger-burger",
      name: "Zinger Burger",
      description: "Crispy chicken burger with mayo & lettuce",
      price: 480,
      category: "fast-food",
      image: "assets/zinger-burger.jpg",
      popular: true,
      active: true,
    },
    {
      id: "demo-chicken-karahi",
      name: "Chicken Karahi",
      description: "Classic spicy karahi with garlic & ginger",
      price: 450,
      category: "desi",
      image: "assets/chicken-karahi.jpg",
      popular: true,
      active: true,
    },
    {
      id: "demo-beef-biryani",
      name: "Beef Biryani",
      description: "Beef biryani with raita",
      price: 350,
      category: "desi",
      image: "assets/beef-biryani.jpg",
      popular: false,
      active: true,
    },
    {
      id: "demo-seekh-kebab",
      name: "Seekh Kebab",
      description: "Seekh kebab 6 pcs with mint chutney",
      price: 600,
      category: "bbq",
      image: "assets/seekh-kebab.jpg",
      popular: true,
      active: true,
    },
    {
      id: "demo-chicken-tikka-pizza",
      name: "Chicken Tikka Pizza",
      description: "Loaded chicken tikka pizza with fresh capsicum",
      price: 850,
      category: "pizza",
      image: "assets/chicken-tikka-pizza.jpg",
      popular: true,
      active: true,
    },
    {
      id: "demo-chicken-alfredo-pasta",
      name: "Chicken Alfredo Pasta",
      description: "Creamy Alfredo pasta with grilled chicken",
      price: 650,
      category: "pasta",
      image: "assets/chicken-alfredo-pasta.jpg",
      popular: false,
      active: true,
    },
    {
      id: "demo-mint-lassi",
      name: "Mint Lassi",
      description: "Fresh mint lassi",
      price: 150,
      category: "drinks",
      image: "assets/mint-lassi.jpg",
      popular: false,
      active: true,
    },
    {
      id: "demo-cold-drink",
      name: "Cold Drink",
      description: "Cold drink 345ml",
      price: 120,
      category: "drinks",
      image: "assets/cold-drink.jpg",
      popular: false,
      active: true,
    },
    {
      id: "demo-naan",
      name: "Naan",
      description: "Tandoori naan",
      price: 50,
      category: "desi",
      image: "assets/naan.jpg",
      popular: false,
      active: true,
    },
  ]);

  const DEMO_TABLES = Object.freeze(
    Array.from({ length: 12 }, (_, index) => ({
      number: index + 1,
      name: `Table ${index + 1}`,
    }))
  );

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function hasKey(key) {
    try {
      return window.localStorage.getItem(key) != null;
    } catch {
      return false;
    }
  }

  function demoRecord(existing) {
    const today = Tenant.dateKey();
    const now = new Date().toISOString();

    return {
      id: DEMO_RESTAURANT_ID,
      name: DEMO_NAME,
      ownerName: existing ? existing.ownerName : DEMO_OWNER,
      city: existing ? existing.city : DEMO_CITY,
      whatsapp: existing ? existing.whatsapp : DEMO_WHATSAPP,
      logo: existing ? existing.logo : "",
      planId: existing ? existing.planId : "premium",
      status: "Active",
      startDate: existing && existing.startDate ? existing.startDate : today,
      dueDate: Tenant.addDaysKey(today, BILLING_DAYS),
      paymentStatus: "Paid",
      lastPaymentDate: today,
      adminUsername: DEMO_ADMIN.username,
      adminPassword: DEMO_ADMIN.password,
      createdAt: existing && existing.createdAt ? existing.createdAt : now,
      updatedAt: now,
      isDefault: false,
    };
  }

  function ensureRegistryEntry() {
    const restaurants = Tenant.getRestaurants();
    const existing = restaurants.find((restaurant) => restaurant.id === DEMO_RESTAURANT_ID);

    if (!existing) {
      Tenant.saveRestaurants(restaurants.concat(demoRecord(null)));
      return;
    }

    const expired =
      existing.status !== "Active" ||
      existing.paymentStatus !== "Paid" ||
      !existing.dueDate ||
      existing.dueDate < Tenant.dateKey();

    if (!expired) return;

    Tenant.updateRestaurant(DEMO_RESTAURANT_ID, {
      status: "Active",
      paymentStatus: "Paid",
      dueDate: Tenant.addDaysKey(Tenant.dateKey(), BILLING_DAYS),
      lastPaymentDate: Tenant.dateKey(),
    });
  }

  function ensureDemoData() {
    const keys = Tenant.storageKeys(DEMO_RESTAURANT_ID);

    if (!hasKey(keys.menu) || !Array.isArray(Tenant.readJson(keys.menu))) {
      Tenant.writeJson(keys.menu, clone(DEMO_MENU));
    }

    if (!hasKey(keys.tables) || !Array.isArray(Tenant.readJson(keys.tables))) {
      Tenant.writeJson(keys.tables, clone(DEMO_TABLES));
    }

    if (!hasKey(keys.offers) || !Array.isArray(Tenant.readJson(keys.offers))) {
      Tenant.writeJson(keys.offers, []);
    }

    if (!hasKey(keys.deals) || !Array.isArray(Tenant.readJson(keys.deals))) {
      Tenant.writeJson(keys.deals, []);
    }

    if (!hasKey(keys.cart) || typeof Tenant.readJson(keys.cart) !== "object") {
      Tenant.writeJson(keys.cart, { items: {}, deals: {} });
    }

    const settings = Tenant.readJson(keys.settings);
    if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
      Tenant.writeJson(keys.settings, {
        restaurantName: DEMO_NAME,
        logo: "",
        whatsappNumber: DEMO_WHATSAPP,
        openingTiming: "12:00 pm – 11:00 pm",
        paymentNote: "Pay cash at table",
      });
    }

    const staff = Tenant.readJson(keys.staff);
    if (!Array.isArray(staff) || !staff.length) {
      Tenant.writeJson(keys.staff, [
        {
          id: "demo-owner",
          name: DEMO_OWNER,
          role: "Owner",
          username: DEMO_ADMIN.username,
          password: DEMO_ADMIN.password,
          active: true,
        },
      ]);
    }
  }

  function ensure() {
    try {
      ensureRegistryEntry();
      ensureDemoData();
    } catch {
      // The demo still opens from config defaults when storage is unavailable.
    }
    return DEMO_RESTAURANT_ID;
  }

  function reset() {
    ensureRegistryEntry();

    const keys = Tenant.storageKeys(DEMO_RESTAURANT_ID);
    Tenant.writeJson(keys.menu, clone(DEMO_MENU));
    Tenant.writeJson(keys.tables, clone(DEMO_TABLES));
    Tenant.writeJson(keys.offers, []);
    Tenant.writeJson(keys.deals, []);
    Tenant.writeJson(keys.cart, { items: {}, deals: {} });
    Tenant.writeJson(keys.orders, []);
    Tenant.writeJson(keys.sequence, 0);
    Tenant.writeJson(keys.waiterCalls, []);
    Tenant.writeJson(keys.billRequests, []);
    Tenant.writeJson(keys.myOrders, []);
    Tenant.writeJson(keys.feedback, []);
    Tenant.writeJson(keys.settings, {
      restaurantName: DEMO_NAME,
      logo: "",
      whatsappNumber: DEMO_WHATSAPP,
      openingTiming: "12:00 pm – 11:00 pm",
      paymentNote: "Pay cash at table",
    });
    Tenant.writeJson(keys.staff, [
      {
        id: "demo-owner",
        name: DEMO_OWNER,
        role: "Owner",
        username: DEMO_ADMIN.username,
        password: DEMO_ADMIN.password,
        active: true,
      },
    ]);

    return DEMO_RESTAURANT_ID;
  }

  function isDemo(restaurantId) {
    return String(restaurantId || "").trim() === DEMO_RESTAURANT_ID;
  }

  window.DemoData = Object.freeze({
    id: DEMO_RESTAURANT_ID,
    name: DEMO_NAME,
    categoryOrder: DEMO_CATEGORY_ORDER,
    menu: DEMO_MENU,
    tables: DEMO_TABLES,
    admin: DEMO_ADMIN,
    isDemo,
    ensure,
    reset,
  });
})();
