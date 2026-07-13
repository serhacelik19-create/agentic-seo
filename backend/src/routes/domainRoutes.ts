import { Router } from 'express';
import { getDomains, createDomain, deleteDomain, updateDomainWebflowConfig } from '../controllers/domainController';
import { requireApiKey } from '../middleware/auth';

const router = Router();

router.get('/', getDomains);
router.post('/', requireApiKey, createDomain);
router.delete('/:id', requireApiKey, deleteDomain);
router.put('/:id/webflow-config', requireApiKey, updateDomainWebflowConfig);

export default router;
