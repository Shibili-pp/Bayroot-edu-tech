# Bayroot Edu Tech - Frontend

React frontend template for Bayroot Edu Tech B2B Platform.

## Tech Stack

- **React 18** - UI library
- **Vite** - Build tool and dev server
- **React Router DOM** - Routing
- **Axios** - HTTP client
- **Context API** - State management for authentication

## Project Structure

```
frontend/
├── src/
│   ├── api/              # API configuration
│   │   └── axios.js      # Axios instance with interceptors
│   ├── components/       # Reusable components
│   │   ├── common/       # Common components (Loader, ProtectedRoute)
│   │   └── layout/       # Layout components (Admin, Partner, Auth)
│   ├── context/          # React Context
│   │   └── AuthContext.jsx
│   ├── pages/            # Page components
│   │   ├── auth/         # Authentication pages
│   │   ├── admin/        # Admin pages
│   │   ├── partner/      # Partner pages
│   │   └── common/       # Common pages (NotFound)
│   ├── routes/           # Routing configuration
│   │   └── AppRoutes.jsx
│   ├── utils/            # Utility functions
│   │   └── auth.js       # Auth helper functions
│   ├── App.jsx           # Main app component
│   ├── main.jsx          # Entry point
│   └── index.css         # Global styles
├── .env                  # Environment variables
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 16+ and npm

### Installation

```bash
# Install dependencies
npm install
```

### Environment Setup

Create a `.env` file in the root directory:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

### Development

```bash
# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

```bash
# Build for production
npm run build
```

### Preview Production Build

```bash
# Preview production build
npm run preview
```

## Features

### Authentication

- JWT-based authentication
- Token stored in localStorage
- Automatic token attachment to API requests
- Auto-logout on 401 responses
- Role-based access control

### Routing

- Public routes: `/login`
- Protected routes:
  - `/admin/*` - Admin only
  - `/partner/*` - Partner only
- Automatic redirects based on authentication state

### Layouts

- **AuthLayout** - Simple layout for login/register pages
- **AdminLayout** - Layout with sidebar and header for admin pages
- **PartnerLayout** - Layout with sidebar and header for partner pages

## Usage

### Authentication Context

```jsx
import { useAuth } from './context/AuthContext';

function MyComponent() {
  const { user, token, login, logout, isAuthenticated } = useAuth();
  
  // Use auth state and methods
}
```

### Protected Routes

```jsx
import ProtectedRoute from './components/common/ProtectedRoute';

<ProtectedRoute allowedRoles={['ADMIN']}>
  <AdminComponent />
</ProtectedRoute>
```

### API Calls

```jsx
import api from './api/axios';

// GET request
const response = await api.get('/students');

// POST request
const response = await api.post('/students', data);
```

## API Integration

The frontend is configured to work with the backend API at:
- Base URL: `http://localhost:3000/api` (configurable via `.env`)

### Login Endpoints

- Admin: `POST /admin/login`
- Partner: `POST /partner/login`

### Expected Response Format

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

## Development Notes

- This is a **template/foundation** - no business logic implemented yet
- Focus on structure, routing, and authentication
- UI is minimal and clean - ready for customization
- All routes are protected except `/login`
- Role-based routing prevents cross-role access

## Next Steps

1. Add dashboard components and features
2. Implement student management UI
3. Add file upload functionality
4. Customize styling and UI components
5. Add error boundaries and loading states
6. Implement form validation

## License

ISC

