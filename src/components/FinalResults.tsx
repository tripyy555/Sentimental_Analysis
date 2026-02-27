import React, { useState, useMemo } from 'react';
import { AnalysisStats, CommentData } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar, XAxis as BarXAxis, YAxis as BarYAxis } from 'recharts';
import { Download, FileText, Clock, Zap, Target, Activity, CheckCircle, ChevronDown, ChevronUp, FileJson, BarChart2, Scale, Home, Save, Filter, X } from 'lucide-react';
import { ExportedAnalysis } from '../types';

interface FinalResultsProps {
  stats: AnalysisStats;
  columnAnalyzed: string;
  processedComments: CommentData[];
  onCompare?: (data: ExportedAnalysis) => void;
  onReset?: () => void;
  onSave?: (name: string, data: ExportedAnalysis) => void;
}

const COLORS = ['#10b981', '#f43f5e', '#f59e0b']; // emerald-500, rose-500, amber-500

export function FinalResults({ stats, columnAnalyzed, processedComments, onCompare, onReset, onSave }: FinalResultsProps) {
  const [showVerifiedChart, setShowVerifiedChart] = useState(false);
  const [showVerifiedTable, setShowVerifiedTable] = useState(false);
  
  // Filtering state
  const [verifiedFilter, setVerifiedFilter] = useState<'all' | 'verified' | 'unverified'>('all');
  const [sentimentFilter, setSentimentFilter] = useState<string[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [scoreFilter, setScoreFilter] = useState<number | ''>('');

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveProjectName, setSaveProjectName] = useState(`Analysis - ${columnAnalyzed}`);

  const evaluationTime = stats.endTime ? (stats.endTime - stats.startTime) / 1000 : 0;
  const processingSpeed = evaluationTime > 0 ? (stats.total / evaluationTime).toFixed(1) : 0;

  const posNegTotal = stats.positive + stats.negative;
  const brandSentiment = posNegTotal > 0 ? (stats.positive / posNegTotal) * 100 : 0;
  const netSentimentScore = stats.total > 0 ? ((stats.positive - stats.negative) / stats.total) * 100 : 0;

  const pieData = [
    { name: 'Positive', value: stats.positive },
    { name: 'Negative', value: stats.negative },
    { name: 'Neutral', value: stats.neutral },
  ];

  const barData = [
    { name: 'Positive', value: stats.positive, fill: '#10b981' },
    { name: 'Negative', value: stats.negative, fill: '#f43f5e' },
  ];

  const verifiedBarData = [
    { name: 'Positive', value: stats.verifiedPositive, fill: '#10b981' },
    { name: 'Negative', value: stats.verifiedNegative, fill: '#f43f5e' },
  ];

  const scoreHistory = stats.scoreHistory || [];
  const windowSize = Math.max(3, Math.floor(scoreHistory.length / 10));
  const lineData = scoreHistory.map((score, index, array) => {
    const start = Math.max(0, index - windowSize + 1);
    const windowSlice = array.slice(start, index + 1);
    const average = windowSlice.reduce((sum, val) => sum + val, 0) / windowSlice.length;
    return {
      index,
      score: average,
      rawScore: score
    };
  });

  const filteredComments = useMemo(() => {
    return (processedComments || []).filter(comment => {
      // Verified filter
      if (verifiedFilter === 'verified' && !comment.isVerified) return false;
      if (verifiedFilter === 'unverified' && comment.isVerified) return false;

      // Sentiment filter
      if (sentimentFilter.length > 0 && !sentimentFilter.includes(comment.sentiment)) return false;

      return true;
    });
  }, [processedComments, verifiedFilter, sentimentFilter]);

  const clearFilters = () => {
    setVerifiedFilter('all');
    setSentimentFilter([]);
  };

  const handleDownloadCSV = () => {
    if (!processedComments || processedComments.length === 0) return;

    const headers = ['id', 'text', 'sentiment', 'score', 'isVerified', 'engagement'];
    const csvContent = [
      headers.join(','),
      ...processedComments.map(c => 
        `${c.id},"${c.text.replace(/"/g, '""')}","${c.sentiment}",${c.score},${c.isVerified ? 'Yes' : 'No'},${c.engagement || 0}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `sentiment_results_${columnAnalyzed}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    if (!processedComments || processedComments.length === 0) return;

    const exportData = {
      metadata: {
        columnAnalyzed,
        evaluationTime,
        processingSpeed,
        timestamp: new Date().toISOString()
      },
      stats: {
        ...stats,
        brandSentiment,
        netSentimentScore
      },
      comments: processedComments
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `sentiment_analysis_${columnAnalyzed}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveProject = () => {
    if (!onSave) return;
    if (saveProjectName) {
      const exportData = {
        metadata: {
          columnAnalyzed,
          evaluationTime,
          processingSpeed,
          timestamp: new Date().toISOString()
        },
        stats: {
          ...stats,
          brandSentiment,
          netSentimentScore
        },
        comments: processedComments
      };
      onSave(saveProjectName, exportData);
      setShowSaveModal(false);
    }
  };

  const handleCompareUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (json.metadata && json.stats && json.comments) {
          if (onCompare) onCompare(json);
        } else {
          alert("Invalid comparison file. Please upload an exported JSON analysis.");
        }
      } catch (error) {
        alert("Error parsing JSON file.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center">
          <span className="bg-emerald-100 text-emerald-600 p-2 rounded-lg mr-3">🏁</span>
          Final Results
        </h2>
        <div className="flex flex-wrap gap-3">
          {onReset && (
            <button
              onClick={onReset}
              className="inline-flex items-center px-4 py-2 border border-slate-200 text-sm font-medium rounded-xl shadow-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors"
            >
              <Home className="w-4 h-4 mr-2" />
              Start Over
            </button>
          )}
          {onCompare && (
            <label className="inline-flex items-center px-4 py-2 border border-indigo-200 text-sm font-medium rounded-xl shadow-sm text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors cursor-pointer">
              <Scale className="w-4 h-4 mr-2" />
              Compare Brand
              <input type="file" accept=".json" className="hidden" onChange={handleCompareUpload} />
            </label>
          )}
          {onSave && (
            <button
              onClick={() => setShowSaveModal(true)}
              className="inline-flex items-center px-4 py-2 border border-slate-200 dark:border-slate-800 text-sm font-medium rounded-xl shadow-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Project
            </button>
          )}
          <button
            onClick={handleDownloadCSV}
            className="inline-flex items-center px-4 py-2 border border-slate-200 text-sm font-medium rounded-xl shadow-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            CSV
          </button>
          <button
            onClick={handleExportJSON}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            <FileJson className="w-4 h-4 mr-2" />
            Export JSON
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Stats & Pie Chart */}
        <div className="space-y-6 lg:col-span-1">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Overview</h3>
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="text-slate-500 dark:text-slate-400 flex items-center"><FileText className="w-4 h-4 mr-2"/> Total Comments</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{stats.total}</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="text-slate-500 dark:text-slate-400 flex items-center"><CheckCircle className="w-4 h-4 mr-2"/> Verified Users</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{stats.verifiedTotal}</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="text-slate-500 dark:text-slate-400 flex items-center"><FileText className="w-4 h-4 mr-2"/> Column Analyzed</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 px-2 py-1 rounded text-xs">{columnAnalyzed}</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="text-slate-500 dark:text-slate-400 flex items-center"><Target className="w-4 h-4 mr-2"/> Brand Sentiment</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{brandSentiment.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="text-slate-500 dark:text-slate-400 flex items-center"><Activity className="w-4 h-4 mr-2"/> Net Sentiment Score</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{netSentimentScore.toFixed(1)}</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="text-slate-500 dark:text-slate-400 flex items-center"><BarChart2 className="w-4 h-4 mr-2"/> Avg Engagement</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{stats.averageEngagement.toFixed(1)} / 10</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="text-slate-500 dark:text-slate-400 flex items-center"><BarChart2 className="w-4 h-4 mr-2"/> Total Engagement</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{stats.totalEngagement.toFixed(0)}</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="text-slate-500 dark:text-slate-400 flex items-center"><CheckCircle className="w-4 h-4 mr-2 text-emerald-400"/> Total Positive Score</span>
              <span className="font-semibold text-emerald-400">{stats.positive} ({stats.total > 0 ? ((stats.positive / stats.total) * 100).toFixed(1) : 0}%)</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="text-slate-500 dark:text-slate-400 flex items-center"><Clock className="w-4 h-4 mr-2"/> Evaluation Time</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{evaluationTime.toFixed(2)} s</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400 flex items-center"><Zap className="w-4 h-4 mr-2"/> Processing Speed</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{processingSpeed} /sec</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 text-center">Sentiment Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [value, 'Comments']}
                    contentStyle={{ backgroundColor: 'var(--tooltip-bg, #1e293b)', borderColor: 'var(--tooltip-border, #334155)', color: 'var(--tooltip-text, #f8fafc)', borderRadius: '12px' }}
                    itemStyle={{ color: 'var(--tooltip-text, #f8fafc)' }}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex justify-around text-sm text-slate-500 dark:text-slate-400">
              <span>Pos: {stats.total > 0 ? ((stats.positive / stats.total) * 100).toFixed(1) : 0}%</span>
              <span>Neg: {stats.total > 0 ? ((stats.negative / stats.total) * 100).toFixed(1) : 0}%</span>
              <span>Neu: {stats.total > 0 ? ((stats.neutral / stats.total) * 100).toFixed(1) : 0}%</span>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 text-center">Positive vs Negative</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                  <BarXAxis dataKey="name" tick={{fill: '#94a3b8', fontSize: 12}} tickLine={false} axisLine={false} />
                  <BarYAxis tick={{fill: '#94a3b8', fontSize: 12}} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{fill: 'var(--tooltip-cursor, #1e293b)'}}
                    contentStyle={{ backgroundColor: 'var(--tooltip-bg, #1e293b)', borderColor: 'var(--tooltip-border, #334155)', color: 'var(--tooltip-text, #f8fafc)', borderRadius: '12px' }}
                    itemStyle={{ color: 'var(--tooltip-text, #f8fafc)' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex justify-around text-sm text-slate-500 dark:text-slate-400">
              <span>Pos: {posNegTotal > 0 ? ((stats.positive / posNegTotal) * 100).toFixed(1) : 0}%</span>
              <span>Neg: {posNegTotal > 0 ? ((stats.negative / posNegTotal) * 100).toFixed(1) : 0}%</span>
            </div>
          </div>

          {stats.verifiedTotal > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
              <button 
                onClick={() => setShowVerifiedChart(!showVerifiedChart)}
                className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors bg-white dark:bg-slate-900"
              >
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Verified Users Sentiment</h3>
                </div>
                {showVerifiedChart ? <ChevronUp className="w-5 h-5 text-slate-500 dark:text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-500 dark:text-slate-400" />}
              </button>
              
              {showVerifiedChart && (
                <div className="p-6 pt-0 border-t border-slate-200 dark:border-slate-800">
                  <div className="h-64 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={verifiedBarData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                        <BarXAxis dataKey="name" tick={{fill: '#94a3b8', fontSize: 12}} tickLine={false} axisLine={false} />
                        <BarYAxis tick={{fill: '#94a3b8', fontSize: 12}} tickLine={false} axisLine={false} />
                        <Tooltip 
                          cursor={{fill: 'var(--tooltip-cursor, #1e293b)'}}
                          contentStyle={{ backgroundColor: 'var(--tooltip-bg, #1e293b)', borderColor: 'var(--tooltip-border, #334155)', color: 'var(--tooltip-text, #f8fafc)', borderRadius: '12px' }}
                          itemStyle={{ color: 'var(--tooltip-text, #f8fafc)' }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 flex justify-around text-sm text-slate-500 dark:text-slate-400">
                    <span>Pos: {(stats.verifiedPositive + stats.verifiedNegative) > 0 ? ((stats.verifiedPositive / (stats.verifiedPositive + stats.verifiedNegative)) * 100).toFixed(1) : 0}%</span>
                    <span>Neg: {(stats.verifiedPositive + stats.verifiedNegative) > 0 ? ((stats.verifiedNegative / (stats.verifiedPositive + stats.verifiedNegative)) * 100).toFixed(1) : 0}%</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Line Chart & Data Table */}
        <div className="space-y-6 lg:col-span-2">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Sentiment Trend Over Time</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--tooltip-border, #e2e8f0)" />
                  <XAxis dataKey="index" tick={{fill: '#64748b', fontSize: 12}} tickLine={false} axisLine={false} />
                  <YAxis 
                    domain={[-100, 100]} 
                    ticks={[-100, 0, 100]}
                    tickFormatter={(value) => {
                      if (value === 100) return '😊';
                      if (value === 0) return '😐';
                      if (value === -100) return '😞';
                      return '';
                    }}
                    tick={{fill: '#64748b', fontSize: 20}} 
                    tickLine={false} 
                    axisLine={false} 
                    width={40}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--tooltip-bg, #ffffff)', borderColor: 'var(--tooltip-border, #e2e8f0)', color: 'var(--tooltip-text, #64748b)', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    labelStyle={{ color: 'var(--tooltip-text, #64748b)', marginBottom: '4px' }}
                    formatter={(value: number) => [value.toFixed(1), 'Rolling Score']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#6366f1" 
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Analyzed Comments</h3>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Showing {filteredComments.length} of {processedComments.length}
                </span>
                {(verifiedFilter !== 'all' || sentimentFilter.length > 0) && (
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded transition-colors"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
            
            {/* Filters Row */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Verified Status</label>
                <select
                  value={verifiedFilter}
                  onChange={(e) => setVerifiedFilter(e.target.value as any)}
                  className="block w-full pl-3 pr-10 py-2 text-sm border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-purple-500 focus:border-purple-500 rounded-lg border bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-sm appearance-none"
                >
                  <option value="all">All Comments</option>
                  <option value="verified">Verified Only</option>
                  <option value="unverified">Unverified Only</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Sentiment</label>
                <div className="flex space-x-2">
                  {['positive', 'negative', 'neutral'].map(sent => (
                    <button
                      key={sent}
                      onClick={() => {
                        if (sentimentFilter.includes(sent)) {
                          setSentimentFilter(sentimentFilter.filter(s => s !== sent));
                        } else {
                          setSentimentFilter([...sentimentFilter, sent]);
                        }
                      }}
                      className={`px-2 py-1 text-xs font-medium rounded-md border transition-colors capitalize ${
                        sentimentFilter.includes(sent) 
                          ? 'bg-purple-500/20 border-purple-500/50 text-purple-700 dark:text-purple-300' 
                          : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      {sent}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Verified</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Comment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sentiment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Engagement</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Score</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredComments.length > 0 ? (
                    filteredComments.map((comment) => (
                      <tr key={comment.id} className="even:bg-slate-50/50 dark:even:bg-slate-800/20 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{comment.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                          {comment.isVerified ? <CheckCircle className="w-4 h-4 text-emerald-500 dark:text-emerald-400" /> : <span className="text-slate-400 dark:text-slate-600">-</span>}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-100 max-w-md truncate" title={comment.text}>{comment.text}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full border
                            ${comment.sentiment === 'positive' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                              comment.sentiment === 'negative' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 
                              'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                            {comment.sentiment}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{comment.engagement || 0}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{comment.score?.toFixed(3)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                        No comments match your current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {stats.verifiedTotal > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden mt-6">
              <button 
                onClick={() => setShowVerifiedTable(!showVerifiedTable)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors bg-white dark:bg-slate-900"
              >
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Verified Comments Only</h3>
                </div>
                {showVerifiedTable ? <ChevronUp className="w-5 h-5 text-slate-500 dark:text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-500 dark:text-slate-400" />}
              </button>
              
              {showVerifiedTable && (
                <div className="overflow-x-auto max-h-96 border-t border-slate-200 dark:border-slate-800">
                  <table className="min-w-full divide-y divide-slate-800">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Comment</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sentiment</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Engagement</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Score</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                      {(processedComments || []).filter(c => c.isVerified).map((comment) => (
                        <tr key={comment.id} className="even:bg-slate-50/50 dark:even:bg-slate-800/20 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                           <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{comment.id}</td>
                          <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-100 max-w-md truncate" title={comment.text}>{comment.text}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full border
                              ${comment.sentiment === 'positive' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                comment.sentiment === 'negative' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 
                                'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                              {comment.sentiment}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{comment.engagement || 0}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{comment.score?.toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Save Project Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Save Project</h3>
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Project Name
              </label>
              <input
                type="text"
                value={saveProjectName}
                onChange={(e) => setSaveProjectName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                placeholder="Enter project name..."
                autoFocus
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProject}
                disabled={!saveProjectName.trim()}
                className="px-4 py-2 bg-gradient-to-r from-[#6a11cb] to-[#2575fc] text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, subtitle, icon }: { title: string, value: string | number, subtitle?: string, icon: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-300 dark:border-slate-700/50">
          {icon}
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{title}</p>
        <h4 className="text-2xl font-bold text-slate-800 dark:text-slate-200">{value}</h4>
        {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}
