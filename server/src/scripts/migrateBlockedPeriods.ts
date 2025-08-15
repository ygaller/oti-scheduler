import { initializeDatabase } from '../database/connection';
import { PrismaSystemConfigRepository } from '../repositories/SystemConfigRepository';
import { PrismaActivityRepository } from '../repositories/ActivityRepository';
import { ScheduleConfig } from '../types';

async function migrateBlockedPeriods() {
  console.log('🔄 Starting activities migration...');
  
  // Initialize database connection
  const { prisma } = await initializeDatabase();
  const configRepo = new PrismaSystemConfigRepository(prisma);
  const activityRepo = new PrismaActivityRepository(prisma);

  try {
    // Check if migration has already been run
    const existingActivities = await activityRepo.findAll(true);
    if (existingActivities.length > 0) {
      console.log('⚠️  Activities already exist. Skipping migration.');
      return;
    }

    // Get the current system config
    const config = await configRepo.getScheduleConfig();
    if (!config) {
      console.log('⚠️  No schedule config found. Nothing to migrate.');
      return;
    }

    console.log('📊 Found schedule config:', JSON.stringify(config, null, 2));

    // Create activities from the config
    const activitiesToCreate = [
      {
        name: 'ארוחת בוקר',
        color: '#ff9671', // Orange for breakfast
        defaultStartTime: config.breakfast.startTime,
        defaultEndTime: config.breakfast.endTime,
        dayOverrides: {},
        isBlocking: true, // Breakfast blocks scheduling
        isActive: true
      },
      {
        name: 'מפגש בוקר',
        color: '#845ec2', // Purple for morning meeting
        defaultStartTime: config.morningMeetup.startTime,
        defaultEndTime: config.morningMeetup.endTime,
        dayOverrides: {},
        isBlocking: true, // Staff meeting blocks scheduling
        isActive: true
      },
      {
        name: 'ארוחת צהריים',
        color: '#00c9a7', // Green for lunch
        defaultStartTime: config.lunch.startTime,
        defaultEndTime: config.lunch.endTime,
        dayOverrides: {},
        isBlocking: true, // Lunch blocks scheduling
        isActive: true
      }
    ];

    // Create the activities
    for (const activityData of activitiesToCreate) {
      const created = await activityRepo.create(activityData);
      console.log(`✅ Created activity: ${created.name} (${created.defaultStartTime} - ${created.defaultEndTime})`);
    }

    console.log('🎉 Migration completed successfully!');
    console.log('📝 The old schedule config still exists in system_config table for backward compatibility.');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Export for use in other parts of the application
export { migrateBlockedPeriods };

// Allow running as a standalone script
if (require.main === module) {
  migrateBlockedPeriods()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}
