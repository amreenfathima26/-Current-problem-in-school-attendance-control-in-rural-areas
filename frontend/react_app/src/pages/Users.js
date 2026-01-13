import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usersManagementAPI } from '../services/api';
import {
    Users as UsersIcon,
    UserPlus,
    Trash2,
    Edit,
    Key,
    CheckCircle,
    XCircle,
    Search,
    MoreVertical
} from 'lucide-react';
import toast from 'react-hot-toast';

const Users = () => {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    // Form States
    const [newUser, setNewUser] = useState({ username: '', email: '', password: '', role: 'student', first_name: '', last_name: '' });
    const [newPassword, setNewPassword] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const data = await usersManagementAPI.getAllUsers();
            if (Array.isArray(data)) {
                setUsers(data);
            } else if (data && Array.isArray(data.results)) {
                setUsers(data.results);
            } else {
                console.error('Unexpected user data format:', data);
                setUsers([]);
            }
        } catch (error) {
            toast.error('Failed to load users');
            console.error(error);
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            await usersManagementAPI.createUser(newUser);
            toast.success('User created successfully');
            setShowAddModal(false);
            setNewUser({ username: '', email: '', password: '', role: 'student', first_name: '', last_name: '' });
            fetchUsers();
        } catch (error) {
            toast.error('Failed to create user');
            console.error(error);
        }
    };

    const toggleStatus = async (userId) => {
        try {
            await usersManagementAPI.toggleUserStatus(userId);
            toast.success('User status updated');
            fetchUsers(); // Refresh to show new status
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const handleDelete = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;
        try {
            await usersManagementAPI.deleteUser(userId);
            toast.success('User deleted');
            setUsers(users.filter(u => u.id !== userId));
        } catch (error) {
            toast.error('Failed to delete user');
        }
    };

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        try {
            await usersManagementAPI.resetUserPassword(selectedUser.id, newPassword);
            toast.success('Password updated');
            setShowPasswordModal(false);
            setNewPassword('');
            setSelectedUser(null);
        } catch (error) {
            toast.error('Failed to reset password');
        }
    };

    return (
        <>
            <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                            User Management
                        </h1>
                        <p className="text-gray-500 mt-1">Manage system access and roles</p>
                    </div>

                    <button
                        onClick={() => setShowAddModal(true)}
                        className="btn btn-primary flex items-center gap-2 hover-glow"
                    >
                        <UserPlus size={20} />
                        <span>Add User</span>
                    </button>
                </div>

                {/* Users Table */}
                <div className="card overflow-hidden border-0">
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead className="table-header">
                                <tr>
                                    <th className="table-header-cell">User</th>
                                    <th className="table-header-cell">Role</th>
                                    <th className="table-header-cell">Status</th>
                                    <th className="table-header-cell">Last Login</th>
                                    <th className="table-header-cell text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="table-body">
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-8 text-center">
                                            <div className="flex justify-center"><div className="loading-spinner"></div></div>
                                        </td>
                                    </tr>
                                ) : (Array.isArray(users) ? users : []).map((u) => (
                                    <tr key={u.id} className="group hover:bg-blue-50/10 transition-colors">
                                        <td className="table-cell">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold shadow-md">
                                                    {u.username[0].toUpperCase()}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="font-medium text-gray-900 dark:text-gray-100">{u.first_name} {u.last_name || u.username}</div>
                                                    <div className="text-gray-500 dark:text-gray-400 text-xs">{u.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="table-cell">
                                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold
                        ${u.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                                                    u.role === 'teacher' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-green-100 text-green-800'}`}>
                                                {u.role ? u.role.toUpperCase() : 'USER'}
                                            </span>
                                        </td>
                                        <td className="table-cell">
                                            <button
                                                onClick={() => toggleStatus(u.id)}
                                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-all hover:scale-105 active:scale-95
                        ${u.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                                            >
                                                {u.is_active ? <CheckCircle size={12} className="mr-1" /> : <XCircle size={12} className="mr-1" />}
                                                {u.is_active ? 'Active' : 'Inactive'}
                                            </button>
                                        </td>
                                        <td className="table-cell text-gray-500">
                                            {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}
                                        </td>
                                        <td className="table-cell text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => { setSelectedUser(u); setShowPasswordModal(true); }}
                                                    className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                                                    title="Reset Password"
                                                >
                                                    <Key size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(u.id)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete User"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Add User Modal */}
            {
                showAddModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scale-in">
                            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Add New User</h2>
                            <form onSubmit={handleCreateUser} className="space-y-4">
                                <div>
                                    <label className="form-label">Username</label>
                                    <input required className="form-input" value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} />
                                </div>
                                <div>
                                    <label className="form-label">Email</label>
                                    <input required type="email" className="form-input" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="form-label">First Name</label>
                                        <input className="form-input" value={newUser.first_name} onChange={e => setNewUser({ ...newUser, first_name: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="form-label">Last Name</label>
                                        <input className="form-input" value={newUser.last_name} onChange={e => setNewUser({ ...newUser, last_name: e.target.value })} />
                                    </div>
                                </div>
                                <div>
                                    <label className="form-label">Role</label>
                                    <select className="form-input" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                                        <option value="student">Student</option>
                                        <option value="teacher">Teacher</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label">Password</label>
                                    <input required type="password" className="form-input" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
                                </div>
                                <div className="flex justify-end gap-3 mt-6">
                                    <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">Cancel</button>
                                    <button type="submit" className="btn btn-primary">Create User</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Password Reset Modal */}
            {
                showPasswordModal && selectedUser && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scale-in">
                            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Reset Password for {selectedUser.username}</h2>
                            <form onSubmit={handlePasswordReset} className="space-y-4">
                                <div>
                                    <label className="form-label">New Password</label>
                                    <input
                                        required
                                        type="password"
                                        className="form-input"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        placeholder="Enter new password"
                                        minLength={6}
                                    />
                                </div>
                                <div className="flex justify-end gap-3 mt-6">
                                    <button type="button" onClick={() => { setShowPasswordModal(false); setSelectedUser(null); }} className="btn btn-secondary">Cancel</button>
                                    <button type="submit" className="btn btn-primary">Update Password</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </>
    );
};

export default Users;
