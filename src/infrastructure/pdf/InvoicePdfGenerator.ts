import PDFDocument from 'pdfkit';
import { Invoice } from '../../domain/entities/Invoice.js';

export class InvoicePdfGenerator {
  public static async generateInvoicePdf(invoice: Invoice): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      // Header Banner
      doc.rect(40, 40, 515, 60).fill('#1e3a8a');
      doc.fillColor('#ffffff').fontSize(20).text('TAX INVOICE', 50, 50, { align: 'left' });
      doc.fontSize(10).text('ORIGINAL FOR RECIPIENT', 50, 75, { align: 'left' });
      doc.text(`Invoice No: ${invoice.invoiceNumber}`, 350, 52, { align: 'right' });
      doc.text(`Date: ${invoice.invoiceDate.toISOString().split('T')[0]}`, 350, 68, { align: 'right' });
      doc.text(`Financial Year: ${invoice.financialYear}`, 350, 84, { align: 'right' });

      // Company Details & Customer Details
      doc.moveDown(3);
      const topDetailsY = 115;

      // Supplier Details (Left)
      doc.fillColor('#1e3a8a').fontSize(11).text('SUPPLIER (BILL FROM):', 40, topDetailsY);
      doc.fillColor('#333333').fontSize(9)
        .text('Sri Krishna Foods Pvt Ltd', 40, topDetailsY + 16)
        .text('Plot 45, Food Park, Thuvakudi', 40, topDetailsY + 28)
        .text(`Tiruchirappalli, ${invoice.supplierStateName} - 620015`, 40, topDetailsY + 40)
        .text(`GSTIN: ${invoice.supplierGstin}`, 40, topDetailsY + 52)
        .text(`State Code: ${invoice.supplierStateCode} (${invoice.supplierStateName})`, 40, topDetailsY + 64);

      // Recipient Details (Right)
      doc.fillColor('#1e3a8a').fontSize(11).text('RECIPIENT (BILL TO):', 300, topDetailsY);
      doc.fillColor('#333333').fontSize(9)
        .text(invoice.customerName, 300, topDetailsY + 16)
        .text(invoice.customerAddress, 300, topDetailsY + 28, { width: 240 })
        .text(`GSTIN: ${invoice.customerGstin}`, 300, topDetailsY + 52)
        .text(`Place of Supply: ${invoice.customerStateName} (${invoice.customerStateCode})`, 300, topDetailsY + 64)
        .text(`Supply Type: ${invoice.isInterState ? 'INTER-STATE (IGST)' : 'INTRA-STATE (CGST + SGST)'}`, 300, topDetailsY + 76);

      // Table Header
      const tableTopY = 220;
      doc.rect(40, tableTopY, 515, 22).fill('#f1f5f9');
      doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold');
      doc.text('S.No', 45, tableTopY + 6);
      doc.text('Description of Goods', 80, tableTopY + 6);
      doc.text('HSN', 240, tableTopY + 6);
      doc.text('Qty', 290, tableTopY + 6, { width: 35, align: 'right' });
      doc.text('Rate (₹)', 335, tableTopY + 6, { width: 50, align: 'right' });
      doc.text('Taxable (₹)', 395, tableTopY + 6, { width: 55, align: 'right' });
      doc.text('GST %', 460, tableTopY + 6, { width: 30, align: 'right' });
      doc.text('Total (₹)', 500, tableTopY + 6, { width: 50, align: 'right' });

      // Table Body
      let itemY = tableTopY + 28;
      doc.font('Helvetica').fontSize(9).fillColor('#334155');

      invoice.items.forEach((item, index) => {
        doc.text((index + 1).toString(), 45, itemY);
        doc.text(item.itemName, 80, itemY);
        doc.text(item.hsnCode, 240, itemY);
        doc.text(item.quantity.toString(), 290, itemY, { width: 35, align: 'right' });
        doc.text(item.unitPrice.getRupees().toFixed(2), 335, itemY, { width: 50, align: 'right' });
        doc.text(item.taxableAmount.getRupees().toFixed(2), 395, itemY, { width: 55, align: 'right' });
        doc.text(`${item.taxRatePercent}%`, 460, itemY, { width: 30, align: 'right' });
        doc.text(item.totalAmount.getRupees().toFixed(2), 500, itemY, { width: 50, align: 'right' });

        doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(40, itemY + 16).lineTo(555, itemY + 16).stroke();
        itemY += 22;
      });

      // Tax Summary Box
      const taxBoxY = Math.max(itemY + 20, 360);
      doc.rect(320, taxBoxY, 235, 120).strokeColor('#cbd5e1').stroke();

      doc.fillColor('#334155').fontSize(9);
      doc.text('Total Taxable Value:', 330, taxBoxY + 10);
      doc.text(`₹ ${invoice.totalTaxable.getRupees().toFixed(2)}`, 450, taxBoxY + 10, { width: 95, align: 'right' });

      if (invoice.isInterState) {
        doc.text('Integrated GST (IGST 5%):', 330, taxBoxY + 28);
        doc.text(`₹ ${invoice.totalIgst.getRupees().toFixed(2)}`, 450, taxBoxY + 28, { width: 95, align: 'right' });
      } else {
        doc.text('Central GST (CGST 2.5%):', 330, taxBoxY + 28);
        doc.text(`₹ ${invoice.totalCgst.getRupees().toFixed(2)}`, 450, taxBoxY + 28, { width: 95, align: 'right' });

        doc.text('State GST (SGST 2.5%):', 330, taxBoxY + 46);
        doc.text(`₹ ${invoice.totalSgst.getRupees().toFixed(2)}`, 450, taxBoxY + 46, { width: 95, align: 'right' });
      }

      doc.strokeColor('#94a3b8').lineWidth(1).moveTo(330, taxBoxY + 68).lineTo(545, taxBoxY + 68).stroke();

      doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a');
      doc.text('Grand Total:', 330, taxBoxY + 80);
      doc.text(`₹ ${invoice.grandTotal.getRupees().toFixed(2)}`, 450, taxBoxY + 80, { width: 95, align: 'right' });

      // Bank Details & Signature
      const footerY = 560;
      doc.rect(40, footerY, 260, 80).strokeColor('#e2e8f0').stroke();
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e3a8a').text('Bank Account Details for Payment:', 50, footerY + 8);
      doc.font('Helvetica').fontSize(8).fillColor('#475569')
        .text('Bank: State Bank of India, Main Branch', 50, footerY + 22)
        .text('A/C Name: Sri Krishna Foods Pvt Ltd', 50, footerY + 34)
        .text('A/C No: 334455667788', 50, footerY + 46)
        .text('IFSC Code: SBIN0001234', 50, footerY + 58);

      doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a').text('For Sri Krishna Foods Pvt Ltd', 380, footerY + 10);
      doc.font('Helvetica').fontSize(8).fillColor('#64748b').text('Authorized Signatory', 410, footerY + 65);

      // Status watermark if cancelled
      if (invoice.status === 'CANCELLED') {
        doc.save();
        doc.rotate(-45, { origin: [300, 300] });
        doc.fontSize(60).fillColor('#ef4444', 0.25).text('CANCELLED (CN ISSUED)', 100, 260);
        doc.restore();
      }

      doc.end();
    });
  }
}
