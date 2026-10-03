import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure uploads directories exist
const uploadDir = path.resolve('uploads');
const profilesDir = path.join(uploadDir, 'profiles');
const docsDir = path.join(uploadDir, 'documents');

[uploadDir, profilesDir, docsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Storage engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'profilePhoto' || file.fieldname === 'photo') {
      cb(null, profilesDir);
    } else {
      cb(null, docsDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    const prefix =
      file.fieldname === 'license' || file.fieldname === 'licenseDoc' || file.fieldname === 'document'
        ? 'license'
        : 'file';
    cb(null, `${prefix}-${uniqueSuffix}${ext}`);
  },
});

// File filter for security with strict MIME-type & extension validation
const fileFilter = (req, file, cb) => {
  const allowedImageExts = /jpeg|jpg|png|webp/;
  const allowedImageMimes = /image\/(jpeg|png|webp)/;

  const allowedDocExts = /jpeg|jpg|png|pdf|doc|docx/;
  const allowedDocMimes = /(image\/(jpeg|png|webp)|application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document)/;

  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  const mime = file.mimetype.toLowerCase();

  if (file.fieldname === 'profilePhoto' || file.fieldname === 'photo') {
    if (allowedImageExts.test(ext) && allowedImageMimes.test(mime)) {
      return cb(null, true);
    }
    return cb(new Error('Only JPEG, PNG, and WebP images are allowed for profile photos.'));
  } else {
    if (allowedDocExts.test(ext) && allowedDocMimes.test(mime)) {
      return cb(null, true);
    }
    return cb(new Error('Only PDF, DOC, DOCX, and image files (JPEG, PNG, WebP) are allowed for supporting documents.'));
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter,
});
