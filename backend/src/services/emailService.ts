interface SendEmailParams {
  to: string;
  subject: string;
  body?: string;
  _html?: string;
}

interface EmailResult {
  success: boolean;
  messageId: string;
}

export async function sendEmail({
  to,
  subject,
  body,
  _html,
}: SendEmailParams): Promise<EmailResult> {
  console.log("Email queued:", { to, subject, preview: body?.substring(0, 100) });
  return { success: true, messageId: `mock-${Date.now()}` };
}

interface InvoiceEmailParams {
  to: string;
  invoiceNumber: string;
  clientName: string;
  totalAmount: number;
  periodStart: string;
  periodEnd: string;
  disputeWindowHours: number;
}

export async function sendInvoiceEmail({
  to,
  invoiceNumber,
  clientName,
  totalAmount,
  periodStart,
  periodEnd,
  disputeWindowHours,
}: InvoiceEmailParams): Promise<EmailResult> {
  return sendEmail({
    to,
    subject: `Invoice ${invoiceNumber} - Billing Period ${periodStart} to ${periodEnd}`,
    body: `Dear ${clientName},

Your invoice for the billing period ${periodStart} to ${periodEnd} is ready.

Total Due: $${totalAmount.toFixed(2)}

You have ${disputeWindowHours} hours to dispute this invoice before automatic payment is processed.

If you have any questions, please contact your account manager.

StaffVerify Finance Team`,
  });
}

interface PaymentConfirmationParams {
  to: string;
  invoiceNumber: string;
  totalAmount: number;
  clientName: string;
}

export async function sendPaymentConfirmationEmail({
  to,
  invoiceNumber,
  totalAmount,
  clientName,
}: PaymentConfirmationParams): Promise<EmailResult> {
  return sendEmail({
    to,
    subject: `Payment Confirmed - Invoice ${invoiceNumber}`,
    body: `Dear ${clientName},

Your payment of $${totalAmount.toFixed(2)} for invoice ${invoiceNumber} has been successfully processed.

Thank you for your business.

StaffVerify Finance Team`,
  });
}

interface PaymentFailedParams {
  to: string;
  invoiceNumber: string;
  totalAmount: number;
  _clientName?: string;
}

export async function sendPaymentFailedEmail({
  to,
  invoiceNumber,
  totalAmount,
  _clientName,
}: PaymentFailedParams): Promise<EmailResult> {
  return sendEmail({
    to,
    subject: `Payment Failed - Invoice ${invoiceNumber}`,
    body: `We were unable to process your payment of $${totalAmount.toFixed(2)} for invoice ${invoiceNumber}.

Please update your payment method at your earliest convenience.

A retry will be attempted in 48 hours.

StaffVerify Finance Team`,
  });
}

interface QueueAlertParams {
  to: string;
  jobId: string;
  jobType: string;
  payerName: string;
  queueSize: number;
}

export async function sendQueueAlertEmail({
  to,
  jobId,
  jobType,
  payerName,
  queueSize,
}: QueueAlertParams): Promise<EmailResult> {
  return sendEmail({
    to,
    subject: "Automation Queue Alert — Over 20 Jobs Pending",
    body: `The browser automation queue has exceeded ${queueSize} pending jobs. For urgent cases, consider manual portal submission.

Job queued: ${jobId} | Type: ${jobType} | Payer: ${payerName}`,
  });
}
