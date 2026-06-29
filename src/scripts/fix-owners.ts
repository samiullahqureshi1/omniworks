import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const organizations = await prisma.organization.findMany({
    where: { ownerUserId: null },
    include: {
      users: {
        where: { role: 'OWNER' },
        take: 1
      }
    }
  });

  console.log(`Found ${organizations.length} organizations without an owner.`);

  for (const org of organizations) {
    if (org.users.length > 0) {
      const ownerId = org.users[0].id;
      await prisma.organization.update({
        where: { id: org.id },
        data: { ownerUserId: ownerId }
      });
      console.log(`Updated organization ${org.name} with owner ${ownerId}`);
    } else {
      console.log(`Organization ${org.name} has no OWNER users to assign.`);
    }
  }

  console.log('Done fixing owners.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
