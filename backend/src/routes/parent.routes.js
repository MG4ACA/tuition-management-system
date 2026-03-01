const router = require('express').Router();
const ctrl = require('../controllers/parent.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

// All routes require a logged-in parent
router.use(authenticate, authorize('parent'));

router.get('/child', ctrl.getChild);
router.get('/attendance', ctrl.getAttendance);
router.get('/marks', ctrl.getMarks);
router.get('/fees', ctrl.getFees);

module.exports = router;
