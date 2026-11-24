/* ==========================================================================
   DASHBOARD VIEW — TOP BIG STATS & DUAL ORDER FLOW
   Today's Total Orders, Today's Profit (BIG), Received & Completed Lists
   ========================================================================== */

(() => {
  "use strict";

  function render() {
    const container = document.getElementById("view-dashboard");
    if (!container) return;

    const stats = DB.getTodayStats();
    const allOrders = DB.getOrders();
    const tables = DB.getTables();
    const todayKey = new Date().toISOString().slice(0, 10);

    // Filter today's orders
    const todayOrders = allOrders.filter((order) => {
      const d = (order.time || order.createdAt || "").slice(0, 10);
      return d === todayKey;
    });

    // Today's Received & Active Orders (Received, Preparing, Ready) - newest first
    const receivedOrders = todayOrders.filter((o) => ["Received", "Preparing", "Ready"].includes(o.status));

    // Today's Completed Orders (Served, Paid) - newest first
    const completedOrders = todayOrders.filter((o) => ["Served", "Paid"].includes(o.status));

    container.innerHTML = `
      <!-- TOP BIG HERO STATS -->
      <div class="hero-stats-grid">
        <div class="hero-stat-card card-orders">
          <div class="hero-stat-glow"></div>
          <div class="hero-stat-top">
            <span class="hero-stat-label">Today's Total Orders</span>
            <div class="hero-stat-icon-pill">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
              </svg>
            </div>
          </div>
          <div class="hero-stat-value" id="today-total-orders-big">${stats.todayOrdersCount}</div>
          <div class="hero-stat-note">
            <span>Real orders placed today</span>
            <span class="hero-stat-rule">0 if no orders</span>
          </div>
        </div>

        <div class="hero-stat-card card-profit">
          <div class="hero-stat-glow"></div>
          <div class="hero-stat-top">
            <span class="hero-stat-label">Today's Profit</span>
            <div class="hero-stat-icon-pill">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
            </div>
          </div>
          <div class="hero-stat-value" id="today-profit-big">${App.formatMoney(stats.todayProfit)}</div>
          <div class="hero-stat-note">
            <span>${App.formatMoney(stats.awaitingPayment)} awaiting payment</span>
            <span class="hero-stat-rule">Rule: Paid Orders Only</span>
          </div>
        </div>
      </div>

      <!-- SECONDARY METRICS -->
      <div class="secondary-stats-grid">
        <div class="mini-stat-card">
          <div class="mini-stat-icon" style="color: var(--warning);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <div class="mini-stat-meta">
            <span>Pending Orders</span>
            <strong>${stats.pendingOrdersCount}</strong>
          </div>
        </div>

        <div class="mini-stat-card">
          <div class="mini-stat-icon" style="color: var(--info);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
          </div>
          <div class="mini-stat-meta">
            <span>Total Tables</span>
            <strong>${tables.length}</strong>
          </div>
        </div>

        <div class="mini-stat-card">
          <div class="mini-stat-icon" style="color: var(--primary);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
          </div>
          <div class="mini-stat-meta">
            <span>Today's Total Sales</span>
            <strong>${App.formatMoney(stats.todaySales)}</strong>
          </div>
        </div>

        <div class="mini-stat-card">
          <div class="mini-stat-icon" style="color: var(--success);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <div class="mini-stat-meta">
            <span>Completed Orders</span>
            <strong>${completedOrders.length}</strong>
          </div>
        </div>
      </div>

      <!-- DUAL REAL-TIME ORDER LISTS (ON THE SAME DASHBOARD PAGE) -->
      <div class="dashboard-orders-dual">
        <!-- LEFT: TODAY'S RECEIVED & ACTIVE ORDERS -->
        <div class="orders-panel">
          <div class="panel-header">
            <div class="panel-header-left">
              <h3 class="panel-title">
                <span>Today's Received Orders</span>
                <span class="panel-count panel-badge-orange">${receivedOrders.length}</span>
              </h3>
            </div>
            <span style="font-size: 11px; color: var(--text-dim);">Newest First</span>
          </div>

          <div class="panel-body">
            ${receivedOrders.length ? receivedOrders.map((order) => renderOrderCard(order)).join("") : `
              <div class="empty-state">
                <div class="empty-state-icon">📥</div>
                <h4>No active orders</h4>
                <p>New orders placed by customers will appear here instantly.</p>
              </div>
            `}
          </div>
        </div>

        <!-- RIGHT: TODAY'S COMPLETED ORDERS (SERVED & PAID) -->
        <div class="orders-panel">
          <div class="panel-header">
            <div class="panel-header-left">
              <h3 class="panel-title">
                <span>Today's Completed Orders</span>
                <span class="panel-count panel-badge-green">${completedOrders.length}</span>
              </h3>
            </div>
            <span style="font-size: 11px; color: var(--text-dim);">Served & Paid</span>
          </div>

          <div class="panel-body">
            ${completedOrders.length ? completedOrders.map((order) => renderOrderCard(order)).join("") : `
              <div class="empty-state">
                <div class="empty-state-icon">✅</div>
                <h4>No completed orders yet</h4>
                <p>Orders marked as Served or Paid will be listed here.</p>
              </div>
            `}
          </div>
        </div>
      </div>
    `;
  }

  function renderOrderCard(order) {
    const total = DB.getOrderTotal(order);
    const items = Array.isArray(order.items) ? order.items : [];
    const status = order.status || "Received";
    const statusClass = `badge-${status.toLowerCase()}`;

    // Calculate next status action
    let nextActionBtn = "";
    if (status === "Received") {
      nextActionBtn = `<button class="btn btn-advance" onclick="Dashboard.advanceStatus('${order.orderNumber}', 'Preparing')">Start Preparing →</button>`;
    } else if (status === "Preparing") {
      nextActionBtn = `<button class="btn btn-advance" style="background: var(--info);" onclick="Dashboard.advanceStatus('${order.orderNumber}', 'Ready')">Mark Ready →</button>`;
    } else if (status === "Ready") {
      nextActionBtn = `<button class="btn btn-advance" style="background: var(--success);" onclick="Dashboard.advanceStatus('${order.orderNumber}', 'Served')">Mark Served →</button>`;
    } else if (status === "Served") {
      nextActionBtn = `<button class="btn btn-advance" style="background: linear-gradient(135deg, #10B981, #059669);" onclick="Dashboard.advanceStatus('${order.orderNumber}', 'Paid')">Collect & Mark Paid ✓</button>`;
    }

    return `
      <div class="order-card" id="card-${order.orderNumber}">
        <div class="order-card-head">
          <div class="order-main-meta">
            <span class="order-number">#${App.escapeHtml(order.orderNumber)}</span>
            <span class="order-table-badge">${order.tableNumber ? `Table ${order.tableNumber}` : order.mode || 'Dine-In'}</span>
            <span class="order-time">${App.formatTimeAgo(order.time || order.createdAt)}</span>
          </div>
          <span class="status-badge ${statusClass}">${status}</span>
        </div>

        <div class="order-customer">
          <span>👤 ${App.escapeHtml(order.customerName || 'Walk-in Guest')}</span>
          ${order.customerPhone || order.phone ? `<span>· 📞 ${App.escapeHtml(order.customerPhone || order.phone)}</span>` : ''}
        </div>

        <div class="order-items-list">
          ${items.map((item) => `
            <div class="order-item-row">
              <span class="order-item-name"><span class="order-item-qty">${item.quantity || item.qty || 1}x</span> ${App.escapeHtml(item.name || item.title)}</span>
              <span class="order-item-price">${App.formatMoney((item.price || 0) * (item.quantity || item.qty || 1))}</span>
            </div>
          `).join("")}
        </div>

        <div class="order-card-foot">
          <div class="order-total-price">${App.formatMoney(total)}</div>
          <div class="order-actions">
            ${nextActionBtn}
          </div>
        </div>
      </div>
    `;
  }

  function advanceStatus(orderNumber, nextStatus) {
    const updated = DB.updateOrderStatus(orderNumber, nextStatus);
    if (updated) {
      App.showToast(`Order #${orderNumber} updated to ${nextStatus}`, "success");
      render();
    }
  }

  window.Dashboard = {
    render,
    advanceStatus
  };
})();
