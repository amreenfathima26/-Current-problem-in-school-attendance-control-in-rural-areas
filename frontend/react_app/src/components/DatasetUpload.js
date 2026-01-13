import React, { useState, useEffect } from 'react';
import { Upload, Loader, CheckCircle, AlertCircle, X, FileArchive, Users } from 'lucide-react';
import { attendanceAPI } from '../services/api';
import toast from 'react-hot-toast';

const DatasetUpload = ({ onUploadComplete, onClose }) => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingMessage, setProcessingMessage] = useState('Processing Dataset...');
  const [result, setResult] = useState(null);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [loadingEnrolled, setLoadingEnrolled] = useState(false);
  const [showEnrolledList, setShowEnrolledList] = useState(false);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.name.endsWith('.zip')) {
        setFile(selectedFile);
        setResult(null);
      } else {
        toast.error('Please select a ZIP file');
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a ZIP file');
      return;
    }

    // Generate simple task ID
    const taskId = Date.now().toString(36) + Math.random().toString(36).substr(2);

    setIsUploading(true);
    setUploadProgress(0);
    setProcessingMessage('Uploading...');
    setResult(null);

    let progressInterval;

    try {
      // Start polling for server-side progress immediately (server handles missing task_id gracefully)
      progressInterval = setInterval(async () => {
        try {
          const status = await attendanceAPI.getUploadProgress(taskId);
          if (status && status.percent !== undefined) {
            // If we get valid progress from server, update UI
            // Prioritize server progress over file upload progress once extraction starts
            if (status.percent > 0) {
              setUploadProgress(status.percent);
            }
            if (status.message) {
              setProcessingMessage(status.message);
            }
          }
        } catch (e) {
          // Ignore polling errors
        }
      }, 500);

      const response = await attendanceAPI.uploadDataset(file, taskId, (percent) => {
        // Only update UI from upload progress if we haven't started server processing
        // This prevents the bar from jumping back to 100% (upload) if server says 5% (processing)
        // But here we setUploadProgress.
        // Let's say: If percent < 100, show upload progress.
        // If percent === 100, we rely on polling.
        if (percent < 100) {
          setUploadProgress(percent);
          setProcessingMessage('Uploading...');
        }
      });

      setResult({
        success: true,
        ...response,
      });

      toast.success('Dataset uploaded and processed successfully!');

      if (response.auto_training?.triggered && response.auto_training?.success) {
        toast.success('Model auto-trained successfully!');
      }

      if (onUploadComplete) {
        onUploadComplete(response);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Upload failed';
      setResult({
        success: false,
        error: errorMessage,
      });
      toast.error(errorMessage);
    } finally {
      clearInterval(progressInterval);
      setIsUploading(false);
      setUploadProgress(100);
      setProcessingMessage('Complete');
    }
  };

  const handleTrainModel = async () => {
    setIsUploading(true);
    try {
      const response = await attendanceAPI.trainModel();
      toast.success('Model trained successfully!');
      setResult({
        ...result,
        training: response,
      });
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Training failed';
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  const loadEnrolledStudents = async () => {
    setLoadingEnrolled(true);
    try {
      const response = await attendanceAPI.getEnrolledStudents();
      if (response.success) {
        setEnrolledStudents(response.students || []);
      }
    } catch (error) {
      console.error('Error loading enrolled students:', error);
    } finally {
      setLoadingEnrolled(false);
    }
  };

  useEffect(() => {
    loadEnrolledStudents();
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Upload Dataset</h2>
            <p className="text-sm text-gray-500 mt-1">
              Upload a ZIP file containing student face images
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {!result && (
            <>
              {/* File Upload Area */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                <FileArchive className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <label className="cursor-pointer">
                  <span className="text-sm font-medium text-blue-600 hover:text-blue-700">
                    Click to select ZIP file
                  </span>
                  <input
                    type="file"
                    accept=".zip"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
                <p className="text-sm text-gray-500 mt-2">
                  or drag and drop
                </p>
                {file && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-900">
                      Selected: {file.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">
                  Dataset Format Instructions:
                </h4>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Create a ZIP file containing student face images</li>
                  <li>Name images with student IDs: <code className="bg-blue-100 px-1 rounded">STU001.jpg</code>, <code className="bg-blue-100 px-1 rounded">STU002.jpg</code>, etc.</li>
                  <li>Each image should contain only one clear face</li>
                  <li>Multiple images per student are supported</li>
                  <li>Supported formats: JPG, PNG, JPEG</li>
                </ul>
              </div>

              {/* Progress Bar */}
              {isUploading && (
                <div className="mb-4">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-blue-700">
                      {uploadProgress < 100 ? 'Uploading...' : processingMessage}
                    </span>
                    <span className="text-sm font-medium text-blue-700">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  {uploadProgress === 100 && (
                    <p className="text-xs text-gray-500 mt-1 text-center animate-pulse">
                      {processingMessage === 'Processing Dataset...' ? 'This may take a moment. Please wait...' : processingMessage}
                    </p>
                  )}
                </div>
              )}

              {/* Upload Button */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleClose}
                  className="btn btn-outline"
                  disabled={isUploading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!file || isUploading}
                  className="btn btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? (
                    <>
                      <Loader className="h-4 w-4 mr-2 animate-spin" />
                      {uploadProgress < 100 ? 'Uploading...' : 'Processing...'}
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Dataset
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {/* Result Display */}
          {result && (
            <div className="space-y-4">
              {result.success ? (
                <>
                  <div className="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-green-900">
                        Dataset processed successfully!
                      </h3>
                      <p className="text-sm text-green-700 mt-1">
                        {result.message}
                      </p>
                    </div>
                  </div>

                  {/* Statistics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500">Total Images</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {result.total_images || 0}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500">Valid Images</p>
                      <p className="text-2xl font-bold text-green-600 mt-1">
                        {result.valid_images || 0}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500">Mapped Students</p>
                      <p className="text-2xl font-bold text-blue-600 mt-1">
                        {result.mapped_students || 0}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500">Unmapped</p>
                      <p className="text-2xl font-bold text-orange-600 mt-1">
                        {result.unmapped_students || 0}
                      </p>
                    </div>
                  </div>

                  {/* Auto Training Status */}
                  {result.auto_training && (
                    <div className={`p-4 border rounded-lg ${result.auto_training.success
                      ? 'bg-green-50 border-green-200'
                      : 'bg-yellow-50 border-yellow-200'
                      }`}>
                      <div className="flex items-center space-x-2">
                        {result.auto_training.success ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-yellow-600" />
                        )}
                        <p className="text-sm font-medium">
                          {result.auto_training.success
                            ? `Model auto-trained with ${result.auto_training.processed} images`
                            : 'Auto-training skipped or failed. Train model manually.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Mapped Students List */}
                  {result.mapped_students > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-blue-900">
                          Successfully Mapped Students ({result.mapped_students})
                        </h4>
                        <button
                          onClick={() => setShowEnrolledList(!showEnrolledList)}
                          className="text-xs text-blue-700 hover:text-blue-900 underline"
                        >
                          {showEnrolledList ? 'Hide List' : 'Show All Enrolled Students'}
                        </button>
                      </div>
                      <p className="text-sm text-blue-800 mb-2">
                        These students have been successfully enrolled in the face recognition system.
                      </p>
                    </div>
                  )}

                  {/* Unmapped Students Warning */}
                  {result.unmapped_students > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-yellow-900 mb-2">
                        Unmapped Students ({result.unmapped_students})
                      </h4>
                      <p className="text-sm text-yellow-800">
                        Some student IDs from filenames were not found in the database.
                        Please ensure students are registered before uploading images.
                      </p>
                    </div>
                  )}

                  {/* Enrolled Students List */}
                  {showEnrolledList && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                      <div className="flex items-center space-x-2 mb-3">
                        <Users className="h-5 w-5 text-gray-600" />
                        <h4 className="text-sm font-medium text-gray-900">
                          All Enrolled Students ({enrolledStudents.length})
                        </h4>
                      </div>
                      {loadingEnrolled ? (
                        <div className="flex justify-center py-4">
                          <Loader className="h-5 w-5 animate-spin text-gray-400" />
                        </div>
                      ) : enrolledStudents.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {enrolledStudents.map((student) => (
                            <div key={student.id} className="bg-white rounded p-2 border border-gray-200">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {student.full_name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    ID: {student.student_id} | Grade: {student.grade}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-blue-600 font-medium">
                                    {student.face_images_count} images
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-4">
                          No students enrolled yet. Upload a dataset to enroll students.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    {(!result.auto_training?.success) && (
                      <button
                        onClick={handleTrainModel}
                        disabled={isUploading}
                        className="btn btn-outline flex items-center"
                      >
                        {isUploading ? (
                          <>
                            <Loader className="h-4 w-4 mr-2 animate-spin" />
                            Training...
                          </>
                        ) : (
                          'Train Model Now'
                        )}
                      </button>
                    )}
                    <button
                      onClick={handleClose}
                      className="btn btn-primary"
                    >
                      Done
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-red-900">
                        Upload Failed
                      </h3>
                      <p className="text-sm text-red-700 mt-1">
                        {result.error}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      onClick={() => setResult(null)}
                      className="btn btn-outline"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={handleClose}
                      className="btn btn-primary"
                    >
                      Close
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DatasetUpload;

