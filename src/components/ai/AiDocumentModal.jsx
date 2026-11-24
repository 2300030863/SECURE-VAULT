import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  BookOpen,
  MessageSquare,
  HelpCircle,
  X,
  Send,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  FileText,
  Key,
  Award,
  ChevronRight,
  Flame,
  CheckCircle2,
  XCircle,
  Zap,
  Brain,
  GraduationCap,
  Layers,
  FileCode,
  Search,
  Download,
  CheckCircle,
  Lightbulb,
} from 'lucide-react';
import { aiService } from '../../services/aiService';

export default function AiDocumentModal({ isOpen, onClose, doc, accessCode = '' }) {
  // Tabs: 'simpleBullets' | 'overview' | 'detailedSummary' | 'topicExplanation' | 'importantQuestions' | 'quiz' | 'chat'
  const [activeTab, setActiveTab] = useState('simpleBullets');
  const [aiStatus, setAiStatus] = useState({
    enabled: true,
    provider: 'Google Gemini',
    model: 'gemini-3.6-flash',
  });
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [isSavingKey, setIsSavingKey] = useState(false);

  // Summary & Exact Bullet State
  const [summaryMode, setSummaryMode] = useState('simple_learning'); // 'simple_learning' | 'quick_revision' | 'exam_prep' | 'detailed'
  const [bulletCount, setBulletCount] = useState(80);
  const [customBulletCount, setCustomBulletCount] = useState('');
  const [showCustomCount, setShowCustomCount] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [sectionsData, setSectionsData] = useState(null);
  const [bulletsData, setBulletsData] = useState([]);
  const [summaryMeta, setSummaryMeta] = useState(null);
  const [bulletSearch, setBulletSearch] = useState('');
  const [viewFullGuide, setViewFullGuide] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedBullets, setCopiedBullets] = useState(false);

  // Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [chatError, setChatError] = useState('');
  const messagesEndRef = useRef(null);

  // Quiz State
  const [quizTopic, setQuizTopic] = useState('All Topics');
  const [quizDifficulty, setQuizDifficulty] = useState('medium'); // 'easy' | 'medium' | 'hard'
  const [questionCount, setQuestionCount] = useState(5);
  const [quizData, setQuizData] = useState(null);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [quizError, setQuizError] = useState('');
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [submittedQuiz, setSubmittedQuiz] = useState(false);

  // Check AI status when opened
  useEffect(() => {
    if (isOpen) {
      aiService.getAiStatus().then((status) => {
        setAiStatus(status);
        if (!status.enabled) {
          setShowKeyConfig(true);
        }
      });
    }
  }, [isOpen]);

  // Auto-fetch summary when opened or when summary tabs are viewed
  useEffect(() => {
    const isSummaryTab = ['simpleBullets', 'overview', 'detailedSummary', 'topicExplanation', 'importantQuestions'].includes(activeTab);
    if (isOpen && doc && isSummaryTab && !summaryData && !isLoadingSummary && !summaryError) {
      handleFetchSummary();
    }
  }, [isOpen, doc, activeTab]);

  // Dynamic media badge
  const getMediaBadge = () => {
    const name = (doc?.original_name || '').toLowerCase();
    const mime = (doc?.mime_type || '').toLowerCase();
    if (name.endsWith('.zip') || mime.includes('zip')) {
      return { icon: '📦', label: 'Archive Deep Scan' };
    }
    if (name.match(/\.(png|jpg|jpeg|webp|gif|bmp|svg)$/) || mime.startsWith('image/')) {
      return { icon: '👁️', label: 'Gemini Vision OCR' };
    }
    if (name.match(/\.(mp3|wav|m4a|ogg|flac|aac|webm|wma)$/) || mime.startsWith('audio/')) {
      return { icon: '🎙️', label: 'Gemini Audio Understanding' };
    }
    if (name.match(/\.(xlsx|xls|csv)$/) || mime.includes('spreadsheet') || mime.includes('excel')) {
      return { icon: '📊', label: 'Spreadsheet Analytics' };
    }
    if (name.endsWith('.pdf') || mime.includes('pdf')) {
      return { icon: '📑', label: 'PDF Native Analysis' };
    }
    return { icon: '📄', label: 'Document Assistant' };
  };

  const getQuickPrompts = () => {
    const name = (doc?.original_name || '').toLowerCase();
    const mime = (doc?.mime_type || '').toLowerCase();
    if (name.match(/\.(png|jpg|jpeg|webp|gif|bmp|svg)$/) || mime.startsWith('image/')) {
      return [
        'Transcribe all readable text, labels, and numbers from this image.',
        'Describe the diagram, UI structure, or visual components in detail.',
        'What are the key insights and takeaways from this image?',
        'Give me 5 study or revision questions based on this image content.',
      ];
    }
    if (name.match(/\.(mp3|wav|m4a|ogg|flac|aac|webm|wma)$/) || mime.startsWith('audio/')) {
      return [
        'Summarize the core topics and discussions in this audio recording.',
        'Extract an action item list or key decisions from the speech.',
        'What were the main questions or ideas highlighted in this track?',
        'Provide a chronological breakdown of the topics mentioned.',
      ];
    }
    return [
      'Explain the main topic of this document in simple English.',
      'What are the core differences between the main concepts?',
      'Give me 5 important exam questions based on this document.',
      'Summarize the formulas, theorems, and definitions mentioned.',
    ];
  };

  const mediaBadge = getMediaBadge();
  const quickPrompts = getQuickPrompts();

  // Filtered bullets by search query
  const filteredBullets = bulletsData.filter((b) => {
    if (!bulletSearch.trim()) return true;
    const q = bulletSearch.toLowerCase();
    return (
      (b.topic && b.topic.toLowerCase().includes(q)) ||
      (b.explanation && b.explanation.toLowerCase().includes(q)) ||
      (b.page && b.page.toLowerCase().includes(q)) ||
      (Array.isArray(b.keywords) && b.keywords.some((k) => k.toLowerCase().includes(q))) ||
      (b.memoryTrick && b.memoryTrick.toLowerCase().includes(q))
    );
  });

  // Scroll chat to bottom
  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isThinking, activeTab]);

  if (!isOpen || !doc) return null;

  // 1. Summarizer Handlers
  const handleFetchSummary = async (mode = summaryMode, count = bulletCount, refresh = false) => {
    setIsLoadingSummary(true);
    setSummaryError('');
    try {
      const res = await aiService.getDocumentSummary(doc.id, {
        mode,
        bulletCount: count,
        accessCode: accessCode || doc.access_code || doc.enteredCode,
        refresh,
      });
      setSummaryData(res.summary);
      setSectionsData(res.sections || null);
      setBulletsData(res.bullets || []);
      setSummaryMeta(res);
    } catch (err) {
      setSummaryError(err.message || 'Failed to generate AI summary.');
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const handleCopySummary = (textToCopy = summaryData) => {
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const handleCopyBullets = () => {
    if (!bulletsData || bulletsData.length === 0) {
      if (summaryData) handleCopySummary();
      return;
    }
    const text = bulletsData
      .map((b) => {
        let t = `${b.number}. ${b.topic} [${b.page}]\n   - Explanation: ${b.explanation}`;
        if (b.keywords && b.keywords.length > 0) t += `\n   - Keywords: ${b.keywords.join(', ')}`;
        if (b.memoryTrick) t += `\n   - Memory Trick: 💡 ${b.memoryTrick}`;
        return t;
      })
      .join('\n\n');
    navigator.clipboard.writeText(text);
    setCopiedBullets(true);
    setTimeout(() => setCopiedBullets(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const content =
      summaryData ||
      (bulletsData.length > 0
        ? bulletsData
          .map(
            (b) =>
              `${b.number}. **${b.topic} [${b.page}]**\n- ${b.explanation}\n- Keywords: ${b.keywords?.join(', ')}\n- Memory Trick: ${b.memoryTrick || 'N/A'}`
          )
          .join('\n\n')
        : '');
    if (!content) return;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanDocName = (doc?.original_name || 'document').replace(/\.[^/.]+$/, '');
    link.setAttribute('download', `${cleanDocName}_${bulletCount}Bullets_StudyGuide.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 2. Chat Handlers
  const handleSendMessage = async (customPrompt = null) => {
    const messageText = customPrompt || chatInput.trim();
    if (!messageText || isThinking) return;

    const newHistory = [...chatMessages, { role: 'user', content: messageText }];
    setChatMessages(newHistory);
    setChatInput('');
    setIsThinking(true);
    setChatError('');

    try {
      const res = await aiService.askQuestion(doc.id, {
        question: messageText,
        history: chatMessages.slice(-6),
        accessCode: accessCode || doc.access_code || doc.enteredCode,
      });

      setChatMessages((prev) => [...prev, { role: 'assistant', content: res.answer, timestamp: res.timestamp }]);
    } catch (err) {
      setChatError(err.message || 'AI failed to answer question.');
    } finally {
      setIsThinking(false);
    }
  };

  // 3. Quiz Handlers
  const handleGenerateQuiz = async (refresh = false) => {
    setIsGeneratingQuiz(true);
    setQuizError('');
    setQuizData(null);
    setSelectedAnswers({});
    setSubmittedQuiz(false);

    try {
      const res = await aiService.generateQuiz(doc.id, {
        topic: quizTopic.trim() || 'All Topics',
        difficulty: quizDifficulty,
        questionCount,
        accessCode: accessCode || doc.access_code || doc.enteredCode,
        refresh,
      });
      setQuizData(res);
    } catch (err) {
      setQuizError(err.message || 'Failed to generate quiz.');
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleSelectOption = (questionId, optionIndex) => {
    if (submittedQuiz) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const calculateScore = () => {
    if (!quizData || !quizData.questions) return 0;
    return quizData.questions.reduce((score, q) => {
      return score + (selectedAnswers[q.id] === q.correctIndex ? 1 : 0);
    }, 0);
  };

  // Configure Key Handler
  const handleSaveApiKey = async (e) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) return;
    setIsSavingKey(true);
    try {
      await aiService.configureGeminiKey(apiKeyInput.trim());
      setAiStatus((prev) => ({ ...prev, enabled: true }));
      setShowKeyConfig(false);
      setApiKeyInput('');
      handleFetchSummary(summaryMode, true);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSavingKey(false);
    }
  };

  // Formatted citation chip renderer
  const renderMessageWithCitations = (text) => {
    const parts = text.split(/(\*\*\[(?:Page|Section|Slide)[^\]]+\]\*\*)/gi);
    return parts.map((part, i) => {
      if (part.startsWith('**[') && part.endsWith(']**')) {
        const label = part.replace(/\*\*\[|\]\*\*/g, '');
        return (
          <span
            key={i}
            className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-950/70 text-[#E11D2E] border border-red-800/50 align-baseline"
          >
            <BookOpen className="w-2.5 h-2.5 inline" />
            {label}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[999999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      style={{ position: 'fixed', inset: 0, zIndex: 999999 }}
      onClick={onClose}
    >
      <div
        className="bg-[#121215] border border-[#27272A] rounded-2xl max-w-5xl w-full h-[92vh] max-h-[860px] flex flex-col shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-5 py-3.5 bg-[#18181B] border-b border-[#27272A] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-950 via-zinc-900 to-red-950/60 border border-[#E11D2E]/40 flex items-center justify-center text-[#E11D2E] shrink-0 shadow-lg shadow-red-950/40">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
                  {doc.original_name || 'Document Assistant'}
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-950/80 text-red-300 border border-red-800/40 shrink-0 capitalize flex items-center gap-1">
                  <span>✨</span>
                  <span>Google Gemini ({aiStatus?.model || 'gemini-3.8-flash'})</span>
                </span>
                <span className="inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-300 border border-zinc-700/60 shrink-0 items-center gap-1">
                  <span>{mediaBadge.icon}</span>
                  <span>{mediaBadge.label}</span>
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                11-Section Academic Pipeline · Context-Grounded Q&A · Exam Quizzes · Anti-Hallucination
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* API Key Banner Config */}
        {showKeyConfig && (
          <div className="px-5 py-3 bg-[#0B0B0D] border-b border-zinc-800 text-xs">
            <form onSubmit={handleSaveApiKey} className="flex flex-col sm:flex-row items-center gap-2">
              <div className="flex-1 w-full">
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Enter Google Gemini API Key (starts with AIza...)..."
                  className="w-full bg-[#18181B] border border-zinc-700 rounded-lg py-1.5 px-3 text-white text-xs focus:outline-none focus:border-[#E11D2E]"
                />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="submit"
                  disabled={isSavingKey}
                  className="px-3 py-1.5 rounded-lg bg-[#E11D2E] hover:bg-[#FF2E44] text-white font-medium transition-colors cursor-pointer text-xs"
                >
                  {isSavingKey ? 'Saving...' : 'Save Gemini Key'}
                </button>
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-400 hover:text-white underline text-[11px]"
                >
                  Get free Gemini key
                </a>
              </div>
            </form>
          </div>
        )}

        {/* 7 Dedicated Tabs Navigation */}
        <div className="px-5 pt-2.5 bg-[#18181B]/50 border-b border-[#27272A] flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('simpleBullets')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-t-xl transition-all cursor-pointer border-t border-x whitespace-nowrap ${activeTab === 'simpleBullets'
                ? 'bg-[#121215] border-[#27272A] text-white border-b-transparent shadow-sm'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#E11D2E]" />
            <span>Simple Learning ({bulletsData.length || bulletCount} Bullets)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-t-xl transition-all cursor-pointer border-t border-x whitespace-nowrap ${activeTab === 'overview'
                ? 'bg-[#121215] border-[#27272A] text-white border-b-transparent shadow-sm'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-[#E11D2E]" />
            <span>Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('detailedSummary')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-t-xl transition-all cursor-pointer border-t border-x whitespace-nowrap ${activeTab === 'detailedSummary'
                ? 'bg-[#121215] border-[#27272A] text-white border-b-transparent shadow-sm'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>Detailed Summary</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('topicExplanation')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-t-xl transition-all cursor-pointer border-t border-x whitespace-nowrap ${activeTab === 'topicExplanation'
                ? 'bg-[#121215] border-[#27272A] text-white border-b-transparent shadow-sm'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
          >
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Topic Explanation</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('importantQuestions')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-t-xl transition-all cursor-pointer border-t border-x whitespace-nowrap ${activeTab === 'importantQuestions'
                ? 'bg-[#121215] border-[#27272A] text-white border-b-transparent shadow-sm'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
          >
            <GraduationCap className="w-3.5 h-3.5 text-purple-400" />
            <span>Important Questions</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('quiz')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-t-xl transition-all cursor-pointer border-t border-x whitespace-nowrap ${activeTab === 'quiz'
                ? 'bg-[#121215] border-[#27272A] text-white border-b-transparent shadow-sm'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
          >
            <Award className="w-3.5 h-3.5 text-emerald-400" />
            <span>Quiz</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-t-xl transition-all cursor-pointer border-t border-x whitespace-nowrap ${activeTab === 'chat'
                ? 'bg-[#121215] border-[#27272A] text-white border-b-transparent shadow-sm'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
            <span>Ask AI</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#121215]">
          {/* Controls Bar for Summary Tabs */}
          {['simpleBullets', 'overview', 'detailedSummary', 'topicExplanation', 'importantQuestions'].includes(activeTab) && (
            <div className="space-y-3 pb-3 mb-4 border-b border-zinc-800">
              {/* Row 1: Study Modes & Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Learning Mode Selector */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-zinc-400 font-medium mr-1">Study Mode:</span>
                  {[
                    { id: 'simple_learning', label: '✨ Simple Learning', title: 'Default: Clear English, keywords & memory tricks' },
                    { id: 'quick_revision', label: '⚡ Quick Revision', title: 'Fast high-yield review' },
                    { id: 'exam_prep', label: '🎓 Exam Prep', title: 'Rigorous exam-focused concepts' },
                    { id: 'detailed', label: '📚 Detailed Academic', title: 'Full comprehensive text' },
                  ].map(({ id, label, title }) => (
                    <button
                      key={id}
                      type="button"
                      title={title}
                      onClick={() => {
                        setSummaryMode(id);
                        handleFetchSummary(id, bulletCount);
                      }}
                      className={`text-xs px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${summaryMode === id
                          ? 'bg-[#E11D2E] text-white font-semibold shadow-sm'
                          : 'bg-zinc-800/70 text-zinc-300 hover:bg-zinc-700'
                        }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadMarkdown}
                    disabled={!summaryData && (!bulletsData || bulletsData.length === 0)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs transition-colors cursor-pointer disabled:opacity-40"
                    title="Download study notes as Markdown file"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-400" />
                    <span className="hidden sm:inline">Export Notes</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopySummary(summaryData)}
                    disabled={!summaryData}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs transition-colors cursor-pointer disabled:opacity-40"
                    title="Copy full study guide to clipboard"
                  >
                    {copiedSummary ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy All</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFetchSummary(summaryMode, bulletCount, true)}
                    disabled={isLoadingSummary}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs transition-colors cursor-pointer disabled:opacity-40"
                    title="Regenerate summary with Google Gemini"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSummary ? 'animate-spin text-[#E11D2E]' : ''}`} />
                    <span>Regenerate</span>
                  </button>
                </div>
              </div>

              {/* Row 2: Bullet Count Presets & Exact Verification Status */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-zinc-400 font-medium mr-1">Target Bullets:</span>
                  {[20, 40, 60, 80, 100].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => {
                        setBulletCount(count);
                        setShowCustomCount(false);
                        handleFetchSummary(summaryMode, count);
                      }}
                      className={`text-xs px-2.5 py-1 rounded-lg transition-all cursor-pointer font-medium ${bulletCount === count && !showCustomCount
                          ? 'bg-red-950/90 border border-[#E11D2E] text-white font-bold'
                          : 'bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60'
                        }`}
                    >
                      {count} {count === 80 ? '🎯' : ''}
                    </button>
                  ))}

                  {/* Custom Count Button / Input */}
                  {!showCustomCount ? (
                    <button
                      type="button"
                      onClick={() => setShowCustomCount(true)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60 cursor-pointer"
                    >
                      Custom
                    </button>
                  ) : (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="5"
                        max="200"
                        placeholder="Count"
                        value={customBulletCount}
                        onChange={(e) => setCustomBulletCount(e.target.value)}
                        className="w-16 px-2 py-0.5 text-xs rounded bg-zinc-900 border border-zinc-700 text-white focus:outline-none focus:border-[#E11D2E]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const val = parseInt(customBulletCount, 10);
                          if (!isNaN(val) && val >= 5 && val <= 200) {
                            setBulletCount(val);
                            handleFetchSummary(summaryMode, val);
                          }
                        }}
                        className="px-2 py-0.5 text-xs rounded bg-[#E11D2E] text-white font-semibold hover:bg-red-600 cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                </div>

                {/* Verification & Coverage Status Indicator */}
                {summaryMeta && (
                  <div className="flex items-center gap-2 text-[11px] text-zinc-300">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 font-semibold">
                      <CheckCircle className="w-3 h-3" />
                      {summaryMeta.bulletCount} / {summaryMeta.requestedCount} Bullets Verified
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-950/60 border border-blue-800/60 text-blue-400">
                      📄 100% PDF Covered ({summaryMeta.totalPages} Pages)
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Summary Error banner with Retry */}
          {summaryError && ['simpleBullets', 'overview', 'detailedSummary', 'topicExplanation', 'importantQuestions'].includes(activeTab) && (
            <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800/60 text-xs text-red-200 flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#E11D2E] shrink-0" />
                <span>{summaryError}</span>
              </div>
              <button
                type="button"
                onClick={() => handleFetchSummary(summaryMode, bulletCount, true)}
                className="px-2.5 py-1 rounded bg-[#E11D2E] hover:bg-[#FF2E44] text-white text-[11px] font-semibold transition-colors cursor-pointer shrink-0"
              >
                Retry
              </button>
            </div>
          )}

          {/* Loading Indicator */}
          {isLoadingSummary && ['simpleBullets', 'overview', 'detailedSummary', 'topicExplanation', 'importantQuestions'].includes(activeTab) && (
            <div className="py-20 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-red-950/50 border border-[#E11D2E]/40 flex items-center justify-center text-[#E11D2E]">
                <RefreshCw className="w-7 h-7 animate-spin" />
              </div>
              <h4 className="text-sm font-semibold text-white">
                Generating {bulletCount}-Bullet Study Guide with Google Gemini ({aiStatus?.model || 'gemini-3.6-flash'})...
              </h4>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                Processing all PDF pages, extracting concepts, verifying page references, and enforcing exactly {bulletCount} verified bullets in Simple Learning Mode.
              </p>
            </div>
          )}

          {/* VIEW: FULL GUIDE (When user toggles "All 11 Sections") */}
          {!isLoadingSummary && summaryData && viewFullGuide && ['simpleBullets', 'overview', 'detailedSummary', 'topicExplanation', 'importantQuestions'].includes(activeTab) && (
            <div className="prose prose-invert max-w-none text-zinc-200 text-xs sm:text-sm leading-relaxed space-y-3 p-4 sm:p-5 rounded-2xl bg-[#0B0B0D] border border-zinc-800/90 whitespace-pre-wrap select-text font-sans shadow-inner">
              {summaryData}
            </div>
          )}

          {/* TAB 0: SIMPLE LEARNING BULLETS (DEFAULT TAB) */}
          {!isLoadingSummary && !viewFullGuide && activeTab === 'simpleBullets' && (
            <div className="space-y-4 max-w-4xl mx-auto">
              {/* Search & Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#0B0B0D] border border-zinc-800">
                <div className="flex-1 min-w-[200px] relative">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={bulletSearch}
                    onChange={(e) => setBulletSearch(e.target.value)}
                    placeholder="Search bullets by keyword, concept name, or page (e.g. Algae, Page 3)..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-zinc-900/80 border border-zinc-700/80 text-white placeholder-zinc-500 focus:outline-none focus:border-[#E11D2E]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400">
                    Showing {filteredBullets.length} of {bulletsData.length || bulletCount} bullets
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyBullets}
                    disabled={filteredBullets.length === 0}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs transition-colors cursor-pointer disabled:opacity-40"
                  >
                    {copiedBullets ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Bullets</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Render Bullets List */}
              {filteredBullets.length > 0 ? (
                <div className="space-y-3">
                  {filteredBullets.map((b) => (
                    <div
                      key={b.number}
                      className="p-4 rounded-xl bg-[#0B0B0D] border border-zinc-800/80 hover:border-zinc-700/80 transition-all space-y-2.5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span className="inline-flex items-center justify-center min-w-[26px] h-6 px-1.5 rounded-full bg-[#E11D2E]/20 border border-[#E11D2E]/40 text-[#FF4D5E] font-bold text-xs shrink-0 font-mono">
                            #{b.number}
                          </span>
                          <h4 className="text-white font-bold text-sm tracking-tight">{b.topic}</h4>
                        </div>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-300 border border-zinc-700/50 shrink-0">
                          {b.page}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed font-sans">
                        {b.explanation}
                      </p>

                      {b.keywords && b.keywords.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {b.keywords.map((kw, i) => (
                            <span
                              key={i}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-800/60 text-zinc-300 font-mono border border-zinc-700/40"
                            >
                              #{kw}
                            </span>
                          ))}
                        </div>
                      )}

                      {b.memoryTrick && (
                        <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/40 text-amber-200 text-xs flex items-start gap-2">
                          <span className="text-sm shrink-0">💡</span>
                          <div>
                            <span className="font-semibold text-amber-300">Memory Trick: </span>
                            <span>{b.memoryTrick}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-zinc-400 text-xs">
                  {bulletSearch ? `No bullets found matching "${bulletSearch}".` : 'No bullets generated yet.'}
                </div>
              )}
            </div>
          )}

          {/* TAB 1: OVERVIEW */}
          {!isLoadingSummary && summaryData && !viewFullGuide && activeTab === 'overview' && (
            <div className="space-y-4 max-w-4xl mx-auto">
              {/* Section 1: Document Overview */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0B0B0D] border border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <span className="text-base">📄</span>
                  <h4>1. Document Overview</h4>
                </div>
                <div className="text-xs sm:text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap select-text">
                  {sectionsData?.overview || 'Comprehensive overview of the document.'}
                </div>
              </div>

              {/* Section 3: Beginner-Friendly Explanation */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0B0B0D] border border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <span className="text-base">💡</span>
                  <h4>3. Beginner-Friendly Explanation</h4>
                </div>
                <div className="text-xs sm:text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap select-text">
                  {sectionsData?.beginnerFriendly || 'Simple everyday intuition and analogies.'}
                </div>
              </div>

              {/* Section 9: Important Takeaways */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0B0B0D] border border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <span className="text-base">🎯</span>
                  <h4>9. Important Takeaways</h4>
                </div>
                <div className="text-xs sm:text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap select-text">
                  {sectionsData?.takeaways || 'Key high-yield takeaways from this study guide.'}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DETAILED SUMMARY */}
          {!isLoadingSummary && summaryData && !viewFullGuide && activeTab === 'detailedSummary' && (
            <div className="space-y-4 max-w-4xl mx-auto">
              {/* Section 2: Detailed Summary */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0B0B0D] border border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <span className="text-base">📝</span>
                  <h4>2. Detailed Summary</h4>
                </div>
                <div className="text-xs sm:text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap select-text">
                  {sectionsData?.detailedSummary || 'Extensive breakdown of all material.'}
                </div>
              </div>

              {/* Section 5: Important Concepts */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0B0B0D] border border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <span className="text-base">🔑</span>
                  <h4>5. Important Concepts</h4>
                </div>
                <div className="text-xs sm:text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap select-text">
                  {sectionsData?.importantConcepts || 'Core conceptual pillars.'}
                </div>
              </div>

              {/* Section 6: Technical Definitions */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0B0B0D] border border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <span className="text-base">📚</span>
                  <h4>6. Technical Definitions</h4>
                </div>
                <div className="text-xs sm:text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap select-text">
                  {sectionsData?.technicalDefinitions || 'Glossary of technical terminology.'}
                </div>
              </div>

              {/* Section 8: Important Formulas & Explanations */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0B0B0D] border border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <span className="text-base">📐</span>
                  <h4>8. Important Formulas & Explanations</h4>
                </div>
                <div className="text-xs sm:text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap select-text">
                  {sectionsData?.formulas || 'Equations, mathematical formulas, and logical frameworks.'}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TOPIC EXPLANATION */}
          {!isLoadingSummary && summaryData && !viewFullGuide && activeTab === 'topicExplanation' && (
            <div className="space-y-4 max-w-4xl mx-auto">
              {/* Section 4: Chapter-Wise or Topic-Wise Breakdown */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0B0B0D] border border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <span className="text-base">📑</span>
                  <h4>4. Chapter-Wise & Topic-Wise Breakdown</h4>
                </div>
                <div className="text-xs sm:text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap select-text">
                  {sectionsData?.topicExplanation || 'Step-by-step topic breakdown.'}
                </div>
              </div>

              {/* Section 7: Real-World Examples */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0B0B0D] border border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <span className="text-base">🌍</span>
                  <h4>7. Real-World Examples</h4>
                </div>
                <div className="text-xs sm:text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap select-text">
                  {sectionsData?.realWorldExamples || 'Practical scenarios and concrete applications.'}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: IMPORTANT QUESTIONS */}
          {!isLoadingSummary && summaryData && !viewFullGuide && activeTab === 'importantQuestions' && (
            <div className="space-y-4 max-w-4xl mx-auto">
              {/* Section 10: Exam-Oriented Questions */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0B0B0D] border border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <span className="text-base">❓</span>
                  <h4>10. Exam-Oriented Questions & Model Answers</h4>
                </div>
                <div className="text-xs sm:text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap select-text">
                  {sectionsData?.examQuestions || 'Rigorous university questions with comprehensive model solutions.'}
                </div>
              </div>

              {/* Section 11: Quick Revision Notes */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0B0B0D] border border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <span className="text-base">⚡</span>
                  <h4>11. Quick Revision Notes (Cheat Sheet)</h4>
                </div>
                <div className="text-xs sm:text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap select-text">
                  {sectionsData?.quickRevision || 'Rapid last-minute revision bullet points.'}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: QUIZ */}
          {activeTab === 'quiz' && (
            <div className="space-y-5 max-w-3xl mx-auto">
              {/* Quiz Configuration Panel */}
              {!quizData && (
                <div className="p-5 rounded-2xl bg-[#0B0B0D] border border-zinc-800/90 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    <Award className="w-4 h-4 text-emerald-400" />
                    <span>Generate AI Exam Quiz (Google Gemini)</span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Test your understanding of "{doc.original_name}". Gemini creates multiple-choice questions with answers, explanations, and exact citations.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    {/* Topic */}
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Topic / Scope</label>
                      <input
                        type="text"
                        value={quizTopic}
                        onChange={(e) => setQuizTopic(e.target.value)}
                        placeholder="e.g. All Topics or Chapter 1"
                        className="w-full bg-[#18181B] border border-zinc-700 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Difficulty */}
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Difficulty</label>
                      <div className="grid grid-cols-3 gap-1 bg-[#18181B] p-1 rounded-lg border border-zinc-700">
                        {['easy', 'medium', 'hard'].map((diff) => (
                          <button
                            key={diff}
                            type="button"
                            onClick={() => setQuizDifficulty(diff)}
                            className={`text-[10px] uppercase font-bold py-1 rounded transition-colors cursor-pointer ${quizDifficulty === diff
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'text-zinc-400 hover:text-white'
                              }`}
                          >
                            {diff}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Number of Questions */}
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-300 mb-1">Question Count</label>
                      <select
                        value={questionCount}
                        onChange={(e) => setQuestionCount(Number(e.target.value))}
                        className="w-full bg-[#18181B] border border-zinc-700 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        <option value={3}>3 Questions (Quick Check)</option>
                        <option value={5}>5 Questions (Standard)</option>
                        <option value={10}>10 Questions (Comprehensive)</option>
                      </select>
                    </div>
                  </div>

                  {quizError && (
                    <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/60 text-xs text-red-200 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-[#E11D2E] shrink-0" />
                        <span>{quizError}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleGenerateQuiz(true)}
                        className="px-2 py-1 rounded bg-[#E11D2E] text-white text-[10px] font-bold"
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleGenerateQuiz(false)}
                      disabled={isGeneratingQuiz}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-40"
                    >
                      {isGeneratingQuiz ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Generating Gemini Exam MCQs...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5" />
                          <span>Start AI Quiz</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Active Quiz View */}
              {quizData && quizData.questions && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-[#0B0B0D] border border-zinc-800 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white">
                        {quizData.topic} · <span className="capitalize text-emerald-400">{quizData.difficulty}</span> ({quizData.questions.length} Questions)
                      </h4>
                      <p className="text-[11px] text-zinc-400">
                        {submittedQuiz
                          ? `Final Score: ${calculateScore()} / ${quizData.questions.length} (${Math.round((calculateScore() / quizData.questions.length) * 100)}%)`
                          : 'Select your answers below, then submit to check your score and view detailed explanations.'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setQuizData(null);
                        setSubmittedQuiz(false);
                      }}
                      className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    >
                      New Quiz
                    </button>
                  </div>

                  {/* Question Cards */}
                  <div className="space-y-4">
                    {quizData.questions.map((q, qIdx) => {
                      const userChoice = selectedAnswers[q.id];
                      const isCorrect = userChoice === q.correctIndex;

                      return (
                        <div
                          key={q.id}
                          className={`p-4 rounded-xl border transition-all ${submittedQuiz
                              ? isCorrect
                                ? 'bg-emerald-950/20 border-emerald-600/40'
                                : 'bg-red-950/20 border-red-700/40'
                              : 'bg-[#0B0B0D] border-zinc-800'
                            }`}
                        >
                          <div className="flex items-start justify-between gap-3 mb-2.5">
                            <h5 className="text-xs sm:text-sm font-semibold text-white">
                              {qIdx + 1}. {q.question}
                            </h5>
                            {submittedQuiz && (
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 ${isCorrect
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                                    : 'bg-red-950 text-red-300 border border-red-800/60'
                                  }`}
                              >
                                {isCorrect ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Correct
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="w-3 h-3 text-[#E11D2E]" /> Incorrect
                                  </>
                                )}
                              </span>
                            )}
                          </div>

                          {/* Options */}
                          <div className="space-y-2 text-xs">
                            {q.options.map((opt, optIdx) => {
                              const isSelected = userChoice === optIdx;
                              let optionClass = 'bg-[#18181B] border-zinc-800 text-zinc-300 hover:border-zinc-700';

                              if (submittedQuiz) {
                                if (optIdx === q.correctIndex) {
                                  optionClass = 'bg-emerald-950/70 border-emerald-500 text-emerald-200 font-semibold';
                                } else if (isSelected && !isCorrect) {
                                  optionClass = 'bg-red-950/70 border-red-600 text-red-200';
                                }
                              } else if (isSelected) {
                                optionClass = 'bg-[#E11D2E]/20 border-[#E11D2E] text-white font-medium';
                              }

                              return (
                                <button
                                  key={optIdx}
                                  type="button"
                                  onClick={() => handleSelectOption(q.id, optIdx)}
                                  className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-center gap-2.5 cursor-pointer ${optionClass}`}
                                >
                                  <span className="w-5 h-5 rounded-full border border-zinc-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                                    {String.fromCharCode(65 + optIdx)}
                                  </span>
                                  <span className="flex-1">{opt}</span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Explanation and Citation */}
                          {submittedQuiz && (
                            <div className="mt-3 pt-3 border-t border-zinc-800/80 text-[11px] text-zinc-300 space-y-1">
                              <p>
                                <strong className="text-emerald-400">Explanation: </strong>
                                {q.explanation}
                              </p>
                              {q.citation && (
                                <p className="text-zinc-400 flex items-center gap-1 font-mono text-[10px]">
                                  <BookOpen className="w-3 h-3 text-[#E11D2E]" />
                                  <span>Source: {q.citation}</span>
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Submit / Finish Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    {!submittedQuiz ? (
                      <button
                        type="button"
                        onClick={() => setSubmittedQuiz(true)}
                        className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md cursor-pointer"
                      >
                        Submit & Score Quiz
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAnswers({});
                          setSubmittedQuiz(false);
                        }}
                        className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs transition-all cursor-pointer"
                      >
                        Retake This Quiz
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: ASK AI */}
          {activeTab === 'chat' && (
            <div className="h-full flex flex-col justify-between max-w-3xl mx-auto">
              {/* Quick Prompt Suggestions */}
              {chatMessages.length === 0 && (
                <div className="py-6 space-y-4">
                  <div className="text-center space-y-1">
                    <div className="w-10 h-10 mx-auto rounded-xl bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center text-cyan-400">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-white">Ask anything about "{doc.original_name}"</h4>
                    <p className="text-xs text-zinc-400">
                      Grounded in Google Gemini with exact source citations and strict anti-hallucination defense.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    {quickPrompts.map((prompt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(prompt)}
                        className="p-3 text-left rounded-xl bg-[#0B0B0D] border border-zinc-800 hover:border-cyan-500/50 hover:bg-zinc-900/60 text-xs text-zinc-300 transition-all cursor-pointer flex items-center justify-between group"
                      >
                        <span className="line-clamp-2">{prompt}</span>
                        <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-cyan-400 shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-3 text-xs ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-lg bg-red-950/80 border border-[#E11D2E]/40 flex items-center justify-center text-[#E11D2E] shrink-0 mt-0.5">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] p-3.5 rounded-2xl leading-relaxed whitespace-pre-wrap select-text ${msg.role === 'user'
                          ? 'bg-[#E11D2E] text-white rounded-tr-sm shadow-md'
                          : 'bg-[#0B0B0D] border border-zinc-800/80 text-zinc-200 rounded-tl-sm'
                        }`}
                    >
                      {msg.role === 'assistant' ? renderMessageWithCitations(msg.content) : msg.content}
                    </div>
                  </div>
                ))}

                {isThinking && (
                  <div className="flex gap-3 text-xs items-center text-zinc-400">
                    <div className="w-7 h-7 rounded-lg bg-red-950/80 border border-[#E11D2E]/40 flex items-center justify-center text-[#E11D2E] shrink-0 animate-pulse">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <span className="animate-pulse">DocQevrilo Gemini is checking document context...</span>
                  </div>
                )}

                {chatError && (
                  <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/60 text-xs text-red-200 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-[#E11D2E] shrink-0" />
                      <span>{chatError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSendMessage()}
                      className="px-2 py-1 rounded bg-[#E11D2E] text-white text-[10px] font-bold"
                    >
                      Retry
                    </button>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Box */}
              <div className="pt-3 border-t border-zinc-800 mt-2">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2 bg-[#0B0B0D] border border-zinc-800 rounded-xl p-1.5 focus-within:border-[#E11D2E] transition-all"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask any question, doubt, or request grounded revision notes..."
                    disabled={isThinking}
                    className="flex-1 bg-transparent px-3 py-2 text-xs text-white focus:outline-none placeholder-zinc-500"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || isThinking}
                    className="px-3.5 py-2 rounded-lg bg-[#E11D2E] hover:bg-[#FF2E44] disabled:opacity-40 text-white font-medium transition-all cursor-pointer flex items-center gap-1.5 shadow-sm text-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Ask</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
