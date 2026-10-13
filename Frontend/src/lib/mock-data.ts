export const kpis = [
  { label: "Total Reviews", value: "128,492", delta: "+12.4%", trend: "up" as const },
  { label: "Positive", value: "112,984", delta: "+8.2%", trend: "up" as const },
  { label: "Negative", value: "9,318", delta: "-2.1%", trend: "down" as const },
  { label: "Neutral", value: "6,190", delta: "+0.4%", trend: "up" as const },
  { label: "Avg. Rating", value: "4.82", delta: "+0.06", trend: "up" as const },
  { label: "AI Confidence", value: "99.4%", delta: "Optimal", trend: "up" as const },
];

export const sentimentTrend = [
  { month: "Jan", positive: 4200, neutral: 380, negative: 620 },
  { month: "Feb", positive: 4600, neutral: 410, negative: 540 },
  { month: "Mar", positive: 5100, neutral: 460, negative: 490 },
  { month: "Apr", positive: 5480, neutral: 420, negative: 610 },
  { month: "May", positive: 6210, neutral: 510, negative: 580 },
  { month: "Jun", positive: 6890, neutral: 540, negative: 520 },
  { month: "Jul", positive: 7420, neutral: 590, negative: 490 },
  { month: "Aug", positive: 8010, neutral: 610, negative: 470 },
  { month: "Sep", positive: 8320, neutral: 640, negative: 510 },
  { month: "Oct", positive: 8890, neutral: 690, negative: 490 },
  { month: "Nov", positive: 9410, neutral: 720, negative: 460 },
  { month: "Dec", positive: 9820, neutral: 780, negative: 440 },
];

export const sentimentDistribution = [
  { name: "Positive", value: 88, color: "#22c55e" },
  { name: "Neutral", value: 7, color: "#94a3b8" },
  { name: "Negative", value: 5, color: "#ef4444" },
];

export const aspectAnalysis = [
  { aspect: "Usability", positive: 92, negative: 8 },
  { aspect: "Performance", positive: 82, negative: 18 },
  { aspect: "Pricing", positive: 74, negative: 26 },
  { aspect: "Support", positive: 88, negative: 12 },
  { aspect: "Shipping", positive: 68, negative: 32 },
  { aspect: "Design", positive: 94, negative: 6 },
];

export const emotions = [
  { emotion: "Delight", value: 62 },
  { emotion: "Trust", value: 74 },
  { emotion: "Anticipation", value: 48 },
  { emotion: "Surprise", value: 32 },
  { emotion: "Frustration", value: 18 },
  { emotion: "Confusion", value: 14 },
];

export const recentReviews = [
  {
    id: "R-99402",
    author: "Sarah Jenkins",
    product: "Enterprise Plan",
    sentiment: "positive" as const,
    score: 0.98,
    text: "The enterprise integration was surprisingly fast. Documentation is clear and concise, our team was up in a day.",
    time: "4m ago",
  },
  {
    id: "R-99401",
    author: "Mark Thorne",
    product: "Analytics Pro",
    sentiment: "neutral" as const,
    score: 0.62,
    text: "Powerful tools, but the dashboard takes a moment to learn. I wish there were more direct PDF exports.",
    time: "12m ago",
  },
  {
    id: "R-99400",
    author: "Priya Patel",
    product: "Reviews API",
    sentiment: "positive" as const,
    score: 0.94,
    text: "The API latency is excellent — averaging 42ms across our production traffic. Aspect detection is spot-on.",
    time: "28m ago",
  },
  {
    id: "R-99399",
    author: "Diego Ramos",
    product: "Insights Cloud",
    sentiment: "negative" as const,
    score: 0.21,
    text: "Onboarding webhooks failed twice. Support resolved it, but the initial experience was rough.",
    time: "1h ago",
  },
  {
    id: "R-99398",
    author: "Ayesha Khan",
    product: "Enterprise Plan",
    sentiment: "positive" as const,
    score: 0.91,
    text: "Aspect-level breakdowns are a game changer — we caught a shipping issue two weeks ahead of our NPS survey.",
    time: "2h ago",
  },
];

export const products = [
  { id: "p1", name: "Enterprise Plan", rating: 4.9, positive: 94, negative: 6, reviews: 4210 },
  { id: "p2", name: "Analytics Pro", rating: 4.6, positive: 88, negative: 12, reviews: 3120 },
  { id: "p3", name: "Reviews API", rating: 4.8, positive: 92, negative: 8, reviews: 2890 },
  { id: "p4", name: "Insights Cloud", rating: 4.4, positive: 82, negative: 18, reviews: 2140 },
  { id: "p5", name: "Sentiment Studio", rating: 4.7, positive: 90, negative: 10, reviews: 1980 },
  { id: "p6", name: "Reports Engine", rating: 4.5, positive: 86, negative: 14, reviews: 1520 },
];

export const activity = [
  { time: "14:02", event: "Model retrained on 12,402 new reviews", tag: "system" },
  { time: "13:48", event: "Sarah Jenkins exported Q4 report", tag: "user" },
  { time: "13:22", event: "Aspect drift detected: Shipping (-6%)", tag: "alert" },
  { time: "12:58", event: "New integration: Shopify Reviews", tag: "system" },
  { time: "12:31", event: "Weekly digest sent to 24 recipients", tag: "system" },
];