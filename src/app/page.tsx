"use client";

import { useState } from "react";

export default function Home() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [agentName, setAgentName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setAnswer("");
    setAgentName("");

    try {
      const res = await fetch("/api/router", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch response");
      }

      setAnswer(data.answer);
      setAgentName(data.agentName || "None");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-8 font-sans">
      <main className="w-full max-w-2xl bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-700">
        <h1 className="text-3xl font-bold text-blue-400 mb-2">Studio Router AI</h1>
        <p className="text-gray-400 mb-8">Ask a question and the router will forward it to the right specialist.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div>
            <label htmlFor="question" className="block text-sm font-medium text-gray-300 mb-2">
              How can we help you?
            </label>
            <textarea
              id="question"
              placeholder="I have a question about my overdue invoice..."
              rows={4}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-100 placeholder-gray-500 resize-none"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? "Routing request..." : "Submit"}
          </button>
        </form>

        {error && (
          <div className="mt-6 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {answer && (
          <div className="mt-8 p-6 bg-gray-900 border border-gray-700 rounded-lg">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">Response</h2>
            <div className="text-gray-200 whitespace-pre-wrap leading-relaxed mb-4">
              {answer}
            </div>
            
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Attribution: <span className="text-blue-400">{agentName}</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
