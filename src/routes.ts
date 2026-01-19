import { Router } from 'express';
import { generateTaskHandler } from './services/taskGenerationService';
import { checkAnswerHandler } from './services/answerCheckService';
import {getSolutionHandler} from "./services/getSolutionService";

export function createRoutes(): Router {
    const router = Router();

    router.post('/api/task/generate', generateTaskHandler);
    router.post('/api/answer/check', checkAnswerHandler);
    router.post('/api/solution/get', getSolutionHandler);


    return router;
}
