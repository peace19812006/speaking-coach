/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  PRACTICE_TOPICS 
} from './topicsData.js';
import { 
  LearningLevel, 
  PracticeTopic, 
  AssessmentResult, 
  RoleplaySession,
  PracticeType
} from './types.js';
import { 
  isSpeechRecognitionSupported, 
  createSpeechRecognizer, 
  speakText, 
  stopSpeaking,
  getEnglishVoices,
  registerActiveAudio
} from './utils/speech.js';
import GradeReport from './components/GradeReport.js';
import { 
  Sparkles, 
  Mic, 
  MicOff, 
  Volume2, 
  ArrowRight, 
  BookOpen, 
  CheckCircle2, 
  HelpCircle, 
  Info, 
  ChevronRight, 
  Send, 
  Layers, 
  PlusCircle, 
  AlertTriangle, 
  RefreshCw, 
  MessageSquare, 
  Award, 
  Timer, 
  VolumeX, 
  CheckSquare, 
  Briefcase, 
  GraduationCap,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const GEMINI_VOICES = [
  { name: 'Gemini-Puck-Female', displayName: 'Gemini - Puck', realName: 'Puck', gender: 'Nữ 👩', description: 'Vui vẻ, sinh động', flag: '✨' },
  { name: 'Gemini-Charon-Male', displayName: 'Gemini - Charon', realName: 'Charon', gender: 'Nam 👨', description: 'Trầm ấm, nghiêm nghị', flag: '✨' },
  { name: 'Gemini-Kore-Female', displayName: 'Gemini - Kore', realName: 'Kore', gender: 'Nữ 👩', description: 'Thanh nhã, tinh tế', flag: '✨' },
  { name: 'Gemini-Fenrir-Male', displayName: 'Gemini - Fenrir', realName: 'Fenrir', gender: 'Nam 👨', description: 'Trầm khàn, nam tính', flag: '✨' },
  { name: 'Gemini-Zephyr-Female', displayName: 'Gemini - Zephyr', realName: 'Zephyr', gender: 'Nữ 👩', description: 'Bay bổng, ngọt ngào', flag: '✨' },
];

const getVoiceInfo = (voice: SpeechSynthesisVoice) => {
  const name = voice.name.toLowerCase();
  const lang = voice.lang;
  
  let gender = 'Nữ 👩';
  if (name.includes('david') || name.includes('george') || name.includes('mark') || name.includes('daniel') || name.includes('male') || name.includes('en-us-news-i') || name.includes('en-uk-news-f') || name.includes('en-uk-news-m') || name.includes('hazel')) {
    if (name.includes('hazel')) {
      gender = 'Nữ 👩';
    } else {
      gender = 'Nam 👨';
    }
  } else if (name.includes('zira') || name.includes('samantha') || name.includes('susan') || name.includes('female') || name.includes('en-us-news-k') || name.includes('google us english') || name.includes('en-gb-news-k')) {
    gender = 'Nữ 👩';
  } else {
    // Basic heuristic: check if common female keywords, otherwise guess based on typical voice APIs
    gender = 'Nữ/Trung tính 🗣️';
  }

  let flag = '🌐';
  if (lang.includes('US') || lang.includes('us') || lang.includes('en-US')) flag = '🇺🇸';
  else if (lang.includes('GB') || lang.includes('gb') || lang.includes('UK') || lang.includes('uk') || lang.includes('en-GB')) flag = '🇬🇧';
  else if (lang.includes('AU') || lang.includes('au') || lang.includes('en-AU')) flag = '🇦🇺';
  else if (lang.includes('CA') || lang.includes('ca') || lang.includes('en-CA')) flag = '🇨🇦';
  else if (lang.includes('IN') || lang.includes('in') || lang.includes('en-IN')) flag = '🇮🇳';
  else if (lang.includes('IE') || lang.includes('ie') || lang.includes('en-IE')) flag = '🇮🇪';

  return { gender, flag };
};

export default function App() {
  // Topics state loading from local storage to keep user custom topics
  const [topicsList, setTopicsList] = useState<PracticeTopic[]>(() => {
    const saved = localStorage.getItem('ai_esl_custom_topics');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const customIds = new Set(parsed.map((p: any) => p.id));
          const builtIn = PRACTICE_TOPICS.filter(t => !customIds.has(t.id));
          return [...builtIn, ...parsed];
        }
      } catch (e) {
        console.error('Failed to load custom topics:', e);
      }
    }
    return PRACTICE_TOPICS;
  });

  const [selectedLevel, setSelectedLevel] = useState<LearningLevel>('beginner');
  const [selectedTopic, setSelectedTopic] = useState<PracticeTopic>(topicsList[0] || PRACTICE_TOPICS[0]);
  const [isRecording, setIsRecording] = useState(false);
  const [hasTestedSupport, setHasTestedSupport] = useState(false);
  const [recognitionSupported, setRecognitionSupported] = useState(true);
  
  // Custom manual input or voice transcript state
  const [spokenText, setSpokenText] = useState('');
  const [interimSpokenText, setInterimSpokenText] = useState('');
  
  // Interactive Chat / Roleplay session state
  const [chatMessages, setChatMessages] = useState<{ id: string; sender: 'user' | 'ai'; text: string; timestamp: number }[]>([]);
  const [chatTextInput, setChatTextInput] = useState('');
  const [isLoadingChat, setIsLoadingChat] = useState(false);

  // General flow control
  const [isLoadingAssessment, setIsLoadingAssessment] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
  const [backendStatus, setBackendStatus] = useState<{ hasApiKey: boolean; status: string } | null>(null);
  
  // New customized topic generation state
  const [customIdea, setCustomIdea] = useState('');
  const [customType, setCustomType] = useState<PracticeType>('dialogue');
  const [customLevel, setCustomLevel] = useState<LearningLevel>('beginner');
  const [isGeneratingTopic, setIsGeneratingTopic] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Voice speaker state
  const [playingPhraseIndex, setPlayingPhraseIndex] = useState<number | null>(null);
  const [isReadingPrompt, setIsReadingPrompt] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('Gemini-Kore-Female');

  useEffect(() => {
    const loadVoices = () => {
      const voices = getEnglishVoices();
      setAvailableVoices(voices);
    };

    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const speakWithSelect = async (
    text: string, 
    voiceGender: 'neutral' | 'female' | 'male' = 'neutral', 
    rate = 0.95,
    overrideVoiceName?: string
  ) => {
    const activeVoiceName = overrideVoiceName || selectedVoiceName;
    const isGeminiVoice = activeVoiceName.startsWith('Gemini-');
    
    if (isGeminiVoice) {
      const geminiVoice = GEMINI_VOICES.find(v => v.name === activeVoiceName);
      if (geminiVoice) {
        // Stop any active local speech synthesis or other active audio first
        stopSpeaking();

        try {
          const response = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text,
              voiceName: geminiVoice.realName
            })
          });

          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'TTS operation failed');
          }

          const data = await response.json();
          const base64Audio = data.audioContent;

          return new Promise<void>((resolve, reject) => {
            const audioSrc = `data:audio/mp3;base64,${base64Audio}`;
            const audio = new Audio(audioSrc);
            registerActiveAudio(audio);
            
            audio.onended = () => {
              resolve();
            };
            audio.onerror = (e) => {
              reject(e);
            };
            audio.play().catch(reject);
          });
        } catch (error) {
          console.error("Gemini TTS high-quality voice failed, falling back to Web Speech:", error);
          const fallbackGender = geminiVoice.gender.includes('Nam') ? 'male' : 'female';
          return speakText(text, fallbackGender, rate);
        }
      }
    }

    return speakText(text, voiceGender, rate, activeVoiceName);
  };

  // Conversational script practice states
  const [isScriptMode, setIsScriptMode] = useState<boolean>(true);
  const [userScriptRole, setUserScriptRole] = useState<'A' | 'B'>('A');
  const [currentScriptIndex, setCurrentScriptIndex] = useState<number>(0);
  const [scriptScoreList, setScriptScoreList] = useState<{ [key: number]: number }>({});

  const calculateTextSimilarity = (str1: string, str2: string) => {
    const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '');
    const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!s1 || !s2) return 0;
    if (s1 === s2) return 100;
    const m = s1.length;
    const n = s2.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
       for (let j = 1; j <= n; j++) {
         if (s1[i - 1] === s2[j - 1]) {
           dp[i][j] = dp[i - 1][j - 1];
         } else {
           dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
         }
       }
    }
    const dist = dp[m][n];
    const maxLen = Math.max(m, n);
    return Math.round(((maxLen - dist) / maxLen) * 100);
  };

  // Inactivity tracking states
  const [inactiveTimerCount, setInactiveTimerCount] = useState<number>(0);
  const [isUserInactive, setIsUserInactive] = useState<boolean>(false);
  const [aiGeneratedHint, setAiGeneratedHint] = useState<{
    vietnameseAdvice: string;
    suggestions: { english: string; vietnamese: string }[];
  } | null>(null);
  const [isLoadingHint, setIsLoadingHint] = useState<boolean>(false);
  const [playingHintIndex, setPlayingHintIndex] = useState<number | null>(null);

  // Speech Recognition reference
  const recognizerRef = useRef<any>(null);
  const checkIntervalRef = useRef<any>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const prevLevelRef = useRef<LearningLevel>(selectedLevel);

  // Global Free Chat with AI States
  const [isGlobalChatOpen, setIsGlobalChatOpen] = useState<boolean>(false);
  const [globalChatMessages, setGlobalChatMessages] = useState<{ id: string; sender: 'user' | 'ai'; text: string; timestamp: number }[]>(() => [
    { id: 'welcome', sender: 'ai', text: "Hi there! I am your AI ESL Conversation Partner & Tutor. 🇺🇸✨ We can freely talk about any subject you like (hobbies, weather, daily life, coding), or we can switch the toggle above to discuss our current lesson context! How are you doing today? Let's start speaking!", timestamp: Date.now() }
  ]);
  const [globalChatTextInput, setGlobalChatTextInput] = useState<string>('');
  const [isGlobalChatRecording, setIsGlobalChatRecording] = useState<boolean>(false);
  const [globalChatInterimText, setGlobalChatInterimText] = useState<string>('');
  const [isGlobalChatLoading, setIsGlobalChatLoading] = useState<boolean>(false);
  const [globalChatContext, setGlobalChatContext] = useState<'general' | 'topic'>('general');
  const [isGlobalChatAutoSpeak, setIsGlobalChatAutoSpeak] = useState<boolean>(true);

  // Global speech recognition variables
  const globalRecognizerRef = useRef<any>(null);
  const globalChatBottomRef = useRef<HTMLDivElement>(null);

  const startGlobalChatRecording = () => {
    if (!recognitionSupported) {
      alert("Hệ điều hành hoặc trình duyệt này không hỗ trợ trực tiếp Microphone API. Vui lòng gõ tiếng Anh để luyện tập!");
      return;
    }
    setGlobalChatInterimText('Đang lắng nghe... Hãy bắt đầu nói...');
    setIsGlobalChatRecording(true);
    try {
      const recognizer = createSpeechRecognizer(
        (finalText) => {
          setGlobalChatTextInput(prev => {
            const separator = prev.trim() ? ' ' : '';
            return prev + separator + finalText;
          });
          setGlobalChatInterimText('');
        },
        () => {
          setIsGlobalChatRecording(false);
          setGlobalChatInterimText('');
        },
        (err) => {
          console.error('Speech recognition error:', err);
          setIsGlobalChatRecording(false);
          setGlobalChatInterimText('');
        }
      );
      if (recognizer) {
        globalRecognizerRef.current = recognizer;
        recognizer.start();
      }
    } catch (e) {
      console.error(e);
      setIsGlobalChatRecording(false);
    }
  };

  const stopGlobalChatRecording = () => {
    if (globalRecognizerRef.current) {
      try {
        globalRecognizerRef.current.stop();
      } catch (e) {
        console.error(e);
      }
    }
    setIsGlobalChatRecording(false);
    setGlobalChatInterimText('');
  };

  const toggleGlobalChatRecording = () => {
    if (isGlobalChatRecording) {
      stopGlobalChatRecording();
    } else {
      startGlobalChatRecording();
    }
  };

  const handleSendGlobalChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const userText = globalChatTextInput.trim();
    if (!userText) return;

    stopSpeaking();

    const updatedMessages = [
      ...globalChatMessages,
      {
        id: 'user-' + Date.now(),
        sender: 'user' as const,
        text: userText,
        timestamp: Date.now()
      }
    ];

    setGlobalChatMessages(updatedMessages);
    setGlobalChatTextInput('');
    setIsGlobalChatLoading(true);

    try {
      const reqTopicId = globalChatContext === 'topic' ? selectedTopic.id : 'general-freechat';
      const reqLevel = globalChatContext === 'topic' ? selectedTopic.level : selectedLevel;

      const response = await fetch('/api/roleplay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          topicId: reqTopicId,
          level: reqLevel
        })
      });

      if (!response.ok) throw new Error("Gặp sự cố khi kết nối máy chủ AI.");
      const data = await response.json();

      setGlobalChatMessages(prev => [...prev, data]);

      if (isGlobalChatAutoSpeak) {
        speakWithSelect(data.text, 'neutral', 0.95);
      }
    } catch (err: any) {
      console.error(err);
      setGlobalChatMessages(prev => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          sender: 'ai',
          text: "I read you perfectly! Could you please elaborate on that? (Just a temporary network timeout, but I am here for you!)",
          timestamp: Date.now()
        }
      ]);
    } finally {
      setIsGlobalChatLoading(false);
    }
  };

  // Scroll to bottom of global companion chat
  useEffect(() => {
    if (globalChatBottomRef.current) {
      globalChatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [globalChatMessages]);

  // Fetch backend status
  useEffect(() => {
    fetch('/api/status')
      .then((res) => res.json())
      .then((data) => {
        setBackendStatus(data);
      })
      .catch((e) => console.error('Error fetching backend status:', e));

    const supported = isSpeechRecognitionSupported();
    setRecognitionSupported(supported);
    setHasTestedSupport(true);
  }, []);

  // Update selected topic if selectedLevel changes
  useEffect(() => {
    if (prevLevelRef.current !== selectedLevel) {
      const matching = topicsList.filter(t => t.level === selectedLevel);
      if (matching.length > 0) {
        handleSelectTopic(matching[0]);
      }
      prevLevelRef.current = selectedLevel;
    }
  }, [selectedLevel, topicsList]);

  // Scroll to bottom of dialogue chat
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // Stop TTS voice whenever topic changes
  useEffect(() => {
    stopSpeaking();
    setIsReadingPrompt(false);
    setPlayingPhraseIndex(null);
  }, [selectedTopic]);

  // Trigger fetch of conversational suggestion/hint when quiet too long (20s)
  const fetchUserInactivityHint = async () => {
    if (isLoadingHint) return;
    setIsLoadingHint(true);
    try {
      const response = await fetch('/api/generate-hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: chatMessages,
          topicId: selectedTopic.id,
          level: selectedTopic.level,
          type: selectedTopic.type
        })
      });
      if (response.ok) {
        const data = await response.json();
        setAiGeneratedHint(data);
      }
    } catch (e) {
      console.error("Failed to fetch user suggestion:", e);
    } finally {
      setIsLoadingHint(false);
    }
  };

  // Inactivity Detector logic
  useEffect(() => {
    // Reset timer on message list update or manual level/topic selection shifts
    setInactiveTimerCount(0);
    setIsUserInactive(false);
    setAiGeneratedHint(null);
  }, [chatMessages, selectedTopic, isRecording]);

  useEffect(() => {
    // We only detect inactivity if we are actively practicing and not currently evaluating
    if (isLoadingAssessment || isLoadingChat || assessmentResult) {
      return;
    }

    // Check if user is typing or if there's text, keep the countdown empty
    if (chatTextInput.trim().length > 0 || spokenText.trim().length > 0) {
      if (inactiveTimerCount > 0) {
        setInactiveTimerCount(0);
      }
      return;
    }

    const interval = setInterval(() => {
      setInactiveTimerCount((prev) => {
        const nextValue = prev + 1;
        // Trigger inactivity advice panel at 20 seconds of silence/no action
        if (nextValue >= 20) {
          setIsUserInactive(true);
          clearInterval(interval);
        }
        return nextValue;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [inactiveTimerCount, isLoadingAssessment, isLoadingChat, assessmentResult, chatTextInput, spokenText, chatMessages, selectedTopic, isRecording]);

  // When flagged as inactive, dynamically ask AI to help if not already fetched
  useEffect(() => {
    if (isUserInactive && !aiGeneratedHint && !isLoadingHint) {
      fetchUserInactivityHint();
    }
  }, [isUserInactive, aiGeneratedHint]);

  // Trigger AI auto-speaking and auto-advancing in dialogue script mode
  useEffect(() => {
    if (!isScriptMode || !selectedTopic || !selectedTopic.dialogueScript) return;
    const script = selectedTopic.dialogueScript;
    if (currentScriptIndex >= script.length) return;

    const line = script[currentScriptIndex];
    const isAITurn = line.roleTag !== userScriptRole;
    if (isAITurn) {
      let isSubscribed = true;
      const timer = setTimeout(async () => {
        try {
          await speakWithSelect(line.text, 'neutral', 0.95);
          if (isSubscribed) {
            // Once AI speech is complete, wait brief moment and advance to the user's turn
            setTimeout(() => {
              if (isSubscribed) {
                setCurrentScriptIndex(prev => prev + 1);
              }
            }, 600);
          }
        } catch (err) {
          console.log("AI speech narration ended or was stopped: ", err);
        }
      }, 700);

      return () => {
        isSubscribed = false;
        clearTimeout(timer);
      };
    }
  }, [currentScriptIndex, userScriptRole, selectedTopic, isScriptMode, selectedVoiceName]);

  // Auto-start recording for user's turn in dialogue script mode
  useEffect(() => {
    if (!isScriptMode || !selectedTopic || !selectedTopic.dialogueScript) return;
    const script = selectedTopic.dialogueScript;
    if (currentScriptIndex >= script.length) return;

    const line = script[currentScriptIndex];
    const isUserTurn = line.roleTag === userScriptRole;

    if (isUserTurn) {
      // Clean previous spoken states to avoid lingering entries
      setSpokenText('');
      setChatTextInput('');
      setInterimSpokenText('');

      if (recognitionSupported && !isRecording) {
        // Comfortable rest pause for the user before activating the microphone
        const recordTimer = setTimeout(() => {
          startRecording();
        }, 500);
        return () => clearTimeout(recordTimer);
      }
    } else {
      // Turn off recording when it is not the user's active turn to prevent overlap
      if (isRecording) {
        stopRecording();
      }
    }
  }, [currentScriptIndex, userScriptRole, selectedTopic, isScriptMode, recognitionSupported]);

  const handleSelectTopic = (topic: PracticeTopic) => {
    setSelectedTopic(topic);
    setSpokenText('');
    setInterimSpokenText('');
    setAssessmentResult(null);
    stopSpeaking();

    // Reset Script practice states
    if (topic.dialogueScript && topic.dialogueScript.length > 0) {
      setIsScriptMode(true);
      setCurrentScriptIndex(0);
      setScriptScoreList({});
      setUserScriptRole('A');
    } else {
      setIsScriptMode(false);
      setCurrentScriptIndex(0);
    }

    // Reset Dialogue/Roleplay history if applicable
    if (topic.type === 'dialogue' || topic.type === 'roleplay' || topic.type === 'debate') {
      const initialGreeting = getInitialGreetingForTopic(topic);
      setChatMessages([
        {
          id: 'initial',
          sender: 'ai',
          text: initialGreeting,
          timestamp: Date.now()
        }
      ]);
      // Speak the greeting initially (only if not running a rigid dialogueScript to prevent audio fights)
      if (!topic.dialogueScript) {
        speakWithSelect(initialGreeting, 'neutral', 0.95).catch(err => console.log('Init TTS blocked:', err));
      }
    } else {
      setChatMessages([]);
    }
  };

  const getInitialGreetingForTopic = (topic: PracticeTopic) => {
    if (topic.id === 'beg-coffee-shop') {
      return "Hello! Warm welcome to the Daily Grind Coffee Shop. What can I brew for you today? We have delicious espressos, lattes, and fresh organic tea.";
    }
    if (topic.id === 'int-job-interview') {
      return "Welcome to Google Technologies. I am the HR Director here. Thank you for coming in today. To begin, could you please introduce yourself and walk me through your career history?";
    }
    if (topic.id === 'adv-debate-ai') {
      return "Greetings, worthy defender of traditional academies. Let's debate! I firmly assert that physical brick-and-mortar schools with human teachers are slow, inefficient, and obsolete in this digital era. AI tutors can fulfill customizable education at zero cost. What is your argument against this reality?";
    }
    if (topic.id === 'adv-ielts-p3-technology') {
      return "Welcome to the Speaking Module. Let's start with abstract dynamics. In your view, do you believe virtual communication has permanently damaged our capability for face-to-face intimacy? Why or why not?";
    }
    return "Hi there! I am ready to practice. Tell me, what are your thoughts relative to our topic today?";
  };

  // Handle Speech-to-text
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = () => {
    if (!recognitionSupported) {
      alert("Hệ điều hành hoặc trình duyệt này không hỗ trợ trực tiếp Microphone API (Vui lòng sử dụng Chrome, Edge hoặc Safari để trải nghiệm tốt nhất). Bạn vẫn có thể luyện tập bằng cách nhập văn bản thô!");
      return;
    }

    setInterimSpokenText('Đang lắng nghe... Hãy nói to, rõ ràng vào microphone...');
    setIsRecording(true);

    try {
      const recognizer = createSpeechRecognizer(
        (finalText) => {
          setSpokenText(prev => {
            const separator = prev.trim() ? ' ' : '';
            return prev + separator + finalText;
          });
          setInterimSpokenText('');
        },
        () => {
          setIsRecording(false);
          setInterimSpokenText('');
        },
        (err) => {
          console.error('Speech recognition error:', err);
          setIsRecording(false);
          setInterimSpokenText('');
        }
      );

      if (recognizer) {
        recognizerRef.current = recognizer;
        recognizer.start();
      }
    } catch (e) {
      console.error(e);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recognizerRef.current) {
      try {
        recognizerRef.current.stop();
      } catch (e) {
        console.error(e);
      }
    }
    setIsRecording(false);
    setInterimSpokenText('');
  };

  // Play Text to speech for suggestions
  const handlePlayPhrase = async (index: number, phrase: string) => {
    if (playingPhraseIndex === index) {
      stopSpeaking();
      setPlayingPhraseIndex(null);
      return;
    }
    setPlayingPhraseIndex(index);
    try {
      await speakWithSelect(phrase, 'neutral', 0.95);
    } catch (e) {
      console.error(e);
    } finally {
      setPlayingPhraseIndex(null);
    }
  };

  const handlePlayPrompt = async () => {
    if (isReadingPrompt) {
      stopSpeaking();
      setIsReadingPrompt(false);
      return;
    }
    setIsReadingPrompt(true);
    try {
      await speakWithSelect(selectedTopic.prompt, 'neutral', 0.9);
    } catch (e) {
      console.error(e);
    } finally {
      setIsReadingPrompt(false);
    }
  };

  // Submit speaking block or presentation for AI evaluation
  const handleAnalyzeSpeech = async (customText?: string) => {
    const textToAnalyze = customText || spokenText;
    if (!textToAnalyze || textToAnalyze.trim().length < 5) {
      alert('Vui lòng nói tối thiểu 1 câu hoặc nhập đoạn văn ngắn để AI có thể đánh giá và chỉnh sửa hiệu quả nhất!');
      return;
    }

    setIsLoadingAssessment(true);
    stopSpeaking();
    try {
      const response = await fetch('/api/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: textToAnalyze,
          topicId: selectedTopic.id,
          level: selectedTopic.level,
          type: selectedTopic.type,
          promptText: selectedTopic.prompt
        })
      });

      if (!response.ok) {
        throw new Error('Không thể kết nối đến máy chủ đánh giá!');
      }

      const result = await response.json();
      setAssessmentResult(result);
    } catch (e: any) {
      alert('Đã xảy ra lỗi: ' + e.message);
    } finally {
      setIsLoadingAssessment(false);
    }
  };

  // Live dialogue: Send message inside active chat session
  const handleSendChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const userText = chatTextInput.trim() || spokenText.trim();
    if (!userText) return;

    // Stop speaking currently to prepare for answer
    stopSpeaking();

    // 1. Appends the user's message
    const updatedMessages = [
      ...chatMessages,
      {
        id: 'user-' + Date.now(),
        sender: 'user' as const,
        text: userText,
        timestamp: Date.now()
      }
    ];
    setChatMessages(updatedMessages);
    setChatTextInput('');
    setSpokenText(''); // Reset transcript buffer so they can record anew
    setIsLoadingChat(true);

    try {
      const response = await fetch('/api/roleplay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          topicId: selectedTopic.id,
          level: selectedTopic.level
        })
      });

      if (!response.ok) throw new Error("Gặp sự cố khi gửi tin nhắn thoại!");
      const data = await response.json();

      setChatMessages(prev => [...prev, data]);
      
      // Auto pronounce AI's conversational response
      await speakWithSelect(data.text, 'neutral', 0.95);
    } catch (err: any) {
      console.error(err);
      // Fallback
      setChatMessages(prev => [
        ...prev,
        {
          id: 'error-' + Date.now(),
          sender: 'ai',
          text: "I read you loud and clear! Could you expand a bit on that? (There was a momentary internet latency, but I am still with you!)",
          timestamp: Date.now()
        }
      ]);
    } finally {
      setIsLoadingChat(false);
    }
  };

  // Compile entire communication stream to get calculated assessment scores
  const handleAssessDialogueSession = () => {
    const conversationStream = chatMessages
      .map(m => `${m.sender === 'user' ? 'Me' : 'Partner'}: "${m.text}"`)
      .join('\n');
    
    handleAnalyzeSpeech(conversationStream);
  };

  // Generate customized topic through AI or local backend callback
  const handleGenerateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customIdea.trim()) {
      setGenerationError('Vui lòng nhập ý tưởng chủ đề nói tiếng Anh của bạn!');
      return;
    }

    setIsGeneratingTopic(true);
    setGenerationError(null);
    try {
      const response = await fetch('/api/generate-topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIdea: customIdea.trim(),
          level: customLevel,
          type: customType
        })
      });

      if (!response.ok) {
        throw new Error('Gặp sự cố khi kết nối tới máy chủ tạo chủ đề!');
      }

      const newTopic: PracticeTopic = await response.json();
      
      // Update local React list state
      const updatedList = [newTopic, ...topicsList];
      setTopicsList(updatedList);
      
      // Save to localStorage (custom items only)
      const customOnly = updatedList.filter(t => t.id.startsWith('custom-'));
      localStorage.setItem('ai_esl_custom_topics', JSON.stringify(customOnly));

      // Synchronize proficiency view state
      setSelectedLevel(newTopic.level);
      
      // Select the new topic immediately
      handleSelectTopic(newTopic);

      // Reset prompt field
      setCustomIdea('');
    } catch (err: any) {
      console.error('Error generating customized topic:', err);
      setGenerationError(err.message || 'Lỗi xảy ra trong quá trình tạo chủ đề mới.');
    } finally {
      setIsGeneratingTopic(false);
    }
  };

  const filteredTopics = topicsList.filter((t) => t.level === selectedLevel);

  return (
    <div id="app_root" className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Upper Navigation Header */}
      <header id="app_header" className="bg-white border-b border-slate-200/80 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-md shadow-indigo-600/20">
              <Mic className="w-5 h-5 text-indigo-50 animate-pulse" />
            </div>
            <div>
              <span className="text-sm font-extrabold tracking-tight text-slate-900 flex items-center gap-1">
                AI ENGLISH COACH
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono uppercase font-semibold">Live v1.2</span>
              </span>
              <p className="text-[11px] text-slate-500 font-medium">Lớp luyện khẩu ngữ, phát âm & sửa lỗi toàn diện</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {backendStatus ? (
              <div className="hidden sm:flex items-center gap-2 text-xs bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                <span className={`w-2 h-2 rounded-full ${backendStatus.hasApiKey ? 'bg-emerald-500' : 'bg-orange-400'}`}></span>
                <span className="text-slate-600 font-medium">
                  {backendStatus.hasApiKey ? 'AI Engine Ready' : 'Fallback Simulator Mode'}
                </span>
                {!backendStatus.hasApiKey && (
                  <div className="group relative">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
                    <span className="absolute bottom-full right-0 mb-2 w-64 bg-slate-900 text-white text-[10px] rounded p-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-all leading-normal">
                      Cung cấp GEMINI_API_KEY ở hộp thoại 'Secrets' (trong Settings ở phía trên cùng) để kích hoạt công nghệ chấm điểm phân tích sâu của Google Gemini AI!
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <span className="text-xs text-slate-400 animate-pulse">Checking API Status...</span>
            )}

            <button
              onClick={() => setIsGlobalChatOpen(prev => !prev)}
              style={{ cursor: 'pointer' }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isGlobalChatOpen 
                  ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300' 
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 animate-pulse" />
              <span>AI Chat Mọi Nơi 💬</span>
            </button>

            <a 
              href="https://ai.studio/build" 
              target="_blank" 
              rel="noreferrer"
              className="text-xs font-semibold text-slate-600 hover:text-indigo-600 border border-slate-200 py-1.5 px-3 rounded-lg bg-slate-50 hover:bg-indigo-50/30 transition-all"
            >
              Google Workspace App
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main id="app_main" className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Controls, Level Selection & Topic Collection */}
        <div id="catalog_nav" className="lg:col-span-4 space-y-6">
          
          {/* Level Switcher Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Layers className="w-4.5 h-4.5 text-indigo-500" />
              CHỌN CẤP ĐỘ CỦA BẠN (SKILL LEVEL)
            </h2>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Bạn đang ở trình độ nào? Các đề tài và mức độ chấm điểm của AI sẽ được tùy chỉnh tối ưu.
            </p>

            <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-xl">
              {(['beginner', 'intermediate', 'advanced'] as LearningLevel[]).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setSelectedLevel(lvl)}
                  style={{ cursor: 'pointer' }}
                  className={`py-2 rounded-lg text-xs font-bold capitalize transition-all ${
                    selectedLevel === lvl
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  {lvl === 'beginner' ? 'Sơ Cấp 🌱' : lvl === 'intermediate' ? 'Trung Cấp 📈' : 'Cao Cấp ⚡'}
                </button>
              ))}
            </div>
          </div>

          {/* Phòng Trò Chuyện Tự Do (Free Chat Companion UI Card) */}
          <div className="bg-gradient-to-br from-indigo-50/75 to-violet-50/50 border border-indigo-100 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                💬
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">Trò Chuyện Tự Do Với AI</h3>
                <p className="text-[10px] text-slate-500 font-medium font-sans">Bất kì chủ đề & cảm xúc nào</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-sans">
              Bạn muốn thảo luận về cuộc sống, rèn luyện kỹ năng phỏng vấn hay tự do chia sẻ? Hãy kết nối với AI Partner!
            </p>
            <button
              type="button"
              onClick={() => {
                setIsGlobalChatOpen(true);
                setGlobalChatContext('general');
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-slate-900 text-white text-xs font-bold transition-all cursor-pointer shadow-xs whitespace-nowrap"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>BẮT ĐẦU CHAT TỰ DO NGAY 🚀</span>
            </button>
          </div>

          {/* AI Custom Topic Creator Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-4.5 h-4.5 text-indigo-500" />
              TỰ TẠO CHỦ ĐỀ BẰNG AI (CREATOR)
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Bạn chỉ cần gõ ý tưởng đơn giản (vd: <i>"phỏng vấn tiếp viên hàng không"</i>, <i>"kể về đồ ăn ngày Tết"</i>), Gemini AI sẽ tự động tạo giáo trình học nói hoàn chỉnh cho riêng bạn!
            </p>

            <form onSubmit={handleGenerateTopic} className="space-y-3">
              <div>
                <textarea
                  value={customIdea}
                  onChange={(e) => setCustomIdea(e.target.value)}
                  placeholder="Nhập ý tưởng đơn giản tại đây..."
                  rows={2}
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 text-slate-800 resize-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="space-y-1">
                  <label className="text-slate-500 font-semibold block text-[10px]">Trình độ mục tiêu:</label>
                  <select
                    value={customLevel}
                    onChange={(e) => setCustomLevel(e.target.value as LearningLevel)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-[11px] focus:outline-none text-slate-700 font-medium cursor-pointer"
                  >
                    <option value="beginner">Sơ cấp 🌱</option>
                    <option value="intermediate">Trung cấp 📈</option>
                    <option value="advanced">Cao cấp ⚡</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 font-semibold block text-[10px]">Phương pháp:</label>
                  <select
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value as PracticeType)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-[11px] focus:outline-none text-slate-700 font-medium cursor-pointer"
                  >
                    <option value="dialogue">Hội thoại 💬</option>
                    <option value="roleplay">Nhập vai 🎭</option>
                    <option value="read-aloud">Đọc thành tiếng 📖</option>
                    <option value="ielts">IELTS Cue Card 🎖️</option>
                    <option value="debate">Tranh biện ⚔️</option>
                  </select>
                </div>
              </div>

              {generationError && (
                <p className="text-[11px] text-rose-500 leading-relaxed font-semibold italic">
                  ⚠ {generationError}
                </p>
              )}

              <button
                type="submit"
                disabled={isGeneratingTopic || !customIdea.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
              >
                {isGeneratingTopic ? (
                  <>
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-indigo-200 border-t-white animate-spin"></span>
                    <span>Đang tạo giáo án bằng AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                    <span>SOẠN CHỦ ĐỀ VỚI GEMINI ✨</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Topics Deck List */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <BookOpen className="w-4.5 h-4.5 text-indigo-500" />
                Danh Sách Đề Tài ({filteredTopics.length})
              </h2>
              <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-bold">
                {selectedLevel.toUpperCase()}
              </span>
            </div>

            <div className="max-h-[380px] overflow-y-auto space-y-2.5 pr-1 divide-y divide-slate-100">
              {filteredTopics.map((topic) => {
                const isSelected = selectedTopic.id === topic.id;
                return (
                  <button
                    key={topic.id}
                    onClick={() => handleSelectTopic(topic)}
                    style={{ cursor: 'pointer' }}
                    className={`w-full text-left p-3.5 rounded-xl transition-all flex items-start gap-3 pt-4 ${
                      isSelected
                        ? 'bg-indigo-50/60 border border-indigo-200/55 text-slate-900'
                        : 'border border-transparent text-slate-600 hover:bg-slate-50/80 hover:text-slate-900'
                    }`}
                  >
                    <div className="mt-1">
                      {topic.type === 'read-aloud' && (
                        <span className="w-6 h-6 rounded bg-amber-50 text-amber-700 flex items-center justify-center text-[10px] font-bold">RA</span>
                      )}
                      {topic.type === 'dialogue' && (
                        <span className="w-6 h-6 rounded bg-emerald-50 text-emerald-700 flex items-center justify-center text-[10px] font-bold">DL</span>
                      )}
                      {topic.type === 'roleplay' && (
                        <span className="w-6 h-6 rounded bg-blue-50 text-blue-700 flex items-center justify-center text-[10px] font-bold">RP</span>
                      )}
                      {topic.type === 'ielts' && (
                        <span className="w-6 h-6 rounded bg-purple-50 text-purple-700 flex items-center justify-center text-[10px] font-bold">IL</span>
                      )}
                      {topic.type === 'debate' && (
                        <span className="w-6 h-6 rounded bg-rose-50 text-rose-700 flex items-center justify-center text-[10px] font-bold">DB</span>
                      )}
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold leading-tight font-sans tracking-tight">
                          {topic.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                        {topic.vnDescription}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="text-[11px] text-slate-400 bg-slate-50 rounded-xl p-3 border border-slate-100/80 leading-normal flex items-start gap-1.5 mt-2">
              <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span>
                Nhấp lựa chọn các đề tài đặc thù khác nhau để kiểm tra phản xạ tự nhiên của bạn!
              </span>
            </div>
          </div>

          {/* Quick Pro-Tips Card */}
          <div className="bg-gradient-to-tr from-indigo-900 to-slate-900 text-white rounded-2xl p-5 shadow-sm space-y-3 relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-10 translate-x-4 -translate-y-4">
              <Award className="w-24 h-24" />
            </div>
            <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
              💡 BÍ QUYẾT LUYỆN NÓI HIỆU QUẢ
            </h3>
            <ul className="text-xs text-indigo-100 space-y-2 leading-relaxed list-disc list-inside">
              <li>Mở đầu mạch lạc, tự tin sử dụng các <b>Suggested Vocabs</b> bên cạnh.</li>
              <li>Nói từ 2-4 câu liên kết để máy dễ tính điểm.</li>
              <li>Thường xuyên nghe và nhại theo (Shadowing) bài mẫu của AI để sửa ngữ điệu.</li>
            </ul>
          </div>
        </div>

        {/* RIGHT COLUMN: Studio workspace / dynamic interface */}
        <div id="studio_workspace" className="lg:col-span-8 space-y-8">
          
          {/* Active Topic Banner Detail */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2">
                <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-full uppercase tracking-wider">
                  Chủ Đề Đang Luyện
                </span>
                <span className="text-xs font-mono text-slate-500">
                  ID: {selectedTopic.id}
                </span>
              </div>

              <div className="flex gap-1">
                <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-semibold capitalize">
                  {selectedTopic.type.replace('-', ' ')}
                </span>
                {selectedTopic.ieltsPart && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-2.5 py-1 rounded-md font-bold">
                    IELTS Part {selectedTopic.ieltsPart}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                {selectedTopic.vnTitle}
              </h1>
              <p className="text-sm text-slate-600">
                {selectedTopic.description}
              </p>
            </div>

            {/* Cài đặt giọng đọc AI (AI Voice Settings Widget) */}
            <div className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-4 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <h3 className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                    🗣️ CÀI ĐẶT GIỌNG ĐỌC AI (AI VOCAL SETTINGS)
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium font-sans">Chọn giọng đọc Nam/Nữ của AI để luyện nghe/giao tiếp.</p>
                </div>
                
                {/* Quick select buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedVoiceName('Gemini-Kore-Female');
                      speakWithSelect("Hello! This is Gemini Kore. I am a premium AI female voice for high-quality English practice.", 'female', 0.95, 'Gemini-Kore-Female');
                    }}
                    className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-pink-100/60 border border-pink-200 text-pink-700 hover:bg-pink-100 transition-all cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <span>👩 Giọng Nữ AI (Female)</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedVoiceName('Gemini-Charon-Male');
                      speakWithSelect("Hi there! I am Gemini Charon, your premium AI male speaking partner. Nice to meet you!", 'male', 0.95, 'Gemini-Charon-Male');
                    }}
                    className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-sky-100/60 border border-sky-200 text-sky-700 hover:bg-sky-100 transition-all cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <span>👨 Giọng Nam AI (Male)</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <select
                    value={selectedVoiceName}
                    onChange={(e) => {
                      setSelectedVoiceName(e.target.value);
                      const val = e.target.value;
                      const isGem = val.startsWith('Gemini-');
                      if (isGem) {
                        const gem = GEMINI_VOICES.find(v => v.name === val);
                        if (gem) {
                          speakWithSelect(`Hello! I am ${gem.displayName}, your active English discussion partner.`, 'neutral', 0.95, val);
                        }
                      } else {
                        const v = availableVoices.find(voice => voice.name === val);
                        if (v) {
                          speakText("Hello! I am your English speaking partner.", 'neutral', 0.95, v.name);
                        }
                      }
                    }}
                    className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-800 font-extrabold focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all cursor-pointer appearance-none pr-8 shadow-xs"
                  >
                    <optgroup label="✨ Giọng AI Studio Cao Cấp (Gemini Premium Voices)">
                      {GEMINI_VOICES.map((voice, idx) => (
                        <option key={`gem-${idx}`} value={voice.name}>
                          {voice.flag} {voice.displayName} ({voice.gender} - {voice.description})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="🌐 Giọng Đọc Hệ Thống (System Fallback Voices)">
                      {availableVoices.length === 0 ? (
                        <option value="">⚠️ Đang tải giọng đọc hệ thống...</option>
                      ) : (
                        availableVoices.map((voice, idx) => {
                          const info = getVoiceInfo(voice);
                          return (
                            <option key={idx} value={voice.name}>
                              {info.flag} {voice.name} ({info.gender})
                            </option>
                          );
                        })
                      )}
                    </optgroup>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                    <ChevronRight className="w-4 h-4 transform rotate-90" />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!selectedVoiceName}
                  onClick={() => {
                    const isGem = selectedVoiceName.startsWith('Gemini-');
                    if (isGem) {
                      const gem = GEMINI_VOICES.find(v => v.name === selectedVoiceName);
                      if (gem) {
                        speakWithSelect(`This is how I read using the Gemini ${gem.displayName} voice! Hope you enjoy practicing speaking with me.`, 'neutral', 0.95);
                      }
                    } else {
                      const v = availableVoices.find(voice => voice.name === selectedVoiceName);
                      if (v) {
                        speakText("This is how I read! Try reading some phrases or statements with me.", 'neutral', 0.95, v.name);
                      }
                    }
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-slate-100 disabled:text-slate-400 text-white px-4 py-2.5 rounded-xl text-xs font-black transition-all shadow-md shadow-indigo-600/10 cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Nghe Thử (Test Voice)</span>
                </button>
              </div>
            </div>

            {/* Instruction/Target prompts reading */}
            <div className="bg-slate-50/80 border border-slate-200/60 rounded-xl p-5 shadow-inner">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Đoạn đọc mẫu / Nhiệm vụ (Task / Read Prompt)
                </span>
                <button
                  onClick={handlePlayPrompt}
                  className={`text-xs flex items-center gap-1 cursor-pointer transition-all border px-2.5 py-1 rounded-lg ${
                    isReadingPrompt 
                    ? 'bg-rose-50 border-rose-200 text-rose-600 animate-pulse' 
                    : 'bg-white border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200'
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{isReadingPrompt ? 'Dừng phát âm' : 'Nghe Phát Âm Thử'}</span>
                </button>
              </div>

              <p className="text-base text-slate-800 italic leading-relaxed font-serif bg-white p-3.5 rounded-lg border border-slate-100">
                "{selectedTopic.prompt}"
              </p>
            </div>

            {/* Helpful vocabulary checklist for boosting speeches */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Cụm từ đắt giá khuyên dùng (Suggested phrases & idioms)
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {selectedTopic.suggestedPhrases.map((phVal, idx) => (
                  <div 
                    key={idx} 
                    className="flex justify-between items-center p-2.5 bg-slate-50/50 hover:bg-slate-100/50 border border-slate-100 rounded-xl text-xs transition-colors"
                  >
                    <div className="flex flex-col">
                      <span className="font-bold text-indigo-950 font-mono">"{phVal.phrase}"</span>
                      <span className="text-slate-500">{phVal.meaning}</span>
                    </div>

                    <button
                      onClick={() => handlePlayPhrase(idx, phVal.phrase)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white transition-colors cursor-pointer"
                      title="Phát âm từ"
                    >
                      <Volume2 className={`w-3.5 h-3.5 ${playingPhraseIndex === idx ? 'animate-bounce text-indigo-600' : ''}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* DYNAMIC WORKSPACE COMPONENT (DIALOGUE-MODE vs INTERACTIVE-READING) */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            
            {/* If the task is DIALOGUE / ROLEPLAY / DEBATE, render interactive conversational simulator */}
            {['dialogue', 'roleplay', 'debate'].includes(selectedTopic.type) ? (
              <div className="flex flex-col animate-fadeIn">
                <div className="bg-slate-900 text-white px-5 py-3.5 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
                    <span className="text-xs font-bold tracking-wider uppercase">GIAO TIẾP TƯƠNG TÁC THOẠI (CHAT WORKSPACE)</span>
                  </div>
                  <div className="text-[10px] text-slate-400">AI đóng vai đối tác trò chuyện tự động</div>
                </div>

                {/* TAB SWITCHER */}
                {selectedTopic.dialogueScript && selectedTopic.dialogueScript.length > 0 && (
                  <div className="flex border-b border-slate-200 bg-slate-100 p-1 gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsScriptMode(true);
                        setCurrentScriptIndex(0);
                        setScriptScoreList({});
                        setSpokenText('');
                        setChatTextInput('');
                      }}
                      className={`flex-1 transition-all py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                        isScriptMode
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Luyện theo kịch bản mẫu ({selectedTopic.dialogueScript.length} câu)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsScriptMode(false);
                        stopSpeaking();
                      }}
                      className={`flex-1 transition-all py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                        !isScriptMode
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      <MessageSquare className="w-4 h-4 text-indigo-500" />
                      <span>Trò chuyện tự do linh hoạt (AI Tutor)</span>
                    </button>
                  </div>
                )}

                {/* DUAL CONTENT DISPLAY: SCRIPT PRACTICE vs FREE CHAT */}
                {isScriptMode && selectedTopic.dialogueScript && selectedTopic.dialogueScript.length > 0 ? (
                  <div className="p-4 md:p-6 space-y-6 bg-slate-50/30">
                    {/* Role selector summary bar */}
                    <div className="bg-gradient-to-r from-indigo-500 to-indigo-700 text-white rounded-2xl p-4 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                          <h4 className="font-extrabold text-sm uppercase tracking-wider">HỘI THOẠI LUYỆN NÓI SONG VAI</h4>
                        </div>
                        <p className="text-[11px] text-indigo-100 max-w-xl leading-relaxed">
                          Chọn vai nói của bạn. Khi đến lượt, hãy bấm Micro đọc mẫu câu tiếng Anh để AI đo độ chuẩn xác. Khi đến lượt AI, chatbot sẽ tự động phát âm đối thoại!
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 bg-white/10 p-1.5 rounded-xl border border-white/15">
                        <div className="text-left px-2 text-[11px]">
                          <span className="opacity-70 font-semibold block text-[9px] uppercase">ĐANG ĐÓNG VAI</span>
                          <span className="font-bold whitespace-nowrap">
                            👤 {userScriptRole === 'A' 
                              ? `${selectedTopic.roles?.roleA || 'Vai A'} (${selectedTopic.roles?.vnRoleA || 'Khách'})` 
                              : `${selectedTopic.roles?.roleB || 'Vai B'} (${selectedTopic.roles?.vnRoleB || 'Đối tác'})`}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const nextRole = userScriptRole === 'A' ? 'B' : 'A';
                            setUserScriptRole(nextRole);
                            setCurrentScriptIndex(0);
                            setScriptScoreList({});
                            setSpokenText('');
                            setChatTextInput('');
                            stopSpeaking();
                          }}
                          className="bg-white hover:bg-indigo-50 text-indigo-700 font-extrabold text-xs px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap border border-slate-100"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>ĐỔI VAI 🔄</span>
                        </button>
                      </div>
                    </div>

                    {/* Sequential Alternating Dialogue Script list */}
                    <div className="space-y-4">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">KỊCH BẢN CHI TIẾT (SPEAKING TIMELINE)</span>
                      
                      <div className="space-y-3">
                        {selectedTopic.dialogueScript.map((line, idx) => {
                          const isActive = idx === currentScriptIndex;
                          const isCompleted = idx < currentScriptIndex;
                          const isAITurn = line.roleTag !== userScriptRole;
                          const score = scriptScoreList[idx];

                          return (
                            <div 
                              key={idx}
                              className={`border rounded-2xl p-4 transition-all duration-300 relative ${
                                isActive 
                                  ? 'bg-indigo-50/70 border-indigo-300 shadow-md ring-4 ring-indigo-500/5 translate-x-1' 
                                  : isCompleted
                                    ? 'bg-emerald-50/25 border-emerald-100 opacity-80'
                                    : 'bg-white border-slate-100 text-slate-500 opacity-60'
                              }`}
                            >
                              {/* Avatar Badge & Action triggers */}
                              <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                  <span className={`text-[10px] uppercase tracking-widest font-extrabold px-2 py-0.5 rounded-full ${
                                    isAITurn
                                      ? 'bg-slate-900 text-white'
                                      : 'bg-indigo-100 text-indigo-700'
                                  }`}>
                                    {isAITurn ? '🤖 ' : '👤 '}{line.speaker}
                                  </span>
                                  
                                  {isActive && (
                                    <span className="animate-pulse text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-md uppercase">
                                      {isAITurn ? '🤖 AI ĐANG NÓI...' : '👉 ĐẾN LƯỢT TIẾNG ANH CỦA BẠN'}
                                    </span>
                                  )}

                                  {isCompleted && (
                                    <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" />
                                      {score !== undefined ? `Phát âm: ${score}%` : 'Đã vượt qua'}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5">
                                  {/* Read line out loud helper button */}
                                  <button
                                    type="button"
                                    onClick={() => speakWithSelect(line.text, 'neutral', 0.95)}
                                    className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-500 hover:text-indigo-600 transition-all cursor-pointer"
                                    title="Nghe phát phát âm chuẩn"
                                  >
                                    <Volume2 className="w-3.5 h-3.5 z-10" />
                                  </button>

                                  {/* If it's a completed or active user line, let them reuse it */}
                                  {!isAITurn && isActive && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setChatTextInput(line.text);
                                        setSpokenText(line.text);
                                      }}
                                      className="text-[10px] font-bold text-indigo-600 bg-white hover:bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-lg cursor-pointer"
                                    >
                                      Chép câu mẫu
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Main Line Script Content */}
                              <div className="space-y-2.5 pl-1">
                                {isActive && !isAITurn ? (
                                  <div className="space-y-2">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest block">CÂU MẪU CẦN LUYỆN ĐỌC:</div>
                                    <div className="flex flex-wrap gap-x-1.5 gap-y-1.5 select-none">
                                      {line.text.split(/\s+/).map((word, wIdx) => {
                                        const userWords = (chatTextInput || spokenText).toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(Boolean);
                                        const cleanWord = word.toLowerCase().replace(/[^a-z0-9]/g, '');
                                        const isMatched = userWords.includes(cleanWord);
                                        
                                        return (
                                          <span 
                                            key={wIdx} 
                                            className={`text-sm md:text-base font-extrabold transition-all duration-200 px-1 py-0.5 rounded-sm ${
                                              isMatched 
                                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-xs scale-105' 
                                                : (chatTextInput || spokenText).trim().length > 0 
                                                  ? 'text-rose-500 bg-rose-50 border border-rose-100' 
                                                  : 'text-indigo-950 border border-transparent'
                                            }`}
                                          >
                                            {word}
                                          </span>
                                        );
                                      })}
                                    </div>
                                    
                                    {/* Real-time speech similarity feedback widget */}
                                    {(chatTextInput || spokenText).trim().length > 0 && (
                                      <div className="flex items-center gap-2 mt-1 animate-scaleUp flex-wrap">
                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 border border-indigo-100 rounded-lg">
                                          <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                                          <span className="text-[11px] font-bold text-indigo-900">
                                            Độ chính xác hiện tại: {' '}
                                            <span className={`text-[12px] font-black ${
                                              calculateTextSimilarity((chatTextInput || spokenText), line.text) >= 80 
                                                ? 'text-emerald-600' 
                                                : calculateTextSimilarity((chatTextInput || spokenText), line.text) >= 50
                                                  ? 'text-amber-500'
                                                  : 'text-rose-500'
                                            }`}>
                                              {calculateTextSimilarity((chatTextInput || spokenText), line.text)}%
                                            </span>
                                          </span>
                                        </div>

                                        {calculateTextSimilarity((chatTextInput || spokenText), line.text) >= 80 ? (
                                          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg animate-scaleUp">
                                            🌟 Tuyệt hảo! Phát âm rành mạch!
                                          </span>
                                        ) : calculateTextSimilarity((chatTextInput || spokenText), line.text) >= 50 ? (
                                          <span className="text-[10px] text-amber-700 font-bold bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-lg">
                                            👍 Khá tốt! Đọc rõ thêm chút nữa nhé
                                          </span>
                                        ) : (
                                          <span className="text-[10px] text-rose-500 font-bold bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-lg animate-pulse">
                                            💪 Tiếp tục đọc to rõ hơn nào
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <p className={`text-sm md:text-base leading-relaxed font-semibold italic ${
                                    isActive ? 'text-indigo-950 font-bold' : 'text-slate-800'
                                  }`}>
                                    "{line.text}"
                                  </p>
                                )}
                                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                  {line.vnText}
                                </p>
                              </div>

                              {/* Practice input area FOR active user turns */}
                              {isActive && !isAITurn && (
                                <div className="mt-4 pt-4 border-t border-indigo-100 bg-indigo-100/10 -mx-4 -mb-4 p-4 rounded-b-2xl space-y-3 animate-fadeIn">
                                  <div className="flex justify-between items-center text-[10px] text-indigo-700 uppercase tracking-wider font-bold">
                                    <span className="flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping shrink-0" />
                                      Luyện nói cho lượt của bạn (Your Turn):
                                    </span>
                                    <span>Đọc to câu văn mẫu phía trên</span>
                                  </div>

                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={toggleRecording}
                                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                                        isRecording 
                                          ? 'bg-red-50 border-red-300 text-red-600 scale-105 shadow-md shadow-red-200 animate-pulse' 
                                          : 'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/10'
                                      }`}
                                      title={isRecording ? 'Bấm để dừng ghi âm' : 'Bắt đầu ghi âm nói thông qua micro'}
                                    >
                                      {isRecording ? <MicOff className="w-5 h-5 animate-pulse" /> : <Mic className="w-5 h-5 animate-bounce" />}
                                    </button>

                                    <input 
                                      type="text"
                                      value={chatTextInput || spokenText}
                                      onChange={(e) => {
                                        setChatTextInput(e.target.value);
                                        setSpokenText('');
                                      }}
                                      placeholder="Phát âm tiếng Anh của bạn sẽ được tự động hiển thị ở đây..."
                                      className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 text-slate-800 font-bold"
                                    />
                                    
                                    <button
                                      type="button"
                                      disabled={!spokenText.trim() && !chatTextInput.trim()}
                                      onClick={() => {
                                        const userSaid = (chatTextInput || spokenText).trim();
                                        const similarity = calculateTextSimilarity(userSaid, line.text);
                                        
                                        // Save score
                                        setScriptScoreList(prev => ({
                                          ...prev,
                                          [idx]: similarity
                                        }));

                                        setSpokenText('');
                                        setChatTextInput('');

                                        // Auto advance to next turn
                                        setTimeout(() => {
                                          setCurrentScriptIndex(idx + 1);
                                        }, 1400);
                                      }}
                                      className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 text-white px-4 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/10 cursor-pointer flex items-center gap-1 shrink-0"
                                    >
                                      <span>Nộp Câu ✅</span>
                                    </button>
                                  </div>

                                  {isRecording && (
                                    <div className="bg-red-50 text-red-700 px-3 py-2 rounded-xl text-[10px] flex items-center justify-between animate-pulse">
                                      <span className="font-bold flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-red-600 animate-ping shrink-0" />
                                        Micro đang GHI ÂM giọng bạn... Hãy đọc to câu mẫu rồi bấm nút micro hoặc Nộp câu!
                                      </span>
                                    </div>
                                  )}

                                  {/* Interim voice speech transcript visualization */}
                                  {interimSpokenText && (
                                    <p className="text-[11px] text-indigo-600 italic animate-pulse">
                                      ✨ {interimSpokenText}
                                    </p>
                                  )}

                                  {(spokenText.trim() || chatTextInput.trim()) && (
                                    <div className="bg-white border border-indigo-100/50 p-2.5 rounded-xl space-y-1">
                                      <span className="text-[9px] font-bold text-slate-400 block uppercase">BÀI THU ÂM NHẬN DIỆN ĐƯỢC:</span>
                                      <p className="text-xs text-indigo-950 font-bold leading-relaxed italic">
                                        "{chatTextInput || spokenText}"
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Script completion screen state */}
                    {currentScriptIndex >= selectedTopic.dialogueScript.length && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-4 animate-scaleUp">
                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 text-xl font-bold">
                          🎉
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-extrabold text-emerald-800 text-base">XUẤT SẮC! BẠN ĐÃ HOÀN THÀNH KỊCH BẢN!</h4>
                          <p className="text-xs text-emerald-600 font-medium">
                            Bạn đã thực hiện trọn vẹn việc luyện tập song thoại cho tất cả các lượt của bài học này.
                          </p>
                        </div>

                        {/* Summary accuracy metrics */}
                        {Object.keys(scriptScoreList).length > 0 && (
                          <div className="bg-white border border-emerald-100 p-3 rounded-xl max-w-sm mx-auto flex justify-between items-center text-xs shadow-xs">
                            <span className="text-slate-500 font-medium">Độ chính xác trung bình:</span>
                            <span className="font-extrabold text-emerald-700">
                              {Math.round(
                                (Object.values(scriptScoreList) as number[]).reduce((a, b) => a + b, 0) / 
                                Object.keys(scriptScoreList).length
                              )}% 🌟 Đạt cấp độ bản lĩnh!
                            </span>
                          </div>
                        )}

                        <div className="flex gap-2 justify-center pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentScriptIndex(0);
                              setScriptScoreList({});
                              setSpokenText('');
                              setChatTextInput('');
                              stopSpeaking();
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-600/10 cursor-pointer"
                          >
                            Luyện lại kịch bản này 🔄
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const nextRole = userScriptRole === 'A' ? 'B' : 'A';
                              setUserScriptRole(nextRole);
                              setCurrentScriptIndex(0);
                              setScriptScoreList({});
                              setSpokenText('');
                              setChatTextInput('');
                              stopSpeaking();
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/10 cursor-pointer border border-indigo-700 whitespace-nowrap"
                          >
                            Đóng vai ngược lại 🔄
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Chat window viewport */}
                    <div className="p-4 md:p-6 min-h-[300px] max-h-[460px] overflow-y-auto space-y-4 bg-slate-50/40">
                      {chatMessages.map((msg) => (
                        <div 
                          key={msg.id} 
                          className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm relative ${
                            msg.sender === 'user' 
                              ? 'bg-indigo-600 text-white rounded-tr-none' 
                              : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                          }`}>
                            
                            {/* Meta info */}
                            <div className="flex items-center justify-between mb-1 gap-2 border-b border-white/10 pb-1">
                              <span className="text-[10px] uppercase tracking-wider font-extrabold opacity-75">
                                {msg.sender === 'user' ? 'Bạn nói (You)' : 'AI Partner'}
                              </span>
                              
                              {/* Speak audio trigger for AI statement */}
                              {msg.sender === 'ai' && (
                                <button 
                                  onClick={() => speakWithSelect(msg.text, 'neutral', 0.95)}
                                  className="text-slate-400 hover:text-indigo-600 p-0.5 rounded transition-colors cursor-pointer"
                                  title="Listen voice"
                                >
                                  <Volume2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            <p className="text-sm leading-relaxed whitespace-pre-line break-words italic">
                              "{msg.text}"
                            </p>
                          </div>
                        </div>
                      ))}

                      {isLoadingChat && (
                        <div className="flex justify-start">
                          <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-4 max-w-[80%] flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            <span className="text-xs text-slate-400 italic">AI đang nghe và soạn thảo câu trả lời...</span>
                          </div>
                        </div>
                      )}

                      <div ref={chatBottomRef} />
                    </div>

                    {/* Bottom Input Area with Integrated Micro support */}
                    <div className="p-4 bg-white border-t border-slate-200 space-y-3">
                      <div>
                        {isRecording ? (
                          <div className="bg-red-50 text-red-700 px-3 py-2 rounded-xl text-xs flex items-center justify-between animate-pulse">
                            <span className="font-bold flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                              🔴 Micro đang ghi giọng nói... Hãy hoàn tất rồi ấn dừng!
                            </span>
                            <button 
                              onClick={stopRecording}
                              className="bg-red-600 text-white text-[10px] px-2.5 py-1 rounded-lg font-bold hover:bg-red-700 cursor-pointer"
                            >
                              Dừng Ghi Âm
                            </button>
                          </div>
                        ) : (
                          interimSpokenText && (
                            <p className="text-xs text-indigo-600 italic animate-pulse">{interimSpokenText}</p>
                          )
                        )}
                      </div>

                      {/* Dynamic Inactivity Suggestions Alert */}
                      {isUserInactive && (
                        <div className="bg-amber-50/70 border border-amber-200/60 rounded-xl p-4.5 space-y-2.5 my-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                              <Sparkles className="w-4 h-4 text-amber-500 animate-spin" style={{ animationDuration: '3s' }} />
                              Bạn đang trăn trở câu trả lời? AI gợi ý ý nói hữu ích:
                            </span>
                            <button 
                              type="button"
                              onClick={() => {
                                setIsUserInactive(false);
                                setInactiveTimerCount(0);
                              }}
                              className="text-[10px] text-slate-400 hover:text-slate-600 bg-white border border-slate-200 rounded px-1.5 py-0.5 cursor-pointer font-medium"
                            >
                              Ẩn gợi ý
                            </button>
                          </div>

                          {isLoadingHint ? (
                            <div className="flex items-center gap-2 text-xs text-slate-500 italic">
                              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" />
                              <span>Gemini đang phân tích ngữ cảnh để mớm lời cho bạn nói tiếp bản lĩnh...</span>
                            </div>
                          ) : aiGeneratedHint ? (
                            <div className="space-y-3">
                              {aiGeneratedHint.vietnameseAdvice && (
                                <p className="text-[11px] text-slate-600 leading-relaxed font-semibold italic bg-amber-100/30 p-2 rounded-lg">
                                  📌 Ý tưởng gợi ý: {aiGeneratedHint.vietnameseAdvice}
                                </p>
                              )}
                              <div className="space-y-1.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">CHỌN NHANH VÀ LUYỆN NÓI:</span>
                                <div className="grid grid-cols-1 gap-2">
                                  {aiGeneratedHint.suggestions?.map((item, idx) => (
                                    <div 
                                      key={idx}
                                      className="bg-white border border-slate-100 hover:border-indigo-300 rounded-xl p-3 text-xs transition-all flex items-start justify-between gap-3 shadow-xs hover:shadow-sm"
                                    >
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setChatTextInput(item.english);
                                          setIsUserInactive(false);
                                          setInactiveTimerCount(0);
                                        }}
                                        className="flex-1 text-left cursor-pointer"
                                      >
                                        <p className="font-bold text-indigo-950 hover:text-indigo-600 transition-colors">"{item.english}"</p>
                                        <p className="text-[11px] text-slate-500 mt-0.5">{item.vietnamese}</p>
                                      </button>
                                      <div className="flex items-center gap-1 shrink-0 mt-0.5">
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            if (playingHintIndex === idx) {
                                              stopSpeaking();
                                              setPlayingHintIndex(null);
                                              return;
                                            }
                                            setPlayingHintIndex(idx);
                                            await speakWithSelect(item.english, 'neutral', 0.95);
                                            setPlayingHintIndex(null);
                                          }}
                                          className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-all cursor-pointer"
                                          title="Nghe phát phát âm tham khảo"
                                        >
                                          <Volume2 className={`w-3.5 h-3.5 ${playingHintIndex === idx ? 'animate-bounce text-indigo-600' : ''}`} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setChatTextInput(item.english);
                                            setIsUserInactive(false);
                                            setInactiveTimerCount(0);
                                          }}
                                          className="text-[10px] text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg font-bold cursor-pointer"
                                        >
                                          Dùng câu này
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500 italic">Nhấp 'Nói qua Micro' để thử tài phản xạ của bạn, hoặc chỉ cần gõ ý nghĩ đơn giản thôi nào!</p>
                          )}
                        </div>
                      )}

                      <form onSubmit={handleSendChatMessage} className="flex gap-2">
                        <button
                          type="button"
                          onClick={toggleRecording}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                            isRecording 
                              ? 'bg-red-50 border-red-300 text-red-600 scale-105 shadow-md shadow-red-200' 
                              : 'bg-indigo-50/50 hover:bg-indigo-50 border-indigo-200 text-indigo-600 hover:text-indigo-700'
                          }`}
                          title={isRecording ? 'Click to pause mic' : 'Luyện Nói qua Micro'}
                        >
                          {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        </button>

                        <input 
                          type="text"
                          value={chatTextInput || spokenText}
                          onChange={(e) => {
                            if (spokenText) {
                              setSpokenText(e.target.value);
                            } else {
                              setChatTextInput(e.target.value);
                            }
                          }}
                          placeholder="Hãy nói qua micro, hoặc gõ nhập đoạn hội thoại tiếng Anh tại đây..."
                          className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 text-slate-800"
                        />

                        <button
                          type="submit"
                          disabled={!(chatTextInput || spokenText) || isLoadingChat}
                          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white px-5 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer transition-colors"
                        >
                          <Send className="w-4 h-4" />
                          <span className="hidden sm:inline">Phản hồi</span>
                        </button>
                      </form>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 gap-3 pt-1 border-t border-slate-100/60 mt-1">
                        <span>
                          💡 Có thể Chat nhiều câu liên tiếp để dựng đoạn hội thoại sinh động.
                        </span>
                        <button
                          type="button"
                          onClick={handleAssessDialogueSession}
                          disabled={chatMessages.length < 2 || isLoadingAssessment}
                          className="bg-slate-900 border border-slate-800 text-white rounded-xl px-4 py-2 font-bold hover:bg-slate-800 flex items-center justify-center gap-1.5 self-end cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-100 transition-colors"
                        >
                          <Award className="w-4 h-4 text-amber-400" />
                          <span>Chấm Điểm & Phân Tích Toàn Bộ Buổi Luyện Nói</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              
              /* Else: STANDARD PRESENTATION WORKSPACE (Read Aloud, IELTS Monologues) */
              <div className="p-5 md:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Timer className="w-4 h-4 text-slate-400" />
                    Khu Vực Ghi Âm Luyện Tập (Practice Speaking Deck)
                  </h3>
                  <div className="text-[11px] text-slate-500">
                    Bấm microphone, phát âm và chỉnh sửa tức thì
                  </div>
                </div>

                {/* Option to chat freely about this monologue */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-indigo-50 border border-indigo-150 rounded-2xl p-4 gap-3 animate-fadeIn">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm animate-bounce" style={{ animationDuration: '4s' }}>
                      💬
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Trò chuyện tự do với AI Partner về đề tài này</p>
                      <p className="text-[10px] text-slate-500 font-medium font-sans">Thử thách nói phản xạ tự nhiên không giới hạn cùng trợ lý giáo viên ảo.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsGlobalChatOpen(true);
                      setGlobalChatContext('topic');
                    }}
                    style={{ cursor: 'pointer' }}
                    className="self-start sm:self-auto bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-extrabold px-3.5 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <span>Luyện Chat Tự Do ⚡</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="border border-slate-100 bg-slate-50/50 rounded-2xl p-5 relative overflow-hidden">
                  <div className="space-y-4">
                    {/* Live spoken visual feedback container */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-500 block">Lời thoại thô thu âm từ bạn:</label>
                      <textarea
                        value={spokenText}
                        onChange={(e) => setSpokenText(e.target.value)}
                        placeholder="Hãy nhấp 'NÓI QUA MICRO' rồi đọc to bài khóa trên, hoặc dán bản dịch thô của bạn tại đây để giáo viên AI phân tích và sửa sai..."
                        rows={5}
                        className="w-full bg-white border border-slate-200 rounded-xl p-4 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 italic text-slate-800 leading-relaxed"
                      />
                    </div>

                    {isRecording ? (
                      <div className="bg-red-50 text-red-800 px-4 py-3 rounded-xl border border-red-200 flex items-center justify-between animate-pulse">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="w-3 h-3 bg-red-600 rounded-full animate-ping" />
                          <span className="font-bold">ĐANG GHI ÂM (Microphone active). Trình phát âm của bạn đang được biên dịch sang chữ...</span>
                        </div>
                        <button
                          type="button"
                          onClick={stopRecording}
                          className="bg-red-600 text-white text-[11px] px-3 py-1 bg-red-600 hover:bg-red-700 font-bold rounded-lg cursor-pointer"
                        >
                          Hoàn tất
                        </button>
                      </div>
                    ) : (
                      interimSpokenText && (
                        <p className="text-xs text-indigo-500 italic animate-pulse">{interimSpokenText}</p>
                      )
                    )}

                    {/* Dynamic Inactivity Suggestions Alert */}
                    {isUserInactive && (
                      <div className="bg-amber-50/70 border border-amber-200/60 rounded-xl p-4.5 space-y-2.5 my-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-amber-500 animate-spin" style={{ animationDuration: '3s' }} />
                            Bạn đang suy nghĩ ý thuyết trình? AI gợi ý ý tưởng nói:
                          </span>
                          <button 
                            type="button"
                            onClick={() => {
                              setIsUserInactive(false);
                              setInactiveTimerCount(0);
                            }}
                            className="text-[10px] text-slate-400 hover:text-slate-600 bg-white border border-slate-200 rounded px-1.5 py-0.5 cursor-pointer font-medium"
                          >
                            Ẩn gợi ý
                          </button>
                        </div>

                        {isLoadingHint ? (
                          <div className="flex items-center gap-2 text-xs text-slate-500 italic">
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" />
                            <span>Gemini đang nghiên cứu chủ đề để mớm ý cho bạn nói trôi chảy...</span>
                          </div>
                        ) : aiGeneratedHint ? (
                          <div className="space-y-3">
                            {aiGeneratedHint.vietnameseAdvice && (
                              <p className="text-[11px] text-slate-600 leading-relaxed font-semibold italic bg-amber-100/30 p-2 rounded-lg">
                                📌 Định hướng bài nói: {aiGeneratedHint.vietnameseAdvice}
                              </p>
                            )}
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">GỢI Ý CÂU BẮT ĐẦU HOẶCÝ CHÍNH (Click để chép vào bài):</span>
                              <div className="grid grid-cols-1 gap-2">
                                {aiGeneratedHint.suggestions?.map((item, idx) => (
                                  <div 
                                    key={idx}
                                    className="bg-white border border-slate-100 hover:border-indigo-300 rounded-xl p-3 text-xs transition-all flex items-start justify-between gap-3 shadow-xs hover:shadow-sm"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSpokenText(item.english);
                                        setIsUserInactive(false);
                                        setInactiveTimerCount(0);
                                      }}
                                      className="flex-1 text-left cursor-pointer"
                                    >
                                      <p className="font-bold text-indigo-950 hover:text-indigo-600 transition-colors">"{item.english}"</p>
                                      <p className="text-[11px] text-slate-500 mt-0.5">{item.vietnamese}</p>
                                    </button>
                                    <div className="flex items-center gap-1 shrink-0 mt-0.5">
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          if (playingHintIndex === idx) {
                                            stopSpeaking();
                                            setPlayingHintIndex(null);
                                            return;
                                          }
                                          setPlayingHintIndex(idx);
                                          await speakWithSelect(item.english, 'neutral', 0.95);
                                          setPlayingHintIndex(null);
                                        }}
                                        className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-all cursor-pointer"
                                        title="Nghe phát phát âm mẫu"
                                      >
                                        <Volume2 className={`w-3.5 h-3.5 ${playingHintIndex === idx ? 'animate-bounce text-indigo-600' : ''}`} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSpokenText(item.english);
                                          setIsUserInactive(false);
                                          setInactiveTimerCount(0);
                                        }}
                                        className="text-[10px] text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg font-bold cursor-pointer"
                                      >
                                        Chép câu này
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 italic">Bấm nút microphone phía dưới và đọc tự tin nhé!</p>
                        )}
                      </div>
                    )}

                    <div className="flex justify-between items-center flex-wrap gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={toggleRecording}
                        className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
                          isRecording 
                            ? 'bg-rose-600 text-white shadow-rose-200' 
                            : 'bg-indigo-600 text-white shadow-indigo-100 hover:bg-indigo-700'
                        }`}
                      >
                        {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        <span>{isRecording ? 'DỪNG THU ÂM (Stop)' : 'NÓI QUA MICRO (Start Mic)'}</span>
                      </button>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setSpokenText('')}
                          className="text-xs text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200/50 transition-colors py-3 px-4 rounded-xl cursor-pointer"
                        >
                          Xoá Trống
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAnalyzeSpeech()}
                          disabled={!spokenText || spokenText.trim().length === 0 || isLoadingAssessment}
                          className="bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 py-3 px-5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>GỬI ĐỂ CHẤM ĐIỂM BẰNG AI</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Loader status for evaluation */}
          {isLoadingAssessment && (
            <div className="bg-white border border-indigo-100 rounded-2xl p-8 text-center space-y-4 animate-pulse">
              <div className="flex justify-center">
                <div className="w-12 h-12 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-800">UỐNG NGỤM NƯỚC NHÉ! AI ĐANG KIỂM TRA BÀI NÓI CHO BẠN...</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Hệ thống đang đối chiếu và phân tích sự rành mạch, sự liên kết, tính chính xác cấu trúc ngữ pháp và cung cấp bổ sung vốn từ vựng học thuật.
                </p>
              </div>
            </div>
          )}

          {/* Detailed assessment grade report presentation block */}
          {assessmentResult && !isLoadingAssessment && (
            <GradeReport 
              assessment={assessmentResult} 
              onRestart={() => {
                setAssessmentResult(null);
                setSpokenText('');
                // If it is dialogue, reset the chat
                if (['dialogue', 'roleplay', 'debate'].includes(selectedTopic.type)) {
                  handleSelectTopic(selectedTopic);
                }
              }} 
            />
          )}

        </div>

      </main>

      {/* Persistent global applet information footer */}
      <footer className="bg-white border-t border-slate-200/80 mt-auto py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-3">
          <div className="flex justify-center items-center gap-3 flex-wrap">
            <span className="text-xs text-slate-400 font-sans">
              © 2026 AI English Speaking School. Powered by **Google Gemini 3.5 Flash** server-side engine.
            </span>
          </div>
          <p className="text-[10px] text-slate-400 max-w-2xl mx-auto leading-normal uppercase tracking-wider">
            Để trải nghiệm công nghệ giọng nói thật tốt nhất, xin vui lòng cấp quyền microphone cho trang hoặc chạy trực tiếp trên các nền tảng trình điều khiển chính hãng.
          </p>
        </div>
      </footer>

      {/* FLOATING CHAT COMPANION BUBBLE */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setIsGlobalChatOpen(prev => !prev)}
          style={{ cursor: 'pointer' }}
          className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-full flex items-center justify-center shadow-xl shadow-indigo-600/30 transition-all hover:scale-110 active:scale-95 cursor-pointer relative"
        >
          {isGlobalChatOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <MessageSquare className="w-6 h-6 animate-pulse" />
          )}
          {!isGlobalChatOpen && (
            <span className="absolute -top-1 -right-1 flex h-5 w-11 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-black text-white shadow-sm ring-2 ring-white">
              AI CHAT
            </span>
          )}
        </button>
      </div>

      {/* GLOBAL SLIDE-OUT AI CHAT DRAWER */}
      <AnimatePresence>
        {isGlobalChatOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsGlobalChatOpen(false)}
              className="fixed inset-0 bg-slate-900 z-50 cursor-pointer"
            />

            {/* Chat Panel Box */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed top-0 right-0 h-full w-full sm:w-[480px] bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200"
            >
              {/* Header section */}
              <div className="bg-slate-900 text-white p-4.5 flex items-center justify-between shadow-md shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-white shadow-md shadow-indigo-600/20">
                    💬
                  </div>
                  <div>
                    <h3 className="text-sm font-black tracking-tight text-white uppercase flex items-center gap-1.5">
                      AI English Companion
                      <span className="text-[9px] bg-emerald-500 text-white px-1.5 py-0.5 rounded font-mono uppercase font-extrabold animate-pulse">Online</span>
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium font-sans">Trải nghiệm luyện nói & phản xạ song ngữ tự do</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGlobalChatOpen(false)}
                  style={{ cursor: 'pointer' }}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Context Picker Area */}
              <div className="p-3 bg-slate-50 border-b border-rose-100/10 shadow-xs shrink-0 flex flex-col gap-2">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  🎯 CHỦ ĐỀ ĐANG ĐÀM THOẠI:
                </div>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-200/60 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setGlobalChatContext('general');
                    }}
                    style={{ cursor: 'pointer' }}
                    className={`py-2 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                      globalChatContext === 'general'
                        ? 'bg-white text-indigo-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    💬 Nói Chuyện Tự Do
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGlobalChatContext('topic');
                    }}
                    style={{ cursor: 'pointer' }}
                    className={`py-2 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                      globalChatContext === 'topic'
                        ? 'bg-white text-indigo-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    🎯 Theo Bài: {selectedTopic.title.split(' (')[0]}
                  </button>
                </div>

                {/* Sub info of selection */}
                <div className="bg-indigo-50 border border-indigo-100/50 rounded-xl px-3 py-2 text-[10px] text-slate-600 leading-relaxed font-sans">
                  {globalChatContext === 'general' ? (
                    <span>💡 <b>General ESL Practice</b>: Bạn có thể luyện nghe nói tiếng Anh tự do về bất kì đề tài nào cùng AI. Nhấn nút Nghe phát âm để nghe phát âm.</span>
                  ) : (
                    <span>🎯 <b>Roleplay context active</b>: AI sẽ hóa thân đàm thoại theo bối cảnh bài học <b>{selectedTopic.vnTitle}</b> nâng cao phản xạ tự nhiên.</span>
                  )}
                </div>
              </div>

              {/* Quick Preferences Block */}
              <div className="px-4 py-2 bg-slate-100 text-[11px] border-b border-slate-200 flex items-center justify-between shrink-0 font-sans">
                <label className="flex items-center gap-1.5 text-slate-600 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isGlobalChatAutoSpeak}
                    onChange={(e) => setIsGlobalChatAutoSpeak(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>Tự động phát âm lời giải từ AI 🔊</span>
                </label>
                <span className="text-slate-400 font-medium">Giọng: {selectedVoiceName.split('-').pop()}</span>
              </div>

              {/* Messages Feeder Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                {globalChatMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-3.5 shadow-xs relative ${
                      msg.sender === 'user'
                        ? 'bg-indigo-600 text-white rounded-tr-none'
                        : 'bg-white text-slate-800 border border-slate-150/70 rounded-tl-none'
                    }`}>
                      <div className="flex items-center justify-between text-[10px] border-b border-slate-200/10 pb-1 mb-1 font-bold tracking-wider uppercase opacity-75">
                        <span>{msg.sender === 'user' ? 'Bạn' : 'AI Companion'}</span>
                        <span className="opacity-60">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-xs font-medium leading-relaxed font-sans whitespace-pre-line select-text">
                        {msg.text}
                      </p>

                      {/* Toolbars for message */}
                      {msg.sender === 'ai' && (
                        <div className="mt-2 flex items-center gap-1.5 pt-1.5 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => {
                              stopSpeaking();
                              speakWithSelect(msg.text, 'neutral', 0.95);
                            }}
                            className="flex items-center gap-1 py-1 px-1.5 rounded bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-indigo-600 border border-slate-150 transition-all text-[9px] font-bold cursor-pointer"
                          >
                            <Volume2 className="w-3 h-3 text-indigo-500" />
                            <span>Nghe phát âm</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isGlobalChatLoading && (
                  <div className="flex justify-start animate-pulse">
                    <div className="max-w-[85%] bg-white border border-slate-150 rounded-2xl rounded-tl-none p-3.5 space-y-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold font-sans uppercase tracking-wider">AI đang nghe và chuẩn bị lời hồi đáp...</p>
                    </div>
                  </div>
                )}
                <div ref={globalChatBottomRef} />
              </div>

              {/* Bottom input workspace controller */}
              <div className="p-4 bg-white border-t border-slate-200 shrink-0 space-y-3">
                {/* Voice recognizer display panel */}
                {isGlobalChatRecording ? (
                  <div className="bg-rose-50 text-rose-700 p-3 rounded-xl border border-rose-200 flex flex-col gap-1.5 animate-pulse">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-extrabold flex items-center gap-1.5 uppercase">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping shrink-0" />
                        🟢 Hệ thống đang lắng nghe...
                      </span>
                      <button
                        type="button"
                        onClick={stopGlobalChatRecording}
                        className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                      >
                        HOÀN TẤT
                      </button>
                    </div>
                    {globalChatInterimText && (
                      <p className="text-[11px] text-rose-800 italic font-medium leading-normal">
                        {globalChatInterimText}
                      </p>
                    )}
                  </div>
                ) : (
                  globalChatInterimText && (
                    <p className="text-xs text-indigo-500 italic animate-pulse">{globalChatInterimText}</p>
                  )
                )}

                {/* Submitter form */}
                <form onSubmit={handleSendGlobalChatMessage} className="flex gap-2">
                  <button
                    type="button"
                    onClick={toggleGlobalChatRecording}
                    style={{ cursor: 'pointer' }}
                    className={`p-3 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                      isGlobalChatRecording
                        ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/10'
                        : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100'
                    }`}
                    title={isGlobalChatRecording ? "Dừng ghi âm" : "Nói biểu đạt phản xạ bằng giọng nói"}
                  >
                    {isGlobalChatRecording ? <MicOff className="w-5 h-5 animate-pulse" /> : <Mic className="w-5 h-5" />}
                  </button>

                  <input
                    type="text"
                    value={globalChatTextInput}
                    onChange={(e) => setGlobalChatTextInput(e.target.value)}
                    placeholder="Viết tin nhắn nói tiếng Anh..."
                    disabled={isGlobalChatLoading}
                    className="flex-1 min-w-0 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 text-slate-800 font-medium font-sans placeholder-slate-400"
                  />

                  <button
                    type="submit"
                    disabled={!globalChatTextInput.trim() || isGlobalChatLoading}
                    style={{ cursor: 'pointer' }}
                    className="bg-slate-900 disabled:bg-slate-150 disabled:text-slate-400 hover:bg-slate-800 text-white p-3 rounded-xl flex items-center justify-center shadow-md transition-all shrink-0 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
