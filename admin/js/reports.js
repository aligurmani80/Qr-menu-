/* ==========================================================================
   REPORTS VIEW — LAST 15 DAYS ORDERS & PROFIT
   Per-day Orders Count & Profit, 15-Day Totals, Newest Day First
   Strictly Real Numbers Only (0 if no orders)
   ========================================================================== */

(() => {
  "use strict";

  function render() {
    const container = document.getElementById("view-reports");
    if (!container) return;

    const report = DB.getLast15DaysReport();
    const settings = DB.getSettings();

    container.innerHTML = `
      <div class="menu-toolbar">
        <div>
          <h3 style="font-size: 16px; font-weight: 700; color: #FFF; margin-bottom: 2px;">Financial & Sales Reports — Last 15 Days</h3>
          <p style="font-size: 12px; color: var(--text-dim);">Strictly computed from real customer orders. Newest day first.</p>
        </div>

        <button class="btn btn-secondary btn-sm" onclick="ReportsView.printReport()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
          <span>Print 15-Day Report</span>
        </button>
      </div>

      <!-- 15-DAY HERO SUMMARY CARDS -->
      <div class="hero-stats-grid">
        <div class="hero-stat-card card-orders">
          <div class="hero-stat-glow"></div>
          <div class="hero-stat-top">
            <span class="hero-stat-label">15-Day Total Orders</span>
            <div class="hero-stat-icon-pill">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line></svg>
            </div>
          </div>
          <div class="hero-stat-value" id="report-15-orders">${report.totalOrders}</div>
          <div class="hero-stat-note">
            <span>Orders received across the last 15 days</span>
            <span class="hero-stat-rule">Real Orders Only</span>
          </div>
        </div>

        <div class="hero-stat-card card-profit">
          <div class="hero-stat-glow"></div>
          <div class="hero-stat-top">
            <span class="hero-stat-label">15-Day Total Profit</span>
            <div class="hero-stat-icon-pill">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            </div>
          </div>
          <div class="hero-stat-value" id="report-15-profit">${App.formatMoney(report.totalProfit)}</div>
          <div class="hero-stat-note">
            <span>Sum of Paid orders in the 15-day period</span>
            <span class="hero-stat-rule">Paid Orders Rule</span>
          </div>
        </div>
      </div>

      <!-- DAILY BREAKDOWN TABLE (NEWEST DAY FIRST) -->
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Date (Newest First)</th>
              <th>Orders Count</th>
              <th>Profit (Paid)</th>
              <th>Total Sales</th>
              <th>Awaiting Payment</th>
            </tr>
          </thead>
          <tbody>
            ${report.days.map((day) => `
              <tr>
                <td>
                  <strong style="color: #FFF;">${day.label}</strong>
                  <div style="font-size: 11px; color: var(--text-dim);">${day.dateKey}</div>
                </td>
                <td><strong style="color: ${day.ordersCount > 0 ? 'var(--primary)' : 'var(--text-dim)'};">${day.ordersCount}</strong></td>
                <td><strong style="color: ${day.profit > 0 ? 'var(--success)' : 'var(--text-dim)'};">${App.formatMoney(day.profit)}</strong></td>
                <td>${App.formatMoney(day.sales)}</td>
                <td style="color: ${day.awaiting > 0 ? 'var(--warning)' : 'var(--text-dim)'};">${App.formatMoney(day.awaiting)}</td>
              </tr>
            `).join("")}
          </tbody>
          <tfoot>
            <tr>
              <th>15-Day Total</th>
              <td>${report.totalOrders}</td>
              <td style="color: var(--success);">${App.formatMoney(report.totalProfit)}</td>
              <td>${App.formatMoney(report.totalSales)}</td>
              <td>${App.formatMoney(Math.max(0, report.totalSales - report.totalProfit))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  }

  function printReport() {
    const report = DB.getLast15DaysReport();
    const settings = DB.getSettings();

    const printWin = window.open("", "_blank", "width=800,height=800");
    if (!printWin) {
      App.showToast("Allow pop-ups to print the report", "warning");
      return;
    }

    const rows = report.days.map((d) => `
      <tr>
        <td><strong>${d.label}</strong> (${d.dateKey})</td>
        <td style="text-align: center;">${d.ordersCount}</td>
        <td style="text-align: right; color: green; font-weight: bold;">${App.formatMoney(d.profit)}</td>
        <td style="text-align: right;">${App.formatMoney(d.sales)}</td>
        <td style="text-align: right;">${App.formatMoney(d.awaiting)}</td>
      </tr>
    `).join("");

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>15-Day Sales & Profit Report · ${App.escapeHtml(settings.restaurantName)}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 36px; color: #111; }
          h1 { margin: 0 0 6px; font-size: 24px; }
          .sub { color: #666; font-size: 13px; margin-bottom: 24px; border-bottom: 1px solid #ddd; padding-bottom: 12px; }
          .summary { display: flex; gap: 40px; margin-bottom: 24px; }
          .box { border-left: 3px solid #FF5A00; padding-left: 12px; }
          .box span { display: block; font-size: 11px; text-transform: uppercase; color: #777; }
          .box strong { font-size: 22px; color: #111; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
          th, td { padding: 9px 12px; border-bottom: 1px solid #E5E7EB; text-align: left; }
          th { background: #F9FAFB; font-weight: 700; }
          tfoot th, tfoot td { font-weight: 800; border-top: 2px solid #111; border-bottom: none; }
        </style>
      </head>
      <body>
        <h1>${App.escapeHtml(settings.restaurantName)}</h1>
        <div class="sub">15-Day Performance Report · Generated on ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>

        <div class="summary">
          <div class="box">
            <span>15-Day Total Orders</span>
            <strong>${report.totalOrders}</strong>
          </div>
          <div class="box" style="border-color: #10B981;">
            <span>15-Day Total Profit</span>
            <strong style="color: #10B981;">${App.formatMoney(report.totalProfit)}</strong>
          </div>
          <div class="box" style="border-color: #3B82F6;">
            <span>15-Day Total Sales</span>
            <strong>${App.formatMoney(report.totalSales)}</strong>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th style="text-align: center;">Orders</th>
              <th style="text-align: right;">Profit (Paid)</th>
              <th style="text-align: right;">Total Sales</th>
              <th style="text-align: right;">Awaiting</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
          <tfoot>
            <tr>
              <th>Total</th>
              <td style="text-align: center;">${report.totalOrders}</td>
              <td style="text-align: right;">${App.formatMoney(report.totalProfit)}</td>
              <td style="text-align: right;">${App.formatMoney(report.totalSales)}</td>
              <td style="text-align: right;">${App.formatMoney(Math.max(0, report.totalSales - report.totalProfit))}</td>
            </tr>
          </tfoot>
        </table>

        <script>
          setTimeout(() => { window.print(); }, 400);
        <\/script>
      </body>
      </html>
    `);
    printWin.document.close();
  }

  window.ReportsView = {
    render,
    printReport
  };
})();
