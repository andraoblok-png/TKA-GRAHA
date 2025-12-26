import React, { useState, useEffect, useRef } from 'react';
import { Student, Question, Answer, ExamConfig } from '../types';
import * as Storage from '../services/storage';
import { Clock, CheckCircle, ChevronUp, ChevronDown, GripVertical, Save, BookOpen, Cloud, XCircle, X, AlertTriangle } from './Icons';
import { renderMathText } from './AdminDashboard'; // Import the math renderer

interface StudentExamProps {
  student: Student;
  onFinish: (finalStudent: Student) => void;
  filterSubject: string | null; // New prop for subject filtering
}

export default function StudentExam({ student, onFinish, filterSubject }: StudentExamProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [config] = useState<ExamConfig>(Storage.getExamConfig());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>(student.answers || []);
  const [timeLeft, setTimeLeft] = useState<number>(0); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Auto-save state
  const [lastSaved, setLastSaved] = useState<Date>(new Date());
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  
  // Confirmation Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState<{title: string, body: string, isWarning: boolean} | null>(null);

  // Warning for 1 minute left
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const hasWarnedTime = useRef(false);

  // Use ref to access latest state inside intervals/timeouts without dependencies
  const answersRef = useRef(answers);
  const studentRef = useRef(student);
  
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    studentRef.current = student;
  }, [student]);

  // Initialize Exam
  useEffect(() => {
    let qData = Storage.getQuestions();
    
    // Filter by subject if strictly provided
    if (filterSubject) {
        qData = qData.filter(q => (q.subject || '').toLowerCase() === filterSubject.toLowerCase());
    }

    setQuestions(qData);
    
    // Timer Logic
    const now = Date.now();
    let startTime = student.startTime;
    
    if (!startTime) {
      startTime = now;
      const updatedStudent = { ...student, startTime, status: 'in_progress' as const };
      studentRef.current = updatedStudent;
      Storage.saveStudent(updatedStudent);
    }

    const elapsedSeconds = Math.floor((now - (startTime || now)) / 1000);
    const totalSeconds = config.durationMinutes * 60;
    const remaining = Math.max(0, totalSeconds - elapsedSeconds);
    
    setTimeLeft(remaining);
  }, [config.durationMinutes, filterSubject]); 

  // --- AUTO SAVE FEATURE ---
  useEffect(() => {
    // Save every 60 seconds (1 minute)
    const autoSaveInterval = setInterval(() => {
      if (studentRef.current.status === 'completed') return;

      setIsAutoSaving(true);
      const currentAnswers = answersRef.current;
      const currentStudent = studentRef.current;
      
      // Construct student object to save
      const studentToSave = { ...currentStudent, answers: currentAnswers };
      
      // Persist to local storage
      Storage.saveStudent(studentToSave);
      
      // Update UI indicators
      setLastSaved(new Date());
      
      // Hide "Saving..." indicator after a short delay
      setTimeout(() => setIsAutoSaving(false), 800);
    }, 60000); 

    return () => clearInterval(autoSaveInterval);
  }, []);

  // Core Submit Logic
  const performSubmit = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setShowConfirmModal(false); // Close modal if open
    setShowTimeWarning(false); // Close warning if open

    try {
        const currentAnswers = answersRef.current;
        const currentStudent = studentRef.current;
        const currentQuestions = Storage.getQuestions(); // Fetch fresh to be safe

        // Calculate Score ONLY for the questions in the current exam session (filtered)
        const finalStudent: Student = { 
            ...currentStudent, 
            answers: currentAnswers, 
            status: 'completed' as const 
        };
        
        // Save score
        finalStudent.score = Storage.calculateScore(finalStudent, currentQuestions);
        
        // Save student
        Storage.saveStudent(finalStudent);
        
        // Navigate away
        setTimeout(() => {
            onFinish(finalStudent);
        }, 500);
    } catch (error) {
        console.error("Error submitting exam:", error);
        alert("Terjadi kesalahan saat menyimpan jawaban. Silakan coba lagi.");
        setIsSubmitting(false);
    }
  };

  // Timer Tick
  useEffect(() => {
    if (timeLeft <= 0 && questions.length > 0) {
        // Only auto-submit if not already completed/submitting
        if (studentRef.current.status !== 'completed' && !isSubmitting) {
            performSubmit();
        }
        return;
    }

    // 1 Minute Warning Check
    if (timeLeft === 60 && !hasWarnedTime.current) {
        setShowTimeWarning(true);
        hasWarnedTime.current = true;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
            clearInterval(timer);
            return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, questions.length, isSubmitting]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleAnswerUpdate = (newAns: Answer) => {
    const updatedAnswers = [...answers];
    const idx = updatedAnswers.findIndex(a => a.questionId === newAns.questionId);
    if (idx >= 0) {
      updatedAnswers[idx] = newAns;
    } else {
      updatedAnswers.push(newAns);
    }
    setAnswers(updatedAnswers);
    
    // Also save immediately on interaction for safety
    const updatedStudent = { ...student, answers: updatedAnswers };
    Storage.saveStudent(updatedStudent);
    setLastSaved(new Date());
  };

  // Helper to strictly check if a question is answered
  const checkIsAnswered = (q: Question, currentAnswers: Answer[]) => {
    const ans = currentAnswers.find(a => a.questionId === q.id);
    if (!ans) return false;

    if (q.type === 'multiple_choice' || q.type === 'multi_select') {
        return (ans.selectedOptions && ans.selectedOptions.length > 0);
    }
    if (q.type === 'essay') {
        return (ans.textAnswer && ans.textAnswer.trim().length > 0);
    }
    if (q.type === 'matching') {
        return (ans.pairs && ans.pairs.length > 0);
    }
    if (q.type === 'ordering') {
        return true; 
    }
    return false;
  };

  // Trigger Validation and Show Modal
  const handleFinishClick = () => {
    // 1. Identify Unanswered Questions
    const unansweredIndices = questions
        .map((q, idx) => checkIsAnswered(q, answers) ? -1 : idx + 1)
        .filter(idx => idx !== -1);

    // 2. Construct Message for Modal
    if (unansweredIndices.length > 0) {
        setConfirmMessage({
            title: 'Jawaban Belum Lengkap',
            body: `Kamu belum menjawab ${unansweredIndices.length} soal (No: ${unansweredIndices.slice(0, 5).join(', ')}${unansweredIndices.length > 5 ? '...' : ''}). Yakin ingin selesai? Nilai soal kosong akan 0.`,
            isWarning: true
        });
    } else {
        setConfirmMessage({
            title: 'Konfirmasi Selesai',
            body: 'Apakah kamu yakin ingin mengakhiri ujian ini sekarang? Jawaban tidak bisa diubah lagi setelah ini.',
            isWarning: false
        });
    }
    
    setShowConfirmModal(true);
  };

  if (questions.length === 0) return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500 p-8 text-center">
         <BookOpen size={48} className="mb-4 text-slate-300" />
         <h2 className="text-xl font-bold mb-2">Tidak Ada Soal</h2>
         {filterSubject ? (
            <p>Belum ada soal tersedia untuk mata pelajaran: <b>{filterSubject}</b></p>
         ) : (
            <p>Sedang memuat atau bank soal kosong...</p>
         )}
      </div>
  );

  const currentQ = questions[currentIndex];
  const currentAns = answers.find(a => a.questionId === currentQ.id);

  // Progress Calculation
  const answeredCount = questions.filter(q => checkIsAnswered(q, answers)).length;
  const progressPercentage = questions.length > 0 
    ? (answeredCount / questions.length) * 100 
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans relative">
      
      {/* --- TIME WARNING MODAL --- */}
      {showTimeWarning && (
        <div className="fixed top-4 left-0 right-0 z-[110] flex items-start justify-center p-4 animate-bounce">
            <div className="bg-rose-600 text-white rounded-2xl shadow-2xl p-4 flex items-center gap-4 max-w-md w-full border-2 border-rose-400">
                <div className="bg-white/20 p-2 rounded-full">
                    <AlertTriangle size={24} className="text-white" />
                </div>
                <div className="flex-1">
                    <h4 className="font-bold text-lg">Waktu Segera Habis!</h4>
                    <p className="text-sm text-white/90">Sisa waktu kurang dari 1 menit. Segera periksa dan simpan jawaban Anda.</p>
                </div>
                <button 
                    onClick={() => setShowTimeWarning(false)}
                    className="p-1 hover:bg-white/20 rounded-lg"
                >
                    <X size={20} />
                </button>
            </div>
        </div>
      )}

      {/* --- CONFIRMATION MODAL --- */}
      {showConfirmModal && confirmMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all scale-100 border border-white/20">
                <div className={`p-8 text-center ${confirmMessage.isWarning ? 'bg-gradient-to-b from-orange-50 to-white' : 'bg-gradient-to-b from-blue-50 to-white'}`}>
                    <div className={`mx-auto w-16 h-16 flex items-center justify-center rounded-full mb-4 shadow-sm ${confirmMessage.isWarning ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                        {confirmMessage.isWarning ? <XCircle size={32}/> : <CheckCircle size={32}/>}
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">{confirmMessage.title}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">{confirmMessage.body}</p>
                </div>
                <div className="p-6 bg-white border-t border-slate-100 flex gap-4">
                    <button 
                        onClick={() => setShowConfirmModal(false)}
                        className="flex-1 py-3.5 px-4 bg-white border border-slate-300 rounded-xl text-slate-700 font-bold hover:bg-slate-50 transition"
                    >
                        Batal
                    </button>
                    <button 
                        onClick={performSubmit}
                        className={`flex-1 py-3.5 px-4 rounded-xl text-white font-bold shadow-lg transition transform hover:scale-[1.02] ${confirmMessage.isWarning ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-500/30' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30'}`}
                    >
                        Ya, Selesai
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Header / Timer */}
      <header className="bg-white shadow-sm sticky top-0 z-30 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between gap-4">
          
          {/* Title Area */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
             <div className="flex flex-col justify-center min-w-0 border-l-4 border-indigo-600 pl-4 py-1">
                  <h1 className="font-black text-slate-800 text-xl leading-none tracking-tight">GRAHA EDUKASI</h1>
                  <p className="text-[10px] text-indigo-500 font-bold tracking-[0.25em] uppercase mt-1">TRY OUT TKA SD</p>
             </div>

            {/* Subject Indicator */}
            {filterSubject && (
                <div className="hidden md:flex items-center px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100 ml-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider">SESI: {filterSubject}</span>
                </div>
            )}

             {/* Auto Save Indicator */}
             <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 ml-6 border-l pl-6 h-8">
                <Cloud size={16} className={isAutoSaving ? 'animate-bounce text-indigo-500' : ''} />
                <div className="flex flex-col leading-none">
                  <span className="font-bold text-slate-500">
                    {isAutoSaving ? 'Menyimpan...' : 'Tersimpan Otomatis'}
                  </span>
                  <span className="text-[10px] mt-0.5">
                    {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
             </div>
          </div>

          {/* Timer & Action */}
          <div className="flex items-center gap-4 shrink-0">
            {/* Student Name - Desktop only */}
            <div className="hidden md:flex flex-col items-end mr-2 text-right">
                <span className="text-sm font-bold text-slate-700">{student.name}</span>
                <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded tracking-wider">{student.code}</span>
            </div>
            
            <div className="h-10 w-px bg-slate-100 hidden md:block"></div>

            <div className={`flex items-center gap-2 font-mono text-xl font-bold px-4 py-2 rounded-xl transition-all shadow-sm ${timeLeft < 300 ? 'bg-rose-600 text-white animate-pulse shadow-rose-500/30' : 'bg-slate-50 text-slate-700 border border-slate-200'}`}>
                <Clock size={20} className={timeLeft < 300 ? 'text-white' : 'text-slate-400'} />
                <span>{formatTime(timeLeft)}</span>
            </div>
            
            <button 
                onClick={handleFinishClick}
                disabled={isSubmitting}
                className={`bg-indigo-600 text-white px-6 py-2.5 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 hover:shadow-xl transition-all transform hover:-translate-y-0.5 font-bold text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1`}
                title="Selesaikan Ujian Sekarang"
            >
                {isSubmitting ? 'Memproses...' : (
                    <>
                    <CheckCircle size={18} />
                    <span className="hidden sm:inline">SELESAI</span>
                    </>
                )}
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 w-full h-1.5 bg-slate-100">
           <div 
             className="h-full bg-indigo-500 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]"
             style={{ width: `${progressPercentage}%` }}
           />
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Question Area */}
        <main className="lg:col-span-3">
          <div className="bg-white rounded-3xl shadow-xl p-8 min-h-[600px] flex flex-col border border-slate-100 relative">
            
            {/* Subject Tag */}
            {currentQ.subject && (
                <div className="absolute top-6 right-6">
                    <span className="bg-slate-50 border border-slate-200 text-slate-500 text-[10px] px-3 py-1.5 rounded-full font-bold uppercase tracking-wider">
                        {currentQ.subject}
                    </span>
                </div>
            )}

            <div className="flex justify-between items-start mb-8 border-b border-slate-100 pb-6">
              <div>
                <span className="text-xs font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-lg">Soal No. {currentIndex + 1}</span>
                <div className="mt-4 text-xl text-slate-800 leading-relaxed font-semibold whitespace-pre-line">
                  {renderMathText(currentQ.text)}
                </div>
                {/* Question Image */}
                {currentQ.imageUrl && (
                    <div className="mt-6">
                        <img src={currentQ.imageUrl} alt="Soal" className="max-h-72 rounded-2xl border border-slate-100 shadow-sm" />
                    </div>
                )}
              </div>
              <span className="bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold px-3 py-1 rounded-lg whitespace-nowrap ml-4 h-fit mt-1">
                {currentQ.points} Poin
              </span>
            </div>

            <div className="flex-1">
              <QuestionRenderer 
                question={currentQ} 
                answer={currentAns} 
                onAnswer={(ans) => handleAnswerUpdate({ ...ans, questionId: currentQ.id })} 
              />
            </div>

            <div className="flex justify-between items-center mt-10 pt-8 border-t border-slate-100">
              <button 
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex(p => p - 1)}
                className="px-8 py-3 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 font-bold transition-all hover:-translate-y-0.5 shadow-sm"
              >
                Sebelumnya
              </button>
              
              {currentIndex === questions.length - 1 ? (
                <button 
                  onClick={handleFinishClick}
                  disabled={isSubmitting}
                  className="px-8 py-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-600/20 transition-transform transform hover:scale-105 disabled:bg-slate-400 disabled:transform-none flex items-center gap-2"
                >
                  <CheckCircle size={20} />
                  {isSubmitting ? 'Menyimpan...' : 'Selesai Ujian'}
                </button>
              ) : (
                <button 
                  onClick={() => setCurrentIndex(p => p + 1)}
                  className="px-8 py-3 rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 font-bold transition-all hover:-translate-y-0.5 shadow-lg shadow-slate-900/20"
                >
                  Selanjutnya
                </button>
              )}
            </div>
          </div>
        </main>

        {/* Sidebar Navigation */}
        <aside className="hidden lg:block">
           <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden sticky top-28">
             <div className="p-5 bg-white border-b border-slate-100 flex justify-between items-center">
                 <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <BookOpen size={18} className="text-indigo-600"/> Navigasi Soal
                 </h3>
                 <span className="text-xs font-bold bg-slate-100 px-2.5 py-1 rounded-lg text-slate-600">
                    {answeredCount} / {questions.length}
                 </span>
             </div>

             <div className="p-5 max-h-[50vh] overflow-y-auto">
               <div className="grid grid-cols-5 gap-2.5">
                 {questions.map((q, idx) => {
                   const isAnswered = checkIsAnswered(q, answers);
                   const isActive = idx === currentIndex;
                   
                   let btnClass = "h-10 rounded-xl font-bold text-sm transition-all duration-200 relative flex items-center justify-center border ";
                   
                   if (isActive) {
                       // Active State
                       btnClass += " ring-4 ring-indigo-100 border-indigo-600 z-10 transform scale-110 shadow-md ";
                       if (isAnswered) {
                           btnClass += " bg-indigo-600 text-white";
                       } else {
                           btnClass += " bg-white text-indigo-600";
                       }
                   } else {
                       // Inactive State
                       if (isAnswered) {
                           btnClass += " bg-indigo-500 text-white border-indigo-500 shadow-sm hover:bg-indigo-600 hover:border-indigo-600";
                       } else {
                           btnClass += " bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700 hover:border-slate-300";
                       }
                   }

                   return (
                     <button
                       key={q.id}
                       onClick={() => setCurrentIndex(idx)}
                       className={btnClass}
                       title={`Soal ${idx+1} (${isAnswered ? 'Sudah dijawab' : 'Belum dijawab'})`}
                     >
                       {idx + 1}
                       {isActive && !isAnswered && <div className="absolute -bottom-1 w-1.5 h-1.5 bg-indigo-600 rounded-full"></div>}
                     </button>
                   )
                 })}
               </div>
             </div>

             {/* Legend */}
             <div className="p-5 bg-slate-50/50 border-t border-slate-100 text-xs space-y-2">
               <div className="flex items-center gap-3">
                 <div className="w-5 h-5 rounded-md bg-indigo-500 border border-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shadow-sm">✓</div>
                 <span className="text-slate-600 font-medium">Sudah Dijawab</span>
               </div>
               <div className="flex items-center gap-3">
                 <div className="w-5 h-5 rounded-md bg-white border border-indigo-500 text-indigo-600 flex items-center justify-center text-[10px] ring-2 ring-indigo-100 font-bold">●</div>
                 <span className="text-slate-600 font-medium">Sedang Dikerjakan</span>
               </div>
               <div className="flex items-center gap-3">
                 <div className="w-5 h-5 rounded-md bg-white border border-slate-300 shadow-sm"></div>
                 <span className="text-slate-600 font-medium">Belum Dijawab</span>
               </div>
             </div>

             {/* Sidebar Finish Action */}
             <div className="p-5 border-t border-slate-100">
                <button 
                  onClick={handleFinishClick}
                  disabled={isSubmitting}
                  className="w-full bg-white text-indigo-600 border-2 border-indigo-100 py-3 rounded-xl hover:bg-indigo-50 font-bold shadow-sm transition-colors text-sm disabled:bg-white disabled:text-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? 'Memproses...' : (
                    <>
                      <CheckCircle size={16} /> Selesai Ujian
                    </>
                  )}
                </button>
             </div>
           </div>
        </aside>
      </div>
    </div>
  );
}

// --- Question Type Renderers ---

function QuestionRenderer({ question, answer, onAnswer }: { question: Question, answer?: Answer, onAnswer: (a: Partial<Answer>) => void }) {
  
  if (question.type === 'multiple_choice') {
    return (
      <div className="space-y-4">
        {question.options?.map((opt, idx) => (
          <label key={idx} className={`flex items-center p-5 border-2 rounded-2xl cursor-pointer transition-all duration-200 group ${answer?.selectedOptions?.[0] === idx ? 'bg-indigo-50 border-indigo-600 shadow-md transform scale-[1.01]' : 'bg-white border-slate-100 hover:border-indigo-200 hover:bg-slate-50 hover:shadow-sm'}`}>
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-4 shrink-0 transition-colors ${answer?.selectedOptions?.[0] === idx ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white group-hover:border-indigo-400'}`}>
                {answer?.selectedOptions?.[0] === idx && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
            </div>
            <input 
              type="radio" 
              name={`q-${question.id}`} 
              className="hidden"
              checked={answer?.selectedOptions?.[0] === idx}
              onChange={() => onAnswer({ selectedOptions: [idx] })}
            />
            <span className={`text-lg ${answer?.selectedOptions?.[0] === idx ? 'font-bold text-indigo-900' : 'text-slate-700'}`}>{opt}</span>
          </label>
        ))}
      </div>
    );
  }

  if (question.type === 'multi_select') {
    return (
      <div className="space-y-4">
        {question.options?.map((opt, idx) => {
          const isSelected = answer?.selectedOptions?.includes(idx);
          return (
            <label key={idx} className={`flex items-center p-5 border-2 rounded-2xl cursor-pointer transition-all duration-200 group ${isSelected ? 'bg-indigo-50 border-indigo-600 shadow-md transform scale-[1.01]' : 'bg-white border-slate-100 hover:border-indigo-200 hover:bg-slate-50 hover:shadow-sm'}`}>
              <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center mr-4 shrink-0 transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white group-hover:border-indigo-400'}`}>
                 {isSelected && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
              </div>
              <input 
                type="checkbox" 
                className="hidden"
                checked={!!isSelected}
                onChange={() => {
                  const current = answer?.selectedOptions || [];
                  const newOpts = current.includes(idx) ? current.filter(i => i !== idx) : [...current, idx];
                  onAnswer({ selectedOptions: newOpts });
                }}
              />
              <span className={`text-lg ${isSelected ? 'font-bold text-indigo-900' : 'text-slate-700'}`}>{opt}</span>
            </label>
          )
        })}
      </div>
    );
  }

  if (question.type === 'ordering') {
    // Current user order or initial default order (indices 0..n)
    const currentOrder = answer?.orderSequence || question.orderItems?.map((_, i) => i) || [];
    
    // Helper to move item
    const move = (fromIdx: number, dir: -1 | 1) => {
        const newOrder = [...currentOrder];
        const toIdx = fromIdx + dir;
        if (toIdx < 0 || toIdx >= newOrder.length) return;
        [newOrder[fromIdx], newOrder[toIdx]] = [newOrder[toIdx], newOrder[fromIdx]];
        onAnswer({ orderSequence: newOrder });
    };

    return (
      <div className="space-y-3">
        <p className="text-sm font-bold text-slate-500 mb-4 bg-slate-50 inline-block px-3 py-1 rounded-lg">Klik panah untuk mengurutkan:</p>
        {currentOrder.map((itemIndex, displayIndex) => (
          <div key={itemIndex} className="flex items-center gap-4 bg-white border-2 border-slate-100 p-4 rounded-xl shadow-sm hover:shadow-md transition-all group hover:border-indigo-200">
             <div className="flex flex-col gap-1">
                <button onClick={() => move(displayIndex, -1)} disabled={displayIndex === 0} className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 flex items-center justify-center transition disabled:opacity-30"><ChevronUp size={18}/></button>
                <button onClick={() => move(displayIndex, 1)} disabled={displayIndex === currentOrder.length-1} className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 flex items-center justify-center transition disabled:opacity-30"><ChevronDown size={18}/></button>
             </div>
             <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black text-lg border border-slate-200">
                {displayIndex + 1}
             </div>
             <div className="flex-1 font-bold text-slate-700 text-lg">
               {question.orderItems?.[itemIndex]}
             </div>
             <div className="text-slate-300 group-hover:text-indigo-400 cursor-grab"><GripVertical size={24}/></div>
          </div>
        ))}
      </div>
    );
  }

  if (question.type === 'matching') {
    // Basic matching UI: Select Left, Select Right, Add Pair
    const pairs = answer?.pairs || [];
    
    // We render the fixed left side, and a dropdown for the right side for each row
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6">
            {question.matches?.map((m, idx) => {
               // find if there is a pair for this left index (idx)
               const currentPair = pairs.find(p => p.leftIndex === idx);
               const currentRightIndex = currentPair ? currentPair.rightIndex : -1;

               return (
                 <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-6 border-2 border-slate-100 rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex-1 font-bold text-lg text-slate-800">{m.left}</div>
                    <div className="text-slate-300 hidden sm:block"><ChevronDown size={24} className="-rotate-90"/></div>
                    <div className="flex-1 w-full sm:w-auto relative">
                      <select 
                        className={`w-full p-4 border-2 rounded-xl cursor-pointer focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none text-slate-800 appearance-none font-medium transition-colors ${currentRightIndex !== -1 ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-bold' : 'bg-white border-slate-200'}`}
                        value={currentRightIndex}
                        onChange={(e) => {
                           const val = Number(e.target.value);
                           let newPairs = pairs.filter(p => p.leftIndex !== idx); // remove old pair for this row
                           if (val !== -1) {
                             newPairs.push({ leftIndex: idx, rightIndex: val });
                           }
                           onAnswer({ pairs: newPairs });
                        }}
                      >
                        <option value={-1} className="text-slate-400">-- Pilih Pasangan --</option>
                        {question.matches?.map((rm, rIdx) => (
                           <option key={rIdx} value={rIdx}>{rm.right}</option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                          <ChevronDown size={16} />
                      </div>
                    </div>
                 </div>
               )
            })}
        </div>
      </div>
    );
  }

  if (question.type === 'essay') {
    return (
      <div>
        <textarea
          className="w-full h-56 p-6 border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none resize-none text-slate-800 bg-white text-lg leading-relaxed shadow-inner"
          placeholder="Tulis jawaban Anda di sini..."
          value={answer?.textAnswer || ''}
          onChange={(e) => onAnswer({ textAnswer: e.target.value })}
        />
        <div className="flex justify-end mt-2">
            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">{answer?.textAnswer?.length || 0} karakter</span>
        </div>
      </div>
    );
  }

  return <div>Tipe soal tidak dikenal</div>;
}