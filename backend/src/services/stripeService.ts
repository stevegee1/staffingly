import Stripe from "stripe";

let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }
    stripeClient = new Stripe(secretKey);
  }
  return stripeClient;
}

interface CreateCustomerParams {
  clientId: string;
  clientName: string;
  billingEmail: string;
}

export async function createCustomer({
  clientId,
  clientName,
  billingEmail,
}: CreateCustomerParams): Promise<Stripe.Customer> {
  const stripe = getStripe();

  return stripe.customers.create({
    name: clientName,
    email: billingEmail,
    metadata: { client_id: clientId, app: "staffverify" },
  });
}

export async function getPaymentMethods(stripeCustomerId: string): Promise<Stripe.PaymentMethod[]> {
  const stripe = getStripe();
  const paymentMethods = await stripe.paymentMethods.list({
    customer: stripeCustomerId,
    type: "card",
  });
  return paymentMethods.data;
}

interface CardInfo {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  paymentMethodId: string;
}

export async function getCardInfo(stripeCustomerId: string): Promise<CardInfo | null> {
  const paymentMethods = await getPaymentMethods(stripeCustomerId);

  if (!paymentMethods.length) {
    return null;
  }

  const pm = paymentMethods[0];
  if (!pm || !pm.card) {
    return null;
  }

  return {
    brand: pm.card.brand,
    last4: pm.card.last4,
    expMonth: pm.card.exp_month,
    expYear: pm.card.exp_year,
    paymentMethodId: pm.id,
  };
}

interface ChargeInvoiceParams {
  stripeCustomerId: string;
  amountInCents: number;
  invoiceNumber: string;
  clientName: string;
  invoiceId: string;
  clientId: string;
}

export async function chargeInvoice({
  stripeCustomerId,
  amountInCents,
  invoiceNumber,
  clientName,
  invoiceId,
  clientId,
}: ChargeInvoiceParams): Promise<Stripe.PaymentIntent> {
  const stripe = getStripe();
  const paymentMethods = await getPaymentMethods(stripeCustomerId);

  if (!paymentMethods.length) {
    throw new Error("No card on file for this customer");
  }

  return stripe.paymentIntents.create({
    amount: amountInCents,
    currency: "usd",
    customer: stripeCustomerId,
    payment_method: paymentMethods[0]!.id,
    confirm: true,
    off_session: true,
    description: `Invoice ${invoiceNumber} - ${clientName}`,
    metadata: { invoice_id: invoiceId, client_id: clientId, app: "staffverify" },
  });
}

export async function createBillingPortalSession(
  stripeCustomerId: string,
  returnUrl?: string
): Promise<Stripe.BillingPortal.Session> {
  const stripe = getStripe();

  return stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl || process.env.APP_URL || "https://staffverify.com",
  });
}

export async function createSetupIntent(stripeCustomerId: string): Promise<Stripe.SetupIntent> {
  const stripe = getStripe();

  return stripe.setupIntents.create({
    customer: stripeCustomerId,
    payment_method_types: ["card"],
  });
}
