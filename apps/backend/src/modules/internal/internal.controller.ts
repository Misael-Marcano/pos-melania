import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { runTrialReminderJob } from '../../saas/trial-reminders';

export class InternalController {
  /**
   * POST /api/v1/internal/cron/trial-reminders
   * Cabecera: X-Cron-Secret: <CRON_SECRET>
   */
  async trialReminders(_req: Request, res: Response): Promise<void> {
    const secret = process.env.CRON_SECRET?.trim();
    if (!secret) {
      sendError(res, 'CRON_SECRET no está configurado', 503);
      return;
    }
    if (_req.headers['x-cron-secret'] !== secret) {
      sendError(res, 'No autorizado', 401);
      return;
    }
    try {
      const data = await runTrialReminderJob();
      sendSuccess(res, data);
    } catch (e: unknown) {
      sendError(res, e instanceof Error ? e.message : 'Error');
    }
  }
}
