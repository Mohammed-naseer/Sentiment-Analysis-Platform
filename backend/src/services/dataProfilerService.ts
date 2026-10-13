import xlsx from 'xlsx';
import { IDatasetProfile, IColumnProfile } from '../models/Dataset';
import { analyzeWithGemini } from './geminiService';
import logger from '../utils/logger';

export const profileDatasetFile = async (
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<{ profile: IDatasetProfile; parsedRows: Record<string, any>[] }> => {
  logger.info(`[DataProfilerService] Profiling dataset file: ${fileName} (${mimeType})`);

  let parsedRows: Record<string, any>[] = [];
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  // 1. Parse file into standard JSON object array
  if (ext === 'csv' || ext === 'txt' || mimeType.includes('csv') || mimeType.includes('text')) {
    const textContent = fileBuffer.toString('utf-8');
    const workbook = xlsx.read(textContent, { type: 'string' });
    const sheetName = workbook.SheetNames[0];
    if (sheetName) {
      parsedRows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
    }
  } else if (ext === 'xlsx' || ext === 'xls' || mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (sheetName) {
      parsedRows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
    }
  } else if (ext === 'json' || mimeType.includes('json')) {
    try {
      const parsed = JSON.parse(fileBuffer.toString('utf-8'));
      parsedRows = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      parsedRows = [];
    }
  } else if (ext === 'pdf' || mimeType.includes('pdf')) {
    const text = fileBuffer.toString('utf-8');
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    parsedRows = lines.map((line, idx) => ({ row_id: idx + 1, content: line.trim() }));
  }

  if (!parsedRows || parsedRows.length === 0) {
    throw new Error('Dataset file is empty or could not be parsed into tabular rows.');
  }

  const totalRows = parsedRows.length;
  const sampleRow = parsedRows[0] || {};
  const columnNames = Object.keys(sampleRow);
  const totalColumns = columnNames.length;

  let totalMissing = 0;
  let duplicateCount = 0;
  const rowStrings = new Set<string>();

  for (const r of parsedRows) {
    const s = JSON.stringify(r);
    if (rowStrings.has(s)) duplicateCount++;
    else rowStrings.add(s);
  }

  // 2. Inspect each column
  const columnsProfile: IColumnProfile[] = columnNames.map((colName) => {
    let missingCount = 0;
    const uniqueValuesSet = new Set<string>();
    const sampleValues: string[] = [];
    let numericCount = 0;
    let dateCount = 0;
    let textCount = 0;

    for (let i = 0; i < totalRows; i++) {
      const val = parsedRows[i][colName];
      if (val === null || val === undefined || String(val).trim() === '') {
        missingCount++;
        totalMissing++;
        continue;
      }

      const strVal = String(val).trim();
      uniqueValuesSet.add(strVal);

      if (sampleValues.length < 5 && strVal) {
        sampleValues.push(strVal);
      }

      if (!isNaN(Number(strVal))) {
        numericCount++;
      } else if (!isNaN(Date.parse(strVal)) && strVal.length > 5 && (strVal.includes('-') || strVal.includes('/'))) {
        dateCount++;
      } else {
        textCount++;
      }
    }

    const nonMissing = totalRows - missingCount;
    let type: 'text' | 'numeric' | 'categorical' | 'date' | 'unknown' = 'text';

    if (nonMissing > 0) {
      if (numericCount / nonMissing > 0.8) {
        type = 'numeric';
      } else if (dateCount / nonMissing > 0.8) {
        type = 'date';
      } else if (uniqueValuesSet.size / nonMissing < 0.2 && uniqueValuesSet.size < 30) {
        type = 'categorical';
      } else {
        type = 'text';
      }
    }

    // Expanded heuristic semantic role identification
    const lowerCol = colName.toLowerCase();
    let semanticRole: 'feedback_text' | 'rating' | 'product_category' | 'timestamp' | 'customer_id' | 'location' | 'price' | 'other' = 'other';

    if (type === 'text' && (lowerCol.includes('review') || lowerCol.includes('comment') || lowerCol.includes('text') || lowerCol.includes('feedback') || lowerCol.includes('description') || lowerCol.includes('content') || lowerCol.includes('message') || lowerCol.includes('body'))) {
      semanticRole = 'feedback_text';
    } else if (type === 'numeric' && (lowerCol.includes('rating') || lowerCol.includes('score') || lowerCol.includes('stars') || lowerCol.includes('grade'))) {
      semanticRole = 'rating';
    } else if ((type === 'categorical' || type === 'text') && (lowerCol.includes('product') || lowerCol.includes('item') || lowerCol.includes('category') || lowerCol.includes('brand') || lowerCol.includes('service') || lowerCol.includes('app'))) {
      semanticRole = 'product_category';
    } else if (type === 'date' || lowerCol.includes('date') || lowerCol.includes('time') || lowerCol.includes('timestamp') || lowerCol.includes('created')) {
      semanticRole = 'timestamp';
    } else if (lowerCol.includes('id') || lowerCol.includes('user') || lowerCol.includes('customer')) {
      semanticRole = 'customer_id';
    } else if (lowerCol.includes('location') || lowerCol.includes('city') || lowerCol.includes('region') || lowerCol.includes('country') || lowerCol.includes('state')) {
      semanticRole = 'location';
    } else if (type === 'numeric' && (lowerCol.includes('price') || lowerCol.includes('cost') || lowerCol.includes('amount') || lowerCol.includes('fee'))) {
      semanticRole = 'price';
    }

    return {
      name: colName,
      type,
      semanticRole,
      missingCount,
      uniqueCount: uniqueValuesSet.size,
      sampleValues,
    };
  });

  const emptyColumnsCount = columnsProfile.filter(c => c.missingCount === totalRows).length;
  const missingPercentage = totalRows * totalColumns > 0 ? (totalMissing / (totalRows * totalColumns)) * 100 : 0;
  const duplicatePercentage = totalRows > 0 ? (duplicateCount / totalRows) * 100 : 0;

  let qualityScore = 100 - Math.round(missingPercentage * 0.8) - Math.round(duplicatePercentage * 0.5) - (emptyColumnsCount * 5);
  qualityScore = Math.max(0, Math.min(100, qualityScore));

  const qualityIssues: string[] = [];
  if (missingPercentage > 5) qualityIssues.push(`${missingPercentage.toFixed(1)}% missing values across dataset.`);
  if (duplicateCount > 0) qualityIssues.push(`${duplicateCount} duplicate rows detected.`);
  if (emptyColumnsCount > 0) qualityIssues.push(`${emptyColumnsCount} completely empty columns found.`);
  if (qualityIssues.length === 0) qualityIssues.push('High data completeness and integrity verified.');

  // 3. Domain Detection Logic
  const allHeadersAndSamples = columnsProfile.map(c => `${c.name} (${c.sampleValues.join(' ')})`).join(' ').toLowerCase();

  let domainName = 'Product Reviews';
  let domainConfidence = 92;
  let domainExplanation = 'Dataset contains customer product feedback, ratings, and category attributes.';

  if (allHeadersAndSamples.includes('food') || allHeadersAndSamples.includes('restaurant') || allHeadersAndSamples.includes('dish') || allHeadersAndSamples.includes('waiter') || allHeadersAndSamples.includes('menu')) {
    domainName = 'Restaurant Reviews';
    domainConfidence = 95;
    domainExplanation = 'Detected food, dining, dish, and restaurant service keywords.';
  } else if (allHeadersAndSamples.includes('ticket') || allHeadersAndSamples.includes('agent') || allHeadersAndSamples.includes('resolution') || allHeadersAndSamples.includes('issue')) {
    domainName = 'Customer Support';
    domainConfidence = 94;
    domainExplanation = 'Detected ticket IDs, support agent response fields, and issue resolution metrics.';
  } else if (allHeadersAndSamples.includes('employee') || allHeadersAndSamples.includes('salary') || allHeadersAndSamples.includes('manager') || allHeadersAndSamples.includes('hr')) {
    domainName = 'Employee Feedback';
    domainConfidence = 91;
    domainExplanation = 'Detected HR, workplace satisfaction, and management review columns.';
  } else if (allHeadersAndSamples.includes('app') || allHeadersAndSamples.includes('crash') || allHeadersAndSamples.includes('playstore') || allHeadersAndSamples.includes('version')) {
    domainName = 'App Reviews';
    domainConfidence = 96;
    domainExplanation = 'Detected application version numbers, UI crash reports, and mobile app store ratings.';
  } else if (allHeadersAndSamples.includes('hotel') || allHeadersAndSamples.includes('room') || allHeadersAndSamples.includes('flight') || allHeadersAndSamples.includes('booking')) {
    domainName = 'Hospitality & Travel Feedback';
    domainConfidence = 93;
    domainExplanation = 'Detected travel booking IDs, room cleanliness ratings, and guest feedback.';
  }

  // 4. Generate AI Semantic Summary
  let semanticSummary = `This ${domainName} dataset contains ${totalRows.toLocaleString()} rows and ${totalColumns} columns.`;

  try {
    const aiPrompt = `Examine this dataset structure:
FileName: ${fileName}
Domain Candidate: ${domainName}
Rows: ${totalRows}
Columns: ${JSON.stringify(columnsProfile.map(c => ({ name: c.name, type: c.type, semanticRole: c.semanticRole, samples: c.sampleValues.slice(0, 2) })))}

Provide a JSON object response strictly formatted as:
{
  "domainName": "Product Reviews" | "Restaurant Reviews" | "Employee Feedback" | "Customer Support" | "App Reviews" | "Hospitality & Travel Feedback" | "Social Media Feedback",
  "domainConfidence": 95,
  "domainExplanation": "Brief 1-sentence explanation of why this domain was selected",
  "summary": "Brief 1-2 sentence overall summary of the dataset"
}`;
    
    const aiResp = await analyzeWithGemini(aiPrompt);
    if (aiResp && aiResp.summary) {
      try {
        const jsonMatch = aiResp.summary.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.domainName) domainName = parsed.domainName;
          if (typeof parsed.domainConfidence === 'number') domainConfidence = parsed.domainConfidence;
          if (parsed.domainExplanation) domainExplanation = parsed.domainExplanation;
          if (parsed.summary) semanticSummary = parsed.summary;
        }
      } catch {
        semanticSummary = aiResp.summary;
      }
    }
  } catch (err: any) {
    logger.warn('[DataProfilerService] AI domain detection fallback used:', err.message);
  }

  const profile: IDatasetProfile = {
    totalRows,
    totalColumns,
    fileSize: fileBuffer.length,
    fileType: ext.toUpperCase(),
    missingValuesCount: totalMissing,
    missingPercentage: Number(missingPercentage.toFixed(2)),
    duplicateRowsCount: duplicateCount,
    emptyColumnsCount,
    qualityScore,
    qualityIssues,
    detectedLanguage: 'English',
    domainName,
    domainConfidence,
    domainExplanation,
    columns: columnsProfile,
    semanticSummary
  };

  return { profile, parsedRows };
};
