"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ProjectStats {
  documents: number;
  analyses: number;
  completedAnalyses: number;
  totalSteps: number;
  memoryEntries: number;
}

export default function ProjectOverview() {
  const params = useParams();
  const [stats, setStats] = useState<ProjectStats | null>(null);

  useEffect(() => {
    fetch(`/api/projects/${params.id}/memory`)
      .then((res) => res.json())
      .then((data) => {
        setStats({
          documents: 0,
          analyses: data.stats.totalAnalyses,
          completedAnalyses: data.stats.completedAnalyses,
          totalSteps: data.stats.totalSteps,
          memoryEntries: data.stats.totalMemoryEntries,
        });
      })
      .catch(() => {
        setStats({
          documents: 0,
          analyses: 0,
          completedAnalyses: 0,
          totalSteps: 0,
          memoryEntries: 0,
        });
      });
  }, [params.id]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats?.documents ?? 0}</div>
          <p className="text-xs text-gray-500 mt-1">Uploaded files</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">Total Analyses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats?.analyses ?? 0}</div>
          <p className="text-xs text-gray-500 mt-1">
            <Badge variant={stats?.completedAnalyses === stats?.analyses ? "default" : "secondary"}>
              {stats?.completedAnalyses ?? 0} completed
            </Badge>
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">Pipeline Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats?.totalSteps ?? 0}</div>
          <p className="text-xs text-gray-500 mt-1">Agent executions</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">Memory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats?.memoryEntries ?? 0}</div>
          <p className="text-xs text-gray-500 mt-1">Stored insights</p>
        </CardContent>
      </Card>
    </div>
  );
}
