import express from 'express';
import { getProducts, getProductById } from '../controllers/productController.js';
import { getHomeTopSelling } from '../controllers/homeTopSelling.controller.js';

const router = express.Router();

router.get('/home-top-selling', getHomeTopSelling);
router.get('/', getProducts);
router.get('/:id', getProductById);

export default router;
