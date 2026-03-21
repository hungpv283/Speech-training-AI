import { useEffect, useRef } from 'react';

interface RecordingWaveformProps {
  mediaStream: MediaStream | null;
  isRecording: boolean;
}

const RecordingWaveform: React.FC<RecordingWaveformProps> = ({ mediaStream, isRecording }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!mediaStream || !isRecording || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Create audio context for real-time visualization
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioContext = new AudioContextClass();
    const source = audioContext.createMediaStreamSource(mediaStream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.3;
    source.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!isRecording || !analyserRef.current || !ctx) return;

      analyserRef.current.getByteFrequencyData(dataArray);

      const width = rect.width;
      const height = rect.height;

      // Clear canvas
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(0, 0, width, height);

      // Draw waveform bars
      const barCount = 100;
      const barWidth = width / barCount;
      const barGap = 2;

      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * bufferLength);
        const barHeight = (dataArray[dataIndex] / 255) * height * 0.8;

        // Create gradient
        const gradient = ctx.createLinearGradient(0, height / 2 - barHeight / 2, 0, height / 2 + barHeight / 2);
        gradient.addColorStop(0, '#3b82f6');
        gradient.addColorStop(0.5, '#2563eb');
        gradient.addColorStop(1, '#1d4ed8');

        ctx.fillStyle = gradient;
        ctx.fillRect(
          i * barWidth + barGap,
          height / 2 - barHeight / 2,
          barWidth - barGap * 2,
          barHeight
        );
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
      }
    };
  }, [mediaStream, isRecording]);

  if (!isRecording || !mediaStream) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 shadow-sm" style={{ height: '228px', display: 'flex', flexDirection: 'column' }}>
      <div className="flex items-center gap-4 mb-4" style={{ height: '56px', flexShrink: 0 }}>
        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        <span className="text-sm font-semibold text-gray-700">Đang ghi âm...</span>
      </div>
      <div className="w-full rounded-lg bg-white/50 p-3 flex items-center justify-center flex-1" style={{ minHeight: 0 }}>
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ height: '100%' }}
        />
      </div>
    </div>
  );
};

export default RecordingWaveform;
