/* ==========================================================================
   RESTAURANT PUBLIC PAGE

   Restaurant name, logo, address, phone, WhatsApp and opening hours all come
   from config.js. Nothing on this page is hard-coded per restaurant.
   ========================================================================== */

(() => {
  "use strict";

  if (typeof CONFIG === "undefined" || !CONFIG) return;

  const restaurant = CONFIG.restaurant || {};
  const $ = (id) => document.getElementById(id);
  const setText = (id, value) => {
    const node = $(id);
    if (node) node.textContent = String(value == null ? "" : value);
  };

  const name = String(restaurant.name || "Restaurant").trim() || "Restaurant";
  const city = String(restaurant.city || "").trim();
  const address = String(restaurant.address || "").trim();
  const phone = String(restaurant.phone || "").trim();
  const whatsapp = String(restaurant.whatsappNumber || "").trim();
  const hours = String(restaurant.openingTiming || "").trim();
  const logo = String(restaurant.logo || "").trim();

  const isPlaceholder = (value) => !value || /^\[.*\]$/.test(value);
  const phoneDigits = isPlaceholder(phone) ? "" : phone.replace(/\D/g, "");
  const whatsappDigits = isPlaceholder(whatsapp) ? "" : whatsapp.replace(/\D/g, "");
  const hasPhone = phoneDigits.length >= 7;
  const hasWhatsApp = whatsappDigits.length >= 8;

  const initials =
    name
      .split(/\s+/)
      .map((word) => word.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase() || "R";

  /* ------------------------------------------------------------------------
     SEO
     ------------------------------------------------------------------------ */

  const pageTitle = `${name}${city ? ` | ${city}` : ""} | Menu`;
  const pageDescription = `View the ${name} menu, opening hours and contact details.${
    city ? ` Located in ${city}.` : ""
  }`;
  document.title = pageTitle;
  [
    ['meta[name="description"]', pageDescription],
    ['meta[property="og:title"]', pageTitle],
    ['meta[property="og:description"]', pageDescription],
  ].forEach(([selector, value]) => {
    const node = document.querySelector(selector);
    if (node) node.setAttribute("content", value);
  });

  /* ------------------------------------------------------------------------
     Branding
     ------------------------------------------------------------------------ */

  document.querySelectorAll("#brand-name, #card-name, #footer-name, #footer-copyright").forEach((node) => {
    node.textContent = name;
  });
  document.querySelectorAll("#brand-mark, #card-mark").forEach((node) => {
    node.textContent = initials;
  });

  const brandLogo = $("brand-logo");
  const brandMark = $("brand-mark");
  if (brandLogo && logo) {
    brandLogo.src = logo;
    brandLogo.alt = `${name} logo`;
    brandLogo.hidden = false;
    if (brandMark) brandMark.hidden = true;
    brandLogo.addEventListener("error", () => {
      brandLogo.hidden = true;
      if (brandMark) brandMark.hidden = false;
    });
  }

  const footerLogo = $("footer-logo");
  if (footerLogo) {
    if (logo) {
      footerLogo.src = logo;
      footerLogo.alt = `${name} logo`;
    } else {
      footerLogo.hidden = true;
    }
  }

  /* ------------------------------------------------------------------------
     Hero and contact details
     ------------------------------------------------------------------------ */

  setText("hero-title", name);
  setText(
    "hero-description",
    `Fresh food, honest prices and a QR menu that opens straight from your table.${
      city ? ` Serving ${city}.` : ""
    }`
  );
  setText("hero-city", city || "Dine-in and takeaway");
  setText("hero-hours", hours || "Opening hours shared at the counter");

  setText("card-address", isPlaceholder(address) ? "Ask our staff for directions" : address);
  setText("card-phone", hasPhone ? phone : "Call us for orders");
  setText("card-hours", hours || "Open daily");

  setText("visit-address", isPlaceholder(address) ? city || "Address available at the restaurant" : address);
  setText("visit-hours", hours || "Contact us for today's timings");
  setText("visit-phone", hasPhone ? phone : "Phone number coming soon");

  const heroWhatsApp = $("hero-wa");
  if (heroWhatsApp) {
    if (hasWhatsApp) {
      heroWhatsApp.href = `https://wa.me/${whatsappDigits}`;
      heroWhatsApp.target = "_blank";
      heroWhatsApp.rel = "noopener noreferrer";
      heroWhatsApp.hidden = false;
    } else {
      heroWhatsApp.hidden = true;
    }
  }

  const contactWhatsApp = $("contact-wa");
  if (contactWhatsApp) {
    if (hasWhatsApp) {
      contactWhatsApp.href = `https://wa.me/${whatsappDigits}`;
      contactWhatsApp.target = "_blank";
      contactWhatsApp.rel = "noopener noreferrer";
      contactWhatsApp.hidden = false;
    } else {
      contactWhatsApp.hidden = true;
    }
  }

  const contactCall = $("contact-call");
  if (contactCall) {
    if (hasPhone) {
      contactCall.href = `tel:${phoneDigits}`;
      contactCall.hidden = false;
    } else {
      contactCall.hidden = true;
    }
  }

  setText("footer-year", new Date().getFullYear());
  setText("contact-title", `Talk to ${name}`);

  const themePrimary =
    (CONFIG.theme && CONFIG.theme.colors && CONFIG.theme.colors.primary) || "#0F2E1F";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", themePrimary);
})();
