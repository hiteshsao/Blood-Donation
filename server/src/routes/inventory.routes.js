import express from 'express';
import { body } from 'express-validator';
import { authenticate, optionalAuthenticate } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validate.js';
import { auditMiddleware } from '../middlewares/auditLog.middleware.js';
import {
  getInventoryByBank,
  updateStock,
  getStockLogs,
  getLowStockAlerts,
} from '../controllers/inventory.controller.js';

const router = express.Router();

/**
 * @swagger
 * /api/inventory/low-stock-check:
 *   get:
 *     summary: Check for critical low-stock blood groups across facilities
 *     tags: [Inventory]
 */
router.get('/low-stock-check', authenticate, getLowStockAlerts);

/**
 * @swagger
 * /api/inventory/logs/{bloodBankId}:
 *   get:
 *     summary: Retrieve immutable stock change audit logs
 *     tags: [Inventory]
 */
router.get('/logs/:bloodBankId', authenticate, getStockLogs);

/**
 * @swagger
 * /api/inventory/{bloodBankId}:
 *   get:
 *     summary: Retrieve blood inventory grid for a facility
 *     tags: [Inventory]
 */
router.get('/:bloodBankId', optionalAuthenticate, getInventoryByBank);

/**
 * @swagger
 * /api/inventory/update:
 *   post:
 *     summary: Perform an atomic inventory adjustment (ADD, ISSUE, EXPIRE, ADJUST)
 *     tags: [Inventory]
 */
router.post(
  '/update',
  authenticate,
  auditMiddleware({ action: 'INVENTORY_UPDATE', entity: 'BloodInventory' }),
  [
    body('bloodBankId').notEmpty().withMessage('Blood bank ID is required'),
    body('bloodGroup')
      .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
      .withMessage('Valid blood group is required'),
    body('changeType')
      .isIn(['ADD', 'ISSUE', 'EXPIRE', 'ADJUST'])
      .withMessage('changeType must be ADD, ISSUE, EXPIRE, or ADJUST'),
    body('units')
      .isFloat({ min: 0.1 })
      .withMessage('Units must be greater than zero'),
    validateRequest,
  ],
  updateStock
);

export default router;
