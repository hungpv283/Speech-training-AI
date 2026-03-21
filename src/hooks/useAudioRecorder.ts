import { useState, useRef, useEffect } from "react";

interface UseAudioRecorderReturn {
  isRecording: boolean;
  recordingTime: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  mediaStream: MediaStream | null;
  lastError: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  resetRecording: () => void;
}

// Helper function to detect mobile devices
const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || 
  (window.matchMedia && window.matchMedia("(max-width: 768px)").matches);
};

// Helper function to find supported audio MIME type
const getSupportedMimeType = (): string | null => {
  const MediaRecorder = (window as any).MediaRecorder;
  if (!MediaRecorder || !MediaRecorder.isTypeSupported) {
    return null;
  }

  // Check for mobile-friendly formats first
  const types = [
    "audio/mp4", // iOS Safari
    "audio/aac", // iOS Safari alternative
    "audio/mpeg", // Some mobile browsers
    "audio/webm;codecs=opus", // Android Chrome
    "audio/webm", // Fallback webm
    "audio/ogg;codecs=opus", // Firefox
  ];

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return null;
};

export const useAudioRecorder = (): UseAudioRecorderReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recorderRef = useRef<any | null>(null); // fallback recorder (RecordRTC) for iOS/Safari
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mimeTypeRef = useRef<string>("audio/webm"); // Store the MIME type used

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      // Request microphone access with better error handling for mobile
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      streamRef.current = stream;
      setMediaStream(stream);
      setLastError(null);
      
      const isMobile = isMobileDevice();
      const supportedMimeType = getSupportedMimeType();
      
      // For mobile devices, prefer RecordRTC as it's more reliable
      // Also use RecordRTC if no supported MIME type is found
      let shouldUseRecordRTC = isMobile || !supportedMimeType || 
        (typeof (window as any).MediaRecorder === "undefined");

      if (!shouldUseRecordRTC && supportedMimeType) {
        // Use native MediaRecorder with detected MIME type
        try {
          mimeTypeRef.current = supportedMimeType;
          const mediaRecorder = new MediaRecorder(stream, {
            mimeType: supportedMimeType,
          });
          mediaRecorderRef.current = mediaRecorder;
          audioChunksRef.current = [];

          mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
              audioChunksRef.current.push(event.data);
            }
          };

          mediaRecorder.onerror = (event) => {
            console.error("MediaRecorder error:", event);
            setLastError("Lỗi khi ghi âm. Vui lòng thử lại.");
          };

          mediaRecorder.onstop = () => {
            const mimeType = mimeTypeRef.current || "audio/webm";
            const audioBlob = new Blob(audioChunksRef.current, {
              type: mimeType,
            });
            setAudioBlob(audioBlob);
            const url = URL.createObjectURL(audioBlob);
            setAudioUrl(url);

            // Stop all tracks
            stream.getTracks().forEach((track) => track.stop());
            setMediaStream(null);
            streamRef.current = null;
            mediaRecorderRef.current = null;
          };

          mediaRecorder.start(100); // Collect data every 100ms for better mobile support
          setIsRecording(true);
          setRecordingTime(0);
        } catch (nativeError) {
          console.warn("Native MediaRecorder failed, falling back to RecordRTC:", nativeError);
          // Fall through to RecordRTC fallback
          shouldUseRecordRTC = true;
        }
      }

      // Use RecordRTC fallback for mobile or if native MediaRecorder failed
      if (shouldUseRecordRTC || !mediaRecorderRef.current) {
        try {
          const mod = await import("recordrtc");
          const RecordRTC = (mod && (mod as any).default) || mod;
          
          // Use StereoAudioRecorder for better mobile compatibility
          const recorder = new (RecordRTC as any)(stream, {
            type: "audio",
            mimeType: "audio/wav",
            recorderType: (RecordRTC as any).StereoAudioRecorder,
            numberOfAudioChannels: 1, // Mono for smaller file size
            sampleRate: 44100,
            bufferSize: 4096,
            timeSlice: 100, // Record in chunks
          });
          
          recorderRef.current = recorder;
          audioChunksRef.current = [];

          recorder.startRecording();
          setIsRecording(true);
          setRecordingTime(0);
          mimeTypeRef.current = "audio/wav";
        } catch (e) {
          console.error("RecordRTC failed to load:", e);
          const errorMsg = isMobile 
            ? "Không thể khởi động ghi âm trên thiết bị di động. Vui lòng thử lại hoặc sử dụng trình duyệt khác."
            : (e instanceof Error ? e.message : "Không thể khởi động ghi âm");
          setLastError(errorMsg);
          // If fallback import fails, stop tracks and rethrow so UI can show error
          stream.getTracks().forEach((track) => track.stop());
          setMediaStream(null);
          streamRef.current = null;
          throw new Error(errorMsg);
        }
      }

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      let errorMessage = "Không thể truy cập micro. ";
      
      if (error instanceof Error) {
        if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
          errorMessage += "Vui lòng cho phép quyền truy cập micro và thử lại.";
        } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
          errorMessage += "Không tìm thấy micro. Vui lòng kiểm tra thiết bị của bạn.";
        } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
          errorMessage += "Micro đang được sử dụng bởi ứng dụng khác.";
        } else {
          errorMessage += error.message;
        }
      } else {
        errorMessage += "Vui lòng thử lại.";
      }
      
      setLastError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;

    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // If using native MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error("Error stopping MediaRecorder:", e);
      }
      mediaRecorderRef.current = null;
      return;
    }

    // If using fallback recorder (RecordRTC)
    if (recorderRef.current) {
      try {
        const recorder = recorderRef.current;
        recorder.stopRecording(() => {
          try {
            const audioBlob = recorder.getBlob();
            if (audioBlob && audioBlob.size > 0) {
              setAudioBlob(audioBlob);
              const url = URL.createObjectURL(audioBlob);
              setAudioUrl(url);
            } else {
              setLastError("Bản ghi âm trống. Vui lòng thử lại.");
            }
          } catch (blobError) {
            console.error("Error getting blob from RecordRTC:", blobError);
            setLastError("Không thể lưu bản ghi âm. Vui lòng thử lại.");
          }

          // Stop all tracks
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
          }
          setMediaStream(null);
          streamRef.current = null;
          recorderRef.current = null;
        });
      } catch (e) {
        console.error("Error stopping fallback recorder:", e);
        setLastError("Lỗi khi dừng ghi âm. Vui lòng thử lại.");
        // Clean up tracks even if stop failed
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }
        setMediaStream(null);
        streamRef.current = null;
        recorderRef.current = null;
      }
      return;
    }
  };

  const resetRecording = () => {
    // Stop recording if active
    if (isRecording) {
      stopRecording();
    }
    
    // Clean up media recorder
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
      } catch (e) {
        // Ignore errors during cleanup
      }
      mediaRecorderRef.current = null;
    }
    
    // Clean up RecordRTC recorder
    if (recorderRef.current) {
      try {
        recorderRef.current.destroy();
      } catch (e) {
        // Ignore errors during cleanup
      }
      recorderRef.current = null;
    }
    
    // Clean up audio URL
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    
    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    
    // Reset state
    setAudioBlob(null);
    setMediaStream(null);
    setRecordingTime(0);
    setIsRecording(false);
    audioChunksRef.current = [];
    mimeTypeRef.current = "audio/webm";
    
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  return {
    isRecording,
    recordingTime,
    audioBlob,
    audioUrl,
    mediaStream,
    lastError,
    startRecording,
    stopRecording,
    resetRecording,
  };
};
