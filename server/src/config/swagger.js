import swaggerJsDoc from 'swagger-jsdoc';

const port = process.env.PORT || 5000;

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Blood Donation Management System API',
      version: '1.0.0',
      description:
        'Production-grade RESTful API documentation for the LifeDrop Blood Donation & Transfusion Network. Complete coverage of User authentication, Donor eligibility & profiles, Geospatial search, Finite-state blood requisitions, Real-time emergency donor matching via Socket.io, Slot appointments, Multi-bank inventory management with cold-chain audit, Administrator governance, and Analytical reporting.',
      contact: {
        name: 'LifeDrop Transfusion Support',
        email: 'support@blooddonation.org',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: `http://localhost:${port}`,
        description: 'Local Development Server',
      },
      {
        url: 'http://localhost:5000',
        description: 'Default API Gateway',
      },
    ],
    tags: [
      { name: 'Authentication', description: 'User registration, OTP verification, JWT login, and session refresh' },
      { name: 'User Profile', description: 'Personal identity, address, geolocation, and notification preferences' },
      { name: 'Donor Management', description: 'Eligibility calculator, availability toggle, and historical donation records' },
      { name: 'Search & Discovery', description: 'Radius-based geospatial queries for compatible donors and verified blood banks' },
      { name: 'Blood Requests', description: 'Requisition lifecycle following strict 5-stage finite-state machine' },
      { name: 'Emergency Matching', description: 'Automated geospatial dispatch, donor matching, and escalation engine' },
      { name: 'Appointments', description: 'Slot booking, capacity verification, rescheduling, and atomic completion' },
      { name: 'Blood Inventory', description: 'Multi-bank stock reserves, safety buffers, and audit-logged overrides' },
      { name: 'Hospital Operations', description: 'Hospital requisitions, license verification, and blood receipt confirmation' },
      { name: 'Blood Bank Operations', description: 'Stock ledger, incoming voluntary donation screening, and unit issuance' },
      { name: 'Notifications', description: 'Multi-channel (in-app, email, SMS, socket) alerting engine' },
      { name: 'Feedback & Complaints', description: 'Grievance ticket submission, assignment, and resolution tracking' },
      { name: 'Admin Suite', description: 'Entity approvals, verification, blocking, inventory overrides, and broadcasts' },
      { name: 'Reports & Analytics', description: 'MongoDB aggregation pipelines and streaming PDF/Excel exports' },
      { name: 'Audit Logs', description: 'Immutable security event ledger recording all platform mutations' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your valid JWT access token in the format: Bearer <token>',
        },
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Alias for BearerAuth: Bearer <token>',
        },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Detailed error explanation' },
            errors: {
              type: 'array',
              items: { type: 'object' },
            },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operation completed successfully' },
            data: { type: 'object' },
          },
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    './src/routes/*.js',
    './src/routes/**/*.js',
    './src/modules/**/*.routes.js',
  ],
};

export const swaggerSpec = swaggerJsDoc(options);
export default swaggerSpec;
