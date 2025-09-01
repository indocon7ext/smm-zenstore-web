# 🗄️ Database Setup Guide

## 📋 **Current Issue**
The database migration failed because the `DATABASE_URL` environment variable is missing.

## 🔧 **Step-by-Step Setup**

### **Step 1: Create Backend Environment File**

Create `backend/.env` file with the following content:

```env
# Database Configuration
DATABASE_URL="postgresql://postgres:password@localhost:5432/smm_platform"

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-jwt-secret-key-here

# API Configuration
API_BASE_URL=http://localhost:5000
```

### **Step 2: Create Frontend Environment File**

Create `frontend/.env.local` file with the following content:

```env
# NextAuth.js Configuration
NEXTAUTH_URL=http://localhost:3002
NEXTAUTH_SECRET=your-nextauth-secret-key-here

# Google OAuth Configuration (Get these from Google Cloud Console)
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here

# Database Configuration (Same as backend)
DATABASE_URL="postgresql://postgres:password@localhost:5432/smm_platform"
```

### **Step 3: PostgreSQL Setup in Laragon**

1. **Install PostgreSQL** in Laragon:
   - Open Laragon
   - Go to "Menu" → "PostgreSQL" → "Install"
   - Wait for installation to complete

2. **Start PostgreSQL**:
   - In Laragon, click "Start All"
   - Or manually start PostgreSQL

3. **Create Database**:
   - Open pgAdmin or use command line
   - Create database: `smm_platform`
   - Default user: `postgres`
   - Default password: `password` (or your custom password)

### **Step 4: Update Database URL**

If your PostgreSQL has different credentials, update the `DATABASE_URL` in both environment files:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/smm_platform"
```

### **Step 5: Run Database Migration**

After creating the environment files, run:

```bash
npm run db:migrate
```

### **Step 6: Test the Setup**

1. **Start the servers**:
   ```bash
   npm run dev
   ```

2. **Check if everything works**:
   - Frontend: `http://localhost:3002`
   - Backend: `http://localhost:5000/health`

## 🚨 **Important Notes**

### **Database Credentials**
- **Default PostgreSQL user**: `postgres`
- **Default password**: `password` (or check your Laragon settings)
- **Default port**: `5432`
- **Database name**: `smm_platform`

### **Environment Variables**
- Never commit `.env` files to version control
- Use strong secrets for production
- Keep your Google OAuth credentials secure

### **Common Issues**
1. **PostgreSQL not running**: Make sure Laragon is started
2. **Wrong credentials**: Check your PostgreSQL username/password
3. **Port conflicts**: Make sure port 5432 is available
4. **Database doesn't exist**: Create the `smm_platform` database first

## 🎯 **Next Steps After Setup**

1. ✅ Create environment files
2. ✅ Set up PostgreSQL database
3. ✅ Run database migration
4. ✅ Test authentication system
5. ✅ Set up Google OAuth credentials

---

**Status**: ⏳ **Waiting for environment setup**  
**Next**: Database migration and testing
