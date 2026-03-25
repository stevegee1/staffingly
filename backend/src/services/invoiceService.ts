import prisma from "../lib/prisma.js";
import * as stripeService from "./stripeService.js";
import * as emailService from "./emailService.js";

interface WeekRange {
  lastMonday: Date;
  lastSunday: Date;
}

function getLastWeekRange(): WeekRange {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysToLastMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const lastMonday = new Date(now);
  lastMonday.setDate(now.getDate() - daysToLastMonday - 7);
  lastMonday.setHours(0, 0, 0, 0);

  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);
  lastSunday.setHours(23, 59, 59, 999);

  return { lastMonday, lastSunday };
}

interface UsageCounts {
  eligibilityChecks: number;
  priorAuthSubmissions: number;
  approvedAuths: number;
  appealsFiled: number;
}

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface LineItemsResult {
  lineItems: LineItem[];
  subtotal: number;
}

interface PricingPackage {
  monthlyBaseFee: number;
  unlimitedEligibility: boolean;
  ratePerEligibilityCheck: number;
  includedEligibilityChecks?: number;
  overageRateEligibility?: number;
  unlimitedPriorAuths: boolean;
  ratePerPriorAuth: number;
  includedPriorAuths?: number;
  overageRatePriorAuth?: number;
  chargeOnApproval: boolean;
  ratePerApprovedPriorAuth: number;
  unlimitedAppeals: boolean;
  ratePerAppeal: number;
  includedAppeals?: number;
  name: string;
}

function buildLineItems(pkg: PricingPackage, counts: UsageCounts): LineItemsResult {
  const { eligibilityChecks, priorAuthSubmissions, approvedAuths, appealsFiled } = counts;
  const lineItems: LineItem[] = [];
  let subtotal = 0;

  if (pkg.monthlyBaseFee > 0) {
    const weeklyBase = pkg.monthlyBaseFee / 4;
    lineItems.push({
      description: "Base Fee (weekly)",
      quantity: 1,
      unitPrice: weeklyBase,
      total: weeklyBase,
    });
    subtotal += weeklyBase;
  }

  if (!pkg.unlimitedEligibility && pkg.ratePerEligibilityCheck > 0) {
    const overage = Math.max(0, eligibilityChecks - (pkg.includedEligibilityChecks || 0));
    if (overage > 0) {
      const rate = pkg.overageRateEligibility || pkg.ratePerEligibilityCheck;
      const total = overage * rate;
      lineItems.push({
        description: `Eligibility Checks - Overage (${overage} units)`,
        quantity: overage,
        unitPrice: rate,
        total,
      });
      subtotal += total;
    }
  } else if (pkg.ratePerEligibilityCheck > 0) {
    const total = eligibilityChecks * pkg.ratePerEligibilityCheck;
    lineItems.push({
      description: `Eligibility Checks (${eligibilityChecks} units)`,
      quantity: eligibilityChecks,
      unitPrice: pkg.ratePerEligibilityCheck,
      total,
    });
    subtotal += total;
  }

  if (!pkg.unlimitedPriorAuths && pkg.ratePerPriorAuth > 0) {
    const overage = Math.max(0, priorAuthSubmissions - (pkg.includedPriorAuths || 0));
    if (overage > 0) {
      const rate = pkg.overageRatePriorAuth || pkg.ratePerPriorAuth;
      const total = overage * rate;
      lineItems.push({
        description: `Prior Auth - Overage (${overage} units)`,
        quantity: overage,
        unitPrice: rate,
        total,
      });
      subtotal += total;
    }
  } else if (pkg.ratePerPriorAuth > 0) {
    const total = priorAuthSubmissions * pkg.ratePerPriorAuth;
    lineItems.push({
      description: `Prior Auth Submissions (${priorAuthSubmissions} units)`,
      quantity: priorAuthSubmissions,
      unitPrice: pkg.ratePerPriorAuth,
      total,
    });
    subtotal += total;
  }

  if (pkg.chargeOnApproval && pkg.ratePerApprovedPriorAuth > 0) {
    const total = approvedAuths * pkg.ratePerApprovedPriorAuth;
    lineItems.push({
      description: `Approved Prior Auths (${approvedAuths} units)`,
      quantity: approvedAuths,
      unitPrice: pkg.ratePerApprovedPriorAuth,
      total,
    });
    subtotal += total;
  }

  if (!pkg.unlimitedAppeals && pkg.ratePerAppeal > 0) {
    const billable = Math.max(0, appealsFiled - (pkg.includedAppeals || 0));
    if (billable > 0) {
      const total = billable * pkg.ratePerAppeal;
      lineItems.push({
        description: `Appeals (${billable} units)`,
        quantity: billable,
        unitPrice: pkg.ratePerAppeal,
        total,
      });
      subtotal += total;
    }
  } else if (pkg.ratePerAppeal > 0) {
    const total = appealsFiled * pkg.ratePerAppeal;
    lineItems.push({
      description: `Appeals (${appealsFiled} units)`,
      quantity: appealsFiled,
      unitPrice: pkg.ratePerAppeal,
      total,
    });
    subtotal += total;
  }

  return { lineItems, subtotal };
}

interface InvoiceGenerationResult {
  clientId: string;
  invoiceId: string;
  total: number;
}

interface GenerateWeeklyInvoicesResult {
  success: boolean;
  invoicesGenerated: number;
  results: InvoiceGenerationResult[];
}

export async function generateWeeklyInvoices(
  triggeredBy = "system"
): Promise<GenerateWeeklyInvoicesResult> {
  const { lastMonday, lastSunday } = getLastWeekRange();
  const periodStart = lastMonday.toISOString().split("T")[0]!;
  const periodEnd = lastSunday.toISOString().split("T")[0]!;

  const profiles = await prisma.billingProfile.findMany({
    where: { billingPaused: false },
    include: { client: true, pricingPackage: true },
  });

  const results: InvoiceGenerationResult[] = [];

  for (const profile of profiles) {
    if (!profile.stripeCustomerId || !profile.pricingPackage) continue;

    const pkg = profile.pricingPackage;

    const eligibilityChecks = await prisma.eligibilityCheck.count({
      where: { clientId: profile.clientId, createdAt: { gte: lastMonday, lte: lastSunday } },
    });

    const periodCases = await prisma.priorAuthCase.findMany({
      where: { clientId: profile.clientId, createdAt: { gte: lastMonday, lte: lastSunday } },
    });

    const priorAuthSubmissions = periodCases.filter((c: { status: string }) =>
      ["SUBMITTED", "APPROVED", "DENIED", "APPEAL_IN_PROGRESS", "PEER_TO_PEER_REQUESTED"].includes(
        c.status
      )
    ).length;
    const approvedAuths = periodCases.filter(
      (c: { status: string }) => c.status === "APPROVED"
    ).length;
    const appealsFiled = periodCases.filter(
      (c: { appealSubmittedAt: unknown }) => c.appealSubmittedAt
    ).length;

    const { lineItems, subtotal } = buildLineItems(pkg as unknown as PricingPackage, {
      eligibilityChecks,
      priorAuthSubmissions,
      approvedAuths,
      appealsFiled,
    });

    const periodCredits = await prisma.billingCredit.findMany({
      where: { clientId: profile.clientId, appliedToInvoiceId: null },
    });
    const totalCredits = periodCredits.reduce(
      (sum: number, c: { amount: number }) => sum + c.amount,
      0
    );

    const taxAmount = subtotal * ((profile.taxRate || 0) / 100);
    const totalDue = Math.max(0, subtotal - totalCredits + taxAmount);

    const invoiceNumber = `INV-${Date.now()}-${profile.clientId.slice(-4).toUpperCase()}`;
    const disputeWindowCloses = new Date(
      Date.now() + (profile.disputeWindowHours || 24) * 60 * 60 * 1000
    );

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        clientId: profile.clientId!,
        clientName: profile.client!.name!,
        billingPeriodStart: lastMonday,
        billingPeriodEnd: lastSunday,
        lineItemsJson: JSON.stringify(lineItems),
        subtotal,
        taxAmount,
        creditsApplied: totalCredits,
        totalAmount: totalDue,
        status: "DISPUTE_WINDOW",
        disputeWindowOpensAt: new Date(),
        disputeWindowClosesAt: disputeWindowCloses,
        pricingPackageName: pkg.name,
        generatedBy: triggeredBy,
      },
    });

    for (const credit of periodCredits) {
      await prisma.billingCredit.update({
        where: { id: credit.id },
        data: { appliedToInvoiceId: invoice.id },
      });
    }

    if (profile.billingContactEmail) {
      await emailService.sendInvoiceEmail({
        to: profile.billingContactEmail,
        invoiceNumber,
        clientName: profile.billingContactName || profile.client.name || "Valued Client",
        totalAmount: totalDue,
        periodStart,
        periodEnd,
        disputeWindowHours: profile.disputeWindowHours || 24,
      });
    }

    await prisma.billingAuditLog.create({
      data: {
        eventType: "invoice_generated",
        clientId: profile.clientId,
        clientName: profile.client.name,
        invoiceId: invoice.id,
        description: `Invoice ${invoiceNumber} generated. Total: $${totalDue.toFixed(2)}`,
        performedBy: triggeredBy,
      },
    });

    results.push({ clientId: profile.clientId, invoiceId: invoice.id, total: totalDue });
  }

  return { success: true, invoicesGenerated: results.length, results };
}

interface DisputeProcessingResult {
  invoiceId: string;
  status: string;
  error?: string;
}

interface ProcessDisputeWindowChargesResult {
  success: boolean;
  processed: number;
  results: DisputeProcessingResult[];
}

export async function processDisputeWindowCharges(): Promise<ProcessDisputeWindowChargesResult> {
  const now = new Date();

  const invoices = await prisma.invoice.findMany({
    where: { status: "DISPUTE_WINDOW", disputeWindowClosesAt: { lte: now } },
    include: { client: { include: { billingProfile: true } } },
  });

  const results: DisputeProcessingResult[] = [];

  for (const invoice of invoices) {
    const profile = invoice.client?.billingProfile;
    if (!profile?.stripeCustomerId || profile.billingPaused || profile.accountFlagged) continue;

    const amountInCents = Math.round(invoice.totalAmount * 100);

    if (amountInCents <= 0) {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: "PAID", paidAt: now },
      });
      results.push({ invoiceId: invoice.id, status: "zero_amount" });
      continue;
    }

    try {
      const paymentIntent = await stripeService.chargeInvoice({
        stripeCustomerId: profile.stripeCustomerId,
        amountInCents,
        invoiceNumber: invoice.invoiceNumber,
        clientName: invoice.clientName,
        invoiceId: invoice.id,
        clientId: invoice.clientId,
      });

      if (paymentIntent.status === "succeeded") {
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: "PAID", stripePaymentIntentId: paymentIntent.id, paidAt: now },
        });

        if (profile.billingContactEmail) {
          await emailService.sendPaymentConfirmationEmail({
            to: profile.billingContactEmail,
            invoiceNumber: invoice.invoiceNumber,
            totalAmount: invoice.totalAmount,
            clientName: profile.billingContactName || invoice.clientName,
          });
        }

        results.push({ invoiceId: invoice.id, status: "charged" });
      } else {
        throw new Error(`PaymentIntent status: ${paymentIntent.status}`);
      }
    } catch (err) {
      const error = err as { code?: string; message: string };
      const retryDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: "PAYMENT_FAILED",
          paymentFailedAt: now,
          stripeErrorCode: error.code || "unknown",
          stripeErrorMessage: error.message,
          retryScheduledAt: retryDate,
        },
      });

      await prisma.billingProfile.update({
        where: { id: profile.id },
        data: { accountFlagged: true, flagReason: `Payment failed: ${error.message}` },
      });

      const financeAdmins = await prisma.user.findMany({ where: { role: "FINANCE_ADMIN" } });

      for (const admin of financeAdmins) {
        await prisma.notification.create({
          data: {
            clientId: invoice.clientId,
            userId: admin.id,
            type: "payment_failed",
            title: `Payment Failed - ${invoice.clientName}`,
            body: `Invoice ${invoice.invoiceNumber} charge failed: ${error.message}.`,
            relatedInvoiceId: invoice.id,
          },
        });
      }

      if (profile.billingContactEmail) {
        await emailService.sendPaymentFailedEmail({
          to: profile.billingContactEmail,
          invoiceNumber: invoice.invoiceNumber,
          totalAmount: invoice.totalAmount,
          _clientName: profile.billingContactName || invoice.clientName,
        });
      }

      results.push({ invoiceId: invoice.id, status: "failed", error: error.message });
    }
  }

  return { success: true, processed: results.length, results };
}
