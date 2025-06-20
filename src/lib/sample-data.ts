
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
    company: 'Innovatech Dynamics India', 
    location: 'Remote (India)',
    description: 'Innovatech Dynamics India is seeking a highly skilled Senior Frontend Engineer to join our talented remote team. In this role, you will be responsible for designing, developing, and maintaining responsive and performant user interfaces for our flagship AI-driven analytics platform. You will collaborate closely with product managers, UX designers, and backend engineers to deliver exceptional user experiences. Key responsibilities include architecting complex frontend solutions, mentoring junior engineers, and championing best practices in code quality and performance. A strong portfolio showcasing your work with React, TypeScript, Redux/Zustand, and data visualization libraries is highly desirable. Experience with GraphQL and testing frameworks like Jest/React Testing Library is a plus. We offer a competitive salary, comprehensive benefits, and a vibrant, innovative work culture.',
    url: 'https://example.com/job/innovatech-frontend-in',
    salary_string: '₹25,00,000 - ₹35,00,000 INR Annually',
    date_posted: '2024-07-20',
    technologies: sampleTech(['React', 'TypeScript', 'Remote', 'AI', 'Fintech']),
    companyLogo: 'https://placehold.co/100x100.png',
    matchScore: undefined, 
    matchExplanation: undefined, 
    remote: true,
    currency: 'INR',
  },
  {
    id: 2,
    job_title: 'AI Product Manager',
    company: 'FutureAI Corp India',
    location: 'Bengaluru, KA',
    description: 'FutureAI Corp India is at the forefront of generative AI innovation, and we are looking for a visionary AI Product Manager to shape the future of our product line. You will own the product roadmap, from ideation to launch and iteration, for our suite of generative AI tools. This includes conducting market research, defining user personas and requirements, prioritizing features, and working with engineering and research teams to bring products to life. The ideal candidate will have a proven track record of successfully launching AI/ML products, a deep understanding of the generative AI landscape (LLMs, diffusion models, etc.), and excellent communication skills. A technical background in computer science or a related field is preferred.',
    url: 'https://example.com/job/futureai-pm-in',
    salary_string: '₹30,00,000 - ₹40,00,000 INR Annually',
    date_posted: '2024-07-18',
    technologies: sampleTech(['Product Management', 'AI', 'Generative AI', 'SaaS']),
    companyLogo: 'https://placehold.co/100x100.png',
    matchScore: undefined,
    matchExplanation: undefined,
    remote: false,
    hybrid: false,
    currency: 'INR',
  },
  {
    id: 3,
    job_title: 'UX/UI Designer (Contract)',
    company: 'Creative Solutions Agency India',
    location: 'Hyderabad, TS (Hybrid)',
    description: 'Creative Solutions Agency India is looking for a talented UX/UI Designer for a 6-month contract position with the possibility of extension. You will work on a diverse range of projects for our clients, spanning web applications, mobile apps, and marketing websites. Responsibilities include user research, wireframing, prototyping, creating high-fidelity mockups, and collaborating with developers to ensure design fidelity. Proficiency in Figma, Adobe Creative Suite, and a strong understanding of user-centered design principles are required. Candidates should have a compelling portfolio that demonstrates their design process and skills in creating engaging and accessible digital experiences.',
    url: 'https://example.com/job/creative-uxui-in',
    salary_string: '₹8,000 - ₹12,000 INR per day', // Example daily rate
    date_posted: '2024-07-22',
    technologies: sampleTech(['UX Design', 'UI Design', 'Figma', 'Contract', 'Hybrid']),
    companyLogo: 'https://placehold.co/100x100.png',
    matchScore: undefined,
    matchExplanation: undefined,
    remote: false,
    hybrid: true,
    currency: 'INR',
    employment_status: 'Contract',
  },
  {
    id: 4,
    job_title: 'Data Scientist - NLP',
    company: 'LingoAnalytics India',
    location: 'Pune, MH',
    description: 'LingoAnalytics India is a leader in text analytics, and we are expanding our research team. We are looking for a Data Scientist specializing in Natural Language Processing (NLP) to contribute to our state-of-the-art algorithms. You will work on challenging problems in areas like sentiment analysis, topic modeling, named entity recognition, and text summarization. This role involves researching new NLP techniques, developing and training machine learning models, and deploying them into production systems. Strong programming skills in Python and experience with NLP libraries (e.g., spaCy, NLTK, Hugging Face Transformers) and deep learning frameworks (e.g., TensorFlow, PyTorch) are essential. A PhD or MS in Computer Science, Statistics, or a related field with a focus on NLP is highly preferred.',
    url: 'https://example.com/job/lingo-nlp-in',
    salary_string: '₹20,00,000 - ₹28,00,000 INR Annually',
    date_posted: '2024-07-15',
    technologies: sampleTech(['Data Science', 'NLP', 'Machine Learning', 'Python']),
    companyLogo: 'https://placehold.co/100x100.png',
    matchScore: undefined,
    matchExplanation: undefined,
    remote: false,
    currency: 'INR', 
  }
];
