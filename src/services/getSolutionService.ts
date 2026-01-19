import { Request, Response } from 'express';
import { createDefaultLmStudioClient, LmStudioClient } from './lmStudioClient';
import { GetSolutionRequestBody, GetSolutionResponseBody } from '../types/api.types';
import {extractMarkedJsonFromText} from "./taskGenerationService";

async function repairMarkedJsonWithModel(
    lmStudioClient: LmStudioClient,
    invalidText: string,
    parsingErrorMessage: string,
): Promise<string> {
    const systemMessage =
        'Ты конвертер формата. Верни ответ строго между BEGIN_JSON и END_JSON. ' +
        'Внутри — один валидный JSON-объект. ' +
        'Строго двойные кавычки для ключей и строк. ' +
        'Запрещены markdown, комментарии, хвостовые запятые и любой текст вне маркеров. ' +
        'Исправь пропущенные запятые/кавычки/скобки.';

    const userMessage = `
Сделай следующий текст валидным JSON, не меняя смысл данных.
Верни строго:

BEGIN_JSON
{ ...валидный JSON... }
END_JSON

Ошибка парсинга:
${parsingErrorMessage}

Текст:
${invalidText}
`.trim();

    return lmStudioClient.createChatCompletion([
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage },
    ]);
}

async function parseOrRepairSolutionJson(
    lmStudioClient: LmStudioClient,
    modelResponseText: string,
): Promise<GetSolutionResponseBody> {
    try {
        return extractMarkedJsonFromText(modelResponseText) as GetSolutionResponseBody;
    } catch (firstParsingError: any) {
        const firstParsingErrorMessage = firstParsingError?.message ?? 'Unknown JSON parsing error';

        const repairedText = await repairMarkedJsonWithModel(
            lmStudioClient,
            modelResponseText,
            firstParsingErrorMessage,
        );

        return extractMarkedJsonFromText(repairedText) as GetSolutionResponseBody;
    }
}

export async function getSolutionHandler(
    request: Request<unknown, GetSolutionResponseBody, GetSolutionRequestBody>,
    response: Response<GetSolutionResponseBody | { error: string; details?: string }>,
): Promise<void> {
    try {
        const task = request.body.task;

        const lmStudioClient = createDefaultLmStudioClient();

        const constraintsText = (task.constraints ?? []).map((item) => `- ${item}`).join('\n');
        const testCasesText = (task.testCases ?? [])
            .map((testCase, index) => `${index + 1}) ${testCase.input} -> ${testCase.expected}`)
            .join('\n');

        const systemMessage =
            'Ты AI-ментор по программированию. ' +
            'Сгенерируй эталонное решение, которое проходит тест-кейсы. ' +
            'Пояснение пиши НА РУССКОМ ЯЗЫКЕ. ' +
            'Верни ответ строго между BEGIN_JSON и END_JSON. ' +
            'Внутри — один валидный JSON-объект. ' +
            'Строго двойные кавычки для ключей и строк. ' +
            'Запрещены markdown, комментарии и любой текст вне маркеров.';

        const userMessage = `
Дана учебная задача. Нужно дать ЭТАЛОННОЕ решение.

Требования:
- Верни ответ строго в формате:

BEGIN_JSON
{
  "code": "string",
  "explanation": "string"
}
END_JSON

- "code" должен быть полноценным решением, проходящим тест-кейсы.
- "code" должен быть В ВИДЕ СТРОКИ JSON: экранируй переводы строк как \\n.
- "explanation" — на русском, 4–8 предложений: логика решения + почему проходит тесты.
- Никакого текста вне маркеров.

Язык программирования: ${task.language}

Условие задачи:
${task.statement}

Ограничения:
${constraintsText || '- (нет)'}

Тест-кейсы (input -> expected):
${testCasesText || '- (нет)'}

Верни только JSON между маркерами.
`.trim();

        const modelResponseText = await lmStudioClient.createChatCompletion([
            { role: 'system', content: systemMessage },
            { role: 'user', content: userMessage },
        ]);

        const parsed = await parseOrRepairSolutionJson(lmStudioClient, modelResponseText);

        response.json(parsed);
    } catch (error: any) {
        // eslint-disable-next-line no-console
        console.error(error);

        response.status(502).json({
            error: 'Failed to get solution',
            details: error.message,
        });
    }
}
