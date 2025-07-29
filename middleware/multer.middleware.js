import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Storage engine
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Optional: file filter
const fileFilter = (req, file, cb) => {
  const allowed = /pdf/;
  const isValid = allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype);
  isValid ? cb(null, true) : cb(new Error('Invalid file type'));
};

const limits = {
  fileSize: 5 * 1024 * 1024 // 5MB
};

const upload = multer({ storage, fileFilter, limits });

export default upload;
