import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/layout/Navbar';
import { apiClient } from '../../api/client';
import toast from 'react-hot-toast';
import { Scissors, CheckCircle2, Trophy, IndianRupee, AlertCircle } from 'lucide-react';

const fmtDate = (d: Date) => d.toISOString().split('T')[0];

export const BarberServiceLog = () => {
  const [salonId, setSalonId] = useState('');
  const [salonName, setSalonName] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [paymentType, setPaymentType] = useState<'CASH' | 'UPI'>('CASH');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [initError, setInitError] = useState('');
  const [earnings, setEarnings] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await apiClient('/barbers/me');
        const salons: any[] = res.data.salons || [];
        if (salons.length === 0) {
          setInitError('You are not assigned to any salon. Please contact your owner.');
          return;
        }
        // Auto-select first salon
        setSalonId(salons[0].id);
        setSalonName(salons[0].name);
      } catch {
        setInitError('Could not load your salon info. Please try again.');
      }
    };
    init();
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const today = fmtDate(new Date());
      const firstOfMonth = fmtDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
      const res = await apiClient(`/barbers/earnings?from=${firstOfMonth}&to=${today}`);
      setEarnings(res.data);
    } catch {
      // non-critical, ignore
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salonId) {
      toast.error('No salon assigned. Contact admin.');
      return;
    }
    setLoading(true);
    setSuccess(false);
    try {
      await apiClient('/services', {
        method: 'POST',
        body: JSON.stringify({
          salon_id: salonId,
          name,
          price: Number(price),
          payment_type: paymentType,
          service_date: fmtDate(new Date()),
        }),
      });
      setSuccess(true);
      setName('');
      setPrice('');
      toast.success('Service logged!');
      loadLeaderboard();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      toast.error(err.message || 'Failed to log service');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Navbar>
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Service Log Card */}
        <div className="card overflow-hidden">
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-6 text-center">
            <div className="inline-flex p-3 bg-white/10 rounded-xl mb-3">
              <Scissors className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Log New Service</h1>
            {salonName && (
              <p className="text-gray-400 text-sm mt-1">{salonName}</p>
            )}
          </div>

          <div className="p-6 space-y-5">
            {/* Init error state */}
            {initError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{initError}</p>
              </div>
            )}

            {/* Success flash */}
            {success && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 animate-in">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-800">Service logged successfully!</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Service name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Service Name
                </label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. Men's Haircut + Beard Trim"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  disabled={!!initError}
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Price (₹)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1"
                  className="form-input"
                  placeholder="0"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  disabled={!!initError}
                />
              </div>

              {/* Payment method toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(['CASH', 'UPI'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setPaymentType(type)}
                      disabled={!!initError}
                      className={`py-3 rounded-xl font-bold text-sm border-2 transition-all ${
                        paymentType === type
                          ? type === 'CASH'
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-purple-600 bg-purple-50 text-purple-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      } disabled:opacity-50`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !!initError}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-3.5 rounded-xl transition-colors disabled:opacity-60 shadow-lg shadow-gray-100 text-sm"
              >
                {loading ? 'Saving…' : 'Save Service Record'}
              </button>
            </form>
          </div>
        </div>

        {/* Monthly Leaderboard */}
        {earnings?.leaderboard?.length > 0 && (
          <div className="card p-6 animate-slide-up">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              This Month's Leaderboard
            </h2>
            <div className="space-y-3">
              {earnings.leaderboard.map((b: any, idx: number) => {
                const top = earnings.leaderboard[0].total;
                const pct = top > 0 ? (b.total / top) * 100 : 0;
                const medal = ['🥇', '🥈', '🥉'][idx] || `#${idx + 1}`;
                return (
                  <div key={b.barberId} className="flex items-center gap-3">
                    <span className="text-lg w-7 text-center flex-shrink-0">{medal}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-800 truncate">{b.name}</span>
                        <span className="text-sm font-bold text-gray-900 ml-2 flex-shrink-0 flex items-center">
                          <IndianRupee className="h-3.5 w-3.5" />
                          {b.total.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* My earnings callout */}
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm">
              <span className="text-gray-500">My total this month</span>
              <span className="font-bold text-gray-900 flex items-center">
                <IndianRupee className="h-3.5 w-3.5" />
                {(earnings.total || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        )}
      </div>
    </Navbar>
  );
};
