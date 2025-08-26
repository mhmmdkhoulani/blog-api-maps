# Blog API

A comprehensive Express.js blog API with authentication, authorization, and full CRUD functionality for managing blog posts, comments, categories, and tags.

## Features

- 🔐 **JWT Authentication & Authorization**

  - User registration and login
  - Role-based access control (admin, editor, user)
  - Password hashing with bcrypt
  - Protected routes with middleware

- 📝 **Blog Management**

  - CRUD operations for posts, comments, categories, and tags
  - Rich post model with author, category, tags, and metadata
  - Comment system with replies and moderation
  - Post likes and view tracking

- 🔍 **Search & Filtering**

  - Full-text search on posts
  - Pagination support
  - Filter by category, tags, author, status
  - Sort by date, popularity, likes

- 👥 **User Management**

  - Admin panel for user management
  - User profiles with avatar and bio
  - Account activation/deactivation

- 📊 **Analytics & Stats**

  - Post statistics and analytics
  - Category and tag usage statistics
  - Popular content tracking

- 📚 **API Documentation**

  - Complete Swagger/OpenAPI documentation
  - Interactive API explorer
  - Detailed endpoint descriptions

- ✅ **Validation & Error Handling**

  - Input validation with express-validator
  - Global error handling middleware
  - Proper HTTP status codes

- 🛡️ **Security Features**
  - Helmet.js for security headers
  - Rate limiting
  - CORS configuration
  - Input sanitization

## Quick Start

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud)
- npm or yarn

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd blog-api
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment setup**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your configuration:

   ```env
   PORT=3000
   NODE_ENV=development
   MONGO_URI=mongodb://localhost:27017/blog-api
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRE=7d
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   ```

4. **Seed the database**

   ```bash
   npm run seed
   ```

5. **Start the server**

   ```bash
   # Development mode with nodemon
   npm run dev

   # Production mode
   npm start
   ```

6. **Access the API**
   - API Base URL: `http://localhost:3000`
   - Documentation: `http://localhost:3000/api-docs`
   - Health Check: `http://localhost:3000/health`

## Default Login Credentials

After running the seed script, you can log in with:

- **Admin**: `admin@blogapi.com` / `Admin123`
- **Editor**: `editor@blogapi.com` / `Editor123`
- **User**: `user@blogapi.com` / `User123`

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password

### User Management (Admin only)

- `GET /api/users` - Get all users
- `POST /api/users` - Create user
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `PUT /api/users/:id/toggle-status` - Toggle user status

### Posts

- `GET /api/posts` - Get all posts
- `POST /api/posts` - Create post (Editor/Admin)
- `GET /api/posts/:id` - Get single post
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post
- `PUT /api/posts/:id/like` - Like/unlike post
- `GET /api/posts/:id/related` - Get related posts
- `GET /api/posts/stats` - Get post statistics (Admin/Editor)

### Comments

- `GET /api/posts/:postId/comments` - Get comments for post
- `POST /api/posts/:postId/comments` - Create comment
- `GET /api/comments` - Get all comments (Admin/Editor)
- `GET /api/comments/:id` - Get single comment
- `PUT /api/comments/:id` - Update comment
- `DELETE /api/comments/:id` - Delete comment
- `PUT /api/comments/:id/like` - Like/unlike comment
- `PUT /api/comments/:id/moderate` - Moderate comment (Admin/Editor)

### Categories

- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create category (Editor/Admin)
- `GET /api/categories/:id` - Get single category
- `PUT /api/categories/:id` - Update category (Editor/Admin)
- `DELETE /api/categories/:id` - Delete category (Admin)
- `GET /api/categories/stats` - Get category statistics (Admin/Editor)

### Tags

- `GET /api/tags` - Get all tags
- `POST /api/tags` - Create tag (Editor/Admin)
- `GET /api/tags/:id` - Get single tag
- `PUT /api/tags/:id` - Update tag (Editor/Admin)
- `DELETE /api/tags/:id` - Delete tag (Admin)
- `GET /api/tags/popular` - Get popular tags
- `GET /api/tags/stats` - Get tag statistics (Admin/Editor)

## Role Permissions

### Admin

- Full access to all endpoints
- User management
- Delete any content
- View all statistics

### Editor

- Create and edit posts
- Moderate comments
- Manage categories and tags
- View content statistics
- Cannot manage users

### User

- Read published posts
- Create and edit own comments
- Like posts and comments
- Update own profile

## Project Structure

```
blog-api/
├── config/
│   ├── database.js          # MongoDB connection
│   └── swagger.js           # Swagger documentation setup
├── controllers/
│   ├── authController.js    # Authentication logic
│   ├── userController.js    # User management
│   ├── postController.js    # Post operations
│   ├── commentController.js # Comment operations
│   ├── categoryController.js# Category operations
│   └── tagController.js     # Tag operations
├── middlewares/
│   ├── auth.js              # Authentication middleware
│   ├── error.js             # Global error handler
│   ├── async.js             # Async error wrapper
│   └── validation.js        # Input validation rules
├── models/
│   ├── User.js              # User model
│   ├── Post.js              # Post model
│   ├── Comment.js           # Comment model
│   ├── Category.js          # Category model
│   └── Tag.js               # Tag model
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── users.js             # User management routes
│   ├── posts.js             # Post routes
│   ├── comments.js          # Comment routes
│   ├── categories.js        # Category routes
│   └── tags.js              # Tag routes
├── scripts/
│   └── seed.js              # Database seeding script
├── .env.example             # Environment variables template
├── package.json             # Dependencies and scripts
├── server.js                # Main application file
└── README.md                # This file
```

## Technologies Used

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: express-validator
- **Documentation**: Swagger/OpenAPI
- **Security**: Helmet.js, bcryptjs, rate limiting
- **Development**: Nodemon for auto-reload

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@blogapi.com or create an issue in the repository.
