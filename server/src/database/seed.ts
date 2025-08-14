import { PrismaClient } from '@prisma/client';
import { getDatabaseConfig, getConnectionString } from '../config/database';

const prisma = new PrismaClient();

const demoEmployees = [
  {
    firstName: 'שרה',
    lastName: 'כהן',
    role: 'OCCUPATIONAL_THERAPIST' as const,
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
    lastName: 'לוי',
    role: 'SPEECH_THERAPIST' as const,
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
    role: 'PHYSIOTHERAPIST' as const,
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

const demoPatients = [
  {
    firstName: 'אמיר',
    lastName: 'רוזן',
    color: '#4b4453',
    therapyRequirements: {
      'occupational-therapist': 2,
      'speech-therapist': 1
    },
    isActive: true
  },
  {
    firstName: 'דנה',
    lastName: 'ברק',
    color: '#b0a8b9',
    therapyRequirements: {
      'physiotherapist': 3,
      'occupational-therapist': 1
    },
    isActive: true
  },
  {
    firstName: 'נועם',
    lastName: 'ישראלי',
    color: '#f3c5ff',
    therapyRequirements: {
      'speech-therapist': 2,
      'art-therapist': 1
    },
    isActive: true
  },
  {
    firstName: 'מיכל',
    lastName: 'אדמון',
    color: '#ff6f91',
    therapyRequirements: {
      'occupational-therapist': 1,
      'physiotherapist': 2,
      'social-worker': 1
    },
    isActive: true
  },
  {
    firstName: 'עידו',
    lastName: 'מורג',
    color: '#ffc75f',
    therapyRequirements: {
      'speech-therapist': 3
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

const defaultScheduleConfig = {
  breakfast: { startTime: '08:00', endTime: '08:30' },
  morningMeetup: { startTime: '09:00', endTime: '09:15' },
  lunch: { startTime: '12:00', endTime: '13:00' }
};

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
    await prisma.systemConfig.deleteMany();

    // Seed employees
    console.log('Seeding employees...');
    const createdEmployees = await Promise.all(
      demoEmployees.map(employee =>
        prisma.employee.create({ data: employee as any })
      )
    );
    console.log(`✅ Created ${createdEmployees.length} employees`);

    // Seed patients
    console.log('Seeding patients...');
    const createdPatients = await Promise.all(
      demoPatients.map(patient =>
        prisma.patient.create({ data: patient as any })
      )
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

    // Seed schedule configuration
    console.log('Seeding schedule configuration...');
    await prisma.systemConfig.create({
      data: {
        key: 'schedule_config',
        value: defaultScheduleConfig
      }
    });
    console.log('✅ Created schedule configuration');

    console.log('🎉 Database seeding completed successfully!');
    console.log('\nCreated:');
    console.log(`  - ${createdEmployees.length} employees`);
    console.log(`  - ${createdPatients.length} patients`);
    console.log(`  - ${createdRooms.length} rooms`);
    console.log(`  - 1 schedule configuration`);

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
