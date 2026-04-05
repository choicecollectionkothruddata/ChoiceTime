import express from 'express';
import { handleParcelGuruWebhook } from '../controllers/parcelGuruWebhook.controller.js';

const router = express.Router();

/** ParcelGuru docs: POST {{YOUR_URL}}/api/v1/channel/event/hook */
router.post('/event/hook', handleParcelGuruWebhook);

export default router;
