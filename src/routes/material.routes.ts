import { Hono } from 'hono';
import {
  createMaterial,
  deleteMaterial,
  getMaterialById,
  importBomMaterials,
  listMaterials,
  updateMaterial,
} from '../controllers/material.controller';

export const materialRoutes = new Hono();

materialRoutes.get('/', async (c) => {
  const result = await listMaterials(c.req.query());
  return c.json(result);
});

materialRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const result = await getMaterialById(id);
  return c.json(result);
});

materialRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const result = await createMaterial(body);
  return c.json(result, 201);
});

materialRoutes.post('/upload', async (c) => {
  const body = await c.req.json();
  const result = await importBomMaterials(body);
  return c.json(result, 201);
});

materialRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const result = await updateMaterial(id, body);
  return c.json(result);
});

materialRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await deleteMaterial(id);
  return c.json({ message: 'Material deleted' });
});
