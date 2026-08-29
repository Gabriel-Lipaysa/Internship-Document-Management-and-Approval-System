# Internship Document Management and Approval System

![License](https://img.shields.io/badge/license-MIT-blue) ![Node](https://img.shields.io/badge/Node.js-v18+-green) ![Status](https://img.shields.io/badge/Status-In%20Development-yellow) ![MongoDB](https://img.shields.io/badge/MongoDB-Latest-brightgreen)

> Streamline internship document submission, tracking, and approval with real-time transparency and efficiency.

## 📄 About

**Internship Document Management and Approval System** is a comprehensive web-based platform designed to help **students, coordinators, and directors** efficiently manage the complete internship document lifecycle—from submission to approval.

I built this project to deepen my understanding of:
- **MVC Architecture** and role-based access control
- **RESTful API Design** with complex data relationships
- **Real-time Document Management** systems
- **Multi-user Workflows** and approval pipelines
- **File Upload Handling** and document tracking

## 🛠️ Tech Stack

* **Languages:** JavaScript (ES6+)
* **Frontend:** EJS Templates, Bootstrap 5, HTML/CSS
* **Backend:** Node.js, Express.js
* **Database:** MongoDB with Mongoose ODM
* **Authentication:** JWT Tokens, bcryptjs Password Hashing
* **File Storage:** Multer for file uploads
* **AI Integration:** Google Gemini API for Chatbot Assistant
* **Tools:** Git, npm, Postman, VS Code

## ✨ Key Features

* **📤 Multi-Category Document Upload:** Students can upload documents across Pre-Deployment, Legal Forms, and Post-OJT Requirements with real-time progress tracking and status management.

* **👥 Role-Based Access Control:** Three distinct user roles (Student, Coordinator, Director) with tailored dashboards, permissions, and workflows for seamless collaboration.

* **💬 Real-Time Comments & Feedback:** Bidirectional communication system where coordinators can provide feedback on documents and students receive notifications for revisions needed.

* **🤖 AI-Powered Chatbot Assistant:** Integrated Google Gemini API chatbot that answers students' questions about document requirements, upload procedures, and internship processes.

* **🏢 Partnership Application System:** Students can apply for internships at pre-listed partner organizations or add custom companies with location and contact information.

* **📊 Document Status Tracking:** Dynamic status updates (Submitted, Checked, For Revision, Done) with visual progress indicators and coordinator/director review workflows.

* **📢 Announcements & Community Feed:** Coordinators can post announcements with images, and students can comment and engage with updates in real-time.

* **👤 Profile Management:** Complete student profile management with personal information, contact details, course/year tracking, and profile picture uploads.

## 🧠 Technical Decisions & Challenges

### Challenge 1: Complex Document-Comment Relationship
**The Problem:** Documents needed to support multiple comments from different coordinators, but managing nested arrays in MongoDB proved complex when updating specific comments without affecting the entire document array.

**The Solution:** Implemented a hybrid approach using Mongoose subdocuments for comments within documents. Used `markModified()` to ensure MongoDB recognized nested array changes, and created separate routes for adding and deleting comments to handle the complexity cleanly.

```javascript
doc.comments.push(newComment);
profile.markModified('documents');
await profile.save();
```

### Challenge 2: Multi-Role Approval Pipeline
**The Problem:** Different user roles (Student, Coordinator, Director) needed different views and actions on the same documents. The coordinator dashboard initially became cluttered trying to show all students' documents.

**The Solution:** Implemented role-based route guards using middleware and populated only relevant data based on user role. Created separate dashboards for each role and used EJS conditional rendering to show/hide UI elements based on permissions.

```javascript
router.get('/dashboard', auth('coordinator'), async (req, res) => {
  const activeStudents = await User.find({ role: 'student', status: 'active' })
    .populate('studentProfile', 'personalData documents overallStatus partnership');
});
```

### Challenge 3: File Upload Validation & Storage
**The Problem:** Students could upload large files or unsupported formats, consuming server storage and causing validation errors.

**The Solution:** Implemented multi-layer validation:
- **Client-side:** Accept attribute restricts file types
- **Multer config:** File type and size limits (5MB max)
- **Server-side:** Additional MIME type validation before processing

```javascript
const docUpload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', ...];
    if (allowedTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type'));
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});
```

### Challenge 4: Dynamic Partnership Application Data
**The Problem:** The Applications tab needed to group students by selected partnerships, but partnership data was scattered across student profiles without proper indexing.

**The Solution:** Modified the coordinator dashboard query to explicitly select and populate the `partnership` field:

```javascript
const activeStudents = await User.find({ role: 'student', status: 'active' })
  .populate({
    path: 'studentProfile',
    select: 'personalData documents overallStatus partnership'
  });
```

Then implemented client-side grouping to organize students by agency/partnership on the frontend.

### Why This Tech Stack:
- **MongoDB over SQL:** Flexible schema for varying document types and nested comments without migration headaches
- **EJS over React:** Server-side rendering for faster initial load and simpler authentication without token management complexity
- **Express.js:** Lightweight and perfect for this mid-scale application with clear routing and middleware patterns
- **Gemini API:** Free tier supports reasonable chatbot usage for student support without additional infrastructure

## 🚀 Getting Started

To run this project locally, follow these steps.

### Prerequisites
* Node.js v18+
* npm or yarn
* MongoDB (local or Atlas connection string)
* Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/JohnP3rt/Internship-Document-Management-and-Approval-System.git
cd Internship-Document-Management-and-Approval-System
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
Create a `.env` file in the root directory (refer to `.env.example`):
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
JWT_SECRET=your_secret_key_here
GEMINI_API_KEY=your_gemini_api_key
NODE_ENV=development
PORT=3000

# Optional Cloudinary Configuration (falls back to local /uploads if omitted):
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

4. **Initialize the database** (seed Director and Coordinator accounts)
```bash
npm run seed
```

5. **Start the server**
```bash
npm start
```

The application will be available at `http://localhost:3000`

### Default Credentials (for testing)
- **Director:** `director@example.com` / `director123`
- **Coordinator:** `coordinator@example.com` / `coordinator123`
- **Student:** Register via `/register` or create via coordinator dashboard

## 📋 Usage

### For Students:
1. Register an account and complete your profile
2. Navigate to the **Documents** tab to upload required documents
3. Submit your **Partnership Application** for your chosen internship company
4. Monitor document status and coordinator feedback in real-time
5. Use the **Chatbot** for questions about the process

### For Coordinators:
1. Review pending student accounts in the **Account Requests** tab
2. Check **Review Submissions** to see student document progress
3. Navigate to **Applications** to view partnership applications by company
4. Provide feedback via comments on individual documents
5. Post announcements to keep students informed

### For Directors:
1. Review students' **Memorandum of Agreement (MOA)** documents
2. Approve or request revisions on MOA submissions
3. Provide final approval for student internship completion

## 📁 Project Structure

```
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── student.js           # Student dashboard & uploads
│   ├── coordinator.js       # Coordinator review & announcements
│   └── director.js          # Director MOA approval
├── views/
│   ├── student/
│   │   ├── dashboard.ejs    # Student main dashboard
│   │   └── edit-profile.ejs # Profile management
│   ├── coordinator/
│   │   ├── dashboard.ejs    # Coordinator main dashboard
│   │   └── student-details.ejs
│   ├── director/
│   │   ├── dashboard.ejs
│   │   └── student-details.ejs
│   └── auth/
│       ├── login.ejs
│       └── register.ejs
├── models.js                # Mongoose schemas
├── middleware/
│   ├── auth.js             # JWT verification
│   └── errorHandler.js
├── uploads/                 # File storage directory
└── app.js                  # Express app configuration
```

## 🔐 Security Features

- **Password Hashing:** bcryptjs for secure password storage
- **JWT Authentication:** Token-based session management
- **Role-Based Access Control:** Middleware checks user role on protected routes
- **File Upload Validation:** MIME type and size restrictions
- **CSRF Protection:** (Recommended to add: express-csrf)
- **Input Sanitization:** Validation on all form inputs

## 🐛 Known Issues & Future Improvements

- [ ] Add email notifications for document status changes
- [ ] Implement document versioning for revision tracking
- [ ] Add advanced search and filtering for coordinators
- [ ] Create PDF export functionality for submitted documents
- [ ] Implement audit logging for all document actions
- [ ] Add two-factor authentication for enhanced security
- [ ] Mobile app development for better accessibility

## 📞 Support & Contact

For questions, issues, or suggestions, please open an issue on GitHub or contact the development team.

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Built with ❤️ by John Pert Millena**
