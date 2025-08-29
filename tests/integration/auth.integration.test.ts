import request from 'supertest';
import express from 'express';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../../src/server';
import { User } from '../../src/models/user.model';
import { UserRole } from '../../src/types/models/user.types';

describe('Auth API Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let testApp: express.Application;

  beforeAll(async () => {
    // Setup in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Initialize express app
    testApp = app;
  });

  afterEach(async () => {
    // Clear database after each test
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('POST /api/v1/auth/register', () => {
    const validUserData = {
      email: 'test@example.com',
      password: 'Test123!@#',
      name: 'Test User',
      role: UserRole.BUYER,
      phone: '+1234567890'
    };

    it('should register a new user successfully', async () => {
      const response = await request(testApp)
        .post('/api/v1/auth/register')
        .send(validUserData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user.email).toBe(validUserData.email);
      expect(response.body.data.user.name).toBe(validUserData.name);
      expect(response.body.data.user).not.toHaveProperty('password');

      // Verify user was created in database
      const user = await User.findOne({ email: validUserData.email });
      expect(user).toBeTruthy();
      expect(user?.isVerified).toBe(false);
    });

    it('should return 400 for duplicate email', async () => {
      // Create user first
      await User.create(validUserData);

      const response = await request(testApp)
        .post('/api/v1/auth/register')
        .send(validUserData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.message).toContain('already exists');
    });

    it('should return 400 for invalid email format', async () => {
      const invalidData = { ...validUserData, email: 'invalid-email' };

      const response = await request(testApp)
        .post('/api/v1/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error.message).toContain('email');
    });

    it('should return 400 for weak password', async () => {
      const weakPasswordData = { ...validUserData, password: '123' };

      const response = await request(testApp)
        .post('/api/v1/auth/register')
        .send(weakPasswordData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error.message).toContain('password');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(testApp)
        .post('/api/v1/auth/register')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    let testUser: any;

    beforeEach(async () => {
      // Create a verified user for login tests
      testUser = await User.create({
        email: 'test@example.com',
        password: 'Test123!@#', // This should be hashed in the model
        name: 'Test User',
        role: UserRole.BUYER,
        isVerified: true,
        isActive: true
      });
    });

    it('should login successfully with valid credentials', async () => {
      const response = await request(testApp)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Test123!@#'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user.email).toBe(testUser.email);

      // Verify JWT tokens
      const decodedAccess = jwt.verify(
        response.body.data.accessToken,
        process.env.JWT_SECRET!
      ) as any;
      expect(decodedAccess.userId).toBe(testUser._id.toString());

      // Check refresh token cookie
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('refreshToken');
      expect(cookies[0]).toContain('HttpOnly');
    });

    it('should return 401 for invalid email', async () => {
      const response = await request(testApp)
        .post('/api/v1/auth/login')
        .send({
          email: 'wrong@example.com',
          password: 'Test123!@#'
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error.message).toContain('Invalid');
    });

    it('should return 401 for invalid password', async () => {
      const response = await request(testApp)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword123!'
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error.message).toContain('Invalid');
    });

    it('should return 403 for unverified account', async () => {
      // Update user to unverified
      await User.findByIdAndUpdate(testUser._id, { isVerified: false });

      const response = await request(testApp)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Test123!@#'
        })
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error.message).toContain('verify');
    });

    it('should return 403 for deactivated account', async () => {
      // Update user to inactive
      await User.findByIdAndUpdate(testUser._id, { isActive: false });

      const response = await request(testApp)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Test123!@#'
        })
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error.message).toContain('deactivated');
    });

    it('should implement rate limiting', async () => {
      // Make multiple login attempts
      const attempts = 10;
      const responses = [];

      for (let i = 0; i < attempts; i++) {
        const response = await request(testApp)
          .post('/api/v1/auth/login')
          .send({
            email: 'test@example.com',
            password: 'WrongPassword'
          });
        responses.push(response.status);
      }

      // Should have some 429 (Too Many Requests) responses
      const rateLimitedResponses = responses.filter(status => status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let testUser: any;
    let validRefreshToken: string;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'test@example.com',
        password: 'Test123!@#',
        name: 'Test User',
        role: UserRole.BUYER,
        isVerified: true,
        isActive: true
      });

      // Generate valid refresh token
      validRefreshToken = jwt.sign(
        {
          userId: testUser._id,
          email: testUser.email,
          role: testUser.role
        },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: '7d' }
      );
    });

    it('should refresh tokens successfully', async () => {
      const response = await request(testApp)
        .post('/api/v1/auth/refresh')
        .set('Cookie', `refreshToken=${validRefreshToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');

      // Verify new tokens are different
      expect(response.body.data.refreshToken).not.toBe(validRefreshToken);
    });

    it('should return 401 for invalid refresh token', async () => {
      const response = await request(testApp)
        .post('/api/v1/auth/refresh')
        .set('Cookie', 'refreshToken=invalid_token')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error.message).toContain('Invalid');
    });

    it('should return 401 for expired refresh token', async () => {
      const expiredToken = jwt.sign(
        {
          userId: testUser._id,
          email: testUser.email,
          role: testUser.role
        },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: '-1d' } // Already expired
      );

      const response = await request(testApp)
        .post('/api/v1/auth/refresh')
        .set('Cookie', `refreshToken=${expiredToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 401 for missing refresh token', async () => {
      const response = await request(testApp)
        .post('/api/v1/auth/refresh')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    let testUser: any;
    let accessToken: string;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'test@example.com',
        password: 'Test123!@#',
        name: 'Test User',
        role: UserRole.BUYER,
        isVerified: true,
        isActive: true
      });

      accessToken = jwt.sign(
        {
          userId: testUser._id,
          email: testUser.email,
          role: testUser.role
        },
        process.env.JWT_SECRET!,
        { expiresIn: '15m' }
      );
    });

    it('should logout successfully', async () => {
      const response = await request(testApp)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.message).toContain('Logged out');

      // Check that refresh token cookie is cleared
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('refreshToken=;');
      expect(cookies[0]).toContain('Max-Age=0');
    });

    it('should return 401 for missing authorization', async () => {
      const response = await request(testApp)
        .post('/api/v1/auth/logout')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/v1/auth/forgot-password', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'test@example.com',
        password: 'Test123!@#',
        name: 'Test User',
        role: UserRole.BUYER,
        isVerified: true,
        isActive: true
      });
    });

    it('should send password reset email', async () => {
      const response = await request(testApp)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'test@example.com' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.message).toContain('reset link sent');

      // Verify reset token was generated
      const user = await User.findById(testUser._id);
      expect(user?.passwordResetToken).toBeDefined();
      expect(user?.passwordResetExpires).toBeDefined();
    });

    it('should return success even for non-existent email (security)', async () => {
      const response = await request(testApp)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.message).toContain('reset link sent');
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(testApp)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('Protected Routes', () => {
    let testUser: any;
    let accessToken: string;
    let expiredToken: string;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'test@example.com',
        password: 'Test123!@#',
        name: 'Test User',
        role: UserRole.BUYER,
        isVerified: true,
        isActive: true
      });

      accessToken = jwt.sign(
        {
          userId: testUser._id,
          email: testUser.email,
          role: testUser.role
        },
        process.env.JWT_SECRET!,
        { expiresIn: '15m' }
      );

      expiredToken = jwt.sign(
        {
          userId: testUser._id,
          email: testUser.email,
          role: testUser.role
        },
        process.env.JWT_SECRET!,
        { expiresIn: '-1h' } // Already expired
      );
    });

    it('should access protected route with valid token', async () => {
      const response = await request(testApp)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.email).toBe(testUser.email);
    });

    it('should return 401 for missing token', async () => {
      const response = await request(testApp)
        .get('/api/v1/users/profile')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error.message).toContain('No token provided');
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(testApp)
        .get('/api/v1/users/profile')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error.message).toContain('Invalid token');
    });

    it('should return 401 for expired token', async () => {
      const response = await request(testApp)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error.message).toContain('expired');
    });

    it('should enforce role-based access control', async () => {
      // Try to access admin route as buyer
      const response = await request(testApp)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error.message).toContain('permission');
    });
  });
});