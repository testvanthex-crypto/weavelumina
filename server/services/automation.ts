import { randomBytes } from "crypto";

export async function generateServiceAgreementPDF(userId: number, plan: string): Promise<Buffer> {
  console.log(`[PDF Gen] Generating Service Agreement for plan: ${plan}`);
  // In a real implementation this would use pdfkit or react-pdf
  // const doc = new PDFDocument(); doc.text('Agreement'); ...
  return Buffer.from("%PDF-1.4 Mock Service Agreement PDF Content");
}

export async function generateInvoicePDF(orderId: number, amount: number): Promise<Buffer> {
  console.log(`[PDF Gen] Generating Invoice for order: ${orderId} - Amount: $${(amount / 100).toFixed(2)}`);
  return Buffer.from("%PDF-1.4 Mock Invoice PDF Content");
}

export async function uploadToSecureBucket(fileName: string, buffer: Buffer): Promise<string> {
  const fileKey = randomBytes(16).toString("hex") + "-" + fileName;
  console.log(`[S3 Mock] Uploading ${fileName} to encrypted bucket...`);
  // Generate presigned URL (1 hour expiry)
  const presignedUrl = `https://s3.mock.aws.com/secure-bucket/${fileKey}?X-Amz-Expires=3600&Signature=MockSig`;
  return presignedUrl;
}

export async function sendPostPaymentEmails(email: string, documentUrls: string[]) {
  console.log(`[Email Mock (SendGrid/SES)] Sending Post-Payment Documents to ${email}.`);
  console.log(`[Email Mock (SendGrid/SES)] Attached Links (Expires in 1 hour):`, documentUrls);
}

export async function handlePostPaymentAutomation(userId: number, email: string, orderId: number, amount: number, plan: string) {
  try {
    const agreementBuffer = await generateServiceAgreementPDF(userId, plan);
    const invoiceBuffer = await generateInvoicePDF(orderId, amount);

    const agreementUrl = await uploadToSecureBucket("Service_Agreement.pdf", agreementBuffer);
    const invoiceUrl = await uploadToSecureBucket("Invoice.pdf", invoiceBuffer);

    await sendPostPaymentEmails(email, [agreementUrl, invoiceUrl]);
    console.log(`[Post-Payment Automation] Successfully completed for user ${userId}`);
  } catch (err) {
    console.error("[Post-Payment Automation Failed]", err);
  }
}
