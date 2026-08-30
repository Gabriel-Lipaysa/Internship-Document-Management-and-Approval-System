const multer = require('multer');
const path = require('path');
const fs = require('fs');

let cloudinary;
let CloudinaryStorage;
try {
    cloudinary = require('cloudinary').v2;
    const multerCloudinary = require('multer-storage-cloudinary');
    CloudinaryStorage = multerCloudinary.CloudinaryStorage || multerCloudinary;
} catch (e) {
    console.warn('Cloudinary packages not loaded, using local storage.');
}

const isCloudinaryConfigured = Boolean(
    process.env.CLOUDINARY_URL ||
    (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
);

if (isCloudinaryConfigured && cloudinary) {
    if (!process.env.CLOUDINARY_URL) {
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET
        });
    }
    console.log('✓ Cloudinary storage configured');
} else {
    console.log('ℹ Cloudinary credentials not detected; using local disk storage fallback');
}

// ----------------------------------------------------
// Local Storage Handlers
// ----------------------------------------------------
const localProfileStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, '..', 'uploads', 'profile-pictures');
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, 'profile-' + uniqueSuffix + ext);
    }
});

const localAnnouncementStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, '..', 'uploads', 'announcements');
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, 'announcement-' + uniqueSuffix + ext);
    }
});

const localDocStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, '..', 'uploads', 'documents');
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, (file.fieldname || 'document') + '-' + uniqueSuffix + ext);
    }
});

// ----------------------------------------------------
// Cloudinary Storage Handlers (when configured)
// ----------------------------------------------------
let profileStorage = localProfileStorage;
let announcementStorage = localAnnouncementStorage;
let docStorage = localDocStorage;

if (isCloudinaryConfigured && CloudinaryStorage && cloudinary) {
    profileStorage = new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
            folder: 'ojt_app/profile-pictures',
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
            transformation: [{ width: 500, height: 500, crop: 'limit' }]
        }
    });

    announcementStorage = new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
            folder: 'ojt_app/announcements',
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif']
        }
    });

    docStorage = new CloudinaryStorage({
        cloudinary: cloudinary,
        params: async (req, file) => {
            const isImage = file.mimetype.startsWith('image/');
            return {
                folder: 'ojt_app/documents',
                resource_type: isImage ? 'image' : 'raw',
                format: path.extname(file.originalname).replace('.', '') || undefined,
                public_id: `${path.basename(file.originalname, path.extname(file.originalname))}-${Date.now()}`
            };
        }
    });
}

// ----------------------------------------------------
// File Filters
// ----------------------------------------------------
const imageFilter = (req, file, cb) => {
    if (!file) {
        return cb(null, true);
    }
    const ext = path.extname(file.originalname || '').toLowerCase();
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.svg', '.jfif', '.heic'];
    const isImageMime = file.mimetype && (file.mimetype.startsWith('image/') || file.mimetype === 'application/octet-stream');

    if (isImageMime || allowedExts.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Only image files (JPEG, PNG, WEBP, GIF) are allowed.'));
    }
};

const docFilter = (req, file, cb) => {
    if (!file) {
        return cb(null, true);
    }
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
    if (allowedTypes.includes(file.mimetype) || allowedExts.includes(ext) || file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF, JPEG, PNG, and Word documents are allowed.'));
    }
};

// ----------------------------------------------------
// Multer Upload Instances
// ----------------------------------------------------
const profileUpload = multer({
    storage: profileStorage,
    fileFilter: imageFilter,
    limits: { fileSize: 10 * 1024 * 1024 }
}).single('profilePicture');

const announcementUpload = multer({
    storage: announcementStorage,
    fileFilter: imageFilter,
    limits: { fileSize: 10 * 1024 * 1024 }
}).single('image');

const docUpload = multer({
    storage: docStorage,
    fileFilter: docFilter,
    limits: { fileSize: 15 * 1024 * 1024 }
}).single('file');

/**
 * Returns the public URL/path for an uploaded file
 * @param {Express.Multer.File} file - Multer file object
 * @param {'profile' | 'announcement' | 'document'} type - Category of the upload
 * @returns {string} Public URL or path to access the file
 */
const getUploadedFileUrl = (file, type) => {
    if (!file) return null;

    // Cloudinary returns path or secure_url as full HTTPS URL
    if (file.path && (file.path.startsWith('http://') || file.path.startsWith('https://'))) {
        return file.path;
    }
    if (file.secure_url) {
        return file.secure_url;
    }

    // Local disk storage fallback
    if (type === 'profile') {
        return `/uploads/profile-pictures/${file.filename}`;
    }
    if (type === 'announcement') {
        return `/uploads/announcements/${file.filename}`;
    }
    if (type === 'document') {
        return `/uploads/documents/${file.filename}`;
    }

    return `/uploads/${file.filename}`;
};

module.exports = {
    cloudinary,
    isCloudinaryConfigured,
    profileUpload,
    announcementUpload,
    docUpload,
    getUploadedFileUrl
};

