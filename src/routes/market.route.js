import express from 'express';

import { marketEvent } from '../controllers/session.demo.controller.js';
import { TRADING_PAIRS, TIMEFRAMES, SCENARIOS } from '../utils/market.constants.js';

const router = express.Router();

router.post('/event', marketEvent);

router.get('/config', (req, res) => {
  res.json({
    tradingPairs: Object.keys(TRADING_PAIRS),
    timeframes: Object.keys(TIMEFRAMES),
    scenarios: Object.values(SCENARIOS),
  });
});

export default router;
