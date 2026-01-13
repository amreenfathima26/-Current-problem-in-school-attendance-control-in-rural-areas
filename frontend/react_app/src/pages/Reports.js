import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { attendanceAPI, reportsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  FileText,
  Download,
  Calendar,
  Users,
  TrendingUp,
  Filter,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

const Reports = () => {
  const { user } = useAuth();
  const [reportType, setReportType] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedStudent, setSelectedStudent] = useState('');
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  // Fetch attendance stats for the current week
  const { data: weeklyStats, isLoading: statsLoading } = useQuery(
    ['weeklyStats'],
    () => attendanceAPI.getAttendanceStats('week')
  );

  // Fetch recent attendance summaries
  const { data: recentSummaries, isLoading: summariesLoading } = useQuery(
    ['recentSummaries'],
    () => attendanceAPI.getAttendanceSummaries({ limit: 10 })
  );

  const generateDailyReport = async () => {
    try {
      const response = await reportsAPI.generateDailyReport(selectedDate);
      const blob = new Blob([response], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `daily-attendance-report-${selectedDate}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Daily report downloaded successfully!');
    } catch (error) {
      toast.error('Failed to generate daily report');
      console.error('Error:', error);
    }
  };

  const generateMonthlyReport = async () => {
    try {
      const response = await reportsAPI.generateMonthlyReport(selectedMonth, selectedYear);
      const blob = new Blob([response], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `monthly-attendance-report-${selectedYear}-${selectedMonth}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Monthly report downloaded successfully!');
    } catch (error) {
      toast.error('Failed to generate monthly report');
      console.error('Error:', error);
    }
  };

  const generateStudentReport = async () => {
    if (!selectedStudent) {
      toast.error('Please select a student');
      return;
    }
    
    try {
      const response = await reportsAPI.generateStudentReport(selectedStudent);
      const blob = new Blob([response], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `student-attendance-report-${selectedStudent}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Student report downloaded successfully!');
    } catch (error) {
      toast.error('Failed to generate student report');
      console.error('Error:', error);
    }
  };

  const exportAttendanceExcel = async () => {
    try {
      const response = await reportsAPI.exportAttendanceExcel({
        start_date: dateRange.start,
        end_date: dateRange.end,
      });
      const blob = new Blob([response], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `attendance-export-${dateRange.start}-to-${dateRange.end}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Excel export downloaded successfully!');
    } catch (error) {
      toast.error('Failed to export Excel file');
      console.error('Error:', error);
    }
  };

  const getMonthName = (month) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">
            Generate attendance reports and view analytics
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      {weeklyStats && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-md bg-blue-100">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Days Tracked</p>
                <p className="text-2xl font-bold text-gray-900">
                  {weeklyStats.total_days}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-md bg-green-100">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Avg Attendance</p>
                <p className="text-2xl font-bold text-gray-900">
                  {weeklyStats.average_attendance?.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-md bg-purple-100">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Present</p>
                <p className="text-2xl font-bold text-gray-900">
                  {weeklyStats.total_present}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-md bg-red-100">
                <Users className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Absent</p>
                <p className="text-2xl font-bold text-gray-900">
                  {weeklyStats.total_absent}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Generation */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Generate Reports</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Report */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <FileText className="h-5 w-5 text-blue-600 mr-2" />
              <h4 className="font-medium text-gray-900">Daily Attendance Report</h4>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Generate a detailed PDF report for a specific date
            </p>
            <div className="space-y-3">
              <div>
                <label className="form-label">Select Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="form-input"
                />
              </div>
              <button
                onClick={generateDailyReport}
                className="btn btn-primary w-full flex items-center justify-center"
              >
                <Download className="h-4 w-4 mr-2" />
                Generate Daily Report
              </button>
            </div>
          </div>

          {/* Monthly Report */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <Calendar className="h-5 w-5 text-green-600 mr-2" />
              <h4 className="font-medium text-gray-900">Monthly Attendance Report</h4>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Generate a comprehensive monthly summary report
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Month</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="form-input"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {getMonthName(i + 1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Year</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="form-input"
                  >
                    {Array.from({ length: 5 }, (_, i) => {
                      const year = new Date().getFullYear() - 2 + i;
                      return (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
              <button
                onClick={generateMonthlyReport}
                className="btn btn-primary w-full flex items-center justify-center"
              >
                <Download className="h-4 w-4 mr-2" />
                Generate Monthly Report
              </button>
            </div>
          </div>

          {/* Student Report */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <Users className="h-5 w-5 text-purple-600 mr-2" />
              <h4 className="font-medium text-gray-900">Student Attendance Report</h4>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Generate individual student attendance history
            </p>
            <div className="space-y-3">
              <div>
                <label className="form-label">Student ID</label>
                <input
                  type="text"
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="form-input"
                  placeholder="Enter student ID (e.g., STU001)"
                />
              </div>
              <button
                onClick={generateStudentReport}
                className="btn btn-primary w-full flex items-center justify-center"
              >
                <Download className="h-4 w-4 mr-2" />
                Generate Student Report
              </button>
            </div>
          </div>

          {/* Excel Export */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <FileText className="h-5 w-5 text-orange-600 mr-2" />
              <h4 className="font-medium text-gray-900">Excel Export</h4>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Export attendance data to Excel for further analysis
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">End Date</label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>
              <button
                onClick={exportAttendanceExcel}
                className="btn btn-primary w-full flex items-center justify-center"
              >
                <Download className="h-4 w-4 mr-2" />
                Export to Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Attendance Summaries */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Recent Attendance Summaries</h3>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-outline flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>

        {summariesLoading ? (
          <div className="flex justify-center py-8">
            <div className="loading-spinner"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Date</th>
                  <th className="table-header-cell">Total Students</th>
                  <th className="table-header-cell">Present</th>
                  <th className="table-header-cell">Absent</th>
                  <th className="table-header-cell">Late</th>
                  <th className="table-header-cell">Excused</th>
                  <th className="table-header-cell">Attendance %</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {recentSummaries?.results?.map((summary) => (
                  <tr key={summary.id}>
                    <td className="table-cell">
                      {new Date(summary.date).toLocaleDateString()}
                    </td>
                    <td className="table-cell">{summary.total_students}</td>
                    <td className="table-cell text-green-600">{summary.present_count}</td>
                    <td className="table-cell text-red-600">{summary.absent_count}</td>
                    <td className="table-cell text-yellow-600">{summary.late_count}</td>
                    <td className="table-cell text-blue-600">{summary.excused_count}</td>
                    <td className="table-cell">
                      <span className={`font-medium ${
                        summary.attendance_percentage >= 90 
                          ? 'text-green-600' 
                          : summary.attendance_percentage >= 80 
                          ? 'text-yellow-600' 
                          : 'text-red-600'
                      }`}>
                        {summary.attendance_percentage?.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {recentSummaries?.results?.length === 0 && (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No summaries available</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No attendance summaries found for recent dates.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
