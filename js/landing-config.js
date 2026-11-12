/* ==========================================================================
   KARAHI HOUSE — PHASE 5 SALES LANDING PAGE CONFIGURATION

   Every plan price, contact detail and SEO value for landing.html lives here.
   Replace the WhatsApp placeholder before sharing the page publicly.
   ========================================================================== */

const LANDING_CONFIG = {
  brand: {
    name: "Karahi House",
    product: "QR Menu System",
    logo: "assets/favicon.svg",
  },

  seo: {
    title: "Karahi House QR Menu System | Rs. 2,000/month",
    description:
      "Restaurant ke liye QR menu, live orders, kitchen display, reports aur WhatsApp alerts. Har mahine sirf Rs. 2,000 se shuru. Karahi House ka demo dekhein.",
  },

  currency: {
    symbol: "Rs.",
    locale: "en-PK",
  },

  nav: {
    links: [
      { label: "Features", href: "#features" },
      { label: "Plans", href: "#plans" },
      { label: "Demo", href: "#demo" },
      { label: "Contact", href: "#contact" },
    ],
    loginLabel: "Login",
    loginHref: "admin/login.html",
  },

  hero: {
    kicker: "Restaurant QR Menu System",
    title: "Apne Restaurant ka QR Menu Banwayen",
    priceTemplate: "Har Mahine Sirf Rs. {price} se Shuru",
    description:
      "Guest QR scan kare, menu khule, order place ho aur kitchen tak pohnche — sab kuch ek system mein. Simple English menu, live tracking aur WhatsApp alerts ke saath.",
    primaryCta: "Demo Dekhen - Karahi House",
    secondaryCta: "WhatsApp par Rabta Karen",
    points: ["Guest app ki zaroorat nahi", "English-only menu", "Cash payments pehle jaisi"],
    checkKicker: "Sample menu",
    checkTable: "Table 05",
    checkStamp: "SAMPLE",
    checkFooter: "Sample dishes · 12 demo tables",
  },

  features: {
    kicker: "Features",
    title: "Ek menu, poora restaurant system",
    text: "QR menu sirf shuruaat hai. Orders, kitchen, staff aur reports bhi ek hi jagah chalti hain.",
    items: [
      {
        icon: "qr",
        title: "QR Menu",
        text: "Har table ka apna QR code. Guest scan kare aur menu turant khul jaye.",
      },
      {
        icon: "receipt",
        title: "Live Orders",
        text: "Naya order aate hi admin dashboard par Received se Paid tak live nazar aata hai.",
      },
      {
        icon: "flame",
        title: "Kitchen Display",
        text: "Kitchen ko sirf Received aur Preparing tickets milte hain, poori screen par.",
      },
      {
        icon: "chart",
        title: "Reports",
        text: "Din, hafte aur mahine ki sales, best sellers aur table activity ek jagah.",
      },
      {
        icon: "users",
        title: "Staff Roles",
        text: "Owner, Manager, Kitchen aur Waiter ke alag logins aur alag permissions.",
      },
      {
        icon: "whatsapp",
        title: "WhatsApp Alerts",
        text: "Naya order aaye to WhatsApp par alert, taake koi order miss na ho.",
      },
      {
        icon: "globe",
        title: "English Menu",
        text: "Poora menu, live tracking aur bill — sab kuch simple English mein.",
      },
    ],
  },

  plans: {
    kicker: "Plans",
    title: "Simple monthly plans",
    text: "Setup free. Koi hidden charge nahi. Har plan ke saath WhatsApp support.",
    note: "Prices per month. Setup aur training included.",
    cta: "WhatsApp par poochhein",
    popularLabel: "Sab se zyada pasand",
    message: "Assalam-o-Alaikum! Mujhe {plan} plan ({price} per month) ke baare mein maloomat chahiye.",
    items: [
      {
        id: "basic",
        name: "Basic",
        price: 2000,
        tagline: "Chhote restaurant ke liye simple shuruaat.",
        features: ["1 restaurant", "50 menu items", "QR menu only", "English-only menu"],
      },
      {
        id: "standard",
        name: "Standard",
        price: 3500,
        tagline: "Roz orders lene wale restaurant ke liye.",
        features: ["Unlimited menu items", "Live orders", "Kitchen display", "Sales reports"],
        popular: true,
      },
      {
        id: "premium",
        name: "Premium",
        price: 5000,
        tagline: "Poora system, delivery aur offers ke saath.",
        features: ["All Standard features", "Home delivery", "Offers & promotions", "Staff roles"],
      },
    ],
  },

  demo: {
    kicker: "Sample demo",
    title: "Demo Dekhen - Karahi House",
    text:
      "10 sample dishes, 12 tables, live tracking, waiter call aur bill request — sab kuch asli system jaisa. Table 5 already locked hai.",
    cta: "Demo Dekhen - Karahi House",
    href: "demo/karahi-house/?table=5",
    note: "SAMPLE data only. Demo ke orders demo restaurant mein hi rehte hain.",
    highlights: [
      "10 sample dishes",
      "12 tables with QR",
      "Live order tracking",
      "English menu",
    ],
  },

  steps: {
    kicker: "How it works",
    title: "3 simple steps",
    text: "Demo se live tak — ek din ka kaam.",
    items: [
      {
        title: "Demo Dekhen",
        text: "Karahi House ka demo menu aur admin khud try karein. Koi signup nahi.",
      },
      {
        title: "WhatsApp par Rabta Karen",
        text: "Apne restaurant ka naam, menu aur tables bhejein. Hum plan aur setup discuss karenge.",
      },
      {
        title: "1 Din Mein Live Ho Jayen",
        text: "Menu, QR codes aur staff logins set karke aapka restaurant live ho jata hai.",
      },
    ],
  },

  contact: {
    kicker: "Get started",
    title: "Aaj hi apna QR menu shuru karein",
    text:
      "WhatsApp par message karein. Hum demo, plans aur setup ki poori tafseel bhej denge.",
    whatsappNumber: "[YOUR_WHATSAPP_NUMBER]",
    whatsappDisplay: "[YOUR_WHATSAPP_NUMBER]",
    button: "WhatsApp par Message Karen",
    message:
      "Assalam-o-Alaikum! Mujhe restaurant ke liye QR menu system chahiye. Please demo, plans aur setup ki details bhejein.",
    note: "Message karein — hum aapko demo link, plan details aur setup steps bhej denge.",
  },

  footer: {
    text: "Restaurant QR menu, live orders aur kitchen display — Pakistan ke restaurants ke liye.",
    links: [
      { label: "Features", href: "#features" },
      { label: "Plans", href: "#plans" },
      { label: "Demo", href: "#demo" },
      { label: "Contact", href: "#contact" },
      { label: "Admin Login", href: "admin/login.html" },
    ],
    copyright: "Karahi House QR Menu System",
  },
};
