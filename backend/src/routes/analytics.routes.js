const router = require('express').Router();
const ctrl   = require('../controllers/analytics.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize }    = require('../middleware/role.middleware');

router.use(authenticate, authorize('teacher'));

router.get('/overview',          ctrl.overview);
router.get('/revenue',           ctrl.revenueChart);
router.get('/attendance-trend',  ctrl.attendanceTrend);
router.get('/student-growth',    ctrl.studentGrowth);
router.get('/fee-status',        ctrl.feeStatusBreakdown);

module.exports = router;
