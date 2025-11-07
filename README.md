# Solar Energy Monitoring System - Backend API

Main API service for the Solar Energy Monitoring System with AWS IoT integration.

## 🚀 Quick Start

### Prerequisites
- Node.js 20.x or higher
- PostgreSQL 15+ (local or AWS RDS)
- AWS Account (for IoT Core integration)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment file and configure
cp .env.example .env
# Edit .env with your actual values

# Generate Prisma Client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Seed database with mock data
npm run prisma:seed

# Start development server
npm run dev
```

The API will be running at `http://localhost:3000`

## 📁 Project Structure

```
/backend
  /src
    /modules/aws-iot/        ← Isolated AWS IoT Module
    /config/                 ← Configuration files
    /middlewares/            ← Express middlewares
    /controllers/            ← Route controllers
    /services/               ← Business logic
    /routes/                 ← API routes
    /utils/                  ← Utility functions
  /prisma
    /seeds/                  ← Mock data seed files
    - schema.prisma          ← Database schema
  /mock-data
    - db.json                ← JSON Server format (optional)
```

## 🔧 Available Scripts

- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio (database GUI)
- `npm run prisma:seed` - Seed database with mock data
- `npm run prisma:reset` - Reset database and reseed
- `npm test` - Run tests
- `npm run lint` - Lint code
- `npm run format` - Format code with Prettier

## 🎭 Mock Data Mode

The backend supports development with mock data before the MQTT pipeline is ready.

### Enable Mock Data

```bash
# In .env file
USE_MOCK_DATA=true
GENERATE_MOCK_REALTIME=true
```

### Mock Data Includes

- 3 users (admin@solar.com, manager@solar.com, viewer@solar.com)
- 5 solar plants (Indian locations)
- 50+ devices with hierarchies
- 7 days of simulated MQTT data
- 50+ alarms

### Default Login Credentials (Development Only)

```
Admin:
  Email: admin@solar.com
  Password: Admin123!

Manager:
  Email: manager@solar.com
  Password: Manager123!

Viewer:
  Email: viewer@solar.com
  Password: Viewer123!
```

## 🔌 API Endpoints

### Health Check
- `GET /health` - Server health check

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh token

### Plants
- `GET /api/plants` - List all plants
- `POST /api/plants` - Create plant (with IoT provisioning)
- `GET /api/plants/:id` - Get plant details
- `PUT /api/plants/:id` - Update plant
- `DELETE /api/plants/:id` - Delete plant (with IoT cleanup)

See [EXECUTION_PLAN.md](../EXECUTION_PLAN.md) for complete API documentation.

## 🗄️ Database

### Setup PostgreSQL

```bash
# Using Docker
docker run --name solar-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=solar_energy \
  -p 5432:5432 \
  -d postgres:15

# Or install PostgreSQL locally
```

### Update DATABASE_URL

```
DATABASE_URL="postgresql://username:password@localhost:5432/solar_energy?schema=public"
```

### Run Migrations

```bash
npm run prisma:migrate
```

## ☁️ AWS IoT Setup

The backend provisions AWS IoT Things automatically when plants are created.

### Required AWS Services
- AWS IoT Core
- AWS SQS (FIFO queue)
- IAM Role (IoT to SQS)

See [MQTT_SETUP_GUIDE.md](../MQTT_SETUP_GUIDE.md) for detailed setup.

### Environment Variables

```bash
AWS_IOT_ENDPOINT=xxx.iot.us-east-1.amazonaws.com
AWS_SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/.../solar-plant-data-queue.fifo
```

## 🔐 Security

- JWT-based authentication
- bcrypt password hashing
- Helmet security headers
- CORS configuration
- Rate limiting
- Input validation (Zod)
- SQL injection protection (Prisma)

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage
```

## 📊 Monitoring

- Winston logging
- Morgan HTTP logging
- Health check endpoint
- Error tracking

## 🚀 Deployment

### Environment Variables

Ensure all production environment variables are set:
- Strong JWT secrets
- Production database URL
- AWS credentials
- `USE_MOCK_DATA=false` for production

### Build

```bash
npm install --production
npm run prisma:generate
```

### Start

```bash
NODE_ENV=production npm start
```

## 📝 Development Notes

- This backend uses Prisma ORM for database operations
- AWS IoT module is isolated in `/src/modules/aws-iot`
- All passwords are hashed with bcrypt
- JWT tokens expire after 24 hours (configurable)
- Mock data allows frontend development before MQTT pipeline is ready

## 🔗 Related Documentation

- [EXECUTION_PLAN.md](../EXECUTION_PLAN.md) - Complete project plan
- [MQTT_SETUP_GUIDE.md](../MQTT_SETUP_GUIDE.md) - MQTT pipeline setup
- [MOCK_DATA_SPECIFICATION.md](../MOCK_DATA_SPECIFICATION.md) - Mock data details

## 📄 License

ISC
