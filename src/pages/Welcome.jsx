import { Link } from "react-router-dom";
import Logo, { BRAND } from "../components/Logo";
import Footer from "../components/Footer";
import { btnClass } from "../components/ui";

const advantages = [
  {
    title: "Smart intervals",
    text: "Rate every card Again, Hard, Good or Easy. The next review is scheduled for you, from minutes to months.",
  },
  {
    title: "Your library, everywhere",
    text: "Decks, cards and progress are saved to your account, so you can pick up on any device.",
  },
  {
    title: "Hear every word",
    text: "Tap the speaker to listen to the pronunciation while you study, with translation and example sentences.",
  },
];

const steps = [
  {
    title: "Build a deck",
    text: "Add the words you meet, one by one or pasted in from a list you already keep.",
  },
  {
    title: "Answer honestly",
    text: "Flip the card, then say how well you knew it. Guessing right is not the same as knowing.",
  },
  {
    title: "Come back daily",
    text: "Each word returns right before you would forget it, so a short session is enough.",
  },
];

export default function Welcome() {
  return (
    <div className="min-h-screen bg-night text-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8">
        <Logo className="text-3xl" />
        <Link to="/login" className={btnClass("primary")}>
          Get started →
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="grid items-center gap-12 py-16 md:grid-cols-2 md:py-24">
          <div>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Remembering is easier with{" "}
              <span className="text-leaf">{BRAND}</span>
            </h1>
            <p className="mt-6 max-w-lg text-xl leading-relaxed">
              {BRAND} is a flashcard app that helps you spend more time on
              challenging words and less on what you already know.
            </p>
            <Link
              to="/login"
              className={btnClass("primary", "mt-8 px-10 py-4 text-lg")}
            >
              Get started →
            </Link>
          </div>

          {/* Namuna karta */}
          <div
            className="glass mx-auto hidden w-full max-w-sm rounded-3xl p-8 md:block"
            aria-hidden="true"
          >
            <p className="text-sm text-mist">Term</p>
            <p className="mt-1 text-4xl font-extrabold">mitigate</p>
            <p className="mt-6 text-lg">to make something less severe</p>
            <p className="mt-1 font-semibold text-leaf">yengillashtirmoq</p>
            <div className="mt-8 grid grid-cols-4 gap-2 text-center text-xs">
              {[
                ["Again", "1 min"],
                ["Hard", "5 min"],
                ["Good", "1 d"],
                ["Easy", "4 d"],
              ].map(([l, t]) => (
                <div
                  key={l}
                  className="rounded-xl border border-white/10 bg-white/5 py-2"
                >
                  <p className="font-bold">{l}</p>
                  <p className="text-mist">{t}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="advantages" className="scroll-mt-8 py-8">
          <h2 className="text-center text-3xl font-extrabold">Advantages</h2>
          <p className="mt-3 text-center">
            Here are a few reasons why users love {BRAND}.
          </p>
          <div className="mt-14 grid gap-10 md:grid-cols-3">
            {advantages.map((a) => (
              <div key={a.title}>
                <h3 className="text-xl font-extrabold">{a.title}</h3>
                <p className="mt-1 text-mist">{a.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-8 py-24">
          <h2 className="text-center text-3xl font-extrabold">How it works</h2>
          <ol className="mt-14 grid gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title} className="glass rounded-3xl p-7">
                <p className="text-sm font-bold text-leaf">Step {i + 1}</p>
                <h3 className="mt-2 text-xl font-extrabold">{s.title}</h3>
                <p className="mt-2 text-mist">{s.text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-12 text-center">
            <Link
              to="/signup"
              className={btnClass("primary", "px-10 py-4 text-lg")}
            >
              Create your account
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
