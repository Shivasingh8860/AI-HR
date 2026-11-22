import dotenv from "dotenv";
import mongoose from "mongoose";
import Candidate from "../src/models/Candidate.js";
import Job from "../src/models/Job.js";
import User from "../src/models/User.js";
import { isSupabaseConfigured } from "../src/config/supabase.js";
import { generateCandidateInsights } from "../src/services/aiService.js";
import { matchCandidateToJob } from "../src/services/matchingService.js";

dotenv.config();

const jobs = [
  {
    title: "Senior Full Stack Engineer",
    department: "Engineering",
    description: "Build scalable React, Node.js, Express, and MongoDB web applications with clean RESTful API design and cloud deployment practices.",
    requiredSkills: ["React", "Node.js", "Express", "MongoDB", "AWS", "TypeScript"],
    preferredEducation: "Bachelor",
    minExperienceYears: 4
  },
  {
    title: "Data Analyst & NLP Specialist",
    department: "Data & Analytics",
    description: "Extract insights from unstructured data, build predictive pipelines using Python and NLP, and communicate key metrics through dashboards.",
    requiredSkills: ["Python", "NLP", "Data Analysis", "SQL", "Pandas"],
    preferredEducation: "Master",
    minExperienceYears: 3
  },
  {
    title: "DevOps & Cloud Engineer",
    department: "Infrastructure",
    description: "Design automated CI/CD pipelines, containerize microservices using Docker and Kubernetes, and manage cloud infrastructure on AWS.",
    requiredSkills: ["AWS", "Docker", "Kubernetes", "CI/CD", "Linux"],
    preferredEducation: "Bachelor",
    minExperienceYears: 3
  }
];

const candidates = [
  {
    name: "Aarav Mehta",
    email: "aarav.mehta@example.com",
    phone: "+91 98765 43210",
    skills: ["React", "Node.js", "Express", "MongoDB", "AWS", "TypeScript", "REST API"],
    experienceYears: 5,
    workExperience: [
      "Senior Full Stack Developer at CloudScale Tech (3 years)",
      "Software Engineer at Innovate Labs (2 years)"
    ],
    education: ["Bachelor of Technology in Computer Science, IIT Bombay"],
    certifications: ["AWS Certified Solutions Architect"],
    projects: [
      "Architected real-time talent analytics dashboard serving 50k users",
      "Built resilient microservices architecture with Redis caching and Docker"
    ],
    resumeText: "Aarav Mehta Software Engineer React Node.js Express MongoDB AWS TypeScript Docker B.Tech Computer Science 5 years experience"
  },
  {
    name: "Maya Iyer",
    email: "maya.iyer@example.com",
    phone: "+91 91234 56789",
    skills: ["Python", "NLP", "Data Analysis", "SQL", "Pandas", "Scikit-Learn"],
    experienceYears: 3,
    workExperience: [
      "Data Analyst at Analytics Pro (2 years)",
      "Junior ML Analyst at DataCore (1 year)"
    ],
    education: ["Master of Science in Data Analytics, BITS Pilani"],
    certifications: ["Applied Machine Learning Specialization"],
    projects: [
      "Designed NLP classification pipeline for unstructured customer feedback",
      "Automated ETL pipelines processing 1M daily records with Python and SQL"
    ],
    resumeText: "Maya Iyer Data Analyst Python NLP Data Analysis SQL Pandas Scikit-Learn M.Sc Data Analytics 3 years experience"
  },
  {
    name: "Rohan Verma",
    email: "rohan.verma@example.com",
    phone: "+91 99887 76655",
    skills: ["AWS", "Docker", "Kubernetes", "CI/CD", "Linux", "Terraform", "Git"],
    experienceYears: 4,
    workExperience: [
      "DevOps Engineer at InfraTech Solutions (2.5 years)",
      "Systems Administrator at CloudBase (1.5 years)"
    ],
    education: ["Bachelor of Engineering in Information Technology"],
    certifications: ["Certified Kubernetes Administrator (CKA)"],
    projects: [
      "Migrated monolithic architecture to AWS EKS with GitOps ArgoCD",
      "Reduced build and deployment lead times by 65% with GitHub Actions"
    ],
    resumeText: "Rohan Verma DevOps Engineer AWS Docker Kubernetes CI/CD Linux Terraform B.E IT 4 years experience"
  }
];

async function seed() {
  const usingSupabase = isSupabaseConfigured();
  if (usingSupabase) {
    console.log("Connected to Supabase for seeding...");
  } else {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/smart_hr_analyzer");
    console.log("Connected to MongoDB for seeding...");
  }

  await Promise.all([User.deleteMany(), Job.deleteMany(), Candidate.deleteMany()]);

  const admin = await User.create({
    name: "Admin User",
    email: "admin@smarthr.local",
    password: "Admin123!",
    role: "Admin",
    isVerified: true
  });

  const hrUser = await User.create({
    name: "Recruiter Sarah",
    email: "hr@smarthr.local",
    password: "Hr12345!",
    role: "HR",
    isVerified: true
  });

  const createdJobs = await Job.insertMany(jobs.map((job) => ({ ...job, createdBy: admin._id })));

  for (const data of candidates) {
    const candidate = new Candidate({ ...data, uploadedBy: admin._id });
    candidate.analysis = await generateCandidateInsights(candidate);
    candidate.matches = createdJobs
      .map((job) => matchCandidateToJob(candidate, job))
      .sort((a, b) => b.score - a.score);
    await candidate.save();
  }

  console.log(`Database (${usingSupabase ? "Supabase" : "MongoDB"}) seeded successfully!`);
  console.log("-----------------------------------------");
  console.log("Admin account:     admin@smarthr.local / Admin123!");
  console.log("HR Recruiter:      hr@smarthr.local / Hr12345!");
  console.log("Jobs seeded:       ", createdJobs.length);
  console.log("Candidates seeded: ", candidates.length);
  console.log("-----------------------------------------");

  if (!usingSupabase) {
    await mongoose.disconnect();
  }
}

seed().catch((error) => {
  console.error("Seeding error:", error);
  process.exit(1);
});
