import { config } from 'dotenv';
config();

import '@/ai/flows/job-match-explanation.ts';
import '@/ai/flows/job-description-point-extractor.ts';
import '@/ai/flows/resume-cover-letter-generator.ts';