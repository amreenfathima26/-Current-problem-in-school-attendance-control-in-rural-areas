import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Camera, X, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { attendanceAPI } from '../services/api';
import toast from 'react-hot-toast';

const FaceRecognitionCamera = ({ onAttendanceRecorded, onClose, onRegisterNew }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const cvRef = useRef(null);
  const isCapturingRef = useRef(false);

  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [opencvLoaded, setOpencvLoaded] = useState(false);
  const [autoCaptureEnabled, setAutoCaptureEnabled] = useState(true);
  const faceDetectedTimeRef = useRef(null);
  const lastCaptureTimeRef = useRef(0);
  const lastFaceSeenTimeRef = useRef(0);

  const classifierRef = useRef(null);
  const facesRef = useRef(null);

  // Load OpenCV.js and Haar Cascade
  useEffect(() => {
    const loadOpenCV = async () => {
      // Helper to initialize Utils
      const onOpenCvReady = async () => {
        if (cvRef.current) return; // Already loaded

        // Wait for cv to be fully initialized
        if (!window.cv || !window.cv.Mat) return;

        window.cv['onRuntimeInitialized'] = null; // Clear handler
        const cv = window.cv;
        cvRef.current = cv;

        try {
          // Load Haar Cascade XML
          const response = await fetch('/models/haarcascade_frontalface_default.xml');
          if (!response.ok) {
            console.error("Failed to load Haar Cascade XML");
            return;
          }
          const buffer = await response.arrayBuffer();
          const data = new Uint8Array(buffer);

          // Write to virtual FS
          cv.FS_createDataFile('/', 'haarcascade_frontalface_default.xml', data, true, false, false);

          // Initialize Classifier
          const classifier = new cv.CascadeClassifier();
          classifier.load('haarcascade_frontalface_default.xml');
          classifierRef.current = classifier;

          // Initialize Faces Vector
          facesRef.current = new cv.RectVector();

          setOpencvLoaded(true);
          console.log("OpenCV and Haar Cascade loaded successfully");
        } catch (err) {
          console.error("Error initializing OpenCV/Cascade:", err);
        }
      };

      if (window.cv && window.cv.Mat) {
        await onOpenCvReady();
      } else {
        // Load Script
        if (!document.querySelector('script[src*="opencv"]')) {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/@techstark/opencv-js@4.9.0-release.2/dist/opencv.js';
          script.async = true;
          script.onload = () => {
            if (window.cv.onRuntimeInitialized) {
              window.cv.onRuntimeInitialized = onOpenCvReady;
            } else {
              onOpenCvReady();
            }
          };
          document.body.appendChild(script);
        } else {
          // Already loading/loaded, poll for it
          const checkInterval = setInterval(() => {
            if (window.cv && window.cv.Mat) {
              clearInterval(checkInterval);
              onOpenCvReady();
            }
          }, 100);
          return () => clearInterval(checkInterval);
        }
      }
    };

    loadOpenCV();

    // Cleanup
    return () => {
      if (classifierRef.current && !classifierRef.current.isDeleted()) {
        classifierRef.current.delete();
      }
      if (facesRef.current && !facesRef.current.isDeleted()) {
        facesRef.current.delete();
      }
    };
  }, []);

  // Start camera and setup video
  useEffect(() => {
    let mounted = true;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        });

        if (!mounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.onloadedmetadata = () => {
            if (mounted) {
              setIsCameraReady(true);
              startFaceDetection();
            }
          };
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
        if (mounted) {
          setError('Unable to access camera. Please ensure you have granted camera permissions.');
          toast.error('Camera access denied');
        }
      }
    };

    startCamera();

    return () => {
      mounted = false;
      stopCamera();
      stopFaceDetection();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Face detection using OpenCV.js
  const detectFace = useCallback(() => {
    if (!videoRef.current || !overlayCanvasRef.current || !isCameraReady) {
      return;
    }

    const video = videoRef.current;
    const overlayCanvas = overlayCanvasRef.current;

    if (video.readyState !== video.HAVE_ENOUGH_DATA || video.videoWidth === 0) {
      return;
    }

    try {
      // Draw overlay guide
      const overlayCtx = overlayCanvas.getContext('2d');
      overlayCanvas.width = video.videoWidth;
      overlayCanvas.height = video.videoHeight;

      overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

      const centerX = overlayCanvas.width / 2;
      const centerY = overlayCanvas.height / 2;
      const faceWidth = Math.min(overlayCanvas.width, overlayCanvas.height) * 0.4;
      const faceHeight = faceWidth * 1.2;


      if (opencvLoaded && cvRef.current && classifierRef.current && facesRef.current) {
        const cv = cvRef.current;
        const classifier = classifierRef.current;
        const faces = facesRef.current;

        try {
          // Downscale for performance
          const scale = 0.5;
          const downScaledWidth = Math.floor(video.videoWidth * scale);
          const downScaledHeight = Math.floor(video.videoHeight * scale);

          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = downScaledWidth;
          tempCanvas.height = downScaledHeight;
          const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
          tempCtx.drawImage(video, 0, 0, downScaledWidth, downScaledHeight);

          const src = cv.imread(tempCanvas);
          const gray = new cv.Mat();
          cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

          // Detect faces
          // scaleFactor=1.1, minNeighbors=3, flags=0, minSize=30x30 around
          classifier.detectMultiScale(gray, faces, 1.1, 3, 0);

          if (faces.size() > 0) {
            // Draw faces on overlay
            overlayCtx.strokeStyle = '#10b981';
            overlayCtx.lineWidth = 3;

            for (let i = 0; i < faces.size(); ++i) {
              let face = faces.get(i);
              // Scale back up to display size
              let x = face.x / scale;
              let y = face.y / scale;
              let w = face.width / scale;
              let h = face.height / scale;

              // Draw bracket/box
              overlayCtx.beginPath();
              const bracketLen = Math.min(w, h) * 0.2;

              // Top Left
              overlayCtx.moveTo(x, y + bracketLen);
              overlayCtx.lineTo(x, y);
              overlayCtx.lineTo(x + bracketLen, y);

              // Top Right
              overlayCtx.moveTo(x + w - bracketLen, y);
              overlayCtx.lineTo(x + w, y);
              overlayCtx.lineTo(x + w, y + bracketLen);

              // Bottom Right
              overlayCtx.moveTo(x + w, y + h - bracketLen);
              overlayCtx.lineTo(x + w, y + h);
              overlayCtx.lineTo(x + w - bracketLen, y + h);

              // Bottom Left
              overlayCtx.moveTo(x + bracketLen, y + h);
              overlayCtx.lineTo(x, y + h);
              overlayCtx.lineTo(x, y + h - bracketLen);

              overlayCtx.stroke();
            }

            if (!faceDetected) {
              faceDetectedTimeRef.current = Date.now();
            }
            lastFaceSeenTimeRef.current = Date.now();
            setFaceDetected(true);
          } else {
            // No face found in this frame
            // Persistence check: keep true if seen recently (500ms)
            if (Date.now() - lastFaceSeenTimeRef.current < 500) {
              setFaceDetected(true);
            } else {
              setFaceDetected(false);
            }
          }

          // Cleanup Mat
          src.delete();
          gray.delete();

        } catch (err) {
          console.warn("CV Error:", err);
          // Fallback to simpler check on error or keep trying
          if (Date.now() - lastFaceSeenTimeRef.current < 500) {
            setFaceDetected(true);
          } else {
            setFaceDetected(false);
          }
        }
      } else {
        // Fallback: simple visual guide without OpenCV Haarcascades
        // Try basic face detection using video frame analysis (brightness/contrast)
        try {
          // Create temporary canvas
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = video.videoWidth;
          tempCanvas.height = video.videoHeight;
          const tempCtx = tempCanvas.getContext('2d');
          tempCtx.drawImage(video, 0, 0);

          // Get image data from center region - Broaden it
          const roiX = 0;
          const roiY = 0;
          const roiW = tempCanvas.width;
          const roiH = tempCanvas.height;

          if (roiW > 0 && roiH > 0) {
            const imageData = tempCtx.getImageData(roiX, roiY, roiW, roiH);

            // Calculate brightness
            let sum = 0;
            const data = imageData.data;
            const grayscaleValues = [];
            for (let i = 0; i < data.length; i += 4) {
              const grayVal = (data[i] + data[i + 1] + data[i + 2]) / 3;
              sum += grayVal;
              grayscaleValues.push(grayVal);
            }
            const mean = sum / (data.length / 4);

            let varianceSum = 0;
            for (let i = 0; i < grayscaleValues.length; i++) {
              varianceSum += Math.pow(grayscaleValues[i] - mean, 2);
            }
            const stddev = Math.sqrt(varianceSum / grayscaleValues.length);

            // Simple detection: check for ANY activity
            // If mean > 10, there's light. If stddev > 0, there's an image.
            const detected = mean > 10.0;

            if (detected) {
              setFaceDetected(true);
            } else {
              // Even if not "detected", we'll allow flicker
              if (Date.now() - lastFaceSeenTimeRef.current < 1000) {
                setFaceDetected(true);
              } else {
                setFaceDetected(false);
              }
            }

            if (detected) {
              // Draw green/amber box - indicate "BASIC" detected
              overlayCtx.strokeStyle = '#f59e0b'; // Amber
              overlayCtx.lineWidth = 3;
              overlayCtx.setLineDash([]); // Solid line
              overlayCtx.beginPath();
              overlayCtx.ellipse(centerX, centerY, faceWidth / 2, faceHeight / 2, 0, 0, 2 * Math.PI);
              overlayCtx.stroke();

              // Add text
              overlayCtx.font = "16px sans-serif";
              overlayCtx.fillStyle = "#f59e0b";
              overlayCtx.fillText("Basic Detect", centerX - 40, centerY - faceHeight / 2 - 10);

              if (!faceDetected) faceDetectedTimeRef.current = Date.now();
              lastFaceSeenTimeRef.current = Date.now();
              setFaceDetected(true);
            } else {
              // Draw BLUE guide box (Scanning)
              overlayCtx.strokeStyle = '#3b82f6'; // Blue
              overlayCtx.lineWidth = 2;
              overlayCtx.setLineDash([5, 5]); // Dashed
              overlayCtx.beginPath();
              overlayCtx.ellipse(centerX, centerY, faceWidth / 2, faceHeight / 2, 0, 0, 2 * Math.PI);
              overlayCtx.stroke();

              overlayCtx.font = "14px sans-serif";
              overlayCtx.fillStyle = "#3b82f6";
              overlayCtx.fillText("Scanning...", centerX - 35, centerY - faceHeight / 2 - 10);

              if (Date.now() - lastFaceSeenTimeRef.current < 500) {
                setFaceDetected(true);
              } else {
                setFaceDetected(false);
              }
            }
          }
        } catch (err) {
          if (Date.now() - lastFaceSeenTimeRef.current < 500) {
            setFaceDetected(true);
          } else {
            setFaceDetected(false);
          }
        }
      }
    } catch (err) {
      console.warn('Face detection error:', err);
      // Continue without detection overlay
    }
  }, [isCameraReady, opencvLoaded, faceDetected]);

  const startFaceDetection = useCallback(() => {
    const detect = () => {
      detectFace();
      animationFrameRef.current = requestAnimationFrame(detect);
    };
    detect();
  }, [detectFace]);

  const stopFaceDetection = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const stopCamera = useCallback(() => {
    stopFaceDetection();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stopFaceDetection]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', 0.95);
    });
  }, []);

  const [successMessage, setSuccessMessage] = useState(null);
  const [unknownFaceBlob, setUnknownFaceBlob] = useState(null);
  const lastCapturedIdRef = useRef(null);



  const handleCapture = useCallback(async () => {
    if (isCapturingRef.current) return;

    isCapturingRef.current = true;
    setIsCapturing(true);
    setError(null);
    setResult(null);
    setUnknownFaceBlob(null);

    let imageBlob = null; // Declare outside try block

    try {
      imageBlob = await capturePhoto();
      if (!imageBlob) {
        throw new Error('Failed to capture image');
      }

      setIsProcessing(true);

      // Mark attendance using face recognition
      const response = await attendanceAPI.markAttendanceFace(imageBlob);

      if (response.success) {
        console.log("DEBUG: Attendance success for", response.student_name);
        // ...

        // Check for duplicate capture prevention in short window
        if (lastCapturedIdRef.current === response.student_id) {
          const timeSinceLast = Date.now() - (response.timestamp || Date.now());
          // If marked less than 10 seconds ago, ignore or just show success without api call?
          // Actually API call already made.
          // Just show success.
        }
        lastCapturedIdRef.current = response.student_id;

        // Show success message overlay instead of full result screen
        setSuccessMessage({
          studentName: response.student_name,
          studentId: response.student_id,
        });

        toast.success(`Attendance recorded for ${response.student_name}!`);

        if (onAttendanceRecorded) {
          onAttendanceRecorded(response);
        }

        // Auto-dismiss success message after 2 seconds to continue scanning
        setTimeout(() => {
          setSuccessMessage(null);
          setResult(null); // Ensure we don't switch to result view
        }, 2000);

      } else {
        throw new Error(response.error || 'Face not recognized');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to process face recognition';

      // If face not recognized, offer to register
      if (errorMessage.toLowerCase().includes('not recognized') || errorMessage.toLowerCase().includes('no matching')) {
        setUnknownFaceBlob(imageBlob); // Use the imageBlob captured earlier
      } else {
        toast.error(errorMessage);
      }
    } finally {
      isCapturingRef.current = false;
      setIsCapturing(false);
      setIsProcessing(false);
    }
  }, [capturePhoto, onAttendanceRecorded]);

  const handleRetry = () => {
    setResult(null);
    setError(null);
    setUnknownFaceBlob(null);
  };

  // Auto-capture when face is detected
  // Auto-capture polling
  useEffect(() => {
    let intervalId;

    if (autoCaptureEnabled && !result && !successMessage && !unknownFaceBlob) {
      intervalId = setInterval(() => {
        if (!isProcessing && !isCapturing) {
          const now = Date.now();
          const isFallback = !opencvLoaded || !classifierRef.current;

          // In fallback mode, we attempt capture every 3 seconds if there's any faceDetected (even flickering)
          // In AI mode, we wait for faceDetected to be true
          if ((faceDetected || isFallback) && !isCapturingRef.current) {
            const captureCooldown = isFallback ? 3000 : 800;
            if (now - lastCaptureTimeRef.current > captureCooldown) {
              console.log(`DEBUG: Triggering ${isFallback ? 'Fallback' : 'AI'} Auto-Capture`);
              lastCaptureTimeRef.current = now;
              handleCapture();
            }
          }
        }
      }, 500);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [faceDetected, autoCaptureEnabled, isProcessing, isCapturing, result, successMessage, unknownFaceBlob, handleCapture, opencvLoaded]);

  const handleClose = () => {
    stopCamera();
    if (onClose) {
      onClose();
    }
  };

  // Render modal using Portal to avoid DOM conflicts
  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Face Recognition Attendance</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Camera View */}
        <div className="p-6">
          {/* Always show camera container unless there is a fatal error state requiring manual retry (rare now) */}
          <div className="relative">
            <div className="relative bg-gray-900 rounded-lg overflow-hidden shadow-2xl ring-1 ring-gray-200">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-auto object-cover"
                style={{ display: isCameraReady ? 'block' : 'none', minHeight: '300px' }}
              />
              <canvas
                ref={overlayCanvasRef}
                className="absolute inset-0 pointer-events-none"
                style={{ display: isCameraReady ? 'block' : 'none' }}
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Scanning Animation */}
              {isCameraReady && autoCaptureEnabled && !successMessage && !isProcessing && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <div
                    className="absolute w-full h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-80 shadow-[0_0_20px_rgba(96,165,250,0.8)]"
                    style={{ animation: 'scan 3s cubic-bezier(0.4, 0, 0.2, 1) infinite' }}
                  />
                  <style>{`
                      @keyframes scan {
                        0% { top: 0%; opacity: 0; }
                        10% { opacity: 1; }
                        90% { opacity: 1; }
                        100% { top: 100%; opacity: 0; }
                      }
                    `}</style>
                  {/* Corner accents for tech feel */}
                  <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-blue-400/50 rounded-tl-lg"></div>
                  <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-blue-400/50 rounded-tr-lg"></div>
                  <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-blue-400/50 rounded-bl-lg"></div>
                  <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-blue-400/50 rounded-br-lg"></div>
                </div>
              )}

              {/* Success Overlay */}
              {successMessage && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm z-20 animate-in fade-in zoom-in duration-300">
                  <div className="bg-white p-6 rounded-2xl shadow-2xl transform scale-100 flex flex-col items-center min-w-[200px] border-4 border-green-500">
                    <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-3 ring-4 ring-green-50 animate-bounce">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{successMessage.studentName}</h3>
                    <p className="text-gray-500 font-medium">{successMessage.studentId}</p>
                    <div className="mt-3 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-wide">
                      Attendance Marked
                    </div>
                  </div>
                </div>
              )}

              {/* Unknown Face Overlay */}
              {unknownFaceBlob && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-30 animate-in fade-in zoom-in duration-300">
                  <div className="bg-white p-6 rounded-2xl shadow-2xl transform scale-100 flex flex-col items-center max-w-sm w-full border-4 border-yellow-500">
                    <div className="h-16 w-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4 ring-4 ring-yellow-50">
                      <AlertCircle className="h-8 w-8 text-yellow-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Face Not Recognized</h3>
                    <p className="text-gray-600 text-center mb-6">
                      This person is not in the database.
                    </p>
                    <div className="flex flex-col space-y-3 w-full">
                      <button
                        onClick={() => onRegisterNew && onRegisterNew(unknownFaceBlob)}
                        className="btn btn-primary w-full py-3 text-lg font-bold shadow-lg hover:shadow-xl transition-all"
                      >
                        Register New Student
                      </button>
                      <button
                        onClick={handleRetry}
                        className="btn btn-outline w-full"
                      >
                        Cancel / Try Again
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {!isCameraReady && (
                <div className="flex items-center justify-center h-64 bg-gray-900">
                  <Loader className="h-8 w-8 animate-spin text-blue-500" />
                  <span className="ml-3 text-white font-medium">Initializing camera...</span>
                </div>
              )}

              {/* Debug Overlay */}
              <div className="absolute top-4 left-4 z-10 bg-black/50 text-white text-xs p-2 rounded backdrop-blur-sm font-mono">
                <div>CV: {opencvLoaded ? "READY" : "LOADING..."}</div>
                <div>Mode: {(opencvLoaded && classifierRef.current) ? "AI (HAAR)" : "BASIC (FALLBACK)"}</div>
                <div>Auto: {autoCaptureEnabled ? "ON" : "OFF"}</div>
                <div>Face: {faceDetected ? "YES" : "NO"}</div>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start animate-pulse">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
            )}

            {faceDetected && !successMessage && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between transition-all duration-300 transform translate-y-0 opacity-100">
                <div className="flex items-center">
                  <div className={`h-2.5 w-2.5 rounded-full mr-2 ${autoCaptureEnabled ? 'bg-green-500 animate-ping' : 'bg-green-500'}`}></div>
                  <p className="text-sm font-medium text-green-800">
                    {autoCaptureEnabled
                      ? "Face detected - Auto-capturing..."
                      : "Face detected! Ready to capture."}
                  </p>
                </div>
                <button
                  onClick={() => setAutoCaptureEnabled(!autoCaptureEnabled)}
                  className="text-xs font-semibold text-green-700 hover:text-green-900 bg-green-200 px-2 py-1 rounded transition-colors"
                >
                  {autoCaptureEnabled ? "Disable Auto" : "Enable Auto"}
                </button>
              </div>
            )}

            <div className="mt-6 flex justify-center space-x-4">
              <button
                onClick={handleCapture}
                disabled={isProcessing || !isCameraReady}
                className={`btn btn-primary flex items-center shadow-lg transition-transform active:scale-95 ${isProcessing || !isCameraReady ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-0.5'
                  }`}
              >
                {isProcessing ? (
                  <>
                    <Loader className="h-5 w-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Camera className="h-5 w-5 mr-2" />
                    Manual Capture
                  </>
                )}
              </button>
            </div>

            <div className="mt-4 text-center">
              <p className="text-sm text-gray-500">
                {autoCaptureEnabled ? 'Position face in frame for automatic attendance' : 'Position your face and click capture'}
              </p>
              {opencvLoaded && (
                <p className="text-xs text-green-600 mt-1 font-medium flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></div>
                  AI Detection Active
                </p>
              )}
            </div>
          </div>

          {/* Result Display logic removed here as we use overlay now, 
              but error state might still use it if we want persistent error. 
              Currently treating errors as toasts to keep flow moving. 
          */}
        </div>
      </div>
    </div>
  );

  // Use Portal to render modal outside main DOM tree
  return createPortal(modalContent, document.body);
};

export default FaceRecognitionCamera;
