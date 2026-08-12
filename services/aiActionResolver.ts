import { compressPromptMessages } from './headroomService';

export interface AIActionResponse {
    action: string;
    target?: string;
    payload?: any;
    summary?: string;
    confidence?: number;
    requiresConfirmation?: boolean;
    confirmationMessage?: string;
    answer?: string;
    type?: string;
    compressionStats?: any;
}

export const resolveAIAction = async (prompt: string, context?: any): Promise<AIActionResponse> => {
    console.log('Resolving AI Action for prompt:', prompt, context);

    const inputMessages = [
        { role: 'system', content: 'You are an AI assistant for Sparta Sports Center managing schedules, users, and actions.' },
        { role: 'user', content: `Context: ${JSON.stringify(context || {})}\nPrompt: ${prompt}` }
    ];

    const compression = await compressPromptMessages(inputMessages);

    return {
        action: 'PARSED_ACTION',
        summary: `Command parsed: "${prompt}"`,
        confidence: 0.9,
        compressionStats: compression.stats
    };
};
