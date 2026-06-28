import { Hono } from 'hono';
import { createClient, deleteClient, listClients, updateClient } from '../controllers/client.controller';

export const clientRoutes = new Hono();

clientRoutes.get('/', async (c) => {
  const result = await listClients(c.req.query());
  return c.json(result);
});

clientRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const result = await createClient(body);
  return c.json(result, 201);
});

clientRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const result = await updateClient(id, body);
  return c.json(result);
});

clientRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await deleteClient(id);
  return c.json({ message: 'Client deleted' });
});
