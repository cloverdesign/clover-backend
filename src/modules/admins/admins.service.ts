import prisma from '../../lib/prisma';
import { mailer } from '../../lib/mailer';

const safeAdminSelect = {
  id:            true,
  email:         true,
  name:          true,
  role:          true,
  emailVerified: true,
  approved:      true,
  createdAt:     true,
  updatedAt:     true,
} as const;

export const adminsService = {

  async listAll() {
    return prisma.admin.findMany({
      orderBy: { createdAt: 'desc' },
      select:  safeAdminSelect,
    });
  },

  async getById(id: string) {
    const admin = await prisma.admin.findUnique({ where: { id }, select: safeAdminSelect });
    if (!admin) throw new Error('Admin not found');
    return admin;
  },

  async approve(id: string, requestingAdminId: string) {
    if (id === requestingAdminId) throw new Error('You cannot approve your own account');

    const admin = await prisma.admin.findUnique({ where: { id } });
    if (!admin) throw new Error('Admin not found');
    if (admin.approved) throw new Error('Admin is already approved');

    const updated = await prisma.admin.update({
      where:  { id },
      data:   { approved: true },
      select: safeAdminSelect,
    });

    // Notify the admin their account is approved
    mailer.sendAdminAccountApproved(admin.email, admin.name).catch(() => {});

    return updated;
  },

  async revoke(id: string, requestingAdminId: string) {
    if (id === requestingAdminId) throw new Error('You cannot revoke your own account');

    const admin = await prisma.admin.findUnique({ where: { id } });
    if (!admin) throw new Error('Admin not found');
    if (admin.role === 'SUPER_ADMIN') throw new Error('Cannot revoke a super admin account');

    return prisma.admin.update({
      where:  { id },
      data:   { approved: false },
      select: safeAdminSelect,
    });
  },

  async changeRole(id: string, role: 'SUPER_ADMIN' | 'ADMIN', requestingAdminId: string) {
    if (id === requestingAdminId) throw new Error('You cannot change your own role');

    const admin = await prisma.admin.findUnique({ where: { id } });
    if (!admin) throw new Error('Admin not found');

    return prisma.admin.update({
      where:  { id },
      data:   { role },
      select: safeAdminSelect,
    });
  },

  async remove(id: string, requestingAdminId: string) {
    if (id === requestingAdminId) throw new Error('You cannot delete your own account');

    const admin = await prisma.admin.findUnique({ where: { id } });
    if (!admin) throw new Error('Admin not found');
    if (admin.role === 'SUPER_ADMIN') throw new Error('Cannot delete a super admin account');

    await prisma.admin.delete({ where: { id } });
  },
};
