# File Upload System - AWS S3 Integration Guide

This guide explains the secure file upload system using AWS S3 for the Bayroot Edu Tech platform.

## Overview

The file upload system uses:
- **Multer** with `memoryStorage` for handling file uploads
- **AWS S3** for cloud storage (NOT presigned URLs - backend uploads)
- **MongoDB** for storing file metadata only (NOT the files themselves)

## Features

✅ Support for Images (jpg, png, jpeg, webp)  
✅ Support for Videos (mp4)  
✅ Support for PDFs  
✅ File size validation (max 20MB)  
✅ File type validation  
✅ Organized S3 folder structure  
✅ Secure file access with role-based permissions  
✅ Complete audit logging  

## Prerequisites

1. AWS Account with S3 access
2. AWS Access Key ID and Secret Access Key
3. S3 Bucket created in your AWS account

## Setup Instructions

### 1. Install Dependencies

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### 2. Configure Environment Variables

Add the following to your `.env` file:

```env
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-bucket-name
```

### 3. Create S3 Bucket

1. Log in to AWS Console
2. Navigate to S3
3. Create a new bucket
4. Configure bucket settings:
   - **Block Public Access**: Enable (for security)
   - **Versioning**: Optional (recommended for production)
   - **Encryption**: Enable server-side encryption

### 4. Configure IAM Permissions

Create an IAM user with the following S3 permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name/*",
        "arn:aws:s3:::your-bucket-name"
      ]
    }
  ]
}
```

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── s3.config.js          # AWS S3 client configuration
│   ├── middlewares/
│   │   └── upload.middleware.js   # Multer configuration with memoryStorage
│   ├── models/
│   │   └── File.model.js          # MongoDB schema for file metadata
│   ├── services/
│   │   └── s3.service.js          # S3 upload/delete operations
│   ├── controllers/
│   │   └── file.controller.js    # File upload/delete controllers
│   └── routes/
│       └── file.routes.js         # File upload routes
```

## API Endpoints

### Upload File
**POST** `/api/files/upload`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body:**
- `file`: File to upload (form-data)

**Response:**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "file": {
      "fileId": "uuid",
      "originalName": "document.pdf",
      "fileName": "uuid.pdf",
      "fileType": "pdf",
      "fileSize": 1024000,
      "s3Url": "https://bucket.s3.region.amazonaws.com/uploads/pdfs/uuid.pdf",
      "uploadedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### Get File Metadata
**GET** `/api/files/:fileId`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "file": {
      "fileId": "uuid",
      "originalName": "document.pdf",
      "fileName": "uuid.pdf",
      "fileType": "pdf",
      "fileSize": 1024000,
      "s3Url": "https://bucket.s3.region.amazonaws.com/uploads/pdfs/uuid.pdf",
      "uploadedBy": {
        "userId": "ObjectId",
        "role": "PARTNER"
      },
      "uploadedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### List Files
**GET** `/api/files?fileType=pdf&page=1&limit=20`

**Query Parameters:**
- `fileType` (optional): Filter by type (`image`, `video`, `pdf`)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "files": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5
    }
  }
}
```

### Delete File
**DELETE** `/api/files/:fileId`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

## File Organization in S3

Files are organized in the following folder structure:

```
your-bucket-name/
├── uploads/
│   ├── images/
│   │   └── uuid.jpg
│   ├── videos/
│   │   └── uuid.mp4
│   └── pdfs/
│       └── uuid.pdf
```

## File Validation

### Supported File Types

**Images:**
- `.jpg`, `.jpeg`, `.png`, `.webp`
- MIME types: `image/jpeg`, `image/png`, `image/webp`

**Videos:**
- `.mp4`
- MIME type: `video/mp4`

**PDFs:**
- `.pdf`
- MIME type: `application/pdf`

### File Size Limits

- Maximum file size: **20MB**
- Files exceeding this limit will be rejected

## Security Features

1. **Authentication Required**: All endpoints require JWT authentication
2. **Role-Based Access**: Partners can only access their own files
3. **File Type Validation**: Strict validation of file types and extensions
4. **File Size Limits**: Prevents oversized uploads
5. **Audit Logging**: All file operations are logged
6. **Secure S3 Access**: Uses IAM credentials, not public access

## Error Handling

The system handles various error scenarios:

- **Invalid file type**: Returns 400 error
- **File too large**: Returns 400 error
- **S3 upload failure**: Returns 500 error with details
- **File not found**: Returns 404 error
- **Access denied**: Returns 403 error

## Usage Examples

### Frontend Upload (React/Axios)

```javascript
const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await axios.post('/api/files/upload', formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    
    console.log('File uploaded:', response.data.data.file.s3Url);
    return response.data.data.file;
  } catch (error) {
    console.error('Upload failed:', error.response.data);
    throw error;
  }
};
```

### Using Fetch API

```javascript
const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/files/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await response.json();
  return data;
};
```

## MongoDB Schema

The File model stores the following metadata:

```javascript
{
  fileId: String (UUID),
  originalName: String,
  fileName: String,
  fileType: 'image' | 'video' | 'pdf',
  mimeType: String,
  fileSize: Number,
  s3Key: String,
  s3Url: String,
  uploadedBy: {
    userId: ObjectId,
    role: 'ADMIN' | 'PARTNER'
  },
  metadata: Map,
  createdAt: Date,
  updatedAt: Date
}
```

## Best Practices

1. **Environment Variables**: Never commit AWS credentials to version control
2. **Error Handling**: Always handle upload errors gracefully
3. **File Validation**: Validate files on both frontend and backend
4. **Cleanup**: Implement cleanup jobs for orphaned files
5. **Monitoring**: Monitor S3 usage and costs
6. **Backup**: Consider enabling S3 versioning for critical files

## Troubleshooting

### Common Issues

**Issue**: "S3 upload failed: Access Denied"
- **Solution**: Check IAM permissions and bucket policy

**Issue**: "Invalid file type"
- **Solution**: Verify file extension and MIME type match allowed types

**Issue**: "File size exceeds maximum limit"
- **Solution**: Ensure file is under 20MB

**Issue**: "Bucket not found"
- **Solution**: Verify bucket name in environment variables

## Production Checklist

- [ ] AWS credentials configured securely
- [ ] S3 bucket created and configured
- [ ] IAM permissions set correctly
- [ ] Environment variables set
- [ ] File size limits configured
- [ ] Error handling tested
- [ ] Audit logging verified
- [ ] CORS configured (if needed)
- [ ] Monitoring set up

## Support

For issues or questions, please contact the development team.




