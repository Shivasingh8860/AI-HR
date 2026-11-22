const skillBank = [
  "javascript", "typescript", "react", "node.js", "express", "mongodb", "sql", "postgresql",
  "python", "java", "c++", "c#", "go", "rust", "aws", "azure", "gcp", "docker", "kubernetes",
  "ci/cd", "machine learning", "nlp", "deep learning", "data analysis", "project management",
  "agile", "scrum", "leadership", "communication", "salesforce", "figma", "tailwind",
  "graphql", "redis", "microservices", "rest api", "git", "linux", "html", "css"
];

const SKILL_QUESTIONS = {
  react: "Can you explain how you handle state management and performance optimization in React applications?",
  node: "How do you architect scalable RESTful microservices and manage asynchronous error handling in Node.js?",
  python: "What Python libraries and data processing patterns do you prefer for data analysis or ML pipelines?",
  aws: "Describe your experience deploying and monitoring applications on AWS (e.g., ECS, Lambda, S3, or RDS).",
  docker: "How do you design multi-stage Docker builds and optimize container image security and footprint?",
  sql: "How do you approach database schema indexing and query optimization for high-throughput queries?",
  mongodb: "What strategies do you use for data modeling, indexing, and aggregation pipelines in MongoDB?",
  kubernetes: "How do you configure pod autoscaling, ingress, and config management in Kubernetes clusters?",
  typescript: "What advanced TypeScript features (generics, mapped types, type guards) have helped you maintain code quality?"
};

function unique(values) {
  return [...new Set(values.filter(Boolean).map((item) => item.trim()))];
}

function normalizeSkill(str) {
  return String(str || "").toLowerCase().replace(/[^a-z0-9+#]/g, "");
}

export function inferRoles(skills = [], years = 0) {
  const normalized = skills.map((s) => s.toLowerCase());
  const roles = [];

  const hasFrontend = normalized.some((s) => /react|vue|angular|javascript|typescript|tailwind|html|css/.test(s));
  const hasBackend = normalized.some((s) => /node|express|mongodb|sql|postgres|fastapi|django|spring|api|microservices/.test(s));
  const hasDevOps = normalized.some((s) => /aws|azure|gcp|docker|kubernetes|ci\/cd|terraform|linux/.test(s));
  const hasData = normalized.some((s) => /python|machine learning|nlp|data analysis|tensorflow|pytorch|pandas/.test(s));

  if (hasFrontend && hasBackend) {
    roles.push(years >= 5 ? "Senior Full Stack Engineer" : "Full Stack Developer");
  } else if (hasFrontend) {
    roles.push(years >= 5 ? "Senior Frontend Engineer" : "Frontend Developer");
  } else if (hasBackend) {
    roles.push(years >= 5 ? "Senior Backend Engineer" : "Backend Developer");
  }

  if (hasDevOps) roles.push("DevOps / Cloud Engineer");
  if (hasData) roles.push("AI / Data Specialist");
  if (years >= 7 && !roles.some((r) => r.includes("Lead"))) roles.push("Technical Lead");

  return roles.length ? roles : ["Software Engineer"];
}

function fallbackParse(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const lower = text.toLowerCase();

  const skillsFound = skillBank.filter((skill) => {
    const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    return regex.test(lower);
  });

  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
  const phone = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0] || "";
  const expMatches = [...lower.matchAll(/(\d+)\+?\s*(?:years?|yrs?)/g)].map((match) => Number(match[1]));

  const candidateName = lines.find((l) => l.length < 50 && !/@|phone|http|www|resume|curriculum/i.test(l)) || "Candidate";

  return {
    name: candidateName,
    email,
    phone,
    skills: unique(skillsFound.map((s) => s.replace(/\b\w/g, (c) => c.toUpperCase()))),
    experienceYears: expMatches.length ? Math.min(Math.max(...expMatches), 40) : 0,
    workExperience: lines.filter((line) => /engineer|developer|manager|analyst|architect|specialist|lead|consultant/i.test(line)).slice(0, 6),
    education: lines.filter((line) => /bachelor|master|b\.?tech|m\.?tech|b\.?e\b|b\.?s\b|m\.?s\b|mba|degree|university|college/i.test(line)).slice(0, 4),
    certifications: lines.filter((line) => /certified|certification|aws|azure|gcp|scrum|pmp/i.test(line)).slice(0, 4),
    projects: lines.filter((line) => /project|built|implemented|launched|architected|designed/i.test(line)).slice(0, 5)
  };
}

async function callGemini(promptText, systemInstruction = "") {
  const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{ parts: [{ text: promptText }] }],
    generationConfig: {
      responseMimeType: "application/json"
    }
  };

  if (systemInstruction) {
    payload.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Gemini API Error:", res.status, errorText);
    return null;
  }

  const data = await res.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) return null;
  return JSON.parse(rawText);
}

export async function parseResumeWithAI(text) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return fallbackParse(text);

  try {
    const systemInstruction = "You are a professional HR resume parser. Extract structured candidate data as valid JSON. Use clean, normalized strings.";
    const prompt = `Extract resume information into JSON with fields:
name (string),
email (string),
phone (string),
skills (array of strings, e.g. ["React", "Node.js", "Docker"]),
experienceYears (number estimate of total relevant years),
workExperience (array of concise role/company summaries, max 6 items),
education (array of degree/university summaries, max 4 items),
certifications (array of certification titles, max 4 items),
projects (array of project highlights, max 5 items).

Resume text:
${text.slice(0, 18000)}`;

    const parsed = await callGemini(prompt, systemInstruction);
    if (parsed && parsed.name) {
      return {
        name: parsed.name.trim(),
        email: (parsed.email || "").trim(),
        phone: (parsed.phone || "").trim(),
        skills: unique(parsed.skills || []),
        experienceYears: Number(parsed.experienceYears) || 0,
        workExperience: Array.isArray(parsed.workExperience) ? parsed.workExperience : [],
        education: Array.isArray(parsed.education) ? parsed.education : [],
        certifications: Array.isArray(parsed.certifications) ? parsed.certifications : [],
        projects: Array.isArray(parsed.projects) ? parsed.projects : []
      };
    }
  } catch (err) {
    console.error("Failed to parse resume with Gemini API, using local parser:", err.message);
  }

  return fallbackParse(text);
}

export async function generateCandidateInsights(candidate) {
  const skills = candidate.skills || [];
  const years = candidate.experienceYears || 0;
  const bestFitRoles = inferRoles(skills, years);

  // Generate realistic interview questions based on candidate's actual stack
  const dynamicQuestions = [];
  const normalizedSkills = skills.map((s) => s.toLowerCase());

  for (const [key, q] of Object.entries(SKILL_QUESTIONS)) {
    if (normalizedSkills.some((s) => s.includes(key))) {
      dynamicQuestions.push(q);
      if (dynamicQuestions.length >= 4) break;
    }
  }

  dynamicQuestions.push(
    years > 3
      ? "Can you describe a complex technical challenge you solved and how you measured its success?"
      : "Can you walk through a recent project you built and the key architectural decisions you made?"
  );

  let interviewQuestions = dynamicQuestions.slice(0, 5);

  const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
  if (apiKey) {
    try {
      const systemInstruction = "You are an expert technical recruiter and interviewer. Generate 5 targeted interview questions tailored to the candidate's actual background and target role.";
      const prompt = `Candidate Profile:
Name: ${candidate.name}
Experience: ${years} years
Skills: ${skills.join(", ") || "General software skills"}
Target Roles: ${bestFitRoles.join(", ")}

Generate 5 relevant, role-specific technical and architectural interview questions. Return in JSON format: { "questions": ["Q1", "Q2", "Q3", "Q4", "Q5"] }`;

      const result = await callGemini(prompt, systemInstruction);
      if (result && Array.isArray(result.questions) && result.questions.length >= 3) {
        interviewQuestions = result.questions;
      }
    } catch (e) {
      console.warn("Could not generate AI questions via Gemini, using smart template questions:", e.message);
    }
  }

  const strengths = skills.slice(0, 8);
  const summary = `${candidate.name || "Candidate"} brings ${years ? `${years} years` : "practical"} experience with core proficiency in ${strengths.slice(0, 4).join(", ") || "software development"}. Recommended for ${bestFitRoles.join(" / ")}.`;

  return {
    summary,
    strengths,
    weaknesses: [],
    skillGaps: [],
    bestFitRoles,
    interviewQuestions
  };
}
