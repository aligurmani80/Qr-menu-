/* ==========================================================================
   AUTHENTICATION & SECRET SUPER ADMIN SESSION MANAGEMENT
   Single Login Entry Point — Role-based Isolation
   ========================================================================== */

(() => {
  "use strict";

  const ADMIN_SESSION_KEY = "qrMenu.v2.adminSession";
  const SUPER_SESSION_KEY = "qrMenu.v2.superAdminSession";
  const CURRENT_SESSION_KEY = "qrMenu.v2.activePortalSession";

  // PLACEHOLDER CREDENTIALS — Ali boss sets real usernames and passwords.
  // Super Admin can also update the Restaurant Admin credentials from the control panel.
  const DEFAULT_ADMIN_CREDS = {
    username: "admin",
    password: "admin1234"
  };

  const DEFAULT_SUPER_CREDS = {
    username: "superadmin",
    password: "superadmin123"
  };

  function getStoredAdminCreds() {
    // Check if overrides exist in control or custom storage
    try {
      const control = JSON.parse(localStorage.getItem("qrMenu.v2.control") || "{}");
      if (control.admin && control.admin.username && control.admin.password) {
        return {
          username: control.admin.username,
          password: control.admin.password
        };
      }
      const custom = JSON.parse(localStorage.getItem("qrMenu.v2.adminCredentials") || "{}");
      if (custom.username && custom.password) {
        return custom;
      }
    } catch {
      // fallback
    }
    return DEFAULT_ADMIN_CREDS;
  }

  function getStoredSuperCreds() {
    try {
      const custom = JSON.parse(localStorage.getItem("qrMenu.v2.superCredentials") || "{}");
      if (custom.username && custom.password) {
        return custom;
      }
    } catch {
      // fallback
    }
    return DEFAULT_SUPER_CREDS;
  }

  function getSession() {
    try {
      const sessionRaw = sessionStorage.getItem(CURRENT_SESSION_KEY) || localStorage.getItem(CURRENT_SESSION_KEY);
      if (sessionRaw) {
        return JSON.parse(sessionRaw);
      }
    } catch {
      return null;
    }
    return null;
  }

  function login(username, password, remember = true) {
    const u = String(username || "").trim();
    const p = String(password || "");

    const superCreds = getStoredSuperCreds();
    const adminCreds = getStoredAdminCreds();

    // 1. Check Super Admin credentials
    if (u === superCreds.username && p === superCreds.password) {
      const session = {
        role: "superadmin",
        username: u,
        loggedInAt: new Date().toISOString()
      };
      sessionStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(session));
      sessionStorage.setItem(SUPER_SESSION_KEY, "1");
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
      if (remember) {
        localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(session));
        localStorage.setItem(SUPER_SESSION_KEY, "1");
        localStorage.removeItem(ADMIN_SESSION_KEY);
      }
      return { success: true, role: "superadmin" };
    }

    // 2. Check registered restaurants in DB
    const dbObj = (typeof window !== "undefined" && window.DB) ? window.DB : (typeof global !== "undefined" && global.DB ? global.DB : null);
    if (dbObj && typeof dbObj.getRestaurants === "function") {
      const restaurants = dbObj.getRestaurants();
      const matchedRest = restaurants.find((r) => 
        String(r.adminUsername || "").trim().toLowerCase() === u.toLowerCase() && 
        String(r.adminPassword || "") === p
      );

      if (matchedRest) {
        if (matchedRest.disabled || matchedRest.status === "Disabled") {
          return { success: false, message: "This restaurant account has been disabled. Please contact Super Admin." };
        }
        const session = {
          role: "admin",
          username: matchedRest.adminUsername,
          restaurantId: matchedRest.id,
          restaurantName: matchedRest.restaurantName,
          loggedInAt: new Date().toISOString()
        };
        sessionStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(session));
        sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
        sessionStorage.removeItem(SUPER_SESSION_KEY);
        if (remember) {
          localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(session));
          localStorage.setItem(ADMIN_SESSION_KEY, "1");
          localStorage.removeItem(SUPER_SESSION_KEY);
        }
        return { success: true, role: "admin", restaurant: matchedRest };
      }
    }

    // 3. Fallback: Check Default Restaurant Admin credentials
    if (u === adminCreds.username && p === adminCreds.password) {
      const session = {
        role: "admin",
        username: u,
        restaurantId: "default",
        restaurantName: "Karahi House",
        loggedInAt: new Date().toISOString()
      };
      sessionStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(session));
      sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
      sessionStorage.removeItem(SUPER_SESSION_KEY);
      if (remember) {
        localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(session));
        localStorage.setItem(ADMIN_SESSION_KEY, "1");
        localStorage.removeItem(SUPER_SESSION_KEY);
      }
      return { success: true, role: "admin" };
    }

    // Invalid credentials
    return { success: false, message: "Wrong username or password" };
  }

  function logout() {
    sessionStorage.removeItem(CURRENT_SESSION_KEY);
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    sessionStorage.removeItem(SUPER_SESSION_KEY);
    localStorage.removeItem(CURRENT_SESSION_KEY);
    localStorage.removeItem(ADMIN_SESSION_KEY);
    localStorage.removeItem(SUPER_SESSION_KEY);
    window.location.replace("login.html");
  }

  function updateAdminCredentials(newUsername, newPassword, restaurantId = null) {
    const session = getSession();
    if (!session || session.role !== "superadmin") {
      throw new Error("Unauthorized: Only Super Admin can change credentials.");
    }
    if (!newUsername || newPassword.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }

    const next = {
      username: String(newUsername).trim(),
      password: String(newPassword)
    };

    if (restaurantId && restaurantId !== "default") {
      const dbObj = (typeof window !== "undefined" && window.DB) ? window.DB : (typeof global !== "undefined" && global.DB ? global.DB : null);
      if (dbObj && typeof dbObj.updateRestaurant === "function") {
        dbObj.updateRestaurant(restaurantId, {
          adminUsername: next.username,
          adminPassword: next.password
        });
        return true;
      }
    }

    localStorage.setItem("qrMenu.v2.adminCredentials", JSON.stringify(next));

    // Also sync to control object for customer site compatibility
    try {
      const control = JSON.parse(localStorage.getItem("qrMenu.v2.control") || "{}");
      control.admin = {
        username: next.username,
        password: next.password
      };
      localStorage.setItem("qrMenu.v2.control", JSON.stringify(control));
    } catch (e) {
      console.error("Failed to update control key:", e);
    }

    return true;
  }

  function isSuperAdmin() {
    const session = getSession();
    return Boolean(session && session.role === "superadmin");
  }

  function requireAuth() {
    const session = getSession();
    if (!session || !session.role) {
      window.location.replace("login.html");
      return null;
    }
    return session;
  }

  window.Auth = {
    login,
    logout,
    getSession,
    isSuperAdmin,
    requireAuth,
    updateAdminCredentials,
    getStoredAdminCreds,
    getStoredSuperCreds
  };
})();
