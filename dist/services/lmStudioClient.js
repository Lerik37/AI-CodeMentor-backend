"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LmStudioClient = void 0;
exports.createDefaultLmStudioClient = createDefaultLmStudioClient;
const axios_1 = __importDefault(require("axios"));
class LmStudioClient {
    baseUrl;
    modelName;
    constructor(baseUrl, modelName) {
        this.baseUrl = baseUrl;
        this.modelName = modelName;
    }
    async createChatCompletion(messages) {
        const response = await axios_1.default.post(`${this.baseUrl}/v1/chat/completions`, {
            model: this.modelName,
            messages,
            temperature: 0.1,
            max_tokens: 1200,
        }, { timeout: 180_000 });
        return response.data?.choices?.[0]?.message?.content ?? '';
    }
}
exports.LmStudioClient = LmStudioClient;
function createDefaultLmStudioClient() {
    const baseUrl = process.env.LM_BASE_URL ?? 'http://localhost:1234';
    const modelName = process.env.LM_MODEL ?? 'second-state/phi-3-mini-4k-instruct';
    return new LmStudioClient(baseUrl, modelName);
}
