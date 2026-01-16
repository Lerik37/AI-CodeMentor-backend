import { Request, Response } from 'express';
import { createDefaultLmStudioClient } from './lmStudioClient';
import { extractJsonFromText } from '../utils/jsonExtractor';
import { CheckAnswerRequestBody, CheckAnswerResponseBody } from '../types/api.types';

export async function checkAnswerHandler(
    request: Request<unknown, CheckAnswerResponseBody, CheckAnswerRequestBody>,
    response: Response<CheckAnswerResponseBody | { error: string; details?: string }>,
): Promise<void> {
    try {
        const task = request.body.task;
        const userCode = request.body.userCode;

        const lmStudioClient = createDefaultLmStudioClient();

        const systemMessage = 'Ты строгий проверяющий решений. Возвращай ТОЛЬКО валидный JSON без пояснений.';

        const constraintsText = (task.constraints ?? []).map((item) => `- ${item}`).join('\n');
        const testCasesText = (task.testCases ?? [])
            .map((testCase, index) => `${index + 1}) ${testCase.input} -> ${testCase.expected}`)
            .join('\n');

        const userMessage = `
Задача:
${task.statement}

Язык: ${task.language}

Ограничения:
${constraintsText}

Тест-кейсы (input -> expected):
${testCasesText}

Код пользователя:
\`\`\`
${userCode}
\`\`\`

Проверь решение на логику и соответствие тест-кейсам.
Если решение неверное — укажи, почему тесты не пройдут, и как исправить.
Если верное — дай 1–2 улучшения.

Верни JSON строго:
{
  "passed": boolean,
  "score": number,
  "summary": "string",
  "feedback": "string",
  "fixes": ["string"],
  "edgeCases": ["string"]
}
`.trim();

        const modelResponseText = await lmStudioClient.createChatCompletion([
            { role: 'system', content: systemMessage },
            { role: 'user', content: userMessage },
        ]);

        const parsed = extractJsonFromText(modelResponseText) as CheckAnswerResponseBody;

        response.json(parsed);
    } catch (error: any) {
        // eslint-disable-next-line no-console
        console.error(error);
        response.status(500).json({ error: 'Failed to check answer', details: error.message });
    }
}
