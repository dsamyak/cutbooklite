import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/layout/Navbar';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import toast from 'react-hot-toast';
import { Store, Plus, Pencil, Trash2, MapPin, Check, X } from 'lucide-react';

export const Salons = () => {
  const [salons, setSalons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  const user = useAuthStore(state => state.user);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('salons')
        .select('*')
        .eq('owner_id', user.ownerId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setSalons(data || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load salons');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const { error } = await supabase.from('salons').insert([{
        name: name.trim(),
        address: address.trim() || null,
        owner_id: user?.ownerId
      }]);
      if (error) throw error;
      toast.success('Salon created!');
      setName(''); setAddress('');
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create salon');
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (salon: any) => {
    setEditId(salon.id);
    setEditName(salon.name);
    setEditAddress(salon.address || '');
  };

  const cancelEdit = () => { setEditId(null); };

  const handleUpdate = async (id: string) => {
    try {
      const { error } = await supabase.from('salons').update({
        name: editName.trim(),
        address: editAddress.trim() || null
      }).eq('id', id);
      if (error) throw error;
      toast.success('Salon updated');
      setEditId(null);
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('salons').delete().eq('id', id);
      if (error) throw error;
      toast.success('Salon deleted');
      setConfirmDelete(null);
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete salon');
      setConfirmDelete(null);
    }
  };

  return (
    <Navbar>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Salons</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your salon locations</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Create Form */}
          <div className="card p-6 h-fit">
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Plus className="h-4 w-4" /> New Salon
            </h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Salon Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="form-input"
                  placeholder="e.g. Downtown Cuts"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Address (optional)</label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="form-input"
                  placeholder="123 Main Street"
                />
              </div>
              <button type="submit" disabled={creating} className="btn-primary w-full">
                <Store className="h-4 w-4" />
                {creating ? 'Creating…' : 'Create Salon'}
              </button>
            </form>
          </div>

          {/* Salon List */}
          <div className="md:col-span-2">
            {loading ? (
              <div className="space-y-3">
                {[1,2].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
              </div>
            ) : salons.length === 0 ? (
              <div className="card p-10 text-center text-gray-400">
                <Store className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No salons yet. Create your first salon!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {salons.map(salon => (
                  <div key={salon.id} className="card p-4">
                    {editId === salon.id ? (
                      /* Inline edit */
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          className="form-input flex-1"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          placeholder="Salon name"
                        />
                        <input
                          className="form-input flex-1"
                          value={editAddress}
                          onChange={e => setEditAddress(e.target.value)}
                          placeholder="Address (optional)"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdate(salon.id)}
                            className="p-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-2 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Display mode */
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">{salon.name}</h3>
                          {salon.address && (
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3" /> {salon.address}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEdit(salon)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(salon.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirm */}
      {confirmDelete && (
        <ConfirmModal
          title="Delete salon?"
          message="This will permanently delete the salon and all its data. This action cannot be undone."
          confirmLabel="Delete"
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </Navbar>
  );
};
