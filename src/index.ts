import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { serve } from 'bun';
import { env } from './config/env';
import { authRoutes } from './routes/auth.routes';
import { clientRoutes } from './routes/client.routes';
import { materialRoutes } from './routes/material.routes';
import { quotationRoutes } from './routes/quotation.routes';
import { templateRoutes } from './routes/template.routes';
import { errorHandler } from './middlewares/error-handler';

const app = new Hono();

app.use('*', logger());
app.use('*', secureHeaders());
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
);
app.use('*', errorHandler);

app.get('/', (c) => c.json({ message: 'Quotation API is running' }));

app.route('/api/auth', authRoutes);
app.route('/api/clients', clientRoutes);
app.route('/api/materials', materialRoutes);
app.route('/api/templates', templateRoutes);
app.route('/api/quotations', quotationRoutes);

serve({
  fetch: app.fetch,
  port: env.PORT,
});

console.log(`Server running on http://localhost:${env.PORT}`);

export default app;
