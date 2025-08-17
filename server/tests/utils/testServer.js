"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTestApp = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const repositories_1 = require("../../src/repositories");
const routes_1 = require("../../src/routes");
const createTestApp = (prisma) => {
    const app = (0, express_1.default)();
    // Middleware
    app.use((0, cors_1.default)());
    app.use(express_1.default.json({ limit: '10mb' }));
    app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
    // Initialize repositories
    const employeeRepo = new repositories_1.PrismaEmployeeRepository(prisma);
    const patientRepo = new repositories_1.PrismaPatientRepository(prisma);
    const roomRepo = new repositories_1.PrismaRoomRepository(prisma);
    const scheduleRepo = new repositories_1.PrismaScheduleRepository(prisma);
    const sessionRepo = new repositories_1.PrismaSessionRepository(prisma);
    const activityRepo = new repositories_1.PrismaActivityRepository(prisma);
    const roleRepo = new repositories_1.PrismaRoleRepository(prisma);
    // Setup API routes
    app.use('/api', (0, routes_1.createApiRouter)(employeeRepo, patientRepo, roomRepo, scheduleRepo, sessionRepo, activityRepo, roleRepo, prisma));
    // Error handling
    app.use((error, req, res, next) => {
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    });
    return app;
};
exports.createTestApp = createTestApp;
//# sourceMappingURL=testServer.js.map