import { Badge } from "@/components/ui/badge";
import type { VoiceOption } from "@/lib/voice-options";

interface VoiceSelectorProps {
  selectedVoice: string;
  onVoiceChange: (voice: string) => void;
  voices: VoiceOption[];
  limit?: number;
  namePrefix?: string;
}

export function VoiceSelector({
  selectedVoice,
  onVoiceChange,
  voices,
  limit,
  namePrefix = "",
}: VoiceSelectorProps) {
  const voicesToShow = limit ? voices.slice(0, limit) : voices;
  const radioName = `${namePrefix}voice`;

  // Group voices by provider
  const groupedVoices = voicesToShow.reduce((acc, voice) => {
    if (!acc[voice.provider]) {
      acc[voice.provider] = [];
    }
    acc[voice.provider].push(voice);
    return acc;
  }, {} as Record<string, VoiceOption[]>);

  const getProviderBadgeColor = (provider: string) => {
    switch (provider) {
      case 'openai':
        return 'text-blue-600 border-blue-200';
      case 'elevenlabs':
        return 'text-emerald-600 border-emerald-200';
      default:
        return 'text-gray-600 border-gray-200';
    }
  };

  const getProviderName = (provider: string) => {
    switch (provider) {
      case 'openai':
        return 'OpenAI';
      case 'elevenlabs':
        return 'ElevenLabs';
      default:
        return provider;
    }
  };

  return (
    <div>
      <label className="text-sm font-medium">Voice</label>
      <div className="mt-2 space-y-4">
        {Object.entries(groupedVoices).map(([provider, providerVoices]) => (
          <div key={provider} className="space-y-2">
            {/* Provider Header */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-700">
                {getProviderName(provider)} Voices
              </span>
              <Badge variant="outline" className={`text-xs ${getProviderBadgeColor(provider)}`}>
                {getProviderName(provider)}
              </Badge>
            </div>
            
            {/* Voices for this provider */}
            <div className="space-y-1 pl-2">
              {providerVoices.map((voice) => (
                <div key={voice.id} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id={`${namePrefix}${voice.id}`}
                    name={radioName}
                    value={voice.id}
                    checked={selectedVoice === voice.id}
                    onChange={(e) => onVoiceChange(e.target.value)}
                    className="h-4 w-4 text-blue-600"
                  />
                  <label htmlFor={`${namePrefix}${voice.id}`} className="flex-1 cursor-pointer">
                    <div className="text-sm font-medium">{voice.name}</div>
                    <div className="text-xs text-gray-500">{voice.description}</div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}