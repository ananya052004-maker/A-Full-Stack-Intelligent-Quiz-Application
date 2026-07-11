import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './components/Home';
import CategorySelect from './components/CategorySelect';
import Quiz from './components/Quiz';
import Scoreboard from './components/Scoreboard';
import Login from './components/Login';
import FeaturePage from './components/FeaturePage';
import PollCreate from './components/poll/PollCreate';
import PollView from './components/poll/PollView';
import QnaCreate from './components/qna/QnaCreate';
import QnaBoard from './components/qna/QnaBoard';
import SurveyCreate from './components/survey/SurveyCreate';
import SurveyView from './components/survey/SurveyView';
import WordCloudCreate from './components/wordcloud/WordCloudCreate';
import WordCloudView from './components/wordcloud/WordCloudView';
import PresentationCreate from './components/presentation/PresentationCreate';
import PresentationEdit from './components/presentation/PresentationEdit';
import PresentationPresent from './components/presentation/PresentationPresent';
import PresentationView from './components/presentation/PresentationView';
import ChooseRole from './components/auth/ChooseRole';
import TeacherDashboard from './components/teacher/TeacherDashboard';
import QuestionBank from './components/teacher/QuestionBank';
import QuizBuilder from './components/teacher/QuizBuilder';
import TakeQuiz from './components/TakeQuiz';
import QuizList from './components/QuizList';
import features from './data/features';
import { useAuth } from './context/AuthContext';

// Gate teacher-only pages. Students/guests get a friendly nudge instead.
function RequireTeacher({ children }) {
  const { user, loading, isTeacher, login } = useAuth();
  if (loading) return <div className="py-20 text-center text-slate-500">Loading…</div>;
  if (!isTeacher) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center sm:px-6">
        <div className="text-5xl">🔒</div>
        <h1 className="mt-4 text-2xl font-extrabold text-slateink">Teachers only</h1>
        <p className="mt-2 text-slate-600">
          {user
            ? 'This area is for teacher accounts. Ask an admin if you need access.'
            : 'Sign in with a teacher account to manage the question bank and build quizzes.'}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          {!user && (
            <button onClick={login} className="rounded-lg bg-quorum-500 px-6 py-3 font-semibold text-white">
              Sign In
            </button>
          )}
          <Link to="/" className="rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slateink">
            Back home
          </Link>
        </div>
      </div>
    );
  }
  return children;
}

function App() {
  const { needsRole } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1">
        {needsRole ? (
          // Logged in but hasn't picked a role yet — block everything until they do.
          <ChooseRole />
        ) : (
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Home />} />
            <Route path="/category" element={<CategorySelect />} />
            <Route path="/quiz/:category" element={<Quiz />} />
            <Route path="/scoreboard" element={<Scoreboard />} />

            {/* Quizzes hub + taking a teacher-made quiz (public, link-shareable) */}
            <Route path="/quizzes" element={<QuizList />} />
            <Route path="/take/:id" element={<TakeQuiz />} />

            {/* Teacher-only area */}
            <Route path="/teacher" element={<RequireTeacher><TeacherDashboard /></RequireTeacher>} />
            <Route path="/teacher/questions" element={<RequireTeacher><QuestionBank /></RequireTeacher>} />
            <Route path="/teacher/quizzes/new" element={<RequireTeacher><QuizBuilder /></RequireTeacher>} />

            {/* Poll */}
            <Route path="/features/poll" element={<PollCreate />} />
            <Route path="/features/poll/:id" element={<PollView />} />

            {/* Q&A */}
            <Route path="/features/qna" element={<QnaCreate />} />
            <Route path="/features/qna/:id" element={<QnaBoard />} />

            {/* Survey */}
            <Route path="/features/survey" element={<SurveyCreate />} />
            <Route path="/features/survey/:id" element={<SurveyView />} />

            {/* Word Cloud */}
            <Route path="/features/word-cloud" element={<WordCloudCreate />} />
            <Route path="/features/word-cloud/:id" element={<WordCloudView />} />

            {/* Presentations */}
            <Route path="/features/presentations" element={<PresentationCreate />} />
            <Route path="/features/presentations/:id/edit" element={<PresentationEdit />} />
            <Route path="/features/presentations/:id/present" element={<PresentationPresent />} />
            <Route path="/features/presentations/:id" element={<PresentationView />} />

            {/* Remaining roadmap features render a polished "coming soon" view */}
            {features
              .filter((f) => f.path.startsWith('/features/') && !f.ready)
              .map((f) => (
                <Route key={f.key} path={f.path} element={<FeaturePage feature={f} />} />
              ))}
          </Routes>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default App;
