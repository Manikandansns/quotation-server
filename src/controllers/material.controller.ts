import { prisma } from '../lib/prisma';

export const listMaterials = async (query: Record<string, string | undefined>) => {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 10);
  const search = query.search?.trim();

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { materialCode: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const [rows, total] = await Promise.all([
    prisma.material.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.material.count({ where }),
  ]);

  return {
    rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const createMaterial = async (body: any) => {
  if (!body.name || !body.materialCode || !body.unit) {
    throw new Error('name, materialCode and unit are required');
  }

  return prisma.material.create({
    data: {
      name: body.name,
      materialCode: body.materialCode,
      unit: body.unit,
      defaultUnitPrice: Number(body.defaultUnitPrice ?? 0),
      description: body.description,
      status: body.status ?? true,
      category: body.categoryId ? { connect: { id: body.categoryId } } : undefined,
    },
  });
};

export const getMaterialById = async (id: string) => {
  const material = await prisma.material.findUnique({ where: { id } });
  if (!material) {
    throw new Error('Material not found');
  }
  return material;
};

export const updateMaterial = async (id: string, body: any) => {
  return prisma.material.update({
    where: { id },
    data: {
      name: body.name,
      materialCode: body.materialCode,
      unit: body.unit,
      defaultUnitPrice: Number(body.defaultUnitPrice ?? 0),
      description: body.description,
      status: body.status ?? true,
      category: body.categoryId ? { connect: { id: body.categoryId } } : { disconnect: true },
    },
  });
};

export const importBomMaterials = async (body: any) => {
  const bomText = String(body.bomText ?? '').trim();
  if (!bomText) {
    throw new Error('bomText is required');
  }

  const parseCsvLine = (line: string) =>
    line.split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/).map((value) => value.trim().replace(/^\"|\"$/g, ''));

  const lines = bomText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    throw new Error('BOM CSV must have a header row and at least one data row');
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  const requiredHeaders = ['materialcode', 'name', 'unit'];
  const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));
  if (missingHeaders.length > 0) {
    throw new Error(`Missing BOM CSV headers: ${missingHeaders.join(', ')}`);
  }

  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = values[index] ?? '';
    });
    return record;
  });

  const upsertPromises = rows.map((row) => {
    const materialCode = row.materialcode?.trim();
    const name = row.name?.trim();
    const unit = row.unit?.trim();
    const description = row.description?.trim() || undefined;
    const defaultUnitPrice = Number(row.defaultunitprice ?? row.defaultUnitPrice ?? 0);
    const stockOnHand = Number(row.stockonhand ?? row.stockOnHand ?? 0);

    if (!materialCode || !name || !unit) {
      return Promise.resolve(null);
    }

    return prisma.material.upsert({
      where: { materialCode },
      update: {
        name,
        unit,
        defaultUnitPrice,
        description,
        stockOnHand,
      },
      create: {
        materialCode,
        name,
        unit,
        defaultUnitPrice,
        description,
        status: true,
        stockOnHand,
      },
    });
  });

  const results = await Promise.all(upsertPromises);
  return {
    imported: results.filter(Boolean).length,
    total: rows.length,
  };
};

export const deleteMaterial = async (id: string) => {
  await prisma.material.delete({ where: { id } });
};
