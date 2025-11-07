const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

async function testAlarmAPI() {
  try {
    // Login first
    console.log('Logging in...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@solar.com',
      password: 'Admin123!',
    });

    const token = loginResponse.data.token;
    console.log('✅ Login successful');

    // Test alarm endpoints
    const config = {
      headers: { Authorization: `Bearer ${token}` },
    };

    // Get all alarms
    console.log('\nTesting GET /api/alarms...');
    const alarmsResponse = await axios.get(`${API_URL}/alarms?page=1&limit=5`, config);
    console.log(`✅ Found ${alarmsResponse.data.data.length} alarms`);
    console.log('Sample alarm:', JSON.stringify(alarmsResponse.data.data[0], null, 2).substring(0, 200));

    // Get statistics
    console.log('\nTesting GET /api/alarms/statistics...');
    const statsResponse = await axios.get(`${API_URL}/alarms/statistics`, config);
    console.log('✅ Statistics:', JSON.stringify(statsResponse.data.data, null, 2));

    console.log('\n✅ All alarm API endpoints are working!');
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testAlarmAPI();
