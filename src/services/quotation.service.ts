import { QuotationStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { calculateTotals, type QuoteItemInput } from '../utils/quotation';

type QuotationPayload = {
  quotationNumber?: string;
  status?: QuotationStatus;
  date: string;
  vessel: string;
  templateId?: string;
  poNumber?: string;
  attend?: string;
  project?: string;
  referenceNumber?: string;
  currency?: string;
  terms?: string;
  notes?: string;
  client: {
    id?: string;
    name: string;
    company: string;
    address: string;
    phone: string;
    email: string;
    gstNumber?: string;
    contactPerson?: string;
    notes?: string;
  };
  items: QuoteItemInput[];
  packingCharges?: number;
  transportCharges?: number;
  discount?: number;
  taxPercent?: number;
  roundOff?: number;
};

type NormalizedQuotationItem = QuoteItemInput & {
  materialId?: string | null;
};

const normalizeItem = (item: QuoteItemInput): NormalizedQuotationItem => ({
  ...item,
  materialId: item.materialId?.trim() ? item.materialId.trim() : null,
});

const normalizePayload = (payload: QuotationPayload) => ({
  ...payload,
  client: {
    ...payload.client,
    id: payload.client.id?.trim() || undefined,
  },
  templateId: payload.templateId?.trim() || undefined,
  vessel: payload.vessel.trim(),
  items: payload.items.map(normalizeItem),
});

const nextQuotationNumber = async () => {
  const prefix = `QT${new Date().getFullYear().toString().slice(-2)}`;
  const count = await prisma.quotation.count({
    where: { quotationNumber: { startsWith: prefix } },
  });
  const serial = String(count + 1).padStart(3, '0');
  return `${prefix}-${serial}`;
};

const ensureClient = async (payload: QuotationPayload['client']) => {
  if (payload.id) {
    const existing = await prisma.client.findUnique({ where: { id: payload.id } });
    if (existing) return existing;
  }

  return prisma.client.create({
    data: {
      name: payload.name,
      company: payload.company,
      address: payload.address,
      phone: payload.phone,
      email: payload.email,
      gstNumber: payload.gstNumber,
      contactPerson: payload.contactPerson,
      notes: payload.notes,
    },
  });
};

const ensureVessel = async (vesselName: string) => {
  const normalizedName = vesselName.trim();
  if (!normalizedName) {
    throw new Error('vessel is required');
  }

  const existing = await prisma.vessel.findUnique({ where: { name: normalizedName } });
  if (existing) return existing;

  return prisma.vessel.create({ data: { name: normalizedName } });
};

export const createQuotation = async (payload: QuotationPayload) => {
  const normalizedPayload = normalizePayload(payload);
  const client = await ensureClient(normalizedPayload.client);
  const vessel = await ensureVessel(normalizedPayload.vessel);
  const totals = calculateTotals(normalizedPayload.items, normalizedPayload);
  const quotationNumber = payload.quotationNumber || (await nextQuotationNumber());

  return prisma.quotation.create({
    data: {
      quotationNumber,
      status: payload.status ?? QuotationStatus.DRAFT,
      date: new Date(payload.date),
      vesselId: vessel.id,
      templateId: normalizedPayload.templateId,
      poNumber: payload.poNumber,
      attend: payload.attend,
      project: payload.project,
      referenceNumber: quotationNumber,
      currency: payload.currency ?? 'INR',
      subtotal: totals.subtotal,
      packingCharges: totals.packingCharges,
      transportCharges: totals.transportCharges,
      discount: totals.discount,
      taxPercent: totals.taxPercent,
      taxAmount: totals.taxAmount,
      roundOff: totals.roundOff,
      grandTotal: totals.grandTotal,
      terms: payload.terms,
      notes: payload.notes,
      clientId: client.id,
      items: {
        create: totals.items.map((item) => ({
          serialNo: item.serialNo,
          materialId: item.materialId?.trim() ? item.materialId.trim() : undefined,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          amount: item.amount,
        })),
      },
    },
    include: {
      client: true,
      items: true,
    },
  });
};

export const updateQuotation = async (id: string, payload: QuotationPayload) => {
  const normalizedPayload = normalizePayload(payload);
  const client = await ensureClient(normalizedPayload.client);
  const vessel = await ensureVessel(normalizedPayload.vessel);
  const totals = calculateTotals(normalizedPayload.items, normalizedPayload);

  return prisma.$transaction(async (tx) => {
    await tx.quotationItem.deleteMany({ where: { quotationId: id } });

    return tx.quotation.update({
      where: { id },
      data: {
        status: payload.status ?? QuotationStatus.DRAFT,
        date: new Date(payload.date),
        vesselId: vessel.id,
        templateId: normalizedPayload.templateId,
        poNumber: payload.poNumber,
        attend: payload.attend,
        project: payload.project,
        referenceNumber: payload.referenceNumber?.trim() || undefined,
        currency: payload.currency ?? 'INR',
        subtotal: totals.subtotal,
        packingCharges: totals.packingCharges,
        transportCharges: totals.transportCharges,
        discount: totals.discount,
        taxPercent: totals.taxPercent,
        taxAmount: totals.taxAmount,
        roundOff: totals.roundOff,
        grandTotal: totals.grandTotal,
        terms: payload.terms,
        notes: payload.notes,
        clientId: client.id,
        items: {
          create: totals.items.map((item) => ({
            serialNo: item.serialNo,
            materialId: item.materialId?.trim() ? item.materialId.trim() : undefined,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            amount: item.amount,
          })),
        },
      },
      include: {
        client: true,
        items: true,
      },
    });
  });
};

export const getQuotationById = async (id: string) => {
  return prisma.quotation.findUnique({
    where: { id },
    include: {
      client: true,
      vesselRecord: true,
      template: true,
      items: {
        include: {
          material: true,
        },
        orderBy: { serialNo: 'asc' },
      },
    },
  });
};

export const deleteQuotation = async (id: string) => {
  await prisma.quotation.delete({ where: { id } });
};

export const listQuotations = async (query: {
  page?: number;
  limit?: number;
  search?: string;
}) => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;
  const search = query.search?.trim();

  const where = search
    ? {
        OR: [
          { quotationNumber: { contains: search, mode: 'insensitive' as const } },
          { vessel: { contains: search, mode: 'insensitive' as const } },
          { vesselRecord: { name: { contains: search, mode: 'insensitive' as const } } },
          { project: { contains: search, mode: 'insensitive' as const } },
          { referenceNumber: { contains: search, mode: 'insensitive' as const } },
          { client: { company: { contains: search, mode: 'insensitive' as const } } },
          { client: { name: { contains: search, mode: 'insensitive' as const } } },
        ],
      }
    : {};

  const [rows, total] = await Promise.all([
    prisma.quotation.findMany({
      where,
      include: { client: true, vesselRecord: true, template: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.quotation.count({ where }),
  ]);

  return {
    rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const listQuotationMeta = async () => {
  try {
    const templates = await prisma.quotationTemplate.findMany({
      orderBy: [{ isDefault: 'desc' }, { templateName: 'asc' }],
    });

    const vesselRows = await prisma.quotation.findMany({
      distinct: ['vesselId'],
      select: {
        vesselRecord: {
          select: { name: true },
        },
        vessel: true,
      },
      orderBy: { vesselId: 'asc' },
    });

    return {
      templates,
      vessels: vesselRows
        .map((row) => row.vesselRecord?.name?.trim() || row.vessel?.trim())
        .filter((vessel): vessel is string => Boolean(vessel)),
    };
  } catch (error) {
    console.warn('Unable to load quotation metadata', error);
    return {
      templates: [],
      vessels: [],
    };
  }
};
