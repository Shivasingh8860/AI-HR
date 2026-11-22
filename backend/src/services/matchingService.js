import { inferRoles } from "./aiService.js";

const STOP_WORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are",
  "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but",
  "by", "can", "could", "did", "do", "does", "doing", "down", "during", "each", "few", "for",
  "from", "further", "had", "has", "have", "having", "he", "her", "here", "hers", "herself",
  "him", "himself", "his", "how", "i", "if", "in", "into", "is", "it", "its", "itself", "just",
  "me", "more", "most", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only",
  "or", "other", "our", "ours", "ourselves", "out", "over", "own", "same", "she", "should", "so",
  "some", "such", "than", "that", "the", "their", "theirs", "them", "themselves", "then", "there",
  "these", "they", "this", "those", "through", "to", "too", "under", "until", "up", "very", "was",
  "we", "were", "what", "when", "where", "which", "while", "who", "whom", "why", "with", "would",
  "you", "your", "yours", "yourself", "yourselves"
]);

const ALIASES = {
  "react.js": "react",
  "reactjs": "react",
  "node.js": "node",
  "nodejs": "node",
  "vue.js": "vue",
  "vuejs": "vue",
  "angular.js": "angular",
  "angularjs": "angular",
  "js": "javascript",
  "ts": "typescript",
  "golang": "go",
  "postgresql": "postgres",
  "mongo": "mongodb",
  "k8s": "kubernetes",
  "amazon web services": "aws",
  "google cloud platform": "gcp",
  "microsoft azure": "azure"
};

function normalizeSkill(value) {
  const clean = String(value || "").toLowerCase().trim();
  return ALIASES[clean] || clean;
}

function skillsMatch(cSkill, jSkill) {
  const c = normalizeSkill(cSkill);
  const j = normalizeSkill(jSkill);
  if (!c || !j) return false;
  if (c === j) return true;
  // If one is multi-word and contains the other as a whole word
  if (c.split(/[\s/]+/).includes(j) || j.split(/[\s/]+/).includes(c)) return true;
  return false;
}

function overlapScore(candidateSkills = [], jobSkills = []) {
  if (!jobSkills || !jobSkills.length) {
    return { score: 1, missing: [] };
  }
  const matched = jobSkills.filter((jSkill) =>
    candidateSkills.some((cSkill) => skillsMatch(cSkill, jSkill))
  );
  const missing = jobSkills.filter((jSkill) => !matched.includes(jSkill));
  return {
    score: matched.length / jobSkills.length,
    missing
  };
}

function experienceScore(candidateYears = 0, requiredYears = 0) {
  if (!requiredYears || requiredYears <= 0) return 1;
  const ratio = candidateYears / requiredYears;
  return Math.min(Math.max(ratio, 0), 1);
}

const DEGREE_LEVELS = {
  highschool: 1,
  diploma: 2,
  bachelor: 3,
  "b.tech": 3,
  btech: 3,
  "b.e": 3,
  be: 3,
  "b.s": 3,
  bs: 3,
  bsc: 3,
  "b.sc": 3,
  bca: 3,
  master: 4,
  "m.tech": 4,
  mtech: 4,
  "m.s": 4,
  ms: 4,
  msc: 4,
  "m.sc": 4,
  mca: 4,
  mba: 4,
  phd: 5,
  doctorate: 5
};

function getEducationLevel(text) {
  const lower = String(text || "").toLowerCase();
  let maxLevel = 0;
  for (const [key, level] of Object.entries(DEGREE_LEVELS)) {
    if (lower.includes(key)) {
      maxLevel = Math.max(maxLevel, level);
    }
  }
  return maxLevel;
}

function educationScore(education = [], preferredEducation = "") {
  if (!preferredEducation || !preferredEducation.trim()) return 1;
  const preferredLevel = getEducationLevel(preferredEducation) || 3; // default bachelor level
  const candidateText = education.join(" ");
  const candidateLevel = getEducationLevel(candidateText);

  if (candidateLevel >= preferredLevel) return 1;
  if (candidateLevel === preferredLevel - 1) return 0.8;
  return 0.6; // baseline for relevant experience/skills
}

function tokenize(text) {
  const words = String(text || "")
    .toLowerCase()
    .match(/[a-z0-9+#.]+/g) || [];
  return new Set(words.filter((w) => w.length > 1 && !STOP_WORDS.has(w)));
}

function keywordSimilarity(resumeText, jobText) {
  const resumeTokens = tokenize(resumeText);
  const jobTokens = tokenize(jobText);
  if (!jobTokens.size) return 0.5;

  let intersection = 0;
  for (const token of jobTokens) {
    if (resumeTokens.has(token)) intersection++;
  }
  return intersection / jobTokens.size;
}

export function matchCandidateToJob(candidate, job) {
  const skill = overlapScore(candidate.skills || [], job.requiredSkills || []);
  const exp = experienceScore(candidate.experienceYears || 0, job.minExperienceYears || 0);
  const edu = educationScore(candidate.education || [], job.preferredEducation);
  const keyword = keywordSimilarity(
    candidate.resumeText || "",
    `${job.title || ""} ${job.description || ""} ${(job.requiredSkills || []).join(" ")}`
  );

  const skillPoints = Math.round(skill.score * 40);
  const expPoints = Math.round(exp * 30);
  const eduPoints = Math.round(edu * 10);
  const keywordPoints = Math.round(keyword * 20);

  const totalScore = Math.min(100, Math.max(0, skillPoints + expPoints + eduPoints + keywordPoints));
  const recommendedRoles = inferRoles(candidate.skills || [], candidate.experienceYears || 0);

  const reasons = [];
  if (skill.score >= 0.7) reasons.push("Strong match with required technical skills.");
  else if (skill.score >= 0.4) reasons.push("Moderate skill alignment with some skill gaps.");
  else reasons.push("Noticeable skill gap for this position.");

  if (exp >= 1) reasons.push("Meets or exceeds required experience.");
  else reasons.push(`Candidate has ${candidate.experienceYears || 0} years experience (role requests ${job.minExperienceYears || 0}+).`);

  return {
    job: job._id,
    jobTitle: job.title,
    score: totalScore,
    reasoning: reasons.join(" "),
    missingSkills: skill.missing,
    recommendedRoles,
    breakdown: {
      skillOverlap: skillPoints,
      experienceRelevance: expPoints,
      educationFit: eduPoints,
      keywordSimilarity: keywordPoints
    }
  };
}
