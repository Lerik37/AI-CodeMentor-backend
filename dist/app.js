"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const routes_1 = require("./routes");
dotenv_1.default.config();
function createApp() {
    const application = (0, express_1.default)();
    const allowedOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5174';
    application.use((0, cors_1.default)({
        origin: allowedOrigin,
    }));
    application.use(express_1.default.json());
    application.use((0, routes_1.createRoutes)());
    return application;
}
