/**
 * Serve the Vite production build from STATIC_FILES_DIR (single-origin deploy).
 */
import fs from 'fs';
import path from 'path';
import type { Express } from 'express';
import express from 'express';
import { config } from './config';

export function attachStaticFrontend(app: Express): void {
  const raw = config.STATIC_FILES_DIR?.trim();
  if (!raw) return;
  const root = path.resolve(raw);
  if (!fs.existsSync(root)) {
    return;
  }
  app.use(express.static(root, { index: false }));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(root, 'index.html'), (err) => {
      if (err) next(err);
    });
  });
}
