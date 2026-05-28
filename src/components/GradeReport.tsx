import React, { useState } from 'react';
import { AssessmentResult, CorrectedSentence } from '../types.js';
import { 
  Award, 
  BookOpen, 
  CheckCircle2, 
  ChevronRight, 
  Sparkles, 
  Volume2, 
  XOctagon, 
  TrendingUp, 
  MessageSquare,
  BookmarkPlus,
  RefreshCw,
  Eye,
  Speech
} from 'lucide-react';
import { motion } from 'motion/react';
import { speakText, stopSpeaking } from '../utils/speech.js';

interface GradeReportProps {
  assessment: AssessmentResult;
  onRestart: () => void;
}

export default function GradeReport({ assessment, onRestart }: GradeReportProps) {
  const [isPlayingModel, setIsPlayingModel] = useState(false);
  const [playingSentenceIndex, setPlayingSentenceIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'grammar' | 'vocab' | 'model'>('overview');

  const { overallScore, scores, generalFeedback, vnGeneralFeedback, correctedSentences, enhancedVocabulary, modelAnswer, transcriptAnalyzed } = assessment;

  // Handle TTS for model answer
  const handlePlayModel = async () => {
    if (isPlayingModel) {
      stopSpeaking();
      setIsPlayingModel(false);
      return;
    }
    setIsPlayingModel(true);
    try {
      await speakText(modelAnswer, 'neutral', 0.9);
    } catch (e) {
      console.error(e);
    } finally {
      setIsPlayingModel(false);
    }
  };

  // Handle TTS for corrected sentences
  const handlePlaySentence = async (index: number, text: string) => {
    if (playingSentenceIndex === index) {
      stopSpeaking();
      setPlayingSentenceIndex(null);
      return;
    }
    setPlayingSentenceIndex(index);
    try {
      await speakText(text, 'neutral', 0.95);
    } catch (e) {
      console.error(e);
    } finally {
      setPlayingSentenceIndex(null);
    }
  };

  // Helper to color overall score
  const getScoreColor = (score: number) => {
    if (score >= 8.5) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 7.0) return 'text-teal-600 bg-teal-50 border-teal-200';
    if (score >= 5.0) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-rose-600 bg-rose-50 border-rose-200';
  };

  const getScoreProgressColor = (score: number) => {
    if (score >= 8.5) return 'bg-emerald-500';
    if (score >= 7.0) return 'bg-teal-500';
    if (score >= 5.0) return 'bg-orange-500';
    return 'bg-rose-500';
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden"
    >
      {/* Upper Brand Jumbotron */}
      <div className="bg-gradient-to-tr from-slate-900 to-slate-800 text-white px-6 py-8 md:p-8 relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 translate-x-12 -translate-y-12">
          <Award className="w-96 h-96" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-slate-300 text-xs font-mono uppercase tracking-wider mb-2">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            Bảng Đánh Giá AI Chi Tiết (Detailed AI Assessment)
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">KẾT QUẢ LUYỆN NÓI CỦA BẠN</h1>
          <p className="text-slate-400 text-sm mt-1 max-w-xl">
            AI đã đo lường và phân tích các khía cạnh ngữ pháp, phát âm, từ vựng và độ trôi chảy để gợi ý lộ trình tối ưu cho bạn.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 border-b border-slate-100">
        {/* Left Side: Score Card Summary */}
        <div className="lg:col-span-4 bg-slate-50/70 p-6 md:p-8 border-r border-slate-100 flex flex-col justify-between items-center text-center">
          <div className="w-full">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Điểm Tổng Thể (Overall Band)</h3>
            <div className="relative inline-flex items-center justify-center p-3 rounded-full bg-white shadow-md border border-slate-100/80 mb-4">
              <div className={`w-32 h-32 flex flex-col justify-center items-center rounded-full border-4 ${getScoreColor(overallScore)}`}>
                <span className="text-4xl font-extrabold tracking-tight">{overallScore.toFixed(1)}</span>
                <span className="text-xs font-semibold text-slate-400 mt-0.5">Scale 10</span>
              </div>
            </div>
            <div className="px-4 py-1 bg-white border border-slate-200/50 rounded-full text-xs font-medium text-slate-600 inline-block shadow-sm">
              Level khuyên dùng: {overallScore >= 8.0 ? 'Advanced ✨' : overallScore >= 6.0 ? 'Intermediate 📈' : 'Beginner 🌱'}
            </div>
          </div>

          <div className="w-full mt-8 space-y-4">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-left w-full text-left">Chi Tiết Tiêu Chí</h4>
            
            {/* Criteria Breakdown */}
            {[
              { label: 'Ngữ pháp (Grammar)', score: scores.grammar, desc: 'Độ chính xác và đa dạng cấu trúc' },
              { label: 'Từ vựng (Vocabulary)', score: scores.vocabulary, desc: 'Độ phong phú, thành ngữ & collocations' },
              { label: 'Phát âm (Pronunciation)', score: scores.pronunciationAndClarity, desc: 'Độ rõ ràng, trọng âm và ngữ điệu' },
              { label: 'Trôi chảy (Fluency)', score: scores.fluencyAndCohesion, desc: 'Liên kết ý, độ mượt khi nói' }
            ].map((crit, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between items-center text-xs font-medium">
                  <span className="text-slate-700">{crit.label}</span>
                  <span className="font-bold text-slate-900">{crit.score.toFixed(1)}/10</span>
                </div>
                <div className="w-full bg-slate-200/70 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${getScoreProgressColor(crit.score)}`}
                    style={{ width: `${crit.score * 10}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 text-left">{crit.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Tabbed Details */}
        <div className="lg:col-span-8 flex flex-col min-h-[480px]">
          {/* Navigation Tab Header */}
          <div className="flex border-b border-slate-100 overflow-x-auto bg-slate-50">
            {[
              { id: 'overview', label: 'Nhận Xét Chung', icon: MessageSquare },
              { id: 'grammar', label: 'Sửa Lỗi Ngữ Pháp', icon: XOctagon, badge: correctedSentences.length },
              { id: 'vocab', label: 'Nâng Cấp Từ Vựng', icon: TrendingUp, badge: enhancedVocabulary.length },
              { id: 'model', label: 'Bài Nói Mẫu', icon: BookOpen }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-5 py-4 border-b-2 font-medium text-xs whitespace-nowrap transition-colors ${
                    isActive 
                    ? 'border-slate-900 text-slate-900 bg-white' 
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none ${
                      isActive ? 'bg-slate-950 text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Tab Panel */}
          <div className="p-6 md:p-8 flex-1">
            {/* OVERVIEW PANEL */}
            {activeTab === 'overview' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-2">
                    <Speech className="w-5 h-5 text-indigo-500" />
                    Bản Báo Cáo Phân Tích (Coaching Evaluation)
                  </h3>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm text-slate-700 leading-relaxed italic">
                    "{transcriptAnalyzed}"
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 italic text-right">Bài nói thô bạn vừa ghi âm</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border border-slate-100 rounded-xl bg-white shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">AI Teacher Comments (EN)</span>
                    <p className="text-sm text-slate-700 leading-relaxed">{generalFeedback}</p>
                  </div>
                  <div className="p-4 border border-amber-100/60 rounded-xl bg-amber-50/20 shadow-sm">
                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide block mb-1">Gợi Ý Từ Huấn Luyện Viên (VN)</span>
                    <p className="text-sm text-slate-800 leading-relaxed">{vnGeneralFeedback}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* GRAMMAR RECTIFICATION PANEL */}
            {activeTab === 'grammar' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-800">
                    Chi Tiết Những Cấu Trúc Cần Sửa (Compare Mistakes)
                  </h3>
                  <span className="text-xs text-rose-500 font-medium bg-rose-50 px-2 py-0.5 rounded-full">
                    {correctedSentences.length} điểm cần lưu ý
                  </span>
                </div>

                {correctedSentences.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center bg-emerald-50/25 border border-dashed border-emerald-100 rounded-2xl">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-2" />
                    <h4 className="text-sm font-semibold text-slate-800">Cấu Trúc Hoàn Hảo!</h4>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                      Chúng tôi không phát hiện lỗi ngữ pháp hay từ dùng sai nghiêm trọng. Hãy tiếp tục duy trì độ mượt nhé!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {correctedSentences.map((item, idx) => (
                      <div key={idx} className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                        <div className="bg-rose-50/60 px-4 py-2 text-xs flex justify-between items-center gap-2">
                          <span className="font-semibold text-rose-700 line-through">Bạn nói (Your Speech):</span>
                          <span className="text-slate-400 font-mono">#{idx + 1}</span>
                        </div>
                        <div className="p-3 bg-white text-sm text-slate-700 italic border-b border-slate-100/50">
                          "{item.original}"
                        </div>
                        
                        <div className="bg-emerald-50/50 px-4 py-2 text-xs flex justify-between items-center gap-2">
                          <span className="font-semibold text-emerald-700">Đề xuất bản mẫu (AI Edit):</span>
                          <button 
                            onClick={() => handlePlaySentence(idx, item.corrected)}
                            className="text-emerald-700 hover:text-emerald-900 flex items-center gap-1 transition-colors font-medium cursor-pointer"
                          >
                            <Volume2 className={`w-3.5 h-3.5 ${playingSentenceIndex === idx ? 'animate-bounce' : ''}`} />
                            <span>Nghe giọng đọc</span>
                          </button>
                        </div>
                        <div className="p-3 bg-white text-sm text-slate-900 font-medium">
                          "{item.corrected}"
                        </div>

                        <div className="p-4 bg-slate-50/60 border-t border-slate-100 text-xs text-slate-600 grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <span className="font-bold text-slate-400 block mb-0.5">Why? (English)</span>
                            <p>{item.reasoning}</p>
                          </div>
                          <div className="border-t md:border-t-0 md:border-l border-slate-200/50 pt-2 md:pt-0 md:pl-3">
                            <span className="font-bold text-slate-500 block mb-0.5">Lý Giải (Vietnamese)</span>
                            <p className="text-slate-700">{item.vnReasoning}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* VOCABULARY ENHANCEMENT PANEL */}
            {activeTab === 'vocab' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-800 mb-2">
                  Vocabulary Booster: Nâng Cấp Từ Vựng & Thành Ngữ
                </h3>
                
                {enhancedVocabulary.length === 0 ? (
                  <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-sm text-slate-500">
                      Không tìm thấy bổ sung từ vựng đặc trưng nào.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {enhancedVocabulary.map((item, idx) => (
                      <div key={idx} className="p-4 border border-slate-100 rounded-xl bg-white shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-2 gap-2">
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium line-through decoration-slate-400">
                              "{item.original}"
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                            <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold border border-indigo-100">
                              "{item.suggested}"
                            </span>
                          </div>

                          <div className="space-y-1 mt-2 font-sans">
                            <span className="text-[10px] font-bold text-slate-400 block tracking-wide">ĐỊNH NGHĨA (MEANING):</span>
                            <p className="text-xs text-slate-700 font-medium">{item.meaning}</p>
                            <p className="text-xs text-indigo-900 italic font-normal">{item.vnMeaning}</p>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100/80 bg-slate-50/50 p-2.5 rounded-lg">
                          <span className="text-[9px] font-bold text-indigo-600 block mb-1 tracking-wider uppercase flex items-center gap-1">
                            <BookmarkPlus className="w-3 h-3" /> Ví dụ văn cảnh (Real Life Use):
                          </span>
                          <p className="text-xs text-slate-800 italic leading-relaxed">
                            "{item.example}"
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* MODEL ANSWER COMPONENT */}
            {activeTab === 'model' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-4.5 h-4.5 text-amber-500" />
                    Bài Nói Chuẩn Mẫu (Model Answer for Shadowing)
                  </h3>

                  <button
                    onClick={handlePlayModel}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-sm transition-all border ${
                      isPlayingModel 
                      ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100 animate-pulse' 
                      : 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700'
                    }`}
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>{isPlayingModel ? 'Dừng phát âm' : 'Nghe Bài Mẫu'}</span>
                  </button>
                </div>

                <div className="bg-amber-50/20 border border-amber-100/50 rounded-2xl p-6 relative">
                  <div className="absolute right-3 bottom-3 opacity-5 select-none">
                    <Volume2 className="w-16 h-16 text-slate-800" />
                  </div>
                  <p className="text-sm md:text-base text-slate-800 font-serif leading-relaxed italic whitespace-pre-line">
                    {modelAnswer}
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-xs text-slate-600 leading-relaxed space-y-1.5">
                  <span className="font-bold text-slate-700 block">💡 Tips Luyện Shadowing:</span>
                  <p>1. Bật nút "Nghe bài mẫu" để nắm bắt nhịp điệu (rhythm), ngữ điệu lên xuống và nối âm.</p>
                  <p>2. Đọc nhẩm theo (shadowing) cùng tốc độ với giọng đọc mẫu.</p>
                  <p>3. Ghi âm lại lần 2 để thấy rõ sự khác biệt của ngữ âm bẩm sinh!</p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Footer controls */}
      <div className="bg-slate-50 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="text-xs text-slate-500">
          * Điểm số và nhận xét ở đây thiết kế đạt độ chính xác ~90% so với giám khảo chuẩn.
        </div>
        <button 
          onClick={onRestart}
          className="flex items-center gap-2 bg-slate-900 text-white text-xs font-semibold px-5 py-2.5 rounded-xl hover:bg-slate-800 cursor-pointer shadow-sm shadow-slate-900/10 transition-transform active:scale-95"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Luyện Tập Lại Cùng Chủ Đề Khác</span>
        </button>
      </div>
    </motion.div>
  );
}
