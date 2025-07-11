# APIhub Legacy Backend

A secure family-oriented application backend for managing family connections, communications, and media sharing with end-to-end encryption.

## Overview

APIhub Legacy is a Node.js backend service that provides secure family management functionality, including user authentication, family creation, and encrypted communication between family members. The application uses the Signal Protocol for end-to-end encrypted messaging.

## Features

- **User Management**
  - Member registration and authentication
  - Head of Family (HOF) registration and authentication
  - Email verification with OTP
  - Profile management

- **Family Management**
  - Create and manage family units
  - Add and remove family members
  - View family details based on user role (HOF or Member)

- **Secure Communication (work in progress)**
  - End-to-end encrypted messaging using the Signal Protocol
  - Secure key management and registration
  - Private family messaging

- **Media Sharing** (Coming Soon)
  - Encrypted media upload and sharing
  - Family-specific media galleries

## Technology Stack

- **Node.js** with **Express.js** framework
- **MongoDB** database with **Mongoose** ODM
- **JWT** for authentication
- **Signal Protocol** (@signalapp/libsignal-client) for end-to-end encryption
- **Cloudinary** for media storage
- **Nodemailer** for email services
- **Multer** for file uploads

## Project Structure

```
Backend/
├── public/              # Public assets
│   └── temp/            # Temporary file storage
├── src/
│   ├── app.js           # Express application setup
│   ├── constants.js     # Application constants
│   ├── index.js         # Application entry point
│   ├── controllers/     # Request handlers
│   ├── db/              # Database configuration
│   ├── middlewares/     # Express middlewares
│   ├── models/          # MongoDB schema models
│   ├── routes/          # API routes
│   └── utils/           # Utility functions and services
│       ├── ApiError.js
│       ├── ApiResponse.js
│       ├── asyncHandler.js
│       └── services/     # Core services
│           ├── crypto/   # Encryption services
│           ├── fileUpload/
│           ├── mail/     # Email services
│           └── otp/      # OTP generation and verification
```


## API Routes

### User Management
- `POST /legacy/api/v1/members/register-user` - Register a new family member
- `POST /legacy/api/v1/members/login-user` - Member login
- `POST /legacy/api/v1/members/complete-profile` - Complete member profile

### HOF Management
- `POST /legacy/api/v1/hof/register` - Register as Head of Family
- `POST /legacy/api/v1/hof/entry` - HOF login

### Family Management
- `POST /legacy/api/v1/family/create` - Create a new family
- `POST /legacy/api/v1/family/add-member/:userId` - Add member to family
- `POST /legacy/api/v1/family/remove-member/:userId` - Remove member from family
- `GET /legacy/api/v1/family/total-member` - Get total member count
- `GET /legacy/api/v1/family/get-all-members` - Get all family members
- `POST /legacy/api/v1/family/view-hof` - View family as HOF
- `POST /legacy/api/v1/family/view-member` - View family as member

### Verification
- `POST /legacy/api/v1/verify/send-otp` - Send verification OTP
- `POST /legacy/api/v1/verify/verify-otp` - Verify OTP
- `GET /legacy/api/v1/verify/status` - Check verification status

### Media & Messaging (E2E Encrypted) in development phase not completed
- `POST /media/keys/generate` - Generate Signal Protocol keys
- `POST /media/keys/register` - Register Signal Protocol keys
- `GET /media/keys/family/:familyId` - Get family Signal Protocol keys
- `POST /media/message/send` - Send encrypted message
- `GET /media/message/family/:familyId` - Get encrypted messages

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v5 or higher)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/APIhub-Legacy.git
cd APIhub-Legacy/Backend
```

2. Install Dependencies
```bash 
npm install
```
`npm warn deprecated (For a CapTP with native promises, see @endo/eventual-send and @endo/captp)
npm error code 1
npm error path G:\Project\APIhub-Legacy\Backend\node_modules\node-base64
npm error command failed
npm error command C:\Windows\system32\cmd.exe /d /s /c ./install.sh
npm error '.' is not recognized as an internal or external command,
npm error operable program or batch file.
`

## then try 
```bash
npm install --force
```

3. Create a `.env` file in the root directory with the following variables:

```bash 
PORT=3000 MONGODB_URI=mongodb://localhost:27017/apihub_legacy ACCESS_TOKEN_SECRET=your_secret_key_here ACCESS_TOKEN_EXPIRY=1d

Cloudinary Config
CLOUDINARY_CLOUD_NAME=your_cloud_name CLOUDINARY_API_KEY=your_api_key CLOUDINARY_API_SECRET=your_api_secret

Email Config
EMAIL_SERVICE=gmail FROM_EMAIL=your_email@gmail.com APP_PASSWORD=your_app_password
```

4. Start th server
```bash
npm run legacy
```

## Security Features

- Password hashing with bcrypt
- JWT-based authentication
- Email verification
- Rate limiting for verification attempts
- Signal Protocol for end-to-end encryption
- Secure file handling
- CORS protection
- Input validation and sanitization
- Protection against common web vulnerabilities

## Performance Features (added soon)
- Efficient database queries
- Response caching
- Optimized file handling
- Error logging and monitoring

## Future Roadmap
- Group chat functionality
- Event planning for families
- Shared calendars
- Family photo albums
- Emergency contacts and location sharing
- Cross-platform compatibility improvements

# Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Authors
- [Harsh Yadav](https://github.com/HarshYadav152) - <i>Initial work and maintenance</i>
- [H&V sync](https://github.com/HnVsync) - <i>Development and support.</i>

## License
This project is licensed under MIT [licence](https://github.com/HarshYadav152/APIhub-Legacy/blob/main/LICENSE)