import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../../lib/prisma';
import { signAdminToken } from '../../middleware/auth';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
});

export const authService = {
  async login(email: string, password: string) {
    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin) {
      throw new Error('Invalid email or password');
    }

    const isValid = await bcrypt.compare(password, admin.password);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    const token = signAdminToken(admin.id);
    const { password: _pw, ...adminWithoutPassword } = admin;

    return { token, admin: adminWithoutPassword };
  },

  async register(email: string, password: string, name: string) {
    const existing = await prisma.admin.findUnique({ where: { email } });
    if (existing) {
      throw new Error('An admin with this email already exists');
    }

    const hashed = await bcrypt.hash(password, 12);
    const admin = await prisma.admin.create({
      data: { email, password: hashed, name },
    });

    const token = signAdminToken(admin.id);
    const { password: _pw, ...adminWithoutPassword } = admin;

    return { token, admin: adminWithoutPassword };
  },

  async getMe(adminId: string) {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!admin) {
      throw new Error('Admin not found');
    }

    return admin;
  },
};
