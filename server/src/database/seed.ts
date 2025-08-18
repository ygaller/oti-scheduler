import { PrismaClient } from '@prisma/client';
import { getDatabaseConfig, getConnectionString } from '../config/database';

const prisma = new PrismaClient();

// Default roles in Hebrew (alphabetically sorted)
const defaultRoles = [
  'טיפול בהבעה ויציאה',
  'עבודה סוציאלית', 
  'פיזיותרפיה',
  'קלינאות תקשורת',
  'ריפוי בעיסוק'
];

// Demo employees data (will be updated with roleIds after roles are created)
const demoEmployees = [
  {
    firstName: 'שרה',
    // lastName: 'כהן', // Made optional
    roleName: 'ריפוי בעיסוק',
    weeklySessionsCount: 12,
    workingHours: {
      sunday: { startTime: '08:00', endTime: '16:00' },
      monday: { startTime: '08:00', endTime: '16:00' },
      tuesday: { startTime: '08:00', endTime: '16:00' },
      wednesday: { startTime: '08:00', endTime: '14:00' },
      thursday: { startTime: '08:00', endTime: '16:00' }
    },
    color: '#845ec2',
    isActive: true
  },
  {
    firstName: 'דוד',
    // lastName: 'לוי', // Made optional
    roleName: 'קלינאות תקשורת',
    weeklySessionsCount: 10,
    workingHours: {
      sunday: { startTime: '09:00', endTime: '17:00' },
      monday: { startTime: '09:00', endTime: '17:00' },
      tuesday: { startTime: '09:00', endTime: '17:00' },
      wednesday: { startTime: '09:00', endTime: '15:00' },
      thursday: { startTime: '09:00', endTime: '17:00' }
    },
    color: '#ff6f91',
    isActive: true
  },
  {
    firstName: 'מירי',
    lastName: 'אברהם',
    roleName: 'פיזיותרפיה',
    weeklySessionsCount: 8,
    workingHours: {
      sunday: { startTime: '08:30', endTime: '15:30' },
      tuesday: { startTime: '08:30', endTime: '15:30' },
      thursday: { startTime: '08:30', endTime: '15:30' }
    },
    color: '#00c9a7',
    isActive: true
  }
];

// Demo patients data (will be updated with role string keys after roles are created)
const demoPatients = [
  {
    firstName: 'אמיר',
    // lastName: 'רוזן', // Made optional
    color: '#4b4453',
    therapyRequirementsMap: {
      'ריפוי בעיסוק': 2,
      'קלינאות תקשורת': 1
    },
    isActive: true
  },
  {
    firstName: 'דנה',
    // lastName: 'ברק', // Made optional
    color: '#b0a8b9',
    therapyRequirementsMap: {
      'פיזיותרפיה': 3,
      'ריפוי בעיסוק': 1
    },
    isActive: true
  },
  {
    firstName: 'נועם',
    lastName: 'ישראלי',
    color: '#f3c5ff',
    therapyRequirementsMap: {
      'קלינאות תקשורת': 2,
      'טיפול בהבעה ויציאה': 1
    },
    isActive: true
  },
  {
    firstName: 'מיכל',
    lastName: 'אדמון',
    color: '#ff6f91',
    therapyRequirementsMap: {
      'ריפוי בעיסוק': 1,
      'פיזיותרפיה': 2,
      'עבודה סוציאלית': 1
    },
    isActive: true
  },
  {
    firstName: 'עידו',
    lastName: 'מורג',
    color: '#ffc75f',
    therapyRequirementsMap: {
      'קלינאות תקשורת': 3
    },
    isActive: true
  }
];

const demoRooms = [
  { name: 'חדר טיפול 1', color: '#008dcd', isActive: true },
  { name: 'חדר טיפול 2', color: '#ffc75f', isActive: true },
  { name: 'חדר פיזיותרפיה', color: '#d65db1', isActive: true },
  { name: 'חדר תקשורת', color: '#ff8066', isActive: true }
];

async function seed() {
  try {
    console.log('🌱 Starting database seeding...');

    // Clear existing data
    console.log('Clearing existing data...');
    await prisma.session.deleteMany();
    await prisma.schedule.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.patient.deleteMany();
    await prisma.room.deleteMany();
    await prisma.role.deleteMany();

    // Seed default roles
    console.log('Seeding default roles...');
    const createdRoles = await Promise.all(
      defaultRoles.map((roleName, index) =>
        prisma.role.create({
          data: {
            name: roleName,
            roleStringKey: `role_${index + 1}`,
            isActive: true
          }
        })
      )
    );
    console.log(`✅ Created ${createdRoles.length} roles`);

    // Create a map from role name to role for easy lookup
    const roleMap = new Map(createdRoles.map(role => [role.name, role]));

    // Seed employees with role IDs
    console.log('Seeding employees...');
    const createdEmployees = await Promise.all(
      demoEmployees.map(employee => {
        const role = roleMap.get(employee.roleName);
        if (!role) {
          throw new Error(`Role not found: ${employee.roleName}`);
        }
        
        return prisma.employee.create({
          data: {
            firstName: employee.firstName,
            lastName: employee.lastName ?? '',
            roleId: role.id,
            weeklySessionsCount: employee.weeklySessionsCount,
            workingHours: JSON.stringify(employee.workingHours),
            color: employee.color,
            isActive: employee.isActive
          }
        });
      })
    );
    console.log(`✅ Created ${createdEmployees.length} employees`);

    // Seed patients with role string keys in therapy requirements
    console.log('Seeding patients...');
    const createdPatients = await Promise.all(
      demoPatients.map(patient => {
        // Convert role names to role string keys
        const therapyRequirements: { [key: string]: number } = {};
        
        Object.entries(patient.therapyRequirementsMap).forEach(([roleName, sessions]) => {
          const role = roleMap.get(roleName);
          if (role) {
            therapyRequirements[role.roleStringKey] = sessions;
          }
        });

        return prisma.patient.create({
          data: {
            firstName: patient.firstName,
            lastName: patient.lastName ?? '',
            color: patient.color,
            therapyRequirements: JSON.stringify(therapyRequirements),
            isActive: patient.isActive
          }
        });
      })
    );
    console.log(`✅ Created ${createdPatients.length} patients`);

    // Seed rooms
    console.log('Seeding rooms...');
    const createdRooms = await Promise.all(
      demoRooms.map(room =>
        prisma.room.create({ data: room as any })
      )
    );
    console.log(`✅ Created ${createdRooms.length} rooms`);

    console.log('🎉 Database seeding completed successfully!');
    console.log('\nCreated:');
    console.log(`  - ${createdRoles.length} roles`);
    console.log(`  - ${createdEmployees.length} employees`);
    console.log(`  - ${createdPatients.length} patients`);
    console.log(`  - ${createdRooms.length} rooms`);

    console.log('\nRoles created:');
    createdRoles.forEach(role => {
      console.log(`  - ${role.name} (${role.roleStringKey})`);
    });

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run seeding if called directly
if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { seed };
