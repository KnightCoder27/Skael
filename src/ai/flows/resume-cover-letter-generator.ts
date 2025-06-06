// src/ai/flows/resume-cover-letter-generator.ts
'use server';

/**
 * @fileOverview Generates tailored resumes and cover letters for specific job descriptions using separate AI flows.
 *
 * - generateResume - A function that generates a resume.
 * - generateCoverLetter - A function that generates a cover letter.
 * - GenerateDocumentInput - The input type for both generation functions.
 * - GenerateResumeOutput - The return type for the generateResume function.
 * - GenerateCoverLetterOutput - The return type for the generateCoverLetter function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define the input schema (shared for both resume and cover letter generation)
const GenerateDocumentInputSchema = z.object({
  jobDescription: z.string().describe('The job description to tailor the document to.'),
  userProfile: z.string().describe('The user profile, including skills and experience.'),
  pointsToMention: z.array(z.string()).describe('An array of points from the job description that should be mentioned in the document.'),
});
export type GenerateDocumentInput = z.infer<typeof GenerateDocumentInputSchema>;

// Define the output schema for resume
const GenerateResumeOutputSchema = z.object({
  resume: z.string().describe('The generated resume.'),
});
export type GenerateResumeOutput = z.infer<typeof GenerateResumeOutputSchema>;

// Define the output schema for cover letter
const GenerateCoverLetterOutputSchema = z.object({
  coverLetter: z.string().describe('The generated cover letter.'),
});
export type GenerateCoverLetterOutput = z.infer<typeof GenerateCoverLetterOutputSchema>;


// Define the prompt for resume generation
const generateResumePrompt = ai.definePrompt({
  name: 'generateResumePrompt',
  input: {schema: GenerateDocumentInputSchema},
  output: {schema: GenerateResumeOutputSchema},
  prompt: `You are an expert resume writer.

  Based on the following job description:
  {{jobDescription}}

  And the following user profile:
  {{userProfile}}

  Write a resume tailored to the job description, highlighting the most relevant skills and experience from the user profile.

  The following points from the job description MUST be mentioned:
  {{#each pointsToMention}}
  - {{{this}}}
  {{/each}}

  Make sure the resume is ATS-friendly.

  Return the resume in the following JSON format:
  {
    "resume": "..."
  }
  `,
});

// Define the prompt for cover letter generation
const generateCoverLetterPrompt = ai.definePrompt({
  name: 'generateCoverLetterPrompt',
  input: {schema: GenerateDocumentInputSchema},
  output: {schema: GenerateCoverLetterOutputSchema},
  prompt: `You are an expert cover letter writer.

  Based on the following job description:
  {{jobDescription}}

  And the following user profile:
  {{userProfile}}

  Write a cover letter tailored to the job description, highlighting the most relevant skills and experience from the user profile.

  The following points from the job description MUST be mentioned:
  {{#each pointsToMention}}
  - {{{this}}}
  {{/each}}

  The cover letter should be professional, concise, and persuasive.

  Return the cover letter in the following JSON format:
  {
    "coverLetter": "..."
  }
  `,
});

// Define the flow for resume generation
const generateResumeFlow = ai.defineFlow({
  name: 'generateResumeFlow',
  inputSchema: GenerateDocumentInputSchema,
  outputSchema: GenerateResumeOutputSchema,
}, async (input) => {
  const {output} = await generateResumePrompt(input);
  return output!;
});

// Define the flow for cover letter generation
const generateCoverLetterFlow = ai.defineFlow({
  name: 'generateCoverLetterFlow',
  inputSchema: GenerateDocumentInputSchema,
  outputSchema: GenerateCoverLetterOutputSchema,
}, async (input) => {
  const {output} = await generateCoverLetterPrompt(input);
  return output!;
});

// Export the resume generation function
export async function generateResume(input: GenerateDocumentInput): Promise<GenerateResumeOutput> {
  return generateResumeFlow(input);
}

// Export the cover letter generation function
export async function generateCoverLetter(input: GenerateDocumentInput): Promise<GenerateCoverLetterOutput> {
  return generateCoverLetterFlow(input);
}
