# Xerox Shop System - Setup Instructions

## Quick Start Guide

### 1. Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud)
- Expo CLI: `npm install -g @expo/cli`
- Git

### 2. Installation

#### Clone and Setup Backend
```bash
# Install backend dependencies
npm install

# Create .env file (copy from config.js and update values)
# Set up your MongoDB connection string
# Add your Stripe keys for payments
# Add Cloudinary credentials for image uploads
```

#### Setup Web App
```bash
cd web-app
npm install
```

#### Setup Mobile App
```bash
cd mobile-app
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory with:

```env
MONGODB_URI=mongodb://localhost:27017/xerox-shop
JWT_SECRET=your_super_secret_jwt_key_here
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password
```

### 4. Running the Applications

#### Start Backend Server
```bash
# From root directory
npm start
# Server runs on http://localhost:5000
```

#### Start Web App
```bash
# From web-app directory
npm start
# Web app runs on http://localhost:3000
```

#### Start Mobile App
```bash
# From mobile-app directory
npm start
# Follow Expo instructions to run on device/emulator
```

### 5. Testing the System

#### For Shop Owners (Web App):
1. Go to http://localhost:3000
2. Register as a shop owner
3. Set up your shop details
4. Add services with pricing
5. Manage incoming orders

#### For Customers (Mobile App):
1. Install Expo Go app on your phone
2. Scan QR code from terminal
3. Register as a customer
4. Browse nearby shops
5. Place orders and make payments

### 6. Key Features

#### Web App Features:
- ✅ Shop owner authentication
- ✅ Shop setup and management
- ✅ Service pricing configuration
- ✅ Order management dashboard
- ✅ Real-time order tracking
- ✅ Revenue analytics

#### Mobile App Features:
- ✅ Customer authentication
- ✅ Shop discovery and search
- ✅ Service selection
- ✅ PDF document upload
- ✅ Online payment processing
- ✅ Order tracking
- ✅ Push notifications

### 7. API Endpoints

The system provides RESTful APIs for:
- User authentication (`/api/auth`)
- Shop management (`/api/shops`)
- Order processing (`/api/orders`)
- Payment handling (`/api/payments`)
- Notifications (`/api/notifications`)

### 8. Database Schema

The system uses MongoDB with the following collections:
- **Users**: Shop owners and customers
- **Shops**: Shop information and services
- **Orders**: Customer orders and status
- **Notifications**: Push notifications

### 9. Payment Integration

The system integrates with Stripe for secure online payments:
- Payment intents for order processing
- Webhook handling for payment confirmations
- Support for multiple payment methods

### 10. File Upload

- PDF documents for printing orders
- Service images for shop owners
- Cloudinary integration for file storage

### 11. Troubleshooting

#### Common Issues:

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check connection string in .env

2. **Payment Issues**
   - Verify Stripe keys are correct
   - Check Stripe dashboard for test mode

3. **File Upload Problems**
   - Verify Cloudinary credentials
   - Check file size limits

4. **Mobile App Not Loading**
   - Ensure Expo CLI is installed
   - Check network connectivity
   - Try clearing Expo cache

### 12. Production Deployment

#### Backend:
- Deploy to Heroku, AWS, or DigitalOcean
- Set up MongoDB Atlas for database
- Configure environment variables

#### Web App:
- Build with `npm run build`
- Deploy to Netlify, Vercel, or AWS S3

#### Mobile App:
- Build with Expo Application Services (EAS)
- Deploy to App Store and Google Play

### 13. Support

For technical support or questions:
- Check the README.md for detailed documentation
- Review the API documentation in the routes folder
- Create an issue in the repository

---

**Note**: This is a complete production-ready system. Make sure to:
- Use strong JWT secrets in production
- Set up proper SSL certificates
- Configure proper CORS settings
- Use environment-specific database connections
- Set up proper logging and monitoring

