import React, { useState, useEffect } from 'react';
import AdminDashboard, { renderMathText } from './components/AdminDashboard';
import StudentExam from './components/StudentExam';
import { Student, Question, Answer } from './types';
import * as Storage from './services/storage';
import { BookOpen, CheckCircle, XCircle, ChevronDown, ChevronUp, LogOut, Users, Play, Award, Mail, Lock } from './components/Icons';

type View = 'login' | 'admin' | 'exam' | 'result' | 'confirm_bio';

export default function App() {
  const [view, setView] = useState<View>('login');
  const [currentUser, setCurrentUser] = useState<Student | null>(null);
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  
  // Login Form State
  const [code, setCode] = useState('');
  
  // Admin Login State
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPass, setAdminPass] = useState('');
  
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [error, setError] = useState('');

  // Active Schedule State for Login Display
  const [activeScheduleInfo, setActiveScheduleInfo] = useState<{subject: string, end: string} | null>(null);

  // Check for active schedules periodically
  useEffect(() => {
    const checkSchedule = () => {
        const config = Storage.getExamConfig();
        const now = new Date();
        const currentTime = now.getTime();
        
        let found = null;
        if (config.subjectSchedules && config.subjectSchedules.length > 0) {
            found = config.subjectSchedules.find(sch => {
                const start = new Date(sch.scheduledStart).getTime();
                const end = new Date(sch.scheduledEnd).getTime();
                return currentTime >= start && currentTime <= end;
            });
        }
        
        if (found) {
            setActiveScheduleInfo({
                subject: found.subject,
                end: found.scheduledEnd
            });
        } else {
            setActiveScheduleInfo(null);
        }
    };
    
    checkSchedule();
    const interval = setInterval(checkSchedule, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, []);

  const handleStudentLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const students = Storage.getStudents();
    const config = Storage.getExamConfig();
    const student = students.find(s => s.code === code.trim().toUpperCase());
    
    if (!student) {
      setError('Kode peserta tidak ditemukan.');
      return;
    }

    const now = new Date();
    const currentTime = now.getTime();
    let isLoginAllowed = false;
    let foundSpecificSubject = null;

    // --- CHECK 1: Specific Subject Schedules ---
    if (config.subjectSchedules && config.subjectSchedules.length > 0) {
        const activeSchedules = config.subjectSchedules.filter(sch => {
            const start = new Date(sch.scheduledStart).getTime();
            const end = new Date(sch.scheduledEnd).getTime();
            return currentTime >= start && currentTime <= end;
        });

        if (activeSchedules.length > 0) {
            isLoginAllowed = true;
            foundSpecificSubject = activeSchedules[0].subject;
        } else {
             setError(`Tidak ada sesi ujian mata pelajaran yang aktif saat ini.`);
        }
    } else {
        // --- CHECK 2: Global Schedule (Fallback) ---
        let globalStartOk = true;
        let globalEndOk = true;

        if (config.scheduledStart) {
            const startTime = new Date(config.scheduledStart).getTime();
            if (currentTime < startTime) {
                globalStartOk = false;
                setError(`Ujian belum dibuka. Jadwal mulai: ${new Date(config.scheduledStart).toLocaleString('id-ID')}`);
            }
        }

        if (config.scheduledEnd && student.status !== 'completed') {
            const endTime = new Date(config.scheduledEnd).getTime();
            if (currentTime > endTime) {
                globalEndOk = false;
                setError(`Ujian telah berakhir pada: ${new Date(config.scheduledEnd).toLocaleString('id-ID')}`);
            }
        }

        if (globalStartOk && globalEndOk) {
            isLoginAllowed = true;
        }
    }

    if (!isLoginAllowed && !error) {
        setError('Ujian tidak tersedia saat ini.');
        return;
    }

    if (!isLoginAllowed) return; // Error is already set above

    // --- Login Success Logic ---
    setActiveSubject(foundSpecificSubject);
    setCurrentUser(student);
    
    if (student.status === 'completed') {
      setView('result');
    } else {
      // Logic Change: Go to confirmation first before exam
      setView('confirm_bio');
    }
  };

  const startExamFromBio = () => {
    setView('exam');
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // PASSWORD AND EMAIL UPDATED HERE
    if (adminEmail === 'dewigita67@gmail.com' && adminPass === 'Grahaedukasi67') {
      setView('admin');
      setError('');
    } else {
      setError('Email atau Password salah.');
    }
  };

  const handleFinishExam = (finishedStudent: Student) => {
    setCurrentUser(finishedStudent);
    setView('result');
  };

  if (view === 'admin') {
    return <AdminDashboard onLogout={() => setView('login')} />;
  }

  if (view === 'confirm_bio' && currentUser) {
      return <StudentBioConfirmation student={currentUser} onStart={startExamFromBio} onBack={() => setView('login')} />;
  }

  if (view === 'exam' && currentUser) {
    return <StudentExam student={currentUser} onFinish={handleFinishExam} filterSubject={activeSubject} />;
  }

  if (view === 'result' && currentUser) {
    return <StudentResult student={currentUser} onHome={() => setView('login')} filterSubject={activeSubject} />;
  }

  // Login View
  return (
    <div className="min-h-screen flex font-sans bg-slate-50">
      {/* Left Side - Brand with Gradient */}
      <div className="hidden lg:flex w-5/12 bg-gradient-to-br from-indigo-900 via-blue-800 to-sky-900 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        {/* Abstract shapes */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-white opacity-5 rounded-full blur-2xl"></div>
        <div className="absolute bottom-10 right-10 w-64 h-64 bg-sky-400 opacity-10 rounded-full blur-3xl"></div>

        <div className="relative z-10 text-center text-white flex flex-col items-center">
          <div className="mb-10 p-6 bg-white/10 backdrop-blur-sm rounded-3xl border border-white/20 shadow-2xl">
             <LogoOrIcon size="large" color="light" />
          </div>
          <div className="w-20 h-1.5 bg-sky-400 mb-8 rounded-full"></div>
          <p className="text-sky-100 text-lg max-w-md leading-relaxed font-light tracking-wide">
            Platform ujian berbasis komputer terintegrasi untuk mengasah kemampuan akademik dan meraih prestasi gemilang.
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-7/12 flex items-center justify-center p-6 md:p-12 relative">
        <div className="absolute top-0 right-0 p-4">
            <span className="text-xs font-semibold text-slate-300">v2.5.0</span>
        </div>

        <div className="max-w-md w-full">
          {/* Logo above login for Mobile/Tablet */}
          <div className="text-center mb-8 lg:hidden flex flex-col items-center">
             <div className="bg-indigo-900 p-3 rounded-xl shadow-lg">
                <LogoOrIcon size="medium" color="light" />
             </div>
          </div>

          <div className="bg-white p-8 md:p-10 rounded-[2rem] shadow-2xl border border-slate-100 relative overflow-hidden">
            {/* Top accent line */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-sky-500"></div>

            <h2 className="text-2xl font-bold text-slate-800 mb-2">Selamat Datang</h2>
            <p className="text-slate-500 mb-8 text-sm">Silakan masuk untuk melanjutkan.</p>

            <div className="flex gap-2 mb-8 p-1.5 bg-slate-100 rounded-xl">
              <button 
                onClick={() => { setIsAdminLogin(false); setError(''); }}
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-200 ${!isAdminLogin ? 'bg-white text-indigo-700 shadow-md transform scale-[1.02]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
              >
                Peserta Ujian
              </button>
              <button 
                onClick={() => { setIsAdminLogin(true); setError(''); }}
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-200 ${isAdminLogin ? 'bg-white text-indigo-700 shadow-md transform scale-[1.02]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
              >
                Administrator
              </button>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl flex items-start gap-3 animate-fade-in-down">
                 <XCircle size={20} className="shrink-0 mt-0.5" />
                 <span className="font-medium">{error}</span>
              </div>
            )}

            {isAdminLogin ? (
              <form onSubmit={handleAdminLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Email Admin</label>
                  <div className="relative">
                    <input 
                        type="email" 
                        value={adminEmail}
                        onChange={e => setAdminEmail(e.target.value)}
                        className="w-full px-5 py-3.5 pl-12 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400"
                        placeholder="contoh@email.com"
                    />
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400">
                        <Mail size={20} />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Password</label>
                  <div className="relative">
                    <input 
                        type="password" 
                        value={adminPass}
                        onChange={e => setAdminPass(e.target.value)}
                        className="w-full px-5 py-3.5 pl-12 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400"
                        placeholder="Masukkan kata sandi..."
                    />
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400">
                        <Lock size={20} />
                    </div>
                  </div>
                  <div className="flex justify-end mt-2">
                      <a 
                        href="mailto:dewigita67@gmail.com?subject=Permintaan%20Reset%20Password%20CBT&body=Halo%2C%20saya%20lupa%20password%20admin%20Graha%20Edukasi.%20Mohon%20bantuannya." 
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                          Lupa Password?
                      </a>
                  </div>
                </div>
                <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all transform hover:translate-y-[-2px] hover:shadow-lg shadow-indigo-500/30 flex justify-center items-center gap-2 mt-2">
                  <LogOut size={20} /> Masuk Dashboard
                </button>
              </form>
            ) : (
              <form onSubmit={handleStudentLogin} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Kode Akses Ujian</label>
                  <div className="relative">
                    <input 
                        type="text" 
                        value={code}
                        onChange={e => setCode(e.target.value)}
                        className="w-full px-5 py-3.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-sky-100 focus:border-sky-500 outline-none transition-all uppercase tracking-widest font-mono text-center text-xl placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400 bg-white text-slate-900"
                        placeholder="KODE-123"
                    />
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400">
                        <Users size={20} />
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 text-center">Kode unik diberikan oleh pengawas ujian.</p>

                  {/* Active Schedule Information */}
                  {activeScheduleInfo && (
                      <div className="mt-6 bg-sky-50 border border-sky-100 rounded-xl p-4 text-center">
                          <div className="flex justify-center mb-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-100 text-sky-700 uppercase tracking-wider border border-sky-200">
                                <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                                </span>
                                SESI AKTIF
                            </span>
                          </div>
                          <p className="text-lg font-bold text-slate-800">{activeScheduleInfo.subject}</p>
                          <p className="text-xs text-slate-500 mt-1 font-medium">
                              Berakhir: {new Date(activeScheduleInfo.end).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                      </div>
                  )}
                </div>
                <button type="submit" className="w-full py-4 bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold rounded-xl hover:from-sky-600 hover:to-indigo-700 transition-all transform hover:translate-y-[-2px] hover:shadow-lg shadow-sky-500/30 flex justify-center items-center gap-2">
                  <Play size={20} fill="currentColor" /> Mulai Ujian
                </button>
              </form>
            )}
          </div>
          
          <p className="mt-10 text-center text-sm text-slate-400">
            &copy; {new Date().getFullYear()} Graha Edukasi Platform.
          </p>
        </div>
      </div>
    </div>
  );
}

// --- Logo Helper Component (Text Version) ---
function LogoOrIcon({ size = 'medium', color = 'light' }: { size?: 'small'|'medium'|'large', color?: 'light'|'dark' }) {
    const titleColor = color === 'light' ? 'text-white' : 'text-slate-800';
    const subTitleColor = color === 'light' ? 'text-sky-300' : 'text-sky-600';
    const titleSize = size === 'large' ? 'text-5xl' : size === 'medium' ? 'text-2xl' : 'text-lg';
    const subSize = size === 'large' ? 'text-lg' : size === 'medium' ? 'text-xs' : 'text-[10px]';
    const gap = size === 'large' ? 'gap-3' : 'gap-1';

    return (
        <div className={`flex flex-col items-center justify-center ${gap}`}>
            <h1 className={`${titleSize} font-black tracking-tight ${titleColor} leading-none text-center`}>
                GRAHA EDUKASI
            </h1>
            <p className={`${subSize} font-bold tracking-[0.3em] uppercase ${subTitleColor} text-center`}>
                TRY OUT TKA SD
            </p>
        </div>
    );
}

// --- Student Bio Confirmation ---
function StudentBioConfirmation({ student, onStart, onBack }: { student: Student, onStart: () => void, onBack: () => void }) {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
            <div className="bg-white max-w-lg w-full rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100">
                <div className="bg-gradient-to-r from-indigo-900 to-slate-900 p-8 text-white text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-10 -mt-10 blur-xl"></div>
                    <h2 className="text-2xl font-bold mb-2 relative z-10">Konfirmasi Peserta</h2>
                    <p className="text-indigo-200 text-sm relative z-10">Mohon periksa data diri Anda dengan teliti.</p>
                </div>
                
                <div className="p-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-5 p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 shrink-0">
                                <Users size={28} />
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Nama Lengkap</p>
                                <p className="text-lg font-bold text-slate-800 leading-tight">{student.name}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-5 p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-14 h-14 bg-sky-50 rounded-full flex items-center justify-center text-sky-600 shrink-0">
                                <BookOpen size={28} />
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Kelas</p>
                                <p className="text-lg font-bold text-slate-800 leading-tight">{student.className}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-5 p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 shrink-0">
                                <span className="text-2xl">🏫</span>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Asal Sekolah</p>
                                <p className="text-lg font-bold text-slate-800 leading-tight">{student.school || '-'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-10 space-y-4">
                        <button 
                            onClick={onStart}
                            className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white py-4 rounded-xl font-bold text-lg hover:from-emerald-600 hover:to-green-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 transform hover:translate-y-[-2px]"
                        >
                            <CheckCircle size={20} className="text-white" /> DATA BENAR, MULAI
                        </button>
                        <button 
                            onClick={onBack}
                            className="w-full bg-white text-slate-500 py-3.5 rounded-xl font-bold hover:bg-slate-50 transition border border-slate-200"
                        >
                            Bukan Saya, Kembali
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- Student Result Component ---
function StudentResult({ student, onHome, filterSubject }: { student: Student, onHome: () => void, filterSubject: string | null }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  let questions = Storage.getQuestions();

  // Filter questions to only show relevant subject if applicable
  if (filterSubject) {
      questions = questions.filter(q => (q.subject || '').toLowerCase() === filterSubject.toLowerCase());
  }

  let motivation = "";
  let motivationColor = "";
  let scoreColor = "";
  
  if (student.score === 100) {
    motivation = "Luar Biasa! Sempurna!";
    motivationColor = "bg-purple-50 text-purple-700 border-purple-200";
    scoreColor = "text-purple-600";
  } else if (student.score >= 80) {
    motivation = "Kerja Bagus! Pertahankan!";
    motivationColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
    scoreColor = "text-emerald-600";
  } else if (student.score >= 60) {
    motivation = "Cukup Baik. Tingkatkan lagi.";
    motivationColor = "bg-amber-50 text-amber-700 border-amber-200";
    scoreColor = "text-amber-600";
  } else {
    motivation = "Jangan Menyerah. Ayo belajar lagi!";
    motivationColor = "bg-rose-50 text-rose-700 border-rose-200";
    scoreColor = "text-rose-600";
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-6 font-sans">
      <div className="max-w-4xl w-full space-y-8">
        
        {/* Header Card */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 relative">
          <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
          
          <div className="p-8 md:p-12 text-center">
             <div className="mb-6 inline-block bg-slate-100 p-3 rounded-2xl">
                <Award size={48} className={scoreColor} />
             </div>
             
             <h2 className="text-3xl font-black text-slate-800 mb-2">Hasil Ujian Anda</h2>
             <p className="text-slate-500 mb-10 text-lg">Terima kasih telah mengerjakan ujian dengan jujur.</p>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
               {/* Score Card */}
               <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-lg flex flex-col items-center justify-center relative overflow-hidden group hover:border-indigo-100 transition-colors">
                  <div className={`absolute inset-0 opacity-5 bg-gradient-to-br ${scoreColor.includes('purple') ? 'from-purple-500 to-indigo-500' : 'from-slate-200 to-slate-300'}`}></div>
                  <p className="text-xs text-slate-400 uppercase tracking-[0.2em] font-bold mb-3 z-10">Skor Akhir</p>
                  <div className={`text-7xl font-black tracking-tighter z-10 ${scoreColor} drop-shadow-sm`}>
                      {student.score}
                  </div>
                  {filterSubject && <span className="mt-3 px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full uppercase tracking-wide z-10">{filterSubject}</span>}
               </div>

               {/* Motivation Card */}
               <div className={`rounded-2xl p-8 border flex flex-col items-center justify-center text-center shadow-sm ${motivationColor}`}>
                  <p className="font-bold text-xl italic leading-relaxed">"{motivation}"</p>
                  <div className="mt-4 flex gap-1">
                      {[...Array(5)].map((_, i) => (
                          <div key={i} className={`w-2 h-2 rounded-full ${i < (student.score/20) ? 'bg-current opacity-80' : 'bg-gray-300'}`}></div>
                      ))}
                  </div>
               </div>
             </div>

             <button onClick={onHome} className="inline-flex items-center gap-2 px-10 py-4 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-bold shadow-xl transform hover:translate-y-[-2px]">
               <LogOut size={20} /> KELUAR / HALAMAN UTAMA
             </button>
          </div>
        </div>

        {/* Analysis Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
             <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <CheckCircle size={20}/> 
                </div>
                Analisis Jawaban
             </h3>
             <span className="text-sm font-semibold text-slate-500 bg-white px-3 py-1 rounded-lg shadow-sm border border-slate-100">
                 Total Soal: {questions.length}
             </span>
          </div>

          <div className="space-y-4">
          {questions.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-2xl shadow-sm border border-slate-100">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                      <BookOpen size={32}/>
                  </div>
                  <p className="text-slate-500 font-medium">Tidak ada soal untuk mata pelajaran ini.</p>
              </div>
          ) : (
            questions.map((q, idx) => {
                const answer = student.answers.find(a => a.questionId === q.id) || { questionId: q.id };
                const pointsEarned = Storage.evaluateAnswer(q, answer);
                const isFullPoints = pointsEarned === q.points;
                const isZeroPoints = pointsEarned === 0;
                
                // Logic to display summary answer text
                const renderSummaryAnswer = () => {
                if (q.type === 'multiple_choice') {
                    const optIdx = answer.selectedOptions?.[0];
                    return optIdx !== undefined ? q.options?.[optIdx] : 'Tidak menjawab';
                }
                if (q.type === 'multi_select') {
                    if (!answer.selectedOptions?.length) return 'Tidak menjawab';
                    const labels = answer.selectedOptions.map(idx => q.options?.[idx]).join(', ');
                    return labels.length > 40 ? labels.substring(0, 40) + '...' : labels;
                }
                if (q.type === 'essay') {
                    if (answer.textAnswer) {
                        return answer.textAnswer.length > 50 ? answer.textAnswer.substring(0, 50) + '...' : answer.textAnswer;
                    }
                    return 'Tidak menjawab';
                }
                if (q.type === 'ordering') {
                    if (!answer.orderSequence) return 'Belum diurutkan';
                    const isCorrect = answer.orderSequence.every((val, index) => val === index);
                    return isCorrect ? 'Urutan Benar' : 'Urutan Salah';
                }
                if (q.type === 'matching') {
                    return `${answer.pairs?.length || 0} dari ${q.matches?.length || 0} pasangan`;
                }
                return '-';
                };

                return (
                <div key={q.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all duration-300 ${
                    isFullPoints ? 'border-emerald-100 hover:shadow-emerald-100/50' : isZeroPoints ? 'border-rose-100 hover:shadow-rose-100/50' : 'border-amber-100 hover:shadow-amber-100/50'
                } hover:shadow-md`}>
                    <div 
                    className="p-6 flex items-start justify-between cursor-pointer group"
                    onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                    >
                    <div className="flex-1 pr-6">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-600 font-bold text-sm">
                                {idx + 1}
                            </span>
                            <div className="flex gap-2">
                                <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-slate-50 border border-slate-100 text-slate-500 uppercase tracking-wide">{q.subject || 'Umum'}</span>
                                <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-slate-50 border border-slate-100 text-slate-500 uppercase tracking-wide">{q.type.replace('_', ' ')}</span>
                            </div>
                        </div>
                        <p className="font-medium text-slate-800 line-clamp-2 text-lg leading-snug">{renderMathText(q.text)}</p>
                        
                        <div className="mt-3 flex gap-2 items-center">
                            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Jawaban Anda:</span>
                            <span className={`font-semibold text-sm ${isFullPoints ? 'text-emerald-600' : isZeroPoints ? 'text-rose-600' : 'text-amber-600'}`}>
                                {renderSummaryAnswer()}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-3 shrink-0">
                        <div className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold border ${
                        isFullPoints ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                        isZeroPoints ? 'bg-rose-50 text-rose-700 border-rose-200' : 
                        'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                        {isFullPoints ? <CheckCircle size={16}/> : <XCircle size={16}/>}
                        {pointsEarned} / {q.points}
                        </div>
                        <button className="text-slate-300 group-hover:text-indigo-500 transition-colors">
                        {expandedId === q.id ? <ChevronUp size={24}/> : <ChevronDown size={24}/>}
                        </button>
                    </div>
                    </div>

                    {/* Expanded Details - Improved Comparison */}
                    {expandedId === q.id && (
                    <div className="px-6 pb-6 pt-2 bg-white border-t border-slate-50">
                        
                        {/* ORDERING COMPARISON */}
                        {q.type === 'ordering' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <p className="font-bold text-slate-700 mb-3 text-sm uppercase tracking-wide border-b border-slate-200 pb-2">Jawaban Anda</p>
                                <ol className="list-decimal list-inside space-y-2">
                                    {(answer.orderSequence || []).map((idx) => (
                                        <li key={idx} className="text-slate-700 font-medium bg-white p-2 rounded border border-slate-100">{q.orderItems?.[idx]}</li>
                                    ))}
                                </ol>
                                {(!answer.orderSequence || answer.orderSequence.length === 0) && <p className="text-rose-500 italic text-sm">Kosong</p>}
                            </div>
                            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                                <p className="font-bold text-emerald-800 mb-3 text-sm uppercase tracking-wide border-b border-emerald-200 pb-2">Kunci Jawaban</p>
                                <ol className="list-decimal list-inside space-y-2 text-emerald-800">
                                    {q.orderItems?.map((item, i) => <li key={i} className="bg-white/50 p-2 rounded border border-emerald-100/50 font-medium">{item}</li>)}
                                </ol>
                            </div>
                        </div>
                        )}
                        
                        {/* MATCHING COMPARISON */}
                        {q.type === 'matching' && (
                            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                            <table className="w-full text-sm text-left bg-white">
                                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                                <tr>
                                    <th className="p-3 border-b">Pernyataan (Kiri)</th>
                                    <th className="p-3 border-b">Jawaban Anda</th>
                                    <th className="p-3 border-b">Kunci Jawaban</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {q.matches?.map((m, i) => {
                                        const userPair = answer.pairs?.find(p => p.leftIndex === i);
                                        const userMatchedRight = userPair ? q.matches?.[userPair.rightIndex]?.right : '-';
                                        const isCorrect = userPair && userPair.leftIndex === userPair.rightIndex;
                                        
                                        return (
                                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-3 font-medium text-slate-700">{m.left}</td>
                                            <td className={`p-3 font-bold ${isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {userMatchedRight}
                                                {isCorrect && <CheckCircle size={14} className="inline ml-1"/>}
                                            </td>
                                            <td className="p-3 text-emerald-700 font-medium">{m.right}</td>
                                        </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                            </div>
                        )}
                        
                        {/* MULTI CHOICE / SELECT COMPARISON */}
                        {(q.type === 'multiple_choice' || q.type === 'multi_select') && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <p className="font-bold text-slate-700 mb-3 text-sm uppercase tracking-wide">Pilihan Anda:</p>
                                <ul className="space-y-2">
                                    {answer.selectedOptions?.map(idx => (
                                        <li key={idx} className={`flex items-center gap-2 p-2 rounded-lg ${q.correctOptions?.includes(idx) ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-rose-100 text-rose-800'}`}>
                                            {q.correctOptions?.includes(idx) ? <CheckCircle size={16}/> : <XCircle size={16}/>}
                                            {q.options?.[idx]}
                                        </li>
                                    ))}
                                </ul>
                                {(!answer.selectedOptions || answer.selectedOptions.length === 0) && <p className="text-slate-400 italic">Tidak menjawab</p>}
                            </div>
                            {!isFullPoints && (
                                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                                    <p className="font-bold text-emerald-800 mb-3 text-sm uppercase tracking-wide">Jawaban Benar:</p>
                                    <ul className="space-y-2">
                                        {q.correctOptions?.map(idx => (
                                            <li key={idx} className="flex items-center gap-2 text-emerald-800 font-medium p-2 bg-white/60 rounded-lg border border-emerald-100/50">
                                                <CheckCircle size={16}/> {q.options?.[idx]}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                        )}

                        {/* ESSAY */}
                        {q.type === 'essay' && (
                            <div className="mt-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <p className="font-bold text-slate-700 mb-2 text-sm uppercase tracking-wide">Jawaban Anda:</p>
                            <p className="text-slate-600 whitespace-pre-wrap bg-white p-3 rounded-lg border border-slate-100">{answer.textAnswer || <span className="italic text-slate-400">Kosong</span>}</p>
                            <div className="mt-3 text-xs text-slate-400 border-t border-slate-200 pt-2 flex items-center gap-1">
                                <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
                                Penilaian esai dilakukan secara manual oleh guru atau sistem kata kunci.
                            </div>
                            </div>
                        )}

                    </div>
                    )}
                </div>
                );
            })
          )}
        </div>

      </div>
    </div>
  );
}