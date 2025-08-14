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
    }
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
    }
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
    }
  }
];

const demoRooms = [
  { name: 'חדר טיפול 1' },
  { name: 'חדר טיפול 2' },
  { name: 'חדר פיזיותרפיה' },
  { name: 'חדר תקשורת' }
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
    await prisma.room.deleteMany();
    await prisma.systemConfig.deleteMany();

    // Seed employees
    console.log('Seeding employees...');
    const createdEmployees = await Promise.all(
      demoEmployees.map(employee =>
        prisma.employee.create({ data: employee })
      )
    );
    console.log(`✅ Created ${createdEmployees.length} employees`);

    // Seed rooms
    console.log('Seeding rooms...');
    const createdRooms = await Promise.all(
      demoRooms.map(room =>
        prisma.room.create({ data: room })
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
