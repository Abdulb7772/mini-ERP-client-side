'use client';

import { useState, useEffect } from 'react';
import axios from '@/services/axios';
import { toast } from 'react-hot-toast';
import { Skeleton } from '@/components/Skeleton';

interface WalletTransaction {
  _id: string;
  type: 'credit' | 'debit';
  amount: number;
  source: string;
  description: string;
  balanceAfter: number;
  createdAt: string;
  orderId?: {
    _id: string;
    orderNumber: string;
    totalAmount: number;
  };
}

interface Wallet {
  balance: number;
  totalEarned: number;
  totalSpent: number;
}

export default function WalletPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterType, setFilterType] = useState<'all' | 'credit' | 'debit'>('all');

  useEffect(() => {
    fetchWallet();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [currentPage, filterType]);

  const fetchWallet = async () => {
    try {
      const response = await axios.get('/wallet');
      if (response.data.success) {
        setWallet(response.data.data);
      }
    } catch (error: any) {
      console.error('Error fetching wallet:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch wallet');
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit: 10,
      };

      if (filterType !== 'all') {
        params.type = filterType;
      }

      const response = await axios.get('/wallet/transactions', { params });

      if (response.data.success) {
        setTransactions(response.data.data);
        setTotalPages(response.data.pagination.totalPages);
      }
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      refund: 'Refund',
      purchase: 'Purchase',
      admin_credit: 'Admin Credit',
      admin_debit: 'Admin Debit',
      order_cancellation: 'Order Cancellation',
    };
    return labels[source] || source;
  };

  const getSourceIcon = (source: string) => {
    const icons: Record<string, string> = {
      refund: '💰',
      purchase: '🛒',
      admin_credit: '➕',
      admin_debit: '➖',
      order_cancellation: '❌',
    };
    return icons[source] || '📝';
  };

  const Pagination = ({ currentPage, totalPages, onPageChange }: { currentPage: number; totalPages: number; onPageChange: (page: number) => void }) => {
    return (
      <div className="flex items-center justify-center space-x-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <div className="flex items-center space-x-1">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i + 1}
              onClick={() => onPageChange(i + 1)}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition ${
                currentPage === i + 1
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Wallet</h1>
          <p className="text-gray-600">Manage your wallet points and view transaction history</p>
        </div>

        {/* Wallet Overview Cards */}
        {wallet && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-purple-500 to-purple-700 text-white p-6 rounded-lg shadow-lg">
              <h3 className="text-sm font-medium mb-2 opacity-90">Current Balance</h3>
              <p className="text-4xl font-bold mb-1">{wallet.balance.toFixed(2)}</p>
              <p className="text-sm opacity-75">points</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-700 text-white p-6 rounded-lg shadow-lg">
              <h3 className="text-sm font-medium mb-2 opacity-90">Total Earned</h3>
              <p className="text-4xl font-bold mb-1">{wallet.totalEarned.toFixed(2)}</p>
              <p className="text-sm opacity-75">points (lifetime)</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white p-6 rounded-lg shadow-lg">
              <h3 className="text-sm font-medium mb-2 opacity-90">Total Spent</h3>
              <p className="text-4xl font-bold mb-1">{wallet.totalSpent.toFixed(2)}</p>
              <p className="text-sm opacity-75">points (lifetime)</p>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="flex border-b">
            <button
              onClick={() => {
                setFilterType('all');
                setCurrentPage(1);
              }}
              className={`flex-1 px-6 py-4 text-sm font-medium transition ${
                filterType === 'all'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Transactions
            </button>
            <button
              onClick={() => {
                setFilterType('credit');
                setCurrentPage(1);
              }}
              className={`flex-1 px-6 py-4 text-sm font-medium transition ${
                filterType === 'credit'
                  ? 'text-green-600 border-b-2 border-green-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Credits (Received)
            </button>
            <button
              onClick={() => {
                setFilterType('debit');
                setCurrentPage(1);
              }}
              className={`flex-1 px-6 py-4 text-sm font-medium transition ${
                filterType === 'debit'
                  ? 'text-red-600 border-b-2 border-red-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Debits (Spent)
            </button>
          </div>
        </div>

        {/* Transactions List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Transaction History</h2>
          </div>

          {loading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-start space-x-4 flex-1">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <div className="text-right">
                    <Skeleton className="h-5 w-20 mb-1" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">💰</div>
              <p className="text-gray-500 text-lg mb-2">No transactions yet</p>
              <p className="text-gray-400 text-sm">
                Your wallet transactions will appear here
              </p>
            </div>
          ) : (
            <div>
              <div className="divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <div
                    key={transaction._id}
                    className="px-6 py-4 hover:bg-gray-50 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="text-3xl">
                          {getSourceIcon(transaction.source)}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-medium text-gray-900">
                              {getSourceLabel(transaction.source)}
                            </h3>
                            <span
                              className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                                transaction.type === 'credit'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {transaction.type === 'credit' ? '+' : '-'}{transaction.amount.toFixed(2)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">
                            {transaction.description}
                          </p>
                          {transaction.orderId && (
                            <p className="text-xs text-gray-500">
                              Order: {transaction.orderId.orderNumber}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDate(transaction.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500 mb-1">Balance After</p>
                        <p className="text-lg font-bold text-purple-600">
                          {transaction.balanceAfter.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">About Wallet Points</h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li className="flex items-start">
              <span className="mr-2">💡</span>
              <span>Wallet points are earned when admin approves your refund request for cancelled orders</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">🛒</span>
              <span>Use your wallet points during checkout to reduce the order total</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">💰</span>
              <span>1 wallet point = $1 value</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
