import type { Context, Next } from 'hono';

export const errorHandler = async (c: Context, next: Next) => {
  try {
    await next();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.toLowerCase().includes('not found') ? 404 : 400;
    console.error('Unhandled server error:', error);
    return c.json({ message, stack: error instanceof Error ? error.stack : undefined }, status);
  }
};
