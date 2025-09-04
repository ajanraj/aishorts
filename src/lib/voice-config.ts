// Centralized voice configuration for both OpenAI and ElevenLabs providers

export interface VoiceConfig {
  id: string;
  name: string;
  provider: "openai" | "elevenlabs";
  type: string;
  description: string;
  color: string;
}

// OpenAI voice configurations
export const OPENAI_VOICES: VoiceConfig[] = [
  {
    id: "alloy",
    name: "Alloy",
    provider: "openai",
    type: "OpenAI Voice",
    description: "Neutral and balanced",
    color: "from-blue-400 to-purple-400",
  },
  {
    id: "echo",
    name: "Echo",
    provider: "openai",
    type: "OpenAI Voice",
    description: "Clear and articulate",
    color: "from-green-400 to-blue-400",
  },
  {
    id: "fable",
    name: "Fable",
    provider: "openai",
    type: "OpenAI Voice",
    description: "Warm and expressive",
    color: "from-red-400 to-pink-400",
  },
  {
    id: "onyx",
    name: "Onyx",
    provider: "openai",
    type: "OpenAI Voice",
    description: "Deep and authoritative",
    color: "from-blue-600 to-purple-600",
  },
  {
    id: "nova",
    name: "Nova",
    provider: "openai",
    type: "OpenAI Voice",
    description: "Bright and energetic",
    color: "from-yellow-400 to-orange-400",
  },
  {
    id: "shimmer",
    name: "Shimmer",
    provider: "openai",
    type: "OpenAI Voice",
    description: "Soft and gentle",
    color: "from-purple-400 to-pink-400",
  },
];

// ElevenLabs voice configurations
export const ELEVENLABS_VOICES: VoiceConfig[] = [
  {
    id: "21m00Tcm4TlvDq8ikWAM",
    name: "Rachel",
    provider: "elevenlabs",
    type: "ElevenLabs Voice",
    description: "Professional and clear",
    color: "from-emerald-400 to-teal-400",
  },
  {
    id: "AZnzlk1XvdvUeBnXmlld",
    name: "Domi",
    provider: "elevenlabs",
    type: "ElevenLabs Voice",
    description: "Confident and strong",
    color: "from-indigo-400 to-purple-400",
  },
  {
    id: "EXAVITQu4vr4xnSDxMaL",
    name: "Bella",
    provider: "elevenlabs",
    type: "ElevenLabs Voice",
    description: "Warm and friendly",
    color: "from-pink-400 to-rose-400",
  },
  {
    id: "ErXwobaYiN019PkySvjV",
    name: "Antoni",
    provider: "elevenlabs",
    type: "ElevenLabs Voice",
    description: "Deep and rich",
    color: "from-slate-400 to-gray-400",
  },
  {
    id: "MF3mGyEYCl7XYWbV9V6O",
    name: "Elli",
    provider: "elevenlabs",
    type: "ElevenLabs Voice",
    description: "Young and energetic",
    color: "from-cyan-400 to-blue-400",
  },
  {
    id: "TxGEqnHWrfWFTfGW9XjX",
    name: "Josh",
    provider: "elevenlabs",
    type: "ElevenLabs Voice",
    description: "Calm and measured",
    color: "from-amber-400 to-orange-400",
  },
];

// Combined configuration
export const VOICE_CONFIG = {
  openai: OPENAI_VOICES,
  elevenlabs: ELEVENLABS_VOICES,
} as const;

// Utility functions for voice management
export class VoiceConfigManager {
  /**
   * Get all voices from both providers
   */
  static getAllVoices(): VoiceConfig[] {
    return [...OPENAI_VOICES, ...ELEVENLABS_VOICES];
  }

  /**
   * Get voices grouped by provider
   */
  static getVoicesByProvider() {
    return VOICE_CONFIG;
  }

  /**
   * Find a voice by ID
   */
  static findVoice(voiceId: string): VoiceConfig | undefined {
    return this.getAllVoices().find((voice) => voice.id === voiceId);
  }

  /**
   * Check if a voice ID belongs to ElevenLabs
   */
  static isElevenLabsVoice(voiceId: string): boolean {
    return ELEVENLABS_VOICES.some((voice) => voice.id === voiceId);
  }

  /**
   * Check if a voice ID belongs to OpenAI
   */
  static isOpenAIVoice(voiceId: string): boolean {
    return OPENAI_VOICES.some((voice) => voice.id === voiceId);
  }

  /**
   * Get ElevenLabs voice IDs as a Set for fast lookup
   */
  static getElevenLabsVoiceIds(): Set<string> {
    return new Set(ELEVENLABS_VOICES.map((voice) => voice.id));
  }

  /**
   * Get OpenAI voice IDs as an array
   */
  static getOpenAIVoiceIds(): string[] {
    return OPENAI_VOICES.map((voice) => voice.id);
  }

  /**
   * Get the default voice (Echo from OpenAI)
   */
  static getDefaultVoice(): VoiceConfig {
    return (
      OPENAI_VOICES.find((voice) => voice.id === "echo") || OPENAI_VOICES[0]
    );
  }
}
