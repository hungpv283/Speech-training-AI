import { useEffect, useRef, useState } from 'react';
import { PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons';
import WaveSurfer from 'wavesurfer.js';

interface AudioWaveformProps {
    audioUrl: string | null;
    isPlaying: boolean;
    onPlay: () => void;
    onPause: () => void;
}

// Helper function to detect mobile devices
const isMobileDevice = (): boolean => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
    ) || 
    (window.matchMedia && window.matchMedia("(max-width: 768px)").matches);
};

const AudioWaveform: React.FC<AudioWaveformProps> = ({ audioUrl, isPlaying, onPlay, onPause }) => {
    const waveformRef = useRef<HTMLDivElement>(null);
    const wavesurferRef = useRef<WaveSurfer | null>(null);
    const [duration, setDuration] = useState<number>(0);
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [internalPlaying, setInternalPlaying] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const onPlayRef = useRef(onPlay);
    const onPauseRef = useRef(onPause);

    // Update refs when callbacks change
    useEffect(() => {
        onPlayRef.current = onPlay;
        onPauseRef.current = onPause;
    }, [onPlay, onPause]);

    useEffect(() => {
        if (!audioUrl || !waveformRef.current) return;

        let isMounted = true;
        let wavesurfer: WaveSurfer | null = null;
        const abortController = new AbortController();
        setLoadError(null);

        // Create WaveSurfer instance
        try {
            const isMobile = isMobileDevice();
            
            // Use WebAudio backend for mobile devices as it's more reliable with blob URLs
            // For desktop, try WebAudio first, fallback to MediaElement if needed
            wavesurfer = WaveSurfer.create({
                container: waveformRef.current,
                waveColor: '#93c5fd',
                progressColor: '#3b82f6',
                cursorColor: '#1e40af',
                barWidth: 3,
                barRadius: 3,
                barGap: 2,
                height: 100,
                normalize: true,
                interact: true,
                dragToSeek: true,
                backend: isMobile ? 'WebAudio' : 'WebAudio', // Use WebAudio for better mobile support
                mediaControls: false, // Disable native controls for better mobile experience
                autoplay: false,
            });

            wavesurferRef.current = wavesurfer;

            // Event listeners
            const handleReady = () => {
                if (isMounted && wavesurfer) {
                    try {
                        const duration = wavesurfer.getDuration();
                        if (duration && duration > 0) {
                            setDuration(duration);
                        }
                    } catch (e) {
                        console.warn("Error getting duration:", e);
                    }
                }
            };

            const handlePlay = () => {
                if (isMounted) {
                    setInternalPlaying(true);
                    onPlayRef.current();
                }
            };

            const handlePause = () => {
                if (isMounted) {
                    setInternalPlaying(false);
                    onPauseRef.current();
                }
            };

            const handleFinish = () => {
                if (isMounted) {
                    setInternalPlaying(false);
                    onPauseRef.current();
                }
            };

            const handleTimeUpdate = (time: number) => {
                if (isMounted) {
                    setCurrentTime(time);
                }
            };

            const handleError = (error: any) => {
                if (isMounted) {
                    console.error("WaveSurfer error:", error);
                    setLoadError("Không thể tải audio. Vui lòng thử lại.");
                }
            };

            // Remove any existing listeners first to avoid duplicates
            wavesurfer.unAll();

            // Register event listeners
            wavesurfer.on('ready', handleReady);
            wavesurfer.on('play', handlePlay);
            wavesurfer.on('pause', handlePause);
            wavesurfer.on('finish', handleFinish);
            wavesurfer.on('timeupdate', handleTimeUpdate);
            wavesurfer.on('error', handleError);

            // Load audio with error handling
            // WebAudio backend works well with blob URLs on mobile
            const loadPromise = wavesurfer.load(audioUrl);

            // Handle abort signal
            abortController.signal.addEventListener('abort', () => {
                if (wavesurfer) {
                    try {
                        if (wavesurfer.isPlaying()) {
                            wavesurfer.pause();
                        }
                    } catch {
                        // Ignore errors during abort
                    }
                }
            });

            loadPromise.catch((error) => {
                if (isMounted && !abortController.signal.aborted) {
                    console.error("Error loading audio:", error);
                    setLoadError("Không thể tải audio. Vui lòng thử lại.");
                }
            });
        } catch (error) {
            console.error("Error initializing WaveSurfer:", error);
            if (isMounted) {
                setLoadError("Không thể khởi tạo trình phát audio. Vui lòng thử lại.");
            }
        }

        // Cleanup
        return () => {
            isMounted = false;
            abortController.abort();

            if (wavesurfer) {
                try {
                    // Remove all event listeners first
                    wavesurfer.unAll();
                    // Stop playback first
                    if (wavesurfer.isPlaying()) {
                        wavesurfer.pause();
                    }
                    // Destroy instance - this will cancel any pending load requests
                    wavesurfer.destroy();
                } catch {
                    // Silently ignore errors during cleanup (especially abort errors)
                    // These are expected when component unmounts during audio load
                }
                wavesurferRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [audioUrl]); // Remove onPlay and onPause from dependencies to prevent re-renders

    // Handle play/pause from parent (only sync, don't trigger play)
    // The button click handler will handle actual play/pause
    // This effect is mainly for syncing state
    useEffect(() => {
        if (!wavesurferRef.current) return;

        const wavesurfer = wavesurferRef.current;
        const isCurrentlyPlaying = wavesurfer.isPlaying();

        // Only sync if state is different (don't trigger play from here)
        // The button click will handle the actual play/pause
        if (isPlaying !== isCurrentlyPlaying && internalPlaying === isCurrentlyPlaying) {
            // State is out of sync, but don't auto-play/pause
            // Let the user control it via button
        }
    }, [isPlaying, internalPlaying]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (!audioUrl) {
        return null;
    }

    return (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 shadow-sm" style={{ height: '228px', display: 'flex', flexDirection: 'column' }}>
            <div className="flex items-center gap-4 mb-4" style={{ height: '56px', flexShrink: 0 }}>
                <button
                    onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        if (!wavesurferRef.current) {
                            return;
                        }

                        const wavesurfer = wavesurferRef.current;

                        try {
                            // Prevent multiple rapid clicks
                            if (wavesurfer.isPlaying()) {
                                wavesurfer.pause();
                            } else {
                                // On mobile, try to resume AudioContext if available (best-effort, typed via any)
                                if (isMobileDevice()) {
                                    const anyWave = wavesurfer as any;
                                    const backend = anyWave.backend;
                                    const ac = backend && backend.ac;
                                    if (ac && ac.state === 'suspended') {
                                        try {
                                            await ac.resume();
                                        } catch {
                                            // Ignore resume errors; playback will still be attempted
                                        }
                                    }
                                }

                                const currentDuration = wavesurfer.getDuration();
                                if (currentDuration > 0) {
                                    await wavesurfer.play();
                                } else {
                                    // Wait for ready event if duration not available yet
                                    wavesurfer.once('ready', async () => {
                                        try {
                                            await wavesurfer.play();
                                        } catch (playError) {
                                            console.error("Play error:", playError);
                                            setLoadError("Không thể phát audio. Vui lòng thử lại.");
                                        }
                                    });
                                }
                            }
                        } catch (playError) {
                            console.error("Play/pause error:", playError);
                            const errorMsg = playError instanceof Error 
                                ? playError.message 
                                : "Không thể phát audio";
                            setLoadError(errorMsg);
                            
                            // Try to show user-friendly error
                            if (isMobileDevice()) {
                                // Trên mobile, có thể cần thao tác người dùng thêm
                                console.warn("Audio playback may require additional user interaction on mobile");
                            }
                        }
                    }}
                    disabled={!!loadError}
                    className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl flex-shrink-0 transition-all duration-300 hover:scale-110 hover:shadow-lg active:scale-95 hover:bg-blue-700 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {internalPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                </button>
                <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-700 mb-1">
                        {loadError ? 'Lỗi tải audio' : 'Nghe lại bản ghi'}
                    </div>
                    {loadError ? (
                        <div className="text-xs text-red-500">{loadError}</div>
                    ) : (
                        <div className="text-xs text-gray-500">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </div>
                    )}
                </div>
            </div>
            <div
                ref={waveformRef}
                className="w-full rounded-lg bg-white/50 p-3 flex-1"
                style={{ minHeight: 0 }}
            />
        </div>
    );
};

export default AudioWaveform;
