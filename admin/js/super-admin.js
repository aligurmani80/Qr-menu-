/* ==========================================================================
   SUPER ADMIN — MASTER CONTROL CONSOLE (A TO Z IN ONE PLACE)
   Strictly accessible ONLY to Super Admin. Completely hidden from Restaurant Admin.
   Real data only, zero fake numbers/restaurants/fees, multi-tenant isolation.
   ========================================================================== */

(() => {
  "use strict";

  const state = {
    searchQuery: "",
    selectedCity: "All",
    selectedPlan: "All",
    selectedStatus: "All",
    activeModal: null, // "add" | "edit" | "detail" | "password" | "plan" | "remove"
    selectedRestaurantId: null
  };

  // Helper to format days remaining
  function getDaysRemainingText(expiryDateStr) {
    if (!expiryDateStr) return "No expiry set";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(expiryDateStr);
    exp.setHours(0, 0, 0, 0);
    const diffTime = exp.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return `<span style="color: var(--danger); font-weight: 700;">Expired (${Math.abs(diffDays)}d ago)</span>`;
    if (diffDays === 0) return `<span style="color: var(--warning); font-weight: 700;">Expires today</span>`;
    if (diffDays <= 5) return `<span style="color: var(--warning); font-weight: 700;">${diffDays} days left</span>`;
    return `<span style="color: var(--text-dim);">${diffDays} days left</span>`;
  }

  function render() {
    const container = document.getElementById("view-super-admin");
    if (!container) return;

    if (!Auth.isSuperAdmin()) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 100px 20px;">
          <div class="empty-state-icon">🔒</div>
          <h4>Access Restricted</h4>
          <p>This master management view requires Super Administrator authorization.</p>
        </div>
      `;
      return;
    }

    const allRestaurants = DB.getRestaurants();
    const stats = DB.getSuperAdminStats();

    // Extract unique cities for filter dropdown
    const uniqueCities = Array.from(new Set(allRestaurants.map((r) => r.city).filter(Boolean))).sort();

    // Filter restaurants
    const q = state.searchQuery.trim().toLowerCase();
    const filtered = allRestaurants.filter((r) => {
      // Text search
      if (q) {
        const matchName = (r.restaurantName || "").toLowerCase().includes(q);
        const matchOwner = (r.ownerName || "").toLowerCase().includes(q);
        const matchCity = (r.city || "").toLowerCase().includes(q);
        const matchUser = (r.adminUsername || "").toLowerCase().includes(q);
        const matchPhone = (r.phone || "").toLowerCase().includes(q);
        const matchWhatsApp = (r.whatsapp || "").toLowerCase().includes(q);
        if (!matchName && !matchOwner && !matchCity && !matchUser && !matchPhone && !matchWhatsApp) {
          return false;
        }
      }

      // City filter
      if (state.selectedCity !== "All" && r.city !== state.selectedCity) {
        return false;
      }

      // Plan filter
      if (state.selectedPlan !== "All" && r.plan !== state.selectedPlan) {
        return false;
      }

      // Status filter
      if (state.selectedStatus !== "All") {
        if (state.selectedStatus === "Paid") {
          if (r.feeStatus !== "Paid") return false;
        } else if (state.selectedStatus === "Unpaid") {
          if (r.feeStatus !== "Unpaid") return false;
        } else if (r.status !== state.selectedStatus) {
          return false;
        }
      }

      return true;
    });

    container.innerHTML = `
      <!-- SUPER ADMIN MASTER HEADER -->
      <div class="menu-toolbar" style="margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
        <div>
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
            <span class="badge" style="background: linear-gradient(135deg, #FF5A00, #FF8533); color: #FFF; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: var(--radius-sm); letter-spacing: 0.05em; text-transform: uppercase;">
              👑 Master Control
            </span>
            <h3 style="font-size: 20px; font-weight: 800; color: #FFF; letter-spacing: -0.02em;">Super Admin Console</h3>
          </div>
          <p style="font-size: 13px; color: var(--text-dim);">Central command for all onboarded restaurants, licenses, subscription plans, and credentials.</p>
        </div>

        <div style="display: flex; align-items: center; gap: 10px;">
          <button class="btn btn-secondary" onclick="SuperAdminView.promptClearOrders()" title="Clear test orders / reset demo data after confirmation" style="display: flex; align-items: center; gap: 8px; font-weight: 600; padding: 10px 16px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            <span>Reset Demo Orders</span>
          </button>

          <button class="btn btn-primary" onclick="SuperAdminView.openAddModal()" style="display: flex; align-items: center; gap: 8px; font-weight: 700; padding: 10px 18px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Add Restaurant</span>
          </button>
        </div>
      </div>

      <!-- TOP 4 BIG STAT CARDS (REAL DATA ONLY, ZERO IF NONE) -->
      <div class="hero-stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); margin-bottom: 28px;">
        <!-- CARD 1: TOTAL RESTAURANTS RUNNING -->
        <div class="hero-stat-card card-orders">
          <div class="hero-stat-glow"></div>
          <div class="hero-stat-top">
            <span class="hero-stat-label">Total Restaurants Running</span>
            <div class="hero-stat-icon-pill">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
            </div>
          </div>
          <div class="hero-stat-value" id="super-total-restaurants">${stats.totalRestaurants}</div>
          <div class="hero-stat-note">
            <span>Onboarded clients</span>
            <span class="hero-stat-rule">0 if none</span>
          </div>
        </div>

        <!-- CARD 2: ACTIVE RESTAURANTS -->
        <div class="hero-stat-card card-profit" style="--primary: #10B981; --primary-glow: rgba(16, 185, 129, 0.25);">
          <div class="hero-stat-glow" style="background: radial-gradient(circle, rgba(16, 185, 129, 0.3) 0%, transparent 70%);"></div>
          <div class="hero-stat-top">
            <span class="hero-stat-label">Active Restaurants</span>
            <div class="hero-stat-icon-pill" style="background: rgba(16, 185, 129, 0.15); color: #10B981;">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
          </div>
          <div class="hero-stat-value" id="super-active-restaurants" style="color: #34D399;">${stats.activeRestaurants}</div>
          <div class="hero-stat-note">
            <span>Operational & licensed</span>
            <span class="hero-stat-rule">Real-time</span>
          </div>
        </div>

        <!-- CARD 3: EXPIRED / DISABLED RESTAURANTS -->
        <div class="hero-stat-card" style="background: var(--bg-card); border-color: ${stats.expiredOrDisabledRestaurants > 0 ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-subtle)'};">
          <div class="hero-stat-glow" style="background: radial-gradient(circle, rgba(239, 68, 68, 0.25) 0%, transparent 70%);"></div>
          <div class="hero-stat-top">
            <span class="hero-stat-label">Expired / Disabled</span>
            <div class="hero-stat-icon-pill" style="background: rgba(239, 68, 68, 0.15); color: #EF4444;">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
              </svg>
            </div>
          </div>
          <div class="hero-stat-value" id="super-expired-restaurants" style="color: ${stats.expiredOrDisabledRestaurants > 0 ? '#F87171' : '#FFF'};">${stats.expiredOrDisabledRestaurants}</div>
          <div class="hero-stat-note">
            <span>Needs renewal / unlock</span>
            <span class="hero-stat-rule">Real-time</span>
          </div>
        </div>

        <!-- CARD 4: TOTAL MONTHLY FEE (THIS MONTH, PAID FEES ONLY) -->
        <div class="hero-stat-card card-profit">
          <div class="hero-stat-glow"></div>
          <div class="hero-stat-top">
            <span class="hero-stat-label">Total Monthly Fee</span>
            <div class="hero-stat-icon-pill">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
            </div>
          </div>
          <div class="hero-stat-value" id="super-monthly-fee" style="font-size: 26px;">${App.formatMoney(stats.totalMonthlyFee)}</div>
          <div class="hero-stat-note">
            <span>This month's collected revenue</span>
            <span class="hero-stat-rule">Paid Only</span>
          </div>
        </div>
      </div>

      <!-- SEARCH & FILTERS BAR -->
      <div class="table-wrap" style="padding: 16px 20px; margin-bottom: 24px;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;">
          <!-- SEARCH INPUT -->
          <div style="position: relative; flex: 1; min-width: 240px; max-width: 400px;">
            <svg style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-dim);" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input 
              type="text" 
              class="form-control" 
              placeholder="Search by restaurant, owner, city, username..." 
              value="${App.escapeHtml(state.searchQuery)}"
              oninput="SuperAdminView.setSearch(this.value)"
              style="padding-left: 40px; height: 40px; font-size: 13px;"
            >
          </div>

          <!-- DROPDOWN FILTERS -->
          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <!-- CITY FILTER -->
            <select class="form-control" style="width: auto; height: 40px; font-size: 13px;" onchange="SuperAdminView.setCity(this.value)">
              <option value="All" ${state.selectedCity === 'All' ? 'selected' : ''}>All Cities (${allRestaurants.length})</option>
              ${uniqueCities.map((city) => `<option value="${App.escapeHtml(city)}" ${state.selectedCity === city ? 'selected' : ''}>${App.escapeHtml(city)}</option>`).join("")}
            </select>

            <!-- PLAN FILTER -->
            <select class="form-control" style="width: auto; height: 40px; font-size: 13px;" onchange="SuperAdminView.setPlan(this.value)">
              <option value="All" ${state.selectedPlan === 'All' ? 'selected' : ''}>All Plans</option>
              <option value="Basic" ${state.selectedPlan === 'Basic' ? 'selected' : ''}>Basic (Rs. 2,000)</option>
              <option value="Standard" ${state.selectedPlan === 'Standard' ? 'selected' : ''}>Standard (Rs. 3,500)</option>
              <option value="Premium" ${state.selectedPlan === 'Premium' ? 'selected' : ''}>Premium (Rs. 5,000)</option>
            </select>

            <!-- STATUS FILTER -->
            <select class="form-control" style="width: auto; height: 40px; font-size: 13px;" onchange="SuperAdminView.setStatus(this.value)">
              <option value="All" ${state.selectedStatus === 'All' ? 'selected' : ''}>All Statuses</option>
              <option value="Active" ${state.selectedStatus === 'Active' ? 'selected' : ''}>Active</option>
              <option value="Expired" ${state.selectedStatus === 'Expired' ? 'selected' : ''}>Expired</option>
              <option value="Disabled" ${state.selectedStatus === 'Disabled' ? 'selected' : ''}>Disabled</option>
              <option value="Paid" ${state.selectedStatus === 'Paid' ? 'selected' : ''}>Fee Paid</option>
              <option value="Unpaid" ${state.selectedStatus === 'Unpaid' ? 'selected' : ''}>Fee Unpaid</option>
            </select>

            ${(state.searchQuery || state.selectedCity !== 'All' || state.selectedPlan !== 'All' || state.selectedStatus !== 'All') ? `
              <button class="btn btn-secondary btn-sm" onclick="SuperAdminView.resetFilters()" title="Reset all filters" style="height: 40px; padding: 0 12px;">
                <span>Reset</span>
              </button>
            ` : ''}
          </div>
        </div>
      </div>

      <!-- FULL RESTAURANTS TABLE (WITH ALL MANDATORY COLUMNS) -->
      <div class="table-wrap" style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
        <table class="data-table" style="width: 100%; border-collapse: collapse; min-width: 1100px;">
          <thead>
            <tr>
              <th style="padding: 14px 16px; text-align: left; font-size: 12px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.05em;">Restaurant Name</th>
              <th style="padding: 14px 16px; text-align: left; font-size: 12px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.05em;">Owner</th>
              <th style="padding: 14px 16px; text-align: left; font-size: 12px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.05em;">City</th>
              <th style="padding: 14px 16px; text-align: left; font-size: 12px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.05em;">WhatsApp / Phone</th>
              <th style="padding: 14px 16px; text-align: left; font-size: 12px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.05em;">Plan</th>
              <th style="padding: 14px 16px; text-align: left; font-size: 12px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.05em;">Fee Status</th>
              <th style="padding: 14px 16px; text-align: left; font-size: 12px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.05em;">Start Date</th>
              <th style="padding: 14px 16px; text-align: left; font-size: 12px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.05em;">Expiry Date</th>
              <th style="padding: 14px 16px; text-align: left; font-size: 12px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.05em;">Status</th>
              <th style="padding: 14px 16px; text-align: left; font-size: 12px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.05em;">Admin Username</th>
              <th style="padding: 14px 16px; text-align: right; font-size: 12px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.05em;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length ? filtered.map((r) => renderRestaurantRow(r)).join("") : `
              <tr>
                <td colspan="11" style="padding: 60px 20px; text-align: center;">
                  <div class="empty-state">
                    <div class="empty-state-icon" style="font-size: 32px; margin-bottom: 12px;">🏪</div>
                    <h4 style="font-size: 16px; font-weight: 700; color: #FFF; margin-bottom: 6px;">
                      ${allRestaurants.length === 0 ? "No Restaurants Onboarded Yet" : "No Matching Restaurants Found"}
                    </h4>
                    <p style="font-size: 13px; color: var(--text-dim); margin-bottom: 16px;">
                      ${allRestaurants.length === 0 ? "Click 'Add Restaurant' to register your first restaurant with complete A to Z data." : "Try clearing your search query or filters."}
                    </p>
                    ${allRestaurants.length === 0 ? `
                      <button class="btn btn-primary btn-sm" onclick="SuperAdminView.openAddModal()">
                        + Add Restaurant
                      </button>
                    ` : `
                      <button class="btn btn-secondary btn-sm" onclick="SuperAdminView.resetFilters()">
                        Clear Filters
                      </button>
                    `}
                  </div>
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </div>

      <!-- MODAL CONTAINER -->
      <div id="super-admin-modal-container"></div>
    `;
  }

  function renderRestaurantRow(r) {
    const feeBadgeClass = r.feeStatus === "Paid" 
      ? "background: rgba(16, 185, 129, 0.15); color: #34D399; border: 1px solid rgba(16, 185, 129, 0.3);" 
      : "background: rgba(245, 158, 11, 0.15); color: #FBBF24; border: 1px solid rgba(245, 158, 11, 0.3);";

    let statusBadgeClass = "background: rgba(16, 185, 129, 0.15); color: #34D399; border: 1px solid rgba(16, 185, 129, 0.3);";
    if (r.status === "Expired") {
      statusBadgeClass = "background: rgba(239, 68, 68, 0.15); color: #F87171; border: 1px solid rgba(239, 68, 68, 0.3);";
    } else if (r.status === "Disabled") {
      statusBadgeClass = "background: rgba(156, 163, 175, 0.15); color: #9CA3AF; border: 1px solid rgba(156, 163, 175, 0.3);";
    }

    const planBadge = r.plan === "Premium"
      ? "background: rgba(139, 92, 246, 0.15); color: #C4B5FD; border: 1px solid rgba(139, 92, 246, 0.3);"
      : r.plan === "Standard"
      ? "background: rgba(255, 90, 0, 0.15); color: #FFA166; border: 1px solid rgba(255, 90, 0, 0.3);"
      : "background: rgba(59, 130, 246, 0.15); color: #93C5FD; border: 1px solid rgba(59, 130, 246, 0.3);";

    return `
      <tr style="border-bottom: 1px solid var(--border-subtle); transition: background 0.15s ease;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
        <!-- RESTAURANT NAME -->
        <td style="padding: 14px 16px; cursor: pointer;" onclick="SuperAdminView.openDetailModal('${r.id}')">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 36px; height: 36px; border-radius: var(--radius-md); background: rgba(255, 90, 0, 0.1); border: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: center; font-weight: 800; color: var(--primary); font-size: 14px; flex-shrink: 0;">
              ${App.escapeHtml(r.restaurantName.slice(0, 2).toUpperCase())}
            </div>
            <div>
              <div style="font-weight: 700; color: #FFF; font-size: 14px;">${App.escapeHtml(r.restaurantName)}</div>
              <div style="font-size: 11px; color: var(--text-dim);">${r.tableCount || 0} Tables • Click to view full details</div>
            </div>
          </div>
        </td>

        <!-- OWNER -->
        <td style="padding: 14px 16px; color: var(--text-main); font-weight: 600; font-size: 13px;">
          ${App.escapeHtml(r.ownerName)}
        </td>

        <!-- CITY -->
        <td style="padding: 14px 16px;">
          <span style="font-size: 12px; font-weight: 600; color: var(--text-main); background: rgba(255,255,255,0.05); padding: 3px 8px; border-radius: 4px; border: 1px solid var(--border-subtle);">
            ${App.escapeHtml(r.city)}
          </span>
        </td>

        <!-- WHATSAPP / PHONE -->
        <td style="padding: 14px 16px; font-size: 12px;">
          <div style="font-weight: 600; color: #34D399; display: flex; align-items: center; gap: 4px;">
            <span>WA:</span>
            <span>${App.escapeHtml(r.whatsapp)}</span>
          </div>
          <div style="color: var(--text-dim); margin-top: 2px;">
            <span>Ph:</span> ${App.escapeHtml(r.phone)}
          </div>
        </td>

        <!-- PLAN -->
        <td style="padding: 14px 16px;">
          <div style="display: inline-flex; flex-direction: column; gap: 2px;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; ${planBadge}">
              ${r.plan}
            </span>
            <span style="font-size: 11px; color: var(--text-dim); font-weight: 600;">Rs. ${Number(r.monthlyFee || 0).toLocaleString("en-PK")}/mo</span>
          </div>
        </td>

        <!-- FEE STATUS -->
        <td style="padding: 14px 16px;">
          <span style="display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; ${feeBadgeClass}">
            ${r.feeStatus === 'Paid' ? 'Paid ✓' : 'Unpaid ⚠️'}
          </span>
        </td>

        <!-- START DATE -->
        <td style="padding: 14px 16px; font-size: 12px; color: var(--text-dim); white-space: nowrap;">
          ${r.startDate || '—'}
        </td>

        <!-- EXPIRY DATE -->
        <td style="padding: 14px 16px; font-size: 12px; white-space: nowrap;">
          <div>${r.expiryDate || '—'}</div>
          <div style="font-size: 11px; margin-top: 2px;">${getDaysRemainingText(r.expiryDate)}</div>
        </td>

        <!-- STATUS -->
        <td style="padding: 14px 16px;">
          <span style="display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; ${statusBadgeClass}">
            ${r.status}
          </span>
        </td>

        <!-- ADMIN USERNAME -->
        <td style="padding: 14px 16px; font-size: 12px; font-family: monospace;">
          <span style="background: rgba(255,255,255,0.06); padding: 3px 8px; border-radius: 4px; color: #FFA166; font-weight: 600;">
            ${App.escapeHtml(r.adminUsername)}
          </span>
        </td>

        <!-- ACTIONS -->
        <td style="padding: 14px 16px; text-align: right; white-space: nowrap;">
          <div style="display: inline-flex; align-items: center; gap: 6px;">
            <!-- VIEW DETAIL -->
            <button class="btn btn-secondary btn-sm" onclick="SuperAdminView.openDetailModal('${r.id}')" title="View Full A to Z Detail" style="padding: 6px 10px; font-size: 12px;">
              👁️ View
            </button>

            <!-- EDIT -->
            <button class="btn btn-secondary btn-sm" onclick="SuperAdminView.openEditModal('${r.id}')" title="Edit Restaurant Details & Credentials" style="padding: 6px 10px; font-size: 12px;">
              ✏️ Edit
            </button>

            <!-- DISABLE / ENABLE TOGGLE -->
            <button class="btn ${r.disabled ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="SuperAdminView.toggleStatus('${r.id}')" title="${r.disabled ? 'Enable Restaurant' : 'Disable Restaurant'}" style="padding: 6px 10px; font-size: 12px;">
              ${r.disabled ? '▶️ Enable' : '⏸️ Disable'}
            </button>

            <!-- CHANGE PASSWORD QUICK -->
            <button class="btn btn-secondary btn-sm" onclick="SuperAdminView.openPasswordModal('${r.id}')" title="Change Admin Password" style="padding: 6px 10px; font-size: 12px;">
              🔑 Pass
            </button>

            <!-- CHANGE PLAN QUICK -->
            <button class="btn btn-secondary btn-sm" onclick="SuperAdminView.openPlanModal('${r.id}')" title="Change Plan & Expiry" style="padding: 6px 10px; font-size: 12px;">
              📋 Plan
            </button>

            <!-- REMOVE -->
            <button class="btn btn-danger btn-sm" onclick="SuperAdminView.promptRemove('${r.id}')" title="Remove Restaurant" style="padding: 6px 10px; font-size: 12px;">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  // Filter setters
  function setSearch(query) {
    state.searchQuery = query;
    render();
  }

  function setCity(city) {
    state.selectedCity = city;
    render();
  }

  function setPlan(plan) {
    state.selectedPlan = plan;
    render();
  }

  function setStatus(status) {
    state.selectedStatus = status;
    render();
  }

  function resetFilters() {
    state.searchQuery = "";
    state.selectedCity = "All";
    state.selectedPlan = "All";
    state.selectedStatus = "All";
    render();
  }

  // MODAL MANAGEMENT
  function closeModal() {
    const container = document.getElementById("super-admin-modal-container");
    if (container) container.innerHTML = "";
    state.activeModal = null;
    state.selectedRestaurantId = null;
  }

  // 1. ADD RESTAURANT MODAL (FULL A TO Z DATA AT ONCE)
  function openAddModal() {
    state.activeModal = "add";
    const container = document.getElementById("super-admin-modal-container");
    if (!container) return;

    const todayStr = new Date().toISOString().slice(0, 10);
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const expiryStr = futureDate.toISOString().slice(0, 10);

    container.innerHTML = `
      <div class="super-modal-backdrop" onclick="if(event.target === this) SuperAdminView.closeModal()">
        <div class="super-modal-content" style="max-width: 680px;">
          <!-- MODAL HEADER -->
          <div class="super-modal-header">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="badge" style="background: rgba(255, 90, 0, 0.15); color: var(--primary); font-weight: 700; font-size: 11px; padding: 2px 8px; border-radius: 4px;">A to Z Onboarding</span>
                <h3 style="font-size: 18px; font-weight: 800; color: #FFF;">Add New Restaurant</h3>
              </div>
              <p style="font-size: 12px; color: var(--text-dim); margin-top: 3px;">
                Enter complete details once. Starts completely fresh with 0 categories, 0 products, and 0 orders.
              </p>
            </div>
            <button class="modal-close-btn" onclick="SuperAdminView.closeModal()" title="Close">✕</button>
          </div>

          <!-- ERROR BANNER -->
          <div id="add-rest-error" class="error-alert" style="margin: 0 24px 16px; display: none;"></div>

          <!-- MODAL FORM -->
          <form id="add-restaurant-form" onsubmit="SuperAdminView.submitAddRestaurant(event)" style="padding: 0 24px 24px;">
            
            <!-- SECTION 1: RESTAURANT PROFILE -->
            <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--primary); margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid var(--border-subtle);">
              1. Business Profile & Contact
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
              <div class="form-group">
                <label class="form-label" for="add-rest-name">Restaurant Name *</label>
                <input class="form-control" type="text" id="add-rest-name" required placeholder="e.g. Royal Shinwari">
              </div>

              <div class="form-group">
                <label class="form-label" for="add-owner-name">Owner Name *</label>
                <input class="form-control" type="text" id="add-owner-name" required placeholder="e.g. Tariq Shinwari">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
              <div class="form-group">
                <label class="form-label" for="add-phone">Phone Number *</label>
                <input class="form-control" type="text" id="add-phone" required placeholder="e.g. 0300-8889900">
              </div>

              <div class="form-group">
                <label class="form-label" for="add-whatsapp">WhatsApp Number * (Pakistani Mobile)</label>
                <input class="form-control" type="text" id="add-whatsapp" required placeholder="e.g. 0300-8889900 or 03008889900">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 14px; margin-bottom: 14px;">
              <div class="form-group">
                <label class="form-label" for="add-city">City *</label>
                <input class="form-control" type="text" id="add-city" required placeholder="e.g. Peshawar">
              </div>

              <div class="form-group">
                <label class="form-label" for="add-address">Full Address *</label>
                <input class="form-control" type="text" id="add-address" required placeholder="e.g. Ring Road, Phase 3, Peshawar">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 14px; margin-bottom: 18px;">
              <div class="form-group">
                <label class="form-label" for="add-logo">Logo Asset Path / URL</label>
                <input class="form-control" type="text" id="add-logo" value="assets/logo.svg" placeholder="assets/logo.svg">
              </div>

              <div class="form-group">
                <label class="form-label" for="add-tables">Number of Tables *</label>
                <input class="form-control" type="number" id="add-tables" min="1" max="99" value="10" required>
              </div>
            </div>

            <!-- SECTION 2: ADMIN LOGIN CREDENTIALS -->
            <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--primary); margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid var(--border-subtle);">
              2. Restaurant Admin Login (Unique Username & Password)
            </div>

            <div class="form-group" style="margin-bottom: 14px;">
              <label class="form-label" for="add-admin-username">Admin Username * (Must be Unique)</label>
              <input class="form-control" type="text" id="add-admin-username" required placeholder="e.g. royal_shinwari_admin">
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 18px;">
              <div class="form-group">
                <label class="form-label" for="add-admin-password">Admin Password * (Min 8 chars)</label>
                <input class="form-control" type="password" id="add-admin-password" minlength="8" required placeholder="•••••••• (min 8 characters)">
              </div>

              <div class="form-group">
                <label class="form-label" for="add-confirm-password">Confirm Password *</label>
                <input class="form-control" type="password" id="add-confirm-password" minlength="8" required placeholder="•••••••• (re-enter password)">
              </div>
            </div>

            <!-- SECTION 3: SUBSCRIPTION & BILLING -->
            <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--primary); margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid var(--border-subtle);">
              3. Subscription Plan & Licensing Fees
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-bottom: 14px;">
              <div class="form-group">
                <label class="form-label" for="add-plan">Plan *</label>
                <select class="form-control" id="add-plan" onchange="SuperAdminView.handleAddPlanChange(this.value)">
                  <option value="Basic">Basic (Rs. 2,000/mo)</option>
                  <option value="Standard" selected>Standard (Rs. 3,500/mo)</option>
                  <option value="Premium">Premium (Rs. 5,000/mo)</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label" for="add-fee">Monthly Fee (Rs.) *</label>
                <input class="form-control" type="number" id="add-fee" value="3500" required>
              </div>

              <div class="form-group">
                <label class="form-label" for="add-fee-status">Fee Status *</label>
                <select class="form-control" id="add-fee-status">
                  <option value="Paid" selected>Paid ✓</option>
                  <option value="Unpaid">Unpaid ⚠️</option>
                </select>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 24px;">
              <div class="form-group">
                <label class="form-label" for="add-start-date">Start Date *</label>
                <input class="form-control" type="date" id="add-start-date" value="${todayStr}" required>
              </div>

              <div class="form-group">
                <label class="form-label" for="add-expiry-date">Expiry Date *</label>
                <input class="form-control" type="date" id="add-expiry-date" value="${expiryStr}" required>
              </div>
            </div>

            <!-- MODAL BUTTONS -->
            <div style="display: flex; align-items: center; justify-content: flex-end; gap: 12px; pt: 16px; border-top: 1px solid var(--border-subtle);">
              <button type="button" class="btn btn-secondary" onclick="SuperAdminView.closeModal()">Cancel</button>
              <button type="submit" class="btn btn-primary" style="padding: 10px 24px; font-weight: 700;">
                <span>Save & Onboard Restaurant</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  function handleAddPlanChange(plan) {
    const feeInput = document.getElementById("add-fee");
    if (!feeInput) return;
    if (plan === "Basic") feeInput.value = 2000;
    else if (plan === "Standard") feeInput.value = 3500;
    else if (plan === "Premium") feeInput.value = 5000;
  }

  function submitAddRestaurant(event) {
    event.preventDefault();
    const errorBox = document.getElementById("add-rest-error");
    if (errorBox) errorBox.style.display = "none";

    const restaurantName = document.getElementById("add-rest-name").value.trim();
    const ownerName = document.getElementById("add-owner-name").value.trim();
    const phone = document.getElementById("add-phone").value.trim();
    const whatsapp = document.getElementById("add-whatsapp").value.trim();
    const city = document.getElementById("add-city").value.trim();
    const address = document.getElementById("add-address").value.trim();
    const logo = document.getElementById("add-logo").value.trim() || "assets/logo.svg";
    const tableCount = Number(document.getElementById("add-tables").value) || 10;
    const adminUsername = document.getElementById("add-admin-username").value.trim();
    const adminPassword = document.getElementById("add-admin-password").value;
    const confirmPassword = document.getElementById("add-confirm-password").value;
    const plan = document.getElementById("add-plan").value;
    const monthlyFee = Number(document.getElementById("add-fee").value) || 3500;
    const feeStatus = document.getElementById("add-fee-status").value;
    const startDate = document.getElementById("add-start-date").value;
    const expiryDate = document.getElementById("add-expiry-date").value;

    try {
      const created = DB.addRestaurant({
        restaurantName,
        ownerName,
        phone,
        whatsapp,
        city,
        address,
        logo,
        tableCount,
        adminUsername,
        adminPassword,
        confirmPassword,
        plan,
        monthlyFee,
        feeStatus,
        startDate,
        expiryDate
      });

      App.showToast(`Restaurant "${created.restaurantName}" added with full A to Z data!`, "success");
      closeModal();
      render();
    } catch (err) {
      if (errorBox) {
        errorBox.textContent = err.message;
        errorBox.style.display = "block";
      } else {
        App.showToast(err.message, "error");
      }
    }
  }

  // 2. EDIT RESTAURANT MODAL (CHANGE DETAILS, LOGO, TABLES, PLAN, FEE, EXPIRY, CREDS)
  function openEditModal(restaurantId) {
    const r = DB.getRestaurantById(restaurantId);
    if (!r) {
      App.showToast("Restaurant not found", "error");
      return;
    }

    state.activeModal = "edit";
    state.selectedRestaurantId = restaurantId;

    const container = document.getElementById("super-admin-modal-container");
    if (!container) return;

    container.innerHTML = `
      <div class="super-modal-backdrop" onclick="if(event.target === this) SuperAdminView.closeModal()">
        <div class="super-modal-content" style="max-width: 680px;">
          <!-- MODAL HEADER -->
          <div class="super-modal-header">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="badge" style="background: rgba(255, 90, 0, 0.15); color: var(--primary); font-weight: 700; font-size: 11px; padding: 2px 8px; border-radius: 4px;">Edit Restaurant</span>
                <h3 style="font-size: 18px; font-weight: 800; color: #FFF;">${App.escapeHtml(r.restaurantName)}</h3>
              </div>
              <p style="font-size: 12px; color: var(--text-dim); margin-top: 3px;">Update profile details, subscription plan, tables, or admin login.</p>
            </div>
            <button class="modal-close-btn" onclick="SuperAdminView.closeModal()" title="Close">✕</button>
          </div>

          <!-- ERROR BANNER -->
          <div id="edit-rest-error" class="error-alert" style="margin: 0 24px 16px; display: none;"></div>

          <!-- EDIT FORM -->
          <form id="edit-restaurant-form" onsubmit="SuperAdminView.submitEditRestaurant(event, '${r.id}')" style="padding: 0 24px 24px;">
            
            <!-- SECTION 1 -->
            <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--primary); margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid var(--border-subtle);">
              1. Business Details
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
              <div class="form-group">
                <label class="form-label" for="edit-rest-name">Restaurant Name *</label>
                <input class="form-control" type="text" id="edit-rest-name" required value="${App.escapeHtml(r.restaurantName)}">
              </div>

              <div class="form-group">
                <label class="form-label" for="edit-owner-name">Owner Name *</label>
                <input class="form-control" type="text" id="edit-owner-name" required value="${App.escapeHtml(r.ownerName)}">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
              <div class="form-group">
                <label class="form-label" for="edit-phone">Phone Number *</label>
                <input class="form-control" type="text" id="edit-phone" required value="${App.escapeHtml(r.phone)}">
              </div>

              <div class="form-group">
                <label class="form-label" for="edit-whatsapp">WhatsApp Number *</label>
                <input class="form-control" type="text" id="edit-whatsapp" required value="${App.escapeHtml(r.whatsapp)}">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 14px; margin-bottom: 14px;">
              <div class="form-group">
                <label class="form-label" for="edit-city">City *</label>
                <input class="form-control" type="text" id="edit-city" required value="${App.escapeHtml(r.city)}">
              </div>

              <div class="form-group">
                <label class="form-label" for="edit-address">Full Address *</label>
                <input class="form-control" type="text" id="edit-address" required value="${App.escapeHtml(r.address)}">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 14px; margin-bottom: 18px;">
              <div class="form-group">
                <label class="form-label" for="edit-logo">Logo Asset Path</label>
                <input class="form-control" type="text" id="edit-logo" value="${App.escapeHtml(r.logo || 'assets/logo.svg')}">
              </div>

              <div class="form-group">
                <label class="form-label" for="edit-tables">Total Tables</label>
                <input class="form-control" type="number" id="edit-tables" min="1" max="99" value="${r.tableCount || 10}" required>
              </div>
            </div>

            <!-- SECTION 2: SUBSCRIPTION & DATES -->
            <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--primary); margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid var(--border-subtle);">
              2. Plan, Fee & Expiry
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-bottom: 14px;">
              <div class="form-group">
                <label class="form-label" for="edit-plan">Plan</label>
                <select class="form-control" id="edit-plan" onchange="SuperAdminView.handleEditPlanChange(this.value)">
                  <option value="Basic" ${r.plan === 'Basic' ? 'selected' : ''}>Basic (Rs. 2,000/mo)</option>
                  <option value="Standard" ${r.plan === 'Standard' ? 'selected' : ''}>Standard (Rs. 3,500/mo)</option>
                  <option value="Premium" ${r.plan === 'Premium' ? 'selected' : ''}>Premium (Rs. 5,000/mo)</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label" for="edit-fee">Monthly Fee (Rs.)</label>
                <input class="form-control" type="number" id="edit-fee" value="${r.monthlyFee || 3500}" required>
              </div>

              <div class="form-group">
                <label class="form-label" for="edit-fee-status">Fee Status</label>
                <select class="form-control" id="edit-fee-status">
                  <option value="Paid" ${r.feeStatus === 'Paid' ? 'selected' : ''}>Paid ✓</option>
                  <option value="Unpaid" ${r.feeStatus === 'Unpaid' ? 'selected' : ''}>Unpaid ⚠️</option>
                </select>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 18px;">
              <div class="form-group">
                <label class="form-label" for="edit-start-date">Start Date</label>
                <input class="form-control" type="date" id="edit-start-date" value="${r.startDate || ''}" required>
              </div>

              <div class="form-group">
                <label class="form-label" for="edit-expiry-date">Expiry Date</label>
                <input class="form-control" type="date" id="edit-expiry-date" value="${r.expiryDate || ''}" required>
              </div>
            </div>

            <!-- SECTION 3: ADMIN CREDENTIALS -->
            <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--primary); margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid var(--border-subtle);">
              3. Restaurant Admin Login
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 24px;">
              <div class="form-group">
                <label class="form-label" for="edit-admin-username">Admin Username *</label>
                <input class="form-control" type="text" id="edit-admin-username" required value="${App.escapeHtml(r.adminUsername)}">
              </div>

              <div class="form-group">
                <label class="form-label" for="edit-admin-password">New Password (leave blank to keep current)</label>
                <input class="form-control" type="password" id="edit-admin-password" minlength="8" placeholder="Enter new password (optional)">
              </div>
            </div>

            <!-- BUTTONS -->
            <div style="display: flex; align-items: center; justify-content: flex-end; gap: 12px; pt: 16px; border-top: 1px solid var(--border-subtle);">
              <button type="button" class="btn btn-secondary" onclick="SuperAdminView.closeModal()">Cancel</button>
              <button type="submit" class="btn btn-primary" style="padding: 10px 24px; font-weight: 700;">
                <span>Save All Changes</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  function handleEditPlanChange(plan) {
    const feeInput = document.getElementById("edit-fee");
    if (!feeInput) return;
    if (plan === "Basic") feeInput.value = 2000;
    else if (plan === "Standard") feeInput.value = 3500;
    else if (plan === "Premium") feeInput.value = 5000;
  }

  function submitEditRestaurant(event, id) {
    event.preventDefault();
    const errorBox = document.getElementById("edit-rest-error");
    if (errorBox) errorBox.style.display = "none";

    const restaurantName = document.getElementById("edit-rest-name").value.trim();
    const ownerName = document.getElementById("edit-owner-name").value.trim();
    const phone = document.getElementById("edit-phone").value.trim();
    const whatsapp = document.getElementById("edit-whatsapp").value.trim();
    const city = document.getElementById("edit-city").value.trim();
    const address = document.getElementById("edit-address").value.trim();
    const logo = document.getElementById("edit-logo").value.trim() || "assets/logo.svg";
    const tableCount = Number(document.getElementById("edit-tables").value) || 10;
    const adminUsername = document.getElementById("edit-admin-username").value.trim();
    const newPassword = document.getElementById("edit-admin-password").value;
    const plan = document.getElementById("edit-plan").value;
    const monthlyFee = Number(document.getElementById("edit-fee").value) || 3500;
    const feeStatus = document.getElementById("edit-fee-status").value;
    const startDate = document.getElementById("edit-start-date").value;
    const expiryDate = document.getElementById("edit-expiry-date").value;

    const patch = {
      restaurantName,
      ownerName,
      phone,
      whatsapp,
      city,
      address,
      logo,
      tableCount,
      adminUsername,
      plan,
      monthlyFee,
      feeStatus,
      startDate,
      expiryDate
    };

    if (newPassword) {
      patch.adminPassword = newPassword;
    }

    try {
      DB.updateRestaurant(id, patch);
      App.showToast(`Restaurant "${restaurantName}" updated successfully!`, "success");
      closeModal();
      render();
    } catch (err) {
      if (errorBox) {
        errorBox.textContent = err.message;
        errorBox.style.display = "block";
      } else {
        App.showToast(err.message, "error");
      }
    }
  }

  // 3. FULL DETAIL MODAL (A TO Z IN ONE PLACE)
  function openDetailModal(restaurantId) {
    const r = DB.getRestaurantById(restaurantId);
    if (!r) return;

    state.activeModal = "detail";
    state.selectedRestaurantId = restaurantId;

    const container = document.getElementById("super-admin-modal-container");
    if (!container) return;

    const feeBadgeClass = r.feeStatus === "Paid" 
      ? "background: rgba(16, 185, 129, 0.15); color: #34D399; border: 1px solid rgba(16, 185, 129, 0.3);" 
      : "background: rgba(245, 158, 11, 0.15); color: #FBBF24; border: 1px solid rgba(245, 158, 11, 0.3);";

    let statusBadgeClass = "background: rgba(16, 185, 129, 0.15); color: #34D399; border: 1px solid rgba(16, 185, 129, 0.3);";
    if (r.status === "Expired") {
      statusBadgeClass = "background: rgba(239, 68, 68, 0.15); color: #F87171; border: 1px solid rgba(239, 68, 68, 0.3);";
    } else if (r.status === "Disabled") {
      statusBadgeClass = "background: rgba(156, 163, 175, 0.15); color: #9CA3AF; border: 1px solid rgba(156, 163, 175, 0.3);";
    }

    container.innerHTML = `
      <div class="super-modal-backdrop" onclick="if(event.target === this) SuperAdminView.closeModal()">
        <div class="super-modal-content" style="max-width: 720px;">
          <!-- HEADER -->
          <div class="super-modal-header" style="align-items: flex-start;">
            <div style="display: flex; align-items: center; gap: 14px;">
              <div style="width: 48px; height: 48px; border-radius: var(--radius-lg); background: rgba(255, 90, 0, 0.12); border: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: center; font-weight: 800; color: var(--primary); font-size: 18px; flex-shrink: 0;">
                ${App.escapeHtml(r.restaurantName.slice(0, 2).toUpperCase())}
              </div>
              <div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <h3 style="font-size: 20px; font-weight: 800; color: #FFF;">${App.escapeHtml(r.restaurantName)}</h3>
                  <span style="font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; ${statusBadgeClass}">${r.status}</span>
                  <span style="font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; ${feeBadgeClass}">${r.feeStatus}</span>
                </div>
                <p style="font-size: 12px; color: var(--text-dim); margin-top: 4px;">
                  Owner: <strong style="color: #FFF;">${App.escapeHtml(r.ownerName)}</strong> • ${App.escapeHtml(r.city)} • Onboarded: ${r.startDate || (r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'Active')}
                </p>
              </div>
            </div>
            <button class="modal-close-btn" onclick="SuperAdminView.closeModal()" title="Close">✕</button>
          </div>

          <div style="padding: 0 24px 24px; max-height: calc(85vh - 120px); overflow-y: auto;">
            <!-- SECTION A: CONTACT & LOCATION -->
            <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 18px; margin-bottom: 16px;">
              <h4 style="font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--primary); margin-bottom: 12px;">
                A. Contact & Establishment
              </h4>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; font-size: 13px;">
                <div><span style="color: var(--text-dim);">Owner Name:</span> <strong style="color: #FFF;">${App.escapeHtml(r.ownerName)}</strong></div>
                <div><span style="color: var(--text-dim);">City:</span> <strong style="color: #FFF;">${App.escapeHtml(r.city)}</strong></div>
                <div><span style="color: var(--text-dim);">Phone:</span> <strong style="color: #FFF;">${App.escapeHtml(r.phone)}</strong></div>
                <div>
                  <span style="color: var(--text-dim);">WhatsApp:</span> 
                  <strong style="color: #34D399;">${App.escapeHtml(r.whatsapp)}</strong>
                  <a href="https://wa.me/${r.whatsapp.replace(/[^0-9]/g, '')}" target="_blank" rel="noopener noreferrer" style="margin-left: 6px; font-size: 11px; color: #34D399; text-decoration: underline;">Open Chat ↗</a>
                </div>
                <div><span style="color: var(--text-dim);">Configured Tables:</span> <strong style="color: #FFF;">${r.tableCount || 0} Tables</strong></div>
                <div><span style="color: var(--text-dim);">Onboarded Date:</span> <strong style="color: #FFF;">${r.startDate || (r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'Active')}</strong></div>
                <div style="grid-column: span 2;"><span style="color: var(--text-dim);">Full Address:</span> <strong style="color: #FFF;">${App.escapeHtml(r.address)}</strong></div>
                <div style="grid-column: span 2;"><span style="color: var(--text-dim);">Logo Path:</span> <code style="color: var(--text-muted); background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;">${App.escapeHtml(r.logo || 'assets/logo.svg')}</code></div>
              </div>
            </div>

            <!-- SECTION B: SUBSCRIPTION & FEES -->
            <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 18px; margin-bottom: 16px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                <h4 style="font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--primary);">
                  B. Subscription Plan & Billing Status
                </h4>
                <button class="btn btn-secondary btn-sm" onclick="SuperAdminView.openPlanModal('${r.id}')" style="padding: 4px 10px; font-size: 11px;">Change Plan</button>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; font-size: 13px;">
                <div><span style="color: var(--text-dim);">Subscription Plan:</span> <strong style="color: #FFF;">${r.plan}</strong></div>
                <div><span style="color: var(--text-dim);">Monthly Fee:</span> <strong style="color: #FFF;">Rs. ${Number(r.monthlyFee || 0).toLocaleString("en-PK")}</strong></div>
                <div><span style="color: var(--text-dim);">Fee Status:</span> <strong style="color: ${r.feeStatus === 'Paid' ? '#34D399' : '#FBBF24'};">${r.feeStatus}</strong></div>
                <div><span style="color: var(--text-dim);">Start Date:</span> <strong style="color: #FFF;">${r.startDate || '—'}</strong></div>
                <div><span style="color: var(--text-dim);">Expiry Date:</span> <strong style="color: #FFF;">${r.expiryDate || '—'}</strong></div>
                <div><span style="color: var(--text-dim);">Status & Days Left:</span> ${getDaysRemainingText(r.expiryDate)}</div>
              </div>
            </div>

            <!-- SECTION C: ADMIN LOGIN -->
            <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 18px; margin-bottom: 24px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                <h4 style="font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--primary);">
                  C. Restaurant Admin Login Credentials
                </h4>
                <button class="btn btn-secondary btn-sm" onclick="SuperAdminView.openPasswordModal('${r.id}')" style="padding: 4px 10px; font-size: 11px;">Change Password</button>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; font-size: 13px;">
                <div><span style="color: var(--text-dim);">Admin Username:</span> <code style="font-weight: 700; color: #FFA166; background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;">${App.escapeHtml(r.adminUsername)}</code></div>
                <div>
                  <span style="color: var(--text-dim);">Admin Password:</span> 
                  <span id="detail-pass-text" style="font-family: monospace; font-weight: 700; color: #FFF; background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;">••••••••</span>
                  <button type="button" class="btn btn-secondary btn-sm" onclick="SuperAdminView.toggleDetailPassword('${App.escapeHtml(r.adminPassword)}')" style="margin-left: 6px; padding: 2px 6px; font-size: 10px;">Show</button>
                </div>
              </div>
            </div>

            <!-- FOOTER ACTIONS -->
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; pt: 16px; border-top: 1px solid var(--border-subtle);">
              <button type="button" class="btn btn-danger btn-sm" onclick="SuperAdminView.promptRemove('${r.id}')">
                🗑️ Remove Restaurant
              </button>

              <div style="display: flex; align-items: center; gap: 10px;">
                <button type="button" class="btn ${r.disabled ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="SuperAdminView.toggleStatus('${r.id}')">
                  ${r.disabled ? '▶️ Enable Restaurant' : '⏸️ Disable Restaurant'}
                </button>
                <button type="button" class="btn btn-secondary btn-sm" onclick="SuperAdminView.openEditModal('${r.id}')">
                  ✏️ Edit Restaurant
                </button>
                <button type="button" class="btn btn-primary btn-sm" onclick="SuperAdminView.closeModal()">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function toggleDetailPassword(realPass) {
    const el = document.getElementById("detail-pass-text");
    if (!el) return;
    if (el.textContent === "••••••••") {
      el.textContent = realPass;
    } else {
      el.textContent = "••••••••";
    }
  }

  // 4. QUICK CHANGE PASSWORD MODAL
  function openPasswordModal(restaurantId) {
    const r = DB.getRestaurantById(restaurantId);
    if (!r) return;

    state.activeModal = "password";
    state.selectedRestaurantId = restaurantId;

    const container = document.getElementById("super-admin-modal-container");
    if (!container) return;

    container.innerHTML = `
      <div class="super-modal-backdrop" onclick="if(event.target === this) SuperAdminView.closeModal()">
        <div class="super-modal-content" style="max-width: 440px;">
          <div class="super-modal-header">
            <div>
              <h3 style="font-size: 16px; font-weight: 800; color: #FFF;">Change Admin Password</h3>
              <p style="font-size: 12px; color: var(--text-dim); margin-top: 2px;">${App.escapeHtml(r.restaurantName)} (${App.escapeHtml(r.adminUsername)})</p>
            </div>
            <button class="modal-close-btn" onclick="SuperAdminView.closeModal()">✕</button>
          </div>

          <div id="quick-pass-error" class="error-alert" style="margin: 0 20px 14px; display: none;"></div>

          <form onsubmit="SuperAdminView.submitQuickPassword(event, '${r.id}')" style="padding: 0 20px 20px;">
            <div class="form-group" style="margin-bottom: 14px;">
              <label class="form-label" for="quick-new-pass">New Password * (min 8 chars)</label>
              <input class="form-control" type="password" id="quick-new-pass" minlength="8" required placeholder="Enter at least 8 characters">
            </div>

            <div class="form-group" style="margin-bottom: 20px;">
              <label class="form-label" for="quick-confirm-pass">Confirm Password *</label>
              <input class="form-control" type="password" id="quick-confirm-pass" minlength="8" required placeholder="Re-enter password">
            </div>

            <div style="display: flex; align-items: center; justify-content: flex-end; gap: 10px;">
              <button type="button" class="btn btn-secondary btn-sm" onclick="SuperAdminView.closeModal()">Cancel</button>
              <button type="submit" class="btn btn-primary btn-sm">Update Password</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  function submitQuickPassword(event, id) {
    event.preventDefault();
    const p1 = document.getElementById("quick-new-pass").value;
    const p2 = document.getElementById("quick-confirm-pass").value;
    const errorBox = document.getElementById("quick-pass-error");

    if (p1.length < 8) {
      if (errorBox) {
        errorBox.textContent = "Password must be at least 8 characters.";
        errorBox.style.display = "block";
      }
      return;
    }

    if (p1 !== p2) {
      if (errorBox) {
        errorBox.textContent = "Passwords do not match.";
        errorBox.style.display = "block";
      }
      return;
    }

    try {
      DB.updateRestaurant(id, { adminPassword: p1 });
      App.showToast("Admin password updated successfully!", "success");
      closeModal();
      render();
    } catch (err) {
      if (errorBox) {
        errorBox.textContent = err.message;
        errorBox.style.display = "block";
      }
    }
  }

  // 5. QUICK CHANGE PLAN / FEE / EXPIRY MODAL
  function openPlanModal(restaurantId) {
    const r = DB.getRestaurantById(restaurantId);
    if (!r) return;

    state.activeModal = "plan";
    state.selectedRestaurantId = restaurantId;

    const container = document.getElementById("super-admin-modal-container");
    if (!container) return;

    container.innerHTML = `
      <div class="super-modal-backdrop" onclick="if(event.target === this) SuperAdminView.closeModal()">
        <div class="super-modal-content" style="max-width: 480px;">
          <div class="super-modal-header">
            <div>
              <h3 style="font-size: 16px; font-weight: 800; color: #FFF;">Update Subscription & Licensing</h3>
              <p style="font-size: 12px; color: var(--text-dim); margin-top: 2px;">${App.escapeHtml(r.restaurantName)}</p>
            </div>
            <button class="modal-close-btn" onclick="SuperAdminView.closeModal()">✕</button>
          </div>

          <form onsubmit="SuperAdminView.submitQuickPlan(event, '${r.id}')" style="padding: 0 20px 20px;">
            <div class="form-group" style="margin-bottom: 14px;">
              <label class="form-label" for="quick-plan-name">Subscription Plan</label>
              <select class="form-control" id="quick-plan-name" onchange="SuperAdminView.handleQuickPlanChange(this.value)">
                <option value="Basic" ${r.plan === 'Basic' ? 'selected' : ''}>Basic (Rs. 2,000/mo)</option>
                <option value="Standard" ${r.plan === 'Standard' ? 'selected' : ''}>Standard (Rs. 3,500/mo)</option>
                <option value="Premium" ${r.plan === 'Premium' ? 'selected' : ''}>Premium (Rs. 5,000/mo)</option>
              </select>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
              <div class="form-group">
                <label class="form-label" for="quick-fee">Monthly Fee (Rs.)</label>
                <input class="form-control" type="number" id="quick-fee" value="${r.monthlyFee || 3500}" required>
              </div>

              <div class="form-group">
                <label class="form-label" for="quick-fee-status">Fee Status</label>
                <select class="form-control" id="quick-fee-status">
                  <option value="Paid" ${r.feeStatus === 'Paid' ? 'selected' : ''}>Paid ✓</option>
                  <option value="Unpaid" ${r.feeStatus === 'Unpaid' ? 'selected' : ''}>Unpaid ⚠️</option>
                </select>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
              <div class="form-group">
                <label class="form-label" for="quick-start-date">Start Date</label>
                <input class="form-control" type="date" id="quick-start-date" value="${r.startDate || ''}" required>
              </div>

              <div class="form-group">
                <label class="form-label" for="quick-expiry-date">Expiry Date</label>
                <input class="form-control" type="date" id="quick-expiry-date" value="${r.expiryDate || ''}" required>
              </div>
            </div>

            <div style="display: flex; align-items: center; justify-content: flex-end; gap: 10px;">
              <button type="button" class="btn btn-secondary btn-sm" onclick="SuperAdminView.closeModal()">Cancel</button>
              <button type="submit" class="btn btn-primary btn-sm">Save Plan Settings</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  function handleQuickPlanChange(plan) {
    const feeInput = document.getElementById("quick-fee");
    if (!feeInput) return;
    if (plan === "Basic") feeInput.value = 2000;
    else if (plan === "Standard") feeInput.value = 3500;
    else if (plan === "Premium") feeInput.value = 5000;
  }

  function submitQuickPlan(event, id) {
    event.preventDefault();
    const plan = document.getElementById("quick-plan-name").value;
    const monthlyFee = Number(document.getElementById("quick-fee").value) || 3500;
    const feeStatus = document.getElementById("quick-fee-status").value;
    const startDate = document.getElementById("quick-start-date").value;
    const expiryDate = document.getElementById("quick-expiry-date").value;

    try {
      DB.updateRestaurant(id, { plan, monthlyFee, feeStatus, startDate, expiryDate });
      App.showToast("Subscription & Plan settings saved!", "success");
      closeModal();
      render();
    } catch (err) {
      App.showToast(err.message, "error");
    }
  }

  // 6. TOGGLE STATUS (DISABLE / ENABLE)
  function toggleStatus(restaurantId) {
    const r = DB.toggleRestaurantStatus(restaurantId);
    if (r) {
      App.showToast(`Restaurant "${r.restaurantName}" is now ${r.status}!`, r.disabled ? "warning" : "success");
      render();
      // If detail modal is open, re-render it
      if (state.activeModal === "detail" && state.selectedRestaurantId === restaurantId) {
        openDetailModal(restaurantId);
      }
    }
  }

  // 7. REMOVE RESTAURANT (WITH EXPLICIT NAME CONFIRMATION)
  function promptRemove(restaurantId) {
    const r = DB.getRestaurantById(restaurantId);
    if (!r) return;

    state.activeModal = "remove";
    state.selectedRestaurantId = restaurantId;

    const container = document.getElementById("super-admin-modal-container");
    if (!container) return;

    container.innerHTML = `
      <div class="super-modal-backdrop" onclick="if(event.target === this) SuperAdminView.closeModal()">
        <div class="super-modal-content" style="max-width: 460px; border-color: rgba(239, 68, 68, 0.4);">
          <div class="super-modal-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 20px;">⚠️</span>
              <h3 style="font-size: 16px; font-weight: 800; color: var(--danger);">Confirm Restaurant Removal</h3>
            </div>
            <button class="modal-close-btn" onclick="SuperAdminView.closeModal()">✕</button>
          </div>

          <div style="padding: 0 20px 20px;">
            <p style="font-size: 13px; color: var(--text-main); margin-bottom: 12px; line-height: 1.6;">
              Are you sure you want to permanently remove <strong style="color: #FFF; font-size: 14px;">"${App.escapeHtml(r.restaurantName)}"</strong>?
            </p>

            <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: var(--radius-sm); padding: 12px; font-size: 12px; color: #FCA5A5; margin-bottom: 20px; line-height: 1.5;">
              • This will permanently delete this restaurant's Admin login, tables, menu, and orders.<br>
              • Other restaurants in the system will <strong>NOT</strong> be affected.
            </div>

            <div style="display: flex; align-items: center; justify-content: flex-end; gap: 10px;">
              <button type="button" class="btn btn-secondary btn-sm" onclick="SuperAdminView.closeModal()">Cancel</button>
              <button type="button" class="btn btn-danger btn-sm" onclick="SuperAdminView.confirmRemove('${r.id}')" style="font-weight: 700; padding: 8px 16px;">
                Yes, Remove Restaurant
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function confirmRemove(restaurantId) {
    const r = DB.getRestaurantById(restaurantId);
    const name = r ? r.restaurantName : "Restaurant";
    const ok = DB.deleteRestaurant(restaurantId);
    if (ok) {
      App.showToast(`Restaurant "${name}" has been removed.`, "info");
      closeModal();
      render();
    } else {
      App.showToast("Failed to remove restaurant", "error");
    }
  }

  // Compatibility helpers for Admin credentials, plan settings & database maintenance
  function saveAdminCreds(event) {
    if (event && event.preventDefault) event.preventDefault();
    const userEl = document.getElementById("super-admin-user");
    const passEl = document.getElementById("super-admin-pass");
    const user = userEl ? userEl.value.trim() : "";
    const pass = passEl ? passEl.value : "";
    if (user && pass && pass.length >= 8) {
      Auth.updateAdminCredentials(user, pass);
      App.showToast("Admin credentials updated", "success");
    }
  }

  function savePlanSettings(event) {
    if (event && event.preventDefault) event.preventDefault();
    const planEl = document.getElementById("super-plan-name");
    const feeEl = document.getElementById("super-fee-status");
    const toggleEl = document.getElementById("super-disabled-toggle");
    DB.saveSettings({
      plan: planEl ? planEl.value : "Standard",
      feeStatus: feeEl ? feeEl.value : "Paid",
      disabled: toggleEl ? toggleEl.checked : false
    });
    App.showToast("Plan settings saved", "success");
  }

  function promptClearOrders() {
    const confirmation = prompt("⚠️ CONFIRMATION REQUIRED:\nType 'CLEAR' to delete all orders and reset profit to 0:");
    if (confirmation === "CLEAR") {
      DB.clearAllOrders();
      App.showToast("All orders cleared. Dashboard profit and orders reset to 0.", "success");
      render();
    }
  }

  // Export methods
  window.SuperAdminView = {
    render,
    setSearch,
    setCity,
    setPlan,
    setStatus,
    resetFilters,
    closeModal,
    openAddModal,
    handleAddPlanChange,
    submitAddRestaurant,
    openEditModal,
    handleEditPlanChange,
    submitEditRestaurant,
    openDetailModal,
    toggleDetailPassword,
    openPasswordModal,
    submitQuickPassword,
    openPlanModal,
    handleQuickPlanChange,
    submitQuickPlan,
    toggleStatus,
    promptRemove,
    confirmRemove,
    saveAdminCreds,
    savePlanSettings,
    promptClearOrders,
    clearAllOrders: () => DB.clearAllOrders()
  };
})();
