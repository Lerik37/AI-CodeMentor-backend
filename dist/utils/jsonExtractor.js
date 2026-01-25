"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractJsonFromText = extractJsonFromText;
function extractJsonFromText(text) {
    const firstBraceIndex = text.indexOf('{');
    const lastBraceIndex = text.lastIndexOf('}');
    if (firstBraceIndex === -1 || lastBraceIndex === -1 || lastBraceIndex <= firstBraceIndex) {
        throw new Error('Model response does not contain JSON object');
    }
    const jsonSubstring = text.slice(firstBraceIndex, lastBraceIndex + 1);
    return JSON.parse(jsonSubstring);
}
