# DataTrace - Privacy Data Removal Service

A comprehensive web application for searching and removing personal data from various Telegram bot services. This service helps users identify where their personal information might be stored and provides step-by-step instructions for data removal.

## 🚀 Features

- **Multi-Bot Search**: Search across 5 different Telegram bot APIs simultaneously
- **Data Type Support**: Phone numbers, emails, INN, SNILS, passport numbers
- **Privacy Protection**: Bot names are encrypted to protect service identities
- **Step-by-Step Instructions**: Detailed removal instructions for each bot
- **Real-time Monitoring**: Performance monitoring and health checks
- **Security First**: PII sanitization, rate limiting, and data encryption
- **Responsive UI**: Modern React interface with TypeScript

## 🏗️ Architecture

### Backend (Node.js + TypeScript)
- **Express.js** API server with comprehensive middleware
- **API Clients** for 5 different bot services (Dyxless, ITP, LeakOsint, Userbox, Vektor)
- **Search Service** with parallel processing and error recovery
- **Security Middleware** with PII sanitization and rate limiting
- **Monitoring System** with real-time metrics and alerting
- **Instruction Generator** with encrypted bot name support

### Frontend (React + TypeScript)
- **Search Interface** with validation for different data types
- **Results Display** with encrypted bot names and removal buttons
- **Instructions Page** with step-by-step removal guides
- **Monitoring Dashboard** for system health and performance
- **Responsive Design** optimized for all devices

## 🛠️ Technology Stack

### Backend
- Node.js 18+
- TypeScript
- Express.js
- Winston (logging)
- Jest (testing)
- Docker

### Frontend
- React 18
- TypeScript
- CSS3 with responsive design
- Axios for API calls

### DevOps
- Docker & Docker Compose
- Nginx (production)
- Redis (caching)
- Comprehensive monitoring

## 📦 Installation

### Prerequisites
- Node.js 18 or higher
- Docker and Docker Compose
- Git

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/Nik-Maltcev/datatrace.git
   cd datatrace
   ```

2. **Set up environment variables**
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with your API keys
   ```

3. **Start with Docker Compose**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:3000
   - Health Check: http://localhost:3000/health
   - Monitoring: http://localhost:3000/api/monitoring/dashboard

### Manual Installation

1. **Backend Setup**
   ```bash
   cd backend
   npm install
   npm run build
   npm start
   ```

2. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run build
   npm start
   ```

## 🔧 Configuration

### Environment Variables

Create `backend/.env` file with the following variables:

```env
# API Keys (Required)
DYXLESS_API_KEY=your_dyxless_api_key
ITP_API_KEY=your_itp_api_key
LEAK_OSINT_API_KEY=your_leak_osint_api_key
USERBOX_API_KEY=your_userbox_api_key
VEKTOR_API_KEY=your_vektor_api_key

# Application Settings
NODE_ENV=production
PORT=3000
FRONTEND_URL=http://localhost:3001

# Security Settings
ENABLE_CORS=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring
MONITORING_ENABLED=true
METRICS_INTERVAL=30000
ALERTS_ENABLED=true
```

## 🚀 Deployment

### Production Deployment

1. **Using deployment script**
   ```bash
   chmod +x scripts/deploy.sh
   ./scripts/deploy.sh --environment production
   ```

2. **Manual deployment**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

### Environment-specific configurations
- Development: `docker-compose.yml`
- Production: `docker-compose.prod.yml`

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

## 🧪 Testing

### Run All Tests
```bash
chmod +x scripts/test-all.sh
./scripts/test-all.sh
```

### Individual Test Suites
```bash
# Backend tests
cd backend
npm test                    # Unit tests
npm run test:integration   # Integration tests
npm run test:e2e          # End-to-end tests
npm run test:performance  # Performance tests
npm run test:security     # Security tests

# Frontend tests
cd frontend
npm test
```

### Test Coverage
```bash
npm run test:coverage
```

## 📊 Monitoring

The application includes comprehensive monitoring:

- **Health Checks**: `/health` and `/api/monitoring/health`
- **Metrics**: System, application, and performance metrics
- **Alerts**: Configurable thresholds with automatic alerting
- **Dashboard**: Real-time monitoring interface

Access the monitoring dashboard at: `http://localhost:3000/api/monitoring/dashboard`

## 🔒 Security Features

- **PII Sanitization**: Personal data is sanitized from logs
- **Bot Name Encryption**: Service identities are protected
- **Rate Limiting**: Protection against abuse
- **Input Validation**: Comprehensive input sanitization
- **Security Headers**: CORS, CSP, and other security headers
- **Memory Cleanup**: Automatic cleanup of sensitive data

## 📚 API Documentation

### Search Endpoint
```http
POST /api/search
Content-Type: application/json

{
  "type": "phone|email|inn|snils|passport",
  "value": "search_value"
}
```

### Instructions Endpoint
```http
GET /api/instructions/{botId}
```

### Monitoring Endpoints
```http
GET /api/monitoring/health
GET /api/monitoring/metrics
GET /api/monitoring/alerts
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write comprehensive tests
- Update documentation
- Follow security guidelines
- Test with all supported data types

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: See [DEPLOYMENT.md](DEPLOYMENT.md) for deployment guide
- **Issues**: Report bugs and feature requests via GitHub Issues
- **Security**: Report security vulnerabilities privately

## 🔄 Changelog

### v1.0.0 (Current)
- Initial release with full functionality
- Support for 5 bot APIs
- Comprehensive monitoring and security
- Production-ready deployment configuration
- Complete test coverage

## 🙏 Acknowledgments

- Built with modern web technologies
- Designed with privacy and security in mind
- Comprehensive testing and monitoring
- Production-ready architecture

---

**⚠️ Important**: This application requires valid API keys for the bot services. Ensure you have proper authorization to use these services and comply with their terms of service.