import React from 'react';
import { useQuery } from 'react-query';
import { useAuth } from '../contexts/AuthContext';
import { attendanceAPI } from '../services/api';
import {
  Users,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();

  // Fetch today's attendance data
  const { data: todayAttendance, isLoading: todayLoading } = useQuery(
    ['todayAttendance'],
    () => attendanceAPI.getDailyAttendance(new Date().toISOString().split('T')[0]),
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  // Fetch attendance stats
  const { data: stats, isLoading: statsLoading } = useQuery(
    ['attendanceStats'],
    () => attendanceAPI.getAttendanceStats('week')
  );

  // Fetch recent alerts
  const { data: alerts, isLoading: alertsLoading } = useQuery(
    ['attendanceAlerts'],
    () => attendanceAPI.getAttendanceAlerts()
  );

  const statsCards = user?.role === 'student' ? [
    {
      name: 'Total Days Tracked',
      value: stats?.total_days || 0,
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      name: 'Attendance Rate',
      value: `${stats?.average_attendance?.toFixed(1) || 0}%`,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      name: 'Days Present',
      value: stats?.total_present || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      name: 'Days Absent',
      value: stats?.total_absent || 0,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
  ] : [
    {
      name: 'Total Students',
      value: todayAttendance?.total_students || 0,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      name: 'Present Today',
      value: todayAttendance?.present_count || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      name: 'Absent Today',
      value: todayAttendance?.absent_count || 0,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    {
      name: 'Attendance Rate',
      value: `${todayAttendance?.attendance_percentage?.toFixed(1) || 0}%`,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  const recentAttendance = todayAttendance?.students?.slice(0, 5) || [];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'absent':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'late':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'excused':
        return <AlertTriangle className="h-4 w-4 text-blue-600" />;
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

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-700 p-8 shadow-2xl animate-slide-in">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-blue-100 text-lg">
            Welcome back, <span className="font-semibold text-white">{user?.get_full_name || user?.first_name || user?.username}</span>!
          </p>
          <p className="mt-4 text-sm text-blue-200 bg-white/10 inline-block px-4 py-1.5 rounded-full backdrop-blur-md border border-white/10">
            Current Session: {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-white/10 blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl animate-float"></div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={card.name}
              className="group glass-card relative overflow-hidden rounded-2xl p-6 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/20 border-t border-white/50"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-2xl ${card.bgColor} bg-opacity-50 backdrop-blur-sm shadow-inner group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`h-6 w-6 ${card.color}`} />
                </div>
                {card.name === 'Attendance Rate' && (
                  <div className="text-xs font-bold px-2 py-1 rounded-full bg-green-100 text-green-700 border border-green-200">
                    +2.5%
                  </div>
                )}
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">{card.name}</dt>
                <dd className="mt-1 text-3xl font-bold text-gray-900 bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-700 group-hover:from-blue-600 group-hover:to-indigo-600 transition-all duration-300">
                  {card.value}
                </dd>
              </div>
              {/* Card Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Recent Attendance */}
        <div className="glass-panel rounded-3xl p-6 hover-glow animate-slide-in" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {user?.role === 'student' ? 'Your Recent Attendance' : 'Live Attendance'}
              </h3>
              <p className="text-sm text-gray-500">
                {user?.role === 'student' ? 'Your latest check-in records' : 'Real-time student check-ins'}
              </p>
            </div>
            <div className="p-2 bg-blue-50 rounded-xl">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="space-y-4">
            {todayLoading ? (
              <div className="flex justify-center py-12">
                <div className="loading-spinner h-8 w-8"></div>
              </div>
            ) : recentAttendance.length > 0 ? (
              recentAttendance.map((record, index) => (
                <div
                  key={index}
                  className="group flex items-center justify-between p-4 rounded-2xl bg-white/40 border border-white/40 hover:bg-white hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 transform hover:-translate-x-[-4px]"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center border-2 border-white shadow-sm">
                        <span className="font-bold text-gray-600">{record.student_name.charAt(0)}</span>
                      </div>
                      <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                        {getStatusIcon(record.status)}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {record.student_name}
                      </p>
                      <p className="text-xs font-medium text-gray-500 bg-gray-100/50 px-2 py-0.5 rounded-md inline-block mt-0.5">
                        Grade {record.grade}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`${getStatusBadge(record.status)} shadow-sm`}>
                      {record.status}
                    </span>
                    <p className="text-xs text-gray-400 mt-1 flex items-center justify-end">
                      <Clock className="h-3 w-3 mr-1" />
                      {record.timestamp ? new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                <Users className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No attendance records for today yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Attendance Alerts */}
        <div className="glass-panel rounded-3xl p-6 hover-glow animate-slide-in" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Recent Alerts</h3>
              <p className="text-sm text-gray-500">System notifications & warnings</p>
            </div>
            <div className="p-2 bg-yellow-50 rounded-xl">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
          <div className="space-y-4">
            {alertsLoading ? (
              <div className="flex justify-center py-12">
                <div className="loading-spinner h-8 w-8"></div>
              </div>
            ) : alerts?.length > 0 ? (
              alerts.slice(0, 5).map((alert, index) => (
                <div
                  key={index}
                  className="group flex items-start space-x-4 p-4 rounded-2xl bg-white/40 border border-white/40 hover:bg-white hover:shadow-lg hover:shadow-yellow-500/10 transition-all duration-300"
                >
                  <div className="flex-shrink-0 p-2 bg-yellow-100/80 rounded-xl text-yellow-600 group-hover:scale-110 transition-transform">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900">
                      {alert.student_name}
                    </p>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                      {alert.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-2 flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(alert.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                <CheckCircle className="h-10 w-10 text-green-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">All good! No recent alerts.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats - Bottom Section */}
      {stats && (
        <div className="glass-panel rounded-3xl p-8 bg-gradient-to-br from-white to-blue-50 border-blue-100/50 animate-slide-in" style={{ animationDelay: '400ms' }}>
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
            {user?.role === 'student' ? 'Your Attendance Overview' : 'Weekly Overview'}
          </h3>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="text-center p-4 rounded-2xl hover:bg-white/60 transition-colors duration-300">
              <div className="inline-flex items-center justify-center p-3 rounded-full bg-blue-100 text-blue-600 mb-3 animate-float">
                <TrendingUp className="h-6 w-6" />
              </div>
              <p className="text-3xl font-extrabold text-gray-900">{stats.average_attendance?.toFixed(1)}%</p>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mt-1">Avg Attendance</p>
            </div>
            <div className="text-center p-4 rounded-2xl hover:bg-white/60 transition-colors duration-300">
              <div className="inline-flex items-center justify-center p-3 rounded-full bg-green-100 text-green-600 mb-3 animate-float" style={{ animationDelay: '200ms' }}>
                <CheckCircle className="h-6 w-6" />
              </div>
              <p className="text-3xl font-extrabold text-gray-900">{stats.total_present || 0}</p>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mt-1">Total Present</p>
            </div>
            <div className="text-center p-4 rounded-2xl hover:bg-white/60 transition-colors duration-300">
              <div className="inline-flex items-center justify-center p-3 rounded-full bg-red-100 text-red-600 mb-3 animate-float" style={{ animationDelay: '400ms' }}>
                <XCircle className="h-6 w-6" />
              </div>
              <p className="text-3xl font-extrabold text-gray-900">{stats.total_absent || 0}</p>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mt-1">Total Absent</p>
            </div>
            <div className="text-center p-4 rounded-2xl hover:bg-white/60 transition-colors duration-300">
              <div className="inline-flex items-center justify-center p-3 rounded-full bg-purple-100 text-purple-600 mb-3 animate-float" style={{ animationDelay: '600ms' }}>
                <Calendar className="h-6 w-6" />
              </div>
              <p className="text-3xl font-extrabold text-gray-900">{stats.total_days || 0}</p>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mt-1">Days Tracked</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
