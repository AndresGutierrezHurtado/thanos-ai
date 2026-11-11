import OpenAI from "openai";
import ISpeechProvider from "../../../application/ports/services/ISpeechProvider";

export interface OpenAiSpeechConfig {
    apiKey?: string;
    sttModel: string;
    ttsModel: string;
    voice: string;
    language: string;
}

export default class OpenAiSpeechProvider implements ISpeechProvider {
    private openAi?: OpenAI;

    constructor(private readonly config: OpenAiSpeechConfig) {}

    // Created on first use: the SDK throws without a key, and the app must still
    // start when voice is not used (e.g. chat and embeddings on Ollama only)
    private get client(): OpenAI {
        this.openAi ??= new OpenAI({ apiKey: this.config.apiKey });
        return this.openAi;
    }

    public async speechToText(audio: Buffer): Promise<string> {
        const mimeType = "audio/webm";
        const audioFile = new File([new Uint8Array(audio)], "audio.webm", { type: mimeType });

        const response = await this.client.audio.transcriptions.create({
            file: audioFile,
            model: this.config.sttModel,
            language: this.config.language,
        });

        return response.text;
    }

    public async textToSpeech(text: string): Promise<Buffer> {
        const response = await this.client.audio.speech.create({
            model: this.config.ttsModel,
            voice: this.config.voice,
            input: text,
        });
        return Buffer.from(await response.arrayBuffer());
    }
}
