// This file is machine-generated - edit with caution!
'use server';
/**
 * @fileOverview Extracts key requirements and skills from job descriptions.
 *
 * - extractJobDescriptionPoints - A function that handles the extraction process.
 * - ExtractJobDescriptionPointsInput - The input type for the extractJobDescriptionPoints function.
 * - ExtractJobDescriptionPointsOutput - The return type for the extractJobDescriptionPoints function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractJobDescriptionPointsInputSchema = z.object({
  jobDescription: z
    .string()
    .describe('The full text of the job description to analyze.'),
});
export type ExtractJobDescriptionPointsInput = z.infer<
  typeof ExtractJobDescriptionPointsInputSchema
>;

const ExtractJobDescriptionPointsOutputSchema = z.object({
  keyRequirements: z
    .array(z.string())
    .describe('A list of key requirements extracted from the job description.'),
  keySkills: z
    .array(z.string())
    .describe('A list of key skills extracted from the job description.'),
});
export type ExtractJobDescriptionPointsOutput = z.infer<
  typeof ExtractJobDescriptionPointsOutputSchema
>;

export async function extractJobDescriptionPoints(
  input: ExtractJobDescriptionPointsInput
): Promise<ExtractJobDescriptionPointsOutput> {
  return extractJobDescriptionPointsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractJobDescriptionPointsPrompt',
  input: {schema: ExtractJobDescriptionPointsInputSchema},
  output: {schema: ExtractJobDescriptionPointsOutputSchema},
  prompt: `You are an expert career advisor. Your role is to analyze job descriptions and extract the most important requirements and skills that a candidate should highlight in their resume and cover letter.

  Analyze the following job description:
  {{jobDescription}}

  Identify and list the key requirements and skills mentioned in the job description. Focus on the explicit needs and qualifications the employer is seeking.
  Return a JSON object that contains two keys: 'keyRequirements' and 'keySkills'.
  Each of them should contain an array of strings.
  `,
});

const extractJobDescriptionPointsFlow = ai.defineFlow(
  {
    name: 'extractJobDescriptionPointsFlow',
    inputSchema: ExtractJobDescriptionPointsInputSchema,
    outputSchema: ExtractJobDescriptionPointsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
