import { Router } from 'express';
import rentalController from '../controllers/rental.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { createRentalValidator, updateRentalValidator, setRentalStatusValidator } from '../validators/rental.validator.js';
import { APP_ACCESS, MANAGE_ROLES } from '../utils/constants.js';

const router = Router();
router.use(authenticate);
router.use(authorize(...APP_ACCESS));

const MANAGE = MANAGE_ROLES;

router.get('/', rentalController.list);
router.post('/charge-all', authorize(...MANAGE), rentalController.chargeAll);
router.get('/:id', rentalController.getById);
router.post('/', authorize(...MANAGE), validate(createRentalValidator), rentalController.create);
router.put('/:id', authorize(...MANAGE), validate(updateRentalValidator), rentalController.update);
router.patch('/:id/status', authorize(...MANAGE), validate(setRentalStatusValidator), rentalController.setStatus);
router.post('/:id/generate-invoice', authorize(...MANAGE), rentalController.generateInvoice);

export default router;
