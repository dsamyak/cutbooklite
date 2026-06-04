import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/layout/Navbar';
import { apiClient } from '../../api/client';
import { IndianRupee, Wallet, CreditCard, TrendingUp, Scissors, Plus } from 'lucide-react';

export const OwnerDashboard = () => {
  const [earnings, setEarnings] = useState<any>(null);
  const [salons, setSalons] = useState<any[]>([]);
  const [selectedSalon, setSelectedSalon] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Simplified custom date range logic for MVP demo (default to this month)
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
  
  const [dateRange, setDateRange] = useState({ from: firstDay, to: lastDay });

  useEffect(() => {
    loadSalons();
  }, []);

  useEffect(() => {
    if (salons) {
      loadEarnings();
    }
  }, [selectedSalon, dateRange]);

  const loadSalons = async () => {
    try {
      const res = await apiClient('/salons');
      setSalons(res.data);
      if (res.data.length > 0) setSelectedSalon(res.data[0].id);
    } catch (err) {
      console.error(err);
    }
  };

  const loadEarnings = async () => {
    setLoading(true);
    try {
      const url = `/earnings?from=${dateRange.from}&to=${dateRange.to}${selectedSalon ? `&salon_id=${selectedSalon}` : ''}`;
      const res = await apiClient(url);
      setEarnings(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Navbar>
      <div className="space-y-6">
        
        {/* Header Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500">Overview of your salon's performance</p>
          </div>
          <div className="flex space-x-3">
            <select 
              value={selectedSalon} 
              onChange={e => setSelectedSalon(e.target.value)}
              className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 shadow-sm"
            >
              <option value="">All Salons (Consolidated)</option>
              {salons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        {/* Dashboard Grid */}
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-gray-200 rounded-xl w-full"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="h-24 bg-gray-200 rounded-xl"></div>
              <div className="h-24 bg-gray-200 rounded-xl"></div>
              <div className="h-24 bg-gray-200 rounded-xl"></div>
              <div className="h-24 bg-gray-200 rounded-xl"></div>
            </div>
          </div>
        ) : (
          <>
            {/* Net Earning Banner */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl shadow-xl p-8 text-white flex justify-between items-center">
              <div>
                <p className="text-blue-100 text-sm font-medium uppercase tracking-wider mb-1">Net Earnings (This Period)</p>
                <div className="flex items-center">
                  <IndianRupee className="h-8 w-8 mr-1 opacity-80" />
                  <span className="text-5xl font-extrabold tracking-tight">
                    {earnings?.net_earning?.toLocaleString() || '0'}
                  </span>
                </div>
              </div>
              <div className="hidden sm:block p-4 bg-white/10 rounded-full backdrop-blur-md">
                <TrendingUp className="h-12 w-12 text-blue-100" />
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              <MetricCard 
                title="Total Gross" 
                value={earnings?.total_gross} 
                icon={<Wallet className="h-6 w-6 text-emerald-600" />} 
                color="emerald" 
              />
              
              <MetricCard 
                title="Cash Received" 
                value={earnings?.cash} 
                icon={<IndianRupee className="h-6 w-6 text-blue-600" />} 
                color="blue" 
              />
              
              <MetricCard 
                title="UPI Payments" 
                value={earnings?.upi} 
                icon={<CreditCard className="h-6 w-6 text-purple-600" />} 
                color="purple" 
              />
              
              <MetricCard 
                title="Total Expenses" 
                value={earnings?.total_expenses} 
                icon={<TrendingUp className="h-6 w-6 text-red-600 transform rotate-180" />} 
                color="red" 
              />

            </div>

            {/* Action Buttons & Quick Lists (Placeholders for MVP) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-900">Recent Services</h3>
                  <button className="text-sm text-blue-600 font-medium hover:underline">View all</button>
                </div>
                <div className="text-sm text-gray-500 italic">Select "Service Log" from menu to manage...</div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-900">Recent Expenses</h3>
                  <button className="text-sm text-blue-600 font-medium hover:underline flex items-center">
                    <Plus className="h-4 w-4 mr-1" /> Add Expense
                  </button>
                </div>
                <div className="text-sm text-gray-500 italic">Select "Expenses" from menu to manage...</div>
              </div>
            </div>
          </>
        )}
      </div>
    </Navbar>
  );
};

const MetricCard = ({ title, value, icon, color }: any) => {
  const bgColors: any = {
    emerald: 'bg-emerald-50',
    blue: 'bg-blue-50',
    purple: 'bg-purple-50',
    red: 'bg-red-50',
  };
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center hover:shadow-md transition-shadow cursor-default">
      <div className={`p-4 rounded-full ${bgColors[color]} mr-4`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900 flex items-center">
          <IndianRupee className="h-5 w-5 mr-0.5 text-gray-400" />
          {value?.toLocaleString() || '0'}
        </p>
      </div>
    </div>
  );
};
