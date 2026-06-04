import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/layout/Navbar';
import { apiClient } from '../../api/client';
import { UserPlus, Trash2 } from 'lucide-react';

export const Barbers = () => {
  const [barbers, setBarbers] = useState<any[]>([]);
  const [salons, setSalons] = useState<any[]>([]);
  const [selectedSalon, setSelectedSalon] = useState('');
  
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    loadSalons();
  }, []);

  useEffect(() => {
    if (selectedSalon) {
      loadBarbers();
    }
  }, [selectedSalon]);

  const loadSalons = async () => {
    try {
      const res = await apiClient('/salons');
      setSalons(res.data);
      if (res.data.length > 0) setSelectedSalon(res.data[0].id);
    } catch (err) {}
  };

  const loadBarbers = async () => {
    try {
      const res = await apiClient(`/salons/${selectedSalon}/barbers`);
      setBarbers(res.data);
    } catch (err) {}
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // 1. Invite Barber (Creates account under Owner)
      const res = await apiClient('/auth/invite-barber', {
        method: 'POST',
        body: JSON.stringify({ name, email, tempPassword: password })
      });
      
      const newBarberId = res.data.id;
      
      // 2. Add to Salon
      await apiClient(`/salons/${selectedSalon}/barbers/${newBarberId}`, { method: 'POST' });
      
      alert('Barber invited successfully!');
      setName(''); setEmail(''); setPassword('');
      loadBarbers();
    } catch (err: any) {
      alert(err.message || 'Failed to invite');
    }
  };

  const handleRemove = async (barberId: string) => {
    if(confirm('Remove this barber from the salon?')) {
      try {
        await apiClient(`/salons/${selectedSalon}/barbers/${barberId}`, { method: 'DELETE' });
        loadBarbers();
      } catch (err) {}
    }
  };

  return (
    <Navbar>
      <div className="grid md:grid-cols-3 gap-6">
        
        <div className="md:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
          <h2 className="text-xl font-bold mb-4 flex items-center"><UserPlus className="h-5 w-5 mr-1" /> Invite Barber</h2>
          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input type="text" required value={name} onChange={e=>setName(e.target.value)} className="mt-1 w-full p-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 w-full p-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Temporary Password</label>
              <input type="text" required value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 w-full p-2 border rounded-md" />
            </div>
            <button type="submit" disabled={!selectedSalon} className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 disabled:opacity-50">Invite to Salon</button>
          </form>
        </div>

        <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
           <div className="flex justify-between mb-4 items-center">
             <h2 className="text-xl font-bold">Salon Staff</h2>
             <select value={selectedSalon} onChange={e=>setSelectedSalon(e.target.value)} className="p-2 border rounded-md text-sm">
                {salons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
             </select>
           </div>
           
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             {barbers.map(barber => (
               <div key={barber.id} className="border border-gray-200 rounded-lg p-4 flex justify-between items-center">
                 <div>
                   <h3 className="font-bold text-gray-900">{barber.name}</h3>
                   <p className="text-sm text-gray-500">{barber.email}</p>
                 </div>
                 <button onClick={() => handleRemove(barber.id)} className="text-red-500 p-2 hover:bg-red-50 rounded-full">
                   <Trash2 className="h-4 w-4" />
                 </button>
               </div>
             ))}
             {barbers.length === 0 && <p className="text-gray-500 col-span-2">No barbers in this salon.</p>}
           </div>
        </div>
      </div>
    </Navbar>
  );
};
