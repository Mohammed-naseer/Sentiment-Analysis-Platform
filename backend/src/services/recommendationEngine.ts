import { IDatasetProfile } from '../models/Dataset';
import { IRecommendedAnalysis } from '../models/AnalysisJob';

export const generateAnalysisRecommendations = (profile: IDatasetProfile): IRecommendedAnalysis[] => {
  const recommendations: IRecommendedAnalysis[] = [];

  const textCols = profile.columns.filter(c => c.type === 'text' || c.semanticRole === 'feedback_text');
  const ratingCols = profile.columns.filter(c => c.semanticRole === 'rating' || (c.type === 'numeric' && c.name.toLowerCase().includes('rating')));
  const dateCols = profile.columns.filter(c => c.type === 'date' || c.semanticRole === 'timestamp');
  const prodCols = profile.columns.filter(c => c.semanticRole === 'product_category' || c.type === 'categorical');

  const hasText = textCols.length > 0;
  const hasDates = dateCols.length > 0;
  const hasRatings = ratingCols.length > 0;
  const hasProducts = prodCols.length > 0;

  // 1. Sentiment & Emotion Analysis
  if (hasText) {
    recommendations.push({
      id: 'sentiment_analysis',
      name: 'Multi-Model Sentiment Analysis',
      priority: 'High',
      applicable: true,
      description: 'Analyze overall tone (Positive, Negative, Neutral, Mixed) across feedback text.',
      why: `Dataset contains textual feedback in field "${textCols[0].name}", making sentiment analysis highly relevant.`
    });

    recommendations.push({
      id: 'emotion_analysis',
      name: 'Emotion & Tone Detection',
      priority: 'High',
      applicable: true,
      description: 'Detect core emotions (Joy, Anger, Frustration, Sadness, Surprise).',
      why: 'Rich textual responses allow deep emotional and customer sentiment intensity profiling.'
    });

    recommendations.push({
      id: 'aspect_analysis',
      name: 'Aspect-Based Sentiment Analysis',
      priority: 'High',
      applicable: true,
      description: 'Extract specific features (e.g. Battery, Camera, Service, Delivery) and score sentiment per aspect.',
      why: 'Identifies granular positive and negative sentiment drivers across specific product or service attributes.'
    });
  } else {
    recommendations.push({
      id: 'sentiment_analysis',
      name: 'Multi-Model Sentiment Analysis',
      priority: 'Low',
      applicable: false,
      description: 'Analyze sentiment in textual feedback.',
      why: 'This dataset does not contain a suitable textual feedback column, so sentiment analysis may not be meaningful.'
    });
  }

  // 2. Trend & Emerging Issue Analysis
  if (hasDates && hasText) {
    recommendations.push({
      id: 'sentiment_trends',
      name: 'Temporal Sentiment Trends',
      priority: 'High',
      applicable: true,
      description: 'Track daily, weekly, and monthly sentiment movements over time.',
      why: `Found date column "${dateCols[0].name}" to analyze temporal shifts in customer satisfaction.`
    });

    recommendations.push({
      id: 'emerging_issues',
      name: 'Emerging Issue Detection',
      priority: 'High',
      applicable: true,
      description: 'Detect sudden spikes in negative feedback, complaints, or quality issues.',
      why: 'Combines dates and text columns to alert on rapidly escalating customer complaints.'
    });
  } else if (hasDates) {
    recommendations.push({
      id: 'volume_trends',
      name: 'Temporal Record Trends',
      priority: 'Medium',
      applicable: true,
      description: 'Track record creation and activity rates across time periods.',
      why: `Found timestamp column "${dateCols[0].name}" to compute temporal volume distributions.`
    });
  }

  // 3. Product / Category Comparison
  if (hasProducts) {
    recommendations.push({
      id: 'product_comparison',
      name: 'Product & Category Comparison',
      priority: 'High',
      applicable: true,
      description: 'Compare sentiment, ratings, and feedback volume across categories/products.',
      why: `Found categorical product column "${prodCols[0].name}" suitable for cross-item comparison.`
    });
  }

  // 4. Rating Distribution & Correlation
  if (hasRatings) {
    recommendations.push({
      id: 'rating_analysis',
      name: 'Rating Distribution & Sentiment Alignment',
      priority: 'High',
      applicable: true,
      description: 'Analyze numeric ratings distribution and correlate rating scores with review sentiment.',
      why: `Found numeric rating column "${ratingCols[0].name}" suitable for star rating analysis.`
    });
  }

  // 5. Root-Cause Analysis
  if (hasText) {
    recommendations.push({
      id: 'root_cause_analysis',
      name: 'Root-Cause Analysis',
      priority: 'High',
      applicable: true,
      description: 'Pinpoint primary drivers of negative sentiment and customer dissatisfaction.',
      why: 'Analyzes negative feedback text to categorize primary failure modes and operational bottlenecks.'
    });
  }

  return recommendations;
};
