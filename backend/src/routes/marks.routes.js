const router = require('express').Router();
const ctrl = require('../controllers/marks.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

router.get('/student-me', authenticate, authorize('student'), ctrl.getMyMarks);

router.use(authenticate, authorize('teacher'));
router.get('/', ctrl.getAll);
router.post('/', ctrl.create);
router.post('/bulk', ctrl.createBulk);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
