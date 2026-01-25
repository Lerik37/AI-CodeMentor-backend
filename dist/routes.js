"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRoutes = createRoutes;
const express_1 = require("express");
const taskGenerationService_1 = require("./services/taskGenerationService");
const answerCheckService_1 = require("./services/answerCheckService");
const getSolutionService_1 = require("./services/getSolutionService");
function createRoutes() {
    const router = (0, express_1.Router)();
    router.post('/api/task/generate', taskGenerationService_1.generateTaskHandler);
    router.post('/api/answer/check', answerCheckService_1.checkAnswerHandler);
    router.post('/api/solution/get', getSolutionService_1.getSolutionHandler);
    return router;
}
