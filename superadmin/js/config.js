/* ==========================================================================
   KARAHI HOUSE — PHASE 4 SUPER ADMIN CONFIGURATION

   Every default plan, price, payment placeholder and login credential for
   the Super Admin console lives here. The console never hardcodes these
   values in another file.

   IMPORTANT: credentials and payment account numbers below are placeholders.
   Replace them with the real values before this console is used publicly.
   ========================================================================== */

const SUPERADMIN_CONFIG = {
  platformName: "Karahi House",
  consoleName: "Super Admin",

  credentials: {
    username: "[SUPER_ADMIN_USERNAME]",
    password: "[SUPER_ADMIN_PASSWORD]",
  },

  sessionKey: "karahiHouse.superadminSession.v1",
  plansKey: "karahiHouse.plans.v1",
  paymentsKey: "karahiHouse.payments.v1",
  onboardingKey: "karahiHouse.onboarding.v1",

  // The sales demo restaurant is created from js/demo-data.js. Its ID is fixed
  // so the shareable demo link and demo admin stay the same.
  demo: {
    restaurantId: "demo-karahi-house",
    path: "../demo/karahi-house/",
    defaultTable: 5,
  },

  // Per-restaurant launch checklist saved in the console.
  onboardingItems: [
    { id: "restaurant", label: "Restaurant Added" },
    { id: "menu", label: "Menu Items Added" },
    { id: "tables", label: "Tables and QR Printed" },
    { id: "staff", label: "Staff Added" },
    { id: "test-order", label: "Test Order Placed" },
    { id: "payment", label: "Plan Paid and Active" },
  ],

  // Every new restaurant gets its next due date this many days after its
  // start date, and every recorded payment pushes the due date this far out.
  billingCycleDays: 30,

  // SAMPLE plan catalogue. Edit prices or features here, or use the Plans
  // page in the console. Nothing else in the project stores these numbers.
  plans: [
    {
      id: "basic",
      name: "Basic",
      price: 2000,
      period: "month",
      features: ["1 restaurant", "50 menu items", "QR Menu only"],
    },
    {
      id: "standard",
      name: "Standard",
      price: 3500,
      period: "month",
      features: ["Unlimited menu items", "Orders + WhatsApp alerts", "Sales reports"],
    },
    {
      id: "premium",
      name: "Premium",
      price: 5000,
      period: "month",
      features: ["All Standard features", "Home Delivery", "Offers & promotions"],
    },
  ],

  paymentMethods: ["JazzCash", "Easypaisa", "Bank Transfer", "Cash"],

  // Placeholders only. Never write a real account number in project code.
  paymentDetails: [
    { label: "JazzCash", value: "[JAZZCASH_NUMBER]" },
    { label: "Easypaisa", value: "[EASYPAISA_NUMBER]" },
    { label: "Bank", value: "[BANK_ACCOUNT]" },
  ],

  reminderTemplate:
    "Hello {owner}, this is a reminder from {platform}. The {plan} plan for {restaurant} ({amount}) was due on {dueDate}. Please renew to keep the restaurant menu active.",
};
