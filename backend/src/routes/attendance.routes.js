const router = require('express').Router();
const ctrl = require('../controllers/attendance.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

// Student portal
router.get('/student-me', authenticate, authorize('student'), ctrl.getMyAttendance);

// Teacher routes
router.use(authenticate, authorize('teacher'));
router.post('/scan', ctrl.scan);
router.get('/', ctrl.getAll);
router.get('/summary', ctrl.summary);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
