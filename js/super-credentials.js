/* ==========================================================================
   SUPER ADMIN LOGIN — verified inside Postgres

   app_settings is locked down: the browser key can no longer select, insert,
   update or delete it. Instead three SECURITY DEFINER functions are called:

     super_admin_login_setup(username, password)      → creates the login once
     super_admin_login_ok(username, password)         → true / false only
     super_admin_login_change(..., ..., ..., ...)     → true / false only

   The stored password is a SHA-256 hash computed by Postgres, and this file
   never receives a password back from the database, so there is nothing to
   leak. What the browser keeps locally is the username plus a hash of the last
   password this device saw, used only when the network is unreachable.

   Passwords — plain or hashed — are never logged and never rendered.
   ========================================================================== */

(() => {
  "use strict";

  const SETTINGS_KEY = "super_admin";
  const HASH_PATTERN = /^[a-f0-9]{64}$/;

  function configuredClient() {
    try {
      if (typeof supabase === "undefined" || !supabase) return null;
      if (typeof supabaseClient === "undefined" || !supabaseClient) return null;
      return supabaseClient;
    } catch {
      return null;
    }
  }

  function remoteAvailable() {
    return Boolean(configuredClient());
  }

  function isMissingFunction(error) {
    const code = String((error && error.code) || "");
    const message = String((error && error.message) || "").toLowerCase();
    return code === "PGRST202" || message.indexOf("could not find the function") !== -1;
  }

  async function sha256Hex(value) {
    const text = String(value || "");
    if (!text) return "";
    try {
      const subtle = window.crypto && window.crypto.subtle;
      if (!subtle || !subtle.digest) return "";
      const buffer = await subtle.digest("SHA-256", new TextEncoder().encode(text));
      return Array.from(new Uint8Array(buffer))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
    } catch {
      return "";
    }
  }

  function readCached() {
    if (typeof Tenant === "undefined" || typeof Tenant.getSuperAdmin !== "function") {
      return { username: "", passwordHash: "" };
    }
    const credentials = Tenant.getSuperAdmin() || {};
    return {
      username: String(credentials.username || "").trim(),
      passwordHash: String(credentials.passwordHash || "").toLowerCase(),
    };
  }

  function cacheCredentials(credentials) {
    if (typeof Tenant === "undefined" || typeof Tenant.saveSuperCredentials !== "function") {
      return false;
    }
    try {
      Tenant.saveSuperCredentials(credentials);
      return true;
    } catch {
      return false;
    }
  }

  function configCredentials() {
    if (typeof Tenant === "undefined" || typeof Tenant.getSuperAdminFromConfig !== "function") {
      return { username: "", password: "" };
    }
    const fallback = Tenant.getSuperAdminFromConfig() || {};
    return {
      username: String(fallback.username || "").trim(),
      password: String(fallback.password || ""),
    };
  }

  async function call(name, args) {
    const client = configuredClient();
    if (!client) return { ok: false, unavailable: true };

    try {
      const result = await client.rpc(name, args);
      if (result.error) {
        return { ok: false, unavailable: isMissingFunction(result.error), value: false };
      }
      return { ok: true, value: result.data === true };
    } catch {
      return { ok: false, unavailable: true };
    }
  }

  // Creates the app_settings login from config.js the first time only. Postgres
  // refuses to touch a row that already exists, so this can never reset a
  // password somebody changed on another device.
  async function prepareRemote() {
    if (!remoteAvailable()) return false;

    const fallback = configCredentials();
    if (!fallback.username || fallback.password.length < 8) return false;

    const result = await call("super_admin_login_setup", {
      p_username: fallback.username,
      p_password: fallback.password,
    });
    return Boolean(result.ok && result.value);
  }

  async function verify(credentials) {
    const username = String((credentials && credentials.username) || "").trim();
    const password = String((credentials && credentials.password) || "");
    if (!username || !password) return { ok: false, message: "Wrong username or password" };

    let remote = { ok: false, unavailable: !remoteAvailable() };
    if (remoteAvailable()) {
      remote = await call("super_admin_login_ok", {
        p_username: username,
        p_password: password,
      });
      if (!remote.ok && !remote.unavailable) {
        // First run on a project whose app_settings row is still missing.
        if (await prepareRemote()) {
          remote = await call("super_admin_login_ok", {
            p_username: username,
            p_password: password,
          });
        }
      }
    }

    if (remote.ok) {
      if (remote.value) {
        const passwordHash = await sha256Hex(password);
        if (passwordHash) cacheCredentials({ username, passwordHash });
        return { ok: true, source: "app_settings" };
      }
      return { ok: false, message: "Wrong username or password" };
    }

    // No answer from Supabase: fall back to what this device already knows.
    const cached = readCached();
    const cachedHash = cached.passwordHash || (await sha256Hex(configCredentials().password));
    const attempted = await sha256Hex(password);
    if (
      attempted &&
      HASH_PATTERN.test(cachedHash) &&
      cached.username.toLowerCase() === username.toLowerCase() &&
      attempted === cachedHash
    ) {
      return { ok: true, source: "offline" };
    }

    return {
      ok: false,
      message: remote.unavailable
        ? "The login server is unreachable. Check the connection and try again."
        : "Wrong username or password",
    };
  }

  async function change(request) {
    const source = request && typeof request === "object" ? request : {};
    const username = String(source.username || "").trim();
    const currentPassword = String(source.currentPassword || "");
    const newUsername = String(source.newUsername || "").trim();
    const newPassword = String(source.newPassword || "");

    if (!username || !currentPassword) {
      return { ok: false, message: "Current password is incorrect" };
    }
    if (newPassword && newPassword.length < 8) {
      return { ok: false, message: "The new password must be at least 8 characters." };
    }

    if (remoteAvailable()) {
      let result = await call("super_admin_login_change", {
        p_username: username,
        p_current_password: currentPassword,
        p_new_username: newUsername,
        p_new_password: newPassword,
      });

      if (!result.ok && !result.unavailable) {
        if (await prepareRemote()) {
          result = await call("super_admin_login_change", {
            p_username: username,
            p_current_password: currentPassword,
            p_new_username: newUsername,
            p_new_password: newPassword,
          });
        }
      }

      if (result.ok && result.value === true) {
        const finalUsername = newUsername || username;
        const passwordHash = await sha256Hex(newPassword || currentPassword);
        if (passwordHash) cacheCredentials({ username: finalUsername, passwordHash });
        return { ok: true, username: finalUsername, source: "app_settings" };
      }

      if (result.ok && result.value === false) {
        return { ok: false, message: "Current password is incorrect" };
      }

      // Supabase was reached but refused, or the request never landed. A login
      // change must never be pretended on this device only.
      return {
        ok: false,
        message: "The login could not be saved in Supabase. Nothing was changed.",
      };
    }

    // No Supabase client configured at all: keep this device usable.
    const cached = readCached();
    const cachedHash = cached.passwordHash || (await sha256Hex(configCredentials().password));
    const currentHash = await sha256Hex(currentPassword);
    if (
      !currentHash ||
      !HASH_PATTERN.test(cachedHash) ||
      cached.username.toLowerCase() !== username.toLowerCase() ||
      currentHash !== cachedHash
    ) {
      return { ok: false, message: "Current password is incorrect" };
    }

    const finalUsername = newUsername || username;
    const passwordHash = await sha256Hex(newPassword || currentPassword);
    if (!passwordHash || !cacheCredentials({ username: finalUsername, passwordHash })) {
      return { ok: false, message: "This browser blocked the login storage." };
    }
    return { ok: true, username: finalUsername, source: "local" };
  }

  window.SuperAuth = {
    SETTINGS_KEY,
    remoteAvailable,
    verify,
    change,
  };
})();
