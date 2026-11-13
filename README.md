# Restaurant QR Menu System — Single-Restaurant Copy

One folder serves exactly one restaurant. Customer menu, admin panel, kitchen display, deals, tables/QR codes, orders and feedback all run in the browser. Plain HTML, CSS and JavaScript — no build step, no framework, no backend.

Restaurant identity, admin login, Super Admin login and plan dates come from **one file: `config.js`**. Operational data (menu edits, orders, tables, feedback) stays in this browser's `localStorage`. Super Admin changes (details, plan, fee, restaurant admin password, disabled state) are saved as overrides in this browser and applied on every page load.

## Pages

| Page | Path | Purpose |
| --- | --- | --- |
| Public restaurant page | `landing.html` | Name, logo, address, hours, phone/WhatsApp, "View Menu" |
| Customer menu | `index.html?table=<number>` | QR menu, cart, name/mobile, order tracking, waiter call, bill request, feedback |
| Admin panel | `admin/login.html` | Menu items, orders, kitchen, tables and QR codes, offers/deals, reports, staff, settings, feedback |
| Super Admin login | `admin/super-login.html` | Separate login for the copy owner; not linked from the restaurant admin login |
| Super Admin control | `admin/super.html` | Restaurant details, plan and fee, restaurant admin password, disable/enable, data reset |
| Kitchen display | `admin/kitchen.html` | Live order board with customer name and mobile |

Admin pages are private: do not link them from the public page and do not include them in the sitemap.

## Run locally

**XAMPP**

1. Copy this folder to `C:\xampp\htdocs\resturant`.
2. Start **Apache**.
3. Open `http://localhost/resturant/landing.html`.

**Any static server**

```bash
cd resturant
npx serve .
```

Then open the printed URL, for example `http://localhost:3000/landing.html`.

No install, database or API key is required. All data stays in the browser that created it.

## How to provide a new copy

1. **Copy the whole project folder** to the new location, domain or subdomain. Do not copy a browser's localStorage.
2. **Edit only `config.js`**:
   - `restaurant.name`, `ownerName`, `phone`, `whatsappNumber`, `city`, `address`
   - `restaurant.logo` (path to the logo file)
   - `restaurant.tableCount` (default tables on a fresh copy)
   - `restaurant.openingTiming` and `restaurant.paymentNote`
   - `admin.credentials.username` and `admin.credentials.password` (password at least 8 characters)
   - `superAdmin.username` and `superAdmin.password` (placeholders are `superadmin` / `changeme123` — replace before handing over)
   - `plan.name`, `plan.startDate`, `plan.expiryDate`, `plan.feeStatus`
   - `delivery.charge` and, if needed, `storage.*` keys
3. **Replace the logo file.** Keep `assets/logo.svg` as the filename, or point `restaurant.logo` at the new file. Also regenerate `assets/icon-192.png` and `assets/icon-512.png` from the same logo so the installed app icon matches.
4. **Give the restaurant its new admin login** — the username and password from `config.js`. Sign out of any old session before testing the new login.
5. **Keep the Super Admin login private.** Open `admin/super-login.html` directly with the `superAdmin` values from `config.js`; this page is never linked from the restaurant admin login. Use it to change the restaurant details, plan, fee and restaurant admin password later without editing files.
6. **Replace the sample menu before printing QR codes.** The menu in `config.js` is SAMPLE data. Add the restaurant's real dishes, photos and prices in **Admin → Menu Items**, then delete or edit the sample items.
7. Open `landing.html` and `admin/login.html` once to confirm the new name, logo and login.

No other file needs to change for a new restaurant.

### Two copies on the same domain

`localStorage` is shared across every page on the same origin. If two copies must live on the same domain (for example two subfolders), give each copy its own `storage.*` values in `config.js`, for example `qrMenu.branchA.*` and `qrMenu.branchB.*`. The simplest and safest setup is one domain or subdomain per copy.

## Admin login

- Credentials come from `admin.credentials` in `config.js`, or from **Super Admin → Restaurant Admin login** after the Super Admin changes them.
- The admin session is stored in the browser. After changing the username or password, sign out and sign in again.
- The restaurant admin **cannot** change this login, open Super Admin pages, edit the plan/fee/expiry or see the Super Admin credentials.
- Login is a client-side convenience gate for this project, not production-grade authentication.

## Super Admin

- Open `admin/super-login.html` directly. Credentials come from `superAdmin` in `config.js` (placeholders: `superadmin` / `changeme123`). This page is not linked from the restaurant admin login.
- The Super Admin can open **every** admin page and also gets a **Super Admin** control page plus an editable Settings page for restaurant identity, theme colours and customer messages.
- Super Admin only:
  - Change restaurant name, owner, phone, WhatsApp, city, address, table count and logo without editing code.
  - Create or change the restaurant admin username and password (minimum 8 characters). The restaurant admin cannot change its own password.
  - Change plan (Basic Rs. 2,000 / Standard Rs. 3,500 / Premium Rs. 5,000), start date, expiry date and fee status Paid/Unpaid.
  - Disable or enable the whole copy. A disabled copy and an expired+Unpaid plan both show **"Plan expired. Contact support."** on the customer menu and restaurant admin login.
  - Clear test orders or reset demo data, after a confirmation dialog.
- Super Admin stays available even when the plan is expired or the copy is disabled, so support can restore it.
- All Super Admin changes are saved in this browser's `localStorage` on top of `config.js` and survive a refresh. Clearing site data restores the defaults from `config.js`.
- The Super Admin badge **SUPER ADMIN** is shown on every admin page while signed in as Super Admin.

## Monthly plan, expiry and renewal

The monthly fee is **manual only** — JazzCash, Easypaisa, Bank Transfer or Cash. There is no online payment gateway and no card processing.

Defaults live in `config.js`, and the Super Admin can change them at runtime in **Super Admin → Plan & monthly fee**:

```js
plan: {
  name: "Standard",          // Basic Rs. 2,000 | Standard Rs. 3,500 | Premium Rs. 5,000
  startDate: "2026-11-01",
  expiryDate: "2026-12-01",
  feeStatus: "Unpaid",       // "Paid" or "Unpaid"
}
```

- If **today is after `expiryDate` AND `feeStatus` is `"Unpaid"`**, the customer menu and the admin login are disabled with: **"Plan expired. Contact support."**
- To renew: mark the fee `"Paid"` and/or move `expiryDate` forward (and update `startDate`) in Super Admin control or `config.js`. Reload the page to re-enable the menu and admin.
- Setting `feeStatus` to `"Paid"` keeps the copy active even after the date until you change it back to `"Unpaid"` for the next cycle.
- `planPrices` in `config.js` is the reference for each plan: Basic Rs. 2,000, Standard Rs. 3,500, Premium Rs. 5,000.
- Disabling the copy blocks the menu and restaurant admin login with the same message, even if the plan has not expired. Super Admin can re-enable it.

## Tables and QR codes

- Open the customer menu with `index.html?table=5` to lock Table 5. Without a table parameter, dine-in is unavailable and the menu starts in **Takeaway** mode.
- **Admin → Tables & QR Codes → Print All QR Codes** prints one A4 page per table with the restaurant name and table number.
- QR codes point straight to `index.html?table=N` — the guest does not download an app.
- Dine-in orders require a table. Takeaway and Delivery orders save the selected mode and do not need a table.

## Customer name and mobile

At checkout the customer enters:

- **Name** — required for every order.
- **Mobile** — required for Takeaway and Delivery; optional for Dine-in. Format `03xx-xxxxxxx` (11 digits starting with `03`).
- **Address** — required for Delivery only.

Name and mobile are saved with the order and shown in Admin Orders, Kitchen Display, order tracking, receipts, and order search.

## Deals, categories and trending

- Deals are managed in **Admin → Offers & Deals** and appear as cart items like dishes.
- Category pills filter the menu and update the heading and count. **Popular Items** appears only on **All**.
- **Trending** is calculated from real order history in this browser. If there are no orders yet, it shows "No trending items yet".
- **Signature** is a checkbox in **Admin → Menu Items**, separate from category. A dish can be both a Burger and Signature.
- An empty category shows "No items in this category yet".

## Install as an app (PWA)

The same code runs on laptop and mobile. The manifest is generated from `config.js`, so the installed app name and theme colour follow the restaurant.

- **Laptop (Chrome/Edge):** open the site, click the install icon in the address bar, then **Install**.
- **Android (Chrome):** menu → **Add to Home screen**.
- **iPhone/iPad (Safari):** Share → **Add to Home Screen**.
- Requires `http://` or `https://` (localhost is fine). Opening `index.html` directly from disk does not register the service worker.
- After changing the restaurant name or logo, update the PNG icons and reinstall the app to refresh its icon and name.

## Data notes

- This is a front-end local-storage system. Orders, menu edits and feedback are per browser and per device; clearing site data removes them.
- This copy has one restaurant, one restaurant admin and one Super Admin. There is no restaurant registry.
- The SAMPLE menu in `config.js` is seeded once on a fresh browser and can be edited or deleted in Admin. It is not fake order or review data.
- All reports, order counts and analytics come from real `localStorage` orders only. No fake numbers or reviews are generated.

## Deploy

1. Finish the config and logo changes above.
2. Deploy the whole folder as a static site (Vercel, Netlify, Hostinger or any static host).
3. Update `sitemap.xml` with the domain.
4. Print table QR codes and place one test order.
5. Hand the admin login and QR sheets to the restaurant.

Keep the folder structure intact. All links between pages, QR codes and the service worker are relative.
