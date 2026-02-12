# Bayroot Edu Tech - Backend API

Backend API for Bayroot Edu Tech B2B Platform built with Node.js, Express.js, and MongoDB.

## Features

- JWT-based authentication for Admin and Partner roles
- Role-based access control (RBAC)
- Student management system
- File upload support (images, videos, PDFs)
- RESTful API architecture

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **bcrypt** - Password hashing
- **Multer** - File uploads
- **CORS** - Cross-origin resource sharing

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── db.js          # MongoDB connection
│   │   └── env.js         # Environment variables
│   ├── models/
│   │   ├── Admin.model.js
│   │   ├── Partner.model.js
│   │   └── Student.model.js
│   ├── controllers/
│   │   ├── admin.controller.js
│   │   ├── partner.controller.js
│   │   └── student.controller.js
│   ├── routes/
│   │   ├── admin.routes.js
│   │   ├── partner.routes.js
│   │   └── student.routes.js
│   ├── middlewares/
│   │   ├── auth.middleware.js    # JWT authentication
│   │   ├── role.middleware.js    # Role-based access
│   │   └── upload.middleware.js  # File upload handling
│   ├── utils/
│   │   └── response.util.js      # Response helpers
│   └── app.js             # Express app configuration
├── server.js              # Server entry point
├── .env                   # Environment variables
└── package.json
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
   - Copy `.env` file and update the values:
     - `MONGO_URI` - MongoDB connection string
     - `JWT_SECRET` - Secret key for JWT tokens
     - `PORT` - Server port (default: 3000)

3. Make sure MongoDB is running on your system

4. Start the server:
```bash
# Development mode (with nodemon)
npm run dev

# Production mode
npm start
```

## API Endpoints

### Health Check
- `GET /api/health` - Check API status

### Admin Routes
- `POST /api/admin/register` - Register new admin
- `POST /api/admin/login` - Admin login
- `GET /api/admin/profile` - Get admin profile (Protected)

### Partner Routes
- `POST /api/partner/register` - Register new partner
- `POST /api/partner/login` - Partner login
- `GET /api/partner/profile` - Get partner profile (Protected)

### Student Routes (All Protected)
- `POST /api/students` - Create student
- `GET /api/students` - Get all students
- `GET /api/students/:id` - Get single student
- `PUT /api/students/:id` - Update student
- `POST /api/students/:id/documents` - Upload documents (multipart/form-data)
- `DELETE /api/students/:id` - Delete student

## Authentication

All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## File Uploads

Files are uploaded to:
- `uploads/images/` - Image files
- `uploads/videos/` - Video files
- `uploads/pdfs/` - PDF files

Maximum file size: 50MB

## Role-Based Access

- **ADMIN**: Full access to all resources
- **PARTNER**: Can only access and manage their own students

## Notes

- Passwords are automatically hashed using bcrypt
- JWT tokens expire after 7 days
- Partners must be active (`isActive: true`) to login
- Student documents are stored with metadata (filename, path, fileType)

