import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Loader, X, Save, User, UserPlus } from 'lucide-react';
import { attendanceAPI } from '../services/api';
import toast from 'react-hot-toast';

const StudentRegistrationModal = ({ imageBlob, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        student_id: '',
        first_name: '',
        last_name: '',
        grade: '',
        gender: 'other',
        parent_email: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [imagePreview, setImagePreview] = useState(null);

    useEffect(() => {
        if (imageBlob) {
            const url = URL.createObjectURL(imageBlob);
            setImagePreview(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [imageBlob]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation logic
        if (activeTab === 'new') {
            if (!formData.student_id || !formData.first_name || !formData.last_name || !formData.grade) {
                toast.error('Please fill in all required fields');
                return;
            }
        } else {
            // Update mode checks
            if (!formData.student_id) {
                toast.error('Please enter the Student ID');
                return;
            }
        }

        setIsSubmitting(true);
        try {
            const response = await attendanceAPI.registerStudentWithFace(formData, imageBlob);
            if (response.success) {
                toast.success('Student registered successfully!');
                if (onSuccess) onSuccess(response);
                onClose();
            }
        } catch (error) {
            const msg = error.response?.data?.error || error.message || 'Registration failed';
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const [activeTab, setActiveTab] = useState('new'); // 'new' or 'update'

    const modalContent = (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center">
                        <UserPlus className="h-6 w-6 mr-2 text-blue-600" />
                        {activeTab === 'new' ? 'Register New Student' : 'Update Existing Face'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b">
                    <button
                        className={`flex-1 py-3 text-sm font-medium ${activeTab === 'new' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('new')}
                    >
                        New Student
                    </button>
                    <button
                        className={`flex-1 py-3 text-sm font-medium ${activeTab === 'update' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('update')}
                    >
                        Update Existing
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="flex justify-center mb-6">
                        {imagePreview ? (
                            <div className="relative">
                                <img
                                    src={imagePreview}
                                    alt="Captured Face"
                                    className="h-32 w-32 object-cover rounded-full border-4 border-blue-100 shadow-md"
                                />
                                <div className="absolute bottom-0 right-0 bg-blue-600 text-white p-1 rounded-full">
                                    <User className="h-4 w-4" />
                                </div>
                            </div>
                        ) : (
                            <div className="h-32 w-32 bg-gray-200 rounded-full flex items-center justify-center">
                                <User className="h-12 w-12 text-gray-400" />
                            </div>
                        )}
                    </div>

                    {activeTab === 'new' ? (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                                    <input
                                        type="text"
                                        name="first_name"
                                        value={formData.first_name}
                                        onChange={handleChange}
                                        className="input input-bordered w-full"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                                    <input
                                        type="text"
                                        name="last_name"
                                        value={formData.last_name}
                                        onChange={handleChange}
                                        className="input input-bordered w-full"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Student ID *</label>
                                <input
                                    type="text"
                                    name="student_id"
                                    value={formData.student_id}
                                    onChange={handleChange}
                                    className="input input-bordered w-full"
                                    placeholder="e.g. STU001"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Grade *</label>
                                    <input
                                        type="text"
                                        name="grade"
                                        value={formData.grade}
                                        onChange={handleChange}
                                        className="input input-bordered w-full"
                                        placeholder="e.g. 10th - A"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                                    <select
                                        name="gender"
                                        value={formData.gender}
                                        onChange={handleChange}
                                        className="select select-bordered w-full"
                                    >
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Parent Email</label>
                                <input
                                    type="email"
                                    name="parent_email"
                                    value={formData.parent_email}
                                    onChange={handleChange}
                                    className="input input-bordered w-full"
                                    placeholder="Optional"
                                />
                            </div>
                        </>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-blue-50 border-1 border-blue-200 p-4 rounded-lg">
                                <p className="text-sm text-blue-800">
                                    Enter the <strong>Student ID</strong> of the existing student.
                                    This will add the new face to their profile and retrain the model.
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Student ID *</label>
                                <input
                                    type="text"
                                    name="student_id"
                                    value={formData.student_id}
                                    onChange={handleChange}
                                    className="input input-bordered w-full text-lg"
                                    placeholder="e.g. STU001"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    <div className="pt-4 flex space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-outline flex-1"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary flex-1 flex items-center justify-center"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    {activeTab === 'new' ? 'Register & Train' : 'Update & Retrain'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default StudentRegistrationModal;
