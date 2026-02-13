# API Endpoints Reference

## Base URL
```
http://localhost:3000
```

## Available Routes

### 1. Root & Health Check
- **GET /** - Get API information and available endpoints
- **GET /api/health** - Health check endpoint

### 2. Admin Routes (`/api/admin`)

#### Public Routes:
- **POST /api/admin/register** - Register a new admin
  ```json
  {
    "name": "Admin Name",
    "email": "admin@example.com",
    "password": "password123"
  }
  ```

- **POST /api/admin/login** - Admin login
  ```json
  {
    "email": "admin@example.com",
    "password": "password123"
  }
  ```

#### Protected Routes (Require JWT Token):
- **GET /api/admin/profile** - Get admin profile
  ```
  Headers: Authorization: Bearer <token>
  ```

### 3. Partner Routes (`/api/partner`)

#### Public Routes:
- **POST /api/partner/register** - Register a new partner
  ```json
  {
    "companyName": "Company Name",
    "email": "partner@example.com",
    "password": "password123"
  }
  ```

- **POST /api/partner/login** - Partner login
  ```json
  {
    "email": "partner@example.com",
    "password": "password123"
  }
  ```

#### Protected Routes (Require JWT Token):
- **GET /api/partner/profile** - Get partner profile
  ```
  Headers: Authorization: Bearer <token>
  ```

### 4. Student Routes (`/api/students`)

**All routes require authentication (JWT Token)**

- **POST /api/students** - Create a new student
  ```
  Headers: Authorization: Bearer <token>
  Body:
  {
    "fullName": "Student Name",
    "email": "student@example.com",
    "phone": "1234567890",
    "countryPreference": "USA",
    "coursePreference": "Computer Science",
    "intake": "Fall 2024"
  }
  ```

- **GET /api/students** - Get all students (filtered by role)
  ```
  Headers: Authorization: Bearer <token>
  ```

- **GET /api/students/:id** - Get a single student
  ```
  Headers: Authorization: Bearer <token>
  ```

- **PUT /api/students/:id** - Update a student
  ```
  Headers: Authorization: Bearer <token>
  Body: (same as create, all fields optional)
  ```

- **POST /api/students/:id/documents** - Upload documents
  ```
  Headers: 
    Authorization: Bearer <token>
    Content-Type: multipart/form-data
  Body: Form data with field name "documents" (can upload multiple files)
  ```

- **DELETE /api/students/:id** - Delete a student
  ```
  Headers: Authorization: Bearer <token>
  ```

## Testing Examples

### Using cURL:

1. **Health Check:**
```bash
curl http://localhost:3000/api/health
```

2. **Register Admin:**
```bash
curl -X POST http://localhost:3000/api/admin/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@test.com","password":"password123"}'
```

3. **Login Admin:**
```bash
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password123"}'
```

4. **Get Admin Profile (with token):**
```bash
curl http://localhost:3000/api/admin/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Using Postman/Thunder Client:

1. Set base URL: `http://localhost:3000`
2. For protected routes, add header:
   - Key: `Authorization`
   - Value: `Bearer <your_token_here>`
3. Set Content-Type to `application/json` for JSON requests
4. For file uploads, use `multipart/form-data` with field name `documents`

## Common Issues

1. **"Route not found"** - Make sure you're using the correct HTTP method (GET, POST, PUT, DELETE) and the full path including `/api/`
2. **"Access denied"** - Make sure you're including the JWT token in the Authorization header
3. **"Invalid token"** - Token may have expired or is incorrect. Login again to get a new token.




