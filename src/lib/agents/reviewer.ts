import { generateJSON } from "@/lib/llm";
import { AnalystOutput } from "./analyst";

export interface ReviewerOutput {
  validatedIssues: ValidatedIssue[];
  rejectedIssues: RejectedIssue[];
  newIssues: NewIssue[];
  confidence: number;
  summary: string;
}

export interface ValidatedIssue {
  id: string;
  originalId: string;
  confirmation: string;
  additionalContext?: string;
}

export interface RejectedIssue {
  id: string;
  originalId: string;
  reason: string;
}

export interface NewIssue {
  id: string;
  type: "bug" | "missing" | "inconsistent" | "ambiguous";
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  location: string;
  recommendation: string;
}

const SYSTEM_PROMPT = `You are a QA Reviewer agent in a QA automation pipeline.

Your role is to validate, reject, or enhance the analysis produced by the Functional Analyst.

ANTI-HALLUCINATION RULES:
- ONLY validate issues that are clearly supported by the document
- NEVER confirm issues that are assumptions or interpretations
- NEVER invent new issues not supported by evidence
- ALWAYS provide specific reasoning for validation or rejection
- If an issue is partially valid, note what parts are confirmed

OUTPUT SCHEMA (JSON):
{
  "validatedIssues": [
    {
      "id": "VAL-001",
      "originalId": "ISS-001",
      "confirmation": "Why this issue is valid",
      "additionalContext": "Optional extra context"
    }
  ],
  "rejectedIssues": [
    {
      "id": "REJ-001",
      "originalId": "ISS-002",
      "reason": "Why this issue is not valid"
    }
  ],
  "newIssues": [
    {
      "id": "NEW-001",
      "type": "bug|missing|inconsistent|ambiguous",
      "severity": "critical|high|medium|low",
      "description": "Additional issue found",
      "location": "Where found",
      "recommendation": "Suggested fix"
    }
  ],
  "confidence": 0.85,
  "summary": "Review summary"
}

EXAMPLE:
Input: Analyst found "No password strength requirements" issue.
Output:
{
  "validatedIssues": [
    {
      "id": "VAL-001",
      "originalId": "ISS-001",
      "confirmation": "Document indeed lacks password complexity rules",
      "additionalContext": "This is a security concern for production systems"
    }
  ],
  "rejectedIssues": [],
  "newIssues": [],
  "confidence": 0.9,
  "summary": "Analyst findings are accurate. No additional issues found."
}`;

export async function runReviewer(
  documentContent: string,
  analystOutput: AnalystOutput
): Promise<ReviewerOutput> {
  const prompt = `Review the following analyst output against the original document.

ORIGINAL DOCUMENT:
${documentContent}

ANALYST OUTPUT:
${JSON.stringify(analystOutput, null, 2)}

Validate, reject, or enhance the findings. Provide your review in the exact JSON format specified.`;

  return generateJSON<ReviewerOutput>(prompt, SYSTEM_PROMPT);
}
