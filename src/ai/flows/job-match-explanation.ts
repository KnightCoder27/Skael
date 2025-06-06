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
  userHistory: z.string().describe('The user history, including past applications'),
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
    description: 'Retrieves the user history of job applications, including outcomes.',
    inputSchema: z.object({
      profile: z.string().describe('User Profile including work history and job preferences'),
    }),
    outputSchema: z.string(),
  },
  async (input) => {
    // In a real application, this would fetch the user history from a database or external source.
    // For now, return a placeholder.
    console.log('Retrieving user history for profile:', input.profile);
    return 'User history data from external source.';
  }
);

const prompt = ai.definePrompt({
  name: 'jobMatchExplanationPrompt',
  input: {schema: JobMatchExplanationInputSchema},
  output: {schema: JobMatchExplanationOutputSchema},
  tools: [getUserHistory],
  prompt: `You are an AI job matching expert. Provide an explanation of why a job is a good match for a user, and provide a match score (0-100).

Job Description: {{{jobDescription}}}
User Profile: {{{userProfile}}}
User Preferences: {{{userPreferences}}}

Include information about the user's history:

{{await getUserHistory profile=userProfile}}

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
