import { prisma } from '../lib/prisma';

export const listClients = async (query: Record<string, string | undefined>) => {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 10);
  const search = query.search?.trim();

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { company: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { phone: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const [rows, total] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.client.count({ where }),
  ]);

  return {
    rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const createClient = async (body: any) => {
  if (!body.name || !body.company || !body.phone || !body.email || !body.address) {
    throw new Error('name, company, address, phone and email are required');
  }

  return prisma.client.create({
    data: {
      name: body.name,
      company: body.company,
      address: body.address,
      phone: body.phone,
      email: body.email,
      gstNumber: body.gstNumber,
      contactPerson: body.contactPerson,
      notes: body.notes,
    },
  });
};

export const updateClient = async (id: string, body: any) => {
  return prisma.client.update({
    where: { id },
    data: {
      name: body.name,
      company: body.company,
      address: body.address,
      phone: body.phone,
      email: body.email,
      gstNumber: body.gstNumber,
      contactPerson: body.contactPerson,
      notes: body.notes,
    },
  });
};

export const deleteClient = async (id: string) => {
  await prisma.client.delete({ where: { id } });
};
