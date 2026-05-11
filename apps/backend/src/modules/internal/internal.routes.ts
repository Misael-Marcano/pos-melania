import { Router } from 'express';
import { InternalController } from './internal.controller';

const router = Router();
const ctrl = new InternalController();

router.post('/cron/trial-reminders', (req, res) => {
  void ctrl.trialReminders(req, res);
});

export default router;
