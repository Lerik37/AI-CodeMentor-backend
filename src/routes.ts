import { Router } from 'express';
import { generateTaskHandler } from './services/taskGenerationService';
import { checkAnswerHandler } from './services/answerCheckService';

export function createRoutes(): Router {
    const router = Router();

    router.post('/api/task/generate', generateTaskHandler);
    router.post('/api/answer/check', checkAnswerHandler);

    return router;
}
