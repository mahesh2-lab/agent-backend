import express from 'express';
import upload from '../middleware/multer.middleware.js';
import { uploadMultipleFiles } from '../controllers/file.controller.js';

const router = express.Router();

router.post('/upload', upload.array('resumeFile'), uploadMultipleFiles);

export default router;
