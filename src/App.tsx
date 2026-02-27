import React, { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { DataPreview } from './components/DataPreview';
import { AnalysisProgress } from './components/AnalysisProgress';
import { FinalResults } from './components/FinalResults';
import { ComparisonDashboard } from './components/ComparisonDashboard';
import { SavedProjectsList } from './components/SavedProjectsList';
import { AnalysisStats, CommentData, ExportedAnalysis, SavedProject } from './types';
import { analyzeArabicSentimentBatch } from './services/geminiService';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Folder, Moon, Sun } from 'lucide-react';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'light' || saved === 'dark') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [stats, setStats] = useState<AnalysisStats>({
    total: 0,
    processed: 0,
    positive: 0,
    negative: 0,
    neutral: 0,
    verifiedTotal: 0,
    verifiedPositive: 0,
    verifiedNegative: 0,
    verifiedNeutral: 0,
    totalEngagement: 0,
    averageEngagement: 0,
    currentScore: 0,
    scoreHistory: [],
    startTime: 0,
  });
  const [processedComments, setProcessedComments] = useState<CommentData[]>([]);
  const [columnAnalyzed, setColumnAnalyzed] = useState<string>('');
  const [comparisonData, setComparisonData] = useState<ExportedAnalysis | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>(() => {
    const saved = localStorage.getItem('sentiment_projects');
    return saved ? JSON.parse(saved) : [];
  });
  const [showSavedProjects, setShowSavedProjects] = useState(false);

  const handleFileUpload = (uploadedFile: File) => {
    setFile(uploadedFile);
    setIsFinished(false);
    setProcessedComments([]);
    
    const ext = uploadedFile.name.split('.').pop()?.toLowerCase();
    
    if (ext === 'csv') {
      Papa.parse(uploadedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setData(results.data);
          if (results.meta.fields) {
            setColumns(results.meta.fields);
          }
        },
        error: (error) => {
          console.error("Error parsing CSV:", error);
          alert("Error parsing CSV file.");
        }
      });
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);
        setData(json);
        if (json.length > 0) {
          setColumns(Object.keys(json[0] as object));
        }
      };
      reader.readAsArrayBuffer(uploadedFile);
    } else if (ext === 'json') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          
          if (json.metadata && json.stats && json.comments) {
            // It's an exported analysis
            setColumnAnalyzed(json.metadata.columnAnalyzed);
            setStats(json.stats);
            setProcessedComments(json.comments);
            setIsFinished(true);
            setIsAnalyzing(false);
            setData([]);
            return;
          }

          const dataArray = Array.isArray(json) ? json : [json];
          setData(dataArray);
          if (dataArray.length > 0) {
            setColumns(Object.keys(dataArray[0]));
          }
        } catch (error) {
          console.error("Error parsing JSON:", error);
          alert("Error parsing JSON file.");
        }
      };
      reader.readAsText(uploadedFile);
    }
  };

  const handleReset = () => {
    setFile(null);
    setData([]);
    setColumns([]);
    setIsAnalyzing(false);
    setIsFinished(false);
    setProcessedComments([]);
    setColumnAnalyzed('');
    setComparisonData(null);
    setIsComparing(false);
    setStats({
      total: 0,
      processed: 0,
      positive: 0,
      negative: 0,
      neutral: 0,
      verifiedTotal: 0,
      verifiedPositive: 0,
      verifiedNegative: 0,
      verifiedNeutral: 0,
      totalEngagement: 0,
      averageEngagement: 0,
      currentScore: 0,
      scoreHistory: [],
      startTime: 0,
    });
  };

  const startAnalysis = async (column: string, verifiedColumn: string, engagementColumn: string, batchSize: number, delayMs: number) => {
    setColumnAnalyzed(column);
    setIsAnalyzing(true);
    setIsFinished(false);
    
    // Extract comments and verified status
    const commentsData = data
      .map(row => ({
        text: String(row[column] || '').trim(),
        isVerified: verifiedColumn ? String(row[verifiedColumn] || '').toLowerCase() === 'true' || String(row[verifiedColumn] || '') === '1' || String(row[verifiedColumn] || '').toLowerCase() === 'yes' : false,
        engagement: engagementColumn ? parseFloat(row[engagementColumn]) || 0 : 0
      }))
      .filter(item => item.text.length > 0);
      
    // Limit to 100 for demo purposes to avoid long waits/rate limits, 
    // but in a real app you might process all or batch them over time.
    // We'll process all of them now since we have batching and delay controls.
    const commentsToProcess = commentsData;
    
    const initialStats: AnalysisStats = {
      total: commentsToProcess.length,
      processed: 0,
      positive: 0,
      negative: 0,
      neutral: 0,
      verifiedTotal: 0,
      verifiedPositive: 0,
      verifiedNegative: 0,
      verifiedNeutral: 0,
      totalEngagement: 0,
      averageEngagement: 0,
      currentScore: 0,
      scoreHistory: [],
      startTime: Date.now(),
    };
    
    setStats(initialStats);
    setProcessedComments([]);

    let currentStats = { ...initialStats };
    const allProcessed: CommentData[] = [];

    for (let i = 0; i < commentsToProcess.length; i += batchSize) {
      if (i > 0 && delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }

      const batch = commentsToProcess.slice(i, i + batchSize);
      const batchTexts = batch.map(b => b.text);
      
      // Update UI to show we are analyzing this batch
      currentStats.currentComment = { id: i, text: batchTexts[0] };
      setStats({ ...currentStats });

      const results = await analyzeArabicSentimentBatch(batchTexts);
      
      results.forEach((res, idx) => {
        const globalIdx = i + idx;
        const isVerified = batch[idx].isVerified;
        const engagement = batch[idx].engagement;
        const commentData: CommentData = {
          id: globalIdx + 1,
          text: batchTexts[idx],
          sentiment: res.sentiment,
          score: res.score,
          isVerified,
          engagement
        };
        
        allProcessed.push(commentData);
        
        currentStats.processed += 1;
        if (isVerified) {
          currentStats.verifiedTotal += 1;
        }
        if (engagement) {
          currentStats.totalEngagement += engagement;
        }
        currentStats.averageEngagement = currentStats.totalEngagement / currentStats.processed;

        let mappedScore = 0;
        if (res.sentiment === 'positive') {
          currentStats.positive += 1;
          if (isVerified) currentStats.verifiedPositive += 1;
          mappedScore = 100;
        } else if (res.sentiment === 'negative') {
          currentStats.negative += 1;
          if (isVerified) currentStats.verifiedNegative += 1;
          mappedScore = -100;
        } else {
          currentStats.neutral += 1;
          if (isVerified) currentStats.verifiedNeutral += 1;
          mappedScore = 0;
        }
        
        // Net Sentiment Score: (Positive - Negative) / Processed * 100
        currentStats.currentScore = 
          ((currentStats.positive - currentStats.negative) / currentStats.processed) * 100;
          
        currentStats.scoreHistory.push(mappedScore);
        currentStats.currentComment = commentData;
        
        // Update state frequently to show progress
        setStats({ ...currentStats });
      });
      
      setProcessedComments([...allProcessed]);
    }

    currentStats.endTime = Date.now();
    setStats({ ...currentStats });
    setIsAnalyzing(false);
    setIsFinished(true);
  };

  const handleCompare = (data: ExportedAnalysis) => {
    setComparisonData(data);
    setIsComparing(true);
  };

  const handleSaveProject = (name: string, data: ExportedAnalysis) => {
    const newProject: SavedProject = {
      id: Date.now().toString(),
      name,
      date: new Date().toISOString(),
      data
    };
    const updated = [...savedProjects, newProject];
    setSavedProjects(updated);
    try {
      localStorage.setItem('sentiment_projects', JSON.stringify(updated));
      alert('Project saved successfully!');
    } catch (e) {
      console.error(e);
      alert('Failed to save project. The data might be too large for local storage.');
    }
  };

  const handleDeleteProject = (id: string) => {
    const updated = savedProjects.filter(p => p.id !== id);
    setSavedProjects(updated);
    localStorage.setItem('sentiment_projects', JSON.stringify(updated));
  };

  const loadSavedProject = (project: SavedProject) => {
    const json = project.data;
    setColumnAnalyzed(json.metadata.columnAnalyzed);
    setStats(json.stats);
    setProcessedComments(json.comments);
    setIsFinished(true);
    setIsAnalyzing(false);
    setData([]);
    setShowSavedProjects(false);
    setIsComparing(false);
    setComparisonData(null);
  };

  const currentExportedData: ExportedAnalysis = {
    metadata: {
      columnAnalyzed,
      evaluationTime: stats.endTime ? (stats.endTime - stats.startTime) / 1000 : 0,
      processingSpeed: stats.endTime ? (stats.total / ((stats.endTime - stats.startTime) / 1000)).toFixed(1) : 0,
      timestamp: new Date().toISOString()
    },
    stats,
    comments: processedComments
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-purple-500/30 selection:text-purple-200 pb-20">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-[#6a11cb] to-[#2575fc] p-2 rounded-xl shadow-sm">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6a11cb] to-[#2575fc]">
              Arabic Sentiment Analyzer
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            {file && (
              <button
                onClick={handleReset}
                className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-rose-400 transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Start Over
              </button>
            )}
            <button
              onClick={() => setShowSavedProjects(true)}
              className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-purple-400 transition-colors flex items-center"
            >
              <Folder className="w-4 h-4 mr-1" />
              Saved Projects ({savedProjects.length})
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-purple-500 dark:hover:text-purple-400 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <div className="text-sm text-slate-500 font-medium hidden sm:block">
              Powered by Gemini AI
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {showSavedProjects ? (
          <SavedProjectsList
            projects={savedProjects}
            onLoad={loadSavedProject}
            onDelete={handleDeleteProject}
            onClose={() => setShowSavedProjects(false)}
          />
        ) : (
          <>
            {/* Intro Section */}
            {!file && (
              <div className="text-center max-w-2xl mx-auto space-y-4 py-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                  Analyze Arabic text with <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6a11cb] to-[#2575fc]">precision</span>
                </h2>
                <p className="text-lg text-slate-500 dark:text-slate-400">
                  Upload your dataset containing Arabic comments, reviews, or feedback. 
                  Our AI will instantly analyze the sentiment and provide actionable insights.
                </p>
              </div>
            )}

            {/* Upload Section */}
            {!isAnalyzing && !isFinished && (
              <div className="max-w-3xl mx-auto animate-in fade-in duration-500">
                <FileUpload onFileUpload={handleFileUpload} />
                {file && (
                  <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center text-emerald-400">
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    File <strong className="ml-1 text-emerald-300">{file.name}</strong> uploaded successfully!
                  </div>
                )}
              </div>
            )}

            {/* Data Preview & Settings */}
            {file && data.length > 0 && !isAnalyzing && !isFinished && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
                <DataPreview 
                  data={data} 
                  columns={columns} 
                  onStartAnalysis={startAnalysis} 
                />
              </div>
            )}

            {/* Analysis Progress */}
            {isAnalyzing && (
              <div className="animate-in fade-in duration-500">
                <AnalysisProgress stats={stats} />
              </div>
            )}

            {/* Final Results */}
            {isFinished && !isComparing && (
              <FinalResults 
                stats={stats} 
                columnAnalyzed={columnAnalyzed} 
                processedComments={processedComments} 
                onCompare={handleCompare}
                onReset={handleReset}
                onSave={handleSaveProject}
              />
            )}

            {/* Comparison Dashboard */}
            {isFinished && isComparing && comparisonData && (
              <ComparisonDashboard
                brand1={currentExportedData}
                brand2={comparisonData}
                brand1Name="Current Analysis"
                brand2Name="Compared Brand"
                onClose={() => setIsComparing(false)}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
