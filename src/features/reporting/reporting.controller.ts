/**
 * Reporting controller — summary for Admin / Institution Staff.
 */
import type { Request, Response } from 'express';
import type { ReportingService } from './reporting.service';

export function createReportingController(reportingService: ReportingService) {
  return {
    async getSummary(_req: Request, res: Response): Promise<void> {
      const summary = await reportingService.getSummary();
      res.json({ summary });
    },
  };
}
