# Abstract

This system is a comprehensive, modular fullstack platform designed for order, product, and user management, suitable for e-commerce, inventory, and administrative applications. It consists of a robust backend built with Node.js/Express and a modern frontend developed with React. The backend provides secure RESTful APIs for managing users, products, orders, and file uploads, and integrates with a MongoDB database for persistent storage. The system supports multiple user roles—including admins, subadmins, sellers, delivery personnel, and buyers—each with tailored permissions and workflows. Key features include real-time notifications, analytics dashboards, role-based access control, and maintenance scripts for data management. The architecture emphasizes scalability, security, and ease of integration, making it adaptable for a wide range of business needs. This documentation provides detailed guidance for installation, configuration, usage, and administration of the backend system, ensuring efficient deployment and management by technical teams.

# User Manual Backend (Admin Guide)

---

## Table of Contents
1. Overview
2. System Requirements
3. Installation & Setup
4. Running the Backend
5. Admin Roles & Permissions
6. Backend Features
7. API Usage & Documentation
8. File Uploads & Management
9. Maintenance Scripts
10. Troubleshooting & FAQ
11. Security Best Practices
12. Support & Contact

---

## 1. Overview

This backend application is designed for comprehensive order, product, and user management, suitable for e-commerce, inventory, or administrative platforms. It is modular, scalable, and supports multiple admin roles with secure authentication, API endpoints, and file upload capabilities.

- **Backend**: Built with Node.js/Express, handling business logic, data storage, authentication, and file uploads. Located in the `backend` folder.
- **Database**: Typically MongoDB, but can be configured for other databases.
- **File Storage**: Uploaded files are stored in `backend/uploads/`.

---

## 2. System Requirements

### Hardware
- Minimum 4GB RAM (8GB recommended for development)
- At least 2 CPU cores
- 2GB free disk space (more for large file uploads)

### Software
- **Node.js**: v14 or higher
- **npm**: v6 or higher
- **MongoDB**: v4 or higher (or compatible database)
- **Git**: For version control
- **Visual Studio Code** (recommended)

---

## 3. Installation & Setup

### A. Cloning the Repository
1. Open a terminal and run:
   ```
   git clone <repository-url>
   cd <project-folder>
   ```

### B. Installing Dependencies
- **Backend**:
  ```
  cd backend
  npm install
  ```

### C. Environment Configuration
- Copy `.env.example` to `.env` in the `backend/` folder (if available), or create a new `.env` file:
  ```
  DB_URI=mongodb://localhost:27017/yourdb
  JWT_SECRET=your_secret_key
  PORT=3000
  ```
- Never commit `.env` files to version control.

### D. Database Setup
- Ensure MongoDB is running locally or provide a remote connection string.
- For initial data, check for seed scripts in `backend/scripts/`.

---

## 4. Running the Backend

### A. Production Mode
1. Open a terminal in the project root or `backend/` folder.
2. Run:
   ```
   npm start
   ```
3. The backend server will start on the port specified in `.env` or `src/app.js` (commonly 3000).
4. Monitor the terminal for errors or logs.

### B. Development Mode
- Use `npm run dev` (if available) for hot-reloading with nodemon.
- Make code changes and see them reflected immediately.

---

## 5. Admin Roles & Permissions

- **Admin**: Full access to all backend features, including user, product, and order management, system settings, and analytics.
- **Subadmin**: Limited management capabilities, can manage assigned products and orders, but cannot change system-wide settings.

---

## 6. Backend Features

### A. Order Management
- Create, view, update, and delete orders via API endpoints.
- Filter orders by status, date, or user.
- Assign orders to users or subadmins.
- Export order data as CSV or PDF (via scripts or API).

### B. Product Management
- Add, edit, or remove products via API.
- Upload product images and manage inventory.
- Set product categories, prices, and availability.
- Bulk import/export products (via scripts or API).

### C. User Management
- Register new users and assign roles via API.
- Edit user details and reset passwords.
- Deactivate or delete users.
- View user activity logs (if implemented).

### D. Notifications
- Send email or in-app notifications for order updates, new products, etc. (if configured).
- Configurable notification preferences in environment or config files.

---

## 7. API Usage & Documentation

- The API is documented in `backend/order-api-doc.yaml` (OpenAPI/Swagger format).
- To view:
  - Use https://editor.swagger.io/ and upload the YAML file
  - Or install Swagger UI locally
- API covers authentication, order, product, and user endpoints
- Example API call (using curl):
  ```
  curl -X POST http://localhost:3000/api/login -d '{"username":"admin","password":"yourpassword"}' -H "Content-Type: application/json"
  ```
- Authentication is via JWT tokens; include `Authorization: Bearer <token>` in headers

---

## 8. File Uploads & Management

- Upload product images or documents via API endpoints or admin UI (if available)
- Supported formats: JPG, PNG, PDF (configurable)
- Files are stored in `backend/uploads/`
- Uploaded files are linked to products or orders
- File size limits and allowed types can be configured in backend settings
- Regularly review and clean up unused files

---

## 9. Maintenance Scripts

- Located in `backend/scripts/`
- Common scripts:
  - `approveSubadmin.js`: Approve subadmin accounts
  - `backfillOrderShippingAddress.js`: Update missing shipping addresses
  - `generateSubadminToken.js`: Generate tokens for subadmins
- Run scripts with Node.js:
  ```
  node backend/scripts/approveSubadmin.js
  ```
- Read script comments for usage and required arguments
- Use scripts for data migration, fixing fields, or generating reports

---

## 10. Troubleshooting & FAQ

### A. Common Issues
- **Port Conflicts**: Use `netstat -ano | findstr :PORT` to find and kill conflicting processes
- **Build Errors**: Delete `node_modules` and reinstall dependencies
- **API Errors**: Check backend logs and ensure database is running
- **Login Issues**: Reset password via admin or check user status

### B. FAQ
- **How do I reset my password?**
  - Use the password reset feature or update via API
- **How do I add a new admin?**
  - Use the user management API or scripts to promote users
- **How do I change the database connection?**
  - Edit the `DB_URI` in your `.env` file

---

## 11. Security Best Practices

- Never commit `.env` or sensitive files to version control
- Use strong, unique passwords and rotate secrets regularly
- Restrict file upload types and sizes
- Regularly update dependencies (`npm update`)
- Monitor logs for suspicious activity
- Use HTTPS in production
- Limit admin access to trusted users

---

## 12. Support & Contact

- Refer to `README.md` in the `backend/` folder for more details
- Review code comments and in-app help sections (if available)
- For technical support, contact the backend development team or project maintainer
- Report bugs or request features via the project issue tracker

---

*This manual is intended to provide comprehensive guidance for backend administrators. For advanced configuration, refer to the codebase and consult with the backend development team as needed.*
