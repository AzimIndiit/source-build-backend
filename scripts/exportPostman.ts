#!/usr/bin/env tsx
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import swaggerJsdoc from 'swagger-jsdoc'
import swaggerConfig from '../src/config/swagger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface SwaggerPath {
  [method: string]: {
    tags?: string[]
    summary?: string
    description?: string
    operationId?: string
    security?: Array<Record<string, string[]>>
    parameters?: Array<{
      in: string
      name: string
      required?: boolean
      schema?: any
      description?: string
    }>
    requestBody?: {
      required?: boolean
      content?: {
        [contentType: string]: {
          schema?: any
          examples?: any
        }
      }
    }
    responses?: {
      [statusCode: string]: {
        description?: string
        content?: {
          [contentType: string]: {
            schema?: any
            examples?: any
          }
        }
      }
    }
  }
}

interface PostmanItem {
  name: string
  request: {
    method: string
    header: Array<{
      key: string
      value: string
      type?: string
    }>
    body?: {
      mode: string
      raw?: string
      urlencoded?: Array<{
        key: string
        value: string
        type?: string
      }>
      formdata?: Array<{
        key: string
        value: string
        type?: string
      }>
    }
    url: {
      raw: string
      protocol: string
      host: string[]
      port: string
      path: string[]
      query?: Array<{
        key: string
        value: string
      }>
    }
    description?: string
  }
  response: any[]
}

interface PostmanCollection {
  info: {
    name: string
    description: string
    schema: string
    _postman_id?: string
  }
  item: Array<{
    name: string
    item?: PostmanItem[]
    description?: string
  }>
  auth?: {
    type: string
    bearer?: Array<{
      key: string
      value: string
      type: string
    }>
  }
  event?: Array<{
    listen: string
    script: {
      exec: string[]
      type: string
    }
  }>
  variable?: Array<{
    key: string
    value: string
    type: string
  }>
}

class SwaggerToPostmanConverter {
  private swagger: any
  private baseUrl: string
  private collection: PostmanCollection

  constructor(swagger: any) {
    this.swagger = swagger
    this.baseUrl = this.extractBaseUrl()
    this.collection = this.initializeCollection()
  }

  private extractBaseUrl(): string {
    if (this.swagger.servers && this.swagger.servers.length > 0) {
      return this.swagger.servers[0].url
    }
    return 'http://localhost:8000/api/v1'
  }

  private initializeCollection(): PostmanCollection {
    return {
      info: {
        name: this.swagger.info?.title || 'Source Build API',
        description: this.swagger.info?.description || '',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      item: [],
      auth: {
        type: 'bearer',
        bearer: [
          {
            key: 'token',
            value: '{{access_token}}',
            type: 'string',
          },
        ],
      },
      event: [
        {
          listen: 'prerequest',
          script: {
            exec: [
              '// Auto-refresh token if expired',
              'const accessToken = pm.environment.get("access_token");',
              'const refreshToken = pm.environment.get("refresh_token");',
              '',
              'if (refreshToken && !accessToken) {',
              '    const refreshRequest = {',
              '        url: pm.environment.get("base_url") + "/auth/refresh",',
              '        method: "POST",',
              '        header: {',
              '            "Content-Type": "application/json"',
              '        },',
              '        body: {',
              '            mode: "raw",',
              '            raw: JSON.stringify({ refreshToken: refreshToken })',
              '        }',
              '    };',
              '',
              '    pm.sendRequest(refreshRequest, (err, response) => {',
              '        if (!err && response.code === 200) {',
              '            const jsonData = response.json();',
              '            pm.environment.set("access_token", jsonData.data.accessToken);',
              '            pm.environment.set("refresh_token", jsonData.data.refreshToken);',
              '        }',
              '    });',
              '}',
            ],
            type: 'text/javascript',
          },
        },
        {
          listen: 'test',
          script: {
            exec: [
              '// Save tokens from login/register responses',
              'if (pm.response.code === 200 || pm.response.code === 201) {',
              '    const jsonData = pm.response.json();',
              '    ',
              '    if (jsonData.data && jsonData.data.tokens) {',
              '        pm.environment.set("access_token", jsonData.data.tokens.accessToken);',
              '        pm.environment.set("refresh_token", jsonData.data.tokens.refreshToken);',
              '        pm.environment.set("user_id", jsonData.data.user.id);',
              '    }',
              '}',
              '',
              '// Log response time',
              'pm.test("Response time is less than 500ms", function () {',
              '    pm.expect(pm.response.responseTime).to.be.below(500);',
              '});',
            ],
            type: 'text/javascript',
          },
        },
      ],
      variable: [
        {
          key: 'base_url',
          value: this.baseUrl,
          type: 'string',
        },
        {
          key: 'access_token',
          value: '',
          type: 'string',
        },
        {
          key: 'refresh_token',
          value: '',
          type: 'string',
        },
        {
          key: 'user_id',
          value: '',
          type: 'string',
        },
      ],
    }
  }

  convert(): PostmanCollection {
    const paths = this.swagger.paths as Record<string, SwaggerPath>
    const folders: Map<string, PostmanItem[]> = new Map()

    // Group endpoints by tags
    for (const [pathName, pathData] of Object.entries(paths)) {
      for (const [method, operation] of Object.entries(pathData)) {
        if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
          const tags = operation.tags || ['default']
          const tag = tags[0]

          if (!folders.has(tag)) {
            folders.set(tag, [])
          }

          const item = this.createPostmanItem(pathName, method, operation)
          folders.get(tag)?.push(item)
        }
      }
    }

    // Create folder structure
    for (const [folderName, items] of folders.entries()) {
      this.collection.item.push({
        name: this.capitalizeFirst(folderName),
        item: items,
        description: `${folderName} endpoints`,
      })
    }

    // Add example requests folder
    this.addExampleRequests()

    return this.collection
  }

  private createPostmanItem(path: string, method: string, operation: any): PostmanItem {
    const url = this.parseUrl(path, operation.parameters)
    const headers = this.createHeaders(operation)
    const body = this.createBody(operation)

    return {
      name: operation.summary || operation.operationId || `${method.toUpperCase()} ${path}`,
      request: {
        method: method.toUpperCase(),
        header: headers,
        ...(body && { body }),
        url,
        description: operation.description || '',
      },
      response: this.createExampleResponses(operation),
    }
  }

  private parseUrl(path: string, parameters?: any[]): any {
    const pathSegments = path.split('/').filter((seg) => seg)
    const processedSegments = pathSegments.map((seg) => {
      if (seg.startsWith('{') && seg.endsWith('}')) {
        return `:${seg.slice(1, -1)}`
      }
      return seg
    })

    const queryParams = parameters
      ?.filter((param) => param.in === 'query')
      .map((param) => ({
        key: param.name,
        value: `{{${param.name}}}`,
        description: param.description,
      }))

    const urlParts = this.baseUrl.replace(/^https?:\/\//, '').split('/')
    const host = urlParts[0].split(':')

    return {
      raw: `{{base_url}}/${processedSegments.join('/')}`,
      protocol: this.baseUrl.startsWith('https') ? 'https' : 'http',
      host: [host[0]],
      port: host[1] || (this.baseUrl.startsWith('https') ? '443' : '80'),
      path: processedSegments,
      ...(queryParams && queryParams.length > 0 && { query: queryParams }),
    }
  }

  private createHeaders(operation: any): any[] {
    const headers = [
      {
        key: 'Content-Type',
        value: 'application/json',
        type: 'text',
      },
    ]

    // Add auth header if needed
    if (operation.security && operation.security.length > 0) {
      headers.push({
        key: 'Authorization',
        value: 'Bearer {{access_token}}',
        type: 'text',
      })
    }

    return headers
  }

  private createBody(operation: any): any {
    if (!operation.requestBody) return null

    const content = operation.requestBody.content
    if (content['application/json']) {
      const schema = content['application/json'].schema
      const example = content['application/json'].example || this.generateExample(schema)

      return {
        mode: 'raw',
        raw: JSON.stringify(example, null, 2),
      }
    } else if (content['multipart/form-data']) {
      const schema = content['multipart/form-data'].schema
      const properties = schema?.properties || {}

      return {
        mode: 'formdata',
        formdata: Object.entries(properties).map(([key, value]: [string, any]) => ({
          key,
          value: value.example || '',
          type: value.type === 'file' ? 'file' : 'text',
        })),
      }
    }

    return null
  }

  private generateExample(schema: any): any {
    if (!schema) return {}

    if (schema.$ref) {
      const refName = schema.$ref.split('/').pop()
      const component = this.swagger.components?.schemas?.[refName]
      return this.generateExample(component)
    }

    if (schema.type === 'object' && schema.properties) {
      const example: any = {}
      for (const [key, value] of Object.entries(schema.properties)) {
        example[key] = this.generateFieldExample(value as any)
      }
      return example
    }

    if (schema.type === 'array' && schema.items) {
      return [this.generateExample(schema.items)]
    }

    return this.generateFieldExample(schema)
  }

  private generateFieldExample(field: any): any {
    if (field.example !== undefined) return field.example
    if (field.default !== undefined) return field.default

    switch (field.type) {
      case 'string':
        if (field.format === 'email') return 'user@example.com'
        if (field.format === 'password') return 'Password123!'
        if (field.format === 'date-time') return new Date().toISOString()
        if (field.format === 'uuid') return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
        if (field.enum) return field.enum[0]
        return 'string'
      case 'number':
      case 'integer':
        return field.minimum || 0
      case 'boolean':
        return false
      case 'array':
        return []
      case 'object':
        return {}
      default:
        return null
    }
  }

  private createExampleResponses(operation: any): any[] {
    const responses: any[] = []

    if (operation.responses) {
      for (const [statusCode, response] of Object.entries(operation.responses)) {
        const content = (response as any).content?.['application/json']
        if (content) {
          responses.push({
            name: `${statusCode} Response`,
            originalRequest: {
              method: operation.method?.toUpperCase(),
              header: [],
              url: {
                raw: '{{base_url}}/endpoint',
              },
            },
            status: (response as any).description,
            code: parseInt(statusCode),
            _postman_previewlanguage: 'json',
            header: [
              {
                key: 'Content-Type',
                value: 'application/json',
              },
            ],
            body: JSON.stringify(
              content.example || this.generateExample(content.schema),
              null,
              2
            ),
          })
        }
      }
    }

    return responses
  }

  private addExampleRequests(): void {
    const exampleRequests: PostmanItem[] = [
      {
        name: 'Health Check',
        request: {
          method: 'GET',
          header: [],
          url: {
            raw: '{{base_url}}/health',
            protocol: 'http',
            host: ['localhost'],
            port: '8000',
            path: ['api', 'v1', 'health'],
          },
          description: 'Check if the API is running',
        },
        response: [],
      },
      {
        name: 'Register User',
        request: {
          method: 'POST',
          header: [
            {
              key: 'Content-Type',
              value: 'application/json',
            },
          ],
          body: {
            mode: 'raw',
            raw: JSON.stringify(
              {
                email: 'test@example.com',
                password: 'Password123!',
                firstName: 'John',
                lastName: 'Doe',
                phone: '+1234567890',
                role: 'buyer',
              },
              null,
              2
            ),
          },
          url: {
            raw: '{{base_url}}/auth/register',
            protocol: 'http',
            host: ['localhost'],
            port: '8000',
            path: ['api', 'v1', 'auth', 'register'],
          },
          description: 'Register a new user account',
        },
        response: [],
      },
      {
        name: 'Login',
        request: {
          method: 'POST',
          header: [
            {
              key: 'Content-Type',
              value: 'application/json',
            },
          ],
          body: {
            mode: 'raw',
            raw: JSON.stringify(
              {
                email: 'test@example.com',
                password: 'Password123!',
              },
              null,
              2
            ),
          },
          url: {
            raw: '{{base_url}}/auth/login',
            protocol: 'http',
            host: ['localhost'],
            port: '8000',
            path: ['api', 'v1', 'auth', 'login'],
          },
          description: 'Login with email and password',
        },
        response: [],
      },
    ]

    this.collection.item.unshift({
      name: 'Quick Start',
      item: exampleRequests,
      description: 'Example requests to get started quickly',
    })
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }
}

async function generatePostmanCollection(): Promise<void> {
  try {
    console.log('🚀 Generating Swagger specification...')
    const swaggerSpec = swaggerJsdoc(swaggerConfig.swaggerOptions)

    console.log('🔄 Converting to Postman Collection...')
    const converter = new SwaggerToPostmanConverter(swaggerSpec)
    const postmanCollection = converter.convert()

    // Save to file
    const outputPath = path.join(__dirname, '..', 'src', 'docs', 'postman', 'collection.json')
    await fs.mkdir(path.dirname(outputPath), { recursive: true })
    await fs.writeFile(outputPath, JSON.stringify(postmanCollection, null, 2))

    console.log(`✅ Postman collection exported to: ${outputPath}`)

    // Also create environment file
    const environment = {
      id: 'source-build-env',
      name: 'Source Build Environment',
      values: [
        {
          key: 'base_url',
          value: 'http://localhost:8000/api/v1',
          enabled: true,
        },
        {
          key: 'access_token',
          value: '',
          enabled: true,
        },
        {
          key: 'refresh_token',
          value: '',
          enabled: true,
        },
        {
          key: 'user_id',
          value: '',
          enabled: true,
        },
        {
          key: 'product_id',
          value: '',
          enabled: true,
        },
        {
          key: 'order_id',
          value: '',
          enabled: true,
        },
      ],
    }

    const envPath = path.join(__dirname, '..', 'src', 'docs', 'postman', 'environment.json')
    await fs.writeFile(envPath, JSON.stringify(environment, null, 2))

    console.log(`✅ Postman environment exported to: ${envPath}`)
    console.log('\n📝 Import both files into Postman to get started!')
  } catch (error) {
    console.error('❌ Error generating Postman collection:', error)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generatePostmanCollection()
}

export { SwaggerToPostmanConverter, generatePostmanCollection }