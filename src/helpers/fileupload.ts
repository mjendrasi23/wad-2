import fs from 'fs';
import { Router, Request, Response } from 'express';
// @ts-ignore: Ignore missing types for formidable
import formidable, { File } from 'formidable';

import { requireRole } from './auth';

export const uploadRouter = Router();

const uploadDir = process.env.UPLOADSDIR || './uploads';

function sanitizeFilename(name: string): string {
  if (typeof name !== 'string') return '';

  const match = name.match(/^(.*?)(\.[^.]+)?$/);
  if (!match) return '';

  const base = match[1]
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  const ext = match[2] || '';

  return base + ext;
}

/**
 * @api {post} /api/upload Upload file
 * @apiGroup Upload
 *
 * @apiDescription
 * Uploads one or more files using `multipart/form-data`.
 * The request must be sent as form-data. Text fields will
 * be available in `fields`, and uploaded files in `files`.
 *
 * @apiBody (FormData) {File} file File to upload (can be multiple if form allows)
 * @apiBody (FormData) {String} [description] Optional description
 *
 * @apiSuccess {String} message Confirmation message
 * @apiSuccess {Object} file Uploaded file information
 * @apiSuccess {String} file.originalFilename Original name of the uploaded file
 * @apiSuccess {String} file.newFilename New filename assigned by the server
 * @apiSuccess {String} file.mimetype File MIME type
 * @apiSuccess {Number} file.size File size in bytes
 * @apiSuccess {String} file.filepath File path on server
 *
 * @apiUse HttpError
 */
uploadRouter.post('/', requireRole([1, 2, 3, 4]), async (req: Request, res: Response) => {
  const form = formidable({
    uploadDir,
    keepExtensions: true,
    multiples: false,
    maxFileSize: 500 * 1024, // 512,000 bytes (exactly 500 KB)
  });

  form.parse(req, (err: any, fields: formidable.Fields, files: formidable.Files) => {
    if (err) {
      // If the file is too large, Formidable throws an error
      if (err.code === 1009) { // 1009 is the code for 'maxFileSize exceeded'
        return res.status(413).json({ error: 'File too large. Max size is 500KB.' });
      }
      console.error('Error while parsing form:', err);
      return res.status(400).json({ error: 'File upload failed' });
    }

    const uploadedFile = (files.file as File | File[]) || null;
    const file = Array.isArray(uploadedFile) ? uploadedFile[0] : uploadedFile;
    
    const uploadSubfolder = sanitizeFilename((fields.path?.[0] as string) || '');
    const name = sanitizeFilename((fields.name?.[0] as string) || '');

    const targetDir = `${uploadDir}/${uploadSubfolder}`;
    const backendPath = `${targetDir}/${name}`;

    if (!file) {
      deleteUploadedFile(name, uploadSubfolder);
      return res.json({ message: 'File deleted', filename: backendPath });
    }

    try {
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      fs.renameSync(file.filepath, backendPath);

      return res.json({
        message: 'File uploaded successfully',
        file: {
          originalFilename: file.originalFilename,
          savedAs: backendPath,
          size: file.size,
          mimeType: file.mimetype,
        },
      });
      
    } catch (renameError) {
      return res.status(500).json({ error: 'File system error' });
    }
  });
});

export function deleteUploadedFile(name: string, folder: string): boolean {
  const backendPath = `${uploadDir}/${sanitizeFilename(folder)}/${sanitizeFilename(name)}`;
  if (fs.existsSync(backendPath)) {
    fs.unlinkSync(backendPath);
    return true;
  }
  return false;
}
