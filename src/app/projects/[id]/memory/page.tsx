"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MemoryEntry {
  id: string;
  type: string;
  content: string;
  createdAt: string;
}

interface AnalysisStep {
  id: string;
  agent: string;
  status: string;
  output: string | null;
  approved: boolean | null;
}

interface Analysis {
  id: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  steps: AnalysisStep[];
}

interface Stats {
  totalAnalyses: number;
  completedAnalyses: number;
  totalSteps: number;
  totalMemoryEntries: number;
}

export default function MemoryPage() {
  const params = useParams();
  const [memory, setMemory] = useState<MemoryEntry[]>([]);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetchMemory();
  }, [params.id]);

  async function fetchMemory() {
    const res = await fetch(`/api/projects/${params.id}/memory`);
    const data = await res.json();
    setMemory(data.memory);
    setAnalyses(data.analyses);
    setStats(data.stats);
  }

  function getStepIcon(agent: string) {
    switch (agent) {
      case "analyst": return "🔍";
      case "reviewer": return "✅";
      case "editor": return "📝";
      case "coverage": return "📊";
      default: return "❓";
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
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{stats.totalAnalyses}</div>
              <p className="text-sm text-gray-500">Total Analyses</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {stats.completedAnalyses}
              </div>
              <p className="text-sm text-gray-500">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{stats.totalSteps}</div>
              <p className="text-sm text-gray-500">Pipeline Steps</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{stats.totalMemoryEntries}</div>
              <p className="text-sm text-gray-500">Memory Entries</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="memory">Memory Store</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          {analyses.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                No analyses yet. Start your first analysis to see the timeline.
              </CardContent>
            </Card>
          ) : (
            analyses.map((analysis) => (
              <Card key={analysis.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-lg">
                    <span>
                      Analysis {analysis.id.substring(0, 8)}...
                    </span>
                    <Badge className={getStatusColor(analysis.status)}>
                      {analysis.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analysis.steps.map((step, index) => (
                      <div key={step.id} className="flex items-start gap-3">
                        <div className="text-xl">{getStepIcon(step.agent)}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium capitalize">
                              {step.agent}
                            </span>
                            <Badge
                              variant="outline"
                              className={getStatusColor(step.status)}
                            >
                              {step.status}
                            </Badge>
                            {step.approved !== null && (
                              <Badge
                                variant={step.approved ? "default" : "destructive"}
                              >
                                {step.approved ? "Approved" : "Rejected"}
                              </Badge>
                            )}
                          </div>
                          {step.output && (
                            <p className="text-sm text-gray-500 mt-1">
                              {step.output.substring(0, 300)}...
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="memory" className="space-y-4">
          {memory.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                No memory entries yet. Complete an analysis to populate memory.
              </CardContent>
            </Card>
          ) : (
            memory.map((entry) => (
              <Card key={entry.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary">{entry.type}</Badge>
                    <span className="text-sm text-gray-500">
                      {new Date(entry.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">
                    {entry.content.substring(0, 500)}...
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
