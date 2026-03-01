const router = require('express').Router();
const ctrl   = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.post('/login',            ctrl.login);
router.post('/refresh',          ctrl.refresh);
router.post('/logout',           ctrl.logout);
router.get ('/me',               authenticate, ctrl.me);
router.post('/change-password',  authenticate, ctrl.changePassword);
router.post('/register-student', authenticate, ctrl.registerStudent);

module.exports = router;
