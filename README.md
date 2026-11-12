# Karahi House — Restaurant QR Menu System

A mobile-first QR menu and restaurant operations system for Pakistani restaurants. Built with plain HTML, CSS and JavaScript — no build step, no framework and no backend. Menu, orders, tables, staff, feedback and billing are stored in the browser's `localStorage`, separated by restaurant ID.

## Pages

| Page | Path | Purpose |
| --- | --- | --- |
| Sales landing page | `landing.html` | Public marketing page with plans, demo and WhatsApp contact |
| Customer menu | `index.html?restaurant=<id>&table=<number>` | QR menu, cart, order tracking, waiter call, bill request, feedback |
| Restaurant admin | `admin/login.html` | Menu, orders, kitchen, tables and QR codes, offers, reports, staff, settings, feedback |
| Super Admin | `superadmin/login.html` | Restaurants, plans, payments, onboarding checklist and demo management |
| Sales demo | `demo/karahi-house/?table=5` | Shareable SAMPLE demo with Table 5 locked |

## Run locally

**Option 1 — XAMPP**

1. Copy this folder to `C:\xampp\htdocs\resturant`.
2. Start **Apache** in the XAMPP control panel.
3. Open `http://localhost/resturant/landing.html` (or the port your Apache uses, for example `http://localhost:8080/resturant/landing.html`).

**Option 2 — any static server**

```bash
cd resturant
npx serve .
```

Then open the URL the server prints, for example `http://localhost:3000/landing.html`.

No install, database or API key is required. All data stays in the browser that created it.

**Demo logins (SAMPLE only)**

- Restaurant admin: `demo` / `demo1234`
- Super Admin: set your own credentials in `superadmin/js/config.js` before first use.

## Replace the placeholders before going live

Real credentials, phone numbers and payment accounts must not ship in project code.

| File | What to edit |
| --- | --- |
| `superadmin/js/config.js` | Super Admin username/password, default plans, JazzCash/Easypaisa/Bank placeholders |
| `js/landing-config.js` | Landing SEO title/description, plan prices, WhatsApp number and display |
| `js/config.js` | Restaurant name, categories, SAMPLE menu, restaurant WhatsApp placeholder |
| `js/demo-data.js` | SAMPLE demo restaurant only — keep its dishes and prices as the demo dataset |
| `sitemap.xml` | Replace `[YOUR_DOMAIN]` with the deployed domain |

Plan prices appear in two places by design: the public landing page (`js/landing-config.js`) and Super Admin billing (`superadmin/js/config.js`). Update both together so the sales page and invoices match.

## Deploy in 5 steps

1. Replace every placeholder above, update `sitemap.xml` with your domain, and confirm the landing prices match the Super Admin plans.
2. Deploy the whole folder as a static site:
   - **Vercel:** import the project or drag the folder into a new static project.
   - **Netlify:** drag the folder into Netlify Drop, or connect the repository with no build command and publish directory `.`.
   - **Hostinger:** upload the folder contents to `public_html` using File Manager or FTP.
3. Open `https://<your-domain>/landing.html` and check the page on a phone. Replace `[YOUR_WHATSAPP_NUMBER]` before sharing the link.
4. Sign in at `superadmin/login.html`, add the restaurant, confirm its plan and copy its menu link.
5. Sign in to the restaurant admin, print the table QR codes from **Tables → Print All QR Codes**, place one test order, and hand the QR sheets to the restaurant.

If the site is deployed in a subfolder, keep the folder structure intact. The demo link, QR links and admin pages are all relative.

## Add a restaurant

1. Open **Super Admin → Restaurants → Add restaurant**.
2. Enter the restaurant name, owner, city, WhatsApp number and plan. The Super Admin creates the restaurant ID, admin login and 30-day billing cycle.
3. Open the restaurant's onboarding checklist and tick each item as the setup progresses: restaurant added, menu items added, tables and QR printed, staff added, test order placed, plan paid and active.
4. Give the owner the admin login and menu link. Print QR codes from the restaurant admin's **Tables** page.

## Reset the demo

1. Open **Super Admin → Restaurants**.
2. In the **Demo restaurant** panel, click **Reset Demo Data** and confirm.
3. The demo menu, 12 tables, settings and staff are restored, and all demo orders, feedback and service requests are cleared. Real restaurants are untouched.

The demo lives under the fixed restaurant ID `demo-karahi-house`, so demo orders never mix with real restaurant orders. Its shareable link is `/demo/karahi-house/?table=5`.

## Change plans and prices

- Sales page: edit `plans.items` in `js/landing-config.js`.
- Super Admin billing: edit `plans` in `superadmin/js/config.js`.
- Payment methods remain manual: JazzCash, Easypaisa, Bank Transfer or Cash. There is no online payment gateway.
- Record payments in **Super Admin → Payments**; each payment moves the restaurant's due date forward by the billing cycle.

## Feedback and QR printing

- Guests see the feedback card on the tracking screen after an order is marked **Served**. Feedback is saved with order number, table, restaurant ID, stars, comment and time.
- Approve or reject feedback in **Admin → Guest Feedback**. Only **Approved + Shown** feedback appears on the customer menu. The empty state says “No feedback yet”; no fake reviews are generated.
- **Print All QR Codes** prints every table on its own A4 page with the restaurant name and a large table number.

## SEO and performance

- The landing page title and description are read from `seo` in `js/landing-config.js`.
- `sitemap.xml` lists the landing page and demo page only. Admin pages are private and intentionally excluded.
- Dish images are compressed JPEGs in `assets/` and rendered with `loading="lazy"` and `decoding="async"`.

## Data notes and limitations

- This is a front-end local-storage system. Data is per browser and per device; clearing site data removes it. The Super Admin registry, plans and payments are also local to that browser.
- Login is a client-side convenience gate for this project, not production-grade authentication. For multiple devices, real accounts or central data, connect the same UI to a backend later.
- All prices are in PKR. The demo restaurant and its data live under the isolated `demo-karahi-house` ID and are marked SAMPLE in the Super Admin list, the landing page and the demo data file.
