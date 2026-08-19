import { generateWithGemini } from "@/lib/llm";
import { ReviewerOutput } from "./reviewer";

export interface EditorOutput {
  editedDocument: string;
  changesMade: Change[];
  summary: string;
}

export interface Change {
  id: string;
  type: "added" | "modified" | "removed";
  location: string;
  description: string;
}

const SYSTEM_PROMPT = `You are a Documentation Editor agent in a QA automation pipeline.

Your role is to rewrite software documentation incorporating the validated issues from the QA Reviewer.

ANTI-HALLUCINATION RULES:
- ONLY make changes based on validated issues
- NEVER add information not supported by the issues
- NEVER remove valid content without explicit instruction
- ALWAYS preserve the original document structure
- Mark all changes with comments for traceability

OUTPUT FORMAT:
Return the edited document in markdown format with change comments:
<!-- CHANGE: [id] [type] [description] -->
[modified content]
<!-- END CHANGE -->

Also provide a JSON summary of changes at the end:
\`\`\`json
{
  "changesMade": [
    {
      "id": "CHG-001",
      "type": "added|modified|removed",
      "location": "Where the change was made",
      "description": "What was changed"
    }
  ],
  "summary": "Summary of all changes"
}
\`\`\`

EXAMPLE:
Input: "Login requires email and password." + Validated issue: "Missing password requirements"
Output:
<!-- CHANGE: CHG-001 added Added password requirements section -->
## Password Requirements

The password must meet the following criteria:
- Minimum 8 characters
- At least one uppercase letter
- At least one number
- At least one special character

<!-- END CHANGE -->

Original content preserved:
## Login

Login requires email and password.

\`\`\`json
{
  "changesMade": [
    {
      "id": "CHG-001",
      "type": "added",
      "location": "After Login section",
      "description": "Added password requirements section"
    }
  ],
  "summary": "Added missing password requirements documentation"
}
\`\`\``;

export async function runEditor(
  documentContent: string,
  reviewerOutput: ReviewerOutput
): Promise<EditorOutput> {
  const prompt = `Edit the following document incorporating the validated issues from the QA Reviewer.

ORIGINAL DOCUMENT:
${documentContent}

VALIDATED ISSUES:
${JSON.stringify(reviewerOutput.validatedIssues, null, 2)}

NEW ISSUES FOUND:
${JSON.stringify(reviewerOutput.newIssues, null, 2)}

Edit the document and provide the changes made.`;

  const response = await generateWithGemini(prompt, SYSTEM_PROMPT);
  
  // Extract the edited content (everything before the JSON summary)
  const jsonMatch = response.text.match(/```json\s*([\s\S]*?)```/);
  let changesMade: Change[] = [];
  let editedDocument = response.text;
  
  if (jsonMatch) {
    try {
      const summary = JSON.parse(jsonMatch[1]);
      changesMade = summary.changesMade || [];
      editedDocument = response.text.substring(0, response.text.indexOf("```json")).trim();
    } catch {
      // Use the full text as edited document
    }
  }
  
  return {
    editedDocument,
    changesMade,
    summary: `Document edited with ${changesMade.length} changes`,
  };
}
