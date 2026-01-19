import { Task } from './task.types';
import { CheckResult } from './check.types';

export type GenerateTaskRequestBody = {
    topic?: string;
    language?: string;
};

export type GenerateTaskResponseBody = Task;

export type CheckAnswerRequestBody = {
    task: Task;
    userCode: string;
};

export type CheckAnswerResponseBody = CheckResult;

export type GetSolutionRequestBody = {
    task: Task;
};

export type GetSolutionResponseBody = {
    code: string;
    explanation: string;
};

