import { PrismaClient } from '@prisma/client';
import { getDatabaseConfig, getConnectionString } from '../config/database';

const prisma = new PrismaClient();

// Default roles in Hebrew (alphabetically sorted)
const defaultRoles = [
  'טיפול בהבעה ויצירה',
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
    email: 'sara.therapist@example.com',
    roleName: 'ריפוי בעיסוק',
    weeklySessionsCount: 12,
    workingHours: {
      sunday: { startTime: '08:00', endTime: '16:00' },
      monday: { startTime: '08:00', endTime: '16:00' },
      tuesday: { startTime: '08:00', endTime: '16:00' },
      wednesday: { startTime: '08:00', endTime: '14:00' },
      thursday: { startTime: '08:00', endTime: '16:00' }
    },
    reservedHours: [
      { day: 'monday', startTime: '12:00', endTime: '13:00', notes: 'ארוחת צהריים' },
      { day: 'wednesday', startTime: '11:00', endTime: '12:30', notes: 'מפגש צוות' }
    ],
    color: '#845ec2',
    isActive: true
  },
  {
    firstName: 'דוד',
    // lastName: 'לוי', // Made optional
    email: 'david.speech@example.com',
    roleName: 'קלינאות תקשורת',
    weeklySessionsCount: 10,
    workingHours: {
      sunday: { startTime: '09:00', endTime: '17:00' },
      monday: { startTime: '09:00', endTime: '17:00' },
      tuesday: { startTime: '09:00', endTime: '17:00' },
      wednesday: { startTime: '09:00', endTime: '15:00' },
      thursday: { startTime: '09:00', endTime: '17:00' }
    },
    reservedHours: [
      { day: 'tuesday', startTime: '10:00', endTime: '11:00', notes: 'פגישה אישית' }
    ],
    color: '#ff6f91',
    isActive: true
  },
  {
    firstName: 'מירי',
    lastName: 'אברהם',
    email: 'miri.avraham@example.com',
    roleName: 'פיזיותרפיה',
    weeklySessionsCount: 8,
    workingHours: {
      sunday: { startTime: '08:30', endTime: '15:30' },
      tuesday: { startTime: '08:30', endTime: '15:30' },
      thursday: { startTime: '08:30', endTime: '15:30' }
    },
    reservedHours: [], // No reserved hours for this employee
    color: '#00c9a7',
    isActive: true
  },
  {
    firstName: 'יעל',
    lastName: 'מנהלת',
    // No email for this employee (demonstrating optional field)
    roleName: 'עבודה סוציאלית',
    weeklySessionsCount: 0, // Management role with no direct therapy sessions
    workingHours: {
      sunday: { startTime: '08:00', endTime: '16:00' },
      monday: { startTime: '08:00', endTime: '16:00' },
      tuesday: { startTime: '08:00', endTime: '16:00' },
      wednesday: { startTime: '08:00', endTime: '16:00' },
      thursday: { startTime: '08:00', endTime: '16:00' }
    },
    reservedHours: [
      { day: 'monday', startTime: '09:00', endTime: '11:00', notes: 'ישיבת הנהלה' },
      { day: 'wednesday', startTime: '14:00', endTime: '15:00', notes: 'פיקוח וייעוץ' }
    ],
    color: '#ff8a80',
    isActive: true
  }
];

// Demo patients data (will be updated with role string keys after roles are created)
const demoPatients = [
  {
    firstName: 'אמיר',
    // lastName: 'רוזן', // Made optional
    email: 'amir.patient@family.com',
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
    // No email for this patient (demonstrating optional field)
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
    email: 'noam.israeli@gmail.com',
    color: '#f3c5ff',
    therapyRequirementsMap: {
      'קלינאות תקשורת': 2,
      'טיפול בהבעה ויצירה': 1
    },
    isActive: true
  },
  {
    firstName: 'מיכל',
    lastName: 'אדמון',
    email: 'michal.admon@email.co.il',
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
    // No email for this patient (demonstrating optional field)
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

    // Clear existing data (but preserve roles to maintain data consistency)
    console.log('Clearing existing data...');
    await prisma.session.deleteMany();
    await prisma.schedule.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.patient.deleteMany();
    await prisma.room.deleteMany();
    // NOTE: We do NOT delete roles to preserve existing patient therapy requirements

    // Ensure default roles exist (create only if they don't exist)
    console.log('Ensuring default roles exist...');
    const existingRoles = await prisma.role.findMany();
    const existingRoleNames = new Set(existingRoles.map(role => role.name));
    
    const rolesToCreate = defaultRoles.filter(roleName => !existingRoleNames.has(roleName));
    
    let allRoles = existingRoles;
    if (rolesToCreate.length > 0) {
      console.log(`Creating ${rolesToCreate.length} missing roles...`);
      const newRoles = await Promise.all(
        rolesToCreate.map((roleName) => {
          // Find the next available role string key number
          const nextRoleNumber = defaultRoles.indexOf(roleName) + 1;
          return prisma.role.create({
            data: {
              name: roleName,
              roleStringKey: `role_${nextRoleNumber}`,
              isActive: true
            }
          });
        })
      );
      allRoles = [...existingRoles, ...newRoles];
      console.log(`✅ Created ${newRoles.length} new roles`);
    } else {
      console.log('✅ All default roles already exist');
    }

    // Create a map from role name to role for easy lookup
    const roleMap = new Map(allRoles.map(role => [role.name, role]));

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
            email: (employee as any).email ?? null,
            roleId: (role as any).id,
            weeklySessionsCount: employee.weeklySessionsCount,
            workingHours: JSON.stringify(employee.workingHours),
            reservedHours: JSON.stringify(employee.reservedHours || []),
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
            therapyRequirements[(role as any).roleStringKey] = sessions;
          }
        });

        return prisma.patient.create({
          data: {
            firstName: patient.firstName,
            lastName: patient.lastName ?? '',
            email: (patient as any).email ?? null,
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
    console.log(`  - ${allRoles.length} roles`);
    console.log(`  - ${createdEmployees.length} employees`);
    console.log(`  - ${createdPatients.length} patients`);
    console.log(`  - ${createdRooms.length} rooms`);

    console.log('\nRoles available:');
    allRoles.forEach(role => {
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
