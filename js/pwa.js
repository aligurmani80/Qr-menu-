/* ==========================================================================
   PWA SET-UP

   Public pages load this file only to register the app-shell service worker.
   Install prompts, the generated admin manifest and install buttons remain
   admin-only, so a guest never sees an install banner or button.
   ========================================================================== */

(() => {
  "use strict";

  if (typeof CONFIG === "undefined" || !CONFIG) return;

  const isAdminPath = /\/admin\//.test(window.location.pathname);
  const pageFile = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
  const INSTALL_PAGES = new Set(["login.html", "index.html", "super-login.html", "super.html"]);
  const canInstall = isAdminPath && INSTALL_PAGES.has(pageFile);

  const restaurant = CONFIG.restaurant || {};
  const name = String(restaurant.name || "Restaurant").trim() || "Restaurant";
  const shortName = name.length > 12 ? name.slice(0, 12).trim() : name;

  const scriptUrl = document.currentScript && document.currentScript.src
    ? document.currentScript.src
    : window.location.href;
  const baseUrl = new URL("../", scriptUrl);
  const assetUrl = (path) => new URL(path, baseUrl).href;
  const adminUrl = (path) => new URL(`admin/${path}`, baseUrl).href;

  const installIcon =
    '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="M12 4v10M8 10.5l4 4 4-4M5 19h14"></path>' +
    "</svg>";

  let deferredPrompt = null;
  let tipTimer = 0;

  const isStandalone = () =>
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  function addManifest() {
    const manifest = {
      id: adminUrl(""),
      name: `${name} Admin`,
      short_name: shortName || "Admin",
      description: `${name} admin for orders, tables and the menu.`,
      lang: "en",
      start_url: adminUrl("login.html?source=pwa"),
      scope: adminUrl(""),
      display: "standalone",
      orientation: "any",
      background_color: "#000000",
      theme_color: "#FF5A00",
      categories: ["business", "food"],
      prefer_related_applications: false,
      icons: [
        {
          src: assetUrl("assets/icon-192.png"),
          sizes: "192x192",
          type: "image/png",
          purpose: "any",
        },
        {
          src: assetUrl("assets/icon-512.png"),
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        },
      ],
    };

    const manifestLink = document.createElement("link");
    manifestLink.rel = "manifest";
    manifestLink.href = URL.createObjectURL(
      new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" })
    );
    document.head.appendChild(manifestLink);

    const appleIcon = document.createElement("link");
    appleIcon.rel = "apple-touch-icon";
    appleIcon.href = assetUrl("assets/apple-touch-icon.png");
    document.head.appendChild(appleIcon);

    [
      ["mobile-web-app-capable", "yes"],
      ["apple-mobile-web-app-capable", "yes"],
      ["apple-mobile-web-app-status-bar-style", "black-translucent"],
      ["apple-mobile-web-app-title", shortName || "Admin"],
    ].forEach(([metaName, content]) => {
      const meta = document.createElement("meta");
      meta.name = metaName;
      meta.content = content;
      document.head.appendChild(meta);
    });
  }

  function addInstallStyles() {
    if (document.getElementById("pwa-install-styles")) return;
    const style = document.createElement("style");
    style.id = "pwa-install-styles";
    style.textContent =
      ".pwa-install-btn{width:100%;margin-top:14px}" +
      ".pwa-install-top{flex:none}" +
      ".pwa-install-tip{position:fixed;z-index:120;left:50%;bottom:22px;transform:translateX(-50%);" +
      "max-width:min(420px,calc(100vw - 32px));margin:0;padding:10px 14px;border:1px solid #D8D2C7;" +
      "border-radius:11px;background:#FFFFFF;color:var(--ink,#2B2A26);font-size:12px;font-weight:600;" +
      "line-height:1.45;text-align:center;box-shadow:0 18px 40px -22px rgba(15,46,31,.45)}" +
      ".pwa-install-tip[hidden]{display:none}" +
      "@media(max-width:900px){.pwa-install-top{width:38px;height:38px;padding:0;border-radius:11px}" +
      ".pwa-install-top .pwa-install-label{display:none}}";
    document.head.appendChild(style);
  }

  function showTip() {
    let tip = document.getElementById("pwa-install-tip");
    if (!tip) {
      tip = document.createElement("p");
      tip.id = "pwa-install-tip";
      tip.className = "pwa-install-tip";
      tip.setAttribute("role", "status");
      document.body.appendChild(tip);
    }

    const onPhone = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    tip.textContent = onPhone
      ? "Open the browser menu and choose “Add to Home Screen”."
      : "Use the install icon in Chrome’s address bar.";
    tip.hidden = false;
    window.clearTimeout(tipTimer);
    tipTimer = window.setTimeout(() => {
      tip.hidden = true;
    }, 7000);
  }

  async function requestInstall() {
    if (!deferredPrompt) {
      showTip();
      return;
    }

    const promptEvent = deferredPrompt;
    deferredPrompt = null;

    try {
      promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice && choice.outcome === "accepted") removeInstallUi();
    } catch {
      showTip();
    }
  }

  function makeButton(className) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.setAttribute("data-pwa-install", "");
    button.setAttribute("aria-label", "Install the admin app");
    button.title = "Install the admin app";
    button.innerHTML = `${installIcon}<span class="pwa-install-label">Install app</span>`;
    button.addEventListener("click", requestInstall);
    return button;
  }

  function injectLoginButton() {
    const form = document.getElementById("login-form");
    if (!form || document.querySelector("[data-pwa-install]")) return;
    form.insertAdjacentElement("afterend", makeButton("btn btn-secondary pwa-install-btn"));
  }

  function injectDashboardButton() {
    const actions = document.querySelector("#admin-root .topbar-actions");
    if (!actions || actions.querySelector("[data-pwa-install]")) return;
    actions.insertBefore(makeButton("btn btn-secondary btn-sm pwa-install-top"), actions.firstChild);
  }

  function removeInstallUi() {
    document.querySelectorAll("[data-pwa-install]").forEach((button) => button.remove());
    const tip = document.getElementById("pwa-install-tip");
    if (tip) tip.remove();
  }

  function syncInstallUi() {
    if (!canInstall || isStandalone()) {
      removeInstallUi();
      return;
    }

    if (pageFile === "login.html" || pageFile === "super-login.html") {
      injectLoginButton();
    } else {
      injectDashboardButton();
    }
  }

  function watchAdminShell() {
    const root = document.getElementById("admin-root");
    if (!root) return;

    const observer = new MutationObserver(() => {
      if (isStandalone()) {
        observer.disconnect();
        removeInstallUi();
        return;
      }
      syncInstallUi();
    });
    observer.observe(root, { childList: true, subtree: true });
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    if (window.location.protocol !== "http:" && window.location.protocol !== "https:") return;

    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register(`${assetUrl("sw.js")}?v=20261113h`, { scope: assetUrl("") })
        .then((registration) => registration.update().catch(() => {}))
        .catch(() => {
          // The admin still works online; installability silently stays off.
        });
    });
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    if (!canInstall) return;
    event.preventDefault();
    deferredPrompt = event;
    syncInstallUi();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    removeInstallUi();
  });

  const standaloneQuery = window.matchMedia("(display-mode: standalone)");
  if (standaloneQuery.addEventListener) standaloneQuery.addEventListener("change", syncInstallUi);
  else if (standaloneQuery.addListener) standaloneQuery.addListener(syncInstallUi);

  if (canInstall) {
    addManifest();
    addInstallStyles();
    syncInstallUi();
    window.addEventListener("DOMContentLoaded", syncInstallUi);
    watchAdminShell();
  }

  registerServiceWorker();
})();
