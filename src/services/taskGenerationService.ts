// import {Request, Response} from 'express';
// import {createDefaultLmStudioClient, LmStudioClient} from './lmStudioClient';
// import {extractJsonFromText} from '../utils/jsonExtractor';
// import {GenerateTaskRequestBody, GenerateTaskResponseBody} from '../types/api.types';
//
// type GenerationContext = {
//     topic: string;
//     language: string;
// };
//
// function buildGenerationMessages(context: GenerationContext) {
//     const systemMessage =
//         'Ты генератор задач по программированию для тренажёра. ' +
//         'Возвращай ТОЛЬКО валидный JSON. ' +
//         'Строго двойные кавычки для ключей и строк. ' +
//         'Запрещены markdown, комментарии, хвостовые запятые и любой текст вне JSON.';
//
//     const userMessage = `
// Сгенерируй задачу для тренажёра.
// Тема: ${context.topic}
// Язык: ${context.language}
//
// Важно: делай ответ КОРОТКИМ:
// - constraints: максимум 3
// - examples: максимум 1
// - testCases: максимум 3
// - solutionOutline: максимум 3
//
// Формат JSON:
// {
//   "id": "string",
//   "title": "string",
//   "language": "JavaScript|TypeScript|Python",
//   "difficulty": "easy|medium",
//   "statement": "string",
//   "constraints": ["string"],
//   "examples": [{"input":"string","output":"string","explanation":"string"}],
//   "starterCode": "string",
//   "solutionOutline": ["string"],
//   "testCases": [{"input":"string","expected":"string"}]
// }
//
// КРИТИЧЕСКИ ВАЖНО:
// - starterCode — только заглушка (TODO или throw new Error("Not implemented"))
// - НИКАКОЙ логики решения в starterCode
// `.trim();
//
//     return [
//         {role: 'system' as const, content: systemMessage},
//         {role: 'user' as const, content: userMessage},
//     ];
// }
//
// async function repairJsonWithModel(
//     lmStudioClient: LmStudioClient,
//     invalidText: string,
//     parsingErrorMessage: string,
// ): Promise<string> {
//     const systemMessage =
//         'Ты конвертер формата. Верни ТОЛЬКО валидный JSON. ' +
//         'Исправь пропущенные запятые, кавычки и скобки.';
//
//     const userMessage = `
// Сделай следующий текст валидным JSON.
// Нельзя менять смысл данных, только формат.
//
// Ошибка:
// ${parsingErrorMessage}
//
// Текст:
// ${invalidText}
// `.trim();
//
//     return lmStudioClient.createChatCompletion([
//         {role: 'system', content: systemMessage},
//         {role: 'user', content: userMessage},
//     ]);
// }
//
// async function generateTaskWithRetries(
//     lmStudioClient: LmStudioClient,
//     context: GenerationContext,
// ): Promise<GenerateTaskResponseBody> {
//     const messages = buildGenerationMessages(context);
//
//     const firstResponseText = await lmStudioClient.createChatCompletion(messages);
//
//     try {
//         return extractJsonFromText(firstResponseText) as GenerateTaskResponseBody;
//     } catch (firstError: any) {
//         const repairedText = await repairJsonWithModel(
//             lmStudioClient,
//             firstResponseText,
//             firstError.message,
//         );
//
//         try {
//             return extractJsonFromText(repairedText) as GenerateTaskResponseBody;
//         } catch {
//             const regeneratedText = await lmStudioClient.createChatCompletion(messages);
//             return extractJsonFromText(regeneratedText) as GenerateTaskResponseBody;
//         }
//     }
// }
//
// export async function generateTaskHandler(
//     request: Request<unknown, GenerateTaskResponseBody, GenerateTaskRequestBody>,
//     response: Response<GenerateTaskResponseBody | { error: string; details?: string }>,
// ): Promise<void> {
//     try {
//         const topic = request.body.topic ?? 'алгоритмы/строки/массивы';
//         const language = request.body.language ?? 'JavaScript';
//
//         const lmStudioClient = createDefaultLmStudioClient();
//
//         const generatedTask = await generateTaskWithRetries(
//             lmStudioClient,
//             {topic, language},
//         );
//
//         response.json(generatedTask);
//     } catch (error: any) {
//         // eslint-disable-next-line no-console
//         console.error(error);
//
//         response.status(502).json({
//             error: 'Failed to generate task',
//             details: error.message,
//         });
//     }
// }
//
//
//
//
//

import {Request, Response} from 'express';
import {createDefaultLmStudioClient, LmStudioClient} from './lmStudioClient';
import {GenerateTaskRequestBody, GenerateTaskResponseBody} from '../types/api.types';

/**
 * Извлекает JSON строго между маркерами BEGIN_JSON и END_JSON.
 * Это значительно стабилизирует парсинг ответов локальных моделей.
 */
function extractMarkedJsonFromText(text: string): unknown {
    const beginMarker = 'BEGIN_JSON';
    const endMarker = 'END_JSON';

    const beginIndex = text.indexOf(beginMarker);
    const endIndex = text.indexOf(endMarker);

    if (beginIndex === -1 || endIndex === -1 || endIndex <= beginIndex) {
        throw new Error('Model response does not contain JSON markers');
    }

    const jsonText = text
        .slice(beginIndex + beginMarker.length, endIndex)
        .trim();

    return JSON.parse(jsonText);
}

type GenerationContext = {
    topic: string;
    language: string;
};

function buildGenerationMessages(context: GenerationContext) {
    const systemMessage =
        'Ты генератор учебных задач по программированию для тренажёра. ' +
        'Возвращай ответ строго между маркерами BEGIN_JSON и END_JSON. ' +
        'Внутри должен быть один валидный JSON-объект. ' +
        'ВСЕ текстовые поля (title, statement, constraints, examples, solutionOutline) ' +
        'ДОЛЖНЫ БЫТЬ НА РУССКОМ ЯЗЫКЕ. ' +
        'Код (starterCode) должен быть на языке программирования. ' +
        'Строго двойные кавычки. Никакого markdown и пояснений.';

    const userMessage = `
    ВАЖНО:
- Все текстовые поля JSON должны быть НА РУССКОМ ЯЗЫКЕ.
- Исключение: код (starterCode, примеры кода) — на языке программирования.

Сгенерируй задачу для тренажёра.
Тема: ${context.topic}
Язык: ${context.language}
Язык описания задачи: русский

Ответ верни СТРОГО в формате:

BEGIN_JSON
{ ...валидный JSON... }
END_JSON

Важно: делай ответ КОРОТКИМ, чтобы он не обрезался:
- constraints: максимум 3 элемента
- examples: максимум 1 элемент
- testCases: максимум 3 элемента
- solutionOutline: максимум 3 пункта

Формат JSON:
{
  "id": "string",
  "title": "string",
  "language": "JavaScript|TypeScript|Python",
  "difficulty": "easy|medium",
  "statement": "string",
  "constraints": ["string", "..."],
  "examples": [{"input":"string","output":"string","explanation":"string"}],
  "starterCode": "string",
  "solutionOutline": ["string", "..."],
  "testCases": [{"input":"string","expected":"string"}]
}

КРИТИЧЕСКИ ВАЖНО:
- starterCode НЕ ДОЛЖЕН содержать реализацию решения.
- starterCode должен быть ЗАГЛУШКОЙ (TODO или throw new Error("Not implemented")).
- Запрещено использовать filter, map, reduce, циклы или любую логику решения в starterCode.
- НЕ добавляй готовое решение в statement, constraints, examples, solutionOutline и testCases.
`.trim();

    return [
        {role: 'system' as const, content: systemMessage},
        {role: 'user' as const, content: userMessage},
    ];
}

async function buildRepairResponse(
    lmStudioClient: LmStudioClient,
    invalidText: string,
    parsingErrorMessage: string,
): Promise<string> {
    const repairSystemMessage =
        'Ты конвертер формата. Верни ответ строго между BEGIN_JSON и END_JSON. ' +
        'Внутри — один валидный JSON-объект с двойными кавычками. ' +
        'Запрещены markdown, комментарии, хвостовые запятые и любой текст вне маркеров. ' +
        'Если в JSON пропущены запятые или скобки — исправь.';

    const repairUserMessage = `
Сделай следующий текст валидным JSON, не меняя смысл данных.
Верни ответ строго так:

BEGIN_JSON
{ ...валидный JSON... }
END_JSON

Ошибка парсинга:
${parsingErrorMessage}

Текст:
${invalidText}
`.trim();

    return lmStudioClient.createChatCompletion([
        {role: 'system', content: repairSystemMessage},
        {role: 'user', content: repairUserMessage},
    ]);
}

async function generateTaskWithRetries(
    lmStudioClient: LmStudioClient,
    context: GenerationContext,
): Promise<GenerateTaskResponseBody> {
    const generationMessages = buildGenerationMessages(context);

    const firstResponseText = await lmStudioClient.createChatCompletion(generationMessages);

    try {
        return extractMarkedJsonFromText(firstResponseText) as GenerateTaskResponseBody;
    } catch (firstParsingError: any) {
        const firstParsingErrorMessage = firstParsingError?.message ?? 'Unknown JSON parsing error';

        const repairedResponseText = await buildRepairResponse(
            lmStudioClient,
            firstResponseText,
            firstParsingErrorMessage,
        );

        try {
            return extractMarkedJsonFromText(repairedResponseText) as GenerateTaskResponseBody;
        } catch {
            const regeneratedResponseText = await lmStudioClient.createChatCompletion(
                generationMessages,
            );

            return extractMarkedJsonFromText(regeneratedResponseText) as GenerateTaskResponseBody;
        }
    }
}

export async function generateTaskHandler(
    request: Request<unknown, GenerateTaskResponseBody, GenerateTaskRequestBody>,
    response: Response<GenerateTaskResponseBody | { error: string; details?: string }>,
): Promise<void> {
    try {
        const topic = request.body.topic ?? 'алгоритмы/строки/массивы';
        const language = request.body.language ?? 'JavaScript';

        const lmStudioClient = createDefaultLmStudioClient();

        const generatedTask = await generateTaskWithRetries(lmStudioClient, {topic, language});

        response.json(generatedTask);
    } catch (error: any) {
        // eslint-disable-next-line no-console
        console.error(error);

        response.status(502).json({
            error: 'Failed to generate task',
            details: error.message,
        });
    }
}
