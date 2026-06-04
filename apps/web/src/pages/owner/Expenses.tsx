import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/layout/Navbar';
import { apiClient } from '../../api/client';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import toast from 'react-hot-toast';
import { Plus, Trash2 } from 'lucide-react';

const CATEGORIES = ['Rent', 'Supplies', 'Utilities', 'Salary', 'Marketing', 'Other'];

export const Expenses = () => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [salons, setSalons] = useState<any[]>([]);
  const [selectedSalon, setSelectedSalon] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiClient('/salons').then(r => {
      setSalons(r.data);
      if (r.data.length > 0) setSelectedSalon(r.data[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedSalon) load();
  }, [selectedSalon]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiClient(`/expenses?salon_id=${selectedSalon}`);
      setExpenses(res.data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient('/expenses', {
        method: 'POST',
        body: JSON.stringify({
          salon_id: selectedSalon,
          amount: Number(amount),
          category,
          expense_date: date,
          note: note.trim() || undefined,
        }),
      });
      toast.success('Expense added');
      setAmount(''); setCategory(''); setNote('');
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient(`/expenses/${id}`, { method: 'DELETE' });
      toast.success('Expense deleted');
      setConfirmDelete(null);
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
      setConfirmDelete(null);
    }
  };

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <Navbar>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track and manage salon expenses</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Add Form */}
          <div className="card p-6 h-fit">
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add Expense
            </h2>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Salon</label>
                <select
                  value={selectedSalon}
                  onChange={e => setSelectedSalon(e.target.value)}
                  className="form-input"
                >
                  {salons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="form-input"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Category *</label>
                <select required value={category} onChange={e => setCategory(e.target.value)} className="form-input">
                  <option value="">Select category…</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="form-input"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Note (optional)</label>
                <input
                  type="text"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="form-input"
                  placeholder="Add a note…"
                />
              </div>
              <button
                type="submit"
                disabled={submitting || !selectedSalon}
                className="btn-primary w-full"
              >
                {submitting ? 'Saving…' : 'Save Expense'}
              </button>
            </form>
          </div>

          {/* Expenses List */}
          <div className="md:col-span-2 space-y-4">
            {/* Header with salon selector + total */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <h2 className="font-semibold text-gray-900">Expense History</h2>
              <div className="flex items-center gap-3">
                {total > 0 && (
                  <span className="text-sm font-semibold text-red-600 bg-red-50 px-3 py-1 rounded-full">
                    Total: ₹{total.toLocaleString('en-IN')}
                  </span>
                )}
                <select
                  value={selectedSalon}
                  onChange={e => setSelectedSalon(e.target.value)}
                  className="form-input w-auto text-sm"
                >
                  {salons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
              </div>
            ) : expenses.length === 0 ? (
              <div className="card p-10 text-center text-gray-400">
                <p className="text-sm">No expenses recorded for this salon.</p>
              </div>
            ) : (
              <div className="card overflow-hidden">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Note</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {expenses.map(exp => (
                      <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {new Date(exp.expense_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3">
                          <span className="bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-full text-xs font-medium">
                            {exp.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                          ₹{Number(exp.amount).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 max-w-[140px] truncate">
                          {exp.note || '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setConfirmDelete(exp.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {confirmDelete && (
        <ConfirmModal
          title="Delete expense?"
          message="This expense will be permanently removed and the net earning calculation will be updated."
          confirmLabel="Delete"
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </Navbar>
  );
};
