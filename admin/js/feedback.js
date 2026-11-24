/* ==========================================================================
   CUSTOMER FEEDBACK MANAGEMENT VIEW
   1-5 Stars Reviews After Served — Admin Approve / Reject / Show / Hide
   ========================================================================== */

(() => {
  "use strict";

  let activeFilter = "all";

  function render() {
    const container = document.getElementById("view-feedback");
    if (!container) return;

    let reviews = DB.getFeedback();

    if (activeFilter === "approved") {
      reviews = reviews.filter((r) => r.approved === true);
    } else if (activeFilter === "pending") {
      reviews = reviews.filter((r) => r.approved !== true && r.approved !== false);
    } else if (activeFilter === "hidden") {
      reviews = reviews.filter((r) => r.approved === false);
    }

    // Calculate real average rating
    const approvedReviews = DB.getFeedback().filter((r) => r.approved === true);
    const avgRating = approvedReviews.length ? (approvedReviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) / approvedReviews.length).toFixed(1) : "0.0";

    container.innerHTML = `
      <div class="menu-toolbar">
        <div>
          <h3 style="font-size: 16px; font-weight: 700; color: #FFF; margin-bottom: 2px;">Guest Reviews & Feedback</h3>
          <p style="font-size: 12px; color: var(--text-dim);">Only reviews approved by Admin are displayed on the digital menu.</p>
        </div>

        <div style="display: flex; gap: 8px;">
          <button class="cat-pill ${activeFilter === 'all' ? 'active' : ''}" onclick="FeedbackView.setFilter('all')">All (${DB.getFeedback().length})</button>
          <button class="cat-pill ${activeFilter === 'approved' ? 'active' : ''}" onclick="FeedbackView.setFilter('approved')">Approved & Public</button>
          <button class="cat-pill ${activeFilter === 'pending' ? 'active' : ''}" onclick="FeedbackView.setFilter('pending')">Pending Review</button>
          <button class="cat-pill ${activeFilter === 'hidden' ? 'active' : ''}" onclick="FeedbackView.setFilter('hidden')">Hidden / Rejected</button>
        </div>
      </div>

      <div class="secondary-stats-grid" style="grid-template-columns: repeat(3, 1fr); margin-bottom: 24px;">
        <div class="mini-stat-card">
          <div class="mini-stat-icon" style="color: var(--warning);">⭐</div>
          <div class="mini-stat-meta">
            <span>Average Approved Rating</span>
            <strong>${avgRating} / 5.0</strong>
          </div>
        </div>
        <div class="mini-stat-card">
          <div class="mini-stat-icon" style="color: var(--success);">💬</div>
          <div class="mini-stat-meta">
            <span>Public Testimonials</span>
            <strong>${approvedReviews.length}</strong>
          </div>
        </div>
        <div class="mini-stat-card">
          <div class="mini-stat-icon" style="color: var(--info);">⏳</div>
          <div class="mini-stat-meta">
            <span>Awaiting Moderation</span>
            <strong>${DB.getFeedback().filter((r) => r.approved == null).length}</strong>
          </div>
        </div>
      </div>

      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Rating</th>
              <th>Customer & Table</th>
              <th>Comments</th>
              <th>Date</th>
              <th>Public Status</th>
              <th style="text-align: right;">Moderation Action</th>
            </tr>
          </thead>
          <tbody>
            ${reviews.length ? reviews.map((r) => {
              const stars = "★".repeat(Math.max(1, Math.min(5, Number(r.rating) || 5))) + "☆".repeat(5 - Math.max(1, Math.min(5, Number(r.rating) || 5)));
              const isApproved = r.approved === true;
              const isRejected = r.approved === false;
              const statusBadge = isApproved 
                ? `<span class="status-badge badge-paid">Approved & Visible</span>`
                : isRejected 
                  ? `<span class="status-badge badge-cancelled">Hidden</span>` 
                  : `<span class="status-badge badge-preparing">Pending Moderation</span>`;

              return `
                <tr>
                  <td><span style="color: var(--warning); font-size: 14px; letter-spacing: 2px;">${stars}</span></td>
                  <td>
                    <strong>${App.escapeHtml(r.customerName || 'Anonymous Guest')}</strong>
                    ${r.tableNumber ? `<div style="font-size: 11px; color: var(--text-dim);">Table ${r.tableNumber}</div>` : ''}
                  </td>
                  <td style="max-width: 320px;">${App.escapeHtml(r.comment || r.message || 'No written comment provided.')}</td>
                  <td><span style="font-size: 12px; color: var(--text-dim);">${App.formatTimeAgo(r.createdAt || Date.now())}</span></td>
                  <td>${statusBadge}</td>
                  <td style="text-align: right;">
                    <div style="display: flex; gap: 6px; justify-content: flex-end;">
                      ${!isApproved ? `
                        <button class="btn btn-success btn-xs" onclick="FeedbackView.setStatus('${r.id}', true)">Approve & Show</button>
                      ` : `
                        <button class="btn btn-secondary btn-xs" onclick="FeedbackView.setStatus('${r.id}', false)">Hide Review</button>
                      `}
                      <button class="btn btn-danger btn-xs" onclick="FeedbackView.deleteItem('${r.id}')">Delete</button>
                    </div>
                  </td>
                </tr>
              `;
            }).join("") : `
              <tr>
                <td colspan="6">
                  <div class="empty-state">
                    <div class="empty-state-icon">⭐</div>
                    <h4>No reviews yet</h4>
                    <p>Customer reviews submitted after meals will appear here for approval.</p>
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

  function setStatus(id, approved) {
    DB.setFeedbackStatus(id, approved);
    App.showToast(approved ? "Review approved and published!" : "Review hidden from menu", "info");
    render();
  }

  function deleteItem(id) {
    if (confirm("Delete this review permanently?")) {
      DB.deleteFeedback(id);
      App.showToast("Review deleted", "info");
      render();
    }
  }

  window.FeedbackView = {
    render,
    setFilter,
    setStatus,
    deleteItem
  };
})();
