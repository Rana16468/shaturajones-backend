// src/utils/uploadFile.ts
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import status from 'http-status';
import fs from 'fs';
import ApiError from '../app/error/ApiError';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folderPath = './src/public';

    // ফাইল টাইপ চেক এবং আলাদা ফোল্ডার অ্যাসাইন করা
    if (file.mimetype.startsWith('image/')) {
      folderPath = './src/public/images';
    } else if (file.mimetype === 'application/pdf') {
      folderPath = './src/public/pdf';
    } else if (file.mimetype.startsWith('audio/')) {
      folderPath = './src/public/audio'; // অডিও ফাইল এখানে যাবে
    } else if (file.mimetype.startsWith('video/')) {
      folderPath = './src/public/video'; // ভিডিও ফাইল এখানে যাবে
    } else {
      cb(
        new ApiError(
          status.BAD_REQUEST,
          'Only images, PDFs, audio, and video files are allowed',
          '',
        ),
        './src/public',
      );
      return;
    }
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    cb(null, folderPath);
  },

  filename(_req, file, cb) {
    const fileExt = path.extname(file.originalname);
    const fileName = `${file.originalname
      .replace(fileExt, '')
      .toLocaleLowerCase()
      .split(' ')
      .join('-')}-${uuidv4()}`;

    cb(null, fileName + fileExt);
  },
});

const upload = multer({ storage });

export default upload;