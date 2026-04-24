const express = require('express');
const tenantResolver = require('../middleware/tenant.middleware');
const protect = require('../middleware/protect.middleware');
const authorize = require('../middleware/authorize.middleware');
const {
  listCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categories.controller');

const categoryRouter = express.Router();

categoryRouter.use(tenantResolver({ required: true }));
categoryRouter.use(protect);

categoryRouter.get('/', listCategories);
categoryRouter.get('/:id', getCategoryById);
categoryRouter.post('/', authorize('admin', 'superadmin', 'manager'), createCategory);
categoryRouter.put('/:id', authorize('admin', 'superadmin', 'manager'), updateCategory);
categoryRouter.delete('/:id', authorize('admin', 'superadmin', 'manager'), deleteCategory);

module.exports = categoryRouter;
