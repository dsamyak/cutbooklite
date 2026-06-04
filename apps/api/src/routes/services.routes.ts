import { Router } from 'express';
import { logService, getServices, updateService, deleteService } from '../controllers/services.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', logService);
router.get('/', getServices);
router.patch('/:id', updateService);
router.delete('/:id', deleteService);

export default router;
