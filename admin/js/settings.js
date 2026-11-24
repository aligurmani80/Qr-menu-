/* ==========================================================================
   SETTINGS VIEW — RESTAURANT PROFILE & SYSTEM PREFERENCES
   ========================================================================== */

(() => {
  "use strict";

  function render() {
    const container = document.getElementById("view-settings");
    if (!container) return;

    const s = DB.getSettings();

    container.innerHTML = `
      <div class="menu-toolbar">
        <div>
          <h3 style="font-size: 16px; font-weight: 700; color: #FFF; margin-bottom: 2px;">Restaurant Profile & System Settings</h3>
          <p style="font-size: 12px; color: var(--text-dim);">Manage business hours, contact numbers, logo and sound notifications.</p>
        </div>

        <button class="btn btn-primary btn-sm" onclick="SettingsView.saveProfile(event)">
          <span>Save Changes</span>
        </button>
      </div>

      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px;">
        <div class="table-wrap" style="padding: 24px;">
          <h4 style="font-size: 15px; font-weight: 700; margin-bottom: 16px; color: #FFF;">General Restaurant Information</h4>
          
          <form id="settings-form" onsubmit="SettingsView.saveProfile(event)">
            <div class="form-group">
              <label class="form-label">Restaurant Public Name</label>
              <input class="form-control" type="text" id="set-rest-name" value="${App.escapeHtml(s.restaurantName)}">
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div class="form-group">
                <label class="form-label">Contact Phone</label>
                <input class="form-control" type="text" id="set-phone" value="${App.escapeHtml(s.phone)}">
              </div>

              <div class="form-group">
                <label class="form-label">WhatsApp Number</label>
                <input class="form-control" type="text" id="set-whatsapp" value="${App.escapeHtml(s.whatsapp)}">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div class="form-group">
                <label class="form-label">City</label>
                <input class="form-control" type="text" id="set-city" value="${App.escapeHtml(s.city)}">
              </div>

              <div class="form-group">
                <label class="form-label">Address</label>
                <input class="form-control" type="text" id="set-address" value="${App.escapeHtml(s.address)}">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div class="form-group">
                <label class="form-label">Opening Timing</label>
                <input class="form-control" type="text" id="set-timing" value="${App.escapeHtml(s.openingTiming)}">
              </div>

              <div class="form-group">
                <label class="form-label">Payment Instruction / Note</label>
                <input class="form-control" type="text" id="set-payment-note" value="${App.escapeHtml(s.paymentNote)}">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Logo Path or URL</label>
              <input class="form-control" type="text" id="set-logo" value="${App.escapeHtml(s.logo)}">
            </div>

            <button type="submit" class="btn btn-primary" style="margin-top: 8px;">Save Restaurant Details</button>
          </form>
        </div>

        <!-- SIDEBAR WIDGETS -->
        <div style="display: flex; flex-direction: column; gap: 20px;">
          <div class="table-wrap" style="padding: 20px;">
            <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 12px; color: #FFF;">Audio Notifications</h4>
            <p style="font-size: 12px; color: var(--text-dim); margin-bottom: 16px;">Test the real-time order arrival sound.</p>
            <button class="btn btn-secondary btn-sm" onclick="App.playChime()">
              <span>🔔 Play Sample Chime</span>
            </button>
          </div>

          <div class="table-wrap" style="padding: 20px;">
            <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 8px; color: #FFF;">Real-time Backend Status</h4>
            <div style="display: flex; align-items: center; gap: 8px; margin: 12px 0;">
              <span class="pulse-dot"></span>
              <strong style="color: var(--success); font-size: 13px;">Active & Synchronized</strong>
            </div>
            <p style="font-size: 11px; color: var(--text-dim); line-height: 1.4;">
              Sync Engine: Dual Firebase + Sub-millisecond Local Broadcast.
            </p>
          </div>
        </div>
      </div>
    `;
  }

  function saveProfile(event) {
    if (event) event.preventDefault();
    const restaurantName = document.getElementById("set-rest-name").value.trim();
    const phone = document.getElementById("set-phone").value.trim();
    const whatsapp = document.getElementById("set-whatsapp").value.trim();
    const city = document.getElementById("set-city").value.trim();
    const address = document.getElementById("set-address").value.trim();
    const openingTiming = document.getElementById("set-timing").value.trim();
    const paymentNote = document.getElementById("set-payment-note").value.trim();
    const logo = document.getElementById("set-logo").value.trim();

    DB.saveSettings({
      restaurantName,
      phone,
      whatsapp,
      city,
      address,
      openingTiming,
      paymentNote,
      logo
    });

    App.showToast("Settings saved successfully", "success");
    render();
  }

  window.SettingsView = {
    render,
    saveProfile
  };
})();
