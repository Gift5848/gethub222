# Automotive Spare Parts E-commerce Backend

## Overview
This is the backend part of the Automotive Spare Parts E-commerce project. It is built using Node.js, Express, and MongoDB. The backend handles user authentication, including registration and login functionalities, and serves as an API for the frontend application.

## Technologies Used
- Node.js
- Express
- MongoDB
- Mongoose
- JSON Web Tokens (JWT)

## Setup Instructions

### Prerequisites
- Node.js installed on your machine
- MongoDB database (local or cloud)

### Installation
1. Clone the repository:
   ```
   git clone <repository-url>
   ```
2. Navigate to the backend directory:
   ```
   cd auto-spareparts-ecommerce/backend
   ```
3. Install the dependencies:
   ```
   npm install
   ```

### Configuration
1. Set up your MongoDB connection in `src/config/db.js`.
2. Ensure you have the necessary environment variables for JWT secret and MongoDB URI.

### Running the Application
To start the backend server, run:
```
npm start
```
The server will run on `http://localhost:5000` by default.

## API Endpoints

### Authentication
- **POST /api/auth/register**: Register a new user.
- **POST /api/auth/login**: Login an existing user.

## License
This project is licensed under the MIT License.