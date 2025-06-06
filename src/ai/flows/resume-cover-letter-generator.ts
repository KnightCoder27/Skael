// src/ai/flows/resume-cover-letter-generator.ts
'use server';

/**
 * @fileOverview Generates a tailored resume and cover letter for a specific job description.
 *
 * - generateResumeAndCoverLetter - A function that generates a resume and cover letter.
 * - GenerateResumeAndCoverLetterInput - The input type for the generateResumeAndCoverLetter function.
 * - GenerateResumeAndCoverLetterOutput - The return type for the generateResumeAndCoverLetter function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define the input schema
const GenerateResumeAndCoverLetterInputSchema = z.object({
  jobDescription: z.string().describe('The job description to tailor the resume and cover letter to.'),
  userProfile: z.string().describe('The user profile, including skills and experience.'),
  pointsToMention: z.array(z.string()).describe('An array of points from the job description that should be mentioned in the resume and cover letter.'),
});

export type GenerateResumeAndCoverLetterInput = z.infer<typeof GenerateResumeAndCoverLetterInputSchema>;

// Define the output schema
const GenerateResumeAndCoverLetterOutputSchema = z.object({
  resume: z.string().describe('The generated resume.'),
  coverLetter: z.string().describe('The generated cover letter.'),
});

export type GenerateResumeAndCoverLetterOutput = z.infer<typeof GenerateResumeAndCoverLetterOutputSchema>;

// Define the tool to decide which points from the job description should be mentioned
const decidePointsToMention = ai.defineTool({
  name: 'decidePointsToMention',
  description: 'Decides which points from the job description should be mentioned in the resume and cover letter based on the user profile.',
  inputSchema: z.object({
    jobDescription: z.string().describe('The job description.'),
    userProfile: z.string().describe('The user profile.'),
  }),
  outputSchema: z.array(z.string()).describe('The points from the job description to mention.'),
}, async (input) => {
  //In real implementation, this tool would use an LLM or other logic to determine the points to mention.
  //For now, we just return the first 3 points from the job description.
  const points = input.jobDescription.split('. ').slice(0, 3);
  return points;
});

// Define the prompt
const generateResumeAndCoverLetterPrompt = ai.definePrompt({
  name: 'generateResumeAndCoverLetterPrompt',
  input: {schema: GenerateResumeAndCoverLetterInputSchema},
  output: {schema: GenerateResumeAndCoverLetterOutputSchema},
  tools: [decidePointsToMention],
  prompt: `You are an expert resume and cover letter writer.

  Based on the following job description:
  {{jobDescription}}

  And the following user profile:
  {{userProfile}}

  Write a resume and cover letter tailored to the job description, highlighting the most relevant skills and experience from the user profile.

  The following points from the job description MUST be mentioned:
  {{#each pointsToMention}}
  - {{{this}}}
  {{/each}}

  Make sure the resume is ATS-friendly.

  Return the resume and cover letter in the following format:
  {
    "resume": "...",
    "coverLetter": "..."
  }
  `,
});

// Define the flow
const generateResumeAndCoverLetterFlow = ai.defineFlow({
  name: 'generateResumeAndCoverLetterFlow',
  inputSchema: GenerateResumeAndCoverLetterInputSchema,
  outputSchema: GenerateResumeAndCoverLetterOutputSchema,
}, async (input) => {
  const {output} = await generateResumeAndCoverLetterPrompt(input);
  return output!;
});

// Export the function
export async function generateResumeAndCoverLetter(input: GenerateResumeAndCoverLetterInput): Promise<GenerateResumeAndCoverLetterOutput> {
  return generateResumeAndCoverLetterFlow(input);
}
