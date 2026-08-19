import { generateJSON } from "@/lib/llm";

export interface CoverageOutput {
  coverage: number;
  documentedScenarios: Scenario[];
  uncoveredScenarios: Scenario[];
  recommendations: string[];
  shouldContinue: boolean;
}

export interface Scenario {
  id: string;
  name: string;
  covered: boolean;
  location?: string;
}

const SYSTEM_PROMPT = `You are a Coverage Analysis agent in a QA automation pipeline.

Your role is to compare documented scenarios against covered scenarios and identify gaps.

ANTI-HALLUCINATION RULES:
- ONLY count scenarios explicitly mentioned in the document
- NEVER assume scenarios are covered without evidence
- NEVER invent scenarios not present in the document
- ALWAYS provide specific locations for covered scenarios
- If uncertain about coverage, mark as "needs verification"

OUTPUT SCHEMA (JSON):
{
  "coverage": 0.75,
  "documentedScenarios": [
    {
      "id": "SCN-001",
      "name": "Scenario name",
      "covered": true,
      "location": "Section where covered"
    }
  ],
  "uncoveredScenarios": [
    {
      "id": "SCN-002",
      "name": "Missing scenario",
      "covered": false
    }
  ],
  "recommendations": [
    "Add documentation for scenario X",
    "Clarify requirements for scenario Y"
  ],
  "shouldContinue": true
}

EXAMPLE:
Input: Document describes login and logout, but not password reset.
Output:
{
  "coverage": 0.67,
  "documentedScenarios": [
    {
      "id": "SCN-001",
      "name": "User Login",
      "covered": true,
      "location": "Login section"
    },
    {
      "id": "SCN-002",
      "name": "User Logout",
      "covered": true,
      "location": "Logout section"
    }
  ],
  "uncoveredScenarios": [
    {
      "id": "SCN-003",
      "name": "Password Reset",
      "covered": false
    }
  ],
  "recommendations": [
    "Add password reset documentation",
    "Include password reset in user journeys"
  ],
  "shouldContinue": true
}`;

export async function runCoverage(
  documentContent: string,
  previousIssues: string[]
): Promise<CoverageOutput> {
  const prompt = `Analyze the coverage of the following document.

DOCUMENT CONTENT:
${documentContent}

PREVIOUSLY IDENTIFIED ISSUES:
${previousIssues.join("\n")}

Determine what scenarios are documented and what is missing. Provide your analysis in the exact JSON format specified.`;

  return generateJSON<CoverageOutput>(prompt, SYSTEM_PROMPT);
}
