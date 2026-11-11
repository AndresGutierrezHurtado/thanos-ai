export default interface ISpeechProvider {
    speechToText(audio: Buffer): Promise<string>;
    textToSpeech(text: string): Promise<Buffer>;
}
