/* ==========================================================================
   ORDERS MANAGEMENT VIEW — FULL ORDERS DIRECTORY & STATUS FLOW
   ========================================================================== */

(() => {
  "use strict";

  let activeFilter = "all";
  let searchQuery = "";

  function render() {
    const container = document.getElementById("view-orders");
    if (!container) return;

    let orders = DB.getOrders();

    // Filter by status
    if (activeFilter !== "all") {
      orders = orders.filter((o) => (o.status || "Received").toLowerCase() === activeFilter.toLowerCase());
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      orders = orders.filter((o) => {
        const num = String(o.orderNumber || "").toLowerCase();
        const name = String(o.customerName || "").toLowerCase();
        const phone = String(o.customerPhone || o.phone || "").toLowerCase();
        const table = String(o.tableNumber || "").toLowerCase();
        return num.includes(q) || name.includes(q) || phone.includes(q) || table.includes(q);
      });
    }

    container.innerHTML = `
      <div class="menu-toolbar">
        <div class="category-pills">
          <button class="cat-pill ${activeFilter === 'all' ? 'active' : ''}" onclick="OrdersView.setFilter('all')">All Orders</button>
          <button class="cat-pill ${activeFilter === 'received' ? 'active' : ''}" onclick="OrdersView.setFilter('received')">Received</button>
          <button class="cat-pill ${activeFilter === 'preparing' ? 'active' : ''}" onclick="OrdersView.setFilter('preparing')">Preparing</button>
          <button class="cat-pill ${activeFilter === 'ready' ? 'active' : ''}" onclick="OrdersView.setFilter('ready')">Ready</button>
          <button class="cat-pill ${activeFilter === 'served' ? 'active' : ''}" onclick="OrdersView.setFilter('served')">Served</button>
          <button class="cat-pill ${activeFilter === 'paid' ? 'active' : ''}" onclick="OrdersView.setFilter('paid')">Paid</button>
        </div>

        <div style="display: flex; gap: 10px; align-items: center;">
          <input type="text" class="form-control" style="width: 240px; padding: 7px 12px; font-size: 13px;" placeholder="Search Order #, Table, Guest..." value="${App.escapeHtml(searchQuery)}" oninput="OrdersView.setSearch(this.value)">
        </div>
      </div>

      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Table</th>
              <th>Time</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th style="text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${orders.length ? orders.map((order) => {
              const total = DB.getOrderTotal(order);
              const items = Array.isArray(order.items) ? order.items : [];
              const itemsSummary = items.map((i) => `${i.quantity || 1}x ${i.name}`).join(", ");
              const status = order.status || "Received";
              const statusClass = `badge-${status.toLowerCase()}`;

              return `
                <tr>
                  <td><strong style="color: var(--primary);">#${App.escapeHtml(order.orderNumber)}</strong></td>
                  <td><span class="order-table-badge">${order.tableNumber ? `Table ${order.tableNumber}` : order.mode || 'Dine-In'}</span></td>
                  <td>${App.formatTimeAgo(order.time || order.createdAt)}</td>
                  <td>${App.escapeHtml(order.customerName || 'Walk-in Guest')}</td>
                  <td style="max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${App.escapeHtml(itemsSummary)}">${App.escapeHtml(itemsSummary || 'No items')}</td>
                  <td><strong>${App.formatMoney(total)}</strong></td>
                  <td><span class="status-badge ${statusClass}">${status}</span></td>
                  <td style="text-align: right;">
                    <select class="form-control" style="display: inline-block; width: auto; padding: 4px 8px; font-size: 11px;" onchange="OrdersView.changeStatus('${order.orderNumber}', this.value)">
                      <option value="Received" ${status === 'Received' ? 'selected' : ''}>Received</option>
                      <option value="Preparing" ${status === 'Preparing' ? 'selected' : ''}>Preparing</option>
                      <option value="Ready" ${status === 'Ready' ? 'selected' : ''}>Ready</option>
                      <option value="Served" ${status === 'Served' ? 'selected' : ''}>Served</option>
                      <option value="Paid" ${status === 'Paid' ? 'selected' : ''}>Paid</option>
                    </select>
                  </td>
                </tr>
              `;
            }).join("") : `
              <tr>
                <td colspan="8">
                  <div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <h4>No orders found</h4>
                    <p>There are no orders matching the current filter.</p>
                  </div>
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    `;
  }

  function setFilter(filter) {
    activeFilter = filter;
    render();
  }

  function setSearch(query) {
    searchQuery = query;
    render();
  }

  function changeStatus(orderNumber, newStatus) {
    DB.updateOrderStatus(orderNumber, newStatus);
    App.showToast(`Order #${orderNumber} marked as ${newStatus}`, "success");
    render();
  }

  window.OrdersView = {
    render,
    setFilter,
    setSearch,
    changeStatus
  };
})();
