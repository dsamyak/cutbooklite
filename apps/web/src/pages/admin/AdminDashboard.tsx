import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/layout/Navbar';
import { apiClient } from '../../api/client';
import toast from 'react-hot-toast';
import {
  Shield, Users, CheckCircle2, Clock, AlertCircle, XCircle,
  Calendar, X, Pencil
} from 'lucide-react';

type SubStatus = 'TRIAL' | 'ACTIVE' | 'GRACE' | 'LAPSED' | 'CANCELLED';

const statusConfig: Record<SubStatus, { label: string; color: string; icon: React.ReactNode }> = {
  TRIAL:     { label: 'Trial',     color: 'bg-blue-100 text-blue-700',   icon: <Clock className="h-3.5 w-3.5" /> },
  ACTIVE:    { label: 'Active',    color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  GRACE:     { label: 'Grace',     color: 'bg-amber-100 text-amber-700', icon: <AlertCircle className="h-3.5 w-3.5" /> },
  LAPSED:    { label: 'Lapsed',    color: 'bg-red-100 text-red-700',     icon: <AlertCircle className="h-3.5 w-3.5" /> },
  CANCELLED: { label: 'Cancelled', color: 'bg-gray-100 text-gray-500',   icon: <XCircle className="h-3.5 w-3.5" /> },
};

interface ManageModal {
  ownerId: string;
  ownerName: string;
  currentSub?: any;
}

export const AdminDashboard = () => {
  const [owners, setOwners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<ManageModal | null>(null);

  // Modal form state
  const [mStatus, setMStatus] = useState<SubStatus>('ACTIVE');
  const [mPlanName, setMPlanName] = useState('Admin Plan');
  const [mPeriodEnd, setMPeriodEnd] = useState('');
  const [mNotes, setMNotes] = useState('');
  const [mSaving, setMSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiClient('/admin/owners');
      setOwners(res.data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load tenants');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (owner: any) => {
    setModal({ ownerId: owner.id, ownerName: owner.name, currentSub: owner.subscription });
    setMStatus(owner.subscription?.status ?? 'TRIAL');
    setMPlanName(owner.subscription?.plan_name ?? 'Admin Plan');
    setMNotes(owner.subscription?.notes ?? '');
    // Pre-fill period end (convert to date input format)
    if (owner.subscription?.current_period_end) {
      const d = new Date(owner.subscription.current_period_end);
      setMPeriodEnd(d.toISOString().split('T')[0]);
    } else {
      // Default 30 days from now
      const d = new Date();
      d.setDate(d.getDate() + 30);
      setMPeriodEnd(d.toISOString().split('T')[0]);
    }
  };

  const handleSave = async () => {
    if (!modal) return;
    setMSaving(true);
    try {
      const periodEnd = mPeriodEnd
        ? new Date(mPeriodEnd + 'T23:59:59.000Z').toISOString()
        : null;

      await apiClient(`/admin/owners/${modal.ownerId}/subscription`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: mStatus,
          plan_name: mPlanName || 'Admin Plan',
          current_period_end: periodEnd,
          notes: mNotes || null,
        }),
      });
      toast.success(`Subscription updated for ${modal.ownerName}`);
      setModal(null);
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update subscription');
    } finally {
      setMSaving(false);
    }
  };

  const filtered = owners.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.email.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: owners.length,
    active: owners.filter(o => o.subscription?.status === 'ACTIVE').length,
    trial: owners.filter(o => o.subscription?.status === 'TRIAL').length,
    lapsed: owners.filter(o => ['LAPSED', 'CANCELLED'].includes(o.subscription?.status)).length,
  };

  return (
    <Navbar>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-100 rounded-xl">
            <Shield className="h-6 w-6 text-purple-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
            <p className="text-sm text-gray-500">Manage tenant subscriptions</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Owners', value: stats.total, color: 'text-gray-900', bg: 'bg-gray-50' },
            { label: 'Active', value: stats.active, color: 'text-emerald-700', bg: 'bg-emerald-50' },
            { label: 'Trial', value: stats.trial, color: 'text-blue-700', bg: 'bg-blue-50' },
            { label: 'Lapsed', value: stats.lapsed, color: 'text-red-700', bg: 'bg-red-50' },
          ].map(s => (
            <div key={s.label} className={`card p-4 ${s.bg}`}>
              <p className="text-xs text-gray-500 font-medium">{s.label}</p>
              <p className={`text-2xl font-extrabold mt-0.5 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="form-input max-w-xs"
            placeholder="Search by name or email…"
          />
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-10 text-center text-gray-400">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No owners found.</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Owner</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Salons / Barbers</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Subscription</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Expires</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(owner => {
                  const sub = owner.subscription;
                  const status: SubStatus = sub?.status ?? 'TRIAL';
                  const cfg = statusConfig[status];
                  const isExpired = sub?.current_period_end && new Date(sub.current_period_end) < new Date();
                  return (
                    <tr key={owner.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {owner.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{owner.name}</p>
                            <p className="text-xs text-gray-500">{owner.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {owner._count?.salons ?? 0} salon{owner._count?.salons !== 1 ? 's' : ''} ·{' '}
                        {owner._count?.barbers ?? 0} barber{owner._count?.barbers !== 1 ? 's' : ''}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
                          {cfg.icon}
                          {cfg.label}
                          {sub?.plan_name && sub.plan_name !== 'Free Trial' && ` · ${sub.plan_name}`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {sub?.current_period_end ? (
                          <span className={isExpired ? 'text-red-600 font-medium' : ''}>
                            <Calendar className="h-3.5 w-3.5 inline mr-1" />
                            {new Date(sub.current_period_end).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openModal(owner)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Manage
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Subscription manage modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in">
            <div className="flex justify-between items-start mb-5">
              <div>
                <h3 className="text-base font-bold text-gray-900">Manage Subscription</h3>
                <p className="text-sm text-gray-500">{modal.ownerName}</p>
              </div>
              <button onClick={() => setModal(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status *</label>
                <select
                  value={mStatus}
                  onChange={e => setMStatus(e.target.value as SubStatus)}
                  className="form-input"
                >
                  {Object.entries(statusConfig).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Plan Name</label>
                <input
                  type="text"
                  value={mPlanName}
                  onChange={e => setMPlanName(e.target.value)}
                  className="form-input"
                  placeholder="e.g. Monthly Plan, 3 Month Plan"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Subscription Ends On</label>
                <input
                  type="date"
                  value={mPeriodEnd}
                  onChange={e => setMPeriodEnd(e.target.value)}
                  className="form-input"
                />
                <p className="text-xs text-gray-400 mt-1">
                  After this date, the subscription auto-expires to Lapsed.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Admin Notes (payment record, etc.)
                </label>
                <textarea
                  value={mNotes}
                  onChange={e => setMNotes(e.target.value)}
                  className="form-input"
                  rows={3}
                  placeholder="e.g. Paid ₹2000 cash on 01 Jun 2026"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal(null)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button onClick={handleSave} disabled={mSaving} className="btn-primary flex-1 bg-purple-700 hover:bg-purple-800">
                {mSaving ? 'Saving…' : 'Save Subscription'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Navbar>
  );
};
