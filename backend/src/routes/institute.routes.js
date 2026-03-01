const router = require('express').Router();
const ctrl = require('../controllers/institute.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

router.use(authenticate, authorize('teacher'));

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getOne);
router.get('/:id/summary', ctrl.summary);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
