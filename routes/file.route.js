import express from 'express';
import upload from '../middleware/multer.middleware.js';
import { uploadSingleFile } from '../controllers/file.controller.js';

const router = express.Router();

router.post('/upload', upload.single('resumeFile'), uploadSingleFile);

export default router;
