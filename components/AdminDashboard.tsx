import React, { useState, useEffect, useRef } from 'react';
import { Student, Question, QuestionType, ExamConfig, SubjectSchedule } from '../types';
import * as Storage from '../services/storage';
import { 
  Users, BookOpen, BarChart3, Plus, Trash2, Save, LogOut, 
  CheckCircle, XCircle, Menu, X, Settings, Calendar, Filter, Clock, Upload, Edit, Cloud, Download, ChevronUp, ChevronDown, Award, Printer, List,
  Image as ImageIcon, Calculator, AlertTriangle, FileSpreadsheet
} from './Icons';

const useReactToPrint = ({ contentRef, documentTitle }: { contentRef: React.RefObject<any>, documentTitle?: string }) => {
  return React.useCallback(() => {
    const content = contentRef.current;
    if (!content) return;

    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) {
        alert('Please allow popups to print');
        return;
    }

    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(node => node.outerHTML)
      .join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>${documentTitle || 'Print'}</title>
          ${styles}
          <style>
             body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
             @media print {
               .no-print { display: none !important; }
               .print-only { display: block !important; }
             }
          </style>
        </head>
        <body>
          ${content.outerHTML}
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }, [contentRef, documentTitle]);
};

interface AdminDashboardProps {
  onLogout: () => void;
}

// --- TEMPLATES FOR DOWNLOAD ---
const STUDENT_TEMPLATE = [
  { "name": "Budi Santoso", "className": "6 SD", "school": "SDN 1 Jakarta" },
  { "name": "Siti Aminah", "className": "6 SD", "school": "SD Islam Al-Azhar" }
];

const QUESTION_TEMPLATE = [
  {
    "text": "Hasil dari 5 + 5 adalah...",
    "type": "multiple_choice",
    "subject": "Matematika",
    "points": 10,
    "options": ["8", "9", "10", "11"],
    "correctOptions": [2]
  },
  {
    "text": "Ibu kota Indonesia adalah...",
    "type": "essay",
    "subject": "IPS",
    "points": 20,
    "keywords": ["nusantara", "jakarta"]
  }
];

// --- MATH SYMBOLS ---
const MATH_SYMBOLS = [
  'π', 'α', 'β', 'θ', 'Δ', '∞', '≈', '≠', '≤', '≥', '±', '×', '÷', '√', '²', '³', '½', '¼', '°', '∑'
];

// --- MATH RENDERER HELPER ---
export const renderMathText = (text: string) => {
  if (!text) return "";
  const parts = text.split(/(\\frac\{[^}]+\}\{[^}]+\})/g);
  
  return (
    <span>
      {parts.map((part, index) => {
        const match = /\\frac\{([^}]+)\}\{([^}]+)\}/.exec(part);
        if (match) {
           return (
             <span key={index} className="inline-flex flex-col text-center align-middle mx-1.5" style={{ verticalAlign: 'middle' }}>
               <span className="border-b border-gray-900 leading-none pb-[1px] text-[0.9em] px-1 font-medium">{match[1]}</span>
               <span className="leading-none pt-[1px] text-[0.9em] font-medium">{match[2]}</span>
             </span>
           );
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
};

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'students' | 'questions' | 'results' | 'settings'>('students');
  const [students, setStudents] = useState<Student[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    setStudents(Storage.getStudents());
    setQuestions(Storage.getQuestions());
    setSubjects(Storage.getSubjects());
  }, []);

  const handleUpdateSubjects = (newSubjects: string[]) => {
      setSubjects(newSubjects);
      Storage.saveSubjects(newSubjects);
  };

  const handleAddStudent = (name: string, className: string, school: string) => {
    const newStudent: Student = {
      id: Date.now().toString(),
      name,
      className,
      school: school || '-',
      code: Storage.generateCode(),
      status: 'not_started',
      answers: [],
      score: 0
    };
    Storage.saveStudent(newStudent);
    setStudents(Storage.getStudents());
  };

  const handleImportStudents = (newStudents: Partial<Student>[]) => {
    newStudents.forEach(s => {
      if(s.name && s.className) {
        handleAddStudent(s.name, s.className, s.school || '-');
      }
    });
    alert(`Berhasil mengimpor ${newStudents.length} siswa.`);
  };

  const handleDeleteStudent = (id: string) => {
    if(confirm('Hapus siswa ini?')) {
      Storage.deleteStudent(id);
      setStudents(Storage.getStudents());
    }
  };

  const handleImportQuestions = (newQuestions: Partial<Question>[]) => {
    let count = 0;
    newQuestions.forEach(q => {
      if(q.text && q.type && q.points) {
         const fullQ: Question = {
           id: Date.now().toString() + Math.random(),
           text: q.text,
           type: q.type as QuestionType,
           points: q.points,
           subject: q.subject || 'Umum',
           options: q.options,
           correctOptions: q.correctOptions,
           matches: q.matches,
           orderItems: q.orderItems,
           keywords: q.keywords
         };
         Storage.saveQuestion(fullQ);
         count++;
      }
    });
    setQuestions(Storage.getQuestions());
    alert(`Berhasil mengimpor ${count} soal.`);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      {/* Mobile Header */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center shadow-md relative z-50">
        <h1 className="font-bold text-lg flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">GE</div>
            Graha Edukasi
        </h1>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-slate-800 rounded">
          <Menu size={24} />
        </button>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ease-in-out ${
          isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsSidebarOpen(false)}
      ></div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-slate-300 flex flex-col shadow-2xl 
        transition-transform duration-300 ease-in-out transform 
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 md:static md:shadow-none md:flex-shrink-0
      `}>
        <div className="p-8 border-b border-slate-800 flex justify-between items-center">
          <div className="flex flex-col items-start">
             {logoError ? (
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-900/50">GE</div>
                    <h1 className="text-xl font-bold text-white tracking-tight">GRAHA</h1>
                </div>
             ) : (
                <img 
                    src="/logo.png" 
                    alt="Logo" 
                    className="h-10 w-auto object-contain mb-3"
                    onError={() => setLogoError(true)}
                />
             )}
            <h1 className="text-lg font-bold leading-none text-white">ADMIN CBT</h1>
            <p className="text-indigo-400 text-[10px] font-bold tracking-[0.2em] uppercase mt-1.5">TRY OUT TKA SD</p>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavButton 
            active={activeTab === 'students'} 
            onClick={() => { setActiveTab('students'); setIsSidebarOpen(false); }} 
            icon={<Users size={20} />} 
            label="Peserta Ujian" 
          />
          <NavButton 
            active={activeTab === 'questions'} 
            onClick={() => { setActiveTab('questions'); setIsSidebarOpen(false); }} 
            icon={<BookOpen size={20} />} 
            label="Bank Soal" 
          />
          <NavButton 
            active={activeTab === 'results'} 
            onClick={() => { setActiveTab('results'); setIsSidebarOpen(false); }} 
            icon={<BarChart3 size={20} />} 
            label="Analisis Hasil" 
          />
          <NavButton 
            active={activeTab === 'settings'} 
            onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }} 
            icon={<Settings size={20} />} 
            label="Pengaturan Ujian" 
          />
        </nav>
        <div className="p-6 border-t border-slate-800">
          <button onClick={onLogout} className="w-full flex items-center justify-center p-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:from-red-700 hover:to-rose-700 transition-all font-bold text-sm shadow-lg shadow-red-900/20">
            <LogOut size={18} className="mr-2" /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto h-[calc(100vh-64px)] md:h-screen">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'students' && (
            <StudentManager students={students} onAdd={handleAddStudent} onDelete={handleDeleteStudent} onImport={handleImportStudents}/>
          )}
          {activeTab === 'questions' && (
            <QuestionManager questions={questions} setQuestions={setQuestions} onImport={handleImportQuestions} availableSubjects={subjects} />
          )}
          {activeTab === 'results' && (
            <ResultAnalysis students={students} questions={questions} />
          )}
          {activeTab === 'settings' && (
            <ExamSettings availableSubjects={subjects} onUpdateSubjects={handleUpdateSubjects} />
          )}
        </div>
      </main>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center px-4 py-3.5 rounded-xl transition-all duration-200 group ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/30 font-semibold' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
    >
      <span className={`mr-3 ${active ? 'text-indigo-200' : 'text-slate-500 group-hover:text-slate-300'}`}>{icon}</span>
      {label}
    </button>
  );
}

// --- Helper for Download ---
const downloadJSON = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
};

// --- Sub Components ---

function StudentManager({ students, onAdd, onDelete, onImport }: { students: Student[], onAdd: (n: string, c: string, s: string) => void, onDelete: (id: string) => void, onImport: (data: any[]) => void }) {
  const [name, setName] = useState('');
  const [cls, setCls] = useState('');
  const [school, setSchool] = useState('');
  const [error, setError] = useState('');
  
  // Printing Logic
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
      contentRef: printRef,
      documentTitle: 'Daftar_Peserta_Ujian',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Nama Lengkap wajib diisi.');
      return;
    }
    if (!cls.trim()) {
      setError('Kelas wajib diisi.');
      return;
    }
    if (!school.trim()) {
        setError('Asal Sekolah wajib diisi.');
        return;
    }

    onAdd(name, cls, school);
    setName('');
    setCls('');
    setSchool('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if(!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target?.result as string);
        if(Array.isArray(data)) {
          onImport(data);
        } else {
          alert('Format JSON salah. Harus berupa Array.');
        }
      } catch (err) {
        alert('Gagal membaca file JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  // --- CSV Export Logic ---
  const handleExportCSV = () => {
    // Header
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Nama Lengkap,Kelas,Asal Sekolah,Kode Login,Status Ujian,Nilai Akhir\n";

    // Rows
    students.forEach((s) => {
        const row = [
            `"${s.name}"`,
            `"${s.className}"`,
            `"${s.school}"`,
            `"${s.code}"`,
            `"${s.status === 'completed' ? 'Selesai' : s.status === 'in_progress' ? 'Sedang Mengerjakan' : 'Belum Mulai'}"`,
            `"${s.score}"`
        ].join(",");
        csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "daftar_peserta_ujian.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
         <div>
            <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                <Users className="text-indigo-600" size={32}/> Manajemen Peserta
            </h2>
            <p className="text-slate-500 mt-1">Kelola data siswa yang mengikuti ujian.</p>
         </div>
         <div className="flex gap-2">
            <button 
                onClick={handleExportCSV} 
                className="bg-emerald-600 text-white px-4 py-2.5 rounded-lg shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 hover:-translate-y-0.5 transition-all text-sm font-bold flex items-center gap-2"
                title="Download daftar untuk Excel"
            >
                <FileSpreadsheet size={18} /> Excel
            </button>
            <button 
                onClick={() => handlePrint()} 
                className="bg-slate-800 text-white px-4 py-2.5 rounded-lg shadow-lg shadow-slate-800/20 hover:bg-slate-900 hover:-translate-y-0.5 transition-all text-sm font-bold flex items-center gap-2"
                title="Cetak daftar nama dan kode"
            >
                <Printer size={18} /> Cetak
            </button>
         </div>
      </div>
      
      <div className="bg-white p-8 rounded-2xl shadow-lg mb-8 border border-slate-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
             <h3 className="text-lg font-bold text-slate-700">Tambah Peserta Baru</h3>
             <div className="flex gap-2">
                <button 
                  onClick={() => downloadJSON(STUDENT_TEMPLATE, 'template_peserta.json')}
                  className="bg-white text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium hover:bg-slate-50 hover:border-slate-300 transition-colors flex items-center gap-2"
                  title="Unduh contoh format file"
                >
                    <Download size={14} /> Template
                </button>
                <label className="cursor-pointer bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-200 text-sm font-bold hover:bg-indigo-100 transition-colors flex items-center gap-2">
                    <Upload size={14} /> Import JSON
                    <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
                </label>
             </div>
        </div>
        
        {error && (
          <div className="bg-white text-rose-600 p-4 rounded-xl mb-6 flex items-center gap-3 border border-rose-200 shadow-sm">
            <XCircle size={20} /> <span className="font-medium">{error}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
          <div className="md:col-span-4">
            <label className="block text-sm font-bold text-slate-700 mb-2">Nama Lengkap</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition bg-white text-slate-800"
              placeholder="Contoh: Budi Santoso"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm font-bold text-slate-700 mb-2">Kelas</label>
            <input 
              type="text" 
              value={cls}
              onChange={(e) => setCls(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition bg-white text-slate-800"
              placeholder="6 SD"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm font-bold text-slate-700 mb-2">Asal Sekolah</label>
            <input 
              type="text" 
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition bg-white text-slate-800"
              placeholder="SDN 1 Pagi"
            />
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="w-full bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 flex items-center justify-center gap-2 transition font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5">
              <Plus size={20} /> Tambah
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-5 font-bold text-slate-500 text-sm uppercase tracking-wider">Nama</th>
                <th className="p-5 font-bold text-slate-500 text-sm uppercase tracking-wider">Kelas</th>
                <th className="p-5 font-bold text-slate-500 text-sm uppercase tracking-wider">Asal Sekolah</th>
                <th className="p-5 font-bold text-slate-500 text-sm uppercase tracking-wider">Kode Akses</th>
                <th className="p-5 font-bold text-slate-500 text-sm uppercase tracking-wider">Status</th>
                <th className="p-5 font-bold text-slate-500 text-sm uppercase tracking-wider text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.length === 0 ? (
                <tr><td colSpan={6} className="p-10 text-center text-slate-400 italic">Belum ada data peserta. Silakan tambah peserta baru.</td></tr>
              ) : (
                students.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition bg-white">
                    <td className="p-5 font-semibold text-slate-800">{s.name}</td>
                    <td className="p-5 text-slate-600">{s.className}</td>
                    <td className="p-5 text-slate-600">{s.school || '-'}</td>
                    <td className="p-5">
                       <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 tracking-wider text-sm">
                         {s.code}
                       </span>
                    </td>
                    <td className="p-5">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                        s.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        s.status === 'in_progress' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {s.status === 'completed' ? 'Selesai' : s.status === 'in_progress' ? 'Mengerjakan' : 'Belum Mulai'}
                      </span>
                    </td>
                    <td className="p-5 text-center">
                      <button onClick={() => onDelete(s.id)} className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-2.5 rounded-full transition-all border border-transparent hover:border-rose-100">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- HIDDEN PRINT AREA --- */}
      <div style={{ display: 'none' }}>
         <div ref={printRef} className="p-8 bg-white text-black font-sans">
             <div className="text-center mb-8 border-b-2 border-black pb-4">
                 <h1 className="text-2xl font-bold">DAFTAR PESERTA UJIAN</h1>
                 <h2 className="text-xl">GRAHA EDUKASI - TRY OUT TKA SD</h2>
                 <p className="text-sm mt-2">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
             </div>
             
             <table className="w-full border-collapse border border-black text-sm">
                 <thead>
                     <tr className="bg-white">
                         <th className="border border-black p-2 text-center w-12">No</th>
                         <th className="border border-black p-2 text-left">Nama Peserta</th>
                         <th className="border border-black p-2 text-center">Kelas</th>
                         <th className="border border-black p-2 text-left">Asal Sekolah</th>
                         <th className="border border-black p-2 text-center font-bold text-lg">KODE LOGIN</th>
                         <th className="border border-black p-2 text-center w-24">Paraf</th>
                     </tr>
                 </thead>
                 <tbody>
                     {students.map((s, idx) => (
                         <tr key={s.id}>
                             <td className="border border-black p-2 text-center">{idx + 1}</td>
                             <td className="border border-black p-2 font-medium">{s.name}</td>
                             <td className="border border-black p-2 text-center">{s.className}</td>
                             <td className="border border-black p-2">{s.school}</td>
                             <td className="border border-black p-2 text-center font-mono font-bold text-lg tracking-wider">{s.code}</td>
                             <td className="border border-black p-2"></td>
                         </tr>
                     ))}
                 </tbody>
             </table>
             
             <div className="mt-8 flex justify-end">
                 <div className="text-center w-64">
                     <p>Pengawas Ujian,</p>
                     <div className="h-20"></div>
                     <p className="border-t border-black pt-1">(_______________________)</p>
                 </div>
             </div>
         </div>
      </div>
    </div>
  );
}

const DRAFT_KEY = 'graha_cbt_question_draft';

function QuestionManager({ questions, setQuestions, onImport, availableSubjects }: { questions: Question[], setQuestions: (q: Question[]) => void, onImport: (data: any[]) => void, availableSubjects: string[] }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [filterSubject, setFilterSubject] = useState<string>(''); // Default to empty, will be set in useEffect
  
  // Form State
  const [type, setType] = useState<QuestionType>('multiple_choice');
  const [subject, setSubject] = useState('');
  const [text, setText] = useState('');
  const [imageUrl, setImageUrl] = useState(''); // State for Image (Base64)
  const [points, setPoints] = useState(10);
  
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [correctIndices, setCorrectIndices] = useState<number[]>([]);
  const [matches, setMatches] = useState<{left: string, right: string}[]>([{left: '', right: ''}]);
  const [orderItems, setOrderItems] = useState<string[]>(['', '']);
  const [keywordString, setKeywordString] = useState('');

  // Refs
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Count per subject
  const subjectCounts = questions.reduce((acc, q) => {
      const sub = q.subject || 'Lainnya';
      acc[sub] = (acc[sub] || 0) + 1;
      return acc;
  }, {} as Record<string, number>);

  // Auto-save draft effect
  useEffect(() => {
    if (isAdding && !editingId) {
        const draftData = {
            text, type, subject, points, imageUrl,
            options, correctIndices, matches, orderItems, keywordString
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
    }
  }, [text, type, subject, points, imageUrl, options, correctIndices, matches, orderItems, keywordString, isAdding, editingId]);

  useEffect(() => {
    // If no filter selected yet, select the first available subject
    if (!filterSubject && availableSubjects.length > 0) {
        setFilterSubject(availableSubjects[0]);
    }
  }, [availableSubjects, filterSubject]);

  const handleEdit = (q: Question) => {
    setIsAdding(true);
    setEditingId(q.id);
    setType(q.type);
    setSubject(q.subject || availableSubjects[0] || '');
    setText(q.text);
    setImageUrl(q.imageUrl || '');
    setPoints(q.points);
    
    setOptions(['', '', '', '']);
    setCorrectIndices([]);
    setMatches([{left: '', right: ''}]);
    setOrderItems(['', '']);
    setKeywordString('');

    if (q.type === 'multiple_choice' || q.type === 'multi_select') {
      setOptions(q.options || ['', '', '', '']);
      setCorrectIndices(q.correctOptions || []);
    } else if (q.type === 'matching') {
      setMatches(q.matches || [{left: '', right: ''}]);
    } else if (q.type === 'ordering') {
      setOrderItems(q.orderItems || ['', '']);
    } else if (q.type === 'essay') {
      setKeywordString(q.keywords ? q.keywords.join(', ') : '');
    }
  };

  const startAdding = () => {
      setIsAdding(true);
      setEditingId(null);
      
      // Check for draft
      const savedDraft = localStorage.getItem(DRAFT_KEY);
      if (savedDraft) {
          try {
              const d = JSON.parse(savedDraft);
              setText(d.text || '');
              setType(d.type || 'multiple_choice');
              setSubject(d.subject || (filterSubject && filterSubject !== 'all' ? filterSubject : availableSubjects[0] || ''));
              setPoints(d.points || 10);
              setImageUrl(d.imageUrl || '');
              setOptions(d.options || ['', '', '', '']);
              setCorrectIndices(d.correctIndices || []);
              setMatches(d.matches || [{left: '', right: ''}]);
              setOrderItems(d.orderItems || ['', '']);
              setKeywordString(d.keywordString || '');
          } catch (e) {
              console.error("Error parsing draft", e);
              resetForm();
          }
      } else {
          resetForm();
          // Pre-fill subject with currently filtered subject
          if (filterSubject && filterSubject !== 'all') {
              setSubject(filterSubject);
          } else if (availableSubjects.length > 0) {
              setSubject(availableSubjects[0]);
          }
      }
  };

  const handleSave = () => {
    setError('');

    if (!text.trim()) {
      setError("Pertanyaan wajib diisi");
      return;
    }
    if (points <= 0) {
      setError("Poin harus lebih dari 0");
      return;
    }
    if (!subject.trim()) {
      setError("Mata Pelajaran wajib diisi");
      return;
    }

    const newQ: Question = {
      id: editingId || Date.now().toString(),
      text,
      type,
      subject,
      points,
      imageUrl: imageUrl // Save image url
    };

    if (type === 'multiple_choice' || type === 'multi_select') {
      const validOptions = options.filter(o => o.trim() !== '');
      if (validOptions.length < 2) {
        setError("Minimal 2 opsi jawaban wajib diisi.");
        return;
      }
      if (correctIndices.length === 0) {
        setError("Pilih minimal satu jawaban yang benar.");
        return;
      }

      newQ.options = validOptions;
      newQ.correctOptions = correctIndices;
    } else if (type === 'matching') {
      const validMatches = matches.filter(m => m.left.trim() && m.right.trim());
      if (validMatches.length < 1) {
        setError("Minimal 1 pasangan wajib diisi.");
        return;
      }
      newQ.matches = validMatches;
    } else if (type === 'ordering') {
      const validOrderItems = orderItems.filter(o => o.trim() !== '');
      if (validOrderItems.length < 2) {
        setError("Minimal 2 item urutan wajib diisi.");
        return;
      }
      newQ.orderItems = validOrderItems;
    } else if (type === 'essay') {
      if (keywordString.trim()) {
        const kws = keywordString.split(',').map(k => k.trim()).filter(k => k);
        newQ.keywords = kws;
      }
    }

    Storage.saveQuestion(newQ);
    setQuestions(Storage.getQuestions());
    setIsAdding(false);
    resetForm();
    localStorage.removeItem(DRAFT_KEY); // Clear draft on successful save
  };

  const resetForm = () => {
    setText('');
    setImageUrl('');
    // Do not reset subject here, keep the current one or the filtered one
    setPoints(10);
    setOptions(['', '', '', '']);
    setCorrectIndices([]);
    setMatches([{left: '', right: ''}]);
    setOrderItems(['', '']);
    setKeywordString('');
    setError('');
    setEditingId(null);
    localStorage.removeItem(DRAFT_KEY);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if(!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target?.result as string);
        if(Array.isArray(data)) {
          onImport(data);
        } else {
          alert('Format JSON salah. Harus berupa Array.');
        }
      } catch (err) {
        alert('Gagal membaca file JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  // --- NEW: Handle Image Upload for Questions ---
  const handleQuestionImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if(!file) return;

    if (file.size > 500 * 1024) { // Limit 500KB for localStorage performance
        alert("Ukuran gambar maksimal 500KB agar tidak memberatkan browser.");
        return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
        const result = evt.target?.result as string;
        setImageUrl(result);
    };
    reader.readAsDataURL(file);
  }

  // --- NEW: Handle Math Symbol Insertion ---
  const insertSymbol = (symbol: string) => {
      if (textAreaRef.current) {
          const start = textAreaRef.current.selectionStart;
          const end = textAreaRef.current.selectionEnd;
          const newText = text.substring(0, start) + symbol + text.substring(end);
          setText(newText);
          
          // Restore focus and cursor position after insertion
          setTimeout(() => {
              if (textAreaRef.current) {
                  textAreaRef.current.focus();
                  textAreaRef.current.setSelectionRange(start + symbol.length, start + symbol.length);
              }
          }, 0);
      } else {
          setText(text + symbol);
      }
  };

  // --- DELETE HANDLER (FIXED) ---
  const handleDeleteQuestion = (id: string) => {
      if(window.confirm('Apakah Anda yakin ingin menghapus soal ini?')) {
          Storage.deleteQuestion(id);
          setQuestions(Storage.getQuestions());
          
          // If we deleted the question currently being edited, close the form
          if (editingId === id) {
              setIsAdding(false);
              resetForm();
          }
      }
  };

  // Filter Logic
  const filteredQuestions = questions.filter(q => (q.subject || 'Lainnya') === filterSubject);

  const renderAnswerKey = (q: Question) => {
      if (q.type === 'multiple_choice' || q.type === 'multi_select') {
          return (
              <div className="flex flex-wrap gap-2">
                  {q.correctOptions?.map(idx => (
                      <span key={idx} className="bg-white text-emerald-700 px-2.5 py-1 rounded-md font-bold text-sm border border-emerald-200 shadow-sm">
                          {q.options?.[idx]}
                      </span>
                  ))}
              </div>
          );
      }
      if (q.type === 'matching') {
          return (
              <ul className="text-sm text-slate-600 space-y-1">
                  {q.matches?.map((m, i) => (
                      <li key={i}><span className="font-bold text-slate-800">{m.left}</span> <span className="text-slate-400 mx-1">→</span> <span className="text-emerald-600 font-bold">{m.right}</span></li>
                  ))}
              </ul>
          );
      }
      if (q.type === 'ordering') {
          return (
              <ol className="list-decimal list-inside text-sm font-bold text-emerald-700">
                  {q.orderItems?.map((item, i) => <li key={i}>{item}</li>)}
              </ol>
          );
      }
      if (q.type === 'essay') {
          return (
              <div className="text-sm">
                  <span className="font-bold text-slate-500">Kata Kunci:</span> 
                  <span className="ml-2 text-emerald-700 font-bold">{q.keywords?.join(', ') || '-'}</span>
              </div>
          );
      }
      return null;
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-slate-200 pb-6">
        <div>
            <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <BookOpen className="text-indigo-600" size={32}/> Bank Soal
            </h2>
            <p className="text-slate-500 mt-1">Kelola dan atur soal per mata pelajaran dengan mudah.</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
             <button 
                  onClick={() => downloadJSON(QUESTION_TEMPLATE, 'template_soal.json')}
                  className="bg-white text-slate-600 px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-bold hover:bg-slate-50 transition-colors flex items-center gap-2"
                  title="Unduh contoh format file"
                >
                    <Download size={16} /> Template
            </button>
            <label className="cursor-pointer bg-emerald-600 text-white px-4 py-2.5 rounded-lg shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 flex items-center gap-2 transition-all hover:-translate-y-0.5 text-sm font-bold">
                <Upload size={18} /> Import
                <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            </label>
            <button 
              onClick={() => {
                if (isAdding) {
                    setIsAdding(false);
                    resetForm();
                } else {
                    startAdding();
                }
              }}
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 flex items-center gap-2 transition-all hover:-translate-y-0.5 text-sm font-bold"
            >
              {isAdding ? <><X size={18}/> Batal</> : <><Plus size={18}/> Tambah Soal</>}
            </button>
        </div>
      </div>

      {!isAdding && (
          <div className="mb-8 overflow-x-auto pb-2">
             <div className="flex space-x-2">
                {availableSubjects.map(subj => (
                    <button 
                        key={subj}
                        onClick={() => setFilterSubject(subj)}
                        className={`px-5 py-2.5 rounded-full whitespace-nowrap transition-all text-sm font-bold flex items-center gap-2 border
                            ${filterSubject === subj 
                                ? 'bg-indigo-600 text-white shadow-md border-indigo-600' 
                                : 'bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 border-slate-200'}`}
                    >
                         {subj}
                         <span className={`px-2 py-0.5 rounded-full text-xs font-black ${filterSubject === subj ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                             {subjectCounts[subj] || 0}
                         </span>
                    </button>
                ))}
                {availableSubjects.length === 0 && <span className="text-slate-400 text-sm p-2 italic">Belum ada mata pelajaran. Tambahkan di menu Pengaturan.</span>}
             </div>
          </div>
      )}

      {isAdding && (
        <div className="bg-white p-8 rounded-2xl shadow-xl mb-8 border border-slate-100 animate-fade-in-down">
          <h3 className="text-xl font-bold text-slate-800 mb-6 pb-4 border-b border-slate-100 flex items-center gap-2">
            <Edit size={24} className="text-indigo-600"/>
            {editingId ? 'Edit Soal' : 'Buat Soal Baru'}
          </h3>
          {/* Draft Indicator */}
          {!editingId && (
              <div className="mb-6 bg-blue-50 text-blue-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2 border border-blue-100">
                  <Cloud size={16} />
                  <span>Sistem menyimpan pekerjaan Anda secara otomatis. Jika Anda keluar, draft akan dimuat kembali.</span>
              </div>
          )}
          
          {error && (
            <div className="bg-white text-rose-600 p-4 rounded-xl mb-6 flex items-center gap-3 border border-rose-200 shadow-sm">
              <XCircle size={20} /> <span className="font-medium">{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Mata Pelajaran</label>
              <div className="relative">
                <select 
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none bg-white text-slate-800 appearance-none"
                >
                    {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                    {editingId && !availableSubjects.includes(subject) && subject && (
                        <option value={subject}>{subject} (Lama)</option>
                    )}
                    {availableSubjects.length === 0 && !subject && <option value="">-- List Kosong --</option>}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"><ChevronDown size={16}/></div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Tipe Soal</label>
              <div className="relative">
                <select 
                    value={type} 
                    onChange={(e) => {
                    setType(e.target.value as QuestionType);
                    setCorrectIndices([]);
                    }}
                    disabled={!!editingId}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none disabled:bg-slate-50 bg-white text-slate-800 appearance-none"
                >
                    <option value="multiple_choice">Pilihan Ganda</option>
                    <option value="multi_select">Pilihan Ganda Kompleks</option>
                    <option value="matching">Menjodohkan</option>
                    <option value="ordering">Mengurutkan</option>
                    <option value="essay">Uraian / Esai</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"><ChevronDown size={16}/></div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Poin</label>
              <input 
                type="number" 
                min="1"
                value={points} 
                onChange={(e) => setPoints(Number(e.target.value))}
                className="w-full p-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none bg-white text-slate-800" 
              />
            </div>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-bold text-slate-700 mb-2">Pertanyaan</label>
            
            {/* Math Toolbar */}
            <div className="flex flex-wrap gap-1 p-2 bg-slate-50 border border-slate-200 rounded-t-xl border-b-0">
                <span className="text-xs font-bold text-slate-500 mr-2 flex items-center gap-1"><Calculator size={12}/> Simbol:</span>
                <button
                    onClick={() => insertSymbol('\\frac{a}{b}')}
                    className="px-2 h-8 flex items-center justify-center bg-white border border-slate-300 rounded hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 text-xs font-bold transition whitespace-nowrap"
                    title="Pecahan (Edit a dan b)"
                >
                    Pecahan (a/b)
                </button>
                {MATH_SYMBOLS.map((sym) => (
                    <button
                        key={sym}
                        onClick={() => insertSymbol(sym)}
                        className="w-8 h-8 flex items-center justify-center bg-white border border-slate-300 rounded hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 text-sm font-serif transition"
                        title="Sisipkan simbol"
                    >
                        {sym}
                    </button>
                ))}
            </div>

            <textarea 
              ref={textAreaRef}
              value={text} 
              onChange={(e) => setText(e.target.value)}
              className="w-full p-4 border border-slate-200 rounded-b-xl h-40 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none bg-white text-slate-800 font-medium leading-relaxed resize-y" 
              placeholder="Tulis pertanyaan di sini... Gunakan tombol Pecahan untuk memasukkan rumus pecahan."
            />
          </div>

          {/* Image Upload Section */}
          <div className="mb-8">
             <label className="block text-sm font-bold text-slate-700 mb-2">Gambar Soal (Opsional)</label>
             <div className="flex items-start gap-6">
                 <div className="flex-1">
                     <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 transition-colors group">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <ImageIcon className="w-8 h-8 mb-3 text-slate-400 group-hover:text-indigo-500" />
                            <p className="mb-1 text-sm text-slate-500 font-medium"><span className="font-bold text-indigo-600">Klik upload</span> atau drag and drop</p>
                            <p className="text-xs text-slate-400">PNG, JPG (MAX. 500KB)</p>
                        </div>
                        <input type="file" className="hidden" accept="image/*" onChange={handleQuestionImageUpload} />
                    </label>
                 </div>
                 {imageUrl && (
                     <div className="relative w-32 h-32 border border-slate-200 rounded-xl bg-white p-1 shadow-sm flex items-center justify-center overflow-hidden">
                         <img src={imageUrl} alt="Preview" className="max-w-full max-h-full object-contain rounded-lg" />
                         <button 
                            onClick={() => setImageUrl('')}
                            className="absolute top-[-8px] right-[-8px] bg-rose-600 text-white rounded-full p-1.5 shadow-md hover:bg-rose-700 transition-colors"
                         >
                             <X size={14}/>
                         </button>
                     </div>
                 )}
             </div>
          </div>

          <div className="bg-slate-50 p-6 rounded-xl mb-8 border border-slate-200">
            {(type === 'multiple_choice' || type === 'multi_select') && (
              <div className="space-y-4">
                <p className="text-sm text-slate-700 font-bold mb-2 uppercase tracking-wide">Opsi Jawaban (Centang yang benar)</p>
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <input 
                      type={type === 'multiple_choice' ? 'radio' : 'checkbox'} 
                      name="correct_opt"
                      checked={correctIndices.includes(idx)}
                      onChange={(e) => {
                        if (type === 'multiple_choice') setCorrectIndices([idx]);
                        else {
                          if (e.target.checked) setCorrectIndices([...correctIndices, idx]);
                          else setCorrectIndices(correctIndices.filter(i => i !== idx));
                        }
                      }}
                      className="w-5 h-5 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                    />
                    <input 
                      type="text" 
                      value={opt}
                      onChange={(e) => {
                        const newOpt = [...options];
                        newOpt[idx] = e.target.value;
                        setOptions(newOpt);
                      }}
                      className="flex-1 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none bg-white text-slate-800"
                      placeholder={`Opsi ${idx + 1}`}
                    />
                  </div>
                ))}
                <button onClick={() => setOptions([...options, ''])} className="text-sm font-bold text-indigo-600 hover:text-indigo-800 hover:underline mt-2">+ Tambah Opsi Lain</button>
              </div>
            )}

            {type === 'matching' && (
              <div className="space-y-4">
                 <p className="text-sm text-slate-700 font-bold mb-2 uppercase tracking-wide">Pasangan (Kiri tetap, Kanan akan diacak di siswa)</p>
                 {matches.map((m, idx) => (
                   <div key={idx} className="flex flex-col md:flex-row gap-4 items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                     <div className="flex-1 w-full relative">
                        <span className="absolute left-3 top-2 text-[10px] font-bold text-slate-400 uppercase">Kiri</span>
                        <input 
                            value={m.left}
                            onChange={(e) => {
                            const nm = [...matches];
                            nm[idx].left = e.target.value;
                            setMatches(nm);
                            }}
                            className="w-full p-2 pt-6 border-none bg-transparent focus:ring-0 text-slate-800 font-medium"
                            placeholder="Item Kiri"
                        />
                     </div>
                     <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                        <ChevronDown size={16} className="rotate-[-90deg] md:rotate-0 transform"/>
                     </div>
                     <div className="flex-1 w-full relative">
                        <span className="absolute left-3 top-2 text-[10px] font-bold text-slate-400 uppercase">Kanan</span>
                        <input 
                            value={m.right}
                            onChange={(e) => {
                            const nm = [...matches];
                            nm[idx].right = e.target.value;
                            setMatches(nm);
                            }}
                            className="w-full p-2 pt-6 border-none bg-transparent focus:ring-0 text-slate-800 font-medium"
                            placeholder="Item Kanan"
                        />
                     </div>
                      <button onClick={() => setMatches(matches.filter((_, i) => i !== idx))} className="text-rose-500 p-2 hover:bg-rose-50 rounded-lg transition"><Trash2 size={20}/></button>
                   </div>
                 ))}
                 <button onClick={() => setMatches([...matches, {left:'', right:''}])} className="text-sm font-bold text-indigo-600 hover:text-indigo-800 hover:underline mt-2">+ Tambah Pasangan</button>
              </div>
            )}

            {type === 'ordering' && (
              <div className="space-y-4">
                 <p className="text-sm text-slate-700 font-bold mb-2 uppercase tracking-wide">Urutan Yang Benar (1 = Teratas)</p>
                 {orderItems.map((item, idx) => (
                   <div key={idx} className="flex gap-3 items-center">
                     <span className="w-8 h-8 flex items-center justify-center bg-white border border-slate-300 rounded-full text-sm font-bold text-slate-600 shadow-sm">{idx + 1}</span>
                     <input 
                        value={item}
                        onChange={(e) => {
                          const ni = [...orderItems];
                          ni[idx] = e.target.value;
                          setOrderItems(ni);
                        }}
                        className="flex-1 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none bg-white text-slate-800"
                        placeholder="Item urutan"
                     />
                     <button onClick={() => setOrderItems(orderItems.filter((_, i) => i !== idx))} className="text-rose-500 p-2 hover:bg-rose-50 rounded-lg transition"><Trash2 size={20}/></button>
                   </div>
                 ))}
                 <button onClick={() => setOrderItems([...orderItems, ''])} className="text-sm font-bold text-indigo-600 hover:text-indigo-800 hover:underline mt-2">+ Tambah Item</button>
              </div>
            )}
            
            {type === 'essay' && (
              <div className="space-y-4">
                 <p className="text-sm text-slate-700 font-bold mb-2 flex items-center gap-2 uppercase tracking-wide"><BookOpen size={16}/> Penilaian Otomatis Kata Kunci</p>
                 <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg text-sm text-indigo-800 leading-relaxed">
                    Masukkan kata kunci yang <b>wajib ada</b> dalam jawaban siswa. Sistem akan memberikan poin parsial berdasarkan jumlah kata kunci yang ditemukan.
                 </div>
                 <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-600">Kata Kunci (Pisahkan dengan koma)</label>
                    <input 
                        type="text"
                        value={keywordString}
                        onChange={(e) => setKeywordString(e.target.value)}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none bg-white text-slate-800"
                        placeholder="Contoh: banjir, sampah, penyakit, lingkungan"
                    />
                 </div>
                 <p className="text-xs text-slate-500 italic">Semakin banyak kata kunci yang cocok, semakin tinggi nilai siswa.</p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
             <button onClick={() => { setIsAdding(false); resetForm(); }} className="px-6 py-3 border border-slate-300 rounded-xl text-slate-600 bg-white hover:bg-slate-50 font-bold transition">Batal</button>
             <button onClick={handleSave} className="bg-indigo-600 text-white px-8 py-3 rounded-xl hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-600/30 transition hover:-translate-y-0.5">
                {editingId ? 'Update Soal' : 'Simpan Soal'}
            </button>
          </div>
        </div>
      )}

      {/* Questions List */}
      <div className="space-y-4">
        {filteredQuestions.length > 0 ? (
            filteredQuestions.map((q, i) => (
            <div key={q.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex gap-6 transition hover:shadow-lg group">
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 font-black text-xl rounded-2xl flex items-center justify-center shrink-0 border border-indigo-100 shadow-sm group-hover:scale-105 transition-transform">
                   {i + 1}
                </div>
                
                <div className="flex-1 min-w-0 py-1">
                    <div className="flex items-center gap-3 mb-3">
                         <span className="bg-white border border-slate-200 text-slate-500 text-[10px] px-2.5 py-1 rounded-md font-bold uppercase tracking-wider">{q.type.replace('_', ' ')}</span>
                         <span className="text-slate-300 text-xs">•</span>
                         <span className="bg-indigo-50 text-indigo-600 text-[10px] px-2.5 py-1 rounded-md font-bold uppercase tracking-wider">{q.points} Poin</span>
                    </div>

                    <p className="font-medium text-lg text-slate-800 mb-5 leading-relaxed whitespace-pre-line">
                        {renderMathText(q.text)}
                    </p>
                    
                    {/* Image Preview in List */}
                    {q.imageUrl && (
                        <div className="mb-5">
                            <img src={q.imageUrl} alt="Soal" className="max-h-56 rounded-xl border border-slate-100 shadow-sm bg-slate-50" />
                        </div>
                    )}

                    <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl">
                        <div className="flex items-center gap-2 mb-2 text-xs font-bold text-emerald-700 uppercase tracking-wide">
                            <CheckCircle size={14} /> Kunci Jawaban
                        </div>
                        {renderAnswerKey(q)}
                    </div>
                </div>

                <div className="flex flex-col gap-3 pl-6 border-l border-slate-100 justify-center">
                    <button onClick={() => handleEdit(q)} className="text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 p-3 rounded-xl transition shadow-sm" title="Edit">
                        <Edit size={20} />
                    </button>
                    <button onClick={() => handleDeleteQuestion(q.id)} className="text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 p-3 rounded-xl transition shadow-sm" title="Hapus">
                        <Trash2 size={20} />
                    </button>
                </div>
            </div>
            ))
        ) : (
            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300 border border-slate-100">
                    <List size={40} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Belum ada soal untuk mapel ini.</h3>
                <p className="text-slate-500 mb-8">Pilih mapel lain atau mulai buat soal baru sekarang.</p>
                <button 
                  onClick={startAdding}
                  className="bg-indigo-600 text-white px-8 py-3 rounded-full hover:bg-indigo-700 font-bold transition shadow-lg shadow-indigo-600/30 hover:-translate-y-1"
                >
                  + Buat Soal {filterSubject}
                </button>
            </div>
        )}
      </div>
    </div>
  );
}

function ResultAnalysis({ students, questions }: { students: Student[], questions: Question[] }) {
  // Simple stats
  const completedStudents = students.filter(s => s.status === 'completed');
  const avgScore = completedStudents.length > 0 
    ? (completedStudents.reduce((acc, s) => acc + s.score, 0) / completedStudents.length).toFixed(1) 
    : '0';

  return (
    <div>
       <div className="flex items-center gap-4 mb-8">
         <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
             <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                 <BarChart3 size={24} />
             </div>
             <div>
                 <p className="text-xs text-slate-500 font-bold uppercase">Rata-rata Nilai</p>
                 <p className="text-2xl font-black text-slate-800">{avgScore}</p>
             </div>
         </div>
         <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
             <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                 <CheckCircle size={24} />
             </div>
             <div>
                 <p className="text-xs text-slate-500 font-bold uppercase">Selesai Ujian</p>
                 <p className="text-2xl font-black text-slate-800">{completedStudents.length} <span className="text-sm font-medium text-slate-400">/ {students.length}</span></p>
             </div>
         </div>
       </div>

       <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
         <div className="p-6 border-b border-slate-100">
             <h3 className="font-bold text-slate-800">Detail Hasil Peserta</h3>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <tr>
                        <th className="p-4">Nama</th>
                        <th className="p-4">Kelas</th>
                        <th className="p-4 text-center">Status</th>
                        <th className="p-4 text-center">Nilai</th>
                        <th className="p-4 text-center">Aksi</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                    {students.map(s => (
                        <tr key={s.id} className="hover:bg-slate-50">
                            <td className="p-4 font-semibold text-slate-700">{s.name}</td>
                            <td className="p-4 text-slate-600">{s.className}</td>
                            <td className="p-4 text-center">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${s.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : s.status === 'in_progress' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {s.status === 'completed' ? 'Selesai' : s.status === 'in_progress' ? 'Mengerjakan' : 'Belum'}
                                </span>
                            </td>
                            <td className="p-4 text-center font-bold text-lg text-slate-800">{s.score}</td>
                            <td className="p-4 text-center">
                                <button 
                                    onClick={() => {
                                        if(confirm('Reset ujian siswa ini? Data jawaban akan dihapus.')) {
                                            const newS = {...s, status: 'not_started' as const, answers: [], score: 0, startTime: undefined};
                                            Storage.saveStudent(newS);
                                            window.location.reload(); // Simple reload to refresh data
                                        }
                                    }}
                                    className="text-rose-600 hover:text-rose-800 font-bold text-xs"
                                >
                                    Reset
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
         </div>
       </div>
    </div>
  );
}

function ExamSettings({ availableSubjects, onUpdateSubjects }: { availableSubjects: string[], onUpdateSubjects: (s: string[]) => void }) {
    const [config, setConfig] = useState<ExamConfig>(Storage.getExamConfig());
    const [newSubject, setNewSubject] = useState('');

    const handleSave = () => {
        Storage.saveExamConfig(config);
        alert('Pengaturan berhasil disimpan.');
    };

    const addSubject = () => {
        if(newSubject && !availableSubjects.includes(newSubject)) {
            onUpdateSubjects([...availableSubjects, newSubject]);
            setNewSubject('');
        }
    };

    const removeSubject = (sub: string) => {
        if(confirm(`Hapus mata pelajaran ${sub}?`)) {
            onUpdateSubjects(availableSubjects.filter(s => s !== sub));
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100">
                <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><Settings className="text-indigo-600"/> Konfigurasi Utama</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Judul Ujian</label>
                        <input 
                            value={config.title}
                            onChange={e => setConfig({...config, title: e.target.value})}
                            className="w-full p-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Deskripsi</label>
                        <textarea 
                            value={config.description}
                            onChange={e => setConfig({...config, description: e.target.value})}
                            className="w-full p-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 outline-none h-24"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Durasi (Menit)</label>
                        <input 
                            type="number"
                            value={config.durationMinutes}
                            onChange={e => setConfig({...config, durationMinutes: Number(e.target.value)})}
                            className="w-full p-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 outline-none"
                        />
                    </div>
                    <div className="pt-4">
                        <h4 className="font-bold text-slate-800 mb-2">Jadwal Global (Opsional)</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Mulai</label>
                                <input 
                                    type="datetime-local"
                                    value={config.scheduledStart || ''}
                                    onChange={e => setConfig({...config, scheduledStart: e.target.value})}
                                    className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Selesai</label>
                                <input 
                                    type="datetime-local"
                                    value={config.scheduledEnd || ''}
                                    onChange={e => setConfig({...config, scheduledEnd: e.target.value})}
                                    className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                                />
                            </div>
                        </div>
                    </div>
                    <button onClick={handleSave} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 mt-4 flex items-center justify-center gap-2">
                        <Save size={18} /> Simpan Pengaturan
                    </button>
                </div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100">
                <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><BookOpen className="text-indigo-600"/> Mata Pelajaran</h3>
                
                <div className="flex gap-2 mb-6">
                    <input 
                        value={newSubject}
                        onChange={e => setNewSubject(e.target.value)}
                        placeholder="Nama Mapel Baru..."
                        className="flex-1 p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500"
                    />
                    <button onClick={addSubject} className="bg-emerald-600 text-white px-4 rounded-xl font-bold hover:bg-emerald-700"><Plus size={20}/></button>
                </div>

                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {availableSubjects.map(sub => (
                        <div key={sub} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <span className="font-bold text-slate-700">{sub}</span>
                            <button onClick={() => removeSubject(sub)} className="text-rose-500 hover:bg-rose-100 p-2 rounded-lg"><Trash2 size={16}/></button>
                        </div>
                    ))}
                    {availableSubjects.length === 0 && <p className="text-center text-slate-400 italic">Belum ada mata pelajaran.</p>}
                </div>
                
                <div className="mt-8 pt-6 border-t border-slate-100">
                     <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Calendar size={18}/> Jadwal Sesi Per Mapel</h4>
                     <p className="text-xs text-slate-500 mb-4">Atur jadwal spesifik agar siswa hanya bisa login ke mapel tertentu pada jam tertentu.</p>
                     
                     {/* Schedule Editor for Subjects */}
                     <div className="space-y-4">
                        {availableSubjects.map(sub => {
                            const schedule = config.subjectSchedules?.find(s => s.subject === sub) || {id: '', subject: sub, scheduledStart: '', scheduledEnd: ''};
                            return (
                                <div key={sub} className="p-3 border border-slate-200 rounded-xl bg-slate-50/50">
                                    <div className="font-bold text-indigo-900 mb-2">{sub}</div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input 
                                            type="datetime-local" 
                                            className="text-xs p-1.5 border rounded"
                                            value={schedule.scheduledStart}
                                            onChange={(e) => {
                                                const newSchedules = config.subjectSchedules ? [...config.subjectSchedules] : [];
                                                const idx = newSchedules.findIndex(s => s.subject === sub);
                                                const newItem = { ...schedule, subject: sub, scheduledStart: e.target.value, id: schedule.id || Date.now().toString() };
                                                
                                                if(idx >= 0) newSchedules[idx] = newItem;
                                                else newSchedules.push(newItem);
                                                
                                                setConfig({...config, subjectSchedules: newSchedules});
                                            }}
                                        />
                                        <input 
                                            type="datetime-local" 
                                            className="text-xs p-1.5 border rounded"
                                            value={schedule.scheduledEnd}
                                            onChange={(e) => {
                                                const newSchedules = config.subjectSchedules ? [...config.subjectSchedules] : [];
                                                const idx = newSchedules.findIndex(s => s.subject === sub);
                                                const newItem = { ...schedule, subject: sub, scheduledEnd: e.target.value, id: schedule.id || Date.now().toString() };
                                                
                                                if(idx >= 0) newSchedules[idx] = newItem;
                                                else newSchedules.push(newItem);
                                                
                                                setConfig({...config, subjectSchedules: newSchedules});
                                            }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                     </div>
                </div>
            </div>
        </div>
    );
}