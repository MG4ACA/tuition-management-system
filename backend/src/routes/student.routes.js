const router  = require('express').Router();
const ctrl    = require('../controllers/student.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize }    = require('../middleware/role.middleware');

// Students own portal routes
router.get('/me',      authenticate, authorize('student'), ctrl.getMyProfile);

// QR lookup (authenticated teacher or student)
router.get('/by-qr/:token', authenticate, ctrl.getByQR);

// Teacher-only CRUD
router.use(authenticate, authorize('teacher'));
router.get ('/',                              ctrl.getAll);
router.get ('/:id',                           ctrl.getOne);
router.post('/',                              ctrl.create);
router.put ('/:id',                           ctrl.update);
router.delete('/:id',                         ctrl.remove);
router.post('/:id/enroll',                    ctrl.enrollBatch);
router.delete('/:id/enroll/:batch_id',        ctrl.unenrollBatch);

module.exports = router;
