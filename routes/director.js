const express = require('express');
const router = express.Router();
const { StudentProfile } = require('../models');
const auth = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

router.get('/review-list', auth('director'), async (req, res) => {
  const profiles = await StudentProfile.find({ overallStatus: 'Pending Director Review' }).populate('user');
  res.json(profiles);
});

router.get('/student/:studentId', auth('director'), async (req, res) => {
  const profile = await StudentProfile.findById(req.params.studentId).populate('user');
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  res.json(profile);
});

router.put('/set-status/:documentId', auth('director'), async (req, res) => {
  const { status } = req.body;
  const profile = await StudentProfile.findOne({ 'documents._id': req.params.documentId });
  if (!profile) return res.status(404).json({ error: 'Document not found' });
  const doc = profile.documents.id(req.params.documentId);
  doc.status = status;
  await profile.save();
  res.json({ message: 'Document status updated' });
});

router.get('/dashboard', auth('director'), async (req, res) => {
  try {
    const profiles = await StudentProfile.find({ overallStatus: 'Pending Director Review' }).populate('user');
    res.render('director/dashboard', {
      profiles,
      user: req.user,
      error: req.query.error,
      message: req.query.message
    });
  } catch (err) {
    console.error('Director Dashboard Error:', err);
    res.redirect('/?error=Error loading director dashboard');
  }
});

router.get('/student-view/:studentId', auth('director'), async (req, res) => {
  try {
    const profile = await StudentProfile.findById(req.params.studentId).populate('user');
    if (!profile) return res.redirect('/director/dashboard?error=Profile not found');
    res.render('director/student-details', { profile, user: req.user, error: req.query.error, message: req.query.message });
  } catch (err) {
    console.error('Director student view error:', err);
    res.redirect('/director/dashboard?error=Error loading student details');
  }
});

router.post('/document-comment/:docId', auth('director'), async (req, res) => {
  try {
    const profile = await StudentProfile.findOne({ 'documents._id': req.params.docId });
    if (!profile) return res.status(404).json({ error: 'Document not found' });

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
    console.error('Director add comment error:', err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

router.get('/document/:docId/view', auth('director'), async (req, res) => {
  try {
    const profile = await StudentProfile.findOne({ 'documents._id': req.params.docId });
    if (!profile) return res.status(404).send('Document not found');

    const doc = profile.documents.id(req.params.docId);
    if (!doc || !doc.fileUrl) return res.status(404).send('File not available');

    if (doc.fileUrl.startsWith('http://') || doc.fileUrl.startsWith('https://')) {
      return res.redirect(doc.fileUrl);
    }

    const absPath = path.join(__dirname, '..', doc.fileUrl.startsWith('/') ? doc.fileUrl.slice(1) : doc.fileUrl);
    if (!fs.existsSync(absPath)) {
      return res.status(404).send('File not found on server');
    }

    res.sendFile(absPath);
  } catch (err) {
    console.error('Document view error:', err);
    res.status(500).send('Error retrieving file');
  }
});

router.get('/document-comments/:docId', auth('director'), async (req, res) => {
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

router.delete('/document-comment/:docId/:commentIndex', auth('director'), async (req, res) => {
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

module.exports = router;
