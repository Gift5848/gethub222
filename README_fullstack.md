# Fullstack Project: How to Run

## Backend

1. Open a terminal and navigate to the `backend` folder:
   ```powershell
   cd backend
   ```
2. Install dependencies:
   ```powershell
   npm install
   ```
3. Start the backend server:
   ```powershell
   npm run dev
   ```
   The backend will run on `http://localhost:5000` by default.

## Frontend

1. Open a new terminal and navigate to the `frontend` folder:
   ```powershell
   cd frontend
   ```
2. Install dependencies:
   ```powershell
   npm install
   ```
3. Start the frontend React app:
   ```powershell
   npm start
   ```
   The frontend will run on `http://localhost:3000` by default and proxy API requests to the backend.

## Notes
- Make sure MongoDB is running if your backend requires it.
- The frontend is set up to use a proxy for API calls, so you do not need to change API URLs in your code.
- Both servers must be running for the fullstack app to work.
