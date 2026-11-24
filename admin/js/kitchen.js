/* ==========================================================================
   KITCHEN DISPLAY SYSTEM (KDS) VIEW — CHEF EXPEDITE CONSOLE
   ========================================================================== */

(() => {
  "use strict";

  function render() {
    const container = document.getElementById("view-kitchen");
    if (!container) return;

    const orders = DB.getOrders();
    // Kitchen only cares about Received and Preparing orders
    const activeKitchenOrders = orders.filter((o) => ["Received", "Preparing"].includes(o.status));

    container.innerHTML = `
      <div class="menu-toolbar">
        <div>
          <h3 style="font-size: 16px; font-weight: 700; color: #FFF; margin-bottom: 2px;">Kitchen Expedite Station (KDS)</h3>
          <p style="font-size: 12px; color: var(--text-dim);">Live chef display. Orders turn amber after 8 mins and red after 15 mins.</p>
        </div>

        <div style="display: flex; gap: 10px; align-items: center;">
          <span class="live-indicator">
            <span class="pulse-dot"></span>
            <span>Live Kitchen Feed (${activeKitchenOrders.length})</span>
          </span>
        </div>
      </div>

      <div class="kds-grid">
        ${activeKitchenOrders.length ? activeKitchenOrders.map((order) => {
          const createdAt = new Date(order.time || order.createdAt || Date.now());
          const minsElapsed = Math.floor((Date.now() - createdAt.getTime()) / 60000);
          const isUrgent = minsElapsed >= 15;
          const isWarning = minsElapsed >= 8 && !isUrgent;
          const timerColor = isUrgent ? 'var(--danger)' : isWarning ? 'var(--warning)' : 'var(--success)';

          return `
            <div class="kds-card ${isUrgent ? 'urgent' : ''}" id="kds-${order.orderNumber}">
              <div class="kds-header">
                <div>
                  <strong style="font-size: 16px; color: var(--primary);">#${App.escapeHtml(order.orderNumber)}</strong>
                  <span style="margin-left: 8px; font-weight: 700; color: #FFF;">Table ${order.tableNumber || order.mode || '1'}</span>
                </div>
                <div class="kds-timer" style="color: ${timerColor};">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  <span>${minsElapsed}m elapsed</span>
                </div>
              </div>

              <div class="kds-body">
                <div class="kds-items-list">
                  ${(order.items || []).map((item, idx) => `
                    <div class="kds-item" onclick="this.classList.toggle('done')">
                      <div class="kds-qty">${item.quantity || item.qty || 1}</div>
                      <div style="flex: 1;">
                        <strong style="color: #FFF;">${App.escapeHtml(item.name || item.title)}</strong>
                        ${item.notes ? `<div style="font-size: 11px; color: var(--warning);">Note: ${App.escapeHtml(item.notes)}</div>` : ''}
                      </div>
                    </div>
                  `).join("")}
                </div>
              </div>

              <div class="kds-footer">
                ${order.status === "Received" ? `
                  <button class="btn btn-primary" style="width: 100%;" onclick="KitchenView.updateStatus('${order.orderNumber}', 'Preparing')">
                    🍳 Start Preparing Order
                  </button>
                ` : `
                  <button class="btn btn-success" style="width: 100%;" onclick="KitchenView.updateStatus('${order.orderNumber}', 'Ready')">
                    🔔 Order Ready for Pickup
                  </button>
                `}
              </div>
            </div>
          `;
        }).join("") : `
          <div class="empty-state" style="grid-column: 1 / -1; padding: 60px 20px;">
            <div class="empty-state-icon">👨‍🍳</div>
            <h4>Kitchen is all clear!</h4>
            <p>No pending kitchen orders waiting at the moment.</p>
          </div>
        `}
      </div>
    `;
  }

  function updateStatus(orderNumber, status) {
    DB.updateOrderStatus(orderNumber, status);
    App.showToast(`Order #${orderNumber} marked as ${status}`, "success");
    render();
  }

  function updateTimers() {
    render();
  }

  window.KitchenView = {
    render,
    updateStatus,
    updateTimers
  };
})();
