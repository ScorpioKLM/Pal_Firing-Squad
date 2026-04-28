const VALUE_KEYWORDS = {
  trust: ["honest", "truth", "loyal", "faithful", "integrity", "return", "responsible", "safe"],
  growth: ["learn", "improve", "goals", "dream", "therapy", "resolve", "communicate"],
  adventure: ["spontaneous", "travel", "adventurous", "try", "virtual reality", "movie"],
  animals: ["animal", "orcas", "peta", "sea world", "seaworld", "captivity"],
  justice: ["law", "legal", "ethical", "moral", "injustice", "discriminated", "environment", "death penalty"],
  spirituality: ["religion", "god", "jesus"],
  family: ["children", "parents", "child", "family"],
  lifestyle: ["clean", "messy", "punctual", "late", "coffee", "free time", "relax", "food", "music"]
};

function normalize(text = "") {
  return text.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
}

function tokenize(text = "") {
  return new Set(normalize(text).split(" ").filter(Boolean));
}

function jaccard(a, b) {
  const A = tokenize(a);
  const B = tokenize(b);
  if (!A.size || !B.size) return 0.35;
  const intersection = [...A].filter(x => B.has(x)).length;
  const union = new Set([...A, ...B]).size;
  return intersection / union;
}

function classifyQuestion(q) {
  const n = normalize(q);
  for (const [category, words] of Object.entries(VALUE_KEYWORDS)) {
    if (words.some(w => n.includes(w))) return category;
  }
  return "personality";
}

function scorePair(friendAnswer, yourAnswer) {
  const f = normalize(friendAnswer);
  const y = normalize(yourAnswer);
  if (!f || !y) return 50;

  const overlap = jaccard(f, y);
  let score = 45 + overlap * 55;

  const agreementWords = ["yes", "agree", "absolutely", "definitely", "return", "truth", "honest", "legal", "safe"];
  const disagreementWords = ["no", "disagree", "never", "illegal", "silent", "keep", "lie"];

  const fAgree = agreementWords.some(w => f.includes(w));
  const yAgree = agreementWords.some(w => y.includes(w));
  const fDisagree = disagreementWords.some(w => f.includes(w));
  const yDisagree = disagreementWords.some(w => y.includes(w));

  if ((fAgree && yAgree) || (fDisagree && yDisagree)) score += 15;
  if ((fAgree && yDisagree) || (fDisagree && yAgree)) score -= 20;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function buildCompatibilityReport(questions, friendAnswers, yourAnswers) {
  const categories = {};

  questions.forEach((q, index) => {
    const category = classifyQuestion(q);
    const score = scorePair(friendAnswers[index], yourAnswers[index]);
    if (!categories[category]) categories[category] = [];
    categories[category].push({ question: q, score, friend: friendAnswers[index] || "", you: yourAnswers[index] || "" });
  });

  const categorySummaries = Object.entries(categories).map(([category, items]) => {
    const avg = Math.round(items.reduce((sum, item) => sum + item.score, 0) / items.length);
    const strongest = [...items].sort((a, b) => b.score - a.score).slice(0, 3);
    const tension = [...items].sort((a, b) => a.score - b.score).slice(0, 3);
    return { category, average: avg, strongest, tension };
  }).sort((a, b) => b.average - a.average);

  const overall = Math.round(categorySummaries.reduce((sum, c) => sum + c.average, 0) / categorySummaries.length);

  const topStrengths = categorySummaries.slice(0, 3).map(c => c.category);
  const growthZones = [...categorySummaries].sort((a, b) => a.average - b.average).slice(0, 3).map(c => c.category);

  return {
    overall,
    verdict:
      overall >= 85 ? "High compatibility with strong alignment across values, lifestyle, and conflict-resolution instincts." :
      overall >= 70 ? "Promising compatibility with a few areas that deserve direct conversation." :
      overall >= 55 ? "Mixed compatibility. There are real connection points, but the differences need care and clarity." :
      "Low-to-moderate compatibility. This connection may still work, but only with unusually strong communication and boundaries.",
    topStrengths,
    growthZones,
    categorySummaries
  };
}
