const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserSchema = new Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'coordinator', 'director'], required: true },
  status: { type: String, enum: ['pending', 'active', 'rejected', 'Processing', 'Revise', 'For Signature'], default: 'pending' },
  studentProfile: { type: Schema.Types.ObjectId, ref: 'StudentProfile' },
  name: { type: String },
  profilePicture: { type: String },
  campus: { type: String, default: '' },
  department: { type: String, default: '' },
  designation: { type: String, default: '' },
  contactNumber: { type: String, default: '' },
  officeLocation: { type: String, default: '' },
  officeHours: { type: String, default: '' },
  bio: { type: String, default: '' }
});

const StudentProfileSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  personalData: {
    studentId: { type: String, default: '' },
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    surname: String,
    givenName: String,
    middleName: String,
    dateOfBirth: Date,
    civilStatus: String,
    sex: String,
    course: String,
    major: String,
    yearSection: String,
    campus: String,
    contactNumber: String,
    guardianName: String,
    homeAddress: String,
    currentAddress: String,
    profilePicture: String
  },
  documents: [{
    docType: {
      type: String,
      enum: [
        'record_file',
        'application_letter',
        'medical_certificate',
        'psychological_test',
        'certification_units',
        'resume',
        'consent_form',
        'endorsement_letter',
        'internship_waiver',
        'moa',
        'waiver',
        'guardian_consent',
        'transcript',
        'medical_cert',
        'insurance',
        'clearance',
        'release_form',
        'internship_agreement',
        'evaluation_form',
        'completion_cert',
        'narrative_report',
        'time_record',
        'timeframe',
        'weekly_reports',
        'student_feedback',
        'supervisor_feedback',
        'self_evaluation',
        'student_evaluation'
      ]
    },
    fileName: String,
    fileUrl: String,
    status: {
      type: String,
      enum: ['Submitted', 'Checked', 'For Revision', 'Done', 'Processing', 'Revise', 'For Signature'],
      default: 'Submitted'
    },
    uploadDate: {
      type: Date,
      default: Date.now
    },
    comments: [{
      author: String,
      content: String,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  }],
  partnership: {
    agency: { type: String, default: '' },
    location: { type: String, default: '' },
    email: { type: String, default: '' },
    customAgency: { type: String, default: '' },
    appliedAt: { type: Date, default: null }
  },
  coordinatorChecklist: {
    clearance_checked: { type: Boolean, default: false },
    moa_checked: { type: Boolean, default: false },
    record_file_checked: { type: Boolean, default: false }
  },
  overallStatus: {
    type: String,
    enum: ['Submitting', 'Pending Coordinator Review', 'Pending Director Review', 'Completed', 'Revision Needed'],
    default: 'Submitting'
  }
});

const AnnouncementSchema = new Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  imageUrl: { type: String },
  comments: [{ type: Schema.Types.ObjectId, ref: 'Comment' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date }
});

const CommentSchema = new Schema({
  content: { type: String, required: true },
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  announcement: { type: Schema.Types.ObjectId, ref: 'Announcement', required: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const StudentProfile = mongoose.model('StudentProfile', StudentProfileSchema);
const Announcement = mongoose.model('Announcement', AnnouncementSchema);
const Comment = mongoose.model('Comment', CommentSchema);

module.exports = { User, StudentProfile, Announcement, Comment };
