import { Navigate, Route, Routes } from "react-router-dom";
import { isConfigured } from "./lib/supabase";
import { ProtectedRoute, PublicOnly } from "./components/Guards";
import AppLayout from "./components/AppLayout";
import Welcome from "./pages/Welcome";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Folders from "./pages/Folders";
import DeckDetail from "./pages/DeckDetail";
import Flashcards from "./pages/Flashcards";
import FlashcardSession from "./pages/FlashcardSession";
import Profile from "./pages/Profile";
import CreateDeck from "./pages/CreateDeck";
import FolderDetail from "./pages/FolderDetail";
import FolderExam from "./pages/FolderExam";
import Info from "./pages/Info";
import AuthCallback from "./pages/AuthCallback";
import ResetPassword from "./pages/ResetPassword";
import StudyLayout from "./components/StudyLayout";
import StudyLearn from "./pages/StudyLearn";
import StudyMatch from "./pages/StudyMatch";
import StudyTest from "./pages/StudyTest";
import StudyWrite from "./pages/StudyWrite";

function MissingConfig() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-night p-6 text-white">
      <div className="glass max-w-lg rounded-3xl p-8">
        <h1 className="text-2xl font-extrabold">
          Supabase is not connected yet
        </h1>
        <p className="mt-3 text-mist">
          Create a <code className="rounded bg-white/10 px-1">.env</code> file
          in the project root with
          <code className="mx-1 rounded bg-white/10 px-1">
            VITE_SUPABASE_URL
          </code>{" "}
          and
          <code className="mx-1 rounded bg-white/10 px-1">
            VITE_SUPABASE_ANON_KEY
          </code>
          , then restart
          <code className="mx-1 rounded bg-white/10 px-1">npm run dev</code>.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  if (!isConfigured) return <MissingConfig />;
  return (
    <Routes>
      <Route element={<PublicOnly />}>
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<Auth key="login" mode="login" />} />
        <Route path="/signup" element={<Auth key="signup" mode="signup" />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/home" element={<Home />} />
          <Route path="/folders" element={<Folders />} />
          <Route path="/folders/:folderId" element={<FolderDetail />} />
          <Route path="/folders/:folderId/exam" element={<FolderExam />} />
          <Route path="/library/:folderId" element={<FolderDetail />} />
          <Route path="/flashcards" element={<Flashcards />} />
          <Route path="/flashcards/deck/:deckId" element={<DeckDetail />} />
          <Route element={<StudyLayout />}>
            <Route
              path="/flashcards/study/:deckId"
              element={<FlashcardSession />}
            />
            <Route
              path="/flashcards/study/:deckId/standard"
              element={<FlashcardSession />}
            />
            <Route
              path="/flashcards/study/:deckId/learn"
              element={<StudyLearn />}
            />
            <Route
              path="/flashcards/study/:deckId/match"
              element={<StudyMatch />}
            />
            <Route
              path="/flashcards/study/:deckId/test"
              element={<StudyTest />}
            />
            <Route
              path="/flashcards/study/:deckId/write"
              element={<StudyWrite />}
            />
          </Route>
          <Route path="/create-deck" element={<CreateDeck />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Route>

      {/* Google va emaildagi havolalardan qaytish: sessiya bo'lsa ham ochiladi */}
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Hamma uchun ochiq sahifalar */}
      <Route path="/about" element={<Info key="about" page="about" />} />
      <Route path="/help" element={<Info key="help" page="help" />} />
      <Route path="/contact" element={<Info key="contact" page="contact" />} />
      <Route path="/privacy" element={<Info key="privacy" page="privacy" />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
