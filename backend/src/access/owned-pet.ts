import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';

/**
 * 404 unless `ownerId` owns the pet and it is not archived.
 * Same 404 style as GET /pets/:petId for owners.
 */
export async function ensureOwnedActivePet(
  prisma: PrismaService,
  petId: string,
  ownerId: string,
): Promise<void> {
  const pet = await prisma.pet.findUnique({
    where: { id: petId },
    select: { ownerId: true, isActive: true },
  });
  if (!pet || !pet.isActive || pet.ownerId !== ownerId) {
    throw new NotFoundException('Pet not found');
  }
}
