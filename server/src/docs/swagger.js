import swaggerJsDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { env } from '../config/env.js';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Blood Donation Management System API',
      version: '1.0.0',
      description:
        'Robust RESTful API documentation for the Blood Donation Management System. Covers Auth, User Profiles, Donors, Search, Blood Requests, Emergency Requests, Appointments, Inventory, Notifications, Feedback, Admin operations, and Audit Logs.',
      contact: {
        name: 'Blood Donation System Support',
        email: 'support@blooddonation.org',
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}`,
        description: 'Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Provide a valid JWT token in format: Bearer <token>',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    './src/routes/*.js',
    './src/modules/**/*.routes.js',
    './src/modules/**/*.js',
    './src/docs/*.js',
  ],
};

export const swaggerSpec = swaggerJsDoc(swaggerOptions);

export const setupSwagger = (app) => {
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Blood Donation API Docs',
    })
  );

  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
};
