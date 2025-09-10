import { connectDB } from './src/config/database.ts';
import OrderService from './src/services/order.service.ts';
import OrderModal from './src/models/order/index.ts';

async function testDateFilter() {
  try {
    // Connect to database
    await connectDB();
    console.log('Connected to database');

    // Test the date filtering
    const filters = {
      driver: '68bec24269782c8ce0b6b1ea',
      startDate: '2025-01-15',
      endDate: '2025-01-15',
      page: 1,
      limit: 10,
      sort: '-createdAt'
    };

    console.log('Testing with filters:', filters);

    // Call the service method
    const result = await OrderService.getOrders(filters, '68bec24269782c8ce0b6b1ea', 'driver');

    console.log('\n=== RESULTS ===');
    console.log(`Total orders found: ${result.orders.length}`);
    console.log(`Total count: ${result.pagination.total}`);
    
    console.log('\nOrders:');
    result.orders.forEach(order => {
      console.log(`- Order ${order.orderNumber}: createdAt = ${order.createdAt}, driver = ${order.driver?.userRef}`);
    });

    // Also test the raw query to compare
    console.log('\n=== RAW QUERY TEST ===');
    const rawQuery = {
      'driver.userRef': '68bec24269782c8ce0b6b1ea',
      createdAt: {
        $gte: new Date('2025-01-15T00:00:00.000Z'),
        $lte: new Date('2025-01-15T23:59:59.999Z')
      }
    };

    const rawResults = await OrderModal.find(rawQuery)
      .select('orderNumber createdAt driver.userRef')
      .sort({ createdAt: -1 })
      .lean();

    console.log(`Raw query found ${rawResults.length} orders:`);
    rawResults.forEach(order => {
      console.log(`- Order ${order.orderNumber}: createdAt = ${order.createdAt}, driver = ${order.driver?.userRef}`);
    });

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    process.exit(0);
  }
}

testDateFilter();
