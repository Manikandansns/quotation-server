import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { signToken } from '../middlewares/auth';

export const authRoutes = new Hono();

authRoutes.post('/login', async (c) => {
  const body = await c.req.json();
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');

  if (!email || !password) {
    return c.json({ message: 'Email and password are required' }, 400);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    return c.json({ message: 'Invalid credentials' }, 401);
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return c.json({ message: 'Invalid credentials' }, 401);
  }

  const token = signToken({ sub: user.id, role: user.role });
  return c.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

authRoutes.post('/seed-admin', async (c) => {
  const existing = await prisma.user.findFirst({ where: { role: UserRole.ADMIN } });
  if (existing) {
    return c.json({ message: 'Admin already exists' }, 400);
  }

  const passwordHash = await bcrypt.hash('Admin@123', 10);
  const admin = await prisma.user.create({
    data: {
      name: 'System Admin',
      email: 'admin@marinequotation.com',
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

  return c.json({
    message: 'Admin user created',
    credentials: {
      email: admin.email,
      password: 'Admin@123',
    },
  });
});
