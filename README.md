# AegisBreach

AegisBreach is a web-based training and demonstration platform that simulates a document review and personal data breach workflow inspired by enterprise e-discovery and review systems.

The application is designed for training employees and candidates on document review, coding, batch-based workflows, person tracking, and document management without requiring access to the original production platform.

---

## Overview

AegisBreach provides a controlled environment where reviewers can:

- Select projects
- Acquire document review batches
- Review documents assigned to them
- Code documents using First Level Coding (FLR)
- Switch to Alternate Workflow (AWF)
- Track extracted personal information
- Link and unlink people using Person Tracker
- Assign Family Groups
- Add reviewer notes
- Navigate between documents
- Save coding and continue to the next document
- Complete batches based on reviewed documents

Administrators can:

- Create and manage projects
- Create and manage review batches
- Create, upload, replace, and delete documents
- Manage document metadata
- Manage batch assignments
- Perform controlled document and project administration

---

## Key Features

### Reviewer Workflow

- Project selection
- Review workspace
- Single active batch per reviewer
- Batch acquisition and locking
- Document-level review
- Save and Save & Next
- Previous/Next document navigation
- Automatic batch completion after all documents are reviewed
- Read-only access to documents belonging to other reviewers
- Read-only access to completed batches

### First Level Coding (FLR)

The FLR workflow supports:

- AL Designation
- FLR Review Complete
- Reportable Data Found
- Extraction Status
- Alternate Workflow Estimate
- Extracted Outside Relativity
- TXT Status
- Entries Completed
- Reviewer Notes
- Person Tracker
- Family Group
- Production History

### Alternate Workflow

Reviewers can switch between:

- First Level Coding
- Alternate Workflow

AWF-specific extraction information is persisted with the document coding record.

### Person Tracker

Person Tracker allows reviewers to:

- Create a person record
- Enter first name and last name
- Specify a role
- Link a person to a document
- Unlink a person
- Reposition the Person Tracker window using drag-and-drop

### Document Management

Administrators can:

- Create document metadata
- Upload documents
- Replace existing files
- Delete documents
- Manage batch relationships
- Manage project relationships

Supported file handling includes:

- PDF
- Images
- TXT
- CSV
- Office documents
- Unsupported file fallback handling

Dangerous executable file types are rejected.

### Cloudinary Integration

Document files are stored using Cloudinary.

The application stores:

- Secure file URL
- Cloudinary public ID
- Resource type
- File format
- File size
- File name

File replacement and deletion also clean up the corresponding Cloudinary asset.

---

## Technology Stack

### Frontend

- React
- Vite
- JavaScript
- Axios
- CSS

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- Multer
- Cloudinary

### Storage

- MongoDB Atlas — application data
- Cloudinary — document file storage

### Deployment

- Frontend — Vercel
- Backend — Render

---

## Architecture

```text
                    AegisBreach
                         |
              +----------+----------+
              |                     |
          React Client          Express API
              |                     |
              |              +------+------+
              |              |             |
              |          Controllers     Services
              |              |             |
              |            Models      Business Logic
              |              |
              |          MongoDB Atlas
              |
              +----------------------+
                                     |
                                Cloudinary
                              Document Storage
Backend Request Flow
Route
  ↓
Controller
  ↓
Service
  ↓
Mongoose Model
  ↓
MongoDB
  ↓
Response
Project Structure
aegisBreach/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── admin/
│   │   │   ├── coding/
│   │   │   ├── common/
│   │   │   ├── documents/
│   │   │   ├── layout/
│   │   │   ├── projects/
│   │   │   └── review/
│   │   │
│   │   ├── data/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   │
│   ├── package.json
│   └── vite.config.js
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   └── services/
│   │
│   ├── test_admin_batches_integration.js
│   ├── test_admin_crud.js
│   ├── test_admin_documents_integration.js
│   ├── test_admin_projects_integration.js
│   ├── test_cloudinary_integration.js
│   ├── test_workflow_e2e.js
│   ├── package.json
│   └── .env.example
│
└── .gitignore
Database Models

The backend uses the following MongoDB/Mongoose models:

Project
User
Batch
Document
Coding
Relationships
Project
   |
   +── Batches
   |      |
   |      +── Documents
   |               |
   |               +── Coding
   |
   +── Users
Batch Workflow

A reviewer can have only one active batch at a time.

Available
    |
    | Acquire
    ↓
In Progress
    |
    | Review documents
    ↓
All documents reviewed
    |
    ↓
Completed

The reviewed count is based on documents that have actually been reviewed and saved.

Opening a document does not increment the reviewed count.

Environment Variables
Backend

Create:

server/.env

Example:

MONGO_URI=your_mongodb_connection_string

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

PORT=5050
Frontend

Create:

client/.env

Example:

VITE_API_BASE_URL=http://localhost:5050
Security

Never commit .env files or real credentials to the repository.

Use .env.example files for documentation only.

Local Development
1. Clone the repository
git clone https://github.com/JeshwanthILU31/aegisBreach.git
cd aegisBreach
2. Install backend dependencies
cd server
npm install
3. Configure backend environment variables

Create:

server/.env

and add the required MongoDB and Cloudinary credentials.

4. Start the backend
npm run dev

The backend runs on:

http://localhost:5050
5. Install frontend dependencies

Open another terminal:

cd client
npm install
6. Configure frontend environment

Create:

client/.env

with:

VITE_API_BASE_URL=http://localhost:5050
7. Start the frontend
npm run dev

The Vite development server will provide the frontend URL.

Testing

The project contains integration and end-to-end tests covering:

Reviewer workflow
Batch acquisition
Review counting
Batch completion
Project management
Batch management
Document management
Cloudinary integration
File replacement
File deletion
Cascade deletion
Read-only behavior

Example:

cd server
node test_workflow_e2e.js
Quality Assurance

The current implementation has completed the full product QA cycle.

Phase 6B QA
Total Tests:     38
Passed:          38
Failed:           0
Blocked:          0
Pass Rate:      100%

QA covered:

Authentication
Project management
Batch management
Document management
Reviewer workflow
FLR coding
Alternate Workflow
Person Tracker
Family Group
Production History
Navigation
Save & Next
Batch completion
Read-only behavior
Cloudinary viewer
File upload/replacement/deletion
Admin cascades
Pagination
Filters
Error states
Security
UI layout

All destructive tests were performed against isolated temporary fixtures.

Security Considerations
Cloudinary API secrets remain server-side.
Environment files are excluded from Git.
Executable file uploads are blocked.
Document ownership is checked by the backend.
Batch acquisition is server-enforced.
Documents belonging to another reviewer's active batch are read-only.
Completed batches are protected from editing.
Cloudinary assets are cleaned up when documents are deleted or replaced.
