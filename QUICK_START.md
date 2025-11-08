# Quick Start Guide

## Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

## Setup Steps

### 1. Install Frontend Dependencies
```bash
npm install
```

### 2. Install Backend Dependencies
```bash
cd backend-server
npm install
cd ..
```

### 3. Start the Backend Server
```bash
# Option 1: From root directory
npm run server

# Option 2: From backend-server directory
cd backend-server
npm start
```

The backend will run on `http://localhost:8000`

### 4. Start the Frontend (in a new terminal)
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## Login Credentials

Use these credentials to test the application:

- **Employee**: `employee@test.com` / `password`
- **HR Officer**: `hr@test.com` / `password`
- **Payroll Officer**: `payroll@test.com` / `password`
- **Admin**: `admin@test.com` / `password`

## Testing the Profile Page

1. Login with any of the above credentials
2. Click on your profile icon in the top right
3. Select "My Profile"
4. The profile page should load without 404 errors

## Troubleshooting

### Backend not starting
- Check if port 8000 is already in use
- Verify Node.js version: `node --version` (should be 18+)
- Check `backend-server/node_modules` exists

### Frontend can't connect to backend
- Ensure backend is running on port 8000
- Check browser console for API errors
- Verify `NEXT_PUBLIC_API_URL` is set correctly (defaults to `http://localhost:8000`)

### Profile page 404 error
- Check backend server logs for the request
- Verify employee ID format matches (e.g., `emp_001`, `EMP001`)
- Check browser network tab for the actual API call

## Development Mode

For auto-reload during development:

```bash
# Backend with auto-reload
npm run server:dev

# Frontend (already has hot-reload)
npm run dev
```

