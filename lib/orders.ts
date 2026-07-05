import "server-only";
import { supabaseAdmin } from "./supabase-admin";

// Rusti's existing IDs top out at C03500 and ORD066198. These reserved
// ranges (leading "9") can never collide with her historical data.
const CUSTOMER_SEQ_START = 90001;
const ORDER_SEQ_START = 900001;

export type CheckoutCustomer = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  streetAddress: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  joinLoyalty: boolean;
};

export type CheckoutLineItem = {
  sku: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
};

async function nextCustomerId(): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("Customers_Core")
    .select('"CustomerID"')
    .like("CustomerID", "C9%")
    .order("CustomerID", { ascending: false })
    .limit(1);
  if (error) throw new Error(`Failed to read Customers_Core: ${error.message}`);

  const last = data?.[0]?.CustomerID as string | undefined;
  const lastSeq = last ? parseInt(last.slice(1), 10) : CUSTOMER_SEQ_START - 1;
  const seq = Math.max(lastSeq + 1, CUSTOMER_SEQ_START);
  return `C${String(seq).padStart(5, "0")}`;
}

async function nextOrderId(): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("Orders")
    .select('"OrderID"')
    .like("OrderID", "ORD9%")
    .order("OrderID", { ascending: false })
    .limit(1);
  if (error) throw new Error(`Failed to read Orders: ${error.message}`);

  const last = data?.[0]?.OrderID as string | undefined;
  const lastSeq = last ? parseInt(last.slice(3), 10) : ORDER_SEQ_START - 1;
  const seq = Math.max(lastSeq + 1, ORDER_SEQ_START);
  return `ORD${String(seq).padStart(6, "0")}`;
}

// Looks up the customer by email (one person, one CustomerID, no matter how
// many orders) or creates a new one in the reserved ID range.
export async function findOrCreateCustomerId(customer: CheckoutCustomer): Promise<string> {
  const email = customer.email.trim().toLowerCase();

  const { data: existing, error: lookupError } = await supabaseAdmin
    .from("Customers_Contact")
    .select('"CustomerID"')
    .eq("Email", email)
    .limit(1)
    .maybeSingle();
  if (lookupError) throw new Error(`Failed to look up customer: ${lookupError.message}`);
  if (existing) return existing.CustomerID as string;

  const customerId = await nextCustomerId();
  const today = new Date().toISOString().slice(0, 10);

  const { error: coreError } = await supabaseAdmin.from("Customers_Core").insert({
    CustomerID: customerId,
    FirstName: customer.firstName,
    LastName: customer.lastName,
    CustomerType: "Shipping",
    JoinDate: today,
    City: customer.city,
    Country: customer.country,
  });
  if (coreError) throw new Error(`Failed to create customer: ${coreError.message}`);

  const { error: contactError } = await supabaseAdmin.from("Customers_Contact").insert({
    CustomerID: customerId,
    Email: email,
    Phone: customer.phone || null,
    LoyaltyMember: customer.joinLoyalty ? "Yes" : "No",
    StreetAddress: customer.streetAddress,
    Region: customer.region || null,
    PostalCode: customer.postalCode,
  });
  if (contactError) throw new Error(`Failed to save customer contact: ${contactError.message}`);

  return customerId;
}

// Creates the Order + OrderLines rows for a paid Stripe session. Idempotent:
// if StripeSessionID already has an order (a retried webhook delivery), the
// unique constraint on Orders.StripeSessionID makes the insert fail and we
// return the existing order instead of creating a duplicate.
export async function createOrderFromSession(
  stripeSessionId: string,
  customer: CheckoutCustomer,
  lines: CheckoutLineItem[],
  shippingFee: number
): Promise<{ orderId: string; alreadyExisted: boolean }> {
  const { data: existingOrder, error: existingError } = await supabaseAdmin
    .from("Orders")
    .select('"OrderID"')
    .eq("StripeSessionID", stripeSessionId)
    .maybeSingle();
  if (existingError) throw new Error(`Failed to check for existing order: ${existingError.message}`);
  if (existingOrder) return { orderId: existingOrder.OrderID as string, alreadyExisted: true };

  const customerId = await findOrCreateCustomerId(customer);
  const orderId = await nextOrderId();
  const today = new Date().toISOString().slice(0, 10);
  const orderTotal = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0) + shippingFee;

  const { error: orderError } = await supabaseAdmin.from("Orders").insert({
    OrderID: orderId,
    OrderDate: today,
    CustID: customerId,
    LocationID: "SHIP-INTL",
    SalesAssociate: "WEB",
    Channel: "Shipping",
    ShippingFee: shippingFee,
    OrderTotal: orderTotal,
    PaymentMethod: "Card",
    StripeSessionID: stripeSessionId,
  });

  if (orderError) {
    // Unique violation on StripeSessionID means a concurrent/retried
    // delivery already created this order — treat it as success, not a bug.
    if (orderError.code === "23505") {
      const { data: raceOrder } = await supabaseAdmin
        .from("Orders")
        .select('"OrderID"')
        .eq("StripeSessionID", stripeSessionId)
        .maybeSingle();
      if (raceOrder) return { orderId: raceOrder.OrderID as string, alreadyExisted: true };
    }
    throw new Error(`Failed to create order: ${orderError.message}`);
  }

  const orderLines = lines.map((line, i) => ({
    OrderID: orderId,
    LineNumber: i + 1,
    ProductCode: line.sku,
    Quantity: line.quantity,
    UnitPrice: line.unitPrice,
    DiscountPct: 0,
    LineRevenue: line.quantity * line.unitPrice,
    LineCost: line.quantity * line.unitCost,
    EffectiveDiscountAmount: 0,
  }));

  const { error: linesError } = await supabaseAdmin.from("OrderLines").insert(orderLines);
  if (linesError) throw new Error(`Failed to create order lines: ${linesError.message}`);

  return { orderId, alreadyExisted: false };
}
