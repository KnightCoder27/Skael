
'use server';

/**
 * @fileOverview Job match explanation flow.
 *
 * - jobMatchExplanation - A function that provides an explanation for a job match.
 * - JobMatchExplanationInput - The input type for the jobMatchExplanation function.
 * - JobMatchExplanationOutput - The return type for the jobMatchExplanation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const JobMatchExplanationInputSchema = z.object({
  jobDescription: z.string().describe('The full job description.'),
  userProfile: z.string().describe('The user profile, including skills and experience.'),
  userPreferences: z.string().describe('The user job search preferences'),
  userHistory: z.string().describe('The user history, including past applications. Can be an empty string if history is to be fetched by tool.'),
});
export type JobMatchExplanationInput = z.infer<typeof JobMatchExplanationInputSchema>;

const JobMatchExplanationOutputSchema = z.object({
  matchExplanation: z.string().describe('The explanation of why the job is a good match for the user.'),
  matchScore: z.number().describe('The overall match score for the job (0-100).'),
});
export type JobMatchExplanationOutput = z.infer<typeof JobMatchExplanationOutputSchema>;

export async function jobMatchExplanation(input: JobMatchExplanationInput): Promise<JobMatchExplanationOutput> {
  return jobMatchExplanationFlow(input);
}

const getUserHistory = ai.defineTool(
  {
    name: 'getUserHistory',
    description: "Retrieves the user's history of job applications, including outcomes. Use this tool if you need to consider past application experiences.",
    inputSchema: z.object({
      profile: z.string().describe("The user's profile, which can be used to identify the user for history retrieval."),
    }),
    outputSchema: z.string(),
  },
  async (input) => {
    // In a real application, this would fetch the user history from a database or external source
    // based on the user identified by input.profile or a user ID derived from it.
    console.log('Tool: getUserHistory called for profile summary starting with:', input.profile.substring(0, 50) + "...");
    // For now, return a placeholder. This data will be fed back to the LLM.
    return 'User History: Previously applied for "Software Engineer at TechCorp" (Outcome: Interviewed), "Product Manager at InnovateSolutions" (Outcome: Offer Declined).';
  }
);

const prompt = ai.definePrompt({
  name: 'jobMatchExplanationPrompt',
  input: {schema: JobMatchExplanationInputSchema},
  output: {schema: JobMatchExplanationOutputSchema},
  tools: [getUserHistory],
  prompt: `You are an AI job matching expert. Your task is to provide a detailed explanation of why a specific job is a good match for a user and assign a match score (0-100).

To do this, consider the following:
1.  The Job Description.
2.  The User's Profile (skills, experience).
3.  The User's Preferences for job roles and environments.
4.  The User's Past Job Application History: If details about the user's past applications and their outcomes are relevant for assessing this match, use the "getUserHistory" tool to retrieve this information by providing the user's profile.

Job Description:
{{{jobDescription}}}

User Profile:
{{{userProfile}}}

User Preferences:
{{{userPreferences}}}
{{#if userHistory}}
Additional Provided User History:
{{{userHistory}}}
{{/if}}

Based on all available information (including any fetched history), provide your match explanation and score.
Match Explanation:`,
});

const jobMatchExplanationFlow = ai.defineFlow(
  {
    name: 'jobMatchExplanationFlow',
    inputSchema: JobMatchExplanationInputSchema,
    outputSchema: JobMatchExplanationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

