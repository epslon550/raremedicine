const { spawn } = require('child_process');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const TEST_PORT = 5001;
const TEST_MONGO_URI = 'mongodb://127.0.0.1:27017/rare-medicine-test';
const BASE_URL = `http://127.0.0.1:${TEST_PORT}/api`;

let serverProcess = null;

// Helper: wait for a given time
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper: Assert helper
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

// Helper: Assert response status
function assertStatus(res, expectedStatus, body) {
  if (res.status !== expectedStatus) {
    console.error('Response Body:', body);
    throw new Error(`Expected status ${expectedStatus}, but got ${res.status}`);
  }
}

// Clean and drop test database
async function cleanDatabase() {
  console.log('Cleaning test database...');
  try {
    await mongoose.connect(TEST_MONGO_URI);
    await mongoose.connection.db.dropDatabase();
    await mongoose.disconnect();
    console.log('Test database cleared successfully.');
  } catch (err) {
    console.error('Failed to clean test database:', err.message);
  }
}

// Start backend server
function startServer() {
  return new Promise((resolve, reject) => {
    console.log(`Starting backend server on port ${TEST_PORT}...`);
    
    serverProcess = spawn('node', ['server.js'], {
      cwd: __dirname,
      env: {
        ...process.env,
        PORT: TEST_PORT,
        MONGO_URI: TEST_MONGO_URI
      }
    });

    let started = false;

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`[Server] ${output.trim()}`);
      if (output.includes('Server is running on port') || output.includes('MongoDB connected successfully')) {
        if (!started) {
          started = true;
          // Wait an extra second to ensure fully ready
          setTimeout(() => resolve(serverProcess), 1000);
        }
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error(`[Server Error] ${data.toString().trim()}`);
    });

    serverProcess.on('error', (err) => {
      reject(err);
    });

    serverProcess.on('exit', (code) => {
      if (!started) {
        reject(new Error(`Server exited early with code ${code}`));
      }
    });
  });
}

// Run the API test suite
async function runTests() {
  console.log('\n--- Starting API Tests ---\n');

  // 1. Check health
  console.log('Test 1: Health check endpoint...');
  const healthRes = await fetch(`${BASE_URL}/health`);
  const healthData = await healthRes.json();
  assertStatus(healthRes, 200, healthData);
  assert(healthData.status === 'OK', 'Health status should be OK');
  console.log('✓ Health check passed.');

  // 2. Admin Login (seeded automatically on startup)
  console.log('\nTest 2: Logging in as Admin...');
  const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@raremed.com', password: 'adminpassword' })
  });
  const adminLoginData = await adminLoginRes.json();
  assertStatus(adminLoginRes, 200, adminLoginData);
  assert(adminLoginData.role === 'admin', 'Role should be admin');
  assert(!!adminLoginData.token, 'Token should be present');
  const adminToken = adminLoginData.token;
  console.log('✓ Admin logged in successfully.');

  // 3. Register a Patient
  console.log('\nTest 3: Registering a Patient...');
  const patientRegisterRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'John Patient',
      email: 'john@patient.com',
      password: 'patientpassword',
      phone: '1234567890',
      role: 'patient',
      latitude: 17.4000, // Hyderabad area
      longitude: 78.5000
    })
  });
  const patientRegisterData = await patientRegisterRes.json();
  assertStatus(patientRegisterRes, 201, patientRegisterData);
  assert(patientRegisterData.role === 'patient', 'Role should be patient');
  console.log('✓ Patient registered successfully.');

  // Patient Login
  console.log('Logging in as Patient...');
  const patientLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'john@patient.com', password: 'patientpassword' })
  });
  const patientLoginData = await patientLoginRes.json();
  assertStatus(patientLoginRes, 200, patientLoginData);
  const patientToken = patientLoginData.token;
  console.log('✓ Patient logged in successfully.');

  // 4. Register a Pharmacy (with mock license PDF)
  console.log('\nTest 4: Registering a Pharmacy...');
  const mockLicensePath = path.join(__dirname, '../mock_license.pdf');
  assert(fs.existsSync(mockLicensePath), 'mock_license.pdf must exist in workspace root');
  const fileBuffer = fs.readFileSync(mockLicensePath);
  const blob = new Blob([fileBuffer], { type: 'application/pdf' });

  const formData = new FormData();
  formData.append('name', 'Owner Pharmacy');
  formData.append('email', 'owner@pharmacy.com');
  formData.append('password', 'pharmacypassword');
  formData.append('phone', '0987654321');
  formData.append('role', 'pharmacy');
  formData.append('latitude', '17.4200'); // Slightly north of patient
  formData.append('longitude', '78.5200');
  formData.append('pharmacyName', 'Care Pharmacy');
  formData.append('licenseNumber', 'LIC-99887766');
  formData.append('address', 'Secunderabad Road, Hyderabad');
  formData.append('licenseFile', blob, 'license.pdf');

  const pharmacyRegisterRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    body: formData
  });
  const pharmacyRegisterData = await pharmacyRegisterRes.json();
  assertStatus(pharmacyRegisterRes, 201, pharmacyRegisterData);
  assert(pharmacyRegisterData.role === 'pharmacy', 'Role should be pharmacy');
  assert(pharmacyRegisterData.pharmacy.verificationStatus === 'pending', 'Pharmacy should be pending verification');
  console.log('✓ Pharmacy registered (pending verification) successfully.');

  // Pharmacy Login
  console.log('Logging in as Pharmacy...');
  const pharmacyLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@pharmacy.com', password: 'pharmacypassword' })
  });
  const pharmacyLoginData = await pharmacyLoginRes.json();
  assertStatus(pharmacyLoginRes, 200, pharmacyLoginData);
  const pharmacyToken = pharmacyLoginData.token;
  const pharmacyId = pharmacyLoginData.pharmacy._id;
  console.log('✓ Pharmacy logged in successfully.');

  // 5. Admin adds medicine to master catalog
  console.log('\nTest 5: Admin adding medicine to master catalog...');
  const medicineRes = await fetch(`${BASE_URL}/medicines`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      name: 'Sofosbuvir',
      genericName: 'Sovaldi',
      manufacturer: 'Gilead Sciences',
      disease: 'Hepatitis C',
      description: 'Used for the treatment of chronic hepatitis C infection.'
    })
  });
  const medicineData = await medicineRes.json();
  assertStatus(medicineRes, 201, medicineData);
  assert(medicineData.name === 'Sofosbuvir', 'Medicine name should match');
  const medicineId = medicineData._id;
  console.log('✓ Medicine added successfully.');

  // 6. Unapproved Pharmacy tries to add stock (Should fail 403)
  console.log('\nTest 6: Unapproved pharmacy adding inventory (expecting 403)...');
  const unapprovedStockRes = await fetch(`${BASE_URL}/inventory`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${pharmacyToken}`
    },
    body: JSON.stringify({
      medicineId,
      quantity: 5,
      price: 25000
    })
  });
  const unapprovedStockData = await unapprovedStockRes.json();
  assertStatus(unapprovedStockRes, 403, unapprovedStockData);
  console.log('✓ Correctly blocked unapproved pharmacy from adding stock.');

  // 7. Admin views all pharmacies and approves our pharmacy
  console.log('\nTest 7: Admin verifying/approving the pharmacy...');
  const allPharmaciesRes = await fetch(`${BASE_URL}/pharmacies`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const allPharmaciesData = await allPharmaciesRes.json();
  assertStatus(allPharmaciesRes, 200, allPharmaciesData);
  assert(allPharmaciesData.length > 0, 'Should return pharmacies list');
  const targetPharmacy = allPharmaciesData.find(p => p._id === pharmacyId);
  assert(!!targetPharmacy, 'Registered pharmacy should be in admin list');

  const approveRes = await fetch(`${BASE_URL}/pharmacies/${pharmacyId}/verify`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({ verificationStatus: 'approved' })
  });
  const approveData = await approveRes.json();
  assertStatus(approveRes, 200, approveData);
  assert(approveData.pharmacy.verificationStatus === 'approved', 'Pharmacy should be approved');
  console.log('✓ Pharmacy approved successfully by Admin.');

  // 8. Approved Pharmacy adds stock to the inventory
  console.log('\nTest 8: Approved pharmacy adding stock to inventory...');
  const addStockRes = await fetch(`${BASE_URL}/inventory`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${pharmacyToken}`
    },
    body: JSON.stringify({
      medicineId,
      quantity: 10,
      price: 24500
    })
  });
  const addStockData = await addStockRes.json();
  assertStatus(addStockRes, 200, addStockData);
  assert(addStockData.quantity === 10, 'Quantity should be 10');
  assert(addStockData.price === 24500, 'Price should be 24500');
  console.log('✓ Stock added to inventory successfully.');

  // Verify stock under /my-stock
  console.log('Retrieving pharmacy stock catalog...');
  const myStockRes = await fetch(`${BASE_URL}/inventory/my-stock`, {
    headers: { 'Authorization': `Bearer ${pharmacyToken}` }
  });
  const myStockData = await myStockRes.json();
  assertStatus(myStockRes, 200, myStockData);
  assert(myStockData.length === 1, 'Pharmacy should have 1 item in stock');
  assert(myStockData[0].medicine._id === medicineId, 'Medicine ID should match');
  console.log('✓ Verified pharmacy inventory listing.');

  // 9. Patient searches for medicine and locates nearest pharmacy holding stock
  console.log('\nTest 9: Patient searching for medicine catalog and stock locations...');
  // Search catalog
  const searchCatRes = await fetch(`${BASE_URL}/medicines/search?q=sofo`);
  const searchCatData = await searchCatRes.json();
  assertStatus(searchCatRes, 200, searchCatData);
  assert(searchCatData.length > 0, 'Should find Sofosbuvir');
  assert(searchCatData[0]._id === medicineId, 'First match should be Sofosbuvir');
  console.log('✓ Patient successfully searched the medicine catalog.');

  // Locate stock (Hyderabad Patient coordinates: 17.4000, 78.5000; Pharmacy: 17.4200, 78.5200)
  const searchStockRes = await fetch(`${BASE_URL}/inventory/search?medicineId=${medicineId}&userLat=17.4000&userLng=78.5000`);
  const searchStockData = await searchStockRes.json();
  assertStatus(searchStockRes, 200, searchStockData);
  assert(searchStockData.length === 1, 'Should find 1 stock location');
  assert(searchStockData[0].pharmacy._id === pharmacyId, 'Pharmacy should match');
  assert(typeof searchStockData[0].distance === 'number', 'Distance should be calculated');
  console.log(`✓ Located pharmacy stock at distance: ${searchStockData[0].distance} km.`);

  // 10. Patient submits a medicine request
  console.log('\nTest 10: Patient submitting a medicine request...');
  const requestRes = await fetch(`${BASE_URL}/requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${patientToken}`
    },
    body: JSON.stringify({
      medicineId,
      customMedicineName: 'Ignored since medicineId is present'
    })
  });
  const requestData = await requestRes.json();
  assertStatus(requestRes, 201, requestData);
  assert(requestData.status === 'pending', 'Status should be pending');
  assert(requestData.medicine._id === medicineId, 'Medicine ID should match');
  const requestId = requestData._id;
  console.log('✓ Patient submitted medicine request.');

  // Submit a custom medicine request too
  console.log('Patient submitting a custom medicine request...');
  const customRequestRes = await fetch(`${BASE_URL}/requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${patientToken}`
    },
    body: JSON.stringify({
      customMedicineName: 'RareCure-XYZ'
    })
  });
  const customRequestData = await customRequestRes.json();
  assertStatus(customRequestRes, 201, customRequestData);
  assert(customRequestData.customMedicineName === 'RareCure-XYZ', 'Custom name should be stored');
  console.log('✓ Patient submitted custom medicine request.');

  // 11. Pharmacy retrieves pending requests and responds
  console.log('\nTest 11: Pharmacy retrieving pending requests...');
  const pendingRequestsRes = await fetch(`${BASE_URL}/requests/pending`, {
    headers: { 'Authorization': `Bearer ${pharmacyToken}` }
  });
  const pendingRequestsData = await pendingRequestsRes.json();
  assertStatus(pendingRequestsRes, 200, pendingRequestsData);
  const targetReq = pendingRequestsData.find(r => r._id === requestId);
  assert(!!targetReq, 'Pending list should include the patient request');
  console.log('✓ Pharmacy found the pending request.');

  // Pharmacy responds
  console.log('Pharmacy responding to the request...');
  const respondRes = await fetch(`${BASE_URL}/requests/${requestId}/respond`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${pharmacyToken}`
    },
    body: JSON.stringify({
      status: 'In Stock',
      message: 'We have 10 units available right now!'
    })
  });
  const respondData = await respondRes.json();
  assertStatus(respondRes, 200, respondData);
  assert(respondData.responses.length === 1, 'Should have 1 response');
  assert(respondData.responses[0].status === 'In Stock', 'Response status should match');
  assert(respondData.responses[0].pharmacy.pharmacyName === 'Care Pharmacy', 'Pharmacy name should be populated');
  console.log('✓ Pharmacy responded to the request.');

  // 12. Patient retrieves requests and views the responses
  console.log('\nTest 12: Patient verifying pharmacy responses on their request...');
  const patientRequestsRes = await fetch(`${BASE_URL}/requests/my-requests`, {
    headers: { 'Authorization': `Bearer ${patientToken}` }
  });
  const patientRequestsData = await patientRequestsRes.json();
  assertStatus(patientRequestsRes, 200, patientRequestsData);
  const retrievedRequest = patientRequestsData.find(r => r._id === requestId);
  assert(!!retrievedRequest, 'Request should be in patient list');
  assert(retrievedRequest.responses.length === 1, 'Should contain pharmacy response');
  assert(retrievedRequest.responses[0].status === 'In Stock', 'Response status should match');
  assert(retrievedRequest.responses[0].pharmacy.pharmacyName === 'Care Pharmacy', 'Pharmacy details should be present');
  console.log('✓ Patient verified responses successfully.');

  // 13. Admin checks all requests
  console.log('\nTest 13: Admin retrieving all requests...');
  const allRequestsRes = await fetch(`${BASE_URL}/requests`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const allRequestsData = await allRequestsRes.json();
  assertStatus(allRequestsRes, 200, allRequestsData);
  assert(allRequestsData.length >= 2, 'Admin should see both catalog and custom requests');
  console.log('✓ Admin retrieved all requests successfully.');

  // 14. Pharmacy registers a new custom medicine and adds to inventory
  console.log('\nTest 14: Pharmacy registers a new custom medicine and adds to inventory...');
  const addCustomStockRes = await fetch(`${BASE_URL}/inventory`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${pharmacyToken}`
    },
    body: JSON.stringify({
      medicineId: 'new',
      name: 'CustomGene X',
      genericName: 'Gene-Therapy-Salt',
      manufacturer: 'Novartis Biotech',
      disease: 'Genetic Indication',
      description: 'Custom gene drug',
      quantity: 5,
      price: 12000
    })
  });
  const addCustomStockData = await addCustomStockRes.json();
  assertStatus(addCustomStockRes, 200, addCustomStockData);
  assert(addCustomStockData.medicine.name === 'CustomGene X', 'Custom medicine name should match');
  assert(addCustomStockData.quantity === 5, 'Custom quantity should be 5');
  assert(addCustomStockData.price === 12000, 'Custom price should be 12000');
  const customMedicineId = addCustomStockData.medicine._id;
  console.log('✓ Custom medicine registered and stock added successfully.');

  // Patient searches for custom medicine using coordinates
  console.log('Patient searching for custom medicine near Madhapur using coordinates...');
  const searchCustomStockRes = await fetch(`${BASE_URL}/inventory/search?medicineId=${customMedicineId}&userLat=17.4483&userLng=78.3741`);
  const searchCustomStockData = await searchCustomStockRes.json();
  assertStatus(searchCustomStockRes, 200, searchCustomStockData);
  assert(searchCustomStockData.length === 1, 'Should locate 1 custom stock location');
  assert(searchCustomStockData[0].pharmacy._id === pharmacyId, 'Custom pharmacy should match');
  assert(typeof searchCustomStockData[0].distance === 'number', 'Custom distance should be calculated');
  console.log(`✓ Located pharmacy custom stock at distance: ${searchCustomStockData[0].distance} km.`);

  console.log('\n=========================================');
  console.log('🎉 ALL BACKEND FUNCTIONALITY TESTS PASSED! 🎉');
  console.log('=========================================\n');
}

// Main function orchestrating startup, testing, cleanup and shutdown
async function main() {
  let hasError = false;
  try {
    // Clean test DB first
    await cleanDatabase();

    // Start server
    await startServer();

    // Run tests
    await runTests();
  } catch (err) {
    console.error('\n❌ Test execution failed with error:');
    console.error(err);
    hasError = true;
  } finally {
    // Kill the server process
    if (serverProcess) {
      console.log('Stopping server process...');
      serverProcess.kill('SIGINT');
    }
    
    // Clean DB after tests
    await cleanDatabase();
    
    process.exit(hasError ? 1 : 0);
  }
}

main();
