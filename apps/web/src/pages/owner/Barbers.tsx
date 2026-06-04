import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/layout/Navbar';
import { apiClient } from '../../api/client';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import toast from 'react-hot-toast';
import { UserPlus, Trash2, Users } from 'lucide-react';

export const Barbers = () => {
  const [barbers, setBarbers] = useState<any[]>([]);
  const [salons, setSalons] = useState<any[]>([]);
  const [selectedSalon, setSelectedSalon] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    apiClient('/salons').then(r => {
      setSalons(r.data);
      if (r.data.length > 0) setSelectedSalon(r.data[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedSalon) loadBarbers();
  }, [selectedSalon]);

  const loadBarbers = async () => {
    try {
      const res = await apiClient(`/salons/${selectedSalon}/barbers`);
      setBarbers(res.data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load barbers');
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const inviteRes = await apiClient('/auth/invite-barber', {
        method: 'POST',
        body: JSON.stringify({ name, email, tempPassword: password }),
      });
      await apiClient(`/salons/${selectedSalon}/barbers/${inviteRes.data.id}`, { method: 'POST' });
      toast.success(`${name} has been invited to the salon!`);
      setName(''); setEmail(''); setPassword('');
      loadBarbers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to invite barber');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async () => {
    if (!confirmRemove) return;
    try {
      await apiClient(`/salons/${selectedSalon}/barbers/${confirmRemove.id}`, { method: 'DELETE' });
      toast.success(`${confirmRemove.name} removed from salon`);
      setConfirmRemove(null);
      loadBarbers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove barber');
      setConfirmRemove(null);
    }
  };

  return (
    <Navbar>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Barbers</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your salon staff</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Invite Form */}
          <div className="card p-6 h-fit">
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <UserPlus className="h-4 w-4" /> Invite Barber
            </h2>
            <form onSubmit={handleInvite} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                <input type="text" required value={name} onChange={e => setName(e.target.value)} className="form-input" placeholder="Full name" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="form-input" placeholder="barber@email.com" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Temporary Password *</label>
                <input type="text" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} className="form-input" placeholder="Min. 6 characters" />
                <p className="text-xs text-gray-400 mt-1">Share this with the barber to log in for the first time.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Assign to Salon</label>
                <select value={selectedSalon} onChange={e => setSelectedSalon(e.target.value)} className="form-input">
                  {salons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <button type="submit" disabled={submitting || !selectedSalon} className="btn-primary w-full">
                <UserPlus className="h-4 w-4" />
                {submitting ? 'Inviting…' : 'Invite to Salon'}
              </button>
            </form>
          </div>

          {/* Barbers List */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" /> Salon Staff
              </h2>
              <select
                value={selectedSalon}
                onChange={e => setSelectedSalon(e.target.value)}
                className="form-input w-auto text-sm"
              >
                {salons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {barbers.length === 0 ? (
              <div className="card p-10 text-center text-gray-400">
                <UserPlus className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No barbers in this salon yet. Invite one!</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {barbers.map(barber => (
                  <div key={barber.id} className="card p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {barber.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{barber.name}</p>
                        <p className="text-xs text-gray-500">{barber.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setConfirmRemove({ id: barber.id, name: barber.name })}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {confirmRemove && (
        <ConfirmModal
          title="Remove barber?"
          message={`Remove ${confirmRemove.name} from this salon? Their account will still exist but they won't be able to log services here.`}
          confirmLabel="Remove"
          onConfirm={handleRemove}
          onCancel={() => setConfirmRemove(null)}
        />
      )}
    </Navbar>
  );
};
