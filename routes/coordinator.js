const express = require('express');
const router = express.Router();
const { User, StudentProfile, Announcement, Comment } = require('../models');
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const path = require('path');
const fs = require('fs');
const { profileUpload, announcementUpload, getUploadedFileUrl } = require('../utils/storage');
const ChatbotService = require('../services/chatbotService');

router.post('/create-coordinator', auth('coordinator'), async (req, res) => {
    const { email, password, name, campus } = req.body;
    if (!email || !password || !name || !campus) return res.status(400).json({ error: 'Missing required fields (email, password, name, campus)' });

    try {
        const hash = await bcrypt.hash(password, 10);
        const user = await User.create({
            email,
            password: hash,
            name,
            campus,
            role: 'coordinator',
            status: 'active'
        });
        res.json({ message: 'Coordinator created', userId: user._id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/pending-students', auth('coordinator'), async (req, res) => {
    const students = await User.find({ role: 'student', status: 'pending' });
    res.json(students);
});

router.put('/approve-student/:userId', auth('coordinator'), async (req, res) => {
    const user = await User.findById(req.params.userId);
    if (!user || user.role !== 'student') return res.status(404).json({ error: 'Student not found' });
    user.status = 'active';
    await user.save();
    res.json({ message: 'Student approved' });
});

router.get('/students', auth('coordinator'), async (req, res) => {
    const { status } = req.query;
    const filter = { role: 'student', status: 'active' };
    const users = await User.find(filter).populate('studentProfile');
    let profiles = users.map(u => u.studentProfile).filter(Boolean);
    if (status) profiles = profiles.filter(p => p.overallStatus === status);
    res.json(profiles);
});

router.get('/student/:studentId', auth('coordinator'), async (req, res) => {
    const profile = await StudentProfile.findById(req.params.studentId).populate('user');
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    res.json(profile);
});

router.put('/checklist/:profileId', auth('coordinator'), async (req, res) => {
    const profile = await StudentProfile.findById(req.params.profileId);
    profile.coordinatorChecklist = { ...profile.coordinatorChecklist, ...req.body };
    await profile.save();
    res.json(profile.coordinatorChecklist);
});

router.put('/mark-done/:profileId', auth('coordinator'), async (req, res) => {
    const profile = await StudentProfile.findById(req.params.profileId);
    profile.overallStatus = 'Pending Director Review';
    await profile.save();
    res.json({ message: 'Marked as done, sent to director.' });
});

router.get('/student-details/:studentId', auth('coordinator'), async (req, res) => {
    try {
        const student = await User.findById(req.params.studentId)
            .populate({
                path: 'studentProfile',
                populate: {
                    path: 'documents'
                }
            });

        if (!student) {
            return res.redirect('/coordinator/dashboard?error=Student not found');
        }

        res.render('coordinator/student-details', {
            student,
            error: req.query.error,
            message: req.query.message
        });
    } catch (err) {
        console.error('Student Details Error:', err);
        res.redirect('/coordinator/dashboard?error=Error loading student details');
    }
});

router.put('/document-status/:docId', auth('coordinator'), async (req, res) => {
    try {
        const profile = await StudentProfile.findOne({ 'documents._id': req.params.docId });
        if (!profile) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const doc = profile.documents.id(req.params.docId);
        const prevStatus = doc.status;
        doc.status = req.body.status;
        await profile.save();

        if (doc.docType === 'moa' && req.body.status === 'Checked') {
            profile.overallStatus = 'Pending Director Review';
            await profile.save();
        }

        res.json({ message: 'Status updated successfully' });
    } catch (err) {
        console.error('Update Status Error:', err);
        res.status(500).json({ error: 'Error updating status' });
    }
});

router.get('/edit-profile', auth('coordinator'), async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        res.render('coordinator/edit-profile', { user });
    } catch (err) {
        res.redirect('/coordinator/dashboard?error=Error loading profile');
    }
});

router.post('/edit-profile', auth('coordinator'), async (req, res) => {
    profileUpload(req, res, async (err) => {
        try {
            if (err) {
                return res.redirect('/coordinator/edit-profile?error=' + err.message);
            }

            const user = await User.findById(req.user._id);
            if (req.file) {
                if (user.profilePicture && !user.profilePicture.startsWith('http')) {
                    const oldPath = path.join(__dirname, '..', user.profilePicture);
                    if (fs.existsSync(oldPath)) {
                        fs.unlinkSync(oldPath);
                    }
                }
                user.profilePicture = getUploadedFileUrl(req.file, 'profile');
            }

            user.name = req.body.name || user.name;
            user.campus = req.body.campus || user.campus;

            await user.save();
            res.redirect('/coordinator/dashboard');
        } catch (err) {
            console.error('Profile update error:', err);
            res.redirect('/coordinator/edit-profile?error=' + err.message);
        }
    });
});

router.get('/dashboard', auth('coordinator'), async (req, res) => {
    try {
        const pendingStudents = await User.find({ role: 'student', status: 'pending' })
            .populate({
                path: 'studentProfile',
                select: 'personalData'
            });

        const activeStudents = await User.find({ role: 'student', status: 'active' })
            .populate({
                path: 'studentProfile',
                select: 'personalData documents overallStatus partnership'
            });

        let announcements = await Announcement.find()
            .populate({
                path: 'author',
                select: 'name profilePicture email studentProfile',
                populate: { path: 'studentProfile', select: 'personalData' }
            })
            .populate({
                path: 'comments',
                populate: {
                    path: 'author',
                    select: 'name profilePicture email studentProfile',
                    populate: { path: 'studentProfile', select: 'personalData' }
                },
                options: { sort: { createdAt: -1 } }
            })
            .sort({ createdAt: -1 });

        for (let i = 0; i < announcements.length; i++) {
            const aDoc = announcements[i];
            const a = aDoc.toObject ? aDoc.toObject() : aDoc;

            let auth = a.author || {};
            let pd = auth.studentProfile?.personalData;

            if (!pd && auth._id) {
                const sp = await StudentProfile.findOne({ user: auth._id }).lean();
                pd = sp?.personalData;
            }

            const builtName = auth.name || (pd ? [pd.givenName || pd.firstName, pd.middleName, pd.surname || pd.lastName].filter(Boolean).join(' ') : undefined);
            auth.name = builtName || auth.email || 'User';
            auth.profilePicture = auth.profilePicture || pd?.profilePicture || '/images/default-avatar.png';
            a.author = auth;

            const comments = a.comments || [];
            for (let j = 0; j < comments.length; j++) {
                const comm = comments[j];
                let cAuth = comm.author || {};
                let cpd = cAuth.studentProfile?.personalData;

                if (!cpd && cAuth._id) {
                    const spc = await StudentProfile.findOne({ user: cAuth._id }).lean();
                    cpd = spc?.personalData;
                }

                const cBuiltName = cAuth.name || (cpd ? [cpd.givenName || cpd.firstName, cpd.middleName, cpd.surname || cpd.lastName].filter(Boolean).join(' ') : undefined);
                cAuth.name = cBuiltName || cAuth.email || 'User';
                cAuth.profilePicture = cAuth.profilePicture || cpd?.profilePicture || '/images/default-avatar.png';
                comm.author = cAuth;
                comments[j] = comm;
            }

            a.comments = comments;
            announcements[i] = a;
        }

        const coordinators = await User.find({ role: 'coordinator' }).select('email name status campus');

        // Generate reports data
        const reportsData = await generateReportsData(activeStudents);

        res.render('coordinator/dashboard', {
            pendingStudents,
            activeStudents,
            coordinators,
            announcements,
            reportsData,
            error: req.query.error,
            message: req.query.message,
            user: req.user
        });
    } catch (err) {
        console.error('Dashboard Error:', err);
        res.redirect('/?error=Error loading dashboard');
    }
});

async function generateReportsData(activeStudents) {
    const companiesMap = {};
    const campusMAOStats = {};

    activeStudents.forEach(student => {
        const profile = student.studentProfile;

        // Build companies statistics
        if (profile.partnership && profile.partnership.agency) {
            const company = profile.partnership.agency;
            if (!companiesMap[company]) {
                companiesMap[company] = {
                    name: company,
                    location: profile.partnership.location,
                    studentCount: 0,
                    students: []
                };
            }
            companiesMap[company].studentCount++;
            companiesMap[company].students.push({
                name: `${profile.personalData.givenName} ${profile.personalData.surname}`,
                studentId: profile.personalData.studentId
            });
        }

        // Build MOA statistics by campus
        const campus = student.studentProfile?.personalData?.yearSection || 'Unknown';
        if (!campusMAOStats[campus]) {
            campusMAOStats[campus] = {
                campus: campus,
                submitted: 0,
                done: 0,
                total: 0
            };
        }
        campusMAOStats[campus].total++;

        const moaDoc = profile.documents?.find(d => d.docType === 'moa');
        if (moaDoc) {
            if (moaDoc.status === 'Done') {
                campusMAOStats[campus].done++;
            } else if (moaDoc.status === 'Submitted' || moaDoc.status === 'Checked') {
                campusMAOStats[campus].submitted++;
            }
        }
    });

    return {
        companies: Object.values(companiesMap),
        campusMAOStats: Object.values(campusMAOStats),
        totalCompanies: Object.keys(companiesMap).length,
        totalStudentsInterning: activeStudents.filter(s => s.studentProfile?.partnership?.agency).length
    };
}

router.post('/announcement', auth('coordinator'), (req, res) => {
    announcementUpload(req, res, async (err) => {
        try {
            if (err) {
                return res.status(400).json({ error: err.message });
            }

            const announcement = new Announcement({
                title: req.body.title,
                content: req.body.content,
                author: req.user._id,
                imageUrl: req.file ? getUploadedFileUrl(req.file, 'announcement') : undefined
            });

            await announcement.save();
            res.json(announcement);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
});

router.post('/announcement/:id/comment', auth(['coordinator', 'student']), async (req, res) => {
    try {
        const { content } = req.body;
        const announcementId = req.params.id;

        const comment = new Comment({
            content,
            author: req.user._id,
            announcement: announcementId,
            createdAt: new Date()
        });

        await comment.save();

        const announcement = await Announcement.findById(announcementId);
        announcement.comments.push(comment._id);
        await announcement.save();

        const populatedComment = await Comment.findById(comment._id)
            .populate({
                path: 'author',
                select: 'name profilePicture email studentProfile',
                populate: { path: 'studentProfile', select: 'personalData' }
            })
            .lean();

        const authorObj = populatedComment.author || {};
        let fullName = authorObj.name;
        const pd = authorObj.studentProfile?.personalData;
        if (!fullName && pd) {
            const parts = [
                pd.givenName || pd.firstName,
                pd.middleName,
                pd.surname || pd.lastName
            ].filter(Boolean);
            fullName = parts.join(' ');
        }
        const profilePic = authorObj.profilePicture || pd?.profilePicture || '/images/default-avatar.png';

        const createdAt = populatedComment.createdAt ? new Date(populatedComment.createdAt) : new Date();
        const createdAtShort = createdAt.toLocaleString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: 'numeric', minute: '2-digit'
        });

        res.json({
            ...populatedComment,
            author: {
                name: fullName || authorObj.email,
                profilePicture: profilePic,
                email: authorObj.email
            },
            createdAt: createdAt.toISOString(),
            createdAtShort
        });
    } catch (err) {
        console.error('Comment creation error:', err);
        res.status(500).json({ error: 'Failed to create comment' });
    }
});

router.post('/document-comment/:docId', auth('coordinator'), async (req, res) => {
    try {
        const profile = await StudentProfile.findOne({ 'documents._id': req.params.docId });
        if (!profile) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const docIndex = profile.documents.findIndex(d => d._id.toString() === req.params.docId);
        if (docIndex === -1) {
            return res.status(404).json({ error: 'Document not found in profile' });
        }

        const doc = profile.documents[docIndex];

        if (!Array.isArray(doc.comments)) {
            doc.comments = [];
        }

        const newComment = {
            author: req.user.name || req.user.email,
            content: req.body.comment,
            createdAt: new Date()
        };

        doc.comments.push(newComment);
        profile.markModified('documents');
        await profile.save();

        res.json({
            message: 'Comment added successfully',
            comment: newComment
        });
    } catch (err) {
        console.error('Add comment error:', err);
        res.status(500).json({ error: 'Failed to add comment' });
    }
});

router.delete('/announcement/:id', auth('coordinator'), async (req, res) => {
    try {
        const announcement = await Announcement.findById(req.params.id);
        if (!announcement) {
            return res.status(404).json({ error: 'Announcement not found' });
        }

        await Comment.deleteMany({ announcement: announcement._id });

        if (announcement.imageUrl && !announcement.imageUrl.startsWith('http')) {
            try {
                const imagePath = path.join(__dirname, '..', announcement.imageUrl.startsWith('/') ? announcement.imageUrl.slice(1) : announcement.imageUrl);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            } catch (err) {
                console.warn('Could not remove local image file:', err.message);
            }
        }

        await Announcement.deleteOne({ _id: announcement._id });
        res.json({ message: 'Announcement deleted successfully' });
    } catch (err) {
        console.error('Delete announcement error:', err);
        res.status(500).json({ error: 'Failed to delete announcement' });
    }
});

router.delete('/:id', auth('coordinator'), async (req, res) => {
    try {
        const targetId = req.params.id;

        if (req.user._id.toString() === targetId) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        const user = await User.findById(targetId);
        if (!user || user.role !== 'coordinator') {
            return res.status(404).json({ error: 'Coordinator not found' });
        }

        await User.findByIdAndDelete(targetId);
        res.json({ message: 'Coordinator deleted' });
    } catch (err) {
        console.error('Delete coordinator error:', err);
        res.status(500).json({ error: 'Failed to delete coordinator' });
    }
});

router.get('/document-comments/:docId', auth('coordinator'), async (req, res) => {
    try {
        const profile = await StudentProfile.findOne({ 'documents._id': req.params.docId });
        if (!profile) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const doc = profile.documents.find(d => d._id.toString() === req.params.docId);
        if (!doc) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const comments = Array.isArray(doc.comments) ? doc.comments : [];
        res.json({ comments });
    } catch (err) {
        console.error('Fetch comments error:', err);
        res.status(500).json({ error: 'Failed to fetch comments' });
    }
});

router.delete('/document-comment/:docId/:commentIndex', auth('coordinator'), async (req, res) => {
    try {
        const profile = await StudentProfile.findOne({ 'documents._id': req.params.docId });
        if (!profile) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const doc = profile.documents.find(d => d._id.toString() === req.params.docId);
        if (!doc) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const commentIndex = parseInt(req.params.commentIndex);
        if (Array.isArray(doc.comments) && commentIndex >= 0 && commentIndex < doc.comments.length) {
            const comment = doc.comments[commentIndex];

            if (comment.author === (req.user.name || req.user.email)) {
                doc.comments.splice(commentIndex, 1);
                profile.markModified('documents');
                await profile.save();
                res.json({ message: 'Comment deleted successfully' });
            } else {
                return res.status(403).json({ error: 'You can only delete your own comments' });
            }
        } else {
            return res.status(404).json({ error: 'Comment not found' });
        }
    } catch (err) {
        console.error('Delete comment error:', err);
        res.status(500).json({ error: 'Failed to delete comment' });
    }
});

router.post('/chatbot', auth('coordinator'), async (req, res) => {
    try {
        const { message } = req.body;
        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Message cannot be empty' });
        }

        const reply = await ChatbotService.getReply(message, 'coordinator');
        res.json({ response: reply });
    } catch (err) {
        console.error('Coordinator chatbot error:', err);
        res.status(500).json({ error: err.message || 'Chatbot service error' });
    }
});

module.exports = router;
