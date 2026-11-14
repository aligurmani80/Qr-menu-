/* ==========================================================================
   RESTAURANT CONFIGURATION — THE ONLY FILE THAT CHANGES PER COPY

   How to provide a new copy:
   1. Copy the whole project folder.
   2. Edit ONLY this file: restaurant details, admin login, plan and fee.
   3. Replace the logo file (or point restaurant.logo at the new file).
   4. Give the restaurant its new admin username and password.

   Everything below is SAMPLE data for the master copy. Replace it before a
   real restaurant uses this folder. Admin password must be at least 8
   characters.

   Plan expiry: when plan.expiryDate has passed AND plan.feeStatus is
   "Unpaid", the customer menu and the admin login are disabled. Mark the
   fee "Paid" or extend expiryDate here to re-enable the copy.
   ========================================================================== */

const RESTAURANT_CONFIG = {
  restaurant: {
    // SAMPLE restaurant name. Replace with the real restaurant name.
    name: "Karahi House",
    ownerName: "Restaurant Owner",

    // SAMPLE contact placeholders. Replace with the real numbers.
    phone: "[RESTAURANT_PHONE]",
    whatsappNumber: "[RESTAURANT_WHATSAPP_NUMBER]",

    city: "Lahore",
    address: "[RESTAURANT_ADDRESS]",

    // Path to the logo file. Replace the file and keep this path, or point
    // this value at the new file.
    logo: "assets/logo.svg",

    // Default number of tables created on a fresh copy. The admin can add or
    // remove tables later from Tables & QR Codes.
    tableCount: 12,

    openingTiming: "12:00 pm – 11:00 pm",
    paymentNote: "Pay cash at table",
  },

  admin: {
    // SAMPLE admin login. Replace both values for every new copy.
    // The password must be at least 8 characters.
    credentials: {
      username: "admin",
      password: "admin1234",
    },
    sessionKey: "qrMenu.v2.adminSession",
  },

  // Separate Super Admin login. The Super Admin can open every admin page
  // and manage the copy, plan, fee and restaurant admin credentials.
  // SAMPLE credentials only — replace before handing a copy to a client.
  superAdmin: {
    username: "superadmin",
    password: "KarahiSuper@2026",
    sessionKey: "qrMenu.v2.superAdminSession",
  },

  // Manual monthly fee. No online gateway: JazzCash, Easypaisa, Bank or Cash.
  plan: {
    // One of: Basic (Rs. 2,000) | Standard (Rs. 3,500) | Premium (Rs. 5,000)
    name: "Standard",
    startDate: "2026-11-01",
    expiryDate: "2026-12-01",
    // "Paid" or "Unpaid"
    feeStatus: "Unpaid",
  },

  planPrices: {
    Basic: 2000,
    Standard: 3500,
    Premium: 5000,
  },

  paymentMethods: ["JazzCash", "Easypaisa", "Bank Transfer", "Cash"],

  // Shared localStorage keys. Host each copy on its own domain/subdomain.
  // If two copies must share one domain, change this prefix per copy.
  storage: {
    prefix: "qrMenu.v2",
    // Super Admin changes (details, plan, credentials, disabled state) are
    // saved here as overrides on top of this file and survive a refresh.
    controlKey: "qrMenu.v2.control",
    menuKey: "qrMenu.v2.menu",
    settingsKey: "qrMenu.v2.settings",
    tablesKey: "qrMenu.v2.tables",
    offersKey: "qrMenu.v2.offers",
    dealsKey: "qrMenu.v2.deals",
    cartKey: "qrMenu.v2.cart",
    staffKey: "qrMenu.v2.staff",
    soundKey: "qrMenu.v2.soundEnabled",
    waiterCallsKey: "qrMenu.v2.waiterCalls",
    billRequestsKey: "qrMenu.v2.billRequests",
    myOrdersKey: "qrMenu.v2.myOrders",
    feedbackKey: "qrMenu.v2.feedback",
  },

  table: {
    queryParam: "table",
  },

  currency: {
    symbol: "Rs.",
    locale: "en-PK",
    maximumFractionDigits: 0,
  },

  // Order here is the order used in the category pills and full menu.
  categories: [
    { id: "trending", label: "Trending", icon: "flame" },
    { id: "signature", label: "Signature", icon: "star" },
    { id: "deals", label: "Deals", icon: "tag" },
    { id: "pizza", label: "Pizza", icon: "pizza" },
    { id: "burger", label: "Burger", icon: "burger" },
    { id: "pasta", label: "Pasta", icon: "pasta" },
    { id: "bbq", label: "BBQ", icon: "flame" },
    { id: "desi", label: "Desi", icon: "pot" },
    { id: "fast-food", label: "Fast Food", icon: "burger" },
    { id: "drinks", label: "Drinks", icon: "cup" },
  ],

  // SAMPLE menu with SAMPLE prices. Replace every item, photo and price with
  // the restaurant's real menu before sharing the QR codes.
  menu: [
    {
      id: "chicken-tikka",
      name: "Chicken Tikka",
      description: "Tender grilled bonfire chicken, spices & lemon",
      price: 520,
      category: "bbq",
      image: "assets/chicken-tikka.jpg",
      popular: true,
      active: true,
    },
    {
      id: "zinger-burger",
      name: "Zinger Burger",
      description: "Crispy chicken burger with mayo & lettuce",
      price: 480,
      category: "fast-food",
      image: "assets/zinger-burger.jpg",
      popular: true,
      active: true,
    },
    {
      id: "chicken-karahi",
      name: "Chicken Karahi",
      description: "Classic spicy karahi with garlic & ginger",
      price: 450,
      category: "desi",
      image: "assets/chicken-karahi.jpg",
      popular: true,
      active: true,
    },
    {
      id: "beef-biryani",
      name: "Beef Biryani",
      description: "Beef biryani with raita",
      price: 350,
      category: "desi",
      image: "assets/beef-biryani.jpg",
      popular: false,
      active: true,
    },
    {
      id: "seekh-kebab",
      name: "Seekh Kebab",
      description: "Seekh kebab 6 pcs with mint chutney",
      price: 600,
      category: "bbq",
      image: "assets/seekh-kebab.jpg",
      popular: true,
      active: true,
    },
    {
      id: "mint-lassi",
      name: "Mint Lassi",
      description: "Fresh mint lassi",
      price: 150,
      category: "drinks",
      image: "assets/mint-lassi.jpg",
      popular: false,
      active: true,
    },
    {
      id: "cold-drink",
      name: "Cold Drink",
      description: "Cold drink 345ml",
      price: 120,
      category: "drinks",
      image: "assets/cold-drink.jpg",
      popular: false,
      active: true,
    },
    {
      id: "naan",
      name: "Naan",
      description: "Tandoori naan",
      price: 50,
      category: "desi",
      image: "assets/naan.jpg",
      popular: false,
      active: true,
    },
    {
      id: "chicken-tikka-pizza",
      name: "Chicken Tikka Pizza",
      description: "SAMPLE item — chicken tikka pizza, editable or deletable in admin",
      price: 850,
      category: "pizza",
      image: "assets/chicken-tikka-pizza.jpg",
      popular: false,
      active: true,
      signature: false,
      sample: true,
    },
    {
      id: "chicken-alfredo-pasta",
      name: "Chicken Alfredo Pasta",
      description: "SAMPLE item — creamy chicken alfredo pasta, editable or deletable in admin",
      price: 650,
      category: "pasta",
      image: "assets/chicken-alfredo-pasta.jpg",
      popular: false,
      active: true,
      signature: false,
      sample: true,
    },
  ],

  payment: {
    note: "Pay cash at table",
    takeawayNote: "Pay cash on pickup",
    deliveryNote: "Cash on delivery",
  },

  delivery: {
    // SAMPLE delivery charge in PKR. Change this value per copy.
    charge: 150,
  },

  orders: {
    storageKey: "qrMenu.v2.orders",
    sequenceKey: "qrMenu.v2.orderSequence",
    startingNumber: 1025,
    initialStatus: "Received",
  },

  offers: [],
  deals: [],

  theme: {
    colors: {
      primary: "#0F2E1F",
      primaryDeep: "#123524",
      accent: "#E67E22",
      accentWarm: "#EA7A2A",
      background: "#FFFFFF",
      surface: "#F6F6F4",
      ink: "#1A1A1A",
      muted: "#6C675D",
      line: "#E8E4DB",
      sage: "#EAF0E9",
      peach: "#FDF1E4",
    },
  },
};

// Internal alias used by the existing application code.
const CONFIG = RESTAURANT_CONFIG;

/* ==========================================================================
   COPY — ENGLISH CUSTOMER MENU STRINGS

   Every customer-facing phrase used by js/main.js. Edit the wording here.
   ========================================================================== */

const COPY = {
  menu: "Menu",
  skipToMenu: "Skip to the menu",
  searchDishes: "Search dishes",
  searchPlaceholder: "Search dishes...",
  clearSearch: "Clear search",
  currentTable: "Current table",
  orderMode: "Order mode",
  modeDineIn: "Dine-in",
  modeTakeaway: "Takeaway",
  modeDelivery: "Home Delivery",
  modeDineNote: "Table {table} · locked from QR",
  modeDineUnavailable: "Scan your table QR code to order dine-in.",
  modeTakeawayNote: "Collect from counter · Cash on pickup",
  modeDeliveryNote: "Delivered to your address · {fee} delivery charge",
  all: "All",
  popularItems: "Popular Items",
  searchResults: "Search results",
  offerLabel: "Offer",
  offerEnds: "Ends {date}",
  offerFrom: "From {date}",
  dealLabel: "Deal",
  dealIncludes: "Includes",
  dealQuantity: "Deal quantity",
  addDeal: "Add Deal",
  addDealToOrder: "Add {name} deal to order",
  increaseDealQty: "Increase {name} deal quantity",
  decreaseDealQty: "Decrease {name} deal quantity",
  removeDealName: "Remove {name} deal from order",
  dealEach: "each: {items}",
  saveBadge: "Save {amount}",
  savePercent: "{percent}% off",
  add: "Add",
  addToOrder: "Add {name} to order",
  increaseQty: "Increase {name} quantity",
  decreaseQty: "Decrease {name} quantity",
  removeItemName: "Remove {name} from order",
  yourOrder: "Your order",
  viewCart: "View Cart",
  cart: "Cart",
  cartSummary: "Cart summary",
  closeCart: "Close cart",
  subtotal: "Subtotal",
  deliveryCharges: "Delivery charges",
  total: "Total",
  each: "each",
  remove: "Remove",
  yourCartEmpty: "Your cart is empty",
  yourCartEmptyText: "Add a dish from the menu and it will show up here.",
  browseMenu: "Browse the menu",
  placeOrder: "Place Order",
  placingOrder: "Placing order…",
  yourDetails: "Your details",
  name: "Name",
  mobileNumber: "Mobile number",
  deliveryAddress: "Delivery address",
  namePlaceholder: "Your name",
  mobilePlaceholder: "03xx-xxxxxxx",
  addressPlaceholder: "House, street, area, city",
  nameRequired: "Enter your name before placing the order.",
  detailsForDineIn: "Your name is required. Mobile number is optional for dine-in.",
  detailsForTakeaway: "Name and mobile number are required for takeaway.",
  detailsForDelivery: "Name, mobile number and address are required for delivery.",
  mobileRequired: "Enter your mobile number in 03xx-xxxxxxx format.",
  mobileInvalid: "Enter a valid 11-digit mobile number starting with 03.",
  addressRequired: "Add your delivery address before placing this order.",
  callWaiter: "Call Waiter",
  waiterCalled: "Waiter called",
  requestBill: "Request Bill",
  billRequested: "Bill requested",
  tableService: "Table service",
  closeBill: "Close bill",
  filterMenu: "Filter menu by category",
  billTitle: "Your bill",
  billFor: "Bill for Table {table}",
  billNote: "Pay cash at table",
  billRequestNote: "The waiter will bring your bill to the table.",
  billAlreadyRequested: "Your bill has already been requested. A waiter is bringing it.",
  billRequestedTime: "Requested {time}",
  noUnpaidOrders: "There are no unpaid orders for this table.",
  billStatusPending: "Pending",
  billStatusPaid: "Paid",
  orderNumbers: "Order numbers",
  orderNumber: "Order number",
  table: "Table",
  placed: "Placed",
  orderTracking: "Order tracking",
  orderPlaced: "Order placed",
  orderReceived: "Order received",
  orderReceivedDesc: "The kitchen has your order. Pay cash at your table when it arrives.",
  orderReceivedDescTakeaway: "The kitchen has your order. Pay cash when you collect it from the counter.",
  orderReceivedDescDelivery: "The kitchen has your order. Pay cash when your order is delivered.",
  trackingDesc: "Updates automatically every 10 seconds.",
  liveStatus: "Live status",
  statusReceived: "Received",
  statusPreparing: "Preparing",
  statusReady: "Ready",
  statusServed: "Served",
  statusPaid: "Paid",
  preparingFood: "Preparing your food",
  foodReady: "Your food is ready",
  servedEnjoy: "Served — enjoy your meal",
  paidThanks: "Paid — thank you for dining with us",
  backToMenu: "Back to menu",
  payCashAtTable: "Pay cash at table",
  payCashPickup: "Pay cash on pickup",
  payCashDelivery: "Cash on delivery",
  pricesIn: "Prices in",
  openHours: "Open {hours}",
  trackOrder: "Track order",
  activeOrder: "Active order",
  updatesEvery: "Updates automatically",
  waiterCallSent: "Waiter called for Table {table}.",
  waiterAlready: "A waiter has already been called for this table.",
  waiterNeedsTable: "Call a waiter from your table QR menu.",
  billRequestSent: "Bill requested for Table {table}. Pay cash at the table.",
  billNeedsOrders: "There are no unpaid orders to bill yet.",
  billNeedsTable: "Request the bill from your table QR menu.",
  removedFromOrder: "{name} removed from your order.",
  addedToOrder: "{name}, {count} in your order.",
  resultsFor: "{count} results found for {query}.",
  dishesIn: "{count} dishes in {category}.",
  dishesOnMenu: "{count} dishes on the menu.",
  noDishesFound: "No dishes found",
  nothingHere: "Nothing here yet",
  noMatchCategory: "No dishes in {category} match “{query}”. Try another search or view the full menu.",
  noMatch: "Nothing matches “{query}”. Try a different dish or browse the full menu.",
  noDishesCategory: "There are no dishes in this category right now. View the full menu to see everything.",
  noDeals: "No deals right now. Check back soon or browse the full menu.",
  noTrending: "No trending items yet",
  noTrendingHint: "Trending is based on real order history. Items appear here as customers order them.",
  noSignature: "No signature items yet",
  noSignatureHint: "Mark a dish as Signature in the admin menu to show it here.",
  noCategoryItems: "No items in this category yet",
  noCategoryItemsHint: "This category has no dishes right now. View the full menu to see everything.",
  signatureLabel: "Signature",
  showFullMenu: "Show full menu",
  orderItems: "Order items",
  quantity: "Quantity",
  price: "Price",
  detailsRequired: "Add your name and mobile number before placing this order.",
  menuUnavailable: "Menu unavailable",
  menuUnavailableText: "The menu could not be loaded. Please ask our staff for a printed menu.",
  planExpiredTitle: "Plan expired",
  planExpired: "Plan expired. Contact support.",
  viewBill: "View bill",
  close: "Close",
  status: "Status",
  paidNote: "This bill is paid.",
  tableLocked: "{table}, locked for this order",
  requestBillAction: "Request Bill",
  noTrackedOrder: "No active order to track right now.",
  saveFailed: "Could not save on this device. Please try again.",
  tableMissing: "This menu is not linked to a table. Scan your table QR code again.",
  customerName: "Name",
  customerMobile: "Mobile",
  feedbackKicker: "Your feedback",
  feedbackTitle: "How was your meal?",
  feedbackText: "Rate your experience and leave a comment for the restaurant.",
  feedbackStarLabel: "Rate {count} out of 5",
  feedbackCommentLabel: "Comment (optional)",
  feedbackCommentPlaceholder: "Tell us what you liked or what we can improve…",
  feedbackSubmit: "Submit feedback",
  feedbackThanksTitle: "Thank you for your feedback",
  feedbackThanksText: "The restaurant will review your comment before it appears on the menu.",
  feedbackRatingRequired: "Choose a star rating first.",
  feedbackSaveFailed: "Your feedback couldn't be saved. Please try again.",
  feedbackSubmitted: "Feedback submitted. Thank you.",
  reviewsKicker: "Guest feedback",
  reviewsTitle: "What guests are saying",
  reviewTable: "Table {table}",
  reviewStars: "{stars} out of 5 stars",
};
