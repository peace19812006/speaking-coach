import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { PRACTICE_TOPICS } from './src/topicsData.js';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini API cleanly (lazy/fallback initialization)
let ai: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY;

if (apiKey) {
  try {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    console.log('Gemini AI successfully initialized server-side.');
  } catch (err) {
    console.error('Failed to initialize Gemini Client:', err);
  }
} else {
  console.warn('WARN: GEMINI_API_KEY not found. Running in educational mock-fallback mode.');
}

// ---------------------------------------------------------
// 1. API Endpoint: Check backend status and key existence
// ---------------------------------------------------------
app.get('/api/status', (req, res) => {
  res.json({
    status: 'healthy',
    hasApiKey: !!apiKey,
    topicsCount: PRACTICE_TOPICS.length,
  });
});

// ---------------------------------------------------------
// 2. API Endpoint: Assess User Speaking Transcript
// ---------------------------------------------------------
app.post('/api/assess', async (req, res) => {
  const { transcript, topicId, level, type, promptText } = req.body;

  if (!transcript || transcript.trim().length === 0) {
    return res.status(400).json({ error: 'Hãy nói hoặc nhập thông tin trước khi đánh giá!' });
  }

  // Find topic
  const topic = PRACTICE_TOPICS.find((t) => t.id === topicId);
  const title = topic ? topic.title : 'General Practice';
  const finalPrompt = topic ? topic.prompt : (promptText || 'General conversation');

  // If API key is missing or ai failed to initialize, return a rich, high-quality assessment mock-fallback
  // This ensures the application never crashes and the user has a fluid experience
  if (!ai) {
    console.log('Using mock assessment fallback due to missing GEMINI_API_KEY');
    const mockScores = level === 'beginner' 
      ? { overallScore: 6.5, grammar: 6.0, vocabulary: 7.0, pronunciation: 6.5, fluency: 6.5 }
      : level === 'intermediate'
      ? { overallScore: 7.5, grammar: 7.0, vocabulary: 8.0, pronunciation: 7.5, fluency: 7.5 }
      : { overallScore: 8.5, grammar: 8.5, vocabulary: 8.5, pronunciation: 8.0, fluency: 9.0 };

    return res.json({
      overallScore: mockScores.overallScore,
      scores: {
        grammar: mockScores.grammar,
        vocabulary: mockScores.vocabulary,
        pronunciationAndClarity: mockScores.pronunciation,
        fluencyAndCohesion: mockScores.fluency,
      },
      generalFeedback: `Warm feedback: Your speech for the topic "${title}" is highly creative! You answered clearly and structured your thoughts logically. (Note: Please provide a GEMINI_API_KEY in Settings > Secrets for real-time AI analytics).`,
      vnGeneralFeedback: `Nhận xét thân thiện: Bài nói của bạn cho chủ đề "${title}" rất sáng tạo! Bạn đã trình bày mạch lạc và bắt đầu liên kết các ý tưởng tốt. Hãy tiếp tục phát huy! (Lưu ý: Thêm GEMINI_API_KEY để kích hoạt đánh giá AI thật sự).`,
      correctedSentences: [
        {
          original: "I am come from Vietnam and I am accountant.",
          corrected: "I come from Vietnam and I am an accountant.",
          reasoning: "We do not use 'am' before action verbs in the simple present tense of standard sentences. Also, 'accountant' needs an indefinite article 'an'.",
          vnReasoning: "Ta không dùng động từ to-be 'am' đi trực tiếp trước động từ thường 'come' ở thì hiện tại đơn. Ngoài ra, 'accountant' bắt đầu bằng một nguyên âm nên cần bổ sung mạo từ 'an' phía trước."
        },
        {
          original: "I love play badminton inside weekend.",
          corrected: "I love playing badminton on weekends.",
          reasoning: "Use the -ing form after 'love' (love playing), and the preposition for weekdays or weekends is usually 'on' or 'at', not 'inside'.",
          vnReasoning: "Sử dụng dạng -ing sau động từ chỉ sở thích như 'love', và giới từ chỉ thời điểm cuối tuần thường dùng 'on' hoặc 'at', không dùng 'inside'."
        }
      ],
      enhancedVocabulary: [
        {
          original: "like playing",
          suggested: "have a keen interest in playing",
          meaning: "A sophisticated phrase to express deep hobby or preference.",
          vnMeaning: "Một cụm từ nâng cao nhằm diễn tả niềm đam mê hay sự quan tâm đặc biệt tới việc gì.",
          example: "In my leisure time, I have a keen interest in playing tennis with my colleagues."
        },
        {
          original: "very beautiful",
          suggested: "absolutely breathtaking",
          meaning: "Extremely beautiful or striking, often used for sights, landscapes, or views.",
          vnMeaning: "Cực kỳ lộng lẫy hoặc ấn tượng, thường dùng mô tả cảnh sắc hữu tình.",
          example: "The mountain crest at sunrise was absolutely breathtaking."
        }
      ],
      modelAnswer: `Well, to introduce myself, my name is Alex. I am currently twenty-five years of age, and I am proud to hail from Vietnam. By profession, I am employed as an accountant, which requires a meticulous eye for numbers. During my leisure periods, I am incredibly passionate about playing badminton to steer active, alongside reading historical novels and listening to melodic pop tunes to unwind. It is a genuine pleasure to make your acquaintance.`,
      transcriptAnalyzed: transcript,
    });
  }

  try {
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        overallScore: { type: Type.NUMBER },
        scores: {
          type: Type.OBJECT,
          properties: {
            grammar: { type: Type.NUMBER },
            vocabulary: { type: Type.NUMBER },
            pronunciationAndClarity: { type: Type.NUMBER },
            fluencyAndCohesion: { type: Type.NUMBER },
          },
          required: ['grammar', 'vocabulary', 'pronunciationAndClarity', 'fluencyAndCohesion'],
        },
        generalFeedback: { type: Type.STRING },
        vnGeneralFeedback: { type: Type.STRING },
        correctedSentences: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              original: { type: Type.STRING },
              corrected: { type: Type.STRING },
              reasoning: { type: Type.STRING },
              vnReasoning: { type: Type.STRING },
            },
            required: ['original', 'corrected', 'reasoning', 'vnReasoning'],
          },
        },
        enhancedVocabulary: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              original: { type: Type.STRING },
              suggested: { type: Type.STRING },
              meaning: { type: Type.STRING },
              vnMeaning: { type: Type.STRING },
              example: { type: Type.STRING },
            },
            required: ['original', 'suggested', 'meaning', 'vnMeaning', 'example'],
          },
        },
        modelAnswer: { type: Type.STRING },
        transcriptAnalyzed: { type: Type.STRING },
      },
      required: [
        'overallScore',
        'scores',
        'generalFeedback',
        'vnGeneralFeedback',
        'correctedSentences',
        'enhancedVocabulary',
        'modelAnswer',
        'transcriptAnalyzed',
      ],
    };

    const instruction = `You are a world-class professional IELTS Speaking examiner and English pronunciation/grammar coach. 
The user is learning English. They are practicing speaking on a specific topic.
Verify their level (${level}) and category (${type}).
Analyze their speaking transcript and perform three essential coaching actions:
1. Provide constructive score points (0 to 10 scale, decimal e.g. 7.5 is allowed) on Grammar, Vocabulary, Pronunciation/Clarity suggestions, and Fluency/Coherence, plus an overall combined score.
2. Edit their spoken script: Find specific sentences with mistakes (grammar, collocations, context) and provide clear, polite corrections with explanations in both English and Vietnamese.
3. Vocabulary Booster: Identify 2-4 everyday words they used, and suggest elevated synonyms, collocation, or engaging idioms with definitions in both English and Vietnamese, plus realistic examples.
4. Provide a prime native-speaker Model Answer (2-3 paragraphs) answering the prompt perfectly, styled for their level.

Your response MUST be a single clean JSON object matching this schema exactly. Do not include markdown wraps or anything outer as we will parse it directly.`;

    const userPrompt = `
Topic Title: ${title}
Task Type: ${type}
Target Level: ${level}
Task Prompt/Requirements: ${finalPrompt}

User Spoken Transcript:
"${transcript}"
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: userPrompt,
      config: {
        systemInstruction: instruction,
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
        temperature: 0.2, // low temperature for precise grading and spelling consistency
      },
    });

    const resultText = response.text || '{}';
    res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.error('Error analyzing speaking transcription:', error);
    res.status(500).json({ error: 'Lỗi xảy ra trong quá trình chấm điểm: ' + error.message });
  }
});

// ---------------------------------------------------------
// 3. API Endpoint: Live Roleplay Character Dialogue Respond
// ---------------------------------------------------------
app.post('/api/roleplay', async (req, res) => {
  const { messages, topicId, level } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Thiếu lịch sử tin nhắn cuộc trò chuyện!' });
  }

  let context: string;
  let characterPrompt: string;

  if (topicId === 'general-freechat') {
    context = 'A natural and free-flowing daily English conversation between a non-native student and a helpful ESL tutor.';
    characterPrompt = 'Be a friendly, encouraging daily ESL chat companion and English teacher. Keep your tone highly supportive, warm, and conversational. Bring up everyday life, hobbies, current experiences, or plans to keep the dialogue flowing.';
  } else {
    const topic = PRACTICE_TOPICS.find((t) => t.id === topicId);
    context = topic?.context || 'A supportive daily English conversation practice.';
    characterPrompt = topic?.prompt || 'Be a friendly conversational partner.';
  }

  if (!ai) {
    // Mock response when API key is missing
    const incomingText = messages[messages.length - 1]?.text || 'Hello';
    console.log(`Using mock roleplay reply for: "${incomingText}"`);
    let mockReply = "Hello there! That sounds wonderful. Can you tell me a little bit more about that? I'd love to hear your thoughts.";
    if (topicId === 'general-freechat') {
      mockReply = "I understand you perfectly! Free conversations are the best way to master English. Can you tell me a bit about your day, or what hobbies you like?";
    } else if (topicId === 'beg-coffee-shop') {
      mockReply = "Great choice! Would you like a hot coffee or an iced one instead? And what size can I get for you: small, medium, or large?";
    } else if (topicId === 'int-job-interview') {
      mockReply = "Thank you for sharing that experience. Dealing with challenging projects is always tough. How do you usually handle stress when working under strict deadlines?";
    } else if (topicId === 'adv-debate-ai') {
      mockReply = "You arguments are respectable, but don't you think that automated systems lack the human empathy and mentorship necessary to emotional growth of teens?";
    }

    return res.json({
      text: mockReply,
      id: 'mock-msg-' + Date.now(),
      sender: 'ai',
      timestamp: Date.now(),
    });
  }

  try {
    const historicalDialogue = messages.map(msg => `${msg.sender === 'user' ? 'Learner' : 'Assistant'}: ${msg.text}`).join('\n');

    const systemPrompt = `You are playing the role of an engaging conversational partner in an ESL speaking application. 
The situational context is: "${context}".
Your specific character instruction and persona: "${characterPrompt}".
The learner's proficiency level is: "${level}".

Follow these strict guidelines:
1. Respond naturally as a human interlocutor would inside the specified context (e.g. barista, recruiter, friend, debate opponent).
2. Keep your responses concise (2 to 4 sentences max) so the conversation moves forward rapidly and is easy for the user to follow.
3. Match your level of vocabulary and grammar to their level:
   - Beginner: Use basic words, clear phrasing, avoid idioms. Speak simply and clearly.
   - Intermediate: Natural conversational English, modest complexity, friendly and encouraging.
   - Advanced: Advanced academic style, elevated idioms, challenging rhetorical counterpoints.
4. Encourage them to respond of their own accord by asking a single highly engaging question at the end.
5. Do NOT break character under any circumstance. Refrain from declaring "As an AI..." or starting your response with "Chatbot:" or "Assistant:". Give only the character's active speaking script.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        { text: `Conversation History:\n${historicalDialogue}\n\nAssistant turn:` }
      ],
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      },
    });

    const reply = (response.text || "I'm here to listen. Tell me more!").trim();
    res.json({
      text: reply,
      id: 'ai-msg-' + Date.now(),
      sender: 'ai',
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error('Error generating roleplay turn:', error);
    res.status(500).json({ error: 'Lỗi xảy ra trong quá trình giao lưu: ' + error.message });
  }
});

// ---------------------------------------------------------
// 3.6 API Endpoint: Generate Contextual Hint for Silent User
// ---------------------------------------------------------
app.post('/api/generate-hint', async (req, res) => {
  const { messages, topicId, level, type } = req.body;

  const topic = PRACTICE_TOPICS.find((t) => t.id === topicId) || {
    title: 'General English Practice',
    prompt: 'Have a natural friendly conversation',
    suggestedPhrases: [],
    level: level || 'beginner',
    type: type || 'dialogue',
  };

  const cleanLevel = level || topic.level || 'beginner';
  const cleanType = type || topic.type || 'dialogue';

  if (!ai) {
    console.log('Using mock hint fallback due to missing GEMINI_API_KEY');
    const localPhrases = topic.suggestedPhrases && topic.suggestedPhrases.length > 0
      ? topic.suggestedPhrases
      : [
          { phrase: "To be honest, I think...", meaning: "Thành thật mà nói, tôi nghĩ..." },
          { phrase: "In my experience, this is awesome because...", meaning: "Theo kinh nghiệm của tôi, điều này tuyệt vời bởi vì..." },
          { phrase: "Could you tell me more about your thoughts on this?", meaning: "Bạn có thể cho tôi biết thêm suy nghĩ của bạn về điều này được không?" },
        ];

    return res.json({
      vietnameseAdvice: `Bạn có thể trả lời bằng cách nêu ý kiến cá nhân trực tiếp hoặc đưa ra một ví dụ thực tế liên quan đến chủ đề "${topic.title}". Dưới đây là 3 mẫu câu tham khảo dành cho trình độ của bạn:`,
      suggestions: localPhrases.map(p => ({
        english: p.phrase,
        vietnamese: p.meaning
      })).slice(0, 3)
    });
  }

  try {
    let contextHistory = 'No messages yet.';
    if (messages && Array.isArray(messages) && messages.length > 0) {
      contextHistory = messages.map(msg => `${msg.sender === 'user' ? 'Learner' : 'AI Partner'}: ${msg.text}`).join('\n');
    }

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        vietnameseAdvice: { type: Type.STRING },
        suggestions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              english: { type: Type.STRING },
              vietnamese: { type: Type.STRING }
            },
            required: ['english', 'vietnamese']
          },
        }
      },
      required: ['vietnameseAdvice', 'suggestions']
    };

    const promptText = `Provide immediate contextual assistance for an ESL student who is stuck/silent.
Active Topic: "${topic.title}" - Type: "${cleanType}" - Level: "${cleanLevel}"
Roleplay/Topic prompt instructions: "${topic.prompt}"

Current Interaction History so far:
${contextHistory}

Your task:
1. Compose a warm, concise advice sentence in Vietnamese ("vietnameseAdvice") suggesting *what* they could talk about or answer at this point (e.g., "Bạn có thể kể về một kỉ niệm của mình liên quan đến...", "Bạn có thể đồng tình/phản đối và lấy lý do về...").
2. Formulate exactly 3 premium, highly natural English starting phrases or direct target response examples ("suggestions") matching the specified level ("${cleanLevel}"). Ensure their Vietnamese translation is precise and fluent.
3. Keep sentence complexity strictly tailored to the requested level ("${cleanLevel}"):
   - beginner: Super direct, simple grammar, 6-12 words per suggestion.
   - intermediate: Friendly, descriptive, incorporates standard conversational connectors, 10-18 words.
   - advanced: Intellectual, uses elite vocabulary, includes advanced structures, 15-25 words.

Ensure the output is 100% valid JSON adhering to the specified schema without any markdown tag decorations outside of the returned JSON structure.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: promptText,
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
        temperature: 0.7,
      },
    });

    const parsedResponse = JSON.parse(response.text || '{}');
    res.json(parsedResponse);
  } catch (err: any) {
    console.error('Error in /api/generate-hint:', err);
    res.status(500).json({ error: 'Gặp lỗi trong lúc soạn bài gợi ý: ' + err.message });
  }
});

// ---------------------------------------------------------
// 3.5 API Endpoint: Generate Custom Topic with AI
// ---------------------------------------------------------
app.post('/api/generate-topic', async (req, res) => {
  const { userIdea, level, type } = req.body;

  if (!userIdea || userIdea.trim().length === 0) {
    return res.status(400).json({ error: 'Hãy nhập ý tưởng chủ đề của bạn trước!' });
  }

  const cleanLevel = level || 'beginner';
  const cleanType = type || 'dialogue';

  if (!ai) {
    console.log('Using mock topic fallback due to missing GEMINI_API_KEY');
    const mockId = 'custom-' + Date.now();
    return res.json({
      id: mockId,
      title: `${userIdea} (${cleanLevel === 'beginner' ? 'Cơ bản' : cleanLevel === 'advanced' ? 'Nâng cao' : 'Trung cấp'})`,
      vnTitle: userIdea,
      description: `A dynamically prepared topic centered around: "${userIdea}". Focus on natural fluency and contextually rich replies.`,
      vnDescription: `Chủ đề học nói dành riêng cho ý tưởng: "${userIdea}". Tập trung rèn luyện phản xạ nhanh nhạy và từ vựng phong phú.`,
      level: cleanLevel,
      type: cleanType,
      prompt: cleanType === 'read-aloud'
        ? `Reading is one of the quickest ways to master speech flow. Here is a speech segment for: "${userIdea}". Pronounce each syllable with clear pacing, making sure you group relative thoughts together and utilize warm vocal energy. Speak fluently, record and assess.`
        : `Let's discuss "${userIdea}". Give me a brief talk about your experiences, thoughts, or future visions concerning this activity. Try using key phrases to enrich your explanation.`,
      context: `ESL Smart Class: "${userIdea}" conversation`,
      suggestedPhrases: [
        { phrase: "From my standpoint...", meaning: "Theo quan điểm của tôi..." },
        { phrase: "I absolutely advocate...", meaning: "Tôi hoàn toàn ủng hộ..." },
        { phrase: "It plays a vital role in...", meaning: "Nó đóng một vai trò quan trọng trong việc..." },
        { phrase: "On the flip side...", meaning: "Mặt khác..." },
        { phrase: "To put it simply...", meaning: "Nói một cách đơn giản..." }
      ],
      roles: {
        roleA: "Learner",
        roleB: "Coach",
        vnRoleA: "Người học",
        vnRoleB: "Người hướng dẫn"
      },
      dialogueScript: [
        {
          speaker: "Coach",
          text: `Hi there! I am excited to talk about "${userIdea}" with you today. Shall we begin?`,
          vnText: `Xin chào bạn! Tôi rất hào hứng được thảo luận về "${userIdea}" cùng bạn hôm nay. Chúng ta bắt đầu nhé?`,
          roleTag: "B"
        },
        {
          speaker: "Learner",
          text: `Yes, please! This is an amazing and important topic for me. I can't wait to practice.`,
          vnText: `Vâng ạ! Đây là một chủ đề tuyệt vời và quan trọng đối với tôi. Tôi nóng lòng muốn tập luyện.`,
          roleTag: "A"
        },
        {
          speaker: "Coach",
          text: `Great. Tell me, what is the most interesting aspect of "${userIdea}" in your own opinion?`,
          vnText: `Tốt lắm. Hãy nói cho tôi biết, theo ý kiến riêng của bạn, khía cạnh thú vị nhất của "${userIdea}" là gì?`,
          roleTag: "B"
        },
        {
          speaker: "Learner",
          text: `From my standpoint, it plays a vital role in expanding our knowledge and practical skills.`,
          vnText: `Theo quan điểm của tôi, nó đóng một vai trò quan trọng trong việc mở rộng kiến thức và kỹ năng thực tế của chúng ta.`,
          roleTag: "A"
        },
        {
          speaker: "Coach",
          text: `That is a wonderful response. Keep speaking with high energy and confidence!`,
          vnText: `Đó là một câu trả lời tuyệt vời. Hãy giữ vững năng lượng cao và sự tự tin khi nói nhé!`,
          roleTag: "B"
        }
      ]
    });
  }

  try {
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING },
        title: { type: Type.STRING },
        vnTitle: { type: Type.STRING },
        description: { type: Type.STRING },
        vnDescription: { type: Type.STRING },
        level: { type: Type.STRING },
        type: { type: Type.STRING },
        prompt: { type: Type.STRING },
        context: { type: Type.STRING },
        suggestedPhrases: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              phrase: { type: Type.STRING },
              meaning: { type: Type.STRING },
            },
            required: ['phrase', 'meaning'],
          },
        },
        ieltsPart: { type: Type.INTEGER },
        roles: {
          type: Type.OBJECT,
          properties: {
            roleA: { type: Type.STRING },
            roleB: { type: Type.STRING },
            vnRoleA: { type: Type.STRING },
            vnRoleB: { type: Type.STRING },
          },
          required: ['roleA', 'roleB', 'vnRoleA', 'vnRoleB']
        },
        dialogueScript: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              speaker: { type: Type.STRING },
              text: { type: Type.STRING },
              vnText: { type: Type.STRING },
              roleTag: { type: Type.STRING },
            },
            required: ['speaker', 'text', 'vnText', 'roleTag']
          }
        }
      },
      required: ['id', 'title', 'vnTitle', 'description', 'vnDescription', 'level', 'type', 'prompt', 'suggestedPhrases', 'roles', 'dialogueScript'],
    };

    const instruction = `You are a professional ESL curriculum designer and English lesson developer. 
Your goal is to build a high-quality speaking lesson/topic based on the learner's seed idea: "${userIdea}".

Requirements for generation:
1. Target Level: "${cleanLevel}" (beginner, intermediate, advanced). Keep wording appropriate for this level.
2. Category format: "${cleanType}" (read-aloud, dialogue, roleplay, ielts, debate).
3. "id": Generate a clean URL-friendly unique identifier starting with "custom-".
4. "title": A short, catchy English title for this topic (e.g., "Airport Departure Check-In").
5. "vnTitle": A clean Vietnamese translation of the title.
6. "description": A short English instruction overview/objectives of the lesson.
7. "vnDescription": Meaning/overview of the lesson in Vietnamese.
8. "prompt": The core prompt text.
   - If 'read-aloud': Write a polished paragraph (80-120 words) for the user to read aloud.
   - If 'roleplay' or 'dialogue': Set a fascinating conversational background scenario and write a brief starting prompt.
   - If 'debate': State a controversial prompt with the side they must argufy.
   - If 'ielts': Set a standard IELTS Cue Card/Part 1 or Part 3 prompt.
9. "context": If dialogue/roleplay, specify the location/situation (e.g., "A Cozy local coffee shop").
10. "suggestedPhrases": Exactly 4-5 dynamic, sophisticated vocabulary collocations, idioms, or sentences helpful to talk about this theme, along with pristine Vietnamese translations in the "meaning" key.
11. "roles": Designate two distinct characters/roles for this dialogue situation.
    - "roleA": The character/role the learner should play (e.g., "Job Applicant", "Interviewee", "Traveler", "New Friend").
    - "roleB": The character/role the partner/chatbot plays (e.g., "HR Recruiter", "Customs Officer", "Host", "Local Resident").
    - "vnRoleA": Vietnamese translation for Role A.
    - "vnRoleB": Vietnamese translation for Role B.
12. "dialogueScript": Create an engaging, ready-to-talk Conversation Script with exactly 5-6 sequential alternating dialogue turns (A, B, A, B, A, B or B, A, B, A, B, A):
    - "speaker": The name of the speaking character (should correspond to Role A or Role B).
    - "roleTag": Specify "A" if this turn is spoken by Role A, or "B" if it is spoken by Role B.
    - "text": The complete, pristine English sentence to speak. Tailor vocabulary density to "${cleanLevel}".
    - "vnText": A natural translation of the line in Vietnamese.

Return EXACTLY a structured JSON matching the provided schema. Do not include any extra thoughts or markdown decorators outside of JSON.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Generate a custom curriculum topic with a detailed conversation script for user idea: "${userIdea}" with level "${cleanLevel}" and category "${cleanType}".`,
      config: {
        systemInstruction: instruction,
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
        temperature: 0.75,
      },
    });

    const parsedTopic = JSON.parse(response.text || '{}');
    // Sanity-check fields
    parsedTopic.level = cleanLevel;
    parsedTopic.type = cleanType;
    if (!parsedTopic.id) {
      parsedTopic.id = 'custom-' + Date.now();
    }

    res.json(parsedTopic);
  } catch (error: any) {
    console.error('Error generating AI topic:', error);
    res.status(500).json({ error: 'Không thể tạo chủ đề tự chọn bằng AI: ' + error.message });
  }
});

// ---------------------------------------------------------
// 3.6 API Endpoint: Gemini High-Quality TTS (Text-to-Speech)
// ---------------------------------------------------------
app.post('/api/tts', async (req, res) => {
  const { text, voiceName } = req.body;

  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: 'Thiếu nội dung văn bản cần chuyển đổi thành giọng nói!' });
  }

  // Fallback if AI not initialized
  if (!ai) {
    return res.status(400).json({ 
      error: 'Gemini API chưa được cấu hình. Vui lòng cấu hình GEMINI_API_KEY trong Settings > Secrets để sử dụng giọng nói premium!',
      isMock: true
    });
  }

  try {
    const validVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
    const activeVoice = validVoices.includes(voiceName) ? voiceName : 'Kore';

    console.log(`Generating Gemini TTS for: "${text.substring(0, 45)}..." with voice ${activeVoice}`);

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: activeVoice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      return res.status(500).json({ error: 'Không nhận được dữ liệu âm thanh từ Gemini TTS.' });
    }

    res.json({ audioContent: base64Audio });
  } catch (err: any) {
    console.error('Error in Gemini TTS API:', err);
    res.status(500).json({ error: 'Lỗi phát sinh khi kết nối service Gemini TTS: ' + err.message });
  }
});

// ---------------------------------------------------------
// 4. Vite Dev Server Setup & Production Asset Serving
// ---------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite middleware mounted in Development mode.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Serving production static build from: ' + distPath);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI ESL Speaking Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
