/* ==========================================================================
   KARAHI HOUSE — QR MENU CONFIGURATION (PHASE 1)

   SAMPLE ONLY. "Karahi House", the menu items and all prices below are
   placeholders for demonstration. They must be replaced with the real
   restaurant's details before this menu is used publicly.

   FOOD PHOTOS: the images in /assets are sample photography. Replace them
   with real restaurant photos (keep the same filenames or update image paths).

   Everything a restaurant needs to change — name, table default, currency,
   categories, menu, WhatsApp placeholder and theme colors — lives in CONFIG.
   ========================================================================== */

const CONFIG = {
  restaurant: {
    // SAMPLE restaurant name — replace with the real restaurant name.
    name: "Karahi House",

    // Placeholder only. Replace with the real number when it is available.
    whatsappNumber: "[RESTAURANT_WHATSAPP_NUMBER]",
  },

  admin: {
    // PHASE 2 LOGIN PLACEHOLDERS.
    // Replace these two values with the owner's real credentials before going
    // live. Until then the literal placeholders below are the demo login.
    credentials: {
      username: "[ADMIN_USERNAME]",
      password: "[ADMIN_PASSWORD]",
    },
    // Front-end-only session flag. A real login must move to a backend later.
    sessionKey: "karahiHouse.adminSession.v1",
  },

  // Shared localStorage keys used by the customer menu and the admin pages.
  // Change a key only if you also migrate existing browser data.
  storage: {
    menuKey: "karahiHouse.menu.v1",
    settingsKey: "karahiHouse.settings.v1",
    tablesKey: "karahiHouse.tables.v1",
    offersKey: "karahiHouse.offers.v1",
    dealsKey: "karahiHouse.deals.v1",
    cartKey: "karahiHouse.cart.v1",
    staffKey: "karahiHouse.staff.v1",
    soundKey: "karahiHouse.soundEnabled.v1",
    waiterCallsKey: "karahiHouse.waiterCalls.v1",
    billRequestsKey: "karahiHouse.billRequests.v1",
    myOrdersKey: "karahiHouse.myOrders.v1",
    feedbackKey: "karahiHouse.feedback.v1",
  },

  table: {
    defaultNumber: 5,
    queryParam: "table",
  },

  currency: {
    symbol: "Rs.",
    locale: "en-PK",
    maximumFractionDigits: 0,
  },

  // Order here is the order used in the category pills and full menu.
  // This is the final ten-category menu structure.
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

  menu: [
    {
      id: "chicken-tikka",
      name: "Chicken Tikka",
      description: "Tender grilled bonfire chicken, spices & lemon",
      price: 520, // SAMPLE price in PKR.
      category: "bbq",
      image: "assets/chicken-tikka.jpg", // SAMPLE photo — replace with a real restaurant photo.
      popular: true,
      active: true,
    },
    {
      id: "zinger-burger",
      name: "Zinger Burger",
      description: "Crispy chicken burger with mayo & lettuce",
      price: 480, // SAMPLE price in PKR.
      category: "fast-food",
      image: "assets/zinger-burger.jpg", // SAMPLE photo — replace with a real restaurant photo.
      popular: true,
      active: true,
    },
    {
      id: "chicken-karahi",
      name: "Chicken Karahi",
      description: "Classic spicy karahi with garlic & ginger",
      price: 450, // SAMPLE price in PKR.
      category: "desi",
      image: "assets/chicken-karahi.jpg", // SAMPLE photo — replace with a real restaurant photo.
      popular: true,
      active: true,
    },
    {
      id: "beef-biryani",
      name: "Beef Biryani",
      description: "Beef biryani with raita",
      price: 350, // SAMPLE price in PKR.
      category: "desi",
      image: "assets/beef-biryani.jpg", // SAMPLE photo — replace with a real restaurant photo.
      popular: false,
      active: true,
    },
    {
      id: "seekh-kebab",
      name: "Seekh Kebab",
      description: "Seekh kebab 6 pcs with mint chutney",
      price: 600, // SAMPLE price in PKR.
      category: "bbq",
      image: "assets/seekh-kebab.jpg", // SAMPLE photo — replace with a real restaurant photo.
      popular: true,
      active: true,
    },
    {
      id: "mint-lassi",
      name: "Mint Lassi",
      description: "Fresh mint lassi",
      price: 150, // SAMPLE price in PKR.
      category: "drinks",
      image: "assets/mint-lassi.jpg", // SAMPLE photo — replace with a real restaurant photo.
      popular: false,
      active: true,
    },
    {
      id: "cold-drink",
      name: "Cold Drink",
      description: "Cold drink 345ml",
      price: 120, // SAMPLE price in PKR.
      category: "drinks",
      image: "assets/cold-drink.jpg", // SAMPLE photo — replace with a real restaurant photo.
      popular: false,
      active: true,
    },
    {
      id: "naan",
      name: "Naan",
      description: "Tandoori naan",
      price: 50, // SAMPLE price in PKR.
      category: "desi",
      image: "assets/naan.jpg", // SAMPLE photo — replace with a real restaurant photo.
      popular: false,
      active: true,
    },
    {
      id: "chicken-tikka-pizza",
      name: "Chicken Tikka Pizza",
      description: "SAMPLE item — chicken tikka pizza, editable or deletable in admin",
      price: 850, // SAMPLE price in PKR.
      category: "pizza",
      image: "assets/chicken-tikka-pizza.jpg", // SAMPLE photo — replace with a real restaurant photo.
      popular: false,
      active: true,
      signature: false,
      sample: true,
    },
    {
      id: "chicken-alfredo-pasta",
      name: "Chicken Alfredo Pasta",
      description: "SAMPLE item — creamy chicken alfredo pasta, editable or deletable in admin",
      price: 650, // SAMPLE price in PKR.
      category: "pasta",
      image: "assets/chicken-alfredo-pasta.jpg", // SAMPLE photo — replace with a real restaurant photo.
      popular: false,
      active: true,
      signature: false,
      sample: true,
    },
  ],

  payment: {
    // Cash only in Phase 3B. Do not add wallet, card or bank details here yet.
    note: "Pay cash at table",
    takeawayNote: "Pay cash on pickup",
    deliveryNote: "Cash on delivery",
  },

  delivery: {
    // SAMPLE delivery charge in PKR. Change this value; every new delivery
    // order adds it to the customer total. No online payment is collected.
    charge: 150,
  },

  orders: {
    storageKey: "karahiHouse.orders.v1",
    sequenceKey: "karahiHouse.orderSequence.v1",
    startingNumber: 1025,
    initialStatus: "Received",
  },

  // Editable from the admin Settings page. These values are the defaults used
  // when the browser has not saved any settings yet.
  settings: {
    logo: "", // Uploaded from admin Settings; empty shows the QR mark.
    openingTiming: "12:00 pm – 11:00 pm",
  },

  tables: {
    // SAMPLE default tables only. Add, rename or delete them from the admin.
    defaults: [
      { number: 1, name: "Table 1" },
      { number: 2, name: "Table 2" },
      { number: 3, name: "Table 3" },
      { number: 4, name: "Table 4" },
      { number: 5, name: "Table 5" },
      { number: 6, name: "Table 6" },
      { number: 7, name: "Table 7" },
      { number: 8, name: "Table 8" },
      { number: 9, name: "Table 9" },
      { number: 10, name: "Table 10" },
      { number: 11, name: "Table 11" },
      { number: 12, name: "Table 12" },
    ],
  },

  // No sample offers. The admin creates them, and only active offers within
  // their date range appear on the customer menu.
  offers: [],

  theme: {
    // These are applied to the UI as CSS custom properties at runtime.
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

/* ==========================================================================
   COPY — ENGLISH CUSTOMER MENU STRINGS

   Every customer-facing phrase used by js/main.js. The menu is English-only;
   food item names and descriptions come from CONFIG. Edit the wording here.
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
  mobilePlaceholder: "03xx xxxxxxx",
  addressPlaceholder: "House, street, area, city",
  detailsForTakeaway: "Name and mobile number are required for takeaway.",
  detailsForDelivery: "Name, mobile number and address are required for delivery.",
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
  noCategoryItems: "No items in this category yet",
  noCategoryItemsHint: "This category has no dishes right now. View the full menu to see everything.",
  signatureLabel: "Signature",
  showFullMenu: "Show full menu",
  orderItems: "Order items",
  quantity: "Quantity",
  price: "Price",
  detailsRequired: "Add your name and mobile number before placing this order.",
  addressRequired: "Add your delivery address before placing this order.",
  menuUnavailable: "Menu unavailable",
  menuUnavailableText: "The menu could not be loaded. Please ask our staff for a printed menu.",
  viewBill: "View bill",
  close: "Close",
  status: "Status",
  paidNote: "This bill is paid.",
  tableLocked: "{table}, locked for this order",
  requestBillAction: "Request Bill",
  noTrackedOrder: "No active order to track right now.",
  saveFailed: "Could not save on this device. Please try again.",
  tableMissing: "This menu is not linked to a table. Scan your table QR code again.",
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

