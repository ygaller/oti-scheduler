# API Tests

This directory contains comprehensive tests for the scheduling API endpoints.

## Structure

- `setup.ts` - Test setup and teardown configuration
- `utils/` - Test utilities and fixtures
  - `testServer.ts` - Test application setup
  - `fixtures.ts` - Test data fixtures and helpers
- `routes/` - API endpoint tests organized by route
  - `employees.test.ts` - Employee CRUD operations
  - `rooms.test.ts` - Room CRUD operations
  - `schedule.test.ts` - Schedule generation, activation, and session management
  - `system.test.ts` - System status and reset operations

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests for CI (no watch, with coverage)
npm run test:ci
```

## Test Database

Tests use a separate PostgreSQL database (`scheduling_test`) to avoid interfering with development data. The test database is automatically:

- Set up before all tests run
- Cleaned between each test
- Torn down after all tests complete

## Environment Variables

Test environment variables are defined in `.env.test`:

- `NODE_ENV=test`
- `DATABASE_URL` - Test database connection string
- `TEST_DATABASE_URL` - Alternative test database URL
- `PORT` - Test server port (different from dev)

## Coverage

Test coverage reports are generated in the `coverage/` directory and include:

- HTML report: `coverage/index.html`
- LCOV format: `coverage/lcov.info`
- JSON format: `coverage/coverage-final.json`

## CI/CD Integration

Tests run automatically on:

- Push to main/master/develop branches
- Pull requests to main/master/develop branches

The CI pipeline includes:

1. **Test Job**: Runs all API tests with PostgreSQL service
2. **Lint Job**: TypeScript compilation checks
3. **Build Job**: Ensures the application builds successfully

Coverage reports are uploaded to Codecov for tracking over time.
