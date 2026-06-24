# Phase 12 — Test Plan

## Testing Strategy

### Levels
1. **Unit Tests** — Individual functions (services, utils)
2. **Integration Tests** — API routes with test DB
3. **E2E Tests** — Full flow (admin panel + mobile)
4. **Manual Tests** — Edge cases, visual checks

### Framework
- **Runtime**: Vitest (fast, ESM-compatible, Jest-compatible API)
- **HTTP assertions**: Supertest
- **Test DB**: MongoDB Memory Server (mongodb-memory-server)
- **Coverage**: c8 (built into Vitest)
- **Mobile**: Flutter `flutter_test` + `integration_test`

## Test Structure

```
api/
├── __tests__/
│   ├── unit/
│   │   ├── services/
│   │   │   ├── otpService.test.js
│   │   │   ├── pushService.test.js
│   │   │   └── emailService.test.js
│   │   └── utils/
│   │       ├── rateLimiter.test.js
│   │       └── validate.test.js
│   ├── integration/
│   │   ├── routes/
│   │   │   ├── auth.test.js
│   │   │   ├── rides.test.js
│   │   │   ├── users.test.js
│   │   │   ├── drivers.test.js
│   │   │   ├── chat.test.js
│   │   │   ├── payments.test.js
│   │   │   ├── admin.test.js
│   │   │   └── upload.test.js
│   │   └── mongo/
│   │       └── odm.test.js
│   └── e2e/
│       ├── ride-lifecycle.test.js
│       └── auth-flow.test.js
├── vitest.config.js
└── setup.js
```

## Vitest Configuration

```javascript
// vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./__tests__/setup.js'],
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      provider: 'c8',
      reporter: ['text', 'lcov'],
      include: ['services/**/*.js', 'middleware/**/*.js', 'utils/**/*.js'],
    },
  },
});
```

## Test Setup

```javascript
// __tests__/setup.js
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';
import { createApp } from '../createApp.js';

let mongoServer;
let mongoClient;
let db;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  mongoClient = new MongoClient(uri);
  await mongoClient.connect();
  db = mongoClient.db('test');
  
  // Override DB connection
  process.env.MONGODB_URI = uri;
  process.env.JWT_SECRET = 'test-secret';
  process.env.NODE_ENV = 'test';
});

afterAll(async () => {
  await mongoClient.close();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear all collections
  const collections = await db.listCollections().toArray();
  for (const col of collections) {
    await db.collection(col.name).deleteMany({});
  }
});

export { db, getDb };
```

## Unit Tests

### Example: OTP Service
```javascript
// __tests__/unit/services/otpService.test.js
import { describe, it, expect } from 'vitest';
import { generateOtp, verifyOtp } from '../../../services/otpService.js';

describe('OTP Service', () => {
  describe('generateOtp', () => {
    it('should generate a 6-digit code', () => {
      const code = generateOtp();
      expect(code).toMatch(/^\d{6}$/);
    });
    
    it('should generate different codes each time', () => {
      const codes = new Set(Array.from({ length: 100 }, () => generateOtp()));
      expect(codes.size).toBeGreaterThan(90); // At least 90% unique
    });
  });
  
  describe('verifyOtp', () => {
    it('should reject expired OTP', async () => {
      const result = await verifyOtp('+1234567890', '123456');
      expect(result.success).toBe(false);
      expect(result.error).toBe('EXPIRED');
    });
  });
});
```

## Integration Tests

### Example: Auth Flow
```javascript
// __tests__/integration/routes/auth.test.js
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../createApp.js';

const app = createApp();

describe('POST /api/auth/send-otp', () => {
  it('should return 400 for invalid phone number', async () => {
    const res = await request(app)
      .post('/api/auth/send-otp')
      .send({ phone: 'invalid' });
    
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
  
  it('should send OTP for valid phone', async () => {
    const res = await request(app)
      .post('/api/auth/send-otp')
      .send({ phone: '+1234567890' });
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
```

### Example: Ride Lifecycle
```javascript
// __tests__/integration/routes/rides.test.js
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../createApp.js';

describe('Ride Lifecycle', () => {
  let userToken, driverToken, rideId;
  
  it('should create a ride request', async () => {
    const res = await request(app)
      .post('/api/rides')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        pickup: { address: 'A', latitude: 40.71, longitude: -74.00 },
        dropoff: { address: 'B', latitude: 40.72, longitude: -74.01 },
        paymentMethod: 'cash',
      });
    
    expect(res.status).toBe(201);
    rideId = res.body.data.rideId;
  });
  
  it('should accept the ride', async () => {
    const res = await request(app)
      .post(`/api/rides/${rideId}/accept`)
      .set('Authorization', `Bearer ${driverToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('accepted');
  });
  
  it('should complete the ride lifecycle', async () => {
    // Start
    await request(app)
      .post(`/api/rides/${rideId}/start`)
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(200);
    
    // Begin trip
    await request(app)
      .post(`/api/rides/${rideId}/begin-trip`)
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(200);
    
    // Complete
    await request(app)
      .post(`/api/rides/${rideId}/complete`)
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(200);
    
    // Verify final status
    const res = await request(app)
      .get(`/api/rides/${rideId}/status`)
      .set('Authorization', `Bearer ${userToken}`);
    
    expect(res.body.data.status).toBe('completed');
  });
});
```

## Testing Admin Stats

```javascript
// __tests__/integration/routes/admin.test.js
describe('GET /api/admin/stats', () => {
  it('should return dashboard stats under 1 second', async () => {
    const start = Date.now();
    
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);
    
    const duration = Date.now() - start;
    
    expect(res.status).toBe(200);
    expect(duration).toBeLessThan(1000); // Must be <1s (down from ~4s)
    expect(res.body.data).toHaveProperty('totalUsers');
    expect(res.body.data).toHaveProperty('totalDrivers');
    expect(res.body.data).toHaveProperty('activeRides');
    expect(res.body.data).toHaveProperty('revenue');
  });
});
```

## Performance Tests

```javascript
// __tests__/performance/odm-benchmark.test.js
describe('ODM vs Native Driver Performance', () => {
  const NUM_DOCUMENTS = 1000;
  
  beforeAll(async () => {
    // Insert test data
    const docs = Array.from({ length: NUM_DOCUMENTS }, (_, i) => ({
      name: `User ${i}`,
      email: `user${i}@test.com`,
      role: i % 2 === 0 ? 'user' : 'driver',
    }));
    await db.collection('users').insertMany(docs);
  });
  
  it('native find() should be faster than ODM in-memory', async () => {
    // Native: ~1ms
    const start1 = Date.now();
    await db.collection('users').find({ role: 'driver' }).toArray();
    const nativeDuration = Date.now() - start1;
    
    // ODM (simulated): loads ALL documents, then filters in JS
    const start2 = Date.now();
    const all = await db.collection('users').find({}).toArray();
    const filtered = all.filter(u => u.role === 'driver');
    const odmDuration = Date.now() - start2;
    
    expect(nativeDuration).toBeLessThan(odmDuration);
  });
});
```

## Coverage Targets

| Area | Target | Critical Paths |
|------|--------|---------------|
| Services | 80%+ | OTP, Push, Email services |
| Middleware | 90%+ | Auth, Rate limiter, Error handler |
| Routes (integration) | 60%+ | Rides, Auth, Drivers, Chat, Admin |
| Utils | 100% | Pure functions only |
| ODM layer | 70%+ | Query functions, aggregation |
| **Overall** | **75%+** | |

## CI Integration

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 18 }
      - run: npm ci
      - run: npm run test -- --coverage
      - uses: codecov/codecov-action@v3
```

## Test Data Factories

```javascript
// __tests__/factories.js
export function createUser(overrides = {}) {
  return {
    phone: '+1234567890',
    name: 'Test User',
    role: 'user',
    ...overrides,
  };
}

export function createDriver(overrides = {}) {
  return {
    userId: new ObjectId(),
    vehicle: { make: 'Toyota', model: 'Camry', year: 2020, color: 'White', plateNumber: 'ABC123' },
    isOnline: true,
    isAvailable: true,
    currentLocation: { type: 'Point', coordinates: [-74.006, 40.7128] },
    ...overrides,
  };
}

export function createRide(overrides = {}) {
  return {
    userId: new ObjectId(),
    status: 'requesting',
    pickup: { address: 'A', coordinates: { type: 'Point', coordinates: [-74.00, 40.71] } },
    dropoff: { address: 'B', coordinates: { type: 'Point', coordinates: [-74.01, 40.72] } },
    fare: 15.50,
    paymentMethod: 'cash',
    ...overrides,
  };
}
```

## Running Tests

```bash
# Unit + integration
npm run test

# Watch mode (development)
npm run test:watch

# Specific file
npm run test -- __tests__/integration/routes/rides.test.js

# Coverage
npm run test -- --coverage

# Flutter tests
cd mobile && flutter test

# Flutter integration tests
cd mobile && flutter test --integration
```
