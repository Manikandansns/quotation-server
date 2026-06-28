import { prisma } from '../lib/prisma';

export const listTemplates = async (query: Record<string, string | undefined>) => {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 10);
  const search = query.search?.trim();

  const where = search
    ? {
        OR: [
          { templateCode: { contains: search, mode: 'insensitive' as const } },
          { templateName: { contains: search, mode: 'insensitive' as const } },
          { companyName: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const [rows, total] = await Promise.all([
    prisma.quotationTemplate.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { templateName: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.quotationTemplate.count({ where }),
  ]);

  return {
    rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const getTemplate = async (id: string) => {
  return prisma.quotationTemplate.findUnique({ where: { id } });
};

const clearDefaultTemplate = async (exceptId?: string) => {
  await prisma.quotationTemplate.updateMany({
    where: exceptId ? { id: { not: exceptId } } : {},
    data: { isDefault: false },
  });
};

export const createTemplate = async (body: any) => {
  if (!body.templateCode || !body.templateName || !body.companyName) {
    throw new Error('templateCode, templateName and companyName are required');
  }

  if (body.isDefault) {
    await clearDefaultTemplate();
  }

  return prisma.quotationTemplate.create({
    data: {
      templateCode: body.templateCode,
      templateName: body.templateName,
      companyName: body.companyName,
      companyRegistration: body.companyRegistration,
      gstNumber: body.gstNumber,
      email: body.email,
      phone: body.phone,
      address: body.address,
      senderName: body.senderName,
      quotationHeading: body.quotationHeading || 'MATERIALS & CONSUMABLES SUPPLY',
      logoPath: body.logoPath,
      signaturePath: body.signaturePath,
      isDefault: Boolean(body.isDefault),
    },
  });
};

export const updateTemplate = async (id: string, body: any) => {
  if (body.isDefault) {
    await clearDefaultTemplate(id);
  }

  return prisma.quotationTemplate.update({
    where: { id },
    data: {
      templateCode: body.templateCode,
      templateName: body.templateName,
      companyName: body.companyName,
      companyRegistration: body.companyRegistration,
      gstNumber: body.gstNumber,
      email: body.email,
      phone: body.phone,
      address: body.address,
      senderName: body.senderName,
      quotationHeading: body.quotationHeading || 'MATERIALS & CONSUMABLES SUPPLY',
      logoPath: body.logoPath,
      signaturePath: body.signaturePath,
      isDefault: Boolean(body.isDefault),
    },
  });
};

export const deleteTemplate = async (id: string) => {
  await prisma.quotationTemplate.delete({ where: { id } });
};
