import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  CheckCircle, 
  XCircle, 
  Truck, 
  Package, 
  DollarSign,
  Calendar,
  User,
  FileText,
  RotateCcw,
  AlertCircle
} from 'lucide-react';

const ReturnManagement = () => {
  const { user } = useAuth();
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    fetchReturns();
  }, [statusFilter, page]);

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });
      
      if (statusFilter) {
        queryParams.append('status', statusFilter);
      }

      const response = await fetch(`/api/returns/admin/all?${queryParams}`);
      const data = await response.json();

      if (data.success) {
        setReturns(data.data);
        setPagination(data.pagination);
      } else {
        setError(data.message || 'Failed to fetch returns');
      }
    } catch (err) {
      setError('Failed to fetch returns');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (returnId, action, body = {}) => {
    try {
      const response = await fetch(`/api/returns/${returnId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (data.success) {
        fetchReturns(); // Refresh the list
      } else {
        setError(data.message || `Failed to ${action} return`);
      }
    } catch (err) {
      setError(`Failed to ${action} return`);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'return_requested':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'return_approved':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'return_rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'picked_up':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'returned':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'refunded':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'return_requested':
        return <AlertCircle className="w-4 h-4" />;
      case 'return_approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'return_rejected':
        return <XCircle className="w-4 h-4" />;
      case 'picked_up':
        return <Truck className="w-4 h-4" />;
      case 'returned':
        return <Package className="w-4 h-4" />;
      case 'refunded':
        return <DollarSign className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getReturnStatusText = (status) => {
    switch (status?.toLowerCase()) {
      case 'return_requested':
        return 'Return Requested';
      case 'return_approved':
        return 'Return Approved';
      case 'return_rejected':
        return 'Return Rejected';
      case 'picked_up':
        return 'Pickup Scheduled';
      case 'returned':
        return 'Return Completed';
      case 'refunded':
        return 'Refunded';
      default:
        return 'No Return';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight">Return Management</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              >
                <option value="">All Returns</option>
                <option value="return_requested">Return Requested</option>
                <option value="return_approved">Return Approved</option>
                <option value="return_rejected">Return Rejected</option>
                <option value="picked_up">Pickup Scheduled</option>
                <option value="returned">Return Completed</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Returns List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Return Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {returns.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          Return #{order._id?.slice(-8).toUpperCase()}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(order.returnRequestedAt)}
                        </div>
                        {order.returnReason && (
                          <div className="text-sm text-gray-600 mt-1 max-w-xs truncate">
                            {order.returnReason}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="h-5 w-5 text-gray-500" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {order.user?.name || 'Unknown'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {order.user?.email || 'No email'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        Order #{order._id?.slice(-8).toUpperCase()}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDate(order.orderDate)}
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        ${order.totalAmount?.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(order.returnStatus)}`}>
                        {getStatusIcon(order.returnStatus)}
                        <span className="ml-1">{getReturnStatusText(order.returnStatus)}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex flex-col gap-2">
                        {order.returnStatus === 'return_requested' && (
                          <>
                            <button
                              onClick={() => handleAction(order._id, 'approve')}
                              className="text-green-600 hover:text-green-900 flex items-center gap-1"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Approve
                            </button>
                            <button
                              onClick={() => handleAction(order._id, 'reject')}
                              className="text-red-600 hover:text-red-900 flex items-center gap-1"
                            >
                              <XCircle className="w-4 h-4" />
                              Reject
                            </button>
                          </>
                        )}
                        
                        {order.returnStatus === 'return_approved' && (
                          <button
                            onClick={() => handleAction(order._id, 'pickup')}
                            className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                          >
                            <Truck className="w-4 h-4" />
                            Schedule Pickup
                          </button>
                        )}
                        
                        {order.returnStatus === 'picked_up' && (
                          <button
                            onClick={() => handleAction(order._id, 'complete')}
                            className="text-purple-600 hover:text-purple-900 flex items-center gap-1"
                          >
                            <Package className="w-4 h-4" />
                            Mark Returned
                          </button>
                        )}
                        
                        {order.returnStatus === 'returned' && (
                          <button
                            onClick={() => handleAction(order._id, 'refund')}
                            className="text-green-600 hover:text-green-900 flex items-center gap-1"
                          >
                            <DollarSign className="w-4 h-4" />
                            Process Refund
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === pagination.pages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{(page - 1) * pagination.limit + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(page * pagination.limit, pagination.total)}</span> of{' '}
                    <span className="font-medium">{pagination.total}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                      Page {page} of {pagination.pages}
                    </span>
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={page === pagination.pages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReturnManagement;
