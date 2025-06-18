# MiniSentry

A comprehensive error tracking and monitoring system built as a Sentry clone, featuring a Go backend with PostgreSQL and a React frontend. MiniSentry provides real-time error monitoring, issue management, and performance tracking for JavaScript applications.

## 🚀 Features

- **Real-time Error Tracking**: Capture and group errors automatically
- **Issue Management**: Resolve, ignore, and assign errors to team members
- **User Authentication**: Secure JWT-based authentication system
- **Multi-tenant Architecture**: Organizations and projects with role-based access
- **Modern UI**: Responsive React dashboard with real-time updates
- **Sentry-compatible API**: Drop-in replacement for Sentry SDK endpoints
- **Performance Monitoring**: Track page loads and custom metrics
- **Search & Filtering**: Advanced filtering and full-text search
- **Bulk Operations**: Handle multiple issues efficiently

## 🏗️ Architecture

- **Backend**: Go with Chi router, GORM, PostgreSQL, Redis
- **Frontend**: React 18, TanStack Router/Query, Tailwind CSS
- **Database**: PostgreSQL 15+ with Redis for caching
- **Deployment**: Docker Compose for development and production

## 🚀 Quick Start

### Prerequisites

- **Docker and Docker Compose** (recommended)
- **Go 1.21+** (for local development)
- **Node.js 18+** (for local development)
- **PostgreSQL 15+** (if running without Docker)
- **Redis** (optional, for caching)

### 1. Clone and Setup

```bash
git clone <repository>
cd minisentry
cp .env.example .env
```

### 2. Start with Docker (Recommended)

```bash
# Start all services (backend, frontend, database, redis)
make dev

# Or start in detached mode
make up
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **Database**: localhost:5433

### 3. Create Your First User

1. Open http://localhost:3000 in your browser
2. Click "Register" and create an account
3. Create an organization
4. Create a project and get your DSN

### 4. Test Error Reporting

Open the included example client:
```bash
open examples/js-client.html
```

Configure it with your project DSN and start sending test errors!

## 📖 Usage Guide

### Creating Your First Project

1. **Register/Login**: Create an account at http://localhost:3000
2. **Create Organization**: Set up your team or company organization
3. **Create Project**: Add a project for your application
4. **Get DSN**: Copy the Data Source Name from project settings
5. **Integrate SDK**: Use the DSN to send errors from your application

### Sending Errors

#### Using the Test Client

1. Open `examples/js-client.html` in a browser
2. Enter your project DSN
3. Click "Initialize MiniSentry SDK"
4. Trigger various error types using the buttons

#### Using JavaScript SDK

```javascript
// Initialize MiniSentry
const MiniSentry = {
    dsn: 'http://localhost:8080/api/your-project-id/store/',
    
    init(config) {
        this.dsn = config.dsn;
        this.setupGlobalHandlers();
    },
    
    captureException(error) {
        // Send error to MiniSentry
        fetch(this.dsn, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this.createErrorEvent(error))
        });
    }
};

// Initialize
MiniSentry.init({
    dsn: 'your-dsn-here',
    environment: 'production',
    release: '1.0.0'
});

// Manual error capture
try {
    riskyOperation();
} catch (error) {
    MiniSentry.captureException(error);
}
```

### Managing Issues

1. **View Issues**: Browse errors in the dashboard
2. **Filter**: Use status, level, environment filters
3. **Resolve**: Mark issues as resolved when fixed
4. **Assign**: Assign issues to team members
5. **Bulk Actions**: Handle multiple issues at once

## 🛠️ Development

### Available Commands

```bash
make help          # Show all available commands
make dev           # Start development environment with hot reload
make up            # Start all services in detached mode
make down          # Stop all services
make clean         # Clean containers and volumes
make test          # Run all tests
make logs          # Show logs from all services
make backend       # Start only backend services
make frontend      # Start only frontend
make db-up         # Start only database services
```

### Project Structure

```
minisentry/
├── backend/                 # Go backend API
│   ├── cmd/server/         # Main application entry point
│   ├── internal/           # Internal packages
│   │   ├── config/        # Configuration management
│   │   ├── database/      # Database connection & migrations
│   │   ├── models/        # Data models (User, Organization, etc.)
│   │   ├── services/      # Business logic layer
│   │   ├── handlers/      # HTTP handlers/controllers
│   │   ├── middleware/    # HTTP middleware (auth, CORS, etc.)
│   │   └── dto/           # Data Transfer Objects
│   ├── migrations/        # SQL database migrations
│   └── test/             # Backend tests
├── frontend/              # React frontend dashboard
│   ├── src/
│   │   ├── components/   # Reusable React components
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utilities (API client, auth)
│   │   ├── stores/       # State management
│   │   ├── types/        # TypeScript type definitions
│   │   └── routes/       # Routing configuration
│   └── tests/            # Frontend tests
├── examples/              # SDK examples and demos
├── docker-compose.yml     # Development environment
├── test-integration.js    # End-to-end integration tests
└── Makefile              # Build and development commands
```

### Running Tests

```bash
# Run integration tests
npm install axios  # Install required dependency
node test-integration.js

# Run backend tests
make test
cd backend && go test -v ./...

# Run frontend tests
cd frontend && npm test
```

## 🌐 API Reference

### Authentication Endpoints

```
POST   /api/v1/auth/register    - User registration
POST   /api/v1/auth/login       - User login
POST   /api/v1/auth/refresh     - Refresh JWT token
POST   /api/v1/auth/logout      - User logout
GET    /api/v1/auth/profile     - Get user profile
PUT    /api/v1/auth/profile     - Update user profile
```

### Organization Management

```
GET    /api/v1/organizations              - List user organizations
POST   /api/v1/organizations              - Create organization
GET    /api/v1/organizations/{id}         - Get organization details
PUT    /api/v1/organizations/{id}         - Update organization
DELETE /api/v1/organizations/{id}         - Delete organization
GET    /api/v1/organizations/{id}/members - List members
POST   /api/v1/organizations/{id}/members - Add member
```

### Project Management

```
GET    /api/v1/organizations/{org_id}/projects           - List projects
POST   /api/v1/organizations/{org_id}/projects           - Create project
GET    /api/v1/projects/{id}                            - Get project details
PUT    /api/v1/projects/{id}                            - Update project
DELETE /api/v1/projects/{id}                            - Delete project
POST   /api/v1/projects/{id}/keys/regenerate             - Regenerate DSN
```

### Issue Management

```
GET    /api/v1/projects/{id}/issues                     - List issues with filters
GET    /api/v1/projects/{id}/issues/stats               - Get issue statistics
GET    /api/v1/issues/{id}                              - Get issue details
PUT    /api/v1/issues/{id}                              - Update issue
POST   /api/v1/issues/{id}/comments                     - Add comment
GET    /api/v1/issues/{id}/comments                     - List comments
POST   /api/v1/issues/bulk-update                       - Bulk update issues
```

### Error Ingestion (Sentry Compatible)

```
POST   /api/{project_id}/store/                         - Store error event
GET    /api/v1/errors/stats                             - Get error statistics
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file (see `.env.example` for all options):

```bash
# Database
DATABASE_URL=postgres://postgres:password@localhost:5433/minisentry?sslmode=disable

# Redis (optional)
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=your-256-bit-secret-key-here
JWT_ISSUER=minisentry

# Server Configuration
HOST=0.0.0.0
PORT=8080
FRONTEND_URL=http://localhost:3000

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Database Setup

The database is automatically set up when using Docker Compose. For manual setup:

```bash
# Create database
createdb minisentry

# Run migrations (handled automatically by the application)
# Migrations are in backend/migrations/
```

## 🚀 Production Deployment

### Using Docker Compose

1. Copy `docker-compose.prod.yml` to your server
2. Create production `.env` file with secure secrets
3. Deploy:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Manual Deployment

1. **Build Backend**:
   ```bash
   cd backend
   CGO_ENABLED=0 GOOS=linux go build -o bin/server ./cmd/server
   ```

2. **Build Frontend**:
   ```bash
   cd frontend
   npm run build
   ```

3. **Set up Database**: PostgreSQL 15+ with the required schema
4. **Configure Environment**: Set production environment variables
5. **Run**: Deploy binaries with proper process management

## 🧪 Testing

### Integration Testing

Run the comprehensive integration test suite:

```bash
# Install dependencies
npm install axios

# Make sure services are running
make up

# Run integration tests
node test-integration.js
```

The integration tests cover:
- User registration and authentication
- Organization and project creation
- Error ingestion and processing
- Issue management and filtering
- Bulk operations
- API endpoint functionality

### Manual Testing

1. **Start Services**: `make dev`
2. **Open Test Client**: Open `examples/js-client.html`
3. **Configure DSN**: Enter your project DSN
4. **Trigger Errors**: Use the various error trigger buttons
5. **Check Dashboard**: View errors in the web interface

## 🐛 Troubleshooting

### Common Issues

**Database Connection Failed**
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check database logs
make logs-backend

# Reset database
make clean && make up
```

**Frontend Not Loading**
```bash
# Check if frontend is running
curl http://localhost:3000

# Check frontend logs
make logs-frontend

# Rebuild frontend
cd frontend && npm run build
```

**API Errors**
```bash
# Check backend logs
make logs-backend

# Test API directly
curl http://localhost:8080/health

# Check environment variables
cat .env
```

**Docker Issues**
```bash
# Clean up Docker resources
make clean

# Rebuild everything
make build && make up

# Check Docker logs
docker-compose logs
```

### Performance Issues

- **Slow Queries**: Check database indexes in `backend/migrations/`
- **Memory Usage**: Monitor with `docker stats`
- **High Error Volume**: Consider implementing rate limiting

### Getting Help

1. Check the logs: `make logs`
2. Run integration tests: `node test-integration.js`
3. Check the [Architecture documentation](ARCHITECTURE.md)
4. Create an issue with reproduction steps

## 📚 Documentation

- [Architecture Overview](ARCHITECTURE.md) - Detailed system design
- [Development Guide](DEVELOPMENT.md) - Contributing and development workflow
- [API Documentation](ARCHITECTURE.md#api-design) - Complete API reference
- [Frontend Documentation](frontend/README.md) - Frontend architecture

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes
4. Run tests: `make test && node test-integration.js`
5. Commit changes: `git commit -am 'Add new feature'`
6. Push: `git push origin feature/new-feature`
7. Create a Pull Request

## 📄 License

ISC License - see LICENSE file for details.