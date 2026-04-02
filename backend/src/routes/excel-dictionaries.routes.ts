import express from 'express';
import multer from 'multer';
import {
  buildUnifiedExcelExportBuffer,
  buildUnifiedExcelTemplateBuffer,
  importUnifiedExcelFromBuffer,
  type ExcelDictionariesImportReport,
} from '../lib/excel-dictionaries/excel-dictionaries.service.js';

export const excelDictionariesRouter = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
  },
});

excelDictionariesRouter.get('/template', async (_req, res, next) => {
  try {
    const buf = await buildUnifiedExcelTemplateBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="excel-dictionaries-template.xlsx"');
    res.status(200).send(buf);
  } catch (e) {
    next(e);
  }
});

excelDictionariesRouter.get('/export', async (_req, res, next) => {
  try {
    const buf = await buildUnifiedExcelExportBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="excel-dictionaries-export.xlsx"');
    res.status(200).send(buf);
  } catch (e) {
    next(e);
  }
});

excelDictionariesRouter.post('/import', upload.single('file'), async (req, res, next) => {
  try {
    const file = (req as any).file as { buffer: Buffer } | undefined;
    if (!file) {
      res.status(400).json({ error: 'missing_file' });
      return;
    }

    try {
      const report: ExcelDictionariesImportReport = await importUnifiedExcelFromBuffer(file.buffer);
      res.json(report);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'invalid_excel';
      res.status(400).json({ error: 'invalid_excel', message });
    }
  } catch (e) {
    next(e);
  }
});

