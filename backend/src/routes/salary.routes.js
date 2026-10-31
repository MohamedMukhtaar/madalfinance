import { Router } from 'express';
import salaryController from '../controllers/salary.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import {
  createSalaryChargeValidator,
  generateSalaryChargesValidator,
  paySalaryValidator,
  updateSalaryChargeValidator,
} from '../validators/salary.validator.js';
import { P, manageModule } from '../utils/constants.js';

const router = Router();
router.use(authenticate);
router.use(authorize(P.view('salary')));

const MANAGE = manageModule('salary');

router.get('/charges', salaryController.listCharges);
router.get('/payments', salaryController.listPayments);
router.post(
  '/charges/generate',
  authorize(...MANAGE),
  validate(generateSalaryChargesValidator),
  salaryController.generateCharges
);
router.post('/charges', authorize(...MANAGE), validate(createSalaryChargeValidator), salaryController.createCharge);
router.get('/charges/:id', salaryController.getCharge);
router.post('/charges/:id/pay', authorize(...MANAGE), validate(paySalaryValidator), salaryController.payCharge);
router.delete('/charges/:id', authorize(...MANAGE), salaryController.removeCharge);
router.put('/charges/:id', authorize(...MANAGE), validate(updateSalaryChargeValidator), salaryController.updateCharge);
router.delete('/payments/:id', authorize(...MANAGE), salaryController.removePayment);

export default router;
