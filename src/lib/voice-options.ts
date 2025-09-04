import { VoiceConfigManager } from "@/lib/voice-config";

export interface VoiceOption {
  id: string;
  name: string;
  description: string;
  provider: string;
  type: string;
}

// Get all voices from the centralized VoiceConfigManager
const getAllVoices = () => {
  const voices = VoiceConfigManager.getAllVoices();
  return voices.map(voice => ({
    id: voice.id,
    name: voice.name,
    description: voice.description,
    provider: voice.provider,
    type: voice.type
  }));
};

export const voiceOptions: VoiceOption[] = getAllVoices();

// Grouped by provider for organized display
export const voiceOptionsByProvider = {
  openai: voiceOptions.filter(voice => voice.provider === "openai"),
  elevenlabs: voiceOptions.filter(voice => voice.provider === "elevenlabs"),
};

export const getVoiceOption = (id: string): VoiceOption | undefined => {
  return voiceOptions.find((voice) => voice.id === id);
};

export const getDefaultVoiceOption = (): VoiceOption => {
  const defaultVoice = VoiceConfigManager.getDefaultVoice();
  return {
    id: defaultVoice.id,
    name: defaultVoice.name,
    description: defaultVoice.description,
    provider: defaultVoice.provider,
    type: defaultVoice.type
  };
};