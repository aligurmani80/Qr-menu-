/* ==========================================================================
   APP CONTROLLER — ROUTING, REAL-TIME STATE & AUDIO NOTIFICATIONS
   ========================================================================== */

(() => {
  "use strict";

  const state = {
    session: null,
    activePage: "dashboard",
    soundEnabled: true,
    lastSeenOrderCount: 0
  };

  // Modern pleasant chime sound using Web Audio API
  function playChime() {
    if (!state.soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      const now = ctx.currentTime;
      // Tone 1: E5 (659.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.25, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.6);

      // Tone 2: G#5 (830.61 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(830.61, now + 0.12);
      gain2.gain.setValueAtTime(0.3, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.8);
    } catch (e) {
      // Audio playback fallback
    }
  }

  // Toast notifications
  function showToast(message, type = "success") {
    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div style="flex: 1;">${escapeHtml(message)}</div>
      <button style="color: #9CA3AF;" onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
      toast.style.transition = "all 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatMoney(amount) {
    const num = Number(amount) || 0;
    return `Rs. ${num.toLocaleString("en-PK")}`;
  }

  function formatTimeAgo(dateInput) {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "just now";
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  // Page Routing
  function navigate(pageId) {
    if (pageId === "super-admin" && !Auth.isSuperAdmin()) {
      navigate("dashboard");
      return;
    }

    if (Auth.isSuperAdmin()) {
      // Super Admin is STRICTLY locked to Master Control ("super-admin").
      // Super Admin must NOT be able to open or see the Admin panel from inside Super Admin at all.
      pageId = "super-admin";
    }

    state.activePage = pageId;

    // Update header page titles
    const pageTitle = document.getElementById("header-page-title");
    const pageSubtitle = document.getElementById("header-page-subtitle");
    if (pageTitle && pageSubtitle) {
      if (pageId === "super-admin") {
        pageTitle.textContent = "Super Admin Console";
        pageSubtitle.textContent = "Central master control for all restaurants, subscriptions & licensing";
      } else if (pageId === "dashboard") {
        pageTitle.textContent = "Operations Dashboard";
        pageSubtitle.textContent = "Real-time orders, digital menu, and table telemetry";
      } else if (pageId === "orders") {
        pageTitle.textContent = "Live Orders Telemetry";
        pageSubtitle.textContent = "Real-time incoming orders, preparation status & payments";
      } else if (pageId === "kitchen") {
        pageTitle.textContent = "Kitchen Display System (KDS)";
        pageSubtitle.textContent = "Chef workstation for incoming tickets & preparation times";
      } else if (pageId === "menu") {
        pageTitle.textContent = "Menu & Category Catalog";
        pageSubtitle.textContent = "Manage dishes, prices, availability, and dish photography";
      } else if (pageId === "tables") {
        pageTitle.textContent = "Tables & Digital QR Codes";
        pageSubtitle.textContent = "Instant table QR generation, customer links & layout";
      } else if (pageId === "deals") {
        pageTitle.textContent = "Offers & Combo Deals";
        pageSubtitle.textContent = "Create discounted combos, bundles and special promotions";
      } else if (pageId === "feedback") {
        pageTitle.textContent = "Guest Ratings & Feedback";
        pageSubtitle.textContent = "Customer reviews, ratings, and quality control";
      } else if (pageId === "staff") {
        pageTitle.textContent = "Staff & Waiter Access";
        pageSubtitle.textContent = "Team roster, POS PINs, and kitchen/manager permissions";
      } else if (pageId === "reports") {
        pageTitle.textContent = "Sales & Profit Analytics";
        pageSubtitle.textContent = "Real orders, revenue breakdowns, and 15-day financial telemetry";
      } else if (pageId === "settings") {
        pageTitle.textContent = "Restaurant Profile & Settings";
        pageSubtitle.textContent = "Business details, operating timings, currency & branding";
      }
    }

    // Update sidebar nav state
    document.querySelectorAll(".nav-item").forEach((item) => {
      if (item.dataset.page === pageId) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });

    // Update visible view
    document.querySelectorAll(".app-view").forEach((view) => {
      if (view.id === `view-${pageId}`) {
        view.classList.add("active");
      } else {
        view.classList.remove("active");
      }
    });

    // Close mobile sidebar if open
    const sidebar = document.querySelector(".app-sidebar");
    if (sidebar) sidebar.classList.remove("open");

    // Render corresponding page content
    if (pageId === "dashboard" && window.Dashboard) window.Dashboard.render();
    if (pageId === "orders" && window.OrdersView) window.OrdersView.render();
    if (pageId === "kitchen" && window.KitchenView) window.KitchenView.render();
    if (pageId === "menu" && window.MenuView) window.MenuView.render();
    if (pageId === "tables" && window.TablesView) window.TablesView.render();
    if (pageId === "deals" && window.DealsView) window.DealsView.render();
    if (pageId === "feedback" && window.FeedbackView) window.FeedbackView.render();
    if (pageId === "staff" && window.StaffView) window.StaffView.render();
    if (pageId === "reports" && window.ReportsView) window.ReportsView.render();
    if (pageId === "settings" && window.SettingsView) window.SettingsView.render();
    if (pageId === "super-admin" && window.SuperAdminView) window.SuperAdminView.render();

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Initialize application
  function init() {
    state.session = Auth.requireAuth();
    if (!state.session) return;

    // Check if Super Admin logged in
    const isSuper = state.session.role === "superadmin";

    // Setup Navigation visibility
    const restNav = document.getElementById("restaurant-admin-nav");
    const superNav = document.getElementById("super-admin-nav");
    const superAdminNavItem = document.getElementById("nav-super-admin");
    const soundToggle = document.getElementById("sound-toggle-btn");
    const brandSub = document.getElementById("brand-subtitle");
    const liveIndicatorText = document.getElementById("live-indicator-text");

    if (isSuper) {
      // STRICTLY HIDE all Admin navigation sections from Super Admin
      if (restNav) restNav.style.display = "none";
      if (superNav) superNav.style.display = "block";
      if (superAdminNavItem) superAdminNavItem.style.display = "flex";
      if (soundToggle) soundToggle.style.display = "none";
      if (brandSub) brandSub.textContent = "Master Control";
      if (liveIndicatorText) liveIndicatorText.textContent = "Master Control";
    } else {
      // STRICTLY HIDE Super Admin from restaurant Admin! No hint, button, or link!
      if (restNav) restNav.style.display = "block";
      if (superNav) superNav.style.display = "none";
      if (superAdminNavItem) superAdminNavItem.style.display = "none";
      if (soundToggle) soundToggle.style.display = "flex";
      if (brandSub) brandSub.textContent = "Management";
      if (liveIndicatorText) liveIndicatorText.textContent = "Live System";
    }

    // Update user info in sidebar
    const userRoleEl = document.getElementById("sidebar-user-role");
    const userNameEl = document.getElementById("sidebar-user-name");
    const userAvatarEl = document.getElementById("sidebar-user-avatar");
    if (userRoleEl) {
      userRoleEl.textContent = isSuper ? "Super Administrator" : "Restaurant Admin";
    }
    if (userNameEl) {
      const currentRestName = state.session.restaurantName || "Karahi House";
      userNameEl.textContent = isSuper ? "Super Admin" : currentRestName;
    }
    if (userAvatarEl) {
      const displayName = isSuper ? "SA" : (state.session.restaurantName || "K");
      userAvatarEl.textContent = displayName.slice(0, 2).toUpperCase();
    }

    // Setup Navigation Listeners
    document.querySelectorAll(".nav-item[data-page]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const page = btn.dataset.page;
        navigate(page);
      });
    });

    // Hash change protection
    window.addEventListener("hashchange", () => {
      const hash = (window.location.hash || "").replace("#", "");
      if (isSuper) {
        if (hash !== "super-admin") {
          window.location.hash = "super-admin";
        }
        navigate("super-admin");
      } else {
        if (hash === "super-admin") {
          window.location.hash = "dashboard";
          navigate("dashboard");
        } else if (hash) {
          navigate(hash);
        }
      }
    });

    // Mobile sidebar toggle
    const toggleBtn = document.getElementById("mobile-toggle-btn");
    const sidebar = document.querySelector(".app-sidebar");
    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener("click", () => {
        sidebar.classList.toggle("open");
      });
    }

    // Sound toggle button
    if (soundToggle) {
      soundToggle.addEventListener("click", () => {
        state.soundEnabled = !state.soundEnabled;
        soundToggle.style.opacity = state.soundEnabled ? "1" : "0.4";
        showToast(state.soundEnabled ? "Audio chime enabled" : "Audio chime muted", "info");
        if (state.soundEnabled) playChime();
      });
    }

    // Logout button
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        Auth.logout();
      });
    }

    // Setup real-time subscribers
    state.lastSeenOrderCount = DB.getOrders().length;
    DB.subscribe("orders", (orders) => {
      if (Auth.isSuperAdmin()) return;

      const currentCount = orders.length;
      if (currentCount > state.lastSeenOrderCount) {
        playChime();
        const newest = orders[0];
        showToast(`🔔 New Order #${newest.orderNumber} received for Table ${newest.tableNumber || "1"}!`, "primary");
      }
      state.lastSeenOrderCount = currentCount;

      // Update badge counts
      updatePendingBadge();

      // Rerender active view
      if (state.activePage === "dashboard" && window.Dashboard) window.Dashboard.render();
      if (state.activePage === "orders" && window.OrdersView) window.OrdersView.render();
      if (state.activePage === "kitchen" && window.KitchenView) window.KitchenView.render();
      if (state.activePage === "reports" && window.ReportsView) window.ReportsView.render();
    });

    DB.subscribe("tables", () => {
      if (Auth.isSuperAdmin()) return;
      if (state.activePage === "tables" && window.TablesView) window.TablesView.render();
      if (state.activePage === "dashboard" && window.Dashboard) window.Dashboard.render();
    });

    DB.subscribe("menu", () => {
      if (Auth.isSuperAdmin()) return;
      if (state.activePage === "menu" && window.MenuView) window.MenuView.render();
      if (state.activePage === "deals" && window.DealsView) window.DealsView.render();
    });

    DB.subscribe("feedback", () => {
      if (Auth.isSuperAdmin()) return;
      if (state.activePage === "feedback" && window.FeedbackView) window.FeedbackView.render();
    });

    DB.subscribe("restaurants", () => {
      if (state.activePage === "super-admin" && window.SuperAdminView) window.SuperAdminView.render();
    });

    // Initial render
    if (isSuper) {
      window.location.hash = "super-admin";
      navigate("super-admin");
    } else {
      updatePendingBadge();
      const initialHash = (window.location.hash || "").replace("#", "");
      navigate((initialHash && initialHash !== "super-admin") ? initialHash : "dashboard");
    }

    // Periodic live state refresh (every 10 seconds)
    setInterval(() => {
      if (state.activePage === "kitchen" && window.KitchenView) {
        window.KitchenView.updateTimers();
      }
    }, 10000);
  }

  function updatePendingBadge() {
    const orders = DB.getOrders();
    const pendingCount = orders.filter((o) => ["Received", "Preparing", "Ready"].includes(o.status)).length;
    const badge = document.getElementById("pending-orders-badge");
    if (badge) {
      badge.textContent = pendingCount;
      badge.style.display = pendingCount > 0 ? "inline-block" : "none";
    }
  }

  // Start app on DOMContentLoaded
  document.addEventListener("DOMContentLoaded", init);

  window.App = {
    state,
    navigate,
    showToast,
    playChime,
    formatMoney,
    formatTimeAgo,
    escapeHtml,
    updatePendingBadge
  };
})();
