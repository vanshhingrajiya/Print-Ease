import upload from '../config/multer.js';

const withUpload = (req, res, next) => {
  upload.array('files', 10)(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || 'Upload error' });
    }
    next();
  });
};

export default withUpload;