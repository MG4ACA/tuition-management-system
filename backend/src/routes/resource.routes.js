const router = require('express').Router();
const ctrl   = require('../controllers/resource.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize }    = require('../middleware/role.middleware');

// Students can view resources
router.get('/', authenticate, ctrl.getAll);

// Teacher manages resources
router.post('/', authenticate, authorize('teacher'), (req, res, next) => {
  ctrl.upload(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    next();
  });
}, ctrl.create);

router.delete('/:id', authenticate, authorize('teacher'), ctrl.remove);

module.exports = router;
