import request, { SuperTest, Test } from 'supertest';
import { Application } from 'express';

export class RequestTestHelper {
  private app: Application;
  private agent: SuperTest<Test>;

  constructor(app: Application) {
    this.app = app;
    this.agent = request.agent(app);
  }

  /**
   * Make authenticated request
   */
  async authenticatedRequest(
    method: 'get' | 'post' | 'put' | 'delete' | 'patch',
    url: string,
    token: string,
    data?: any
  ) {
    const req = this.agent[method](url)
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json');

    if (data) {
      req.send(data);
    }

    return req;
  }

  /**
   * Make request with cookies
   */
  async requestWithCookies(
    method: 'get' | 'post' | 'put' | 'delete' | 'patch',
    url: string,
    cookies: { [key: string]: string },
    data?: any
  ) {
    const cookieString = Object.entries(cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');

    const req = this.agent[method](url)
      .set('Cookie', cookieString)
      .set('Content-Type', 'application/json');

    if (data) {
      req.send(data);
    }

    return req;
  }

  /**
   * Upload file with authentication
   */
  async uploadFile(
    url: string,
    token: string,
    fieldName: string,
    filePath: string,
    additionalFields?: { [key: string]: any }
  ) {
    const req = this.agent
      .post(url)
      .set('Authorization', `Bearer ${token}`)
      .attach(fieldName, filePath);

    if (additionalFields) {
      Object.entries(additionalFields).forEach(([key, value]) => {
        req.field(key, value);
      });
    }

    return req;
  }

  /**
   * Make paginated request
   */
  async paginatedRequest(
    url: string,
    params: {
      page?: number;
      limit?: number;
      sort?: string;
      order?: 'asc' | 'desc';
      [key: string]: any;
    },
    token?: string
  ) {
    const req = this.agent.get(url).query(params);

    if (token) {
      req.set('Authorization', `Bearer ${token}`);
    }

    return req;
  }

  /**
   * Make batch requests
   */
  async batchRequests(
    requests: Array<{
      method: 'get' | 'post' | 'put' | 'delete' | 'patch';
      url: string;
      data?: any;
      token?: string;
    }>
  ) {
    return Promise.all(
      requests.map(({ method, url, data, token }) => {
        const req = this.agent[method](url)
          .set('Content-Type', 'application/json');

        if (token) {
          req.set('Authorization', `Bearer ${token}`);
        }

        if (data) {
          req.send(data);
        }

        return req;
      })
    );
  }

  /**
   * Test rate limiting
   */
  async testRateLimit(
    url: string,
    method: 'get' | 'post' = 'get',
    attempts: number = 20,
    token?: string
  ): Promise<{ successful: number; rateLimited: number }> {
    let successful = 0;
    let rateLimited = 0;

    for (let i = 0; i < attempts; i++) {
      const req = this.agent[method](url);

      if (token) {
        req.set('Authorization', `Bearer ${token}`);
      }

      const response = await req;

      if (response.status === 429) {
        rateLimited++;
      } else if (response.status < 400) {
        successful++;
      }
    }

    return { successful, rateLimited };
  }

  /**
   * Make WebSocket connection
   */
  createWebSocketConnection(namespace: string = '/', token?: string) {
    // This would typically use socket.io-client for testing
    // Placeholder for WebSocket testing setup
    return {
      connect: () => {
        // Connect logic
      },
      disconnect: () => {
        // Disconnect logic
      },
      emit: (event: string, data: any) => {
        // Emit logic
      },
      on: (event: string, callback: Function) => {
        // Listen logic
      }
    };
  }

  /**
   * Test response time
   */
  async measureResponseTime(
    url: string,
    method: 'get' | 'post' = 'get',
    iterations: number = 10
  ): Promise<{ avg: number; min: number; max: number }> {
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await this.agent[method](url);
      const end = Date.now();
      times.push(end - start);
    }

    return {
      avg: times.reduce((a, b) => a + b, 0) / times.length,
      min: Math.min(...times),
      max: Math.max(...times)
    };
  }

  /**
   * Extract cookies from response
   */
  static extractCookies(response: any): { [key: string]: string } {
    const cookies: { [key: string]: string } = {};
    const setCookieHeaders = response.headers['set-cookie'] || [];

    setCookieHeaders.forEach((cookie: string) => {
      const [nameValue] = cookie.split(';');
      const [name, value] = nameValue.split('=');
      cookies[name] = value;
    });

    return cookies;
  }

  /**
   * Assert API response structure
   */
  static assertApiResponse(
    response: any,
    expectedStatus: number,
    expectSuccess: boolean = true
  ) {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('success', expectSuccess);

    if (expectSuccess) {
      expect(response.body).toHaveProperty('data');
    } else {
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('statusCode');
    }
  }

  /**
   * Assert pagination response
   */
  static assertPaginationResponse(response: any) {
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('pagination');
    expect(response.body.pagination).toHaveProperty('page');
    expect(response.body.pagination).toHaveProperty('pageSize');
    expect(response.body.pagination).toHaveProperty('totalPages');
    expect(response.body.pagination).toHaveProperty('totalItems');
    expect(response.body.pagination).toHaveProperty('hasNext');
    expect(response.body.pagination).toHaveProperty('hasPrev');
  }
}