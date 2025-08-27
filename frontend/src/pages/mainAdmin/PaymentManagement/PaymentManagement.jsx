import React, { useState, useEffect } from 'react';
import AdminLayout from '../AdminLayout/AdminLayout';
import axios from 'axios';
import './PaymentManagement.css';

const PaymentManagement = () => {
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('payments');
  const [filters, setFilters] = useState({
    status: '',
    courseId: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    loadPayments();
    loadStudentsWithPurchases();
  }, []);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/payments', {
        headers: { Authorization: `Bearer ${token}` },
        params: filters
      });

      if (response.data.success) {
        setPayments(response.data.payments);
      }
    } catch (error) {
      console.error('Error loading payments:', error);
      alert('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const loadStudentsWithPurchases = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/students-with-purchases', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setStudents(response.data.students);
      }
    } catch (error) {
      console.error('Error loading students:', error);
      alert('Failed to load students data');
    } finally {
      setLoading(false);
    }
  };

  const updateCourseStatus = async (studentId, courseId, status) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.put(
        `/api/admin/student/${studentId}/course/${courseId}/status`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert(`Course status updated to ${status}`);
        loadStudentsWithPurchases(); // Refresh data
      }
    } catch (error) {
      console.error('Error updating course status:', error);
      alert('Failed to update course status');
    }
  };

  const downloadReceipt = async (receiptId) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(
        `/api/admin/receipt/${receiptId}/download?format=html`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Create and download HTML file
      const blob = new Blob([response.data], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${receiptId}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading receipt:', error);
      alert('Failed to download receipt');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount / 100);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return '#27ae60';
      case 'created': return '#f39c12';
      case 'failed': return '#e74c3c';
      case 'unlocked': return '#27ae60';
      case 'locked': return '#e74c3c';
      default: return '#7f8c8d';
    }
  };

  return (
    <AdminLayout>
      <div className="payment-management">
        <div className="page-header">
          <h1>Payment Management</h1>
          <p>Manage student payments and course access</p>
        </div>

        <div className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === 'payments' ? 'active' : ''}`}
            onClick={() => setActiveTab('payments')}
          >
            All Payments
          </button>
          <button
            className={`tab-btn ${activeTab === 'students' ? 'active' : ''}`}
            onClick={() => setActiveTab('students')}
          >
            Students & Purchases
          </button>
        </div>

        {activeTab === 'payments' && (
          <div className="payments-section">
            <div className="filters">
              <select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
              >
                <option value="">All Status</option>
                <option value="paid">Paid</option>
                <option value="created">Created</option>
                <option value="failed">Failed</option>
              </select>
              <button onClick={loadPayments} className="filter-btn">
                Filter
              </button>
            </div>

            {loading ? (
              <div className="loading">Loading payments...</div>
            ) : (
              <div className="payments-table">
                <table>
                  <thead>
                    <tr>
                      <th>Payment ID</th>
                      <th>Student</th>
                      <th>Course</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment._id}>
                        <td>{payment._id.substring(0, 8)}...</td>
                        <td>
                          <div>
                            <div>{payment.userId?.name || 'N/A'}</div>
                            <div className="email">{payment.userId?.email}</div>
                          </div>
                        </td>
                        <td>{payment.courseId?.name || 'N/A'}</td>
                        <td>{formatCurrency(payment.amount)}</td>
                        <td>
                          <span
                            className="status-badge"
                            style={{ backgroundColor: getStatusColor(payment.status) }}
                          >
                            {payment.status.toUpperCase()}
                          </span>
                        </td>
                        <td>{formatDate(payment.createdAt)}</td>
                        <td>
                          {payment.status === 'paid' && (
                            <button
                              onClick={() => downloadReceipt(payment._id)}
                              className="action-btn"
                            >
                              Download Receipt
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'students' && (
          <div className="students-section">
            {loading ? (
              <div className="loading">Loading students...</div>
            ) : (
              <div className="students-list">
                {students.map((student) => (
                  <div key={student._id} className="student-card">
                    <div className="student-header">
                      <h3>{student.name}</h3>
                      <div className="student-meta">
                        <span>{student.email}</span>
                        <span>Total Spent: {formatCurrency(student.totalSpent || 0)}</span>
                      </div>
                    </div>

                    <div className="student-courses">
                      <h4>Enrolled Courses:</h4>
                      {student.enrolledCourses?.length > 0 ? (
                        <div className="courses-grid">
                          {student.enrolledCourses.map((enrollment) => (
                            <div key={enrollment._id} className="course-item">
                              <div className="course-info">
                                <span className="course-name">
                                  {enrollment.courseId?.name || 'Course'}
                                </span>
                                <span className="enrollment-date">
                                  Enrolled: {formatDate(enrollment.enrolledAt)}
                                </span>
                              </div>
                              <div className="course-actions">
                                <span
                                  className="status-badge"
                                  style={{ backgroundColor: getStatusColor(enrollment.status) }}
                                >
                                  {enrollment.status.toUpperCase()}
                                </span>
                                <select
                                  value={enrollment.status}
                                  onChange={(e) =>
                                    updateCourseStatus(
                                      student._id,
                                      enrollment.courseId._id,
                                      e.target.value
                                    )
                                  }
                                  className="status-select"
                                >
                                  <option value="locked">Locked</option>
                                  <option value="unlocked">Unlocked</option>
                                </select>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p>No courses enrolled</p>
                      )}
                    </div>

                    {student.payments?.length > 0 && (
                      <div className="student-payments">
                        <h4>Payment History:</h4>
                        <div className="payments-summary">
                          {student.payments.slice(0, 3).map((payment) => (
                            <div key={payment._id} className="payment-item">
                              <span>{payment.courseId?.name}</span>
                              <span>{formatCurrency(payment.amount)}</span>
                              <span
                                className="status-badge small"
                                style={{ backgroundColor: getStatusColor(payment.status) }}
                              >
                                {payment.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default PaymentManagement;
