"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Volume2, Check } from "lucide-react";
import { VoiceConfigManager } from "@/lib/voice-config";

interface Voice {
  id: string;
  name: string;
  type: string;
  provider: string;
  description: string;
  color: string;
}

interface VoiceSelectionProps {
  selectedVoice: string;
  onVoiceSelect: (voiceId: string) => void;
}

// Get voices from the unified service
const voicesByProvider = VoiceConfigManager.getVoicesByProvider();

export function VoiceSelection({
  selectedVoice,
  onVoiceSelect,
}: VoiceSelectionProps) {
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [showMoreOpenAI, setShowMoreOpenAI] = useState(false);
  const [showMoreElevenLabs, setShowMoreElevenLabs] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlayDemo = async (voice: Voice) => {
    if (playingVoice === voice.id) {
      // Stop current audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingVoice(null);
      return;
    }

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
    }

    setPlayingVoice(voice.id);

    try {
      // Generate demo audio with a standard demo text
      const demoText = `Hello, I'm ${voice.name}. ${voice.description}`;

      const response = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: demoText,
          voice: voice.id,
          index: 0,
        }),
      });

      if (response.ok) {
        const { audioUrl } = await response.json();
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onended = () => {
          setPlayingVoice(null);
          audioRef.current = null;
        };

        audio.onerror = () => {
          setPlayingVoice(null);
          audioRef.current = null;
        };

        await audio.play();
      } else {
        setPlayingVoice(null);
      }
    } catch (error) {
      console.error("Error playing demo:", error);
      setPlayingVoice(null);
    }
  };

  const renderVoiceGroup = (
    voices: Voice[],
    title: string,
    providerBadge: string,
    providerColor: string,
    showMore: boolean,
    setShowMore: (show: boolean) => void,
  ) => {
    const visibleVoices = showMore ? voices : voices.slice(0, 3);

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium text-gray-900">{title}</h4>
          <Badge variant="outline" className={`text-xs ${providerColor}`}>
            {providerBadge}
          </Badge>
        </div>

        <div className="space-y-2">
          {visibleVoices.map((voice) => (
            <div
              key={voice.id}
              className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                selectedVoice === voice.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Voice Avatar */}
                <div
                  className={`h-10 w-10 rounded-full bg-gradient-to-br ${voice.color} flex items-center justify-center`}
                >
                  <Volume2 className="h-4 w-4 text-white" />
                </div>

                {/* Voice Info */}
                <div>
                  <div className="flex items-center gap-2">
                    <h5 className="text-sm font-medium">{voice.name}</h5>
                  </div>
                  <p className="text-xs text-gray-600">{voice.description}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 px-2 text-xs"
                      onClick={() => handlePlayDemo(voice)}
                    >
                      {playingVoice === voice.id ? (
                        <Pause className="mr-1 h-3 w-3" />
                      ) : (
                        <Play className="mr-1 h-3 w-3" />
                      )}
                      Preview
                    </Button>
                  </div>
                </div>
              </div>

              {/* Selection Button */}
              <div>
                {selectedVoice === voice.id ? (
                  <div className="flex items-center gap-2 text-blue-600">
                    <Check className="h-4 w-4" />
                    <span className="text-xs font-medium">Selected</span>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onVoiceSelect(voice.id)}
                    className="h-7 px-3 text-xs"
                  >
                    Select
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* View More Button */}
        {voices.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-full text-xs"
            onClick={() => setShowMore(!showMore)}
          >
            {showMore ? `View less` : `View ${voices.length - 3} more`}
            <svg
              className={`ml-2 h-3 w-3 transition-transform ${showMore ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </Button>
        )}
      </div>
    );
  };

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Voice Selection</h3>
        <p className="text-sm text-gray-600">
          Choose a voice for your content from multiple providers
        </p>
      </div>

      <div className="space-y-6">
        {/* OpenAI Voices */}
        {renderVoiceGroup(
          voicesByProvider.openai,
          "OpenAI Voices",
          "OpenAI",
          "text-blue-600 border-blue-200",
          showMoreOpenAI,
          setShowMoreOpenAI,
        )}

        {/* ElevenLabs Voices */}
        {renderVoiceGroup(
          voicesByProvider.elevenlabs,
          "ElevenLabs Voices",
          "ElevenLabs",
          "text-emerald-600 border-emerald-200",
          showMoreElevenLabs,
          setShowMoreElevenLabs,
        )}
      </div>
    </Card>
  );
}
