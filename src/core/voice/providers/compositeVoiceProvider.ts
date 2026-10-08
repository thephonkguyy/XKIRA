import { VoiceProvider, StreamingSTTProvider, StreamingTTSProvider } from "../types";
import { WebSpeechSTTProvider, WebSpeechTTSProvider } from "./webSpeechProvider";
import { ServerVoiceSTTProvider, ServerVoiceTTSProvider } from "./serverVoiceProvider";

export function createDefaultVoiceProvider(): VoiceProvider {
  const webSTT = new WebSpeechSTTProvider();
  const webTTS = new WebSpeechTTSProvider();

  const stt: StreamingSTTProvider = webSTT.isSupported()
    ? webSTT
    : new ServerVoiceSTTProvider();

  const tts: StreamingTTSProvider = webTTS.isSupported()
    ? webTTS
    : new ServerVoiceTTSProvider();

  return { stt, tts };
}
