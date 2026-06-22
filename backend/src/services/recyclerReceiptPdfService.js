import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.join(__dirname, '../../assets/wastelink-logo.png');

const formatUGX = (amount) => {
  const value = Number(amount) || 0;
  return `UGX ${value.toLocaleString('en-UG')}`;
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-UG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const drawRow = (doc, label, value, y) => {
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#374151').text(label, 50, y, { width: 160 });
  doc.font('Helvetica').fillColor('#111827').text(String(value ?? '—'), 210, y, { width: 335 });
  return y + 22;
};

export const generatePurchaseReceiptPdf = (receipt) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const headerY = 45;

    if (fs.existsSync(LOGO_PATH)) {
      doc.image(LOGO_PATH, 50, headerY, { width: 72 });
    }

    doc
      .font('Helvetica-Bold')
      .fontSize(22)
      .fillColor('#166534')
      .text('WasteLink Uganda', 135, headerY + 4);

    doc
      .font('Helvetica')
      .fontSize(12)
      .fillColor('#6B7280')
      .text('Recycler Purchase Receipt', 135, headerY + 32);

    doc
      .moveTo(50, 125)
      .lineTo(545, 125)
      .strokeColor('#D1D5DB')
      .lineWidth(1)
      .stroke();

    doc
      .font('Helvetica-Bold')
      .fontSize(14)
      .fillColor('#111827')
      .text(receipt.receipt_id, 50, 140);

    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#6B7280')
      .text(`Completed: ${formatDate(receipt.completed_at)}`, 50, 158);

    let y = 195;

    doc.font('Helvetica-Bold').fontSize(12).fillColor('#111827').text('Buyer', 50, y);
    y += 20;
    y = drawRow(doc, 'Company', receipt.company_name, y);
    y = drawRow(doc, 'Request code', receipt.request_code, y);

    y += 10;
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#111827').text('Purchase details', 50, y);
    y += 20;
    y = drawRow(doc, 'Batch code', receipt.batch_code, y);
    y = drawRow(doc, 'Waste type', receipt.waste_type, y);
    y = drawRow(doc, 'Collection point', receipt.collection_point, y);
    y = drawRow(doc, 'Division', receipt.division, y);
    y = drawRow(doc, 'Final weight', `${Number(receipt.final_kg).toFixed(1)} kg`, y);
    y = drawRow(doc, 'Amount paid', formatUGX(receipt.final_amount), y);

    y += 10;
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#111827').text('Payment', 50, y);
    y += 20;
    y = drawRow(doc, 'Method', receipt.payment_method, y);
    y = drawRow(doc, 'Reference', receipt.payment_reference, y);
    y = drawRow(doc, 'Pickup date', formatDate(receipt.pickup_date), y);

    doc
      .moveTo(50, y + 12)
      .lineTo(545, y + 12)
      .strokeColor('#E5E7EB')
      .lineWidth(1)
      .stroke();

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#9CA3AF')
      .text(
        'This receipt confirms a completed waste purchase on the WasteLink platform. For support, contact your city admin.',
        50,
        y + 28,
        { width: 495, align: 'center' }
      );

    doc.end();
  });
