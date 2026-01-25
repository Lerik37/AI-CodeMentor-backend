"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAnswerHandler = checkAnswerHandler;
const lmStudioClient_1 = require("./lmStudioClient");
/**
 * Извлекает JSON строго между маркерами BEGIN_JSON и END_JSON.
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
async function repairMarkedJsonWithModel(lmStudioClient, invalidText, parsingErrorMessage) {
    const systemMessage = 'Ты конвертер формата. Верни ответ строго между BEGIN_JSON и END_JSON. ' +
        'Внутри — один валидный JSON-объект. ' +
        'Строго двойные кавычки для ключей и строк. ' +
        'Запрещены markdown, комментарии, хвостовые запятые и любой текст вне маркеров. ' +
        'Исправь пропущенные запятые/кавычки/скобки.';
    const userMessage = `
Сделай следующий текст валидным JSON, не меняя смысла данных.
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
async function parseOrRepairCheckAnswerJson(lmStudioClient, modelResponseText) {
    try {
        return extractMarkedJsonFromText(modelResponseText);
    }
    catch (firstParsingError) {
        const firstParsingErrorMessage = firstParsingError?.message ?? 'Unknown JSON parsing error';
        const repairedText = await repairMarkedJsonWithModel(lmStudioClient, modelResponseText, firstParsingErrorMessage);
        return extractMarkedJsonFromText(repairedText);
    }
}
async function checkAnswerHandler(request, response) {
    try {
        const task = request.body.task;
        const userCode = request.body.userCode;
        const lmStudioClient = (0, lmStudioClient_1.createDefaultLmStudioClient)();
        const systemMessage = 'Ты строгий проверяющий решений в тренажёре. ' +
            'Ты НЕ выполняешь код, а анализируешь его и проверяешь соответствие требованиям и тест-кейсам. ' +
            'Все ответы и объяснения пиши НА РУССКОМ ЯЗЫКЕ. ' +
            'Верни ответ строго между BEGIN_JSON и END_JSON. ' +
            'Внутри — один валидный JSON-объект. ' +
            'Строго двойные кавычки для ключей и строк. ' +
            'Запрещены markdown, комментарии и любой текст вне маркеров.';
        const constraintsText = (task.constraints ?? []).map((item) => `- ${item}`).join('\n');
        const testCasesText = (task.testCases ?? [])
            .map((testCase, index) => `${index + 1}) ${testCase.input} -> ${testCase.expected}`)
            .join('\n');
        const userMessage = `
Проверь решение пользователя для учебной задачи.

ВАЖНО:
- Ответ ДОЛЖЕН быть на РУССКОМ ЯЗЫКЕ (summary, feedback, fixes, edgeCases).
- Верни ответ СТРОГО в формате:

BEGIN_JSON
{ ...валидный JSON... }
END_JSON

Требования к полям:
- summary: краткий итог проверки (1–2 предложения).
- feedback: ПОДРОБНОЕ ПОЯСНЕНИЕ решения:
  * если неверно — пошагово объясни, где логическая ошибка,
    на каких входных данных решение ломается и почему;
  * если верно — объясни, почему решение корректно и проходит все тесты.
- fixes: конкретные рекомендации по исправлению (если есть).
- score: 0..10 (0 — совсем неверно, 10 — полностью верно).
- edgeCases: возможные граничные случаи (макс. 3).

Если решение неверное — feedback ОБЯЗАТЕЛЕН и должен быть развёрнутым.
Если решение верное — feedback должен содержать разбор логики решения.

Задача:
${task.statement}

Язык: ${task.language}

Ограничения:
${constraintsText || '- (нет)'}

Тест-кейсы (input -> expected):
${testCasesText || '- (нет)'}

Код пользователя:
${userCode}

Верни JSON строго по схеме:
BEGIN_JSON
{
  "passed": boolean,
  "score": number,
  "summary": "string",
  "feedback": "string",
  "fixes": ["string"],
  "edgeCases": ["string"]
}
END_JSON
`.trim();
        const modelResponseText = await lmStudioClient.createChatCompletion([
            { role: 'system', content: systemMessage },
            { role: 'user', content: userMessage },
        ]);
        const parsed = await parseOrRepairCheckAnswerJson(lmStudioClient, modelResponseText);
        response.json(parsed);
    }
    catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
        response.status(502).json({ error: 'Failed to check answer', details: error.message });
    }
}
