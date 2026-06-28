import fs from 'node:fs';
import path from 'node:path';
import {
  Document,
  Paragraph,
  Packer,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  TextRun,
  ImageRun,
} from 'docx';
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

const cell = (text: string, bold = false, align: 'left' | 'center' | 'right' = 'left') =>
  new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold, size: 20 })],
        alignment: align === 'right' ? AlignmentType.RIGHT : align === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT,
      }),
    ],
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
  });

const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const getFallbackAssetPath = (fileName: string) =>
  path.resolve(process.cwd(), '..', 'client', 'src', 'assets', fileName);

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

const createImageRun = (filePath: string, width: number, height: number) => {
  const extension = path.extname(filePath).toLowerCase();
  if (!['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'].includes(extension)) {
    return null;
  }

  try {
    return new ImageRun({
      data: fs.readFileSync(filePath),
      transformation: { width, height },
    } as any);
  } catch {
    return null;
  }
};

export const generateQuotationDocx = async (quotation: QuotationWithRelations) => {
  const outputDir = path.resolve(process.cwd(), '..', 'generated-docx');
  ensureDir(outputDir);

  const template = quotation.template ?? (await prisma.quotationTemplate.findFirst({ where: { isDefault: true } }));
  const companyName = template?.companyName || 'GSUN Marine Engineering';
  const companyRegistration = template?.companyRegistration || '';
  const companyAddress = template?.address || 'No address configured';
  const companyPhone = template?.phone || '-';
  const companyEmail = template?.email || '-';
  const companyGst = template?.gstNumber || '-';
  const senderName = template?.senderName || '';
  const quotationHeading = template?.quotationHeading || 'MATERIALS & CONSUMABLES SUPPLY';

  const logoPath = resolveAssetPath('Artboard 2.svg', template?.logoPath);
  const signaturePath = resolveAssetPath('signature.jpeg', template?.signaturePath);

  const logoImage = createImageRun(logoPath, 140, 44);
  const signatureImage = createImageRun(signaturePath, 140, 56);

  const fileName = `${quotation.quotationNumber}.docx`;
  const outputPath = path.join(outputDir, fileName);

  const itemRows = quotation.items.map((item) =>
    new TableRow({
      children: [
        cell(String(item.serialNo)),
        cell(item.description),
        cell(Number(item.quantity).toFixed(2), false, AlignmentType.RIGHT),
        cell(item.unit, false, AlignmentType.CENTER),
        cell(Number(item.unitPrice).toFixed(2), false, AlignmentType.RIGHT),
        cell(Number(item.amount).toFixed(2), false, AlignmentType.RIGHT),
      ],
    }),
  );

  const headerParagraphs = [] as any[];
  if (logoImage) {
    headerParagraphs.push(
      new Paragraph({
        children: [logoImage],
        alignment: AlignmentType.CENTER,
      }),
    );
  }

  const doc = new Document({
    sections: [
      {
        children: [
          ...headerParagraphs,
          new Paragraph({
            text: companyName,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          ...(companyRegistration ? [new Paragraph({ text: companyRegistration, alignment: AlignmentType.CENTER })] : []),
          new Paragraph({ text: companyAddress, alignment: AlignmentType.CENTER }),
          new Paragraph({ text: `Contact: ${companyPhone}   Email: ${companyEmail}`, alignment: AlignmentType.CENTER }),
          new Paragraph({ text: `GST: ${companyGst}`, alignment: AlignmentType.CENTER }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: quotationHeading, heading: HeadingLevel.HEADING_2, alignment: AlignmentType.CENTER }),
          ...(senderName ? [new Paragraph({ text: `From: ${senderName}`, alignment: AlignmentType.CENTER })] : []),
          new Paragraph({ text: '' }),
          new Paragraph({ text: `Quotation Number: ${quotation.quotationNumber}` }),
          new Paragraph({ text: `Date: ${quotation.date.toISOString().slice(0, 10)}` }),
          new Paragraph({ text: `Client: ${quotation.client.company}` }),
          new Paragraph({ text: `Client Contact: ${quotation.client.name}` }),
          new Paragraph({ text: `Address: ${quotation.client.address}` }),
          new Paragraph({ text: `Vessel: ${quotation.vesselRecord?.name ?? quotation.vessel ?? '-'}` }),
          new Paragraph({ text: `PO Number: ${quotation.poNumber ?? '-'}` }),
          new Paragraph({ text: `Reference: ${quotation.referenceNumber ?? '-'}` }),
          new Paragraph({ text: `Project: ${quotation.project ?? '-'}` }),
          new Paragraph({ text: `Attend: ${quotation.attend ?? '-'}` }),
          new Paragraph({ text: '' }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                tableHeader: true,
                children: [
                  cell('S/N', true),
                  cell('Description', true),
                  cell('Qty', true, AlignmentType.RIGHT),
                  cell('Unit', true, AlignmentType.CENTER),
                  cell('Unit Price', true, AlignmentType.RIGHT),
                  cell('Amount', true, AlignmentType.RIGHT),
                ],
              }),
              ...itemRows,
            ],
            borders: {
              top: { style: BorderStyle.SINGLE, size: 2, color: '222222' },
              bottom: { style: BorderStyle.SINGLE, size: 2, color: '222222' },
              left: { style: BorderStyle.SINGLE, size: 2, color: '222222' },
              right: { style: BorderStyle.SINGLE, size: 2, color: '222222' },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
              insideVertical: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
            },
          }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: `Subtotal: ${Number(quotation.subtotal).toFixed(2)}`, alignment: AlignmentType.RIGHT }),
          new Paragraph({ text: `Packing Charges: ${Number(quotation.packingCharges).toFixed(2)}`, alignment: AlignmentType.RIGHT }),
          new Paragraph({ text: `Transport Charges: ${Number(quotation.transportCharges).toFixed(2)}`, alignment: AlignmentType.RIGHT }),
          new Paragraph({ text: `Discount: ${Number(quotation.discount).toFixed(2)}`, alignment: AlignmentType.RIGHT }),
          new Paragraph({ text: `Tax (${Number(quotation.taxPercent)}%): ${Number(quotation.taxAmount).toFixed(2)}`, alignment: AlignmentType.RIGHT }),
          new Paragraph({ text: `Round Off: ${Number(quotation.roundOff).toFixed(2)}`, alignment: AlignmentType.RIGHT }),
          new Paragraph({
            children: [new TextRun({ text: `Grand Total: ${Number(quotation.grandTotal).toFixed(2)}`, bold: true })],
            alignment: AlignmentType.RIGHT,
          }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: `Terms: ${quotation.terms ?? 'Payment within 15 days.'}` }),
          ...(signatureImage
            ? [
                new Paragraph({ text: '' }),
                new Paragraph({ children: [signatureImage], alignment: AlignmentType.RIGHT }),
                new Paragraph({ text: 'Authorized Signature', alignment: AlignmentType.RIGHT }),
              ]
            : []),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);

  return { outputPath, fileName };
};
