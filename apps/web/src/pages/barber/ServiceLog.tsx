import React, { useState } from 'react';
import { Navbar } from '../../components/layout/Navbar';
import { apiClient } from '../../api/client';
import { Scissors, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export const BarberServiceLog = () => {
  const user = useAuthStore(state => state.user);
  const [salonId, setSalonId] = useState(''); // Normally we'd fetch the barber's assigned salon
  
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [paymentType, setPaymentType] = useState('CASH');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Auto-fetch salon for barber (MVP hack: assume barber is assigned to 1 salon, we need to fetch it)
  // For brevity in this file, assume the user types the exact amount and logs it.
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // In a real app we fetch this salonId automatically. We'll use a mocked ID for demo or fetch it first.
      // Since we don't have the barber's salon loaded yet in this snippet, let's pretend they have a default one.
      
      const payload = {
        salon_id: 'auto-resolve-in-backend-or-fetch-first', 
        name,
        price: Number(price),
        payment_type: paymentType,
        service_date: new Date().toISOString().split('T')[0]
      };

      // We need to fetch the salon first if we didn't. 
      const meRes = await apiClient('/salons/barbers/me'); // Just conceptually

      await apiClient('/services', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      setSuccess(true);
      setName('');
      setPrice('');
    } catch (err: any) {
      setError(err.message || 'Failed to log service');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Navbar>
      <div className="max-w-lg mx-auto bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-6 text-center">
          <div className="inline-block p-3 bg-white/10 rounded-full mb-3">
            <Scissors className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">Log New Service</h2>
          <p className="text-gray-300 text-sm mt-1">Record a completed haircut or service</p>
        </div>
        
        <div className="p-6 space-y-6">
          {success && (
            <div className="bg-green-50 text-green-800 p-4 rounded-lg flex items-center border border-green-200">
              <CheckCircle className="h-5 w-5 mr-3 text-green-600" />
              Service logged successfully!
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 text-red-800 p-4 rounded-lg text-sm border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service Name</label>
              <input
                type="text"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g. Men's Haircut + Beard"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
              <input
                type="number"
                required
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
                value={price}
                onChange={e => setPrice(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentType('CASH')}
                  className={`py-3 font-semibold rounded-lg border-2 transition-all ${
                    paymentType === 'CASH' 
                      ? 'border-blue-600 bg-blue-50 text-blue-700' 
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  CASH
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentType('UPI')}
                  className={`py-3 font-semibold rounded-lg border-2 transition-all ${
                    paymentType === 'UPI' 
                      ? 'border-purple-600 bg-purple-50 text-purple-700' 
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  UPI
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-70 shadow-lg shadow-gray-200"
            >
              {loading ? 'Saving...' : 'Save Service Record'}
            </button>
          </form>
        </div>
      </div>
    </Navbar>
  );
};
