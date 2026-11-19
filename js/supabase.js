// =====================================================
// QR Menu System — Supabase Live Orders (ONE FILE)
// File: js/supabase.js
// Fill in your own values in VS Code (Supabase: Settings → API).
// service_role key kabhi yahan mat likhna — sirf anon key.
// =====================================================

const SUPABASE_URL = "https://oyqdbupgbfmjqvbdwxsm.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_vvtscVkny7MY3wPgdAFfzg_qvG0xjWX";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Har order kisi EK restaurant ka hota hai. Admin pages apna id set karte
// hain; warna URL ka ?r= value, phir installed copy ka id.
const DEFAULT_RESTAURANT_ID = "restaurant";
let scopedRestaurantId = "";

function setSupabaseRestaurantId(restaurantId) {
  const id = String(restaurantId == null ? "" : restaurantId).trim();
  if (id) scopedRestaurantId = id;
  return scopedRestaurantId;
}

function currentRestaurantId() {
  if (scopedRestaurantId) return scopedRestaurantId;
  try {
    if (typeof Tenant !== "undefined" && typeof Tenant.activeRestaurantId === "function") {
      const id = String(Tenant.activeRestaurantId() || "").trim();
      if (id) return id;
    }
  } catch (error) {
    // fall through to the installed copy
  }
  try {
    if (typeof Tenant !== "undefined" && Tenant.DEFAULT_RESTAURANT_ID) {
      return String(Tenant.DEFAULT_RESTAURANT_ID);
    }
  } catch (error) {
    // fall through
  }
  return DEFAULT_RESTAURANT_ID;
}

function sameRestaurant(row) {
  return String((row && row.restaurant_id) || "") === currentRestaurantId();
}

// ---------- CUSTOMER: order Supabase mein save karein ----------
async function saveOrderToSupabase(order) {
  const source = order || {};
  const { error } = await supabaseClient
    .from("orders")
    .insert([{
      order_id: source.order_id,
      restaurant_id: String(source.restaurant_id || "").trim() || currentRestaurantId(),
      table_no: source.table_no || null,
      customer_name: source.customer_name,
      customer_mobile: source.customer_mobile,
      items: source.items,
      total_amount: source.total_amount,
      status: "Received",
      order_type: source.order_type
    }]);

  if (error) {
    console.error("Supabase order save failed:", error.message);
    return false;
  }
  return true;
}

// ---------- ADMIN: Supabase se orders load karein (naye pehle) ----------
async function loadOrdersFromSupabase(restaurantId) {
  const scope = String(restaurantId || "").trim() || currentRestaurantId();
  const { data, error } = await supabaseClient
    .from("orders")
    .select("*")
    .eq("restaurant_id", scope)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Orders load failed:", error.message);
    return [];
  }
  return data;
}

// ---------- ADMIN: order status change karein ----------
async function updateOrderStatus(orderId, newStatus, restaurantId) {
  const scope = String(restaurantId || "").trim() || currentRestaurantId();
  const { error } = await supabaseClient
    .from("orders")
    .update({ status: newStatus })
    .eq("order_id", orderId)
    .eq("restaurant_id", scope);

  if (error) {
    console.error("Status update failed:", error.message);
    return false;
  }
  return true;
}

// ---------- LIVE: naya order aate hi foran dikhayein (refresh ke baghair) ----------
supabaseClient
  .channel("orders-live")
  .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
    const newOrder = payload.new;
    if (!sameRestaurant(newOrder)) return;
    if (typeof addOrderToList === "function") addOrderToList(newOrder);
    if (typeof addOrderToKitchen === "function") addOrderToKitchen(newOrder);
    if (typeof playNewOrderSound === "function") playNewOrderSound();
  })
  .subscribe();
