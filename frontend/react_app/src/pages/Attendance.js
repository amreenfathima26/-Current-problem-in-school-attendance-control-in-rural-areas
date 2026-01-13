import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { attendanceAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import FaceRecognitionCamera from '../components/FaceRecognitionCamera';
import {
  Calendar,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Download,
  Camera,
} from 'lucide-react';
import toast from 'react-hot-toast';

const Attendance = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFaceCamera, setShowFaceCamera] = useState(false);

  // Fetch today's attendance
  const { data: todayAttendance, isLoading: todayLoading } = useQuery(
    ['todayAttendance', selectedDate],
    () => attendanceAPI.getDailyAttendance(selectedDate),
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  // Fetch attendance records
  const { data: attendanceRecords, isLoading: recordsLoading } = useQuery(
    ['attendanceRecords', selectedDate, searchTerm, statusFilter],
    () => attendanceAPI.getAttendanceRecords({
      date: selectedDate,
      search: searchTerm,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    }),
    {
      enabled: !!selectedDate,
    }
  );

  // Create attendance record mutation
  const createRecordMutation = useMutation(attendanceAPI.createAttendanceRecord, {
    onSuccess: () => {
      queryClient.invalidateQueries(['todayAttendance', selectedDate]);
      queryClient.invalidateQueries(['attendanceRecords', selectedDate]);
      toast.success('Attendance recorded successfully!');
    },
    onError: (error) => {
      toast.error('Failed to record attendance');
      console.error('Error:', error);
    },
  });

  // Update attendance record mutation
  const updateRecordMutation = useMutation(
    ({ id, data }) => attendanceAPI.updateAttendanceRecord(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['todayAttendance', selectedDate]);
        queryClient.invalidateQueries(['attendanceRecords', selectedDate]);
        toast.success('Attendance updated successfully!');
      },
      onError: (error) => {
        toast.error('Failed to update attendance');
        console.error('Error:', error);
      },
    }
  );

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'absent':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'late':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'excused':
        return <AlertTriangle className="h-5 w-5 text-blue-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status) => {
    const baseClasses = 'inline-flex px-2 py-1 text-xs font-semibold rounded-full';
    switch (status) {
      case 'present':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'absent':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'late':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'excused':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const handleStatusChange = (recordId, newStatus) => {
    updateRecordMutation.mutate({
      id: recordId,
      data: { status: newStatus },
    });
  };

  const exportAttendance = () => {
    toast.success('Export feature coming soon!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track and manage student attendance records
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowFaceCamera(true)}
            className="btn btn-primary flex items-center"
          >
            <Camera className="h-4 w-4 mr-2" />
            Face Recognition
          </button>
          <button
            onClick={exportAttendance}
            className="btn btn-outline flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="form-label">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="form-input"
            />
          </div>
          <div className="flex-1">
            <label className="form-label">Search Students</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input pl-10"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="form-label">Status Filter</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-input"
            >
              <option value="all">All Status</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
              <option value="excused">Excused</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {todayAttendance && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-md bg-blue-100">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Students</p>
                <p className="text-2xl font-bold text-gray-900">
                  {todayAttendance.total_students}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-md bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Present</p>
                <p className="text-2xl font-bold text-gray-900">
                  {todayAttendance.present_count}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-md bg-red-100">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Absent</p>
                <p className="text-2xl font-bold text-gray-900">
                  {todayAttendance.absent_count}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-md bg-yellow-100">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Late</p>
                <p className="text-2xl font-bold text-gray-900">
                  {todayAttendance.late_count}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-md bg-purple-100">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Attendance %</p>
                <p className="text-2xl font-bold text-gray-900">
                  {todayAttendance.attendance_percentage?.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Records Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Attendance Records - {new Date(selectedDate).toLocaleDateString()}
          </h3>
          <div className="flex items-center space-x-2">
            <div className="text-sm text-gray-500">
              {todayAttendance && (
                <>
                  {todayAttendance.present_count + todayAttendance.late_count + todayAttendance.excused_count} of {todayAttendance.total_students} students present
                </>
              )}
            </div>
          </div>
        </div>

        {recordsLoading ? (
          <div className="flex justify-center py-8">
            <div className="loading-spinner"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Student</th>
                  <th className="table-header-cell">Grade</th>
                  <th className="table-header-cell">Status</th>
                  <th className="table-header-cell">Time</th>
                  <th className="table-header-cell">Recorded By</th>
                  <th className="table-header-cell">Actions</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {attendanceRecords?.results?.map((record) => (
                  <tr key={record.id}>
                    <td className="table-cell">
                      <div className="flex items-center">
                        {getStatusIcon(record.status)}
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">
                            {record.student_name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {record.student_id}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm text-gray-900">
                        Grade {record.grade}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className={getStatusBadge(record.status)}>
                        {record.status}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm text-gray-900">
                        {record.timestamp ? new Date(record.timestamp).toLocaleTimeString() : '-'}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm text-gray-900">
                        {record.recorded_by_name || '-'}
                      </span>
                    </td>
                    <td className="table-cell">
                      <select
                        value={record.status}
                        onChange={(e) => handleStatusChange(record.id, e.target.value)}
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                        disabled={updateRecordMutation.isLoading}
                      >
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                        <option value="late">Late</option>
                        <option value="excused">Excused</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {attendanceRecords?.results?.length === 0 && (
              <div className="text-center py-8">
                <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No attendance records</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No attendance records found for the selected date and filters.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Face Recognition Camera Modal */}
      {showFaceCamera && (
        <FaceRecognitionCamera
          onAttendanceRecorded={(response) => {
            queryClient.invalidateQueries(['todayAttendance']);
            queryClient.invalidateQueries(['attendanceRecords']);
            setShowFaceCamera(false);
          }}
          onClose={() => setShowFaceCamera(false)}
        />
      )}
    </div>
  );
};

export default Attendance;
