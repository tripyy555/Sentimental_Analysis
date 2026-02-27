import React from 'react';
import { ExportedAnalysis } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { X, Target, Activity, CheckCircle, BarChart2, FileText } from 'lucide-react';

interface ComparisonDashboardProps {
  brand1: ExportedAnalysis;
  brand2: ExportedAnalysis;
  brand1Name: string;
  brand2Name: string;
  onClose: () => void;
}

export function ComparisonDashboard({ brand1, brand2, brand1Name, brand2Name, onClose }: ComparisonDashboardProps) {
  // calculate metrics for brand 1
  const b1PosNegTotal = brand1.stats.positive + brand1.stats.negative;
  const b1BrandSentiment = b1PosNegTotal > 0 ? (brand1.stats.positive / b1PosNegTotal) * 100 : 0;
  const b1NetSentimentScore = brand1.stats.total > 0 ? ((brand1.stats.positive - brand1.stats.negative) / brand1.stats.total) * 100 : 0;

  // calculate metrics for brand 2
  const b2PosNegTotal = brand2.stats.positive + brand2.stats.negative;
  const b2BrandSentiment = b2PosNegTotal > 0 ? (brand2.stats.positive / b2PosNegTotal) * 100 : 0;
  const b2NetSentimentScore = brand2.stats.total > 0 ? ((brand2.stats.positive - brand2.stats.negative) / brand2.stats.total) * 100 : 0;

  const comparisonData = [
    {
      metric: 'Total Comments',
      icon: <FileText className="w-5 h-5 text-slate-500 dark:text-slate-400" />,
      [brand1Name]: brand1.stats.total,
      [brand2Name]: brand2.stats.total,
    },
    {
      metric: 'Verified Users',
      icon: <CheckCircle className="w-5 h-5 text-emerald-500" />,
      [brand1Name]: brand1.stats.verifiedTotal,
      [brand2Name]: brand2.stats.verifiedTotal,
    },
    {
      metric: 'Brand Sentiment (%)',
      icon: <Target className="w-5 h-5 text-indigo-500" />,
      [brand1Name]: parseFloat(b1BrandSentiment.toFixed(1)),
      [brand2Name]: parseFloat(b2BrandSentiment.toFixed(1)),
    },
    {
      metric: 'Net Sentiment Score',
      icon: <Activity className="w-5 h-5 text-rose-500" />,
      [brand1Name]: parseFloat(b1NetSentimentScore.toFixed(1)),
      [brand2Name]: parseFloat(b2NetSentimentScore.toFixed(1)),
    },
    {
      metric: 'Avg Engagement',
      icon: <BarChart2 className="w-5 h-5 text-amber-500" />,
      [brand1Name]: parseFloat((brand1.stats.averageEngagement || 0).toFixed(1)),
      [brand2Name]: parseFloat((brand2.stats.averageEngagement || 0).toFixed(1)),
    },
    {
      metric: 'Total Engagement',
      icon: <BarChart2 className="w-5 h-5 text-amber-500" />,
      [brand1Name]: brand1.stats.totalEngagement || 0,
      [brand2Name]: brand2.stats.totalEngagement || 0,
    },
  ];

  const sentimentDistData = [
    {
      name: 'Positive',
      [brand1Name]: brand1.stats.positive,
      [brand2Name]: brand2.stats.positive,
    },
    {
      name: 'Negative',
      [brand1Name]: brand1.stats.negative,
      [brand2Name]: brand2.stats.negative,
    },
    {
      name: 'Neutral',
      [brand1Name]: brand1.stats.neutral,
      [brand2Name]: brand2.stats.neutral,
    }
  ];

  const maxLength = Math.max(
    brand1.stats.scoreHistory?.length || 0,
    brand2.stats.scoreHistory?.length || 0
  );
  const lineData = Array.from({ length: maxLength }).map((_, i) => {
    let b1Score = null;
    const b1History = brand1.stats.scoreHistory || [];
    if (i < b1History.length) {
      const windowSize1 = Math.max(3, Math.floor(b1History.length / 10));
      const start1 = Math.max(0, i - windowSize1 + 1);
      const windowSlice1 = b1History.slice(start1, i + 1);
      b1Score = windowSlice1.reduce((sum, val) => sum + val, 0) / windowSlice1.length;
    }

    let b2Score = null;
    const b2History = brand2.stats.scoreHistory || [];
    if (i < b2History.length) {
      const windowSize2 = Math.max(3, Math.floor(b2History.length / 10));
      const start2 = Math.max(0, i - windowSize2 + 1);
      const windowSlice2 = b2History.slice(start2, i + 1);
      b2Score = windowSlice2.reduce((sum, val) => sum + val, 0) / windowSlice2.length;
    }

    return {
      index: i,
      [brand1Name]: b1Score,
      [brand2Name]: b2Score,
    };
  });

  return (
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center">
          <span className="bg-indigo-100 text-indigo-600 p-2 rounded-lg mr-3">⚖️</span>
          Brand Comparison
        </h2>
        <button
          onClick={onClose}
          className="inline-flex items-center px-4 py-2 border border-slate-200 text-sm font-medium rounded-xl shadow-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
        >
          <X className="w-4 h-4 mr-2" />
          Close Comparison
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Metrics Comparison Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="text-lg font-semibold text-slate-800">Key Metrics Comparison</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-white">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Metric</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-indigo-600 uppercase tracking-wider font-bold">{brand1Name}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-emerald-600 uppercase tracking-wider font-bold">{brand2Name}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {comparisonData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 flex items-center">
                      <span className="mr-3">{row.icon}</span>
                      {row.metric}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-700">
                      {row[brand1Name]}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-700">
                      {row[brand2Name]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sentiment Distribution Bar Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 text-center">Sentiment Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sentimentDistData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{fill: '#64748b', fontSize: 12}} tickLine={false} axisLine={false} />
                <YAxis tick={{fill: '#64748b', fontSize: 12}} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36}/>
                <Bar dataKey={brand1Name} fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey={brand2Name} fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sentiment Trend Over Time */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Sentiment Trend Over Time</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
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
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ color: '#64748b', marginBottom: '4px' }}
                  formatter={(value: number) => [value.toFixed(1), 'Rolling Score']}
                />
                <Legend verticalAlign="bottom" height={36}/>
                <Line 
                  type="monotone" 
                  dataKey={brand1Name} 
                  stroke="#6366f1" 
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
                />
                <Line 
                  type="monotone" 
                  dataKey={brand2Name} 
                  stroke="#10b981" 
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
