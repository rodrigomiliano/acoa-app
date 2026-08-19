"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Project {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    fetch(`/api/projects`)
      .then((res) => res.json())
      .then((projects) => {
        const found = projects.find((p: Project) => p.id === params.id);
        setProject(found);
      });
  }, [params.id]);

  if (!project) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <a href="/" className="text-blue-600 hover:text-blue-800 text-sm mb-2 inline-block">
          ← Back to Dashboard
        </a>
        <h2 className="text-2xl font-bold text-gray-900">{project.name}</h2>
        {project.description && (
          <p className="text-gray-500 mt-1">{project.description}</p>
        )}
      </div>
      
      <nav className="flex gap-2 mb-8 border-b border-gray-200 pb-4">
        <a
          href={`/projects/${project.id}`}
          className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100"
        >
          Overview
        </a>
        <a
          href={`/projects/${project.id}/documents`}
          className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100"
        >
          Documents
        </a>
        <a
          href={`/projects/${project.id}/analyze`}
          className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100"
        >
          Analyze
        </a>
        <a
          href={`/projects/${project.id}/chat`}
          className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100"
        >
          Chat
        </a>
        <a
          href={`/projects/${project.id}/memory`}
          className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100"
        >
          Memory
        </a>
      </nav>

      {children}
    </div>
  );
}
