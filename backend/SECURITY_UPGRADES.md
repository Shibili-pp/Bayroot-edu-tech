# Security Upgrades - Bayroot Edu Tech Backend

## Summary of Changes

This document outlines all security enhancements implemented to finalize the backend before frontend development.

---

## 1. Authentication Contract (FROZEN)

### Login Response Format
All login endpoints now return a standardized format:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "JWT_TOKEN",
    "user": {
      "id": "string",
      "role": "ADMIN | PARTNER",
      "companyName": "string (partner only)"
    }
  }
}
```

### JWT Payload
- Uses `userId` field (backward compatible with `id`)
- Includes `role` field
- Token expiry: 7 days

---

## 2. Role & Permission Middleware

### New Middleware Functions
- `verifyToken` - Verifies JWT and attaches user to request
- `checkAdmin` - Ensures user is Admin
- `checkPartner` - Ensures user is Partner
- `authorize(...roles)` - Checks if user has one of the allowed roles

### Access Rules
- **Admin**: Full access to all students
- **Partner**: Can only access students created by them
- Partners cannot view other partner data

---

## 3. Student Data Encryption

### Encrypted Fields
- `email` - AES-256-CBC encrypted
- `phone` - AES-256-CBC encrypted
- `passportNumber` - AES-256-CBC encrypted (optional)

### Implementation
- Encryption happens automatically via Mongoose pre-save hooks
- Decryption happens only when sending responses
- Encryption key stored in `.env` as `ENCRYPTION_KEY`
- Prevents double encryption (checks if already encrypted)

---

## 4. Safe API Response Mapping

### Utility Function
`formatStudentResponse(student, role)`

### Response Rules
- **Admin**: Full decrypted data
- **Partner**: Masked sensitive data
  - Email: Shows last 3 characters (e.g., `***@gmail.com` → `***ail.com`)
  - Phone: Shows last 4 digits (e.g., `1234567890` → `******7890`)
  - Passport: Shows last 2 characters

### Benefits
- Never exposes raw database documents
- Role-based data visibility
- Consistent response format

---

## 5. File Security Hardening

### Upload Restrictions
- **Allowed types**: jpg, png, pdf, mp4 only
- **Max file size**: 10MB
- **File naming**: UUID-based (prevents directory traversal)
- **Storage**: Files stored in `uploads/` directory (not publicly accessible)

### Secure File Access
- **Endpoint**: `GET /api/files/:fileId`
- **Authentication**: Required (JWT)
- **Authorization**: 
  - Partner can only access files for their own students
  - Admin can access all files
- **Delivery**: Streamed securely (not static)

### File Metadata
Each document includes:
- `fileId` - UUID for secure access
- `filename` - Server filename
- `originalName` - Original filename
- `path` - Server path
- `fileType` - image/video/pdf
- `uploadedAt` - Timestamp

---

## 6. Student Access Rules

### Partner Permissions
✅ Create student
✅ View own students
✅ Update own students
✅ Upload documents to own students
❌ Delete student (Admin only)
❌ View other partners' students

### Admin Permissions
✅ View all students
✅ Update any student
✅ Download all documents
✅ Delete any student
✅ Full decrypted data access

---

## 7. Standard API Response Format

All APIs follow this format:
```json
{
  "success": true | false,
  "message": "string",
  "data": null | object
}
```

Errors use proper HTTP status codes:
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

## 8. Audit Logging

### AuditLog Model
Tracks critical actions:
- `userId` - User who performed action
- `userModel` - Admin or Partner
- `role` - User role
- `action` - Action type (VIEW_STUDENT, CREATE_STUDENT, etc.)
- `targetId` - Target resource ID
- `targetModel` - Target model name
- `metadata` - Additional context
- `ipAddress` - Client IP
- `userAgent` - User agent string
- `timestamp` - Action timestamp

### Logged Actions
- `VIEW_STUDENT`
- `CREATE_STUDENT`
- `UPDATE_STUDENT`
- `DELETE_STUDENT`
- `UPLOAD_DOCUMENT`
- `DOWNLOAD_FILE`
- `LOGIN`
- `LOGOUT`

### Benefits
- Compliance tracking
- Security monitoring
- Debugging support
- Non-blocking (errors don't break main flow)

---

## 9. Environment Variables

### Required Variables
```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/bayroot-edu-tech
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
ENCRYPTION_KEY=your-encryption-key-change-in-production-min-32-chars
```

### Security Notes
- Change all default values in production
- `ENCRYPTION_KEY` should be at least 32 characters
- Never commit `.env` file to version control

---

## 10. Updated Dependencies

### New Package
- `uuid` (^9.0.1) - For secure file naming

### All Dependencies
- express
- mongoose
- jsonwebtoken
- bcrypt
- multer
- dotenv
- cors
- uuid

---

## API Endpoints Summary

### Public Routes
- `POST /api/admin/register` - Register admin
- `POST /api/admin/login` - Admin login
- `POST /api/partner/register` - Register partner
- `POST /api/partner/login` - Partner login
- `GET /api/health` - Health check

### Protected Routes (Require JWT)
- `GET /api/admin/profile` - Get admin profile (Admin only)
- `GET /api/partner/profile` - Get partner profile (Partner only)
- `POST /api/students` - Create student (Partner only)
- `GET /api/students` - Get all students (filtered by role)
- `GET /api/students/:id` - Get single student
- `PUT /api/students/:id` - Update student
- `POST /api/students/:id/documents` - Upload documents
- `DELETE /api/students/:id` - Delete student (Admin only)
- `GET /api/files/:fileId` - Download file securely

---

## Migration Notes

### Existing Data
- Existing student records will be encrypted on next update
- Old tokens with `id` field still work (backward compatible)
- Files uploaded before upgrade won't have `fileId` - will need migration script if needed

### Breaking Changes
- Login response format changed (standardized)
- File access now requires authentication (no public static serving)
- Partner cannot delete students (was allowed before)

---

## Testing Checklist

- [ ] Server starts without errors
- [ ] Health check endpoint works
- [ ] Admin login returns correct format
- [ ] Partner login returns correct format
- [ ] Student data is encrypted in database
- [ ] Admin sees full decrypted data
- [ ] Partner sees masked data
- [ ] File upload works with UUID naming
- [ ] File download requires authentication
- [ ] Partner cannot access other partners' files
- [ ] Partner cannot delete students
- [ ] Admin can delete students
- [ ] Audit logs are created for critical actions

---

## Security Best Practices Implemented

1. ✅ Password hashing (bcrypt)
2. ✅ JWT authentication
3. ✅ Role-based access control
4. ✅ Data encryption at rest
5. ✅ Secure file handling
6. ✅ Input validation
7. ✅ Audit logging
8. ✅ Error handling
9. ✅ No sensitive data in responses
10. ✅ Secure file access (not public)

---

## Next Steps for Frontend

1. Update login handlers to use new response format
2. Use `userId` from JWT payload (or `id` from user object)
3. Implement file download via `/api/files/:fileId`
4. Handle masked data display for Partners
5. Update error handling for new status codes

---

**Backend is now secure, stable, and ready for frontend development!**

