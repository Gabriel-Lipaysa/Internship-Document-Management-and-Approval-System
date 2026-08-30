const multer = require('multer');
const path = require('path');
const fs = require('fs');

let cloudinary = null;
try {
    cloudinary = require('cloudinary').v2;
} catch (e) {
    console.warn('ℹ Cloudinary package not loaded, using local disk storage.');
}

const isCloudinaryConfigured = Boolean(
    cloudinary && (
        process.env.CLOUDINARY_URL ||
        (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
    )
);

if (isCloudinaryConfigured && cloudinary) {
    if (!process.env.CLOUDINARY_URL) {
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET
        });
    }
    console.log('✓ Cloudinary storage configured & active');
} else {
    console.log('ℹ Local disk storage active (uploads directory)');
}

// Ensure local upload directories exist
const localUploadDirs = [
    path.join(__dirname, '..', 'uploads'),
    path.join(__dirname, '..', 'uploads', 'profile-pictures'),
    path.join(__dirname, '..', 'uploads', 'announcements'),
    path.join(__dirname, '..', 'uploads', 'documents')
];

localUploadDirs.forEach(dir => {
    try {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    } catch (err) {
        console.error('Error creating directory:', dir, err.message);
    }
});

// ----------------------------------------------------
// File Filters
// ----------------------------------------------------
const imageFilter = (req, file, cb) => {
    if (!file) return cb(null, true);
    const ext = path.extname(file.originalname || '').toLowerCase();
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.svg', '.jfif', '.heic'];
    const isImageMime = file.mimetype && (file.mimetype.startsWith('image/') || file.mimetype === 'application/octet-stream');

    if (isImageMime || allowedExts.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Only image files (JPG, PNG, WEBP, GIF) are allowed.'));
    }
};

const docFilter = (req, file, cb) => {
    if (!file) return cb(null, true);
    const ext = path.extname(file.originalname || '').toLowerCase();
    const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
    const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/octet-stream'
    ];
    if (allowedTypes.includes(file.mimetype) || allowedExts.includes(ext) || file.mimetype?.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF, JPEG, PNG, and Word documents are allowed.'));
    }
};

// ----------------------------------------------------
// Multer In-Memory Uploader
// ----------------------------------------------------
const memoryStorage = multer.memoryStorage();

const rawProfileUpload = multer({
    storage: memoryStorage,
    fileFilter: imageFilter,
    limits: { fileSize: 10 * 1024 * 1024 }
}).single('profilePicture');

const rawAnnouncementUpload = multer({
    storage: memoryStorage,
    fileFilter: imageFilter,
    limits: { fileSize: 10 * 1024 * 1024 }
}).single('image');

const rawDocUpload = multer({
    storage: memoryStorage,
    fileFilter: docFilter,
    limits: { fileSize: 25 * 1024 * 1024 }
}).single('file');

/**
 * Uploads a buffer to Cloudinary using upload_stream
 * @param {Buffer} buffer 
 * @param {Object} options 
 * @returns {Promise<Object>}
 */
const uploadBufferToCloudinary = (buffer, options = {}) => {
    return new Promise((resolve, reject) => {
        if (!cloudinary) return reject(new Error('Cloudinary not available'));
        const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
            if (error) return reject(error);
            resolve(result);
        });
        stream.end(buffer);
    });
};

/**
 * Saves a buffer to local disk
 * @param {Buffer} buffer 
 * @param {'profile' | 'announcement' | 'document'} type 
 * @param {string} originalname 
 * @returns {string} Relative public path
 */
const saveBufferToDisk = (buffer, type, originalname) => {
    const subfolder = type === 'profile' ? 'profile-pictures' : (type === 'announcement' ? 'announcements' : 'documents');
    const dir = path.join(__dirname, '..', 'uploads', subfolder);
    fs.mkdirSync(dir, { recursive: true });

    const ext = path.extname(originalname || '') || (type === 'document' ? '.pdf' : '.png');
    const filename = `${type}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${subfolder}/${filename}`;
};

/**
 * Higher-order middleware that processes upload with Cloudinary + Local Disk fallback
 * @param {Function} multerMiddleware 
 * @param {'profile' | 'announcement' | 'document'} type 
 */
const createSmartUploadMiddleware = (multerMiddleware, type) => {
    return (req, res, next) => {
        multerMiddleware(req, res, async (err) => {
            if (err) {
                return next(err);
            }

            if (!req.file || !req.file.buffer) {
                return next();
            }

            const folderMap = {
                profile: 'ojt_app/profile-pictures',
                announcement: 'ojt_app/announcements',
                document: 'ojt_app/documents'
            };

            // Attempt Cloudinary upload if configured
            if (isCloudinaryConfigured && cloudinary) {
                try {
                    const isImage = req.file.mimetype?.startsWith('image/');
                    const cloudinaryOptions = {
                        folder: folderMap[type] || 'ojt_app/uploads',
                        resource_type: (type === 'document' && !isImage) ? 'raw' : 'image'
                    };

                    const result = await uploadBufferToCloudinary(req.file.buffer, cloudinaryOptions);
                    req.file.path = result.secure_url || result.url;
                    req.file.secure_url = result.secure_url || result.url;
                    req.file.filename = result.public_id;
                    return next();
                } catch (cloudErr) {
                    console.warn(`Cloudinary upload warning (${type}):`, cloudErr.message, '- Falling back to local disk storage.');
                }
            }

            // Fallback: Save buffer to local disk
            try {
                const publicUrl = saveBufferToDisk(req.file.buffer, type, req.file.originalname);
                req.file.path = publicUrl;
                req.file.filename = path.basename(publicUrl);
                req.file.secure_url = publicUrl;
                next();
            } catch (diskErr) {
                console.error('Local disk storage error:', diskErr);
                next(new Error(`Failed to store uploaded file: ${diskErr.message}`));
            }
        });
    };
};

const profileUpload = createSmartUploadMiddleware(rawProfileUpload, 'profile');
const announcementUpload = createSmartUploadMiddleware(rawAnnouncementUpload, 'announcement');
const docUpload = createSmartUploadMiddleware(rawDocUpload, 'document');

/**
 * Returns the public URL/path for an uploaded file
 * @param {Express.Multer.File} file - Multer file object
 * @param {'profile' | 'announcement' | 'document'} type - Category of the upload
 * @returns {string} Public URL or path to access the file
 */
const getUploadedFileUrl = (file, type) => {
    if (!file) return null;

    if (file.secure_url) {
        return file.secure_url;
    }
    if (file.path) {
        return file.path;
    }
    if (file.filename) {
        const subfolder = type === 'profile' ? 'profile-pictures' : (type === 'announcement' ? 'announcements' : 'documents');
        return `/uploads/${subfolder}/${file.filename}`;
    }
    return null;
};

module.exports = {
    cloudinary,
    isCloudinaryConfigured,
    profileUpload,
    announcementUpload,
    docUpload,
    getUploadedFileUrl
};

