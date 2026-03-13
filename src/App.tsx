import React, { useState, useEffect } from 'react';
import Editor from './components/Editor';
import Preview from './components/Preview';
import QuestionBank from './components/QuestionBank';
import SavedExams from './components/SavedExams';
import Dashboard from './components/Dashboard';
import { ExamDetails, Question, Taxonomy, Exam } from './types';
import { FileText, Library, Eye, LogOut, LogIn, UserPlus, BookOpen, Save, FolderOpen, LayoutDashboard } from 'lucide-react';
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
  const [view, setView] = useState<'dashboard' | 'bank' | 'editor' | 'preview' | 'saved'>('dashboard');
  
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
    setExamQuestions(exam.examQuestions || []);
    setView('editor');
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
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans flex flex-col">
      {/* Top Navigation */}
      <nav className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between shadow-sm no-print">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center font-bold">
            E
          </div>
          <span className="text-xl font-bold tracking-tight hidden sm:inline">ExamBuilder AI</span>
        </div>
        <div className="flex bg-zinc-950 rounded-lg p-1 border border-zinc-800 overflow-x-auto">
          <button
            onClick={() => setView('dashboard')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              view === 'dashboard' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <LayoutDashboard size={16} />
            <span className="hidden sm:inline">Dashboard</span>
          </button>
          <button
            onClick={() => setView('bank')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              view === 'bank' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Library size={16} />
            <span className="hidden sm:inline">Question Bank</span>
          </button>
          <button
            onClick={() => setView('editor')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              view === 'editor' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <FileText size={16} />
            <span className="hidden sm:inline">Exam Editor</span>
          </button>
          <button
            onClick={() => setView('preview')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              view === 'preview' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Eye size={16} />
            <span className="hidden sm:inline">Preview & Export</span>
          </button>
          <button
            onClick={() => setView('saved')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              view === 'saved' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <FolderOpen size={16} />
            <span className="hidden sm:inline">Saved Exams</span>
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-sm text-zinc-400">
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="w-6 h-6 rounded-full bg-zinc-800" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs">
                {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
              </div>
            )}
            <span className="truncate max-w-[100px]">{user.displayName || user.email?.split('@')[0]}</span>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            title="Sign out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        {toastMessage && (
          <div className="absolute top-4 right-4 bg-zinc-800 text-white px-4 py-2 rounded-lg shadow-lg border border-zinc-700 z-50 animate-in fade-in slide-in-from-top-4">
            {toastMessage}
          </div>
        )}
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
      </main>
    </div>
  );
}
