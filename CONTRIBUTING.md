# Contributing to DataTrace

Thank you for your interest in contributing to DataTrace! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### Reporting Issues

1. **Check existing issues** first to avoid duplicates
2. **Use issue templates** when available
3. **Provide detailed information**:
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Node.js version, etc.)
   - Screenshots if applicable

### Submitting Changes

1. **Fork the repository**
2. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
4. **Write or update tests**
5. **Run the test suite**:
   ```bash
   npm test
   ```
6. **Commit your changes**:
   ```bash
   git commit -m "feat: add your feature description"
   ```
7. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```
8. **Create a Pull Request**

## 📋 Development Guidelines

### Code Style

- **TypeScript**: Use TypeScript for all new code
- **ESLint**: Follow the existing ESLint configuration
- **Prettier**: Code formatting is handled by Prettier
- **Naming**: Use descriptive variable and function names

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

### Testing

- **Write tests** for new features and bug fixes
- **Maintain coverage** above 80%
- **Test types**:
  - Unit tests for individual functions
  - Integration tests for API endpoints
  - End-to-end tests for user workflows
  - Security tests for sensitive operations

### Security

- **Never commit API keys** or sensitive data
- **Sanitize user input** in all functions
- **Follow security best practices**
- **Report security issues** privately

## 🏗️ Development Setup

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- Git

### Local Development

1. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/datatrace.git
   cd datatrace
   ```

2. **Install dependencies**:
   ```bash
   # Backend
   cd backend
   npm install
   
   # Frontend
   cd ../frontend
   npm install
   ```

3. **Set up environment**:
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with your API keys
   ```

4. **Start development servers**:
   ```bash
   # Using Docker Compose (recommended)
   docker-compose up -d
   
   # Or manually
   cd backend && npm run dev
   cd frontend && npm start
   ```

### Running Tests

```bash
# All tests
./scripts/test-all.sh

# Backend tests only
cd backend
npm test
npm run test:integration
npm run test:e2e

# Frontend tests only
cd frontend
npm test
```

## 🎯 Areas for Contribution

### High Priority

- **Performance optimizations**
- **Additional bot API integrations**
- **Enhanced security features**
- **Improved error handling**
- **Better user experience**

### Medium Priority

- **Documentation improvements**
- **Test coverage expansion**
- **Code refactoring**
- **Accessibility improvements**
- **Internationalization**

### Low Priority

- **UI/UX enhancements**
- **Additional monitoring features**
- **Development tooling**
- **Code cleanup**

## 🐛 Bug Reports

When reporting bugs, please include:

1. **Clear description** of the issue
2. **Steps to reproduce** the problem
3. **Expected behavior**
4. **Actual behavior**
5. **Environment information**:
   - Operating system
   - Node.js version
   - Browser (for frontend issues)
   - Docker version (if applicable)
6. **Screenshots or logs** if helpful

## 💡 Feature Requests

For feature requests, please provide:

1. **Clear description** of the proposed feature
2. **Use case** - why is this feature needed?
3. **Proposed implementation** (if you have ideas)
4. **Alternatives considered**
5. **Additional context**

## 📝 Documentation

- **Update README.md** for user-facing changes
- **Update API documentation** for API changes
- **Add inline comments** for complex code
- **Update deployment guides** for infrastructure changes

## 🔍 Code Review Process

1. **All changes** require code review
2. **Automated checks** must pass:
   - Tests
   - Linting
   - Security scans
3. **Manual review** focuses on:
   - Code quality
   - Security implications
   - Performance impact
   - Documentation completeness

## 📞 Getting Help

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Security Issues**: Report privately to maintainers

## 🏆 Recognition

Contributors will be recognized in:

- **README.md** contributors section
- **Release notes** for significant contributions
- **GitHub contributors** page

## 📄 License

By contributing to DataTrace, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to DataTrace! 🚀