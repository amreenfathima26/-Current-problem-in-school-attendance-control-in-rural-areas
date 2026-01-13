import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { studentsAPI, rfidAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  CreditCard,
  Eye,
  Filter,
  Upload,
} from 'lucide-react';
import toast from 'react-hot-toast';

const Students = () => {
  const { user, isAdmin, isTeacher } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showRFIDModal, setShowRFIDModal] = useState(false);
  const fileInputRef = React.useRef(null);

  // Fetch students
  const { data: students, isLoading } = useQuery(
    ['students', searchTerm, gradeFilter],
    () => studentsAPI.getStudents({
      search: searchTerm,
      grade: gradeFilter !== 'all' ? gradeFilter : undefined,
    }),
    {
      enabled: isAdmin || isTeacher,
    }
  );

  // Delete student mutation
  const deleteStudentMutation = useMutation(studentsAPI.deleteStudent, {
    onSuccess: () => {
      queryClient.invalidateQueries(['students']);
      toast.success('Student deleted successfully!');
    },
    onError: (error) => {
      toast.error('Failed to delete student');
      console.error('Error:', error);
    },
  });

  // Delete RFID card mutation
  const deleteRFIDMutation = useMutation(rfidAPI.deleteRFIDCard, {
    onSuccess: () => {
      queryClient.invalidateQueries(['students']);
      queryClient.invalidateQueries(['rfidCards']);
      toast.success('RFID card deleted successfully!');
    },
    onError: (error) => {
      toast.error('Failed to delete RFID card');
      console.error('Error:', error);
    },
  });

  const handleDeleteStudent = (studentId) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      deleteStudentMutation.mutate(studentId);
    }
  };

  const handleDeleteRFIDCard = (cardId) => {
    if (window.confirm('Are you sure you want to delete this RFID card?')) {
      deleteRFIDMutation.mutate(cardId);
    }
  };

  const openStudentModal = (student = null) => {
    setSelectedStudent(student);
    setShowModal(true);
  };

  const openRFIDModal = (student) => {
    setSelectedStudent(student);
    setShowRFIDModal(true);
  };

  const getGradeOptions = () => {
    const grades = [];
    for (let i = 1; i <= 12; i++) {
      grades.push(
        <option key={i} value={i.toString()}>
          Grade {i}
        </option>
      );
    }
    return grades;
  };

  const handleBulkImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const toastId = toast.loading('Importing students...');
    try {
      const result = await studentsAPI.bulkImportStudents(file);
      if (result.status === 'success') {
        toast.success(`Imported ${result.imported} students successfully`, { id: toastId });
        if (result.errors && result.errors.length > 0) {
          // Show errors in console or alert
          console.error("Import Errors:", result.errors);
          toast.error(`Imported with ${result.errors.length} errors. Check console.`, { duration: 5000 });
        }
        queryClient.invalidateQueries(['students']);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Import failed', { id: toastId });
    } finally {
      e.target.value = null; // Reset input
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage students and their RFID cards
          </p>
        </div>
        {(isAdmin || isTeacher) && (
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".csv, .xlsx, .xls"
              onChange={handleBulkImport}
            />
            <button
              onClick={() => fileInputRef.current.click()}
              className="btn btn-outline flex items-center bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </button>
            <button
              onClick={() => openStudentModal()}
              className="btn btn-primary flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Student
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="form-label">Search Students</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or student ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input pl-10"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="form-label">Filter by Grade</label>
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="form-input"
            >
              <option value="all">All Grades</option>
              {getGradeOptions()}
            </select>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Students ({students?.count || 0})
          </h3>
        </div>

        {isLoading ? (
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
                  <th className="table-header-cell">Parent Contact</th>
                  <th className="table-header-cell">RFID Cards</th>
                  <th className="table-header-cell">Status</th>
                  {(isAdmin || isTeacher) && (
                    <th className="table-header-cell">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="table-body">
                {students?.results?.map((student) => (
                  <tr key={student.id}>
                    <td className="table-cell">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">
                              {student.full_name?.charAt(0) || student.user?.first_name?.charAt(0) || 'S'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-900">
                            {student.full_name || `${student.user?.first_name} ${student.user?.last_name}`}
                          </p>
                          <p className="text-sm text-gray-500">
                            {student.student_id}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm text-gray-900">
                        Grade {student.grade}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div>
                        <p className="text-sm text-gray-900">
                          {student.parent_contact || '-'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {student.parent_email || '-'}
                        </p>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="space-y-1">
                        {student.rfid_cards?.map((card) => (
                          <div key={card.id} className="flex items-center space-x-2">
                            <CreditCard className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-900">{card.card_id}</span>
                            <span className={`text-xs px-2 py-1 rounded-full ${card.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                              }`}>
                              {card.status}
                            </span>
                          </div>
                        ))}
                        {(!student.rfid_cards || student.rfid_cards.length === 0) && (
                          <span className="text-sm text-gray-500">No cards assigned</span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${student.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                        }`}>
                        {student.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {(isAdmin || isTeacher) && (
                      <td className="table-cell">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openStudentModal(student)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit student"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openRFIDModal(student)}
                            className="text-green-600 hover:text-green-900"
                            title="Manage RFID cards"
                          >
                            <CreditCard className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(student.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete student"
                            disabled={deleteStudentMutation.isLoading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {students?.results?.length === 0 && (
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No students found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No students match your current search criteria.
                </p>
                {(isAdmin || isTeacher) && (
                  <div className="mt-6">
                    <button
                      onClick={() => openStudentModal()}
                      className="btn btn-primary"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Student
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Student Modal */}
      {showModal && (
        <StudentModal
          student={selectedStudent}
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false);
            queryClient.invalidateQueries(['students']);
          }}
        />
      )}

      {/* RFID Modal */}
      {showRFIDModal && (
        <RFIDModal
          student={selectedStudent}
          onClose={() => setShowRFIDModal(false)}
          onSave={() => {
            setShowRFIDModal(false);
            queryClient.invalidateQueries(['students']);
          }}
        />
      )}
    </div>
  );
};

// Student Modal Component
const StudentModal = ({ student, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    student_id: student?.student_id || '',
    grade: student?.grade || '',
    parent_contact: student?.parent_contact || '',
    parent_email: student?.parent_email || '',
    date_of_birth: student?.date_of_birth || '',
    address: student?.address || '',
    user: {
      username: student?.user?.username || '',
      email: student?.user?.email || '',
      first_name: student?.user?.first_name || '',
      last_name: student?.user?.last_name || '',
      phone_number: student?.user?.phone_number || '',
    }
  });

  const queryClient = useQueryClient();
  const isEditing = !!student;

  const createMutation = useMutation(studentsAPI.createStudent, {
    onSuccess: () => {
      toast.success('Student created successfully!');
      onSave();
    },
    onError: (error) => {
      toast.error('Failed to create student');
      console.error('Error:', error);
    },
  });

  const updateMutation = useMutation(
    (data) => studentsAPI.updateStudent(student.id, data),
    {
      onSuccess: () => {
        toast.success('Student updated successfully!');
        onSave();
      },
      onError: (error) => {
        toast.error('Failed to update student');
        console.error('Error:', error);
      },
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();

    if (isEditing) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('user.')) {
      setFormData({
        ...formData,
        user: {
          ...formData.user,
          [name.split('.')[1]]: value,
        },
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {isEditing ? 'Edit Student' : 'Add New Student'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">First Name</label>
                <input
                  type="text"
                  name="user.first_name"
                  value={formData.user.first_name}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="form-label">Last Name</label>
                <input
                  type="text"
                  name="user.last_name"
                  value={formData.user.last_name}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>
            </div>

            <div>
              <label className="form-label">Student ID</label>
              <input
                type="text"
                name="student_id"
                value={formData.student_id}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            <div>
              <label className="form-label">Grade</label>
              <select
                name="grade"
                value={formData.grade}
                onChange={handleChange}
                className="form-input"
                required
              >
                <option value="">Select Grade</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={(i + 1).toString()}>
                    Grade {i + 1}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Parent Contact</label>
              <input
                type="tel"
                name="parent_contact"
                value={formData.parent_contact}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">Parent Email</label>
              <input
                type="email"
                name="parent_email"
                value={formData.parent_email}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={createMutation.isLoading || updateMutation.isLoading}
              >
                {isEditing ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// RFID Modal Component
const RFIDModal = ({ student, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    card_id: '',
    status: 'active',
    notes: '',
  });

  const queryClient = useQueryClient();

  const createMutation = useMutation(rfidAPI.createRFIDCard, {
    onSuccess: () => {
      toast.success('RFID card created successfully!');
      onSave();
    },
    onError: (error) => {
      toast.error('Failed to create RFID card');
      console.error('Error:', error);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      student: student.id,
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Add RFID Card for {student?.full_name}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Card ID</label>
              <input
                type="text"
                name="card_id"
                value={formData.card_id}
                onChange={(e) => setFormData({ ...formData, card_id: e.target.value })}
                className="form-input"
                placeholder="e.g., RFID001"
                required
              />
            </div>

            <div>
              <label className="form-label">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="form-input"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="lost">Lost</option>
                <option value="damaged">Damaged</option>
              </select>
            </div>

            <div>
              <label className="form-label">Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="form-input"
                rows="3"
                placeholder="Optional notes about this card..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={createMutation.isLoading}
              >
                Create Card
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Students;
