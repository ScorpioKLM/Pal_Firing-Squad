import React, { useMemo, useState } from "react";
import { QUESTIONS } from "./questions";
import { buildCompatibilityReport } from "./compatibility";
import "./style.css";

const OWNER_EMAIL = "your-email@example.com";

function makeBlankAnswers() {
  return QUESTIONS.map(() => "");
}

function saveSubmission(payload) {
  const all = JSON.parse(localStorage.getItem("compatibilitySubmissions") || "[]");
  all.unshift(payload);
  localStorage.setItem("compatibilitySubmissions", JSON.stringify(all));
}

function loadSubmissions() {
  return JSON.parse(localStorage.getItem("compatibilitySubmissions") || "[]");
}

function notifyOwner(payload) {
  const subject = encodeURIComponent(`New Compatibility Questionnaire from ${payload.friendName}`);
  const body = encodeURIComponent(
    `${payload.friendName} completed the questionnaire.\n\nOpen the admin side of the app to answer your portion and generate the report.\n\nNote: This starter app saves demo submissions in browser localStorage. Connect EmailJS, Firebase, Supabase, or Formspree for live production notifications.`
  );
  window.location.href = `mailto:${OWNER_EMAIL}?subject=${subject}&body=${body}`;
}

export default function App() {
  const [mode, setMode] = useState("home");
  const [friendName, setFriendName] = useState("");
  const [friendAnswers, setFriendAnswers] = useState(makeBlankAnswers);
  const [yourAnswers, setYourAnswers] = useState(makeBlankAnswers);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [consent, setConsent] = useState(false);
  const submissions = useMemo(() => loadSubmissions(), [mode]);

  const report = selectedSubmission
    ? buildCompatibilityReport(QUESTIONS, selectedSubmission.answers, yourAnswers)
    : null;

  function submitFriendForm() {
    if (!friendName.trim()) {
      alert("Please enter your name.");
      return;
    }
    if (!consent) {
      alert("Please confirm consent before continuing.");
      return;
    }
    const payload = {
      id: crypto.randomUUID(),
      friendName: friendName.trim(),
      createdAt: new Date().toISOString(),
      answers: friendAnswers
    };
    saveSubmission(payload);
    notifyOwner(payload);
    setMode("submitted");
  }

  function selectSubmission(submission) {
    setSelectedSubmission(submission);
    setYourAnswers(makeBlankAnswers());
    setMode("ownerAnswer");
  }

  function downloadReport() {
    const blob = new Blob([JSON.stringify({ friend: selectedSubmission, yourAnswers, report }, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedSubmission.friendName}-compatibility-report.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main>
      <section className="hero">
        <div>
          <p className="eyebrow">Friendship Compatibility App</p>
          <h1>Find out whether the vibe is aligned or just emotionally wearing a fake mustache.</h1>
          <p className="sub">
            Your friend answers first. You get notified. Then you answer your side and generate a comprehensive compatibility report.
          </p>
        </div>
        <div className="heroCard">
          <button onClick={() => setMode("friend")}>Friend Questionnaire</button>
          <button className="secondary" onClick={() => setMode("admin")}>Owner Dashboard</button>
        </div>
      </section>

      {mode === "home" && (
        <section className="card">
          <h2>How it works</h2>
          <ol>
            <li>Send your friend the questionnaire link.</li>
            <li>They complete their portion and submit it.</li>
            <li>You receive a notification.</li>
            <li>You answer the same questions from your side.</li>
            <li>The app compares both answer sets and creates a compatibility breakdown.</li>
          </ol>
        </section>
      )}

      {mode === "friend" && (
        <section className="card">
          <h2>Friend Questionnaire</h2>
          <label>
            Your name
            <input value={friendName} onChange={e => setFriendName(e.target.value)} placeholder="Name" />
          </label>

          <div className="notice">
            <strong>Consent notice:</strong> This questionnaire includes personal, values-based, political, religious, health, and mental health questions.
            Answer only what you are comfortable sharing. You may type “prefer not to answer” anywhere.
          </div>

          <label className="check">
            <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
            I understand and consent to answering these questions voluntarily.
          </label>

          <QuestionList answers={friendAnswers} setAnswers={setFriendAnswers} />
          <button onClick={submitFriendForm}>Submit My Answers</button>
        </section>
      )}

      {mode === "submitted" && (
        <section className="card success">
          <h2>Submitted</h2>
          <p>Your answers have been saved. The owner can now complete their side and generate the comparison.</p>
          <button onClick={() => setMode("home")}>Back Home</button>
        </section>
      )}

      {mode === "admin" && (
        <section className="card">
          <h2>Owner Dashboard</h2>
          {submissions.length === 0 ? (
            <p>No submissions yet.</p>
          ) : (
            <div className="submissionGrid">
              {submissions.map(s => (
                <button className="submission" key={s.id} onClick={() => selectSubmission(s)}>
                  <strong>{s.friendName}</strong>
                  <span>{new Date(s.createdAt).toLocaleString()}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {mode === "ownerAnswer" && selectedSubmission && (
        <section className="card">
          <h2>Your Answers for {selectedSubmission.friendName}</h2>
          <QuestionList answers={yourAnswers} setAnswers={setYourAnswers} />
          <button onClick={() => setMode("report")}>Generate Compatibility Report</button>
        </section>
      )}

      {mode === "report" && report && (
        <section className="card report">
          <h2>Compatibility Report: {selectedSubmission.friendName}</h2>
          <div className="score">{report.overall}%</div>
          <p className="verdict">{report.verdict}</p>

          <div className="pillRow">
            {report.topStrengths.map(s => <span className="pill good" key={s}>Strength: {s}</span>)}
            {report.growthZones.map(s => <span className="pill warn" key={s}>Discuss: {s}</span>)}
          </div>

          {report.categorySummaries.map(category => (
            <details key={category.category} open>
              <summary>{category.category.toUpperCase()} • {category.average}%</summary>
              <h3>Strongest alignment</h3>
              {category.strongest.map((item, i) => <ComparisonBlock item={item} key={`s-${i}`} />)}
              <h3>Needs conversation</h3>
              {category.tension.map((item, i) => <ComparisonBlock item={item} key={`t-${i}`} />)}
            </details>
          ))}

          <button onClick={downloadReport}>Download JSON Report</button>
        </section>
      )}
    </main>
  );
}

function QuestionList({ answers, setAnswers }) {
  return (
    <div className="questions">
      {QUESTIONS.map((q, index) => (
        <label key={q}>
          <span>{index + 1}. {q}</span>
          <textarea
            value={answers[index]}
            onChange={e => {
              const next = [...answers];
              next[index] = e.target.value;
              setAnswers(next);
            }}
            placeholder="Type your answer here..."
          />
        </label>
      ))}
    </div>
  );
}

function ComparisonBlock({ item }) {
  return (
    <div className="comparison">
      <p><strong>{item.question}</strong></p>
      <div className="twoCol">
        <div><span>Friend</span><p>{item.friend || "No answer"}</p></div>
        <div><span>You</span><p>{item.you || "No answer"}</p></div>
      </div>
      <small>Compatibility signal: {item.score}%</small>
    </div>
  );
}
