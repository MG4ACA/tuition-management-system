const router = require('express').Router();
const ctrl = require('../controllers/fees.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

router.get('/student-me', authenticate, authorize('student'), ctrl.getMyFees);

router.use(authenticate, authorize('teacher'));
router.get('/', ctrl.getAll);
router.get('/pending-students', ctrl.getPendingStudents);
router.post('/generate', ctrl.generate);
router.put('/:id', ctrl.update);

module.exports = router;
