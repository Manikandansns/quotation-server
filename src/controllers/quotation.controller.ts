import path from 'node:path';
import { prisma } from '../lib/prisma';
import {
  createQuotation,
  deleteQuotation,
  getQuotationById,
  listQuotationMeta,
  listQuotations,
  updateQuotation,
} from '../services/quotation.service';
import { generateQuotationPdf } from '../services/pdf.service';
import { generateQuotationDocx } from '../services/docx.service';
import { sendQuotationEmail } from '../services/mail.service';

export const listQuotationController = (query: Record<string, string | undefined>) => {
  return listQuotations({
    page: Number(query.page ?? 1),
    limit: Number(query.limit ?? 10),
    search: query.search,
  });
};

export const listQuotationMetaController = () => {
  return listQuotationMeta();
};

export const createQuotationController = (body: any) => {
  return createQuotation(body);
};

export const updateQuotationController = (id: string, body: any) => {
  return updateQuotation(id, body);
};

export const getQuotationController = (id: string) => {
  return getQuotationById(id);
};

export const deleteQuotationController = (id: string) => {
  return deleteQuotation(id);
};

export const generatePdfController = async (id: string) => {
  const quotation = await getQuotationById(id);
  if (!quotation) {
    throw new Error('Quotation not found');
  }

  return generateQuotationPdf(quotation as any);
};

export const generateDocxController = async (id: string) => {
  const quotation = await getQuotationById(id);
  if (!quotation) {
    throw new Error('Quotation not found');
  }

  return generateQuotationDocx(quotation as any);
};

export const emailQuotationController = async (id: string, body: any) => {
  const quotation = await getQuotationById(id);
  if (!quotation) {
    throw new Error('Quotation not found');
  }

  const pdf = await generateQuotationPdf(quotation as any);
  const docx = await generateQuotationDocx(quotation as any);

  const to = body.to || quotation.client.email;
  const subject = body.subject || `Quotation ${quotation.quotationNumber}`;
  const text = body.message || `Please find attached quotation ${quotation.quotationNumber}.`;

  try {
    await sendQuotationEmail({
      to,
      subject,
      text,
      attachments: [
        { filename: pdf.fileName, path: pdf.outputPath },
        { filename: docx.fileName, path: docx.outputPath },
      ],
    });

    await prisma.emailLog.create({
      data: {
        quotationId: id,
        toEmail: to,
        subject,
        body: text,
        status: 'SENT',
        sentAt: new Date(),
      },
    });
  } catch (error) {
    await prisma.emailLog.create({
      data: {
        quotationId: id,
        toEmail: to,
        subject,
        body: text,
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
    throw error;
  }

  return {
    to,
    subject,
    files: [path.basename(pdf.outputPath), path.basename(docx.outputPath)],
  };
};
