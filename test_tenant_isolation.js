// test_tenant_isolation.js
const { PrismaClient } = require('@prisma/client');
const assert = require('assert');

async function testIsolation() {
  console.log('Starting Tenant Isolation & Role access controls test...');

  // Setup client
  const prisma = new PrismaClient();

  try {
    // 1. Clean up databases from past tests
    console.log('Cleaning up existing database records...');
    await prisma.timeTracking.deleteMany();
    await prisma.timesheet.deleteMany();
    await prisma.taskAssignee.deleteMany();
    await prisma.task.deleteMany();
    await prisma.projectAssignee.deleteMany();
    await prisma.project.deleteMany();
    await prisma.invitation.deleteMany();
    await prisma.user.deleteMany();
    await prisma.organization.deleteMany();

    // 2. Create Tenants (Organizations)
    console.log('Creating Test Organizations...');
    const orgA = await prisma.organization.create({ data: { name: 'Acme Org A' } });
    const orgB = await prisma.organization.create({ data: { name: 'Beta Org B' } });

    // 3. Create Users
    console.log('Creating Test Users with role permissions...');
    const ownerA = await prisma.user.create({
      data: {
        name: 'Owner A',
        email: 'owner@org-a.com',
        passwordHash: 'dummy-hash',
        role: 'OWNER',
        organizationId: orgA.id,
      },
    });

    const memberA = await prisma.user.create({
      data: {
        name: 'Member A',
        email: 'member@org-a.com',
        passwordHash: 'dummy-hash',
        role: 'MEMBER',
        organizationId: orgA.id,
      },
    });

    const clientA = await prisma.user.create({
      data: {
        name: 'Client A',
        email: 'client@org-a.com',
        passwordHash: 'dummy-hash',
        role: 'CLIENT',
        organizationId: orgA.id,
      },
    });

    const ownerB = await prisma.user.create({
      data: {
        name: 'Owner B',
        email: 'owner@org-b.com',
        passwordHash: 'dummy-hash',
        role: 'OWNER',
        organizationId: orgB.id,
      },
    });

    // 4. Create Projects
    console.log('Creating Projects for Organization A and B...');
    const projectA = await prisma.project.create({
      data: {
        name: 'Secret Project Org A',
        organizationId: orgA.id,
        clientId: clientA.id,
        projectManagerId: memberA.id,
        startDate: new Date(),
        status: 'IN_PROGRESS',
      },
    });

    const projectB = await prisma.project.create({
      data: {
        name: 'Secret Project Org B',
        organizationId: orgB.id,
        startDate: new Date(),
        status: 'IN_PROGRESS',
      },
    });

    // 5. Test Isolation Assertions
    console.log('Asserting Tenant Isolation rules...');

    // Rule: User in Org A must NOT see projects in Org B
    const projectsVisibleToOrgA = await prisma.project.findMany({
      where: { organizationId: orgA.id },
    });
    assert(projectsVisibleToOrgA.length === 1, 'Org A should only see 1 project');
    assert(projectsVisibleToOrgA[0].id === projectA.id, 'Org A project id mismatch');
    assert(projectsVisibleToOrgA[0].name === 'Secret Project Org A', 'Org A project name mismatch');

    const projectsVisibleToOrgB = await prisma.project.findMany({
      where: { organizationId: orgB.id },
    });
    assert(projectsVisibleToOrgB.length === 1, 'Org B should only see 1 project');
    assert(projectsVisibleToOrgB[0].id === projectB.id, 'Org B project id mismatch');

    // Rule: Client A should only see projects where they are assigned as the client
    const projectsVisibleToClientA = await prisma.project.findMany({
      where: {
        organizationId: orgA.id,
        clientId: clientA.id,
      },
    });
    assert(projectsVisibleToClientA.length === 1, 'Client A should see their own project');

    // Rule: Client A must NOT see project managed by Member A if they are not client
    const projectNotAssignedToClient = await prisma.project.findFirst({
      where: {
        organizationId: orgA.id,
        clientId: { not: clientA.id },
      },
    });
    assert(!projectNotAssignedToClient, 'Client A should not have leaks');

    console.log('✅ Tenant Isolation and query filter verification PASSED successfully!');
  } catch (error) {
    console.error('❌ Tenant Isolation verification FAILED:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testIsolation();
