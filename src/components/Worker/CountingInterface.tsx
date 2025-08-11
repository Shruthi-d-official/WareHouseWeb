import React, { useState, useEffect } from 'react';
import { Play, Square, Package, Search, CheckCircle, AlertTriangle } from 'lucide-react';
import { BinMaster, CountingSession } from '../../types';
import { api } from '../../services/api';

interface CountingInterfaceProps {
  workerId: string;
  teamLeaderId: string;
  warehouseName: string;
}

interface QuantityConfirmation {
  binNo: string;
  quantity: number;
  show: boolean;
}

const CountingInterface: React.FC<CountingInterfaceProps> = ({
  workerId,
  teamLeaderId,
  warehouseName
}) => {
  const [session, setSession] = useState<CountingSession | null>(null);
  const [bins, setBins] = useState<BinMaster[]>([]);
  const [selectedBin, setSelectedBin] = useState<BinMaster | null>(null);
  const [quantity, setQuantity] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmation, setConfirmation] = useState<QuantityConfirmation>({
    binNo: '',
    quantity: 0,
    show: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadBins();
    checkActiveSession();
  }, []);

  const loadBins = async () => {
    try {
      const response = await api.get(`/bin-master?warehouse=${warehouseName}`);
      setBins(response.data);
    } catch (err) {
      setError('Failed to load bins');
    }
  };

  const checkActiveSession = async () => {
    try {
      const response = await api.get(`/counting-session/active/${workerId}`);
      if (response.data) {
        setSession(response.data);
      }
    } catch (err) {
      // No active session
    }
  };

  const startCounting = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/counting-session/start', {
        workerId,
        teamLeaderId,
        warehouseName
      });
      setSession(response.data);
    } catch (err) {
      setError('Failed to start counting session');
    } finally {
      setLoading(false);
    }
  };

  const endCounting = async () => {
    if (!session) return;
    
    setLoading(true);
    setError('');
    try {
      await api.post(`/counting-session/end/${session.id}`);
      setSession(null);
      setSelectedBin(null);
      setQuantity('');
      setSearchTerm('');
    } catch (err) {
      setError('Failed to end counting session');
    } finally {
      setLoading(false);
    }
  };

  const handleQuantitySubmit = () => {
    if (!selectedBin || !quantity.trim()) return;
    
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 0) {
      setError('Please enter a valid quantity');
      return;
    }

    setConfirmation({
      binNo: selectedBin.bin_no,
      quantity: qty,
      show: true
    });
  };

  const confirmQuantity = async () => {
    if (!session || !selectedBin) return;

    setLoading(true);
    setError('');
    try {
      await api.post('/counting-data', {
        sessionId: session.id,
        binNo: selectedBin.bin_no,
        qtyCountedWorker: confirmation.quantity,
        qtyAsPerBooks: selectedBin.qty_as_per_books
      });

      // Reset form
      setSelectedBin(null);
      setQuantity('');
      setSearchTerm('');
      setConfirmation({ binNo: '', quantity: 0, show: false });
    } catch (err) {
      setError('Failed to save counting data');
    } finally {
      setLoading(false);
    }
  };

  const cancelConfirmation = () => {
    setConfirmation({ binNo: '', quantity: 0, show: false });
  };

  const filteredBins = bins.filter(bin =>
    bin.bin_no.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString();
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Counting Interface</h1>
            <p className="text-gray-600 mt-1">Warehouse: {warehouseName}</p>
          </div>
          
          {session ? (
            <div className="text-right">
              <div className="flex items-center gap-2 text-green-600 mb-2">
                <Play className="w-5 h-5" />
                <span className="font-medium">Session Active</span>
              </div>
              <p className="text-sm text-gray-600">
                Started: {formatTime(session.start_time)}
              </p>
            </div>
          ) : (
            <div className="text-gray-500">
              <Square className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">No active session</p>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {!session ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Ready to Start Counting</h2>
            <p className="text-gray-600 mb-6">Click the button below to begin your counting session</p>
            <button
              onClick={startCounting}
              disabled={loading}
              className="bg-green-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 transition-colors flex items-center gap-2 mx-auto"
            >
              <Play className="w-5 h-5" />
              {loading ? 'Starting...' : 'Start Counting'}
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Bin Selection */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Step 1: Select Bin</h3>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search bins..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-60 overflow-y-auto">
                {filteredBins.map((bin) => (
                  <button
                    key={bin.id}
                    onClick={() => setSelectedBin(bin)}
                    className={`p-4 border rounded-lg text-left transition-colors ${
                      selectedBin?.id === bin.id
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{bin.bin_no}</div>
                    <div className="text-sm text-gray-600">
                      Books: {bin.qty_as_per_books}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity Entry */}
            {selectedBin && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Step 2: Enter Quantity</h3>
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <p className="text-sm text-gray-600">Selected Bin:</p>
                  <p className="font-medium text-gray-900">{selectedBin.bin_no}</p>
                  <p className="text-sm text-gray-600">Quantity as per books: {selectedBin.qty_as_per_books}</p>
                </div>
                
                <div className="flex gap-4">
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Enter counted quantity"
                    min="0"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <button
                    onClick={handleQuantitySubmit}
                    disabled={!quantity.trim() || loading}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                  >
                    Submit
                  </button>
                </div>
              </div>
            )}

            {/* End Counting */}
            <div className="pt-6 border-t">
              <button
                onClick={endCounting}
                disabled={loading}
                className="bg-red-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                <Square className="w-5 h-5" />
                {loading ? 'Ending...' : 'End Counting'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmation.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Confirm Quantity</h3>
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">Bin:</span>
                <span className="font-medium">{confirmation.binNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Counted Quantity:</span>
                <span className="font-medium">{confirmation.quantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Books Quantity:</span>
                <span className="font-medium">{selectedBin?.qty_as_per_books}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Difference:</span>
                <span className={`font-medium ${
                  confirmation.quantity - (selectedBin?.qty_as_per_books || 0) === 0
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}>
                  {confirmation.quantity - (selectedBin?.qty_as_per_books || 0)}
                </span>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={cancelConfirmation}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmQuantity}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CountingInterface;