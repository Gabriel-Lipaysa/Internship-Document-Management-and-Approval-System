const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const config = require('./config/config');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');
const expressLayouts = require('express-ejs-layouts');
const multer = require('multer');
const fs = require('fs');

const app = express();

app.use(cookieParser());

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, config.UPLOAD_DIR)));

const connectDB = require('./config/database');
connectDB();

app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static assets
app.use(express.static(path.join(__dirname, 'public')));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'public/images')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads/announcements', express.static(path.join(__dirname, 'uploads/announcements')));
app.use('/uploads/profile-pictures', express.static(path.join(__dirname, 'uploads/profile-pictures')));
app.use('/uploads/documents', express.static(path.join(__dirname, 'uploads/documents')));
app.use('/coordinator/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/student/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/director/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'uploads/announcements')));
app.use('/templates', express.static(path.join(__dirname, 'templates')));

const createDirectory = (dirPath) => {
    try {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            console.log('Created directory:', dirPath);
        }
    } catch (err) {
        console.error('Error creating directory:', dirPath, err);
    }
};

const requiredDirs = [
    path.join(__dirname, 'templates'),
    path.join(__dirname, 'uploads'),
    path.join(__dirname, 'uploads/announcements'),
    path.join(__dirname, 'uploads/documents'),
    path.join(__dirname, 'uploads/profile-pictures'),
    path.join(__dirname, 'public/images')
];

requiredDirs.forEach(createDirectory);

// Ensure default avatar placeholder exists
const placeholderPic = path.join(__dirname, 'public/images/profile-placeholder.png');
const defaultAvatarPic = path.join(__dirname, 'public/images/default-avatar.png');
if (fs.existsSync(placeholderPic) && !fs.existsSync(defaultAvatarPic)) {
    try {
        fs.copyFileSync(placeholderPic, defaultAvatarPic);
    } catch (e) {
        console.error('Error ensuring default avatar:', e);
    }
}

app.use((err, req, res, next) => {
    console.error(err);
    if (err instanceof multer.MulterError) {
        return res.redirect('back?error=' + encodeURIComponent('File upload error: ' + err.message));
    }
    next(err);
});

app.use((err, req, res, next) => {
    console.error('Error:', err);
    if (req.xhr || req.path.startsWith('/api/')) {
        return res.status(500).json({ error: err.message });
    }
    next(err);
});

app.get('/', (req, res) => {
    res.render('auth/login', {
        error: req.query.error,
        message: req.query.message
    });
});
app.get('/register', (req, res) => res.render('auth/register'));

app.use('/api', routes);
app.use('/', routes);

const studentRoutes = require('./routes/student');
const coordinatorRoutes = require('./routes/coordinator');
const directorRoutes = require('./routes/director');

app.use('/student', studentRoutes);
app.use('/coordinator', coordinatorRoutes);
app.use('/director', directorRoutes);

app.use((err, req, res, next) => {
    if (!req.path.startsWith('/api')) {
        console.error(err);
        return res.render('error', {
            message: 'Something went wrong!',
            error: process.env.NODE_ENV === 'development' ? err : {}
        });
    }
    next(err);
});

if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'client/build')));
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'client/build/index.html'));
    });
}

app.use(errorHandler);
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

module.exports = app; 