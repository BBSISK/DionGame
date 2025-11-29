import React, { useState, useEffect, useCallback, useRef } from 'react';
import { generateDinoData, generateDinoImage } from './services/gemini';
import { DinoQuestion, GameState, AppStatus } from './types';
import { Spinner } from './components/Spinner';
import { Confetti } from './components/Confetti';
import { Trophy, XCircle, CheckCircle2, AlertTriangle, ArrowRight, Dna, Loader2, Sparkles, Medal, Keyboard } from 'lucide-react';

// Rank definitions
const RANKS = [
  { threshold: 0, title: "Lab Intern" },
  { threshold: 5, title: "Field Researcher" },
  { threshold: 10, title: "Park Ranger" },
  { threshold: 20, title: "Lead Paleontologist" },
  { threshold: 35, title: "Dino Whisperer" },
  { threshold: 50, title: "Time Traveler" }
];

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [questionData, setQuestionData] = useState<DinoQuestion | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  
  // New state for transition management
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [nextReady, setNextReady] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  
  const [stats, setStats] = useState<GameState>({
    correct: 0,
    incorrect: 0,
    streak: 0
  });

  // Reference to store the promise of the background generation
  const nextRoundPromise = useRef<Promise<{data: DinoQuestion, img: string} | null> | null>(null);

  // Helper to fetch a single round of data
  const fetchRoundData = async () => {
    try {
      const data = await generateDinoData();
      const img = await generateDinoImage(data.correctName, data.visualDescription);
      return { data, img };
    } catch (error) {
      console.error("Background fetch error:", error);
      return null;
    }
  };

  // Start fetching the next question in the background
  const preloadNextQuestion = useCallback(() => {
    if (nextRoundPromise.current) return; // Already loading
    
    setNextReady(false);
    console.log("Starting background generation...");
    
    nextRoundPromise.current = fetchRoundData().then(result => {
      if (result) {
        setNextReady(true);
        console.log("Background generation complete.");
      }
      return result;
    });
  }, []);

  const loadNewQuestion = useCallback(async (isInitial = false) => {
    // If it's the first load, we show the full screen spinner.
    // Otherwise, we just show the button spinner (isLoadingNext).
    if (isInitial) {
      setStatus(AppStatus.LOADING_QUESTION);
    } else {
      setIsLoadingNext(true);
    }
    
    // Clear selection and effects
    setSelectedOption(null);
    setShowConfetti(false);

    try {
      // Ensure we have a promise to wait on
      if (!nextRoundPromise.current) {
        preloadNextQuestion();
      }

      // Wait for the background task to finish
      const result = await nextRoundPromise.current;
      
      // Clear the promise ref so we don't reuse it
      nextRoundPromise.current = null;
      setNextReady(false);

      if (!result) {
        throw new Error("Failed to load question data");
      }

      const { data, img } = result;

      // Update state with new content
      setQuestionData(data);
      setImageUrl(img);

      // Create options array and shuffle
      const options = [...data.distractors, data.correctName];
      for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
      }
      setShuffledOptions(options);

      setStatus(AppStatus.READY_TO_ANSWER);

      // Immediately start fetching the *next* round
      preloadNextQuestion();

    } catch (error) {
      console.error(error);
      setStatus(AppStatus.ERROR);
    } finally {
      setIsLoadingNext(false);
    }
  }, [preloadNextQuestion]);

  // Initial load
  useEffect(() => {
    loadNewQuestion(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAnswer = useCallback((answer: string) => {
    if (status !== AppStatus.READY_TO_ANSWER) return;

    setSelectedOption(answer);
    setStatus(AppStatus.ANSWERED);

    const isCorrect = answer === questionData?.correctName;

    if (isCorrect) {
      setShowConfetti(true);
    }

    setStats(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      incorrect: prev.incorrect + (isCorrect ? 0 : 1),
      streak: isCorrect ? prev.streak + 1 : 0
    }));
  }, [status, questionData]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      
      if (status === AppStatus.READY_TO_ANSWER) {
        // Map 1-4 to indices 0-3
        if (['1', '2', '3', '4'].includes(key)) {
          const index = parseInt(key) - 1;
          if (shuffledOptions[index]) {
            handleAnswer(shuffledOptions[index]);
          }
        }
      }

      // Enter key for "Next Question"
      if (e.key === 'Enter' && status === AppStatus.ANSWERED && !isLoadingNext) {
        loadNewQuestion(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, shuffledOptions, handleAnswer, isLoadingNext, loadNewQuestion]);

  const isCorrect = selectedOption === questionData?.correctName;

  // Calculate Rank
  const currentRank = [...RANKS].reverse().find(r => stats.correct >= r.threshold) || RANKS[0];

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 font-sans">
      {showConfetti && <Confetti />}

      {/* Header */}
      <header className="w-full max-w-4xl flex flex-col md:flex-row justify-between items-center mb-8 bg-dino-card p-4 rounded-xl border border-slate-700 shadow-lg gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="bg-dino-accent/20 p-2 rounded-lg">
            <Dna className="w-8 h-8 text-dino-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">DinoGen</h1>
            <div className="flex items-center gap-2 text-xs text-slate-400">
               <Medal className="w-3 h-3 text-amber-400" />
               <span className="uppercase tracking-wider text-amber-400 font-bold">{currentRank.title}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-6 text-sm font-medium w-full md:w-auto justify-around md:justify-end">
            <div className="flex flex-col items-center">
                <span className="text-slate-400 text-xs uppercase tracking-wider">Streak</span>
                <span className="text-amber-400 flex items-center gap-1">
                    <Trophy className="w-4 h-4" /> {stats.streak}
                </span>
            </div>
            <div className="flex flex-col items-center">
                <span className="text-slate-400 text-xs uppercase tracking-wider">Correct</span>
                <span className="text-emerald-400">{stats.correct}</span>
            </div>
            <div className="flex flex-col items-center">
                <span className="text-slate-400 text-xs uppercase tracking-wider">Misses</span>
                <span className="text-rose-400">{stats.incorrect}</span>
            </div>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="w-full max-w-2xl flex-1 flex flex-col">
        
        {status === AppStatus.ERROR && (
           <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-dino-card rounded-2xl border border-rose-900/50">
             <AlertTriangle className="w-16 h-16 text-rose-500 mb-4" />
             <h2 className="text-2xl font-bold mb-2">System Failure</h2>
             <p className="text-slate-400 mb-6">Our satellites couldn't locate a dinosaur. Please try again.</p>
             <button 
                onClick={() => loadNewQuestion(true)}
                className="px-6 py-3 bg-dino-accent hover:bg-emerald-600 text-white font-bold rounded-lg transition-colors"
             >
                Reboot System
             </button>
           </div>
        )}

        {status === AppStatus.LOADING_QUESTION && (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] bg-dino-card rounded-2xl border border-slate-700">
             <Spinner />
          </div>
        )}

        {/* Display Content if Ready, Answered, or Loading Next (keep old content visible) */}
        {(status === AppStatus.READY_TO_ANSWER || status === AppStatus.ANSWERED || (isLoadingNext && questionData)) && questionData && (
          <div className="flex flex-col gap-6 animate-fade-in pb-8">
            {/* Image Card */}
            <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-700 group">
              {imageUrl ? (
                <img 
                    src={imageUrl} 
                    alt="Mystery Dinosaur" 
                    className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-500">
                    <Spinner />
                </div>
              )}
              
              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                <span className="text-xs font-mono text-dino-accent">LIVE FEED: 65 MYA</span>
              </div>
            </div>

            {/* Question Text */}
            <h2 className="text-2xl md:text-3xl font-bold text-center text-white">
                Identify this Specimen
            </h2>

            {/* Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
              {/* Keyboard helper text */}
              <div className="hidden md:block absolute -right-24 top-0 text-slate-600 text-xs">
                 <div className="flex items-center gap-1 mb-2"><Keyboard className="w-3 h-3"/> Shortcuts</div>
              </div>

              {shuffledOptions.map((option, idx) => {
                let btnStyle = "bg-dino-card border-slate-700 hover:border-dino-accent hover:bg-slate-800";
                
                if (status === AppStatus.ANSWERED || isLoadingNext) {
                    if (option === questionData.correctName) {
                        btnStyle = "bg-emerald-900/40 border-emerald-500 text-emerald-100 ring-1 ring-emerald-500";
                    } else if (option === selectedOption && option !== questionData.correctName) {
                        btnStyle = "bg-rose-900/40 border-rose-500 text-rose-100";
                    } else {
                        btnStyle = "bg-dino-card border-slate-800 opacity-50";
                    }
                }

                return (
                    <button
                        key={option}
                        onClick={() => handleAnswer(option)}
                        disabled={status !== AppStatus.READY_TO_ANSWER}
                        className={`group relative p-4 rounded-xl border-2 text-lg font-medium transition-all duration-200 text-left flex justify-between items-center ${btnStyle}`}
                    >
                        <div className="flex items-center gap-3">
                           <span className="hidden md:flex w-6 h-6 rounded bg-slate-800 text-slate-500 text-xs items-center justify-center border border-slate-700 group-hover:border-dino-accent group-hover:text-dino-accent transition-colors">
                              {idx + 1}
                           </span>
                           <span>{option}</span>
                        </div>
                        {(status === AppStatus.ANSWERED || isLoadingNext) && option === questionData.correctName && (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        )}
                        {(status === AppStatus.ANSWERED || isLoadingNext) && option === selectedOption && option !== questionData.correctName && (
                            <XCircle className="w-5 h-5 text-rose-400" />
                        )}
                    </button>
                );
              })}
            </div>

            {/* Answer Reveal / Fact Card */}
            {(status === AppStatus.ANSWERED || isLoadingNext) && (
                <div className="mt-2 bg-slate-800/80 rounded-xl p-6 border border-slate-600 animate-slide-up">
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                        <div>
                            <h3 className={`text-xl font-bold mb-2 ${isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {isCorrect ? "Excellent Work!" : `Incorrect. It was the ${questionData.correctName}.`}
                            </h3>
                            <p className="text-slate-300 leading-relaxed max-w-lg">
                                <span className="text-dino-accent font-bold uppercase text-xs tracking-wider mr-2">Did You Know?</span>
                                {questionData.funFact}
                            </p>
                        </div>
                        <button 
                            onClick={() => loadNewQuestion(false)}
                            disabled={isLoadingNext}
                            className={`w-full md:w-auto px-8 py-3 font-bold rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all ${
                                isLoadingNext 
                                ? 'bg-slate-700 text-slate-400 cursor-wait' 
                                : nextReady 
                                    ? 'bg-dino-accent hover:bg-emerald-500 text-white animate-pulse-soft' 
                                    : 'bg-white text-dino-dark hover:bg-gray-200'
                            }`}
                        >
                            {isLoadingNext ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" /> Locating...
                                </>
                            ) : nextReady ? (
                                <>
                                    Next Specimen (Ready) <Sparkles className="w-4 h-4" />
                                </>
                            ) : (
                                <>
                                    Next Specimen <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </div>
                    <div className="mt-2 text-center md:text-right text-xs text-slate-500">
                        Press <kbd className="bg-slate-700 px-1 rounded">Enter</kbd> to continue
                    </div>
                </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-8 text-slate-600 text-sm">
        Powered by Gemini • Department of Chrono-Genetics
      </footer>
    </div>
  );
};

export default App;