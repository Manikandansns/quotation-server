import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import SVGtoPDF from 'svg-to-pdfkit';
import type { Quotation, QuotationItem, Client } from '@prisma/client';
import { prisma } from '../lib/prisma';

type QuotationWithRelations = Quotation & {
  client: Client;
  items: QuotationItem[];
  vessel?: string | null;
  vesselRecord?: { name: string } | null;
  template?: {
    companyName: string;
    companyRegistration?: string | null;
    gstNumber?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    senderName?: string | null;
    quotationHeading?: string | null;
    logoPath?: string | null;
    signaturePath?: string | null;
  } | null;
};

const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const getFallbackAssetPath = (fileName: string) => path.resolve(process.cwd(), '..', 'client', 'src', 'assets', fileName);

const resolveAssetPath = (fallbackFileName: string, inputPath?: string | null) => {
  if (!inputPath) {
    return getFallbackAssetPath(fallbackFileName);
  }

  const candidates = [
    inputPath,
    path.resolve(process.cwd(), inputPath),
    path.resolve(process.cwd(), '..', inputPath),
    path.resolve(process.cwd(), '..', '..', inputPath),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return getFallbackAssetPath(fallbackFileName);
};

const drawLine = (doc: PDFKit.PDFDocument, x1: number, y1: number, x2: number, y2: number, width = 0.7) => {
  doc.lineWidth(width).moveTo(x1, y1).lineTo(x2, y2).stroke('#333333');
};

const drawTableHeader = (doc: PDFKit.PDFDocument, y: number, xStart: number, widths: number[]) => {
  const headers = ['#', 'Materials', 'Qty', 'Unit', 'Unit/Price', 'Amount(USD)'];
  const rowHeight = 20;

  doc.rect(xStart, y, widths.reduce((sum, value) => sum + value, 0), rowHeight).fillAndStroke('#f0f0f0', '#333333');

  let x = xStart;
  headers.forEach((header, index) => {
    if (index > 0) {
      drawLine(doc, x, y, x, y + rowHeight, 0.5);
    }
    const align = index >= 2 ? 'center' : 'left';
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor('#000000')
      .text(header, x + 6, y + 5, { width: widths[index] - 12, align: align as 'left' | 'center' | 'right' });
    x += widths[index];
  });

  return y + rowHeight;
};

const drawHeader = (
  doc: PDFKit.PDFDocument,
  opts: {
    pageWidth: number;
    margin: number;
    companyName: string;
    companyAddress: string;
    companyPhone: string;
    companyEmail: string;
    companyRegistration: string;
    companyGst: string;
    logoPath: string;
  },
) => {
  const {
    pageWidth,
    margin,
    companyName,
    companyAddress,
    companyPhone,
    companyEmail,
    companyRegistration,
    companyGst,
    logoPath,
  } = opts;
  const contentWidth = pageWidth - margin * 2;
  const top = 30;
  const logoBoxW = 60;
  const logoBoxH = 60;

  // Logo on left
  const logoX = margin;
  const logoY = top;
  
  if (fs.existsSync(logoPath)) {
    if (logoPath.toLowerCase().endsWith('.svg')) {
      const svgText = fs.readFileSync(logoPath, 'utf8');
      SVGtoPDF(doc, svgText, logoX, logoY, {
        width: logoBoxW,
        height: logoBoxH,
        preserveAspectRatio: 'xMidYMid slice',
      });
    } else {
      doc.image(logoPath, logoX, logoY, { fit: [logoBoxW, logoBoxH], align: 'center', valign: 'center' });
    }
  }

  // Company info in center and right
  const textX = margin + logoBoxW + 16;
  const textW = contentWidth - logoBoxW - 16;

  doc.font('Helvetica-Bold').fontSize(16).fillColor('#000000').text(companyName, textX, top + 6, {
    width: textW,
    align: 'center',
  });
  doc.font('Helvetica').fontSize(10).fillColor('#000000').text(companyAddress || '-', textX, top + 26, {
    width: textW,
    align: 'center',
  });
  doc.fontSize(9).text(`CONTACT: ${companyPhone || '-'} EMAIL: ${companyEmail || '-'}`, textX, top + 40, {
    width: textW,
    align: 'center',
  });
  doc.fontSize(9).text(`GST NUMBER: ${companyGst || '-'}`, textX, top + 50, {
    width: textW,
    align: 'center',
  });

  drawLine(doc, margin, top + 66, pageWidth - margin, top + 66, 1.5);

  return top + 76;
};

const drawQuotationMetadata = (
  doc: PDFKit.PDFDocument,
  opts: {
    margin: number;
    attend?: string | null;
    poNumber?: string | null;
    client: string;
    date: string;
    from?: string;
    vessel: string;
    referenceNumber?: string | null;
    project?: string | null;
    pageWidth: number;
  },
  startY: number,
) => {
  const { margin, attend, poNumber, client, date, from, vessel, referenceNumber, project, pageWidth } = opts;
  const contentWidth = pageWidth - margin * 2;
  const colWidth = contentWidth / 2;
  let y = startY;

  // Row 1: Attend | PO No
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#000000');
  doc.text('Attend', margin, y, { width: 60 });
  doc.font('Helvetica').fontSize(9).fillColor('#000000');
  doc.text(attend || '-', margin + 65, y, { width: colWidth - 70 });

  doc.font('Helvetica-Bold').fontSize(9).fillColor('#000000');
  doc.text('PO No', margin + colWidth, y, { width: 60 });
  doc.font('Helvetica').fontSize(9).fillColor('#000000');
  doc.text(poNumber || '-', margin + colWidth + 65, y, { width: colWidth - 70 });

  // Row 2: Client | Date
  y += 12;
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#000000');
  doc.text('Client', margin, y, { width: 60 });
  doc.font('Helvetica').fontSize(9).fillColor('#000000');
  doc.text(client || '-', margin + 65, y, { width: colWidth - 70 });

  doc.font('Helvetica-Bold').fontSize(9).fillColor('#000000');
  doc.text('Date', margin + colWidth, y, { width: 60 });
  doc.font('Helvetica').fontSize(9).fillColor('#000000');
  doc.text(date, margin + colWidth + 65, y, { width: colWidth - 70 });

  // Row 3: Vessel | From
  y += 12;
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#000000');
  doc.text('Vessel', margin, y, { width: 60 });
  doc.font('Helvetica').fontSize(9).fillColor('#000000');
  doc.text(vessel || '-', margin + 65, y, { width: colWidth - 70 });

  doc.font('Helvetica-Bold').fontSize(9).fillColor('#000000');
  doc.text('From', margin + colWidth, y, { width: 60 });
  doc.font('Helvetica').fontSize(9).fillColor('#000000');
  doc.text(from || '-', margin + colWidth + 65, y, { width: colWidth - 70 });

  // Row 4: Our Ref | Project
  y += 12;
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#000000');
  doc.text('Our Ref', margin, y, { width: 60 });
  doc.font('Helvetica').fontSize(9).fillColor('#000000');
  doc.text(referenceNumber || '-', margin + 65, y, { width: colWidth - 70 });

  doc.font('Helvetica-Bold').fontSize(9).fillColor('#000000');
  doc.text('Project', margin + colWidth, y, { width: 60 });
  doc.font('Helvetica').fontSize(9).fillColor('#000000');
  doc.text(project || '-', margin + colWidth + 65, y, { width: colWidth - 70 });

  return y + 16;
};


export const generateQuotationPdf = async (quotation: QuotationWithRelations) => {
  const outputDir = path.resolve(process.cwd(), '..', 'generated-pdf');
  ensureDir(outputDir);

  const template = quotation.template ?? (await prisma.quotationTemplate.findFirst({ where: { isDefault: true } }));
  const companyName = template?.companyName || 'GSUN Marine Engineering';
  const companyAddress = template?.address || 'No address configured';
  const companyPhone = template?.phone || '-';
  const companyEmail = template?.email || '-';
  const companyRegistration = template?.companyRegistration || '-';
  const companyGst = template?.gstNumber || '-';

  const logoPath = resolveAssetPath('Artboard 2.svg', template?.logoPath);
  const signaturePath = resolveAssetPath('signature.jpeg', template?.signaturePath);

  const fileName = `${quotation.quotationNumber}.pdf`;
  const outputPath = path.join(outputDir, fileName);

  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 36 });
    const stream = fs.createWriteStream(outputPath);
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 36;
    const contentWidth = pageWidth - margin * 2;
    const tableX = margin;
    const tableWidths = [30, 240, 50, 48, 70, 82];

    doc.pipe(stream);

    let y = drawHeader(doc, {
      pageWidth,
      margin,
      companyName,
      companyAddress,
      companyPhone,
      companyEmail,
      companyRegistration,
      companyGst,
      logoPath,
    });

    y += 8;
    
    y = drawQuotationMetadata(
      doc,
      {
        margin,
        attend: quotation.attend,
        poNumber: quotation.poNumber,
        client: quotation.client.company,
        date: quotation.date.toISOString().slice(0, 10),
        from: template?.senderName || quotation.attend || '-',
        vessel: quotation.vesselRecord?.name ?? quotation.vessel ?? '-',
        referenceNumber: quotation.referenceNumber,
        project: quotation.project,
        pageWidth,
      },
      y,
    );

    // Section Title
    const quotationHeading = template?.quotationHeading || 'MATERIALS & CONSUMABLES SUPPLY';
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#000000').text(quotationHeading, margin, y);
    y += 16;

    y = drawTableHeader(doc, y, tableX, tableWidths);

    doc.font('Helvetica').fontSize(9).fillColor('#000000');
    for (const item of quotation.items) {
      const description = item.description || '-';
      const descHeight = Math.max(16, doc.heightOfString(description, { width: tableWidths[1] - 10 }));
      const rowHeight = Math.max(20, descHeight + 6);

      if (y + rowHeight > pageHeight - 200) {
        doc.addPage();
        y = 50;
        y = drawTableHeader(doc, y, tableX, tableWidths);
      }

      doc.rect(tableX, y, tableWidths.reduce((sum, value) => sum + value, 0), rowHeight).lineWidth(0.5).stroke('#333333');

      let x = tableX;
      for (let i = 1; i < tableWidths.length; i += 1) {
        x += tableWidths[i - 1];
        drawLine(doc, x, y, x, y + rowHeight, 0.4);
      }

      doc.text(String(item.serialNo), tableX + 5, y + 5, { width: tableWidths[0] - 10, align: 'center' });
      doc.text(description, tableX + tableWidths[0] + 5, y + 5, { width: tableWidths[1] - 10 });
      doc.text(Number(item.quantity).toFixed(2), tableX + tableWidths[0] + tableWidths[1] + 2, y + 5, {
        width: tableWidths[2] - 6,
        align: 'right',
      });
      doc.text(item.unit, tableX + tableWidths[0] + tableWidths[1] + tableWidths[2] + 2, y + 5, {
        width: tableWidths[3] - 6,
        align: 'center',
      });
      doc.text(Number(item.unitPrice).toFixed(2), tableX + tableWidths[0] + tableWidths[1] + tableWidths[2] + tableWidths[3] + 2, y + 5, {
        width: tableWidths[4] - 6,
        align: 'right',
      });
      doc.text(Number(item.amount).toFixed(2), tableX + tableWidths[0] + tableWidths[1] + tableWidths[2] + tableWidths[3] + tableWidths[4] + 2, y + 5, {
        width: tableWidths[5] - 6,
        align: 'right',
      });

      y += rowHeight;
    }

    y += 12;
    if (y > pageHeight - 210) {
      doc.addPage();
      y = 60;
    }

    const summaryX = 320;
    const summaryWidth = 240;
    const summaryRowHeight = 18;

    const totals = [
      ['Subtotal', Number(quotation.subtotal)],
      ['Packing Charges', Number(quotation.packingCharges)],
      ['Transport Charges', Number(quotation.transportCharges)],
      ['Discount', -Number(quotation.discount)],
      [`Tax (${Number(quotation.taxPercent)}%)`, Number(quotation.taxAmount)],
      ['Round Off', Number(quotation.roundOff)],
      ['Grand Total', Number(quotation.grandTotal)],
    ] as const;

    const summaryBlockHeight = totals.length * summaryRowHeight + 6 + 80;

    if (y + summaryBlockHeight > pageHeight - 72) {
      doc.addPage();
      y = 60;
    }

    const summaryTop = y;

    doc.rect(summaryX, summaryTop, summaryWidth, totals.length * summaryRowHeight + 6).lineWidth(0.8).stroke('#333333');
    doc.font('Helvetica').fontSize(9).fillColor('#000000');
    totals.forEach(([label, value], index) => {
      const rowY = summaryTop + 4 + index * summaryRowHeight;
      if (index === totals.length - 1) {
        doc.rect(summaryX, rowY - 2, summaryWidth, summaryRowHeight).fillAndStroke('#f0f0f0', '#333333');
      }
      doc.font(index === totals.length - 1 ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor('#000000');
      doc.text(label, summaryX + 8, rowY + 2, { width: 150 });
      doc.text(value.toFixed(2), summaryX + 160, rowY + 2, { width: 72, align: 'right' });
      if (index < totals.length - 1) {
        drawLine(doc, summaryX, rowY + summaryRowHeight, summaryX + summaryWidth, rowY + summaryRowHeight, 0.3);
      }
    });

    const termsTop = summaryTop;
    const termsWidth = 282;
    doc.rect(margin, termsTop, termsWidth, totals.length * summaryRowHeight + 6).lineWidth(0.8).stroke('#333333');
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#000000').text('Payment Terms', margin + 8, termsTop + 6);
    doc.font('Helvetica').fontSize(9).fillColor('#000000').text(quotation.terms ?? 'Payment within 15 days.', margin + 8, termsTop + 22, {
      width: termsWidth - 16,
      height: totals.length * summaryRowHeight - 10,
      ellipsis: true,
    });

    const signatureBlockTop = summaryTop + totals.length * summaryRowHeight + 24;

    if (fs.existsSync(signaturePath)) {
      doc.image(signaturePath, margin, signatureBlockTop, { fit: [80, 40] });
      doc.font('Helvetica').fontSize(8).text('Prepared By: _______________', margin + 100, signatureBlockTop + 12, { width: 150 });
    } else {
      doc.font('Helvetica').fontSize(8).text('Prepared By: _______________', margin, signatureBlockTop, { width: 150 });
    }

    doc.font('Helvetica').fontSize(8).text('Approved By: _______________', summaryX + 80, signatureBlockTop, { width: 150 });

    doc.end();

    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });


  return { outputPath, fileName };
};
