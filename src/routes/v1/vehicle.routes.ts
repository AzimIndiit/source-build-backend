import { Router } from 'express';
import { UserRole } from '@models/user/user.model.js';
import { authenticate,authorize } from '@middlewares/auth.middleware.js';
import { validate } from '@middlewares/validation.middleware.js';
import {
  createVehicleSchema,
  updateVehicleSchema,
  getVehiclesQuerySchema,
  vehicleIdParamSchema,
  createLicenseSchema,
} from '@models/vehicle/vehicle.validators.js';
import {
  createOrUpdateVehicle,
  getDriverVehicles,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
  restoreVehicle,
  createOrUpdateLicense,
} from '@controllers/vehicle/vehicle.controller.js';

const router = Router();

// All routes require authentication and driver role
router.use(authenticate);
router.use(authorize(UserRole.DRIVER));

// Vehicle routes with validation
router.post('/vehicles', validate(createVehicleSchema, 'body'), createOrUpdateVehicle);
router.post('/license', validate(createLicenseSchema, 'body'), createOrUpdateLicense);
router.get('/vehicles', validate(getVehiclesQuerySchema, 'query'), getDriverVehicles);
router.get('/vehicles/:id', validate(vehicleIdParamSchema, 'params'), getVehicleById);
router.put('/vehicles/:id', 
  validate(vehicleIdParamSchema, 'params'),
  validate(updateVehicleSchema, 'body'),
  updateVehicle
);
router.delete('/vehicles/:id', validate(vehicleIdParamSchema, 'params'), deleteVehicle);
router.patch('/vehicles/:id/restore', validate(vehicleIdParamSchema, 'params'), restoreVehicle);

export default router;