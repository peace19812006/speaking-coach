// Web Speech API Utility for Speech-to-Text and Text-to-Speech

export interface SpeechRecognitionResult {
  transcript: string;
  isFinal: boolean;
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

export function createSpeechRecognizer(
  onResult: (text: string) => void,
  onEnd: () => void,
  onError: (error: any) => void
): any {
  if (!isSpeechRecognitionSupported()) return null;

  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US'; // English speaking target

  recognition.onresult = (event: any) => {
    let finalTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      }
    }
    if (finalTranscript) {
      onResult(finalTranscript);
    }
  };

  recognition.onend = () => {
    onEnd();
  };

  recognition.onerror = (event: any) => {
    onError(event);
  };

  return recognition;
}

// Text to Speech
export function getEnglishVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return [];
  }
  const voices = window.speechSynthesis.getVoices();
  return voices.filter(v => v.lang.toLowerCase().startsWith('en') || v.lang.toLowerCase().includes('en-') || v.lang.toLowerCase().includes('en_'));
}

export function speakText(
  text: string, 
  voiceGenderPreference: 'neutral' | 'female' | 'male' = 'neutral',
  rate: number = 0.95, // slightly slower for language learners
  voiceName?: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      reject('Speech synthesis is not supported on this device.');
      return;
    }

    // Cancel any ongoing speaking
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    // Setting lang matches selected voice or falls back
    utterance.lang = 'en-US';
    utterance.rate = rate;

    // Pick English Voice
    const voices = window.speechSynthesis.getVoices();
    let selectedVoice: SpeechSynthesisVoice | undefined;

    if (voiceName) {
      selectedVoice = voices.find(v => v.name === voiceName);
    }

    if (!selectedVoice) {
      const englishVoices = voices.filter(v => {
        const l = v.lang.toLowerCase();
        return l.startsWith('en') || l.includes('en-') || l.includes('en_');
      });

      if (voiceGenderPreference === 'female') {
        selectedVoice = englishVoices.find(v => {
          const name = v.name.toLowerCase();
          return name.includes('zira') || name.includes('samantha') || name.includes('susan') || name.includes('hazel') || name.includes('google us english') || name.includes('female') || name.includes('natural') || name.includes('en-us-news-k');
        });
      } else if (voiceGenderPreference === 'male') {
        selectedVoice = englishVoices.find(v => {
          const name = v.name.toLowerCase();
          return name.includes('david') || name.includes('george') || name.includes('mark') || name.includes('daniel') || name.includes('male') || name.includes('google uk english male') || name.includes('en-us-news-i');
        });
      }

      if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang.startsWith('en-US') && v.name.toLowerCase().includes('google'));
      }
      if (!selectedVoice) {
        selectedVoice = englishVoices[0];
      }
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onend = () => {
      resolve();
    };

    utterance.onerror = (e) => {
      reject(e);
    };

    window.speechSynthesis.speak(utterance);
  });
}

// Keep track of any active HTMLAudioElement for remote TTS
let activeAudio: HTMLAudioElement | null = null;

export function registerActiveAudio(audio: HTMLAudioElement) {
  if (activeAudio) {
    try {
      activeAudio.pause();
    } catch (e) {
      console.log('Error pausing existing audio:', e);
    }
  }
  activeAudio = audio;
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  if (activeAudio) {
    try {
      activeAudio.pause();
    } catch (e) {
      console.log('Error pausing active audio:', e);
    }
    activeAudio = null;
  }
}

