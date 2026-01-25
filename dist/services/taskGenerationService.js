"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractMarkedJsonFromText = extractMarkedJsonFromText;
exports.generateTaskHandler = generateTaskHandler;
const lmStudioClient_1 = require("./lmStudioClient");
/**
 * Извлекает JSON строго между маркерами BEGIN_JSON и END_JSON.
 * Это значительно стабилизирует парсинг ответов локальных моделей.
 */
function extractMarkedJsonFromText(text) {
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
function buildGenerationMessages(context) {
    const systemMessage = 'Ты генератор учебных задач по программированию для тренажёра. ' +
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
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage },
    ];
}
async function buildRepairResponse(lmStudioClient, invalidText, parsingErrorMessage) {
    const repairSystemMessage = 'Ты конвертер формата. Верни ответ строго между BEGIN_JSON и END_JSON. ' +
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
        { role: 'system', content: repairSystemMessage },
        { role: 'user', content: repairUserMessage },
    ]);
}
async function generateTaskWithRetries(lmStudioClient, context) {
    const generationMessages = buildGenerationMessages(context);
    const firstResponseText = await lmStudioClient.createChatCompletion(generationMessages);
    try {
        return extractMarkedJsonFromText(firstResponseText);
    }
    catch (firstParsingError) {
        const firstParsingErrorMessage = firstParsingError?.message ?? 'Unknown JSON parsing error';
        const repairedResponseText = await buildRepairResponse(lmStudioClient, firstResponseText, firstParsingErrorMessage);
        try {
            return extractMarkedJsonFromText(repairedResponseText);
        }
        catch {
            const regeneratedResponseText = await lmStudioClient.createChatCompletion(generationMessages);
            return extractMarkedJsonFromText(regeneratedResponseText);
        }
    }
}
async function generateTaskHandler(request, response) {
    try {
        const topic = request.body.topic ?? 'алгоритмы/строки/массивы';
        const language = request.body.language ?? 'JavaScript';
        const lmStudioClient = (0, lmStudioClient_1.createDefaultLmStudioClient)();
        const generatedTask = await generateTaskWithRetries(lmStudioClient, { topic, language });
        response.json(generatedTask);
    }
    catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
        response.status(502).json({
            error: 'Failed to generate task',
            details: error.message,
        });
    }
}
