"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Document {
  id: string;
  name: string;
  type: string;
}

interface AnalysisStep {
  id: string;
  agent: string;
  status: string;
  output: string | null;
  approved: boolean | null;
  createdAt: string;
}

interface Analysis {
  id: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  steps: AnalysisStep[];
}

export default function AnalyzePage() {
  const params = useParams();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [running, setRunning] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<Analysis | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchDocuments();
    fetchAnalyses();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [params.id]);

  async function fetchDocuments() {
    const res = await fetch(`/api/projects/${params.id}/documents`);
    const data = await res.json();
    setDocuments(data);
  }

  async function fetchAnalyses() {
    const res = await fetch(`/api/projects/${params.id}/memory`);
    const data = await res.json();
    setAnalyses(data.analyses);
  }

  async function startAnalysis() {
    if (!selectedDoc) return;

    setRunning(true);
    try {
      const createRes = await fetch(`/api/projects/${params.id}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentIds: [selectedDoc] }),
      });
      const { analysisId } = await createRes.json();

      await fetch(`/api/projects/${params.id}/analyze/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId, documentId: selectedDoc }),
      });

      pollAnalysis(analysisId);
    } catch (error) {
      console.error("Failed to start analysis:", error);
      setRunning(false);
    }
  }

  const pollAnalysis = useCallback(
    (analysisId: string) => {
      if (pollRef.current) clearInterval(pollRef.current);

      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(
            `/api/projects/${params.id}/analyze?analysisId=${analysisId}`
          );
          const analysis = await res.json();

          setCurrentAnalysis(analysis);

          if (analysis.status === "completed" || analysis.status === "failed") {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
            setRunning(false);
            fetchAnalyses();
          }
        } catch {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setRunning(false);
        }
      }, 5000);
    },
    [params.id]
  );

  function getStepIcon(agent: string) {
    switch (agent) {
      case "analyst": return "🔍";
      case "reviewer": return "✅";
      case "editor": return "📝";
      case "coverage": return "📊";
      default: return "❓";
    }
  }

  function getStepName(agent: string) {
    switch (agent) {
      case "analyst": return "Functional Analyst";
      case "reviewer": return "QA Reviewer";
      case "editor": return "Documentation Editor";
      case "coverage": return "Coverage Analysis";
      default: return agent;
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "running": return "bg-blue-100 text-blue-800";
      case "failed": return "bg-red-100 text-red-800";
      case "pending_approval": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Start New Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <select
              className="flex-1 p-2 border rounded-md"
              value={selectedDoc || ""}
              onChange={(e) => setSelectedDoc(e.target.value)}
            >
              <option value="">Select a document...</option>
              {documents.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name}
                </option>
              ))}
            </select>
            <Button
              onClick={startAnalysis}
              disabled={!selectedDoc || running}
            >
              {running ? "Running..." : "Start Analysis"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {currentAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Current Analysis</span>
              <Badge className={getStatusColor(currentAnalysis.status)}>
                {currentAnalysis.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {currentAnalysis.steps.map((step, index) => (
                <div key={step.id} className="flex items-center gap-4">
                  <div className="text-2xl">{getStepIcon(step.agent)}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{getStepName(step.agent)}</span>
                      <Badge className={getStatusColor(step.status)}>
                        {step.status}
                      </Badge>
                    </div>
                    {step.output && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {step.output.substring(0, 200)}...
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {analyses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Analysis History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analyses.map((analysis) => (
                <div
                  key={analysis.id}
                  className="border rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      {new Date(analysis.startedAt).toLocaleString()}
                    </span>
                    <Badge className={getStatusColor(analysis.status)}>
                      {analysis.status}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    {analysis.steps.map((step) => (
                      <Badge
                        key={step.id}
                        variant="outline"
                        className={getStatusColor(step.status)}
                      >
                        {getStepIcon(step.agent)} {step.agent}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
