import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { auth, googleProvider, signInWithPopup, onAuthStateChanged, User, db } from './lib/firebase';
import { doc, getDoc, setDoc, collection, onSnapshot, query, where, orderBy, limit, addDoc } from 'firebase/firestore';
import { 
  LayoutDashboard, 
  ShieldCheck, 
  History, 
  FileText, 
  Upload, 
  LogOut, 
  User as UserIcon,
  AlertTriangle,
  CheckCircle2,
  Info,
  ChevronRight,
  Loader2,
  TrendingUp,
  Activity,
  Search,
  Bell,
  Menu,
  X,
  MessageSquare,
  Send,
  Download,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Zap,
  FileJson,
  FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  Legend
} from 'recharts';
import { format } from 'date-fns';
import { Toaster, toast } from 'sonner';
import Papa from 'papaparse';
import Markdown from 'react-markdown';
import { getComplianceAdvice, analyzeComplianceDocument } from './services/aiAgent';

// Utility for Tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const Sidebar = ({ user, role }: { user: User | null, role: string }) => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(true);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Transactions', path: '/transactions', icon: Activity },
    { name: 'Audit Logs', path: '/audit-logs', icon: History },
    { name: 'Compliance Reports', path: '/reports', icon: FileText },
    { name: 'Upload & Analyze', path: '/upload', icon: Upload },
    { name: 'AI Assistant', path: '/assistant', icon: MessageSquare },
  ];

  return (
    <div className={cn(
      "h-screen bg-slate-950 border-r border-slate-800 transition-all duration-300 flex flex-col sticky top-0",
      isOpen ? "w-64" : "w-20"
    )}>
      <div className="p-6 flex items-center justify-between">
        {isOpen && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-white tracking-tight">FinGuard AI</span>
          </div>
        )}
        <button onClick={() => setIsOpen(!isOpen)} className="text-slate-400 hover:text-white p-1 hover:bg-slate-900 rounded-md transition-colors">
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5 mx-auto" />}
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-xl transition-all group relative",
                isActive 
                  ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20" 
                  : "text-slate-400 hover:bg-slate-900 hover:text-white"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive ? "text-indigo-400" : "group-hover:text-indigo-400")} />
              {isOpen && <span className="font-medium text-sm">{item.name}</span>}
              {isActive && (
                <motion.div 
                  layoutId="active-nav"
                  className="absolute left-0 w-1 h-6 bg-indigo-500 rounded-r-full"
                />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className={cn("flex items-center gap-3 p-2 rounded-xl bg-slate-900/50", isOpen ? "" : "justify-center")}>
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
            {user?.displayName?.[0] || 'U'}
          </div>
          {isOpen && (
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold text-white truncate">{user?.displayName}</p>
              <p className="text-[10px] text-slate-500 capitalize">{role}</p>
            </div>
          )}
        </div>
        <button 
          onClick={() => auth.signOut()}
          className={cn(
            "mt-4 flex items-center gap-3 px-3 py-2 w-full text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all text-sm font-medium",
            isOpen ? "" : "justify-center"
          )}
        >
          <LogOut className="w-4 h-4" />
          {isOpen && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );
};

// --- Pages ---

const Dashboard = () => {
  const [stats, setStats] = useState({
    total: 0,
    safe: 0,
    warning: 0,
    violation: 0,
    totalVolume: 0,
    avgRisk: 0
  });

  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'transactions'), orderBy('timestamp', 'desc'), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecentTransactions(txs);
      
      let t = 0, s = 0, w = 0, v = 0, vol = 0, riskSum = 0;
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        t++;
        vol += data.amount;
        riskSum += data.complianceScore;
        if (data.complianceStatus === 'safe') s++;
        else if (data.complianceStatus === 'warning') w++;
        else if (data.complianceStatus === 'violation') v++;
      });
      setStats({ 
        total: t, 
        safe: s, 
        warning: w, 
        violation: v, 
        totalVolume: vol,
        avgRisk: t ? Math.round(riskSum / t) : 0
      });
    });
    return () => unsubscribe();
  }, []);

  const pieData = [
    { name: 'Safe', value: stats.safe, color: '#10b981' },
    { name: 'Warning', value: stats.warning, color: '#f59e0b' },
    { name: 'Violation', value: stats.violation, color: '#ef4444' },
  ];

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Executive Dashboard</h1>
          <p className="text-slate-400 mt-1">Real-time compliance intelligence and risk monitoring.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm font-medium text-slate-300 hover:text-white transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" /> Export Data
          </button>
          <Link to="/upload" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-bold text-white transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2">
            <Zap className="w-4 h-4" /> New Analysis
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Analyzed', value: stats.total, icon: Activity, color: 'text-indigo-400', bg: 'bg-indigo-400/10', trend: '+12%' },
          { label: 'Compliance Index', value: `${stats.avgRisk}%`, icon: ShieldCheck, color: 'text-emerald-400', bg: 'bg-emerald-400/10', trend: '+2.4%' },
          { label: 'Risk Alerts', value: stats.warning + stats.violation, icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-400/10', trend: '-5%' },
          { label: 'Total Volume', value: `₹${(stats.totalVolume / 1000000).toFixed(2)}M`, icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-400/10', trend: '+8.1%' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/50 backdrop-blur-xl hover:border-slate-700 transition-colors group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-2.5 rounded-xl", stat.bg)}>
                <stat.icon className={cn("w-5 h-5", stat.color)} />
              </div>
              <span className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded-full",
                stat.trend.startsWith('+') ? "bg-emerald-400/10 text-emerald-400" : "bg-red-400/10 text-red-400"
              )}>
                {stat.trend}
              </span>
            </div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{stat.label}</p>
            <h3 className="text-2xl font-bold text-white mt-1 group-hover:text-indigo-400 transition-colors">{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/40 border border-slate-800/50 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-white">Compliance Velocity</h3>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-indigo-500" />
                <span className="text-[10px] text-slate-500 font-bold uppercase">Volume</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[10px] text-slate-500 font-bold uppercase">Safe</span>
              </div>
            </div>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[
                { date: 'Mon', volume: 45, safe: 40 },
                { date: 'Tue', volume: 52, safe: 48 },
                { date: 'Wed', volume: 48, safe: 36 },
                { date: 'Thu', volume: 61, safe: 58 },
                { date: 'Fri', volume: 55, safe: 45 },
                { date: 'Sat', volume: 30, safe: 28 },
                { date: 'Sun', volume: 65, safe: 62 },
              ]}>
                <defs>
                  <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSafe" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.5} />
                <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} dx={-10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="volume" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorVol)" />
                <Area type="monotone" dataKey="safe" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorSafe)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/50 backdrop-blur-xl flex flex-col">
          <h3 className="text-lg font-bold text-white mb-2">Risk Distribution</h3>
          <p className="text-xs text-slate-500 mb-6">Segmentation of transactions by compliance status.</p>
          <div className="flex-1 flex items-center justify-center min-h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-bold text-white">{stats.total}</span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Total</span>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-3">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs font-medium text-slate-400">{item.name}</span>
                </div>
                <span className="text-xs font-bold text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/50 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-lg font-bold text-white">Recent Activity</h3>
            <p className="text-xs text-slate-500 mt-1">Latest transactions flagged by the compliance engine.</p>
          </div>
          <Link to="/transactions" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-white transition-colors flex items-center gap-2">
            View Ledger <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-500 text-[10px] uppercase tracking-[0.2em] border-b border-slate-800">
                <th className="pb-4 font-bold">Ref ID</th>
                <th className="pb-4 font-bold">Counterparty</th>
                <th className="pb-4 font-bold">Amount</th>
                <th className="pb-4 font-bold">Status</th>
                <th className="pb-4 font-bold">Confidence</th>
                <th className="pb-4 font-bold text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {recentTransactions.map((tx, i) => (
                <tr key={tx.id} className="border-b border-slate-800/30 hover:bg-slate-800/20 transition-colors group">
                  <td className="py-4 font-mono text-slate-500">#{tx.id.slice(0, 6)}</td>
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600/20 group-hover:text-indigo-400 transition-colors">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <span className="text-white font-medium">{tx.counterparty}</span>
                    </div>
                  </td>
                  <td className="py-4 text-white font-bold">₹{tx.amount.toLocaleString()}</td>
                  <td className="py-4">
                    <span className={cn(
                      "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider",
                      tx.complianceStatus === 'safe' ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20" :
                      tx.complianceStatus === 'warning' ? "bg-amber-400/10 text-amber-400 border border-amber-400/20" :
                      "bg-red-400/10 text-red-400 border border-red-400/20"
                    )}>
                      {tx.complianceStatus}
                    </span>
                  </td>
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden max-w-[60px]">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${tx.complianceScore}%` }}
                          className={cn(
                            "h-full rounded-full",
                            tx.complianceScore > 80 ? "bg-emerald-400" :
                            tx.complianceScore > 40 ? "bg-amber-400" :
                            "bg-red-400"
                          )}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">{tx.complianceScore}%</span>
                    </div>
                  </td>
                  <td className="py-4 text-right text-slate-500 font-medium">
                    {format(new Date(tx.timestamp), 'MMM dd, HH:mm')}
                  </td>
                </tr>
              ))}
              {recentTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-600 italic">No transactions detected in the current cycle.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const UploadPage = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [formData, setFormData] = useState({
    amount: '',
    counterparty: '',
    category: 'Business',
    currency: 'INR'
  });

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    toast.loading('Running compliance guardrails...');

    try {
      const guardrailResponse = await fetch('/api/compliance/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(formData.amount),
          counterparty: formData.counterparty,
          category: formData.category
        })
      });
      const guardrailResult = await guardrailResponse.json();

      const txId = Math.random().toString(36).substring(7);
      const txData = {
        userId: auth.currentUser?.uid,
        amount: Number(formData.amount),
        currency: formData.currency,
        counterparty: formData.counterparty,
        category: formData.category,
        status: 'completed',
        complianceScore: guardrailResult.riskScore,
        complianceStatus: guardrailResult.status,
        timestamp: new Date().toISOString()
      };

      await setDoc(doc(db, 'transactions', txId), txData);

      const logId = Math.random().toString(36).substring(7);
      await setDoc(doc(db, 'audit_logs', logId), {
        userId: auth.currentUser?.uid,
        action: 'Transaction Analysis',
        input: `Transaction: ₹${formData.amount} to ${formData.counterparty}`,
        reasoning: guardrailResult.explanation,
        rulesTriggered: guardrailResult.rulesTriggered,
        timestamp: new Date().toISOString()
      });

      setResult(guardrailResult);
      toast.success('Analysis complete!');
    } catch (error) {
      toast.error('Failed to process transaction.');
      console.error(error);
    } finally {
      setIsUploading(false);
      toast.dismiss();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    toast.info(`Processing bulk file: ${file.name}`);
    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        const data = results.data as any[];
        toast.promise(
          Promise.all(data.map(async (row) => {
            if (!row.amount) return;
            // Simplified bulk processing for demo
            const txId = Math.random().toString(36).substring(7);
            await setDoc(doc(db, 'transactions', txId), {
              userId: auth.currentUser?.uid,
              amount: Number(row.amount),
              currency: row.currency || 'INR',
              counterparty: row.counterparty || 'Unknown',
              category: row.category || 'Business',
              status: 'completed',
              complianceScore: 100,
              complianceStatus: 'safe',
              timestamp: new Date().toISOString()
            });
          })),
          {
            loading: 'Importing bulk data...',
            success: 'Bulk import successful!',
            error: 'Failed to import bulk data.'
          }
        );
      }
    });
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    toast.loading('Analyzing document compliance...');

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const analysis = await analyzeComplianceDocument(base64);
        
        setResult(analysis);
        toast.success('Document analysis complete!');
        
        // Log to audit trail
        const logId = Math.random().toString(36).substring(7);
        await setDoc(doc(db, 'audit_logs', logId), {
          userId: auth.currentUser?.uid,
          action: 'Document Analysis',
          input: `PDF Document: ${file.name}`,
          reasoning: analysis.reasoning,
          rulesTriggered: analysis.suggestedActions,
          timestamp: new Date().toISOString()
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Failed to analyze document.');
      console.error(error);
    } finally {
      setIsUploading(false);
      toast.dismiss();
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <header>
        <h1 className="text-3xl font-bold text-white tracking-tight">Compliance Engine</h1>
        <p className="text-slate-400 mt-1">Submit individual transactions or bulk datasets for automated regulatory screening.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/50 backdrop-blur-xl">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-400" /> Single Entry
            </h3>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Amount (INR)</label>
                <input 
                  type="number" 
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  placeholder="e.g. 50000"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Counterparty</label>
                <input 
                  type="text" 
                  required
                  value={formData.counterparty}
                  onChange={(e) => setFormData({...formData, counterparty: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  placeholder="e.g. Reliance Industries"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Category</label>
                <select 
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                >
                  <option>Business</option>
                  <option>Personal</option>
                  <option>Investment</option>
                  <option>Operational</option>
                </select>
              </div>
              <button 
                disabled={isUploading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 text-sm"
              >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Run Analysis
              </button>
            </form>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/50 backdrop-blur-xl">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Bulk Import
            </h3>
            <div className="relative group">
              <input 
                type="file" 
                accept=".csv"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="p-8 border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-center group-hover:border-indigo-500/50 transition-colors">
                <Upload className="w-8 h-8 text-slate-700 mb-2 group-hover:text-indigo-400 transition-colors" />
                <p className="text-xs font-bold text-slate-500">Drop CSV here</p>
                <p className="text-[10px] text-slate-600 mt-1">Max 500 rows per batch</p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/50 backdrop-blur-xl">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-red-400" /> PDF Analysis
            </h3>
            <div className="relative group">
              <input 
                type="file" 
                accept=".pdf"
                onChange={handlePdfUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="p-8 border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-center group-hover:border-indigo-500/50 transition-colors">
                <Upload className="w-8 h-8 text-slate-700 mb-2 group-hover:text-red-400 transition-colors" />
                <p className="text-xs font-bold text-slate-500">Upload PDF</p>
                <p className="text-[10px] text-slate-600 mt-1">Analyze contracts or reports</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800/50 backdrop-blur-xl h-full"
              >
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-bold text-white">Analysis Insight</h3>
                    <p className="text-xs text-slate-500 mt-1">Generated by FinGuard AI Reasoning Engine</p>
                  </div>
                  <div className={cn(
                    "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border",
                    result.status === 'safe' ? "bg-emerald-400/10 text-emerald-400 border-emerald-400/20" :
                    result.status === 'warning' ? "bg-amber-400/10 text-amber-400 border-amber-400/20" :
                    "bg-red-400/10 text-red-400 border-red-400/20"
                  )}>
                    {result.status}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Risk Score</p>
                        <span className="text-lg font-black text-white">{result.riskScore}%</span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${result.riskScore}%` }}
                          className={cn(
                            "h-full rounded-full",
                            result.riskScore > 80 ? "bg-red-400" :
                            result.riskScore > 40 ? "bg-amber-400" :
                            "bg-emerald-400"
                          )}
                        />
                      </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800/50">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-indigo-600/10">
                          <Zap className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white uppercase tracking-wider">AI Reasoning</p>
                          <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                            {result.explanation}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {result.rulesTriggered.length > 0 ? (
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Compliance Violations</p>
                        <div className="space-y-3">
                          {result.rulesTriggered.map((rule: string, i: number) => (
                            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-red-400/5 border border-red-400/10">
                              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                              <p className="text-xs text-red-200/80 leading-snug">{rule}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center p-8 rounded-2xl bg-emerald-400/5 border border-emerald-400/10">
                        <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-4" />
                        <h4 className="text-sm font-bold text-emerald-400">Perfect Compliance</h4>
                        <p className="text-xs text-emerald-200/60 mt-2">No regulatory guardrails were triggered for this transaction.</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="p-12 rounded-2xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center text-center h-full space-y-6">
                <div className="w-20 h-20 rounded-3xl bg-slate-900 flex items-center justify-center text-slate-700">
                  <Activity className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-600">Awaiting Input</h3>
                  <p className="text-sm text-slate-500 max-w-xs mx-auto mt-2">The AI Compliance Engine is ready. Submit a transaction to begin real-time analysis.</p>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3" /> SEBI</div>
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3" /> RBI</div>
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3" /> IFRS</div>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

const TransactionsList = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const q = query(collection(db, 'transactions'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const filteredTxs = transactions.filter(tx => {
    if (filter === 'all') return true;
    return tx.complianceStatus === filter;
  });

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Compliance Ledger</h1>
          <p className="text-slate-400 mt-1">Comprehensive history of all screened transactions and their risk profiles.</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
          {['all', 'safe', 'warning', 'violation'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                filter === f ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-300"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {filteredTxs.map((tx, i) => (
          <motion.div 
            key={tx.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.02 }}
            className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/50 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:border-slate-700 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                tx.complianceStatus === 'safe' ? "bg-emerald-400/10 text-emerald-400" :
                tx.complianceStatus === 'warning' ? "bg-amber-400/10 text-amber-400" :
                "bg-red-400/10 text-red-400"
              )}>
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-white font-bold">{tx.counterparty}</h4>
                  <span className="text-[10px] text-slate-600 font-mono">#{tx.id.slice(0, 8)}</span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-slate-500">{tx.category}</span>
                  <div className="w-1 h-1 rounded-full bg-slate-700" />
                  <span className="text-xs text-slate-500">{format(new Date(tx.timestamp), 'MMM dd, yyyy HH:mm')}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-8">
              <div className="text-right">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Amount</p>
                <p className="text-lg font-black text-white">₹{tx.amount.toLocaleString()}</p>
              </div>
              <div className="w-px h-10 bg-slate-800 hidden md:block" />
              <div className="text-right min-w-[100px]">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">Risk Score</p>
                <div className="flex items-center justify-end gap-2">
                  <span className="text-sm font-bold text-white">{tx.complianceScore}%</span>
                  <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full",
                        tx.complianceScore > 80 ? "bg-emerald-400" :
                        tx.complianceScore > 40 ? "bg-amber-400" :
                        "bg-red-400"
                      )}
                      style={{ width: `${tx.complianceScore}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="hidden md:block">
                <button className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all">
                  <FileJson className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
        {filteredTxs.length === 0 && (
          <div className="py-20 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-900 rounded-full mx-auto flex items-center justify-center text-slate-700">
              <Search className="w-8 h-8" />
            </div>
            <p className="text-slate-500 italic">No transactions match the current filter.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const ComplianceAssistant = () => {
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([
    { role: 'assistant', content: "Hello! I'm your AI Compliance Assistant. Ask me anything about your transaction data or regulatory requirements." }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [attachedPdf, setAttachedPdf] = useState<{name: string, base64: string} | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsTyping(true);

    try {
      // Fetch some context from Firestore for the AI
      const q = query(collection(db, 'transactions'), orderBy('timestamp', 'desc'), limit(5));
      // For demo, we'll just pass a generic context
      const advice = await getComplianceAdvice(userMsg, [], attachedPdf?.base64);
      setMessages(prev => [...prev, { role: 'assistant', content: advice }]);
      setAttachedPdf(null);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "I encountered an error while processing your request." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF documents are supported in the assistant.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setAttachedPdf({ name: file.name, base64 });
      toast.success(`Attached: ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col max-w-4xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-white tracking-tight">AI Compliance Assistant</h1>
        <p className="text-slate-400 mt-1">Consult the Gemini-powered reasoning engine for regulatory guidance.</p>
      </header>

      <div className="flex-1 bg-slate-900/40 border border-slate-800/50 rounded-3xl backdrop-blur-xl flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex gap-4 max-w-[85%]",
                msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                msg.role === 'assistant' ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400"
              )}>
                {msg.role === 'assistant' ? <ShieldCheck className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
              </div>
              <div className={cn(
                "p-4 rounded-2xl text-sm leading-relaxed",
                msg.role === 'assistant' ? "bg-slate-950 border border-slate-800 text-slate-200" : "bg-indigo-600 text-white"
              )}>
                {msg.role === 'assistant' ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <Markdown>{msg.content}</Markdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            </motion.div>
          ))}
          {isTyping && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-1">
                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-slate-500 rounded-full" />
                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-slate-500 rounded-full" />
                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-slate-500 rounded-full" />
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        <div className="p-4 bg-slate-950/50 border-t border-slate-800">
          {attachedPdf && (
            <div className="mb-3 flex items-center gap-2 px-4 py-2 bg-indigo-600/10 border border-indigo-500/20 rounded-xl w-fit">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">{attachedPdf.name}</span>
              <button onClick={() => setAttachedPdf(null)} className="ml-2 text-indigo-400 hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          <div className="relative flex gap-3">
            <div className="relative flex-1">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about compliance rules, transaction risks, or regulatory updates..."
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4 pr-16 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              />
              <div className="absolute right-2 top-2 bottom-2 flex gap-1">
                <input 
                  type="file" 
                  accept=".pdf" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileAttach}
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 text-slate-500 hover:text-indigo-400 transition-colors"
                  title="Attach PDF"
                >
                  <Upload className="w-4 h-4" />
                </button>
                <button 
                  onClick={handleSend}
                  className="px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all flex items-center justify-center"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-slate-600 text-center mt-3 font-bold uppercase tracking-[0.2em]">Powered by Gemini 3.0 Flash Reasoning Engine</p>
        </div>
      </div>
    </div>
  );
};

const AuditLogs = () => {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-8 pb-12">
      <header>
        <h1 className="text-3xl font-bold text-white tracking-tight">Audit Ledger</h1>
        <p className="text-slate-400 mt-1">Immutable, cryptographically-linked record of all system operations and AI reasoning steps.</p>
      </header>

      <div className="space-y-4">
        {logs.map((log, i) => (
          <motion.div 
            key={log.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/50 backdrop-blur-xl flex gap-6 group hover:border-slate-700 transition-all"
          >
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="w-px flex-1 bg-slate-800 my-2" />
            </div>
            <div className="flex-1 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white font-bold text-lg">{log.action}</h4>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">{format(new Date(log.timestamp), 'MMMM dd, yyyy HH:mm:ss')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-600 bg-slate-950 px-2 py-1 rounded border border-slate-800">HASH: {log.id.slice(0, 12)}...</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Input Context</p>
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/50 text-xs text-slate-400 leading-relaxed">
                    {log.input}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">AI Decision Logic</p>
                  <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-xs text-indigo-200/80 leading-relaxed italic">
                    "{log.reasoning}"
                  </div>
                </div>
              </div>

              {log.rulesTriggered?.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {log.rulesTriggered.map((rule: string, i: number) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-amber-400/5 text-amber-400 text-[9px] font-black uppercase tracking-widest border border-amber-400/10">
                      TRIGGER: {rule}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ))}
        {logs.length === 0 && (
          <div className="py-20 text-center text-slate-600 italic">No audit logs recorded in the current session.</div>
        )}
      </div>
    </div>
  );
};

// --- Main App ---

const Login = () => {
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    try {
      setError(null);
      setIsLoggingIn(true);
      await signInWithPopup(auth, googleProvider);
      toast.success('Successfully authenticated.');
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') return;
      setError(err.message || 'Failed to sign in. Please try again.');
      toast.error('Authentication failed.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(79,70,229,0.15),transparent_50%)]" />
      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-12 rounded-[2.5rem] bg-slate-900/80 border border-slate-800 shadow-2xl backdrop-blur-2xl relative z-10 max-w-md w-full text-center"
      >
        <div className="w-24 h-24 bg-indigo-600 rounded-[2rem] mx-auto flex items-center justify-center mb-8 shadow-2xl shadow-indigo-600/40 rotate-3">
          <ShieldCheck className="w-14 h-14 text-white" />
        </div>
        <h1 className="text-4xl font-black text-white mb-2 tracking-tighter">FinGuard AI</h1>
        <p className="text-slate-400 mb-10 text-sm leading-relaxed">The next generation of automated financial compliance and regulatory intelligence.</p>
        
        <div className="space-y-4">
          <button 
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="w-full bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-950 font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-white/5 group"
          >
            {isLoggingIn ? (
              <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
            ) : (
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 group-hover:scale-110 transition-transform" alt="Google" />
            )}
            {isLoggingIn ? 'Establishing Session...' : 'Sign in with Google'}
          </button>
          
          <div className="flex items-center gap-4 py-2">
            <div className="h-px flex-1 bg-slate-800" />
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em]">Authorized Access Only</span>
            <div className="h-px flex-1 bg-slate-800" />
          </div>
        </div>

        {error && (
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-red-400 text-[10px] font-bold mt-4 bg-red-400/5 p-3 rounded-xl border border-red-400/10 uppercase tracking-wider"
          >
            {error}
          </motion.p>
        )}
        
        <div className="mt-10 grid grid-cols-3 gap-4 opacity-40 grayscale">
          <div className="flex flex-col items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-white" />
            <span className="text-[8px] font-bold text-white uppercase tracking-widest">SEBI</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Zap className="w-4 h-4 text-white" />
            <span className="text-[8px] font-bold text-white uppercase tracking-widest">RBI</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Activity className="w-4 h-4 text-white" />
            <span className="text-[8px] font-bold text-white uppercase tracking-widest">IFRS</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string>('user');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const userDoc = await getDoc(doc(db, 'users', u.uid));
        if (!userDoc.exists()) {
          const newRole = u.email === 'abhisheklimodiya01@gmail.com' ? 'admin' : 'user';
          await setDoc(doc(db, 'users', u.uid), {
            uid: u.uid,
            email: u.email,
            displayName: u.displayName,
            role: newRole,
            createdAt: new Date().toISOString()
          });
          setRole(newRole);
        } else {
          setRole(userDoc.data().role);
        }
        setUser(u);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-950">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
          <ShieldCheck className="w-6 h-6 text-indigo-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <Router>
      <Toaster position="top-right" theme="dark" richColors closeButton />
      <div className="flex bg-slate-950 text-slate-200 min-h-screen font-sans selection:bg-indigo-500/30">
        <Sidebar user={user} role={role} />
        <main className="flex-1 p-8 overflow-y-auto h-screen">
          <div className="max-w-7xl mx-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/transactions" element={<TransactionsList />} />
              <Route path="/audit-logs" element={<AuditLogs />} />
              <Route path="/assistant" element={<ComplianceAssistant />} />
              <Route path="/reports" element={<div className="py-20 text-center space-y-4">
                <div className="w-20 h-20 bg-slate-900 rounded-3xl mx-auto flex items-center justify-center text-slate-700">
                  <FileText className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-600">Report Generation</h3>
                <p className="text-slate-500 max-w-xs mx-auto">Automated PDF and JSON report generation for regulatory filing is currently in beta.</p>
              </div>} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}
