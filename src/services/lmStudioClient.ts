import axios from 'axios';

export type ChatMessage = {
    role: 'system' | 'user' | 'assistant';
    content: string;
};

type ChatCompletionResponse = {
    choices: Array<{
        message?: {
            content?: string;
        };
    }>;
};

export class LmStudioClient {
    private readonly baseUrl: string;

    private readonly modelName: string;

    public constructor(baseUrl: string, modelName: string) {
        this.baseUrl = baseUrl;
        this.modelName = modelName;
    }

    public async createChatCompletion(messages: ChatMessage[]): Promise<string> {
        const response = await axios.post<ChatCompletionResponse>(
            `${this.baseUrl}/v1/chat/completions`,
            {
                model: this.modelName,
                messages,
                temperature: 0.1,
                max_tokens: 1200,
            },
            { timeout: 180_000 },
        );

        return response.data?.choices?.[0]?.message?.content ?? '';
    }
}

export function createDefaultLmStudioClient(): LmStudioClient {
    const baseUrl = process.env.LM_BASE_URL ?? 'http://localhost:1234';
    const modelName = process.env.LM_MODEL ?? 'second-state/phi-3-mini-4k-instruct';
    return new LmStudioClient(baseUrl, modelName);
}
