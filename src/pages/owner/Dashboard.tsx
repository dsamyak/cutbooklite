import React, { useEffect, useState, useCallback } from 'react';
import { Navbar } from '../../components/layout/Navbar';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import {
  IndianRupee, Wallet, CreditCard, TrendingDown,
  TrendingUp, Calendar, AlertCircle, Trophy
} from 'lucide-react';

// ── Date helpers ──────────────────────────────────────────────
const fmtDate = (d: Date) => d.toISOString().split('T')[0];

const dateHelpers = {
  today: () => { const t = fmtDate(new Date()); return { from: t, to: t }; },
  week: () => {
    const d = new Date();
    const dayOfWeek = d.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diff);
    return { from: fmtDate(monday), to: fmtDate(new Date()) };
  },
  month: () => {
    const d = new Date();
    return { from: fmtDate(new Date(d.getFullYear(), d.getMonth(), 1)), to: fmtDate(new Date()) };
  },
};

type Period = 'today' | 'week' | 'month' | 'custom';

const PERIODS: { id: Period; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'custom', label: 'Custom' },
];

export const OwnerDashboard = () => {
  const [earnings, setEarnings] = useState<any>(null);
  const [salons, setSalons] = useState<any[]>([]);
  const [selectedSalon, setSelectedSalon] = useState('');
  const [period, setPeriod] = useState<Period>('month');
  const [customFrom, setCustomFrom] = useState(fmtDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [customTo, setCustomTo] = useState(fmtDate(new Date()));
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);

  const getRange = useCallback(() => {
    if (period === 'custom') return { from: customFrom, to: customTo };
    return dateHelpers[period]();
  }, [period, customFrom, customTo]);

  const user = useAuthStore(state => state.user);

  useEffect(() => {
    if (!user) return;
    supabase.from('salons').select('*').eq('owner_id', user.ownerId).then(({ data }) => setSalons(data || []));
    supabase.from('subscriptions').select('*').eq('owner_id', user.ownerId).single().then(({ data }) => { if (data) setSubscription(data); });
  }, [user]);

  useEffect(() => {
    if (user) loadEarnings();
  }, [selectedSalon, period, customFrom, customTo, user]);

  const loadEarnings = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { from, to } = getRange();
      
      let servicesQuery = supabase.from('services').select('*, barbers(name)').eq('owner_id', user.ownerId).gte('service_date', from).lte('service_date', to);
      let expensesQuery = supabase.from('expenses').select('*').eq('owner_id', user.ownerId).gte('expense_date', from).lte('expense_date', to);
      
      if (selectedSalon) {
        servicesQuery = servicesQuery.eq('salon_id', selectedSalon);
        expensesQuery = expensesQuery.eq('salon_id', selectedSalon);
      }

      const [servicesRes, expensesRes] = await Promise.all([servicesQuery, expensesQuery]);
      
      let cash = 0, upi = 0;
      const barberMap = new Map();
      servicesRes.data?.forEach(s => {
        const price = Number(s.price);
        if (s.payment_method === 'CASH') cash += price;
        else if (s.payment_method === 'UPI') upi += price;

        if (s.barber_id) {
          if (!barberMap.has(s.barber_id)) barberMap.set(s.barber_id, { barberId: s.barber_id, name: s.barbers?.name || 'Unknown', total: 0, cash: 0, upi: 0 });
          const b = barberMap.get(s.barber_id);
          b.total += price;
          if (s.payment_method === 'CASH') b.cash += price;
          if (s.payment_method === 'UPI') b.upi += price;
        }
      });

      const total_gross = cash + upi;
      const total_expenses = expensesRes.data?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const net_earning = total_gross - total_expenses;
      const barber_breakdown = Array.from(barberMap.values()).sort((a, b) => b.total - a.total);

      setEarnings({ total_gross, cash, upi, total_expenses, net_earning, barber_breakdown });
    } catch (err: any) {
      toast.error('Failed to load earnings data');
    } finally {
      setLoading(false);
    }
  };

  const isNearExpiry =
    subscription?.daysRemaining !== null &&
    subscription?.daysRemaining <= 7 &&
    subscription?.daysRemaining > 0;

  const isGrace = subscription?.status === 'GRACE';

  return (
    <Navbar>
      <div className="space-y-6">

        {/* Subscription warning banner */}
        {(isNearExpiry || isGrace) && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3 animate-slide-up">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800 font-medium">
              {isGrace
                ? 'Your subscription is in grace period. Please contact admin to renew.'
                : `Subscription expires in ${subscription.daysRemaining} day${subscription.daysRemaining !== 1 ? 's' : ''}. Contact admin to renew.`}
            </p>
          </div>
        )}

        {/* Page header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">Salon performance overview</p>
          </div>
          <select
            value={selectedSalon}
            onChange={e => setSelectedSalon(e.target.value)}
            className="form-input max-w-[200px]"
          >
            <option value="">All Salons</option>
            {salons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {/* Period selector tabs */}
        <div className="flex flex-wrap gap-2">
          {PERIODS.map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                period === p.id
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom date range */}
        {period === 'custom' && (
          <div className="card p-4 flex flex-wrap gap-4 items-center animate-in">
            <Calendar className="h-4 w-4 text-gray-400" />
            <label className="flex items-center gap-2 text-sm text-gray-600 font-medium">
              From
              <input
                type="date"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                className="form-input w-auto"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600 font-medium">
              To
              <input
                type="date"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                className="form-input w-auto"
              />
            </label>
          </div>
        )}

        {/* Main content */}
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-36 bg-gray-100 rounded-2xl" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
            </div>
          </div>
        ) : (
          <>
            {/* Net Earning Hero Banner */}
            <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 rounded-2xl shadow-lg shadow-blue-100 p-8 text-white flex justify-between items-center">
              <div>
                <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest mb-2">
                  Net Earnings · {period === 'custom' ? `${customFrom} → ${customTo}` : PERIODS.find(p => p.id === period)?.label}
                </p>
                <div className="flex items-center gap-1">
                  <IndianRupee className="h-7 w-7 opacity-75" />
                  <span className="text-5xl font-extrabold tracking-tight">
                    {(earnings?.net_earning || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <p className="text-blue-200 text-sm mt-2">
                  Gross ₹{(earnings?.total_gross || 0).toLocaleString('en-IN')} &nbsp;·&nbsp;
                  Expenses ₹{(earnings?.total_expenses || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="hidden sm:block p-4 bg-white/10 rounded-2xl backdrop-blur-sm">
                <TrendingUp className="h-12 w-12 text-blue-100" />
              </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard title="Total Gross" value={earnings?.total_gross} icon={<Wallet className="h-5 w-5 text-emerald-600" />} color="emerald" />
              <MetricCard title="Cash" value={earnings?.cash} icon={<IndianRupee className="h-5 w-5 text-blue-600" />} color="blue" />
              <MetricCard title="UPI" value={earnings?.upi} icon={<CreditCard className="h-5 w-5 text-purple-600" />} color="purple" />
              <MetricCard title="Expenses" value={earnings?.total_expenses} icon={<TrendingDown className="h-5 w-5 text-red-500" />} color="red" />
            </div>

            {/* Barber Breakdown / Leaderboard */}
            {earnings?.barber_breakdown?.length > 0 && (
              <div className="card p-6 animate-slide-up">
                <h3 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  Barber Performance
                </h3>
                <div className="space-y-4">
                  {earnings.barber_breakdown.map((b: any, idx: number) => {
                    const pct = earnings.barber_breakdown[0].total > 0
                      ? (b.total / earnings.barber_breakdown[0].total) * 100
                      : 0;
                    const colors = ['from-amber-400 to-amber-500', 'from-slate-400 to-slate-500', 'from-orange-400 to-orange-500'];
                    const barColors = ['from-blue-500 to-indigo-500', 'from-emerald-500 to-teal-500', 'from-purple-500 to-violet-500', 'from-orange-500 to-amber-500'];
                    return (
                      <div key={b.barberId} className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${colors[idx] || 'from-gray-400 to-gray-500'} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-sm font-semibold text-gray-800 truncate">{b.name}</span>
                            <span className="text-sm font-bold text-gray-900 ml-2 flex-shrink-0">
                              ₹{b.total.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full bg-gradient-to-r ${barColors[idx % barColors.length]} rounded-full transition-all`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="flex gap-4 mt-1">
                            <span className="text-xs text-gray-400">Cash ₹{b.cash.toLocaleString('en-IN')}</span>
                            <span className="text-xs text-gray-400">UPI ₹{b.upi.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty state */}
            {earnings?.barber_breakdown?.length === 0 && (
              <div className="card p-8 text-center text-gray-400">
                <p className="text-sm">No services logged for this period.</p>
              </div>
            )}
          </>
        )}
      </div>
    </Navbar>
  );
};

// ── Metric Card ───────────────────────────────────────────────
const MetricCard = ({ title, value, icon, color }: { title: string; value: number; icon: React.ReactNode; color: string }) => {
  const bg: Record<string, string> = {
    emerald: 'bg-emerald-50', blue: 'bg-blue-50', purple: 'bg-purple-50', red: 'bg-red-50',
  };
  return (
    <div className="card p-5 flex items-center gap-4 hover:shadow-md transition-shadow cursor-default">
      <div className={`p-3 rounded-xl ${bg[color]} flex-shrink-0`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 mb-0.5 truncate">{title}</p>
        <p className="text-xl font-bold text-gray-900 flex items-center">
          <IndianRupee className="h-4 w-4 text-gray-400 mr-0.5" />
          {(value || 0).toLocaleString('en-IN')}
        </p>
      </div>
    </div>
  );
};
