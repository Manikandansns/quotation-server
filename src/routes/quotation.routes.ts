import fs from 'node:fs';
import { Hono } from 'hono';
import {
  createQuotationController,
  deleteQuotationController,
  emailQuotationController,
  generateDocxController,
  generatePdfController,
  getQuotationController,
  listQuotationMetaController,
  listQuotationController,
  updateQuotationController,
} from '../controllers/quotation.controller';

export const quotationRoutes = new Hono();

quotationRoutes.get('/', async (c) => {
  const result = await listQuotationController(c.req.query());
  return c.json(result);
});

quotationRoutes.get('/meta/options', async (c) => {
  const result = await listQuotationMetaController();
  return c.json(result);
});

quotationRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const result = await createQuotationController(body);
  return c.json(result, 201);
});

quotationRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const result = await getQuotationController(id);
  if (!result) {
    return c.json({ message: 'Quotation not found' }, 404);
  }
  return c.json(result);
});

quotationRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const result = await updateQuotationController(id, body);
  return c.json(result);
});

quotationRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await deleteQuotationController(id);
  return c.json({ message: 'Quotation deleted' });
});

quotationRoutes.get('/:id/pdf', async (c) => {
  const id = c.req.param('id');
  const { outputPath, fileName } = await generatePdfController(id);
  const file = await fs.promises.readFile(outputPath);

  c.header('Content-Type', 'application/pdf');
  c.header('Content-Disposition', `attachment; filename="${fileName}"`);
  return c.body(file);
});

quotationRoutes.get('/:id/docx', async (c) => {
  const id = c.req.param('id');
  const { outputPath, fileName } = await generateDocxController(id);
  const file = await fs.promises.readFile(outputPath);

  c.header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  );
  c.header('Content-Disposition', `attachment; filename="${fileName}"`);
  return c.body(file);
});

quotationRoutes.post('/:id/email', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const result = await emailQuotationController(id, body);
  return c.json({ message: 'Quotation emailed', ...result });
});
