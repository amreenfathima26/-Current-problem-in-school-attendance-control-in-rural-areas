import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { attendanceAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import FaceRecognitionCamera from '../components/FaceRecognitionCamera';
import DatasetUpload from '../components/DatasetUpload';
import StudentRegistrationModal from '../components/StudentRegistrationModal';
import {
  Camera,
  Upload,
  Brain,
  CheckCircle,
  AlertCircle,
  Loader,
  Users,
  Image as ImageIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';

const FaceRecognition = () => {
  const { isAdmin, isTeacher } = useAuth();
  const queryClient = useQueryClient();
  const [showCamera, setShowCamera] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [capturedFaceBlob, setCapturedFaceBlob] = useState(null);

  // Fetch model status
  const { data: modelStatus, isLoading: statusLoading, refetch: refetchStatus } = useQuery(
    ['faceModelStatus'],
    () => attendanceAPI.getModelStatus(),
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  // Train model mutation
  const trainModelMutation = useMutation(attendanceAPI.trainModel, {
    onSuccess: (data) => {
      toast.success('Model trained successfully!');
      refetchStatus();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to train model');
    },
  });

  const handleAttendanceRecorded = () => {
    queryClient.invalidateQueries(['todayAttendance']);
    queryClient.invalidateQueries(['attendanceRecords']);
  };

  const handleUploadComplete = () => {
    refetchStatus();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Face Recognition</h1>
          <p className="mt-1 text-sm text-gray-500">
            Automated attendance using facial recognition technology
          </p>
        </div>
        <div className="flex space-x-3">
          {(isAdmin || isTeacher) && (
            <button
              onClick={() => setShowUpload(true)}
              className="btn btn-outline flex items-center"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Dataset
            </button>
          )}
          <button
            onClick={() => setShowCamera(true)}
            className="btn btn-primary flex items-center"
          >
            <Camera className="h-4 w-4 mr-2" />
            Mark Attendance
          </button>
        </div>
      </div>

      {/* Model Status Card */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Model Status</h3>
          {isAdmin && (
            <button
              onClick={() => trainModelMutation.mutate()}
              disabled={trainModelMutation.isLoading || statusLoading}
              className="btn btn-sm btn-outline flex items-center"
            >
              {trainModelMutation.isLoading ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Training...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Train Model
                </>
              )}
            </button>
          )}
        </div>

        {statusLoading ? (
          <div className="flex justify-center py-8">
            <Loader className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${modelStatus?.model_loaded
                  ? 'bg-green-100'
                  : 'bg-gray-200'
                  }`}>
                  <Brain className={`h-6 w-6 ${modelStatus?.model_loaded
                    ? 'text-green-600'
                    : 'text-gray-400'
                    }`} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Model Status</p>
                  <p className="text-lg font-bold text-gray-900">
                    {modelStatus?.model_loaded ? 'Loaded' : 'Not Loaded'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Enrolled Students</p>
                  <p className="text-lg font-bold text-gray-900">
                    {modelStatus?.enrolled_students || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-purple-100">
                  <ImageIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Face Images</p>
                  <p className="text-lg font-bold text-gray-900">
                    {modelStatus?.total_face_images || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-orange-100">
                  <Brain className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Encodings</p>
                  <p className="text-lg font-bold text-gray-900">
                    {modelStatus?.encoding_count || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Latest Model Info */}
        {modelStatus?.latest_model && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-blue-900">
                  Latest Model: {modelStatus.latest_model.version}
                </h4>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">Trained:</span>{' '}
                    <span className="text-blue-900">
                      {new Date(modelStatus.latest_model.training_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-700">Dataset Size:</span>{' '}
                    <span className="text-blue-900">
                      {modelStatus.latest_model.dataset_size}
                    </span>
                  </div>
                  {modelStatus.latest_model.training_duration_seconds && (
                    <div>
                      <span className="text-blue-700">Training Time:</span>{' '}
                      <span className="text-blue-900">
                        {modelStatus.latest_model.training_duration_seconds.toFixed(1)}s
                      </span>
                    </div>
                  )}
                  {modelStatus.latest_model.accuracy && (
                    <div>
                      <span className="text-blue-700">Accuracy:</span>{' '}
                      <span className="text-blue-900">
                        {(modelStatus.latest_model.accuracy * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Warning if model not loaded */}
        {!modelStatus?.model_loaded && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-yellow-900">
                  Model Not Loaded
                </h4>
                <p className="text-sm text-yellow-800 mt-1">
                  Please upload a dataset and train the model to enable face recognition attendance.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Instructions Card */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">How to Use</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                1
              </div>
              <h4 className="font-medium text-gray-900">Upload Dataset</h4>
            </div>
            <p className="text-sm text-gray-600">
              Upload a ZIP file containing student face images. Images should be named with student IDs.
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <div className="h-8 w-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold">
                2
              </div>
              <h4 className="font-medium text-gray-900">Train Model</h4>
            </div>
            <p className="text-sm text-gray-600">
              The model will auto-train after dataset upload. You can also manually retrain anytime.
            </p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <div className="h-8 w-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold">
                3
              </div>
              <h4 className="font-medium text-gray-900">Mark Attendance</h4>
            </div>
            <p className="text-sm text-gray-600">
              Use the camera to capture student faces and automatically mark attendance.
            </p>
          </div>
        </div>
      </div>

      {/* Face Recognition Camera Modal */}
      {showCamera && (
        <FaceRecognitionCamera
          onAttendanceRecorded={handleAttendanceRecorded}
          onClose={() => setShowCamera(false)}
          onRegisterNew={(blob) => {
            setCapturedFaceBlob(blob);
            setShowCamera(false); // Close camera to show registration form
            setShowRegisterModal(true);
          }}
        />
      )}

      {/* Dataset Upload Modal */}
      {showUpload && (
        <DatasetUpload
          onUploadComplete={handleUploadComplete}
          onClose={() => setShowUpload(false)}
        />
      )}

      {/* Student Registration Modal */}
      {showRegisterModal && (
        <StudentRegistrationModal
          imageBlob={capturedFaceBlob}
          onClose={() => setShowRegisterModal(false)}
          onSuccess={() => {
            refetchStatus();
            setShowRegisterModal(false);
            // Optionally reopen camera
            // setShowCamera(true); 
          }}
        />
      )}
    </div>
  );
};

export default FaceRecognition;

