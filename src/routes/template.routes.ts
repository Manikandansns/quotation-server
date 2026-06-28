import { Hono } from 'hono';
import {
  createTemplate,
  deleteTemplate,
  getTemplate,
  listTemplates,
  updateTemplate,
} from '../controllers/template.controller';

export const templateRoutes = new Hono();

templateRoutes.get('/', async (c) => {
  const result = await listTemplates(c.req.query());
  return c.json(result);
});

templateRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const result = await getTemplate(id);
  if (!result) {
    return c.json({ message: 'Template not found' }, 404);
  }
  return c.json(result);
});

templateRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const result = await createTemplate(body);
  return c.json(result, 201);
});

templateRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const result = await updateTemplate(id, body);
  return c.json(result);
});

templateRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await deleteTemplate(id);
  return c.json({ message: 'Template deleted' });
});
