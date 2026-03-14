import React, { useState, useEffect } from 'react';
import Editor from './components/Editor';
import Preview from './components/Preview';
import QuestionBank from './components/QuestionBank';
import SavedExams from './components/SavedExams';
import Dashboard from './components/Dashboard';
import AIGenerator from './components/AIGenerator';
import BoardImporter from './components/BoardImporter';
import { ExamDetails, Question, Taxonomy, Exam } from './types';
import { FileText, Library, Eye, LogOut, LogIn, UserPlus, BookOpen, Save, FolderOpen, LayoutDashboard, Sparkles, Download } from 'lucide-react';
import { auth, db, googleProvider } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, onSnapshot, setDoc, deleteDoc, query, serverTimestamp, getDoc } from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [view, setView] = useState<'dashboard' | 'bank' | 'editor' | 'preview' | 'saved' | 'ai-generator' | 'board-importer'>('dashboard');
  
  // Auth state
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [examDetails, setExamDetails] = useState<ExamDetails>({
    institutionName: 'আপনার প্রতিষ্ঠানের নাম দিন',
    examName: 'বার্ষিক পরীক্ষা - ২০২৪',
    className: 'Class 10',
    subject: 'সাধারণ জ্ঞান (নমুনা)',
    fullMarks: '৩০',
    date: new Date().toLocaleDateString('bn-BD'),
    time: '৩০ মিনিট',
  });

  const [bank, setBank] = useState<Question[]>([]);
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [taxonomy, setTaxonomy] = useState<Taxonomy>({ classes: [], subjects: {}, chapters: {} });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      
      if (currentUser) {
        // Create user profile document if it doesn't exist
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName || currentUser.email?.split('@')[0],
              photoURL: currentUser.photoURL,
              createdAt: serverTimestamp()
            });
          } else {
            // Update display name and photo URL if they changed
            await setDoc(userRef, {
              displayName: currentUser.displayName || currentUser.email?.split('@')[0],
              photoURL: currentUser.photoURL,
            }, { merge: true });
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${currentUser.uid}`);
        }
      } else {
        setBank([]);
        setExamQuestions([]);
        setTaxonomy({ classes: [], subjects: {}, chapters: {} });
      }
    });
    return () => unsubscribe();
  }, []);

  const [remoteConfigStr, setRemoteConfigStr] = useState<string>('');

  useEffect(() => {
    if (!isAuthReady || !user) return;

    const questionsPath = `users/${user.uid}/questions`;
    const q = query(collection(db, questionsPath));
    
    const unsubscribeQuestions = onSnapshot(q, (snapshot) => {
      const questionsData: Question[] = [];
      snapshot.forEach((doc) => {
        questionsData.push(doc.data() as Question);
      });
      setBank(questionsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, questionsPath);
    });

    const configPath = `users/${user.uid}/examConfig/default`;
    const unsubscribeConfig = onSnapshot(doc(db, configPath), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Save stringified version to prevent infinite loops
        const newRemoteStr = JSON.stringify({
          examDetails: {
            institutionName: data.institutionName,
            examName: data.examName,
            className: data.className || '',
            subject: data.subject,
            fullMarks: data.fullMarks,
            date: data.date,
            time: data.time,
          },
          examQuestions: data.examQuestions || []
        });
        
        setRemoteConfigStr(newRemoteStr);
        
        setExamDetails({
          institutionName: data.institutionName,
          examName: data.examName,
          className: data.className || '',
          subject: data.subject,
          fullMarks: data.fullMarks,
          date: data.date,
          time: data.time,
        });
        if (data.examQuestions) {
          setExamQuestions(data.examQuestions);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, configPath);
    });

    const taxonomyPath = `users/${user.uid}/settings/taxonomy`;
    const unsubscribeTaxonomy = onSnapshot(doc(db, taxonomyPath), (docSnap) => {
      if (docSnap.exists()) {
        setTaxonomy(docSnap.data() as Taxonomy);
      } else {
        // Initialize if not exists
        setDoc(doc(db, taxonomyPath), { classes: [], subjects: {}, chapters: {} }).catch(e => console.error(e));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, taxonomyPath);
    });

    return () => {
      unsubscribeQuestions();
      unsubscribeConfig();
      unsubscribeTaxonomy();
    };
  }, [isAuthReady, user]);

  // Sync examQuestions when bank changes or when we need to load them
  // For simplicity, we manage examQuestions locally and save them to config
  useEffect(() => {
    if (!isAuthReady || !user) return;
    
    const currentLocalStr = JSON.stringify({ examDetails, examQuestions });
    if (currentLocalStr === remoteConfigStr) return; // Prevent saving if nothing changed locally
    
    const saveConfig = async () => {
      try {
        const configPath = `users/${user.uid}/examConfig/default`;
        await setDoc(doc(db, configPath), {
          ...examDetails,
          examQuestions: examQuestions,
          updatedAt: serverTimestamp()
        });
        setRemoteConfigStr(currentLocalStr);
      } catch (error) {
        // Ignore errors during rapid typing, but log them
        console.error("Failed to save config", error);
      }
    };
    
    const timeout = setTimeout(saveConfig, 1000);
    return () => clearTimeout(timeout);
  }, [examDetails, examQuestions, isAuthReady, user, remoteConfigStr]);

  const handleGoogleLogin = async () => {
    try {
      setAuthError('');
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error('Login failed:', error);
      setAuthError(error.message || 'Google sign in failed');
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      console.error('Auth failed:', error);
      setAuthError(error.message || 'Authentication failed');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleSetBank = async (newBankOrUpdater: React.SetStateAction<Question[]>) => {
    if (!user) return;
    setBank(newBankOrUpdater);
  };

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveExam = async () => {
    if (!user) return;
    const examId = crypto.randomUUID();
    const newExam: Exam = {
      id: examId,
      ...examDetails,
      examQuestions,
    };
    try {
      await setDoc(doc(db, `users/${user.uid}/exams/${examId}`), {
        ...newExam,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      showToast('Exam saved successfully!');
    } catch (error) {
      console.error('Error saving exam:', error);
      showToast('Failed to save exam.');
    }
  };

  const handleAddMultipleQuestions = async (questions: Question[]) => {
    if (!user) return;
    console.log(`Attempting to save ${questions.length} questions to Firestore...`);
    
    // Optimistic update
    setBank(prev => [...questions, ...prev]);
    
    // Save to Firestore
    try {
      const promises = questions.map(q => {
        const qRef = doc(db, `users/${user.uid}/questions/${q.id}`);
        return setDoc(qRef, {
          ...q,
          createdAt: serverTimestamp()
        });
      });
      await Promise.all(promises);
      console.log('Successfully saved all questions to Firestore.');
      showToast(`${questions.length} questions added to bank!`);
      setView('bank');
    } catch (error) {
      console.error("Error adding generated questions:", error);
      const newIds = new Set(questions.map(q => q.id));
      setBank(prev => prev.filter(q => !newIds.has(q.id)));
      showToast('Failed to add questions.');
      throw error; // Re-throw to be caught by the component
    }
  };

  const handleLoadExam = (exam: Exam) => {
    setExamDetails({
      institutionName: exam.institutionName,
      examName: exam.examName,
      className: exam.className,
      subject: exam.subject,
      fullMarks: exam.fullMarks,
      date: exam.date,
      time: exam.time,
    });
    setExamQuestions(exam.examQuestions);
    setView('editor');
    showToast('Exam loaded successfully!');
  };

  if (!isAuthReady) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white p-4">
        <div className="w-16 h-16 rounded-2xl bg-white text-black flex items-center justify-center font-bold text-3xl mb-6">
          E
        </div>
        <h1 className="text-3xl font-bold mb-2">ExamBuilder AI</h1>
        <p className="text-zinc-400 mb-8 text-center max-w-md">
          Create, manage, and export professional question papers. Sign in to save your question bank and exams to the cloud.
        </p>

        <div className="w-full max-w-sm bg-zinc-900 p-6 rounded-xl border border-zinc-800">
          <form onSubmit={handleEmailAuth} className="flex flex-col gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-600"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-600"
                required
              />
            </div>
            {authError && <p className="text-red-400 text-sm">{authError}</p>}
            <button
              type="submit"
              className="w-full bg-zinc-800 text-white px-4 py-2 rounded-lg font-medium hover:bg-zinc-700 transition-colors mt-2"
            >
              {authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-zinc-800"></div>
            <span className="text-sm text-zinc-500">OR</span>
            <div className="flex-1 h-px bg-zinc-800"></div>
          </div>

          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white text-black px-4 py-2 rounded-lg font-medium hover:bg-zinc-200 transition-colors"
          >
            <LogIn size={20} />
            Continue with Google
          </button>

          <p className="text-center text-sm text-zinc-500 mt-6">
            {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              className="text-white hover:underline"
            >
              {authMode === 'login' ? 'Register' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col no-print">
        <div className="p-6 flex items-center gap-3 border-b border-zinc-800">
          <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center font-bold text-xl shadow-lg">
            E
          </div>
          <span className="text-xl font-bold tracking-tight">ExamBuilder</span>
        </div>
        
        <div className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button
            onClick={() => setView('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              view === 'dashboard' ? 'bg-white text-black shadow-lg shadow-white/5' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <LayoutDashboard size={18} />
            Dashboard
          </button>
          <button
            onClick={() => setView('bank')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              view === 'bank' ? 'bg-white text-black shadow-lg shadow-white/5' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Library size={18} />
            Question Bank
          </button>
          <button
            onClick={() => setView('board-importer')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              view === 'board-importer' ? 'bg-white text-black shadow-lg shadow-white/5' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Download size={18} />
            Board Importer
          </button>
          <button
            onClick={() => setView('ai-generator')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              view === 'ai-generator' ? 'bg-white text-black shadow-lg shadow-white/5' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Sparkles size={18} />
            AI Generator
          </button>
          <button
            onClick={() => setView('editor')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              view === 'editor' ? 'bg-white text-black shadow-lg shadow-white/5' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <FileText size={18} />
            Exam Editor
          </button>
          <button
            onClick={() => setView('preview')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              view === 'preview' ? 'bg-white text-black shadow-lg shadow-white/5' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Eye size={18} />
            Preview & Export
          </button>
          <button
            onClick={() => setView('saved')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              view === 'saved' ? 'bg-white text-black shadow-lg shadow-white/5' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <FolderOpen size={18} />
            Saved Exams
          </button>
        </div>

        <div className="p-4 border-t border-zinc-800">
          <div className="flex items-center gap-3 p-3 bg-zinc-950 rounded-xl border border-zinc-800 mb-3">
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full ring-2 ring-zinc-800" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold">
                {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{user.displayName || user.email?.split('@')[0]}</p>
              <p className="text-xs text-zinc-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all text-sm font-medium"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative bg-zinc-950">
        {toastMessage && (
          <div className="fixed top-6 right-6 bg-zinc-800 text-white px-6 py-3 rounded-xl shadow-2xl border border-zinc-700 z-50 animate-in fade-in slide-in-from-top-4 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {toastMessage}
          </div>
        )}
        <div className="max-w-7xl mx-auto">
          {view === 'dashboard' && (
            <Dashboard
              userUid={user.uid}
              userName={user.displayName || user.email?.split('@')[0] || 'Teacher'}
              bank={bank}
              taxonomy={taxonomy}
              onNavigate={setView}
              onLoadExam={handleLoadExam}
            />
          )}
          {view === 'bank' && (
            <QuestionBank
              bank={bank}
              setBank={handleSetBank}
              examQuestions={examQuestions}
              setExamQuestions={setExamQuestions}
              userUid={user.uid}
              taxonomy={taxonomy}
              onNavigate={setView}
            />
          )}
          {view === 'ai-generator' && (
            <AIGenerator
              taxonomy={taxonomy}
              userUid={user.uid}
              onAddQuestions={handleAddMultipleQuestions}
              onClose={() => setView('bank')}
            />
          )}
          {view === 'board-importer' && (
            <BoardImporter
              taxonomy={taxonomy}
              userUid={user.uid}
              onAddQuestions={handleAddMultipleQuestions}
              onClose={() => setView('bank')}
            />
          )}
          {view === 'editor' && (
            <Editor
              examDetails={examDetails}
              setExamDetails={setExamDetails}
              questions={examQuestions}
              setQuestions={setExamQuestions}
              onPreview={() => setView('preview')}
              onSave={handleSaveExam}
            />
          )}
          {view === 'preview' && (
            <Preview
              examDetails={examDetails}
              questions={examQuestions}
              onBack={() => setView('editor')}
              onSave={handleSaveExam}
            />
          )}
          {view === 'saved' && (
            <SavedExams
              userUid={user.uid}
              onLoadExam={handleLoadExam}
            />
          )}
        </div>
      </main>
    </div>
  );
}
