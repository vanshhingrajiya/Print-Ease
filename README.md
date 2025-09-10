# Xerox Shop Management System

A complete web and mobile application system for Xerox shop management with customer ordering capabilities.

## Features

### Web App (Shop Owner)
- **Authentication**: Login/Register for shop owners
- **Shop Management**: Set up shop details, location, and contact information
- **Service Management**: Add, edit, and manage services with pricing
- **Order Management**: View and manage customer orders
- **Dashboard**: Overview of orders, revenue, and shop performance
- **Inventory Management**: Track available services and stock

### Mobile App (Customers)
- **User Authentication**: Login/Register for customers
- **Shop Discovery**: Find nearby Xerox shops
- **Service Selection**: Browse available services and pricing
- **PDF Upload**: Upload documents for printing
- **Online Payment**: Secure payment processing with Stripe
- **Order Tracking**: Real-time order status updates
- **Notifications**: Push notifications for order updates

## Technology Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose
- **JWT** for authentication
- **Stripe** for payment processing
- **Multer** for file uploads
- **Socket.io** for real-time notifications

### Web App
- **React.js** with React Router
- **Tailwind CSS** for styling
- **Axios** for API calls
- **React Hook Form** for form management

### Mobile App
- **React Native** with Expo
- **React Navigation** for navigation
- **React Native Paper** for UI components
- **Expo Notifications** for push notifications
- **React Native Maps** for location services

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB
- Expo CLI (for mobile app)
- Stripe account (for payments)

### Backend Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   Create a `.env` file in the root directory:
   ```env
   MONGODB_URI=mongodb://localhost:27017/xerox-shop
   JWT_SECRET=your_jwt_secret_key_here
   STRIPE_SECRET_KEY=your_stripe_secret_key_here
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_email_password
   ```

3. **Start the server**:
   ```bash
   npm start
   ```

### Web App Setup

1. **Navigate to web app directory**:
   ```bash
   cd web-app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm start
   ```

### Mobile App Setup

1. **Navigate to mobile app directory**:
   ```bash
   cd mobile-app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the Expo development server**:
   ```bash
   npm start
   ```

4. **Run on device/emulator**:
   ```bash
   npm run android  # For Android
   npm run ios      # For iOS
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Shops
- `GET /api/shops` - Get all shops
- `GET /api/shops/:id` - Get shop details
- `POST /api/shops` - Create shop (shop owner only)
- `PUT /api/shops/:id` - Update shop
- `POST /api/shops/:id/services` - Add service to shop
- `PUT /api/shops/:id/services/:serviceId` - Update service
- `DELETE /api/shops/:id/services/:serviceId` - Delete service

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders/customer/my-orders` - Get customer orders
- `GET /api/orders/shop/my-orders` - Get shop orders
- `PUT /api/orders/:id/status` - Update order status
- `GET /api/orders/:id` - Get order details

### Payments
- `POST /api/payments/create-payment-intent` - Create payment intent
- `POST /api/payments/confirm-payment` - Confirm payment
- `GET /api/payments/status/:orderId` - Get payment status

### Notifications
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark notification as read
- `PUT /api/notifications/mark-all-read` - Mark all notifications as read
- `GET /api/notifications/unread-count` - Get unread count

## Usage

### For Shop Owners (Web App)

1. **Register/Login**: Create an account or sign in
2. **Shop Setup**: Complete your shop profile with location and contact details
3. **Add Services**: Define your services with pricing (e.g., B&W Print ₹2/page, Color Print ₹5/page)
4. **Manage Orders**: View incoming orders and update their status
5. **Track Performance**: Monitor your shop's performance through the dashboard

### For Customers (Mobile App)

1. **Register/Login**: Create an account or sign in
2. **Find Shops**: Browse nearby Xerox shops
3. **Select Services**: Choose the services you need
4. **Upload Documents**: Upload PDF files for printing
5. **Make Payment**: Pay securely online
6. **Track Orders**: Monitor your order status and receive notifications

## File Structure

```
xerox-shop-system/
├── models/                 # Database models
├── routes/                 # API routes
├── web-app/               # React web application
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── contexts/      # React contexts
│   │   └── ...
├── mobile-app/            # React Native mobile app
│   ├── src/
│   │   ├── screens/       # Screen components
│   │   ├── contexts/      # React contexts
│   │   └── ...
├── server.js              # Main server file
├── package.json           # Backend dependencies
└── README.md
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, email support@xeroxshop.com or create an issue in the repository.

