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
} from 'lucide-react';
import { aiService } from '../../services/aiService';

export default function AiDocumentModal({ isOpen, onClose, doc, accessCode = '' }) {
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'chat' | 'quiz'
  const [aiStatus, setAiStatus] = useState({ enabled: true, provider: 'Groq Cloud', model: 'llama-3.3-70b-versatile' });
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [isSavingKey, setIsSavingKey] = useState(false);

  // Summary State
  const [summaryMode, setSummaryMode] = useState('detailed');
  const [summaryData, setSummaryData] = useState(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [copiedSummary, setCopiedSummary] = useState(false);

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

  // Auto-fetch summary when summary tab is first viewed
  useEffect(() => {
    if (isOpen && doc && activeTab === 'summary' && !summaryData && !isLoadingSummary && !summaryError) {
      handleFetchSummary();
    }
  }, [isOpen, doc, activeTab]);

  // Scroll chat to bottom
  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isThinking, activeTab]);

  if (!isOpen || !doc) return null;

  // 1. Summarizer Handlers
  const handleFetchSummary = async (mode = summaryMode) => {
    setIsLoadingSummary(true);
    setSummaryError('');
    try {
      const res = await aiService.getDocumentSummary(doc.id, {
        mode,
        accessCode: accessCode || doc.access_code || doc.enteredCode,
      });
      setSummaryData(res.summary);
    } catch (err) {
      setSummaryError(err.message || 'Failed to generate AI summary.');
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const handleCopySummary = () => {
    if (!summaryData) return;
    navigator.clipboard.writeText(summaryData);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
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
  const handleGenerateQuiz = async () => {
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
      await aiService.configureGroqKey(apiKeyInput.trim());
      setAiStatus((prev) => ({ ...prev, enabled: true }));
      setShowKeyConfig(false);
      setApiKeyInput('');
      if (activeTab === 'summary' && !summaryData) {
        handleFetchSummary();
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSavingKey(false);
    }
  };

  // Formatted citation chip renderer
  const renderMessageWithCitations = (text) => {
    // Replace markdown tags like **[Page 1]** or **[Section 2]** with sleek badge
    const parts = text.split(/(\*\*\[(?:Page|Section)[^\]]+\]\*\*)/gi);
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
        className="bg-[#121215] border border-[#27272A] rounded-2xl max-w-4xl w-full h-[90vh] max-h-[820px] flex flex-col shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-5 py-3.5 bg-[#18181B] border-b border-[#27272A] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-950 via-zinc-900 to-red-950/60 border border-[#E11D2E]/40 flex items-center justify-center text-[#E11D2E] shrink-0 shadow-lg shadow-red-950/40">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
                  {doc.original_name || 'Document Assistant'}
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-950/80 text-red-300 border border-red-800/40 shrink-0 capitalize">
                  ⚡ Groq {aiStatus?.model ? aiStatus.model.split('/').pop().replace(/-/g, ' ') : 'AI Active'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                AI Document Assistant · Summarizer · Ask AI & Citations · Exam Quiz
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowKeyConfig(!showKeyConfig)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer text-xs flex items-center gap-1 border border-zinc-800"
              title="Groq API Key Settings"
            >
              <Key className="w-3.5 h-3.5 text-[#E11D2E]" />
              <span className="hidden sm:inline text-[11px]">API Key</span>
            </button>
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

        {/* API Key Banner Config if needed */}
        {showKeyConfig && (
          <div className="px-5 py-3 bg-[#0B0B0D] border-b border-zinc-800 text-xs">
            <form onSubmit={handleSaveApiKey} className="flex flex-col sm:flex-row items-center gap-2">
              <div className="flex-1 w-full">
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Enter Groq API Key (starts with gsk_)..."
                  className="w-full bg-[#18181B] border border-zinc-700 rounded-lg py-1.5 px-3 text-white text-xs focus:outline-none focus:border-[#E11D2E]"
                />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="submit"
                  disabled={isSavingKey}
                  className="px-3 py-1.5 rounded-lg bg-[#E11D2E] hover:bg-[#FF2E44] text-white font-medium transition-colors cursor-pointer text-xs"
                >
                  {isSavingKey ? 'Saving...' : 'Save Key'}
                </button>
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-400 hover:text-white underline text-[11px]"
                >
                  Get free key
                </a>
              </div>
            </form>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="px-5 pt-2.5 bg-[#18181B]/50 border-b border-[#27272A] flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-xl transition-all cursor-pointer border-t border-x ${
              activeTab === 'summary'
                ? 'bg-[#121215] border-[#27272A] text-white border-b-transparent shadow-sm'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-[#E11D2E]" />
            <span>AI Summarizer</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-xl transition-all cursor-pointer border-t border-x ${
              activeTab === 'chat'
                ? 'bg-[#121215] border-[#27272A] text-white border-b-transparent shadow-sm'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
            <span>Ask AI & Clear Doubts</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('quiz')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-xl transition-all cursor-pointer border-t border-x ${
              activeTab === 'quiz'
                ? 'bg-[#121215] border-[#27272A] text-white border-b-transparent shadow-sm'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-emerald-400" />
            <span>Interactive Quiz</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#121215]">
          {/* TAB 1: AI SUMMARIZER */}
          {activeTab === 'summary' && (
            <div className="space-y-4 max-w-3xl mx-auto">
              {/* Mode Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400">Mode:</span>
                  {['detailed', 'quick', 'exam'].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setSummaryMode(mode);
                        handleFetchSummary(mode);
                      }}
                      className={`text-xs px-2.5 py-1 rounded-lg capitalize transition-colors cursor-pointer ${
                        summaryMode === mode
                          ? 'bg-[#E11D2E] text-white font-semibold'
                          : 'bg-zinc-800/70 text-zinc-300 hover:bg-zinc-700'
                      }`}
                    >
                      {mode === 'exam' ? 'Exam Revision' : mode}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopySummary}
                    disabled={!summaryData}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs transition-colors cursor-pointer"
                  >
                    {copiedSummary ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Summary</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFetchSummary(summaryMode)}
                    disabled={isLoadingSummary}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSummary ? 'animate-spin' : ''}`} />
                    <span>Regenerate</span>
                  </button>
                </div>
              </div>

              {/* Summary Error banner */}
              {summaryError && (
                <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800/60 text-xs text-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-[#E11D2E] shrink-0" />
                  <span>{summaryError}</span>
                </div>
              )}

              {/* Loading State */}
              {isLoadingSummary && (
                <div className="py-16 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-red-950/50 border border-[#E11D2E]/40 flex items-center justify-center text-[#E11D2E]">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  </div>
                  <h4 className="text-sm font-semibold text-white">
                    Analyzing study material with {aiStatus?.model ? aiStatus.model.split('/').pop().replace(/-/g, ' ') : 'Groq AI'}...
                  </h4>
                  <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                    Extracting core concepts, definitions, high-yield takeaways, and exam revision notes.
                  </p>
                </div>
              )}

              {/* Formatted Summary Content */}
              {!isLoadingSummary && summaryData && (
                <div className="prose prose-invert max-w-none text-zinc-200 text-xs sm:text-sm leading-relaxed space-y-3 p-4 sm:p-5 rounded-2xl bg-[#0B0B0D] border border-zinc-800/90 whitespace-pre-wrap select-text font-sans shadow-inner">
                  {summaryData}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ASK AI & CLEAR DOUBTS */}
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
                      The AI reads the document sections and provides answers with specific page citations.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    {[
                      'Explain the main topic of this document in simple English.',
                      'What are the core differences between the main concepts?',
                      'Give me 5 important exam questions based on this document.',
                      'Summarize the formulas, theorems, and definitions mentioned.',
                    ].map((prompt, idx) => (
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
                      className={`max-w-[85%] p-3.5 rounded-2xl leading-relaxed whitespace-pre-wrap select-text ${
                        msg.role === 'user'
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
                    <span className="animate-pulse">DocQevrilo AI is checking document context...</span>
                  </div>
                )}

                {chatError && (
                  <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/60 text-xs text-red-200 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-[#E11D2E] shrink-0" />
                    <span>{chatError}</span>
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
                    placeholder="Ask any question, doubt, or request revision notes..."
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

          {/* TAB 3: INTERACTIVE QUIZ MODE */}
          {activeTab === 'quiz' && (
            <div className="space-y-5 max-w-3xl mx-auto">
              {/* Quiz Configuration Panel */}
              {!quizData && (
                <div className="p-5 rounded-2xl bg-[#0B0B0D] border border-zinc-800/90 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    <Award className="w-4 h-4 text-emerald-400" />
                    <span>Generate Customizable AI Quiz</span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Test your understanding of "{doc.original_name}". DocQevrilo AI creates multiple-choice questions with answers, explanations, and citations.
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
                            className={`text-[10px] uppercase font-bold py-1 rounded transition-colors cursor-pointer ${
                              quizDifficulty === diff
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
                    <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/60 text-xs text-red-200 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-[#E11D2E] shrink-0" />
                      <span>{quizError}</span>
                    </div>
                  )}

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleGenerateQuiz}
                      disabled={isGeneratingQuiz}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
                    >
                      {isGeneratingQuiz ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Generating Exam MCQs...</span>
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
                  {/* Quiz Header Bar */}
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
                          className={`p-4 rounded-xl border transition-all ${
                            submittedQuiz
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
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 ${
                                  isCorrect
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

                          {/* Explanation and Citation (Shown after submission) */}
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
        </div>
      </div>
    </div>,
    document.body
  );
}
