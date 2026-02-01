import express from 'express';
import {
  startSession,
  simulateMarket,
  marketEvent,
  demoStream,
  getSessionStatus,
} from '../controllers/session.demo.controller.js';

const router = express.Router();

router.post('/start', startSession);
router.post('/simulate', simulateMarket);
router.post('/market-event', marketEvent);
router.get('/stream', demoStream);
router.get('/status/:sessionId', getSessionStatus);

export default router;
