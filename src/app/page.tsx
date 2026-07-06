"use client";

import { useState } from "react";

interface ExecuteSuccessResponse {
  success: true;
  response: string;
}

interface ExecuteErrorResponse {
  success: false;
  error: string;
}

type ExecuteResponse = ExecuteSuccessResponse | ExecuteErrorResponse;

export default function Home() {
  const [prompt, setPrompt] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [response, setResponse] = useState<string>("");
  const [error, setError] = useState<string>("");

  const workforce = [
    { name: "Executive Assistant", status: "Ready" },
    { name: "Software Engineer", status: "Offline" },
    { name: "Graphic Designer", status: "Offline" },
    { name: "Content Creator", status: "Offline" },
  ];

  const handleExecute = async (): Promise<void> => {
    if (prompt.trim().length === 0) {
      setError("Prompt must not be empty.");
      return;
    }

    setLoading(true);
    setError("");
    setResponse("");

    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = (await res.json()) as ExecuteResponse;

      if (!res.ok || !data.success) {
        setError(
          !data.success ? data.error : "Execution failed. Please try again."
        );
        return;
      }

      setResponse(data.response);
    } catch {
      setError("Failed to reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full bg-neutral-950 text-neutral-100 px-6 py-8 sm:px-10 sm:py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-16">
        <header>
          <p className="text-lg font-semibold tracking-tight text-neutral-100">
            KDOS
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            KyleDev Operating System
          </p>
        </header>

        <section>
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-50 sm:text-4xl">
            Welcome, Kyle.
          </h1>
          <p className="mt-3 text-base text-neutral-400 sm:text-lg">
            Your digital workforce is ready.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {workforce.map((employee) => (
            <div
              key={employee.name}
              className="rounded-xl border border-neutral-800 bg-neutral-900 p-5"
            >
              <p className="text-sm font-medium text-neutral-100">
                {employee.name}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    employee.status === "Ready"
                      ? "bg-emerald-500"
                      : "bg-neutral-600"
                  }`}
                />
                <p className="text-xs text-neutral-500">
                  Status: {employee.status}
                </p>
              </div>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-medium tracking-tight text-neutral-100">
            Agency Command
          </h2>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Describe what you want KyleDev to do..."
            rows={4}
            className="w-full resize-none rounded-xl border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-600 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleExecute}
            disabled={loading}
            className="w-full rounded-xl bg-neutral-100 px-6 py-3 text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-300 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:self-start"
          >
            {loading ? "Thinking..." : "Execute"}
          </button>
        </section>

        <section className="flex flex-col gap-4 pb-8">
          <h2 className="text-sm font-medium tracking-tight text-neutral-100">
            Workforce Response
          </h2>
          <div className="min-h-[140px] rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            {error ? (
              <p className="text-sm text-red-400">{error}</p>
            ) : response ? (
              <p className="whitespace-pre-wrap text-sm text-neutral-200">
                {response}
              </p>
            ) : (
              <p className="text-sm text-neutral-600">
                Waiting for instructions...
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}