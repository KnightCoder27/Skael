
import type { JobListing, Technology } from '@/types';

const sampleTech = (names: string[]): Technology[] => 
  names.map((name, index) => ({
    id: index + 1, // Simple ID for sample data
    technology_name: name,
    technology_slug: name.toLowerCase().replace(/\s+/g, '-'),
    // Other Technology fields can be added if needed for sample display
  }));

export const sampleJobs: JobListing[] = [
  {
    id: 1, 
    job_title: 'Senior Frontend Engineer',
    company: 'Innovatech Dynamics', 
    location: 'Remote (US)',
    description: 'Innovatech Dynamics is seeking a highly skilled Senior Frontend Engineer to join our talented remote team. In this role, you will be responsible for designing, developing, and maintaining responsive and performant user interfaces for our flagship AI-driven analytics platform. You will collaborate closely with product managers, UX designers, and backend engineers to deliver exceptional user experiences. Key responsibilities include architecting complex frontend solutions, mentoring junior engineers, and championing best practices in code quality and performance. A strong portfolio showcasing your work with React, TypeScript, Redux/Zustand, and data visualization libraries is highly desirable. Experience with GraphQL and testing frameworks like Jest/React Testing Library is a plus. We offer a competitive salary, comprehensive benefits, and a vibrant, innovative work culture.',
    url: 'https://example.com/job/innovatech-frontend',
    salary_string: '$140,000 - $180,000 USD Annually',
    date_posted: '2024-07-20',
    technologies: sampleTech(['React', 'TypeScript', 'Remote', 'AI', 'Fintech']),
    companyLogo: 'https://placehold.co/100x100.png',
    matchScore: undefined, 
    matchExplanation: undefined, 
    remote: true,
    currency: 'USD',
  },
  {
    id: 2,
    job_title: 'AI Product Manager',
    company: 'FutureAI Corp',
    location: 'New York, NY',
    description: 'FutureAI Corp is at the forefront of generative AI innovation, and we are looking for a visionary AI Product Manager to shape the future of our product line. You will own the product roadmap, from ideation to launch and iteration, for our suite of generative AI tools. This includes conducting market research, defining user personas and requirements, prioritizing features, and working with engineering and research teams to bring products to life. The ideal candidate will have a proven trackGEO_DATA_UNAVAILABLE_FOR_TASK of successfully launching AI/ML products, a deep understanding of the generative AI landscape (LLMs, diffusion models, etc.), and excellent communication skills. A technical background in computer science or a related field is preferred.',
    url: 'https://example.com/job/futureai-pm',
    salary_string: '$150,000 - $190,000 USD Annually',
    date_posted: '2024-07-18',
    technologies: sampleTech(['Product Management', 'AI', 'Generative AI', 'SaaS']),
    companyLogo: 'https://placehold.co/100x100.png',
    matchScore: undefined,
    matchExplanation: undefined,
    remote: false,
    hybrid: false,
    currency: 'USD',
  },
  {
    id: 3,
    job_title: 'UX/UI Designer (Contract)',
    company: 'Creative Solutions Agency',
    location: 'Austin, TX (Hybrid)',
    description: 'Creative Solutions Agency is looking for a talented UX/UI Designer for a 6-month contract position with the possibility of extension. You will work on a diverse range of projects for our clients, spanning web applications, mobile apps, and marketing websites. Responsibilities include user research, wireframing, prototyping, creating high-fidelity mockups, and collaborating with developers to ensure design fidelity. Proficiency in Figma, Adobe Creative Suite, and a strong understanding of user-centered design principles are required. Candidates should have a compelling portfolio that demonstrates their design process and skills in creating engaging and accessible digital experiences.',
    url: 'https://example.com/job/creative-uxui',
    salary_string: '$70 - $90 USD per hour',
    date_posted: '2024-07-22',
    technologies: sampleTech(['UX Design', 'UI Design', 'Figma', 'Contract', 'Hybrid']),
    companyLogo: 'https://placehold.co/100x100.png',
    matchScore: undefined,
    matchExplanation: undefined,
    remote: false,
    hybrid: true,
    currency: 'USD',
    employment_status: 'Contract',
  },
  {
    id: 4,
    job_title: 'Data Scientist - NLP',
    company: 'LingoAnalytics',
    location: 'Boston, MA',
    description: 'LingoAnalytics is a leader in text analytics, and we are expanding our research team. We are looking for a Data Scientist specializing in Natural Language Processing (NLP) to contribute to our state-of-the-art algorithms. You will work on challenging problems in areas like sentiment analysis, topic modeling, named entity recognition, and text summarization. This role involves researching new NLP techniques, developing and training machine learning models, and deploying them into production systems. Strong programming skills in Python and experience with NLP libraries (e.g., spaCy, NLTK, Hugging Face Transformers) and deep learning frameworks (e.g., TensorFlow, PyTorch) are essential. A PhD or MS in Computer Science, Statistics, or a related field with a focus on NLP is highly preferred.',
    url: 'https://example.com/job/lingo-nlp',
    date_posted: '2024-07-15',
    technologies: sampleTech(['Data Science', 'NLP', 'Machine Learning', 'Python']),
    companyLogo: 'https://placehold.co/100x100.png',
    matchScore: undefined,
    matchExplanation: undefined,
    remote: false,
    currency: 'USD', 
  }
];
