/* ==========================================================================
   MENU MANAGEMENT VIEW — ITEMS CRUD, CATEGORIES & PHOTO HANDLING
   ========================================================================== */

(() => {
  "use strict";

  let activeCategory = "all";
  let searchQuery = "";

  function render() {
    const container = document.getElementById("view-menu");
    if (!container) return;

    const categories = DB.getCategories();
    let items = DB.getMenuItems();

    if (activeCategory !== "all") {
      items = items.filter((i) => (i.category || "").toLowerCase() === activeCategory.toLowerCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((i) => (i.name || "").toLowerCase().includes(q) || (i.description || "").toLowerCase().includes(q));
    }

    container.innerHTML = `
      <div class="menu-toolbar">
        <div class="category-pills">
          <button class="cat-pill ${activeCategory === 'all' ? 'active' : ''}" onclick="MenuView.setCategory('all')">All Dishes (${DB.getMenuItems().length})</button>
          ${categories.map((c) => `
            <button class="cat-pill ${activeCategory === c.id ? 'active' : ''}" onclick="MenuView.setCategory('${c.id}')">${c.label}</button>
          `).join("")}
        </div>

        <div style="display: flex; gap: 12px; align-items: center;">
          <input type="text" class="form-control" style="width: 200px; padding: 7px 12px; font-size: 13px;" placeholder="Search dishes..." value="${App.escapeHtml(searchQuery)}" oninput="MenuView.setSearch(this.value)">
          <button class="btn btn-primary btn-sm" onclick="MenuView.openItemModal()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            <span>Add Dish</span>
          </button>
        </div>
      </div>

      <div class="menu-items-grid">
        ${items.length ? items.map((item) => `
          <div class="menu-item-card" style="${item.active === false ? 'opacity: 0.55;' : ''}">
            <div class="menu-item-thumb">
              <img src="${item.image || 'assets/placeholder.jpg'}" alt="${App.escapeHtml(item.name)}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'300\\' height=\\'200\\' viewBox=\\'0 0 300 200\\'><rect width=\\'300\\' height=\\'200\\' fill=\\'%23202026\\'/><text x=\\'50%\\' y=\\'50%\\' fill=\\'%236B7280\\' text-anchor=\\'middle\\' font-family=\\'sans-serif\\' font-size=\\'14\\'>${App.escapeHtml(item.name)}</text></svg>'">
              ${item.popular ? `<span style="position: absolute; top: 10px; right: 10px; background: var(--primary); color: #FFF; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 999px;">Popular</span>` : ''}
              ${item.signature ? `<span style="position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); color: #FFF; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 999px;">Signature</span>` : ''}
            </div>

            <div class="menu-item-content">
              <div class="menu-item-head">
                <h4 class="menu-item-title">${App.escapeHtml(item.name)}</h4>
                <span class="menu-item-price">${App.formatMoney(item.price)}</span>
              </div>
              <p class="menu-item-desc">${App.escapeHtml(item.description || 'Delicious freshly prepared specialty.')}</p>

              <div class="menu-item-foot">
                <span style="font-size: 11px; text-transform: uppercase; color: var(--text-dim); font-weight: 600;">${App.escapeHtml(item.category || 'general')}</span>
                <div style="display: flex; gap: 6px;">
                  <button class="btn btn-secondary btn-xs" onclick="MenuView.toggleActive('${item.id}')">${item.active === false ? 'Unhide' : 'Hide'}</button>
                  <button class="btn btn-secondary btn-xs" onclick="MenuView.openItemModal('${item.id}')">Edit</button>
                  <button class="btn btn-danger btn-xs" onclick="MenuView.deleteItem('${item.id}')">Delete</button>
                </div>
              </div>
            </div>
          </div>
        `).join("") : `
          <div class="empty-state" style="grid-column: 1 / -1;">
            <div class="empty-state-icon">🍽️</div>
            <h4>No items found</h4>
            <p>Add your first dish using the button above.</p>
          </div>
        `}
      </div>

      <!-- ADD/EDIT ITEM MODAL -->
      <div id="item-modal" class="modal-overlay">
        <div class="modal-window">
          <div class="modal-header">
            <h3 class="modal-title" id="item-modal-title">Add Menu Item</h3>
            <button class="modal-close" onclick="MenuView.closeItemModal()">✕</button>
          </div>
          <form id="item-form" onsubmit="MenuView.saveItemForm(event)">
            <input type="hidden" id="item-id">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label" for="item-name">Dish Name *</label>
                <input class="form-control" type="text" id="item-name" required placeholder="e.g. Special Chicken Karahi">
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                <div class="form-group">
                  <label class="form-label" for="item-category">Category *</label>
                  <select class="form-control" id="item-category" required onchange="MenuView.checkNewCategory(this.value)">
                    ${categories.map((c) => `<option value="${c.id}">${c.label}</option>`).join("")}
                    <option value="__NEW__">+ Add new category...</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label" for="item-price">Price (Rs.) *</label>
                  <input class="form-control" type="number" id="item-price" required min="0" placeholder="e.g. 550">
                </div>
              </div>

              <div id="new-category-input-wrap" class="form-group" style="display: none;">
                <label class="form-label" for="new-category-name">New Category Name</label>
                <input class="form-control" type="text" id="new-category-name" placeholder="e.g. Seafood, Mocktails">
              </div>

              <div class="form-group">
                <label class="form-label" for="item-image">Photo URL or Path</label>
                <input class="form-control" type="text" id="item-image" placeholder="assets/dish-name.jpg or image URL">
              </div>

              <div class="form-group">
                <label class="form-label" for="item-desc">Description</label>
                <textarea class="form-control" id="item-desc" rows="3" placeholder="Brief description of taste, ingredients, and style..."></textarea>
              </div>

              <div style="display: flex; gap: 20px; align-items: center; margin-top: 10px;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px;">
                  <input type="checkbox" id="item-popular">
                  <span>Mark as Popular</span>
                </label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px;">
                  <input type="checkbox" id="item-signature">
                  <span>Chef's Signature</span>
                </label>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="MenuView.closeItemModal()">Cancel</button>
              <button type="submit" class="btn btn-primary">Save Dish</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  function setCategory(catId) {
    activeCategory = catId;
    render();
  }

  function setSearch(q) {
    searchQuery = q;
    render();
  }

  function openItemModal(itemId = null) {
    const modal = document.getElementById("item-modal");
    if (!modal) return;
    const title = document.getElementById("item-modal-title");
    const idInput = document.getElementById("item-id");
    const nameInput = document.getElementById("item-name");
    const catSelect = document.getElementById("item-category");
    const priceInput = document.getElementById("item-price");
    const imgInput = document.getElementById("item-image");
    const descInput = document.getElementById("item-desc");
    const popCheck = document.getElementById("item-popular");
    const sigCheck = document.getElementById("item-signature");
    const newCatWrap = document.getElementById("new-category-input-wrap");

    if (newCatWrap) newCatWrap.style.display = "none";

    if (itemId) {
      const item = DB.getMenuItems().find((i) => i.id === itemId);
      if (item) {
        title.textContent = "Edit Menu Item";
        idInput.value = item.id;
        nameInput.value = item.name || "";
        catSelect.value = item.category || "desi";
        priceInput.value = item.price || 0;
        imgInput.value = item.image || "";
        descInput.value = item.description || "";
        popCheck.checked = Boolean(item.popular);
        sigCheck.checked = Boolean(item.signature);
      }
    } else {
      title.textContent = "Add Menu Item";
      idInput.value = "";
      nameInput.value = "";
      catSelect.value = "desi";
      priceInput.value = "";
      imgInput.value = "assets/placeholder.jpg";
      descInput.value = "";
      popCheck.checked = false;
      sigCheck.checked = false;
    }

    modal.classList.add("active");
  }

  function closeItemModal() {
    const modal = document.getElementById("item-modal");
    if (modal) modal.classList.remove("active");
  }

  function checkNewCategory(val) {
    const wrap = document.getElementById("new-category-input-wrap");
    if (wrap) {
      wrap.style.display = val === "__NEW__" ? "block" : "none";
      if (val === "__NEW__") {
        document.getElementById("new-category-name").focus();
      }
    }
  }

  function saveItemForm(event) {
    event.preventDefault();
    const id = document.getElementById("item-id").value;
    const name = document.getElementById("item-name").value.trim();
    let category = document.getElementById("item-category").value;
    const price = Number(document.getElementById("item-price").value) || 0;
    const image = document.getElementById("item-image").value.trim() || "assets/placeholder.jpg";
    const description = document.getElementById("item-desc").value.trim();
    const popular = document.getElementById("item-popular").checked;
    const signature = document.getElementById("item-signature").checked;

    if (category === "__NEW__") {
      const newCatName = document.getElementById("new-category-name").value.trim();
      if (!newCatName) {
        App.showToast("Please enter a category name", "error");
        return;
      }
      const added = DB.addCategory(newCatName);
      category = added ? added.id : "general";
    }

    if (id) {
      DB.updateMenuItem(id, { name, category, price, image, description, popular, signature });
      App.showToast(`Updated "${name}" successfully`, "success");
    } else {
      DB.addMenuItem({ name, category, price, image, description, popular, signature });
      App.showToast(`Added "${name}" to menu`, "success");
    }

    closeItemModal();
    render();
  }

  function toggleActive(id) {
    const item = DB.getMenuItems().find((i) => i.id === id);
    if (item) {
      const nextActive = item.active === false ? true : false;
      DB.updateMenuItem(id, { active: nextActive });
      App.showToast(`Item is now ${nextActive ? 'visible' : 'hidden'}`, "info");
      render();
    }
  }

  function deleteItem(id) {
    if (confirm("Are you sure you want to delete this menu item?")) {
      DB.deleteMenuItem(id);
      App.showToast("Menu item deleted", "info");
      render();
    }
  }

  window.MenuView = {
    render,
    setCategory,
    setSearch,
    openItemModal,
    closeItemModal,
    checkNewCategory,
    saveItemForm,
    toggleActive,
    deleteItem
  };
})();
