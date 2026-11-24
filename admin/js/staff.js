/* ==========================================================================
   STAFF ROLES & ACCESS MANAGEMENT VIEW
   ========================================================================== */

(() => {
  "use strict";

  function render() {
    const container = document.getElementById("view-staff");
    if (!container) return;

    const staffList = DB.getStaff();

    container.innerHTML = `
      <div class="menu-toolbar">
        <div>
          <h3 style="font-size: 16px; font-weight: 700; color: #FFF; margin-bottom: 2px;">Restaurant Staff & Shift Roles</h3>
          <p style="font-size: 12px; color: var(--text-dim);">Manage team members, roles, contact numbers, and POS passcodes.</p>
        </div>

        <button class="btn btn-primary btn-sm" onclick="StaffView.openAddModal()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span>Add Staff Member</span>
        </button>
      </div>

      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Member Name</th>
              <th>Assigned Role</th>
              <th>Phone Number</th>
              <th>Passcode / PIN</th>
              <th>Status</th>
              <th style="text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${staffList.map((s) => `
              <tr>
                <td><strong>${App.escapeHtml(s.name)}</strong></td>
                <td><span class="status-badge badge-received">${App.escapeHtml(s.role)}</span></td>
                <td>${App.escapeHtml(s.phone || 'N/A')}</td>
                <td><code style="background: rgba(255,255,255,0.06); padding: 2px 8px; border-radius: 4px;">••••</code></td>
                <td><span class="status-badge ${s.active !== false ? 'badge-served' : 'badge-cancelled'}">${s.active !== false ? 'Active' : 'Inactive'}</span></td>
                <td style="text-align: right;">
                  <button class="btn btn-secondary btn-xs" onclick="StaffView.toggleActive('${s.id}')">${s.active !== false ? 'Deactivate' : 'Activate'}</button>
                  <button class="btn btn-danger btn-xs" onclick="StaffView.deleteStaff('${s.id}')">Remove</button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>

      <!-- ADD STAFF MODAL -->
      <div id="staff-modal" class="modal-overlay">
        <div class="modal-window">
          <div class="modal-header">
            <h3 class="modal-title">Add Staff Member</h3>
            <button class="modal-close" onclick="StaffView.closeAddModal()">✕</button>
          </div>
          <form onsubmit="StaffView.handleSave(event)">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label" for="staff-name">Full Name *</label>
                <input class="form-control" type="text" id="staff-name" required placeholder="e.g. Asad Ali">
              </div>

              <div class="form-group">
                <label class="form-label" for="staff-role">Role *</label>
                <select class="form-control" id="staff-role" required>
                  <option value="Manager">Manager</option>
                  <option value="Kitchen Chef">Kitchen Chef / Cook</option>
                  <option value="Waiter">Floor Waiter</option>
                  <option value="Cashier">Cashier</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label" for="staff-phone">Mobile Phone</label>
                <input class="form-control" type="text" id="staff-phone" placeholder="0300-1234567">
              </div>

              <div class="form-group">
                <label class="form-label" for="staff-pin">4-Digit PIN / Passcode</label>
                <input class="form-control" type="password" id="staff-pin" maxlength="6" placeholder="e.g. 1234">
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="StaffView.closeAddModal()">Cancel</button>
              <button type="submit" class="btn btn-primary">Save Member</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  function openAddModal() {
    const modal = document.getElementById("staff-modal");
    if (!modal) return;
    document.getElementById("staff-name").value = "";
    document.getElementById("staff-phone").value = "";
    document.getElementById("staff-pin").value = "";
    modal.classList.add("active");
  }

  function closeAddModal() {
    const modal = document.getElementById("staff-modal");
    if (modal) modal.classList.remove("active");
  }

  function handleSave(event) {
    event.preventDefault();
    const name = document.getElementById("staff-name").value.trim();
    const role = document.getElementById("staff-role").value;
    const phone = document.getElementById("staff-phone").value.trim();
    const pin = document.getElementById("staff-pin").value.trim();

    const list = DB.getStaff();
    list.push({
      id: `staff-${Date.now()}`,
      name,
      role,
      phone,
      pin,
      active: true
    });
    DB.saveStaff(list);
    closeAddModal();
    App.showToast(`Added ${name} to team`, "success");
    render();
  }

  function toggleActive(id) {
    const list = DB.getStaff();
    const m = list.find((s) => s.id === id);
    if (m) {
      m.active = !m.active;
      DB.saveStaff(list);
      render();
    }
  }

  function deleteStaff(id) {
    if (confirm("Remove this staff member?")) {
      const list = DB.getStaff().filter((s) => s.id !== id);
      DB.saveStaff(list);
      App.showToast("Staff member removed", "info");
      render();
    }
  }

  window.StaffView = {
    render,
    openAddModal,
    closeAddModal,
    handleSave,
    toggleActive,
    deleteStaff
  };
})();
