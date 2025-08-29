import swaggerJSDoc from 'swagger-jsdoc';
import { Application } from 'express';
import swaggerUi from 'swagger-ui-express';
import config from './index.js';
import path from 'path';
import chalk from 'chalk';

/**
 * Swagger definition object
 */
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Source Build API',
    version: '1.0.0',
    description: 'Enterprise-grade Node.js backend API for Source Build e-commerce marketplace',
    contact: {
      name: 'API Support',
      email: 'support@sourcebuild.com',
      url: 'https://sourcebuild.com/support',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
    termsOfService: 'https://sourcebuild.com/terms',
  },
  servers: [
    {
      url: config.APP.URL || `http://localhost:${config.PORT}`,
      description: config.NODE_ENV === 'production' ? 'Production server' : 'Development server',
    },
    {
      url: 'https://api.sourcebuild.com',
      description: 'Production server',
    },
    {
      url: 'https://staging-api.sourcebuild.com',
      description: 'Staging server',
    },
    {
      url: 'http://localhost:3000',
      description: 'Local development server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token in the format: Bearer <token>',
      },
      apiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key for server-to-server authentication',
      },
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'accessToken',
        description: 'JWT token stored in HTTP-only cookie',
      },
    },
    parameters: {
      pageParam: {
        name: 'page',
        in: 'query',
        description: 'Page number for pagination',
        required: false,
        schema: {
          type: 'integer',
          minimum: 1,
          default: 1,
        },
      },
      limitParam: {
        name: 'limit',
        in: 'query',
        description: 'Number of items per page',
        required: false,
        schema: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          default: 10,
        },
      },
      sortParam: {
        name: 'sort',
        in: 'query',
        description: 'Sort field and order (e.g., createdAt:desc)',
        required: false,
        schema: {
          type: 'string',
          example: 'createdAt:desc',
        },
      },
      searchParam: {
        name: 'search',
        in: 'query',
        description: 'Search query string',
        required: false,
        schema: {
          type: 'string',
        },
      },
    },
    responses: {
      BadRequest: {
        description: 'Bad Request',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'fail' },
                message: { type: 'string', example: 'Bad request' },
                errors: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: { type: 'string' },
                      message: { type: 'string' },
                      value: { type: 'string' },
                    },
                  },
                },
                meta: {
                  type: 'object',
                  properties: {
                    timestamp: { type: 'string', format: 'date-time' },
                    version: { type: 'string', example: 'v1' },
                  },
                },
              },
            },
          },
        },
      },
      Unauthorized: {
        description: 'Unauthorized',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'error' },
                message: { type: 'string', example: 'Unauthorized access' },
                meta: {
                  type: 'object',
                  properties: {
                    timestamp: { type: 'string', format: 'date-time' },
                    version: { type: 'string', example: 'v1' },
                  },
                },
              },
            },
          },
        },
      },
      Forbidden: {
        description: 'Forbidden',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'error' },
                message: { type: 'string', example: 'Access forbidden' },
                meta: {
                  type: 'object',
                  properties: {
                    timestamp: { type: 'string', format: 'date-time' },
                    version: { type: 'string', example: 'v1' },
                  },
                },
              },
            },
          },
        },
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'fail' },
                message: { type: 'string', example: 'Resource not found' },
                meta: {
                  type: 'object',
                  properties: {
                    timestamp: { type: 'string', format: 'date-time' },
                    version: { type: 'string', example: 'v1' },
                  },
                },
              },
            },
          },
        },
      },
      UnprocessableEntity: {
        description: 'Validation Error',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'fail' },
                message: { type: 'string', example: 'Validation failed' },
                errors: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: { type: 'string' },
                      message: { type: 'string' },
                      value: { type: 'string' },
                    },
                  },
                },
                meta: {
                  type: 'object',
                  properties: {
                    timestamp: { type: 'string', format: 'date-time' },
                    version: { type: 'string', example: 'v1' },
                  },
                },
              },
            },
          },
        },
      },
      TooManyRequests: {
        description: 'Rate limit exceeded',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'error' },
                message: { type: 'string', example: 'Too many requests' },
                meta: {
                  type: 'object',
                  properties: {
                    timestamp: { type: 'string', format: 'date-time' },
                    version: { type: 'string', example: 'v1' },
                  },
                },
              },
            },
          },
        },
      },
      InternalServerError: {
        description: 'Internal Server Error',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'error' },
                message: { type: 'string', example: 'Internal server error' },
                meta: {
                  type: 'object',
                  properties: {
                    timestamp: { type: 'string', format: 'date-time' },
                    version: { type: 'string', example: 'v1' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and authorization endpoints',
    },
    {
      name: 'User Profile',
      description: 'User profile management endpoints',
    },
    {
      name: 'Social Login',
      description: 'Social media authentication endpoints',
    },
    {
      name: 'Admin',
      description: 'Administrative endpoints (Admin only)',
    },
    {
      name: 'Health',
      description: 'Health check and system status endpoints',
    },
  ],
  externalDocs: {
    description: 'Find more info here',
    url: 'https://docs.sourcebuild.com',
  },
};

/**
 * Swagger options
 */
const swaggerOptions: swaggerJSDoc.Options = {
  definition: swaggerDefinition,
  apis: [
    // Path to the API routes files
    path.join(process.cwd(), 'src/routes/**/*.ts'),
    path.join(process.cwd(), 'src/routes/**/*.js'),
    // Path to the model files for schema definitions
    path.join(process.cwd(), 'src/models/**/*.ts'),
    path.join(process.cwd(), 'src/models/**/*.js'),
    // Path to controller files
    path.join(process.cwd(), 'src/controllers/**/*.ts'),
    path.join(process.cwd(), 'src/controllers/**/*.js'),
  ],
};

/**
 * Generate Swagger specification
 */
const swaggerSpec = swaggerJSDoc(swaggerOptions);

/**
 * Swagger UI options
 */
const swaggerUiOptions = {
  customCss: `
    .topbar { display: none; }
    .swagger-ui .topbar { display: none; }
    .swagger-ui { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .swagger-ui .info { margin: 20px 0; }
    .swagger-ui .info .title { color: #3b82f6; }
    .swagger-ui .scheme-container { 
      background: #f8fafc; 
      border: 1px solid #e2e8f0; 
    }
  `,
  customSiteTitle: 'Source Build API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    docExpansion: 'list',
    filter: true,
    showRequestDuration: true,
    tryItOutEnabled: true,
    requestSnippetsEnabled: true,
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
    displayOperationId: false,
    displayRequestDuration: true,
    deepLinking: true,
    persistAuthorization: true,
    layout: 'BaseLayout',
    supportedSubmitMethods: ['get', 'put', 'post', 'delete', 'options', 'head', 'patch'],
  },
};

/**
 * Setup Swagger documentation
 */
export const setupSwagger = (app: Application): void => {
  // Serve Swagger API documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

  // Serve raw swagger.json
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Redirect /docs to /api-docs
  app.get('/docs', (req, res) => {
    res.redirect('/api-docs');
  });

  console.log(`  ${chalk.magenta('📚 Swagger Documentation:')}`);
  console.log(`     ${chalk.gray('├─')} ${chalk.white('Interactive:')} ${chalk.underline.blue(`http://localhost:${config.PORT}/api-docs`)}`);
  console.log(`     ${chalk.gray('└─')} ${chalk.white('JSON Spec:')} ${chalk.underline.blue(`http://localhost:${config.PORT}/api-docs.json`)}\n`);
};

/**
 * Generate swagger.json file for external tools
 */
export const generateSwaggerFile = (): string => {
  return JSON.stringify(swaggerSpec, null, 2);
};

/**
 * Validate Swagger specification
 */
export const validateSwaggerSpec = (): boolean => {
  try {
    if (!swaggerSpec.info || !swaggerSpec.info.title) {
      throw new Error('Missing required swagger info.title');
    }
    
    if (!swaggerSpec.paths || Object.keys(swaggerSpec.paths).length === 0) {
      console.warn('⚠️  Warning: No API paths found in swagger spec');
    }
    
    console.log('✅ Swagger specification is valid');
    return true;
  } catch (error) {
    console.error('❌ Swagger specification validation failed:', error);
    return false;
  }
};

/**
 * Get swagger specification object
 */
export const getSwaggerSpec = () => swaggerSpec;

/**
 * Custom middleware to add swagger-related headers
 */
export const swaggerHeaders = (req: any, res: any, next: any) => {
  // Add CORS headers for swagger UI
  if (req.path.startsWith('/api-docs')) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  }
  next();
};

/**
 * Development helper to log available endpoints
 */
export const logEndpoints = (app: Application): void => {
  if (config.NODE_ENV === 'development') {
    console.log('\n🛣️  Available API endpoints:');
    console.log('================================');
    
    // Extract routes from swagger spec
    if (swaggerSpec.paths) {
      Object.keys(swaggerSpec.paths).forEach(path => {
        const methods = Object.keys(swaggerSpec.paths[path]);
        methods.forEach(method => {
          const operation = swaggerSpec.paths[path][method];
          const tags = operation.tags ? `[${operation.tags.join(', ')}]` : '';
          console.log(`   ${method.toUpperCase().padEnd(6)} ${path.padEnd(30)} ${tags}`);
        });
      });
    }
    console.log('================================\n');
  }
};

export default {
  setupSwagger,
  generateSwaggerFile,
  validateSwaggerSpec,
  getSwaggerSpec,
  swaggerHeaders,
  logEndpoints,
  swaggerSpec,
  swaggerOptions,
  swaggerUiOptions,
};