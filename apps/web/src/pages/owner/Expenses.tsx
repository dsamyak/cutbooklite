import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/layout/Navbar';
import { apiClient } from '../../api/client';
import { Plus, Trash2 } from 'lucide-react';

export const Expenses = () => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  
  // For MVP demo assume owner has 1 salon selected or we pick the first one
  const [salons, setSalons] = useState<any[]>([]);
  const [selectedSalon, setSelectedSalon] = useState('');

  useEffect(() => {
    loadSalons();
  }, []);

  useEffect(() => {
    if (selectedSalon) {
      loadExpenses();
    }
  }, [selectedSalon]);

  const loadSalons = async () => {
    try {
      const res = await apiClient('/salons');
      setSalons(res.data);
      if (res.data.length > 0) setSelectedSalon(res.data[0].id);
    } catch (err) {}
  };

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const res = await apiClient(`/expenses?salon_id=${selectedSalon}`);
      setExpenses(res.data);
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient('/expenses', {
        method: 'POST',
        body: JSON.stringify({
          salon_id: selectedSalon,
          amount: Number(amount),
          category,
          expense_date: date,
          note
        })
      });
      setAmount(''); setCategory(''); setNote('');
      loadExpenses();
    } catch (err) {
      alert('Failed to add expense');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      try {
        await apiClient(`/expenses/${id}`, { method: 'DELETE' });
        loadExpenses();
      } catch (err) {
        alert('Failed to delete');
      }
    }
  };

  return (
    <Navbar>
      <div className="grid md:grid-cols-3 gap-6">
        
        {/* Add Expense Form */}
        <div className="md:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
          <h2 className="text-xl font-bold mb-4 flex items-center"><Plus className="h-5 w-5 mr-1" /> Add Expense</h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Amount</label>
              <input type="number" required value={amount} onChange={e=>setAmount(e.target.value)} className="mt-1 w-full p-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select required value={category} onChange={e=>setCategory(e.target.value)} className="mt-1 w-full p-2 border rounded-md">
                <option value="">Select...</option>
                <option value="Rent">Rent</option>
                <option value="Supplies">Supplies</option>
                <option value="Utilities">Utilities</option>
                <option value="Salary">Salary</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <input type="date" required value={date} onChange={e=>setDate(e.target.value)} className="mt-1 w-full p-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Note</label>
              <input type="text" value={note} onChange={e=>setNote(e.target.value)} className="mt-1 w-full p-2 border rounded-md" />
            </div>
            <button type="submit" disabled={!selectedSalon} className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 disabled:opacity-50">Save Expense</button>
          </form>
        </div>

        {/* Expenses List */}
        <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
           <div className="flex justify-between mb-4 items-center">
             <h2 className="text-xl font-bold">Expense History</h2>
             <select value={selectedSalon} onChange={e=>setSelectedSalon(e.target.value)} className="p-2 border rounded-md text-sm">
                {salons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
             </select>
           </div>
           
           {loading ? <p>Loading...</p> : (
             <div className="overflow-x-auto">
               <table className="min-w-full divide-y divide-gray-200">
                 <thead className="bg-gray-50">
                   <tr>
                     <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                     <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                     <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                     <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-200">
                   {expenses.length === 0 ? <tr><td colSpan={4} className="text-center py-4 text-gray-500">No expenses found</td></tr> : null}
                   {expenses.map(exp => (
                     <tr key={exp.id}>
                       <td className="px-4 py-3 text-sm text-gray-900">{new Date(exp.expense_date).toLocaleDateString()}</td>
                       <td className="px-4 py-3 text-sm text-gray-900">
                         <span className="bg-gray-100 px-2 py-1 rounded text-xs">{exp.category}</span>
                       </td>
                       <td className="px-4 py-3 text-sm font-semibold text-gray-900">₹{exp.amount}</td>
                       <td className="px-4 py-3 text-sm text-right">
                         <button onClick={() => handleDelete(exp.id)} className="text-red-500 hover:text-red-700 p-1">
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
    </Navbar>
  );
};
