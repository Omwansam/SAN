const express = require('express');
const tenantResolver = require('../middleware/tenant.middleware');
const protect = require('../middleware/protect.middleware');
const authorize = require('../middleware/authorize.middleware');
const {
  getProducts,
  getProductByBarcode,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/products.controller');

const productRouter = express.Router();

productRouter.use(tenantResolver({ required: true }));
productRouter.use(protect);

productRouter.get('/', getProducts);
productRouter.get('/barcode/:barcode', getProductByBarcode);
productRouter.get('/:id', getProductById);
productRouter.post('/', authorize('admin', 'superadmin', 'manager'), createProduct);
productRouter.put('/:id', authorize('admin', 'superadmin', 'manager'), updateProduct);
productRouter.delete('/:id', authorize('admin', 'superadmin', 'manager'), deleteProduct);

module.exports = productRouter;
