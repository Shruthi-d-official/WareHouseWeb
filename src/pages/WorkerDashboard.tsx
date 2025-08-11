import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import CountingInterface from '../components/Worker/CountingInterface';
import Layout from '../components/Layout/Layout';
import { Clock, Package, TrendingUp, Award } from 'lucide-react';
import { api } from '../services/api';

interface WorkerStats {
  todayBins: number;
  todayQuantity: number;
  todayTime: number;
  efficiency: number;
  ranking: number;
}

const WorkerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<WorkerStats>({
    todayBins: 0,
    todayQuantity: 0,
    todayTime: 0,
    efficiency: 0,
    ranking: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadWorkerStats();
    }
  }, [user]);

  const loadWorkerStats = async () => {
    try {
      const response = await api.get(`/worker-performance/today/${user?.id}`);
      if (response.data) {
        setStats(response.data);
      }
    } catch (err) {
      console.error('Failed to load worker stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  if (!user) return null;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Worker Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user.user_id}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Bins Counted Today</p>
                <p className="text-2xl font-bold text-gray-900">{stats.todayBins}</p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Quantity</p>
                <p className="text-2xl font-bold text-gray-900">{stats.todayQuantity}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Time Spent</p>
                <p className="text-2xl font-bold text-gray-900">{formatTime(stats.todayTime)}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Efficiency</p>
                <p className="text-2xl font-bold text-gray-900">{stats.efficiency}%</p>
              </div>
              <Award className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Counting Interface */}
        <CountingInterface
          workerId={user.id}
          teamLeaderId={user.team_leader_id || ''}
          warehouseName={user.warehouse_name || ''}
        />
      </div>
    </Layout>
  );
};

export default WorkerDashboard;