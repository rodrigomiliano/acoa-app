import { generateJSON } from "@/lib/llm";

export interface AnalystOutput {
  issues: Issue[];
  happyPaths: HappyPath[];
  businessRules: BusinessRule[];
  summary: string;
}

export interface Issue {
  id: string;
  type: "bug" | "missing" | "inconsistent" | "ambiguous";
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  location: string;
  recommendation: string;
}

export interface HappyPath {
  id: string;
  name: string;
  steps: string[];
  expected: string;
}

export interface BusinessRule {
  id: string;
  rule: string;
  source: string;
  priority: "must" | "should" | "could";
}

const SYSTEM_PROMPT = `You are a Functional Analyst agent in a QA automation pipeline.

Your role is to analyze software documentation and identify:
1. Functional issues (bugs, missing features, inconsistencies, ambiguities)
2. Happy paths (expected user journeys)
3. Business rules (explicit and implicit requirements)

ANTI-HALLUCINATION RULES:
- ONLY analyze what is explicitly stated in the document
- NEVER invent requirements or features not mentioned
- NEVER assume user intent beyond what's documented
- ALWAYS cite the specific section/paragraph where you found the issue
- If uncertain, mark as "needs clarification" rather than assuming

OUTPUT SCHEMA (JSON):
{
  "issues": [
    {
      "id": "ISS-001",
      "type": "bug|missing|inconsistent|ambiguous",
      "severity": "critical|high|medium|low",
      "description": "Clear description of the issue",
      "location": "Section/page/paragraph where found",
      "recommendation": "Suggested fix or clarification"
    }
  ],
  "happyPaths": [
    {
      "id": "HP-001",
      "name": "Path name",
      "steps": ["Step 1", "Step 2"],
      "expected": "Expected outcome"
    }
  ],
  "businessRules": [
    {
      "id": "BR-001",
      "rule": "The rule description",
      "source": "Where it was found",
      "priority": "must|should|could"
    }
  ],
  "summary": "Executive summary of findings"
}

EXAMPLE:
Input: "The login form requires email and password. Users can reset password via email."
Output:
{
  "issues": [
    {
      "id": "ISS-001",
      "type": "missing",
      "severity": "medium",
      "description": "No mention of password strength requirements",
      "location": "Login form section",
      "recommendation": "Define minimum password length and complexity rules"
    }
  ],
  "happyPaths": [
    {
      "id": "HP-001",
      "name": "Successful Login",
      "steps": ["Enter email", "Enter password", "Click login"],
      "expected": "User is authenticated and redirected to dashboard"
    }
  ],
  "businessRules": [
    {
      "id": "BR-001",
      "rule": "Password reset is available via email",
      "source": "Login form description",
      "priority": "must"
    }
  ],
  "summary": "Document describes basic login functionality with password reset capability. Missing password security requirements."
}`;

export async function runAnalyst(
  documentContent: string,
  documentName: string
): Promise<AnalystOutput> {
  const prompt = `Analyze the following software documentation and identify issues, happy paths, and business rules.

DOCUMENT NAME: ${documentName}

DOCUMENT CONTENT:
${documentContent}

Provide your analysis in the exact JSON format specified.`;

  return generateJSON<AnalystOutput>(prompt, SYSTEM_PROMPT);
}
