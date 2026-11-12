/* ==========================================================================
   KARAHI HOUSE — PHASE 5 SALES LANDING PAGE

   All copy, prices and contact details are rendered from LANDING_CONFIG in
   js/landing-config.js. The guest check pulls the SAMPLE dishes from
   js/demo-data.js so the demo menu stays the single source of sample data.
   ========================================================================== */

(() => {
  "use strict";

  const config = typeof LANDING_CONFIG !== "undefined" ? LANDING_CONFIG : null;
  if (!config) return;

  const $ = (id) => document.getElementById(id);

  const escapeHtml = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (character) => {
      const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
      return map[character];
    });

  const icon = (name) =>
    `<svg class="icon" aria-hidden="true"><use href="#icon-${escapeHtml(name)}"></use></svg>`;

  const setText = (id, value) => {
    const node = $(id);
    if (node) node.textContent = String(value ?? "");
  };

  const currency = config.currency && config.currency.symbol ? config.currency.symbol : "Rs.";
  const locale = config.currency && config.currency.locale ? config.currency.locale : "en-PK";
  const formatNumber = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return "0";
    try {
      return new Intl.NumberFormat(locale).format(number);
    } catch {
      return String(number);
    }
  };

  const whatsappDigits = String((config.contact && config.contact.whatsappNumber) || "").replace(/\D/g, "");
  const hasWhatsApp = whatsappDigits.length >= 8;

  function whatsappHref(message) {
    if (!hasWhatsApp) return "#contact";
    const text = message ? `?text=${encodeURIComponent(message)}` : "";
    return `https://wa.me/${whatsappDigits}${text}`;
  }

  function applyExternalLink(anchor, href) {
    if (!anchor) return;
    anchor.href = href;
    if (/^https:\/\//.test(href)) {
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
    }
  }

  /* ------------------------------------------------------------------------
     SEO
     ------------------------------------------------------------------------ */

  const seo = config.seo || {};
  if (seo.title) document.title = seo.title;
  if (seo.description) {
    const description = document.querySelector('meta[name="description"]');
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (description) description.setAttribute("content", seo.description);
    if (ogDescription) ogDescription.setAttribute("content", seo.description);
  }
  if (seo.title) {
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", seo.title);
  }

  /* ------------------------------------------------------------------------
     Navigation and footer
     ------------------------------------------------------------------------ */

  const navLinks = $("nav-links");
  if (navLinks) {
    navLinks.innerHTML = (config.nav?.links || [])
      .map((link) => `<li><a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a></li>`)
      .join("");
  }

  const headerLogin = $("header-login");
  if (headerLogin) {
    if (config.nav?.loginHref) headerLogin.href = config.nav.loginHref;
    headerLogin.innerHTML = `${escapeHtml(config.nav?.loginLabel || "Login")} ${icon("arrow-right")}`;
  }

  const footerLinks = $("footer-links");
  if (footerLinks) {
    footerLinks.innerHTML = (config.footer?.links || [])
      .map((link) => `<li><a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a></li>`)
      .join("");
  }
  setText("footer-text", config.footer?.text);
  setText("footer-copyright", config.footer?.copyright);
  setText("footer-year", new Date().getFullYear());

  /* ------------------------------------------------------------------------
     Hero
     ------------------------------------------------------------------------ */

  const hero = config.hero || {};
  const plans = Array.isArray(config.plans?.items) ? config.plans.items : [];
  const prices = plans
    .map((plan) => Number(plan.price))
    .filter((price) => Number.isFinite(price) && price > 0);
  const startingPrice = prices.length ? Math.min(...prices) : 0;

  setText("hero-kicker", hero.kicker);

  const heroTitle = $("hero-title");
  if (heroTitle) {
    const title = String(hero.title || "");
    const highlightIndex = title.indexOf("QR Menu");
    if (highlightIndex > -1) {
      heroTitle.innerHTML =
        `${escapeHtml(title.slice(0, highlightIndex))}<span class="hl">${escapeHtml(
          title.slice(highlightIndex, highlightIndex + "QR Menu".length)
        )}</span>${escapeHtml(title.slice(highlightIndex + "QR Menu".length))}`;
    } else {
      heroTitle.textContent = title;
    }
  }

  if (startingPrice > 0) {
    setText(
      "hero-price",
      String(hero.priceTemplate || "Har Mahine Sirf Rs. {price} se Shuru").replace(
        "{price}",
        formatNumber(startingPrice)
      )
    );
  } else {
    const priceLine = $("hero-price");
    if (priceLine) priceLine.hidden = true;
  }

  setText("hero-description", hero.description);

  const heroDemo = $("hero-demo");
  if (heroDemo) {
    heroDemo.href = config.demo?.href || "#demo";
    const label = $("hero-demo-label");
    if (label) label.textContent = hero.primaryCta || "Demo Dekhen";
  }

  const heroWhatsapp = $("hero-wa");
  if (heroWhatsapp) {
    applyExternalLink(heroWhatsapp, whatsappHref(config.contact?.message || ""));
    const label = $("hero-wa-label");
    if (label) label.textContent = hero.secondaryCta || "WhatsApp par Rabta Karen";
  }

  const heroPoints = $("hero-points");
  if (heroPoints) {
    heroPoints.innerHTML = (hero.points || [])
      .map((point) => `<li>${icon("check")}<span>${escapeHtml(point)}</span></li>`)
      .join("");
  }

  /* ------------------------------------------------------------------------
     Guest check signature (SAMPLE demo dishes)
     ------------------------------------------------------------------------ */

  const demoMenu = Array.isArray(window.DemoData?.menu) ? window.DemoData.menu : [];
  const checkItems = demoMenu.slice(0, 4);
  const heroVisual = $("hero-visual");

  if (checkItems.length) {
    const itemList = $("check-items");
    let total = 0;
    if (itemList) {
      itemList.innerHTML = checkItems
        .map((item) => {
          const price = Number(item.price) || 0;
          total += price;
          return (
            `<li class="check-item">` +
            `<span class="check-item-name">${escapeHtml(item.name)}</span>` +
            `<span class="check-item-leader" aria-hidden="true"></span>` +
            `<span class="check-item-price">${escapeHtml(formatNumber(price))}</span>` +
            `</li>`
          );
        })
        .join("");
    }

    setText("check-kicker", hero.checkKicker);
    setText("check-table", hero.checkTable);
    setText("check-stamp", hero.checkStamp);
    setText("check-footer", hero.checkFooter);
    setText("check-total", `${currency} ${formatNumber(total)}`);
  } else if (heroVisual) {
    heroVisual.hidden = true;
  }

  /* ------------------------------------------------------------------------
     Features
     ------------------------------------------------------------------------ */

  const features = config.features || {};
  setText("features-kicker", features.kicker);
  setText("features-title", features.title);
  setText("features-text", features.text);

  const featureGrid = $("feature-grid");
  if (featureGrid) {
    featureGrid.innerHTML = (features.items || [])
      .map((item, index, items) => {
        const wide = index === items.length - 1 ? " feature-card--wide" : "";
        return (
          `<article class="feature-card${wide}">` +
          `<span class="feature-icon">${icon(item.icon)}</span>` +
          `<h3>${escapeHtml(item.title)}</h3>` +
          `<p>${escapeHtml(item.text)}</p>` +
          `</article>`
        );
      })
      .join("");
  }

  /* ------------------------------------------------------------------------
     Plans
     ------------------------------------------------------------------------ */

  const planSection = config.plans || {};
  setText("plans-kicker", planSection.kicker);
  setText("plans-title", planSection.title);
  setText("plans-text", planSection.text);
  setText("plans-note", planSection.note);

  const planGrid = $("plan-grid");
  if (planGrid) {
    planGrid.innerHTML = plans
      .map((plan) => {
        const popular = Boolean(plan.popular);
        const message = String(planSection.message || "")
          .replace("{plan}", plan.name)
          .replace("{price}", `${currency} ${formatNumber(plan.price)}`);
        const href = whatsappHref(message);
        const target = /^https:\/\//.test(href) ? ' target="_blank" rel="noopener noreferrer"' : "";
        const featureItems = (plan.features || [])
          .map(
            (feature) =>
              `<li><span class="plan-check">${icon("check")}</span><span>${escapeHtml(feature)}</span></li>`
          )
          .join("");

        return (
          `<article class="plan-card${popular ? " plan-card--popular" : ""}">` +
          (popular ? `<span class="plan-badge">${escapeHtml(planSection.popularLabel)}</span>` : "") +
          `<h3 class="plan-name">${escapeHtml(plan.name)}</h3>` +
          `<p class="plan-tagline">${escapeHtml(plan.tagline)}</p>` +
          `<p class="plan-price">` +
          `<span class="plan-currency">${escapeHtml(currency)}</span>` +
          `<span class="plan-amount">${escapeHtml(formatNumber(plan.price))}</span>` +
          `<span class="plan-period">per month</span>` +
          `</p>` +
          `<ul class="plan-features">${featureItems}</ul>` +
          `<a class="btn ${popular ? "btn-primary" : "btn-outline"}" href="${escapeHtml(href)}"${target}>` +
          `${icon("whatsapp")}<span>${escapeHtml(planSection.cta)}</span>` +
          `</a>` +
          `</article>`
        );
      })
      .join("");
  }

  /* ------------------------------------------------------------------------
     Demo panel
     ------------------------------------------------------------------------ */

  const demo = config.demo || {};
  setText("demo-kicker", demo.kicker);
  setText("demo-title", demo.title);
  setText("demo-text", demo.text);
  setText("demo-note", demo.note);

  const demoHighlights = $("demo-highlights");
  if (demoHighlights) {
    demoHighlights.innerHTML = (demo.highlights || [])
      .map((highlight) => `<li>${icon("check")}${escapeHtml(highlight)}</li>`)
      .join("");
  }

  const demoCta = $("demo-cta");
  if (demoCta) {
    demoCta.href = demo.href || "#demo";
    demoCta.innerHTML = `${escapeHtml(demo.cta || "Demo Dekhen")} ${icon("arrow-right")}`;
  }

  const demoWhatsapp = $("demo-wa");
  if (demoWhatsapp) {
    applyExternalLink(demoWhatsapp, whatsappHref(config.contact?.message || ""));
  }
  setText("demo-wa-label", hero.secondaryCta || "WhatsApp par Rabta Karen");

  /* ------------------------------------------------------------------------
     How it works
     ------------------------------------------------------------------------ */

  const steps = config.steps || {};
  setText("steps-kicker", steps.kicker);
  setText("steps-title", steps.title);
  setText("steps-text", steps.text);

  const stepsList = $("steps-list");
  if (stepsList) {
    stepsList.innerHTML = (steps.items || [])
      .map(
        (step, index) =>
          `<li class="step">` +
          `<span class="step-num" aria-hidden="true">${index + 1}</span>` +
          `<h3>${escapeHtml(step.title)}</h3>` +
          `<p>${escapeHtml(step.text)}</p>` +
          `</li>`
      )
      .join("");
  }

  /* ------------------------------------------------------------------------
     Contact
     ------------------------------------------------------------------------ */

  const contact = config.contact || {};
  setText("contact-kicker", contact.kicker);
  setText("contact-title", contact.title);
  setText("contact-text", contact.text);
  setText("contact-number", contact.whatsappDisplay || contact.whatsappNumber || "");
  setText("contact-wa-label", contact.button);
  setText("contact-note", contact.note);

  const contactWhatsapp = $("contact-wa");
  if (contactWhatsapp) {
    applyExternalLink(contactWhatsapp, whatsappHref(contact.message || ""));
  }
})();
