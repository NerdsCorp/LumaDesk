# Contributing to LumaDesk

Thank you for considering contributing to LumaDesk! This document provides guidelines for contributing to the project.

## Code of Conduct

This project adheres to a Code of Conduct. By participating, you are expected to uphold this code.

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check existing issues. When creating a bug report, include:

- Clear and descriptive title
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- System information (OS, Docker version, etc.)
- Logs and error messages

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- Clear and descriptive title
- Detailed description of the proposed functionality
- Explanation of why this enhancement would be useful
- Possible implementation approach

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass (`make test`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

#### Pull Request Guidelines

- Follow the existing code style
- Write clear commit messages
- Include tests for new features
- Update documentation as needed
- Keep PRs focused on a single feature/fix
- Ensure CI passes

## Development Setup

```bash
# Clone your fork
git clone https://github.com/your-username/LumaDesk.git
cd LumaDesk

# Install dependencies
cd api && npm install
cd ../web && npm install

# Start development environment
make dev
```

## Coding Standards

### TypeScript/JavaScript

- Use TypeScript for all new code
- Follow ESLint configuration
- Use Prettier for formatting
- Write JSDoc comments for public APIs

### Git Commit Messages

- Use present tense ("Add feature" not "Added feature")
- Use imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit first line to 72 characters
- Reference issues and pull requests

Example:
```
Add user bulk import feature

- Implement CSV parsing
- Add validation for user data
- Create API endpoint for bulk import
- Add tests for bulk import functionality

Closes #123
```

## Testing

```bash
# Run all tests
make test

# Run API tests
cd api && npm test

# Run with coverage
cd api && npm run test:coverage
```

## Documentation

- Update README.md for user-facing changes
- Update API documentation for API changes
- Add code comments for complex logic
- Update CHANGELOG.md

## Release Process

1. Update version in package.json
2. Update CHANGELOG.md
3. Create release PR
4. Tag release after merge
5. Build and push Docker images

## Questions?

Feel free to open an issue for any questions or concerns.
