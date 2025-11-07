const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAlarms() {
  try {
    const count = await prisma.alarm.count();
    console.log('Total alarms in database:', count);

    if (count > 0) {
      const alarms = await prisma.alarm.findMany({
        take: 5,
        include: {
          plant: { select: { name: true } },
          device: { select: { name: true } },
        },
        orderBy: { triggeredAt: 'desc' },
      });

      console.log('\nSample alarms:');
      alarms.forEach((alarm, i) => {
        console.log(`${i + 1}. [${alarm.severity}] ${alarm.message}`);
        console.log(`   Plant: ${alarm.plant.name}, Status: ${alarm.status}`);
      });
    } else {
      console.log('\nNo alarms found in database. Need to seed alarm data.');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAlarms();
