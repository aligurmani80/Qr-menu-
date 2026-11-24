/* ==========================================================================
   OFFERS & DEALS BUILDER VIEW
   Admin selects 2-5 products with fixed quantities.
   Customer can change deal order quantity 1-10 on customer menu.
   ========================================================================== */

(() => {
  "use strict";

  let selectedDealProducts = [];

  function render() {
    const container = document.getElementById("view-deals");
    if (!container) return;

    const deals = DB.getDeals();

    container.innerHTML = `
      <div class="menu-toolbar">
        <div>
          <h3 style="font-size: 16px; font-weight: 700; color: #FFF; margin-bottom: 2px;">Special Offers & Combo Deals</h3>
          <p style="font-size: 12px; color: var(--text-dim);">Build bundled meal deals (min 2 items, max 5 items). Product quantities inside are fixed; customer can select deal quantity 1 to 10.</p>
        </div>

        <button class="btn btn-primary btn-sm" onclick="DealsView.openDealModal()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span>Create New Deal</span>
        </button>
      </div>

      <div class="menu-items-grid">
        ${deals.length ? deals.map((deal) => {
          const discount = deal.originalPrice > deal.price ? Math.round(((deal.originalPrice - deal.price) / deal.originalPrice) * 100) : 0;
          return `
            <div class="menu-item-card">
              <div class="menu-item-thumb">
                <img src="${deal.image || 'assets/placeholder.jpg'}" alt="${App.escapeHtml(deal.name)}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'300\\' height=\\'200\\' viewBox=\\'0 0 300 200\\'><rect width=\\'300\\' height=\\'200\\' fill=\\'%2318181D\\'/><text x=\\'50%\\' y=\\'50%\\' fill=\\'%23FF5A00\\' text-anchor=\\'middle\\' font-family=\\'sans-serif\\' font-weight=\\'bold\\' font-size=\\'16\\'>${App.escapeHtml(deal.name)}</text></svg>'">
                ${discount > 0 ? `<span style="position: absolute; top: 10px; right: 10px; background: var(--success); color: #FFF; font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 999px;">${discount}% OFF</span>` : ''}
              </div>

              <div class="menu-item-content">
                <div class="menu-item-head">
                  <h4 class="menu-item-title">${App.escapeHtml(deal.name)}</h4>
                  <div style="text-align: right;">
                    <span class="menu-item-price">${App.formatMoney(deal.price)}</span>
                    ${deal.originalPrice ? `<div style="font-size: 11px; color: var(--text-dim); text-decoration: line-through;">${App.formatMoney(deal.originalPrice)}</div>` : ''}
                  </div>
                </div>

                <div style="background: rgba(0,0,0,0.3); border-radius: var(--radius-sm); padding: 8px 10px; margin: 8px 0 12px; font-size: 12px;">
                  <strong style="display: block; font-size: 10px; text-transform: uppercase; color: var(--text-dim); margin-bottom: 4px;">Included Items (Fixed):</strong>
                  ${(deal.products || []).map((p) => `<div style="color: #E2E8F0;">• ${p.qty || 1}x ${App.escapeHtml(p.name)}</div>`).join("")}
                </div>

                <p class="menu-item-desc">${App.escapeHtml(deal.description || 'Special combo deal value.')}</p>

                <div class="menu-item-foot">
                  <span style="font-size: 11px; color: var(--text-dim);">Deal Qty: 1 - 10 on menu</span>
                  <button class="btn btn-danger btn-xs" onclick="DealsView.deleteDeal('${deal.id}')">Delete</button>
                </div>
              </div>
            </div>
          `;
        }).join("") : `
          <div class="empty-state" style="grid-column: 1 / -1;">
            <div class="empty-state-icon">🏷️</div>
            <h4>No deals created yet</h4>
            <p>Create attractive bundles by combining 2 to 5 menu items.</p>
          </div>
        `}
      </div>

      <!-- CREATE DEAL MODAL -->
      <div id="deal-modal" class="modal-overlay">
        <div class="modal-window" style="max-width: 600px;">
          <div class="modal-header">
            <h3 class="modal-title">Deal Builder</h3>
            <button class="modal-close" onclick="DealsView.closeDealModal()">✕</button>
          </div>

          <form onsubmit="DealsView.handleSaveDeal(event)">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label" for="deal-name">Deal Name *</label>
                <input class="form-control" type="text" id="deal-name" required placeholder="e.g. Mega Feast Combo (2 Burgers + Drinks)">
              </div>

              <!-- Product Selector for Deal -->
              <div class="form-group">
                <label class="form-label">
                  <span>Select Products for this Deal</span>
                  <span style="font-size: 11px; color: var(--primary); font-weight: 700; margin-left: 6px;">(Min 2, Max 5, Best 3-4 items)</span>
                </label>

                <div style="display: flex; gap: 8px; margin-bottom: 10px;">
                  <select class="form-control" id="deal-product-select" style="flex: 1;">
                    ${DB.getMenuItems().filter((i) => i.active !== false).map((item) => `
                      <option value="${item.id}" data-name="${App.escapeHtml(item.name)}" data-price="${item.price}">
                        ${item.name} (${App.formatMoney(item.price)})
                      </option>
                    `).join("")}
                  </select>
                  <input type="number" id="deal-product-qty" class="form-control" value="1" min="1" max="10" style="width: 70px;" title="Fixed quantity in deal">
                  <button type="button" class="btn btn-secondary btn-sm" onclick="DealsView.addProductToDeal()">+ Add</button>
                </div>

                <!-- Selected Products List -->
                <div id="deal-selected-products" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px; min-height: 70px;">
                  <!-- Rendered dynamically -->
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                <div class="form-group">
                  <label class="form-label" for="deal-original-price">Calculated Regular Price (Rs.)</label>
                  <input class="form-control" type="number" id="deal-original-price" readonly style="opacity: 0.7;">
                </div>

                <div class="form-group">
                  <label class="form-label" for="deal-price">Special Deal Price (Rs.) *</label>
                  <input class="form-control" type="number" id="deal-price" required min="1" placeholder="e.g. 1200">
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="deal-image">Deal Image URL or Asset</label>
                <input class="form-control" type="text" id="deal-image" placeholder="assets/deal-photo.jpg">
              </div>

              <div class="form-group">
                <label class="form-label" for="deal-desc">Description</label>
                <textarea class="form-control" id="deal-desc" rows="2" placeholder="Tell customers what makes this combo special..."></textarea>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="DealsView.closeDealModal()">Cancel</button>
              <button type="submit" class="btn btn-primary">Save & Publish Deal</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  function openDealModal() {
    selectedDealProducts = [];
    const modal = document.getElementById("deal-modal");
    if (!modal) return;
    document.getElementById("deal-name").value = "";
    document.getElementById("deal-price").value = "";
    document.getElementById("deal-original-price").value = "0";
    document.getElementById("deal-desc").value = "";
    document.getElementById("deal-image").value = "assets/placeholder.jpg";
    renderSelectedDealProducts();
    modal.classList.add("active");
  }

  function closeDealModal() {
    const modal = document.getElementById("deal-modal");
    if (modal) modal.classList.remove("active");
  }

  function addProductToDeal() {
    const select = document.getElementById("deal-product-select");
    const qtyInput = document.getElementById("deal-product-qty");
    if (!select) return;

    if (selectedDealProducts.length >= 5) {
      App.showToast("Maximum 5 products allowed in a single deal", "warning");
      return;
    }

    const opt = select.options[select.selectedIndex];
    const id = opt.value;
    const name = opt.dataset.name;
    const price = Number(opt.dataset.price) || 0;
    const qty = Number(qtyInput.value) || 1;

    // Check if already in deal
    const existing = selectedDealProducts.find((p) => p.id === id);
    if (existing) {
      existing.qty += qty;
    } else {
      selectedDealProducts.push({ id, name, price, qty });
    }

    renderSelectedDealProducts();
  }

  function removeProductFromDeal(id) {
    selectedDealProducts = selectedDealProducts.filter((p) => p.id !== id);
    renderSelectedDealProducts();
  }

  function renderSelectedDealProducts() {
    const container = document.getElementById("deal-selected-products");
    if (!container) return;

    if (!selectedDealProducts.length) {
      container.innerHTML = `<span style="color: var(--text-dim); font-size: 12px;">No products added yet. Select products above (min 2, max 5).</span>`;
      document.getElementById("deal-original-price").value = "0";
      return;
    }

    let regularSum = 0;
    container.innerHTML = selectedDealProducts.map((p) => {
      const lineTotal = p.price * p.qty;
      regularSum += lineTotal;
      return `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid var(--border-subtle); font-size: 13px;">
          <span><strong>${p.qty}x</strong> ${App.escapeHtml(p.name)} (${App.formatMoney(lineTotal)})</span>
          <button type="button" style="color: var(--danger); font-size: 12px;" onclick="DealsView.removeProductFromDeal('${p.id}')">✕</button>
        </div>
      `;
    }).join("");

    const regInput = document.getElementById("deal-original-price");
    if (regInput) regInput.value = regularSum;
  }

  function handleSaveDeal(event) {
    event.preventDefault();
    if (selectedDealProducts.length < 2) {
      App.showToast("A deal must contain at least 2 products!", "error");
      return;
    }
    if (selectedDealProducts.length > 5) {
      App.showToast("A deal cannot have more than 5 products!", "error");
      return;
    }

    const name = document.getElementById("deal-name").value.trim();
    const price = Number(document.getElementById("deal-price").value) || 0;
    const originalPrice = Number(document.getElementById("deal-original-price").value) || 0;
    const image = document.getElementById("deal-image").value.trim() || "assets/placeholder.jpg";
    const description = document.getElementById("deal-desc").value.trim();

    DB.addDeal({
      name,
      price,
      originalPrice,
      image,
      description,
      products: selectedDealProducts
    });

    closeDealModal();
    App.showToast(`Deal "${name}" created successfully!`, "success");
    render();
  }

  function deleteDeal(id) {
    if (confirm("Are you sure you want to delete this deal?")) {
      DB.deleteDeal(id);
      App.showToast("Deal deleted", "info");
      render();
    }
  }

  window.DealsView = {
    render,
    openDealModal,
    closeDealModal,
    addProductToDeal,
    removeProductFromDeal,
    handleSaveDeal,
    deleteDeal
  };
})();
