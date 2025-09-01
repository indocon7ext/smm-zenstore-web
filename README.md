# SMM Web App - Social Media Marketing Platform

A production-ready social media marketing (SMM) web application built with Next.js 14, Express.js, PostgreSQL, and Prisma. This platform allows users to purchase social media services like Instagram likes, Twitter followers, TikTok views, and more.

## 🚀 Features

### Core Features
- **User Authentication & Authorization** - Secure login/register with role-based access (Admin, Reseller, Customer)
- **Product Management** - CRUD operations for SMM services with flexible pricing packages
- **Order System** - Complete order lifecycle from creation to completion
- **Payment Integration** - Indonesian payment gateways (Midtrans & Xendit)
- **External API Integration** - Dynamic import of services from external SMM providers
- **Real-time Notifications** - Order updates and system notifications
- **Dashboard Analytics** - Comprehensive statistics and reporting

### Technical Features
- **Modern UI/UX** - Built with TailwindCSS and shadcn/ui components
- **Responsive Design** - Mobile-first approach with excellent mobile experience
- **SEO Optimized** - Meta tags, structured data, and performance optimizations
- **Type Safety** - Full TypeScript implementation
- **Database** - PostgreSQL with Prisma ORM
- **API Security** - JWT authentication, rate limiting, and input validation
- **Payment Security** - Secure payment processing with webhook validation

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **TailwindCSS** - Utility-first CSS framework
- **shadcn/ui** - Modern component library
- **React Query** - Server state management
- **Zustand** - Client state management
- **Framer Motion** - Animations
- **React Hook Form** - Form handling
- **Zod** - Schema validation

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **Prisma** - Database ORM
- **PostgreSQL** - Primary database
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Express Validator** - Input validation
- **Midtrans & Xendit** - Payment gateways

### DevOps
- **Docker** - Containerization
- **Vercel** - Frontend deployment
- **Railway/Render** - Backend deployment
- **GitHub Actions** - CI/CD

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- PostgreSQL 12+
- npm or yarn

### Quick Start

1. **Clone the repository**
```bash
git clone <repository-url>
cd smm-web-app
```

2. **Install dependencies**
```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend && npm install

# Install backend dependencies
cd ../backend && npm install
```

3. **Environment Setup**
```bash
# Copy environment files
cp .env.example .env
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
```

4. **Database Setup**
```bash
# Generate Prisma client
npm run db:generate

# Push database schema
npm run db:push

# (Optional) Run migrations
npm run db:migrate
```

5. **Start Development Servers**
```bash
# Start both frontend and backend
npm run dev

# Or start individually
npm run dev:frontend  # Frontend on http://localhost:3000
npm run dev:backend   # Backend on http://localhost:5000
```

## 🔧 Configuration

### Environment Variables

#### Root (.env)
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/smm_web_app"

# JWT
JWT_SECRET="your-jwt-secret-key-here"

# Backend API
BACKEND_URL="http://localhost:5000"
API_SECRET="your-api-secret-key-here"
```

#### Frontend (.env.local)
```env
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_BACKEND_URL="http://localhost:5000"
```

#### Backend (.env)
```env
# Payment Gateways
MIDTRANS_SERVER_KEY="your-midtrans-server-key"
MIDTRANS_CLIENT_KEY="your-midtrans-client-key"
XENDIT_SECRET_KEY="your-xendit-secret-key"

# Email (Optional)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-email-password"
```

## 📁 Project Structure

```
smm-web-app/
├── frontend/                 # Next.js frontend
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   ├── components/      # React components
│   │   │   ├── ui/         # shadcn/ui components
│   │   │   └── ...
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility functions
│   │   └── types/          # TypeScript types
│   ├── public/             # Static assets
│   └── ...
├── backend/                 # Express.js backend
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Express middleware
│   │   ├── utils/          # Utility functions
│   │   └── ...
│   ├── prisma/             # Database schema
│   └── ...
├── package.json            # Root package.json
└── README.md
```

## 🚀 Deployment

### Frontend (Vercel)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Backend (Railway/Render)
1. Connect your GitHub repository
2. Set environment variables
3. Configure build command: `npm run build:backend`
4. Set start command: `npm run start:backend`

### Database (PostgreSQL)
- **Development**: Local PostgreSQL instance
- **Production**: Railway, Supabase, or AWS RDS

## 🔐 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - bcryptjs for password security
- **Rate Limiting** - Prevent abuse and DDoS attacks
- **Input Validation** - Server-side validation with express-validator
- **CORS Protection** - Configured CORS policies
- **Helmet.js** - Security headers
- **SQL Injection Protection** - Prisma ORM prevents SQL injection
- **XSS Protection** - Input sanitization and output encoding

## 📊 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/me` - Update user profile

### Product Endpoints
- `GET /api/products` - Get all products
- `POST /api/products` - Create product (Admin)
- `PUT /api/products/:id` - Update product (Admin)
- `DELETE /api/products/:id` - Delete product (Admin)

### Order Endpoints
- `GET /api/orders` - Get user orders
- `POST /api/orders` - Create new order
- `PATCH /api/orders/:id/status` - Update order status (Admin)

### Payment Endpoints
- `POST /api/payments/deposit/midtrans` - Create Midtrans deposit
- `POST /api/payments/deposit/xendit` - Create Xendit deposit
- `GET /api/payments/transactions` - Get user transactions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@smmwebapp.com or join our Discord server.

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for the beautiful component library
- [Vercel](https://vercel.com/) for the amazing Next.js framework
- [Prisma](https://prisma.io/) for the excellent database ORM
- [TailwindCSS](https://tailwindcss.com/) for the utility-first CSS framework

---

**Made with ❤️ by the SMM Web App Team** 