/* ==========================================================================
   TABLES & QR CODES MANAGEMENT — INSTANT AUTO-GENERATION & PRINTING
   Auto-linked to Customer Website Menu with Table Number (?table=X)
   ========================================================================== */

(() => {
  "use strict";

  let detectedNetworkHost = "";

  // Query network IP for mobile device QR compatibility
  fetch("/api/ip")
    .then((r) => r.json())
    .then((info) => {
      if (info && info.ip && info.ip !== "localhost") {
        detectedNetworkHost = `http://${info.ip}:${info.port || 5000}`;
        if (window.TablesView) window.TablesView.render();
      }
    })
    .catch(() => {});

  function getBaseCustomerMenuUrl() {
    // If settings have a custom customer menu domain, use it; otherwise compute
    const settings = DB.getSettings();
    if (settings.customerUrl && settings.customerUrl.trim()) {
      return settings.customerUrl.trim();
    }
    if (detectedNetworkHost) {
      return `${detectedNetworkHost}/index.html`;
    }
    const origin = window.location.origin;
    if (origin && origin !== "null" && origin.startsWith("http")) {
      try {
        return new URL("../index.html", window.location.href).href;
      } catch (e) {
        return `${origin}/resturant/index.html`;
      }
    }
    return "http://localhost/resturant/index.html";
  }

  function getTableUrl(tableNumber) {
    const base = getBaseCustomerMenuUrl();
    const url = new URL(base, window.location.href);
    url.searchParams.set("table", String(tableNumber));
    return url.href;
  }

  function render() {
    const container = document.getElementById("view-tables");
    if (!container) return;

    const tables = DB.getTables();
    const settings = DB.getSettings();

    container.innerHTML = `
      <div class="menu-toolbar">
        <div>
          <h3 style="font-size: 16px; font-weight: 700; color: #FFF; margin-bottom: 2px;">Restaurant Tables & QR Menus</h3>
          <p style="font-size: 12px; color: var(--text-dim);">Every table QR code is auto-generated and links directly to that table's digital menu (?table=X).</p>
        </div>

        <div style="display: flex; gap: 10px;">
          <button class="btn btn-secondary btn-sm" onclick="TablesView.printAllQRs()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            <span>Print All QRs</span>
          </button>
          <button class="btn btn-primary btn-sm" onclick="TablesView.openAddTableModal()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            <span>+ Add Table</span>
          </button>
        </div>
      </div>

      <div class="tables-grid">
        ${tables.map((table) => {
          const tableUrl = getTableUrl(table.number);
          return `
            <div class="table-qr-card" id="table-card-${table.number}">
              <div class="table-qr-badge">Table ${table.number}</div>
              
              <div class="qr-canvas-holder" id="qr-holder-${table.number}" data-table="${table.number}">
                <!-- QR Code will render here -->
              </div>

              <div class="table-qr-url" title="${App.escapeHtml(tableUrl)}">
                ${App.escapeHtml(tableUrl)}
              </div>

              <div class="table-qr-actions">
                <button class="btn btn-secondary btn-xs" onclick="TablesView.downloadQr(${table.number})">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  <span>Download</span>
                </button>
                <button class="btn btn-secondary btn-xs" onclick="TablesView.printSingleQr(${table.number})">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                  <span>Print</span>
                </button>
                <button class="btn btn-danger btn-xs" onclick="TablesView.deleteTable(${table.number})">
                  <span>Delete</span>
                </button>
              </div>
            </div>
          `;
        }).join("")}
      </div>

      <!-- ADD TABLE MODAL -->
      <div id="add-table-modal" class="modal-overlay">
        <div class="modal-window">
          <div class="modal-header">
            <h3 class="modal-title">Add New Dining Table</h3>
            <button class="modal-close" onclick="TablesView.closeAddTableModal()">✕</button>
          </div>
          <form onsubmit="TablesView.handleAddTable(event)">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label" for="new-table-num">Table Number *</label>
                <input class="form-control" type="number" id="new-table-num" required min="1" max="999" placeholder="e.g. 13">
              </div>

              <div class="form-group">
                <label class="form-label" for="new-table-seats">Seating Capacity</label>
                <input class="form-control" type="number" id="new-table-seats" value="4" min="1" max="50">
              </div>

              <div style="background: rgba(255, 90, 0, 0.1); border: 1px solid var(--primary-subtle); padding: 12px; border-radius: var(--radius-md); font-size: 12px; color: var(--text-muted);">
                ✨ A dedicated QR code will be <strong>automatically generated</strong> immediately upon saving.
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="TablesView.closeAddTableModal()">Cancel</button>
              <button type="submit" class="btn btn-primary">Generate Table & QR</button>
            </div>
          </form>
        </div>
      </div>
    `;

    // Render all QR codes immediately
    renderAllQrCodes();
  }

  function renderAllQrCodes() {
    const holders = document.querySelectorAll("[data-table]");
    holders.forEach((holder) => {
      const tableNum = Number(holder.dataset.table);
      const url = getTableUrl(tableNum);
      paintQr(holder, url);
    });
  }

  function paintQr(element, text) {
    if (!element) return;
    element.innerHTML = "";
    if (window.QRCode) {
      new window.QRCode(element, {
        text: text,
        width: 140,
        height: 140,
        colorDark: "#000000",
        colorLight: "#FFFFFF",
        correctLevel: window.QRCode.CorrectLevel ? window.QRCode.CorrectLevel.H : 2
      });
    } else {
      element.innerHTML = `<span style="color: red; font-size: 11px;">QR Engine loading...</span>`;
    }
  }

  function openAddTableModal() {
    const modal = document.getElementById("add-table-modal");
    if (!modal) return;
    const tables = DB.getTables();
    const maxNum = tables.reduce((m, t) => Math.max(m, Number(t.number) || 0), 0);
    const input = document.getElementById("new-table-num");
    if (input) input.value = maxNum + 1;
    modal.classList.add("active");
  }

  function closeAddTableModal() {
    const modal = document.getElementById("add-table-modal");
    if (modal) modal.classList.remove("active");
  }

  function handleAddTable(event) {
    event.preventDefault();
    const num = Number(document.getElementById("new-table-num").value);
    const seats = Number(document.getElementById("new-table-seats").value) || 4;

    if (!num || num <= 0) {
      App.showToast("Please enter a valid table number", "error");
      return;
    }

    DB.addTable({ number: num, seats });
    closeAddTableModal();
    App.showToast(`Table ${num} added and QR code generated!`, "success");
    render();
  }

  function deleteTable(tableNumber) {
    if (confirm(`Are you sure you want to remove Table ${tableNumber}?`)) {
      DB.deleteTable(tableNumber);
      App.showToast(`Table ${tableNumber} deleted`, "info");
      render();
    }
  }

  function downloadQr(tableNumber) {
    const holder = document.getElementById(`qr-holder-${tableNumber}`);
    if (!holder) return;
    const canvas = holder.querySelector("canvas");
    let dataUrl = "";
    if (canvas) {
      dataUrl = canvas.toDataURL("image/png");
    } else {
      const img = holder.querySelector("img");
      if (img) dataUrl = img.src;
    }

    if (!dataUrl) {
      App.showToast("Could not export QR image", "error");
      return;
    }

    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `Table-${tableNumber}-QR.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    App.showToast(`Downloaded Table ${tableNumber} QR Code`, "success");
  }

  function printSingleQr(tableNumber) {
    const settings = DB.getSettings();
    const tableUrl = getTableUrl(tableNumber);
    const printWin = window.open("", "_blank", "width=600,height=700");
    if (!printWin) {
      App.showToast("Please allow pop-ups to print QR tent cards", "warning");
      return;
    }

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Table ${tableNumber} QR · ${App.escapeHtml(settings.restaurantName)}</title>
        <link rel="stylesheet" href="css/print.css">
        <script src="js/qrcode.min.js"><\/script>
        <style>
          body { margin: 0; padding: 40px; font-family: sans-serif; display: flex; justify-content: center; background: #FFF; }
          .tent { border: 3px solid #000; border-radius: 16px; padding: 36px 28px; width: 340px; text-align: center; }
          h2 { margin: 0; font-size: 24px; color: #111; }
          .tagline { color: #666; font-size: 13px; margin: 4px 0 16px; }
          .num { font-size: 38px; font-weight: 900; color: #FF5A00; margin: 10px 0 16px; }
          .qr { margin: 16px auto; display: inline-block; background: #FFF; padding: 8px; }
          .inst { font-size: 14px; font-weight: 700; color: #222; margin-top: 14px; line-height: 1.4; }
          .subinst { font-size: 11px; color: #777; margin-top: 6px; }
        </style>
      </head>
      <body>
        <div class="tent">
          <h2>${App.escapeHtml(settings.restaurantName)}</h2>
          <div class="tagline">Smart Table Service</div>
          <div class="num">TABLE ${tableNumber}</div>
          <div id="print-qr" class="qr"></div>
          <div class="inst">SCAN TO VIEW MENU & ORDER</div>
          <div class="subinst">Point your mobile camera to view our digital menu</div>
        </div>
        <script>
          new QRCode(document.getElementById("print-qr"), {
            text: "${tableUrl}",
            width: 180,
            height: 180,
            correctLevel: QRCode.CorrectLevel.H
          });
          setTimeout(() => { window.print(); }, 400);
        <\/script>
      </body>
      </html>
    `);
    printWin.document.close();
  }

  function printAllQRs() {
    const tables = DB.getTables();
    const settings = DB.getSettings();
    if (!tables.length) {
      App.showToast("No tables available to print", "warning");
      return;
    }

    const printWin = window.open("", "_blank", "width=850,height=900");
    if (!printWin) {
      App.showToast("Please allow pop-ups to print", "warning");
      return;
    }

    const cardsHtml = tables.map((t) => {
      const url = getTableUrl(t.number);
      return `
        <div class="tent-card">
          <h2>${App.escapeHtml(settings.restaurantName)}</h2>
          <div class="num">TABLE ${t.number}</div>
          <div id="qr-${t.number}" class="qr-box"></div>
          <div class="inst">SCAN FOR MENU</div>
        </div>
      `;
    }).join("");

    const scriptsHtml = tables.map((t) => `
      new QRCode(document.getElementById("qr-${t.number}"), {
        text: "${getTableUrl(t.number)}",
        width: 130,
        height: 130,
        correctLevel: QRCode.CorrectLevel.H
      });
    `).join("\n");

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>All Table QR Codes · ${App.escapeHtml(settings.restaurantName)}</title>
        <script src="js/qrcode.min.js"><\/script>
        <style>
          body { margin: 20px; font-family: sans-serif; background: #FFF; color: #000; }
          .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
          .tent-card { border: 2px dashed #333; border-radius: 12px; padding: 20px; text-align: center; page-break-inside: avoid; }
          h2 { margin: 0 0 4px; font-size: 18px; }
          .num { font-size: 28px; font-weight: 900; color: #FF5A00; margin: 6px 0; }
          .qr-box { margin: 10px auto; display: inline-block; }
          .inst { font-size: 12px; font-weight: 700; }
        </style>
      </head>
      <body>
        <div class="grid">${cardsHtml}</div>
        <script>
          ${scriptsHtml}
          setTimeout(() => { window.print(); }, 500);
        <\/script>
      </body>
      </html>
    `);
    printWin.document.close();
  }

  window.TablesView = {
    render,
    getTableUrl,
    openAddTableModal,
    closeAddTableModal,
    handleAddTable,
    deleteTable,
    downloadQr,
    printSingleQr,
    printAllQRs
  };
})();
