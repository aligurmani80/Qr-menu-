/* ==========================================================================
   QR MENU & ADMIN LOCAL SYNC SERVER
   Zero-dependency Node.js server for multi-device testing & real-time sync.
   Serves Admin from D:\admin and Customer Menu from Qr-menu-.
   ========================================================================== */

const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");

const PORT = 5000;
const ADMIN_DIR = path.resolve(__dirname);
const CUSTOMER_DIR = path.resolve("C:\\Users\\DELL\\Documents\\GitHub\\Qr-menu-");
const ORDERS_FILE = path.join(ADMIN_DIR, "live_orders.json");

// In-memory orders cache
let liveOrders = [];
try {
  if (fs.existsSync(ORDERS_FILE)) {
    liveOrders = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf8"));
  }
} catch (e) {
  liveOrders = [];
}

// Find local IP address for phone QR scanning
function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "localhost";
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg"
};

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // API Endpoints
  if (pathname === "/api/ip") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ip: getLocalIP(), port: PORT }));
    return;
  }

  if (pathname === "/api/orders") {
    if (req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(liveOrders));
      return;
    }

    if (req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => { body += chunk; });
      req.on("end", () => {
        try {
          const data = JSON.parse(body);
          if (Array.isArray(data)) {
            liveOrders = data;
          } else if (data && typeof data === "object") {
            const idx = liveOrders.findIndex((o) => String(o.orderNumber) === String(data.orderNumber));
            if (idx >= 0) {
              liveOrders[idx] = { ...liveOrders[idx], ...data };
            } else {
              liveOrders.unshift(data);
            }
          }
          fs.writeFileSync(ORDERS_FILE, JSON.stringify(liveOrders, null, 2));
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true, count: liveOrders.length }));
        } catch (err) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }
  }

  // File serving: routes starting with /admin/ or /admin serve D:\admin
  let targetDir = CUSTOMER_DIR;
  let relativePath = pathname;

  if (pathname.startsWith("/admin")) {
    targetDir = ADMIN_DIR;
    relativePath = pathname.replace(/^\/admin/, "") || "/index.html";
    if (relativePath === "/" || relativePath === "") relativePath = "/index.html";
  } else if (pathname === "/") {
    relativePath = "/index.html";
  }

  let filePath = path.join(targetDir, relativePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Try fallback to index.html in respective dir
      filePath = path.join(targetDir, "index.html");
    }

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("404 Not Found");
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
      res.end(content);
    });
  });
});

server.listen(PORT, "0.0.0.0", () => {
  const ip = getLocalIP();
  console.log(`\n======================================================`);
  console.log(`  QR MENU & ADMIN SERVER RUNNING`);
  console.log(`======================================================`);
  console.log(`  Admin Portal:      http://localhost:${PORT}/admin/`);
  console.log(`  Customer Menu:     http://localhost:${PORT}/?table=1`);
  console.log(`  Phone Wi-Fi Menu:  http://${ip}:${PORT}/?table=1`);
  console.log(`======================================================\n`);
});
