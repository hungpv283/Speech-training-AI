import React, { useState, useEffect } from 'react';
import { Button, Typography, Tag, Input, message, Spin, Modal, Alert } from 'antd';
import { BookOutlined, PlusOutlined, AudioOutlined, ReloadOutlined, RightOutlined, LogoutOutlined, CheckOutlined, XFilled, PauseOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/services/store/store';
import {
  setCurrentSentence,
  setCurrentSentenceId,
  addRecording,
  setCurrentRecordingIndex,
  setIsRecording,
  setRecordingTime,
  fetchAvailableSentences,
  resetUserState,
} from '@/services/features/userSlice';
import { uploadRecording, createUserSentence } from '@/services/features/recordingSlice';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import AudioWaveform from '@/components/AudioWaveform';
import RecordingWaveform from '@/components/RecordingWaveform';
import { cn } from '@/lib/utils';
import { clearPersistedUserData } from '@/lib/storageUtils';

const { Title, Text } = Typography;

const RECORDING_GUIDE_STORAGE_KEY = 'recording-onboarding-seen';
const RECORDING_GUIDE_STEPS = [
  {
    title: 'Bước 1: Chọn câu để ghi âm',
    description: 'Ở chế độ đọc câu có sẵn, bạn sẽ thấy 2 dòng: PlainText và Content. Mỗi dòng có một nút micro riêng để bắt đầu ghi.',
  },
  {
    title: 'Bước 2: Cho phép dùng micro',
    description: 'Khi trình duyệt hỏi quyền truy cập micro, hãy bấm Cho phép để hệ thống có thể ghi âm.',
  },
  {
    title: 'Bước 3: Bấm nút micro và đọc rõ ràng',
    description: 'Bấm vào nút micro ở dòng bạn muốn ghi, sau đó đọc chậm, rõ và giữ điện thoại hoặc micro ổn định.',
  },
  {
    title: 'Bước 4: Dừng và nghe lại',
    description: 'Sau khi đọc xong, bấm Dừng ghi âm. Bạn có thể nghe lại, chọn Thử lại nếu chưa ưng ý hoặc Lưu bản ghi để tiếp tục.',
  },
  {
    title: 'Bước 5: Hoàn thành đủ 2 bản',
    description: 'Mỗi câu cần ghi đủ 2 bản: PlainText và Content. Khi hoàn thành đủ 2 bản, hệ thống sẽ tự lưu và chuyển sang câu tiếp theo.',
  },
] as const;

const pickNextSentence = (
  sentences: Array<{ SentenceID: string; Content: string; csTranscript?: string | null; viEquivalent?: string | null }>,
  excludedSentenceIds: string[] = []
) => {
  const excluded = new Set(excludedSentenceIds);
  return sentences.find((sentence) => !excluded.has(sentence.SentenceID)) ?? null;
};

const getContentText = (sentence: {
  Content: string;
  viEquivalent?: string | null;
  csTranscript?: string | null;
}) => sentence.viEquivalent?.trim() || sentence.Content || sentence.csTranscript?.trim() || '';

const getPlainText = (sentence: {
  PlainText?: string | null;
  csTranscript?: string | null;
  viEquivalent?: string | null;
  Content: string;
}) => sentence.csTranscript?.trim() || sentence.PlainText?.trim() || sentence.viEquivalent?.trim() || sentence.Content || '';


// Type for pending recordings stored locally
interface PendingRecording {
  audioBlob: Blob;
  audioUrl: string;
  duration: number;
  type: 'plaintext' | 'content';
  sentenceId: string;
  sentence: string;
}

const RecordingPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const userState = useAppSelector((state) => state.user);
  const {
    userInfo,
    recordings = [],
    currentRecordingIndex = 0,
    currentSentence = "",
    currentSentenceId = null,
    availableSentences = [],
    loadingSentences = false
  } = userState || {};
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [customSentence, setCustomSentence] = useState<string>('');
  const [currentContentText, setCurrentContentText] = useState<string>('');
  const [currentPlainText, setCurrentPlainText] = useState<string>('');
  const [recordedTypes, setRecordedTypes] = useState<Set<'plaintext' | 'content'>>(new Set());
  const [pendingRecordings, setPendingRecordings] = useState<PendingRecording[]>([]);
  const [activeRecordType, setActiveRecordType] = useState<'plaintext' | 'content'>('content');
  const [isPlaying, setIsPlaying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submittingSentence, setSubmittingSentence] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const {
    isRecording,
    recordingTime,
    audioBlob,
    audioUrl,
    mediaStream,
    startRecording,
    stopRecording,
    resetRecording,
    lastError,
  } = useAudioRecorder();

  useEffect(() => {
    if (!userInfo) {
      navigate('/');
      return;
    }

    // Fetch available sentences when component mounts or userInfo changes
    if (mode === 'existing') {
      // Reset sentence display state on mount/fetch
      setCurrentContentText('');
      setCurrentPlainText('');
      // Call the API endpoint (personId is not needed for the new endpoint)
      dispatch(fetchAvailableSentences(''));
    }
  }, [userInfo, dispatch, navigate, mode]);

  // Update current sentence when availableSentences changes
  useEffect(() => {
    if (availableSentences && availableSentences.length > 0 && mode === 'existing') {
      const firstSentence = availableSentences[0];
      const nextContentText = getContentText(firstSentence);
      const nextPlainText = getPlainText(firstSentence);
      dispatch(setCurrentSentence(nextContentText));
      dispatch(setCurrentSentenceId(firstSentence.SentenceID));
      setCurrentContentText(nextContentText);
      setCurrentPlainText(nextPlainText);
      setActiveRecordType('content');
      setRecordedTypes(new Set());
      setPendingRecordings([]);
    }
  }, [availableSentences, mode, dispatch]);

  useEffect(() => {
    dispatch(setIsRecording(isRecording));
    dispatch(setRecordingTime(recordingTime));
  }, [isRecording, recordingTime, dispatch]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const hasSeenGuide = window.localStorage.getItem(RECORDING_GUIDE_STORAGE_KEY);
    if (!hasSeenGuide) {
      setIsGuideOpen(true);
    }
  }, []);

  const handleStartRecording = async () => {
    try {
      await startRecording();
    } catch (error) {
      console.error('Failed to start recording:', error);
      const errMsg = error instanceof Error ? error.message : 'Không thể truy cập micro. Vui lòng cho phép quyền và thử lại.';
      message.error(errMsg);
    }
  };

  const handleStartRecordingForType = async (type: 'plaintext' | 'content') => {
    if (recordedTypes.has(type)) {
      return;
    }

    if (audioUrl) {
      resetRecording();
      setIsPlaying(false);
    }

    const sentenceToRecord = type === 'plaintext' ? currentPlainText : currentContentText;
    if (!sentenceToRecord) {
      message.warning('Không có nội dung để ghi âm');
      return;
    }

    setActiveRecordType(type);
    dispatch(setCurrentSentence(sentenceToRecord));
    dispatch(setCurrentSentenceId(currentSentenceId));
    await handleStartRecording();
  };

  const handleStopRecording = () => {
    stopRecording();
  };

  const handleSaveRecording = async () => {
    if (!audioBlob || !audioUrl || !currentSentence) {
      return;
    }

    if (!userInfo?.userId) {
      message.error('Không tìm thấy thông tin người dùng');
      return;
    }

    // For existing mode, we need sentenceId
    if (mode === 'existing' && !currentSentenceId) {
      message.error('Không tìm thấy ID câu');
      return;
    }

    if (mode === 'existing' && currentSentenceId) {
      const recordedType = activeRecordType;
      const sentenceForType = recordedType === 'plaintext' ? currentPlainText : currentContentText;
      
      // Lưu tạm vào pendingRecordings (chưa upload)
      const newPendingRecording: PendingRecording = {
        audioBlob,
        audioUrl,
        duration: recordingTime,
        type: recordedType,
        sentenceId: currentSentenceId,
        sentence: sentenceForType,
      };
      
      const newPendingRecordings = [...pendingRecordings, newPendingRecording];
      setPendingRecordings(newPendingRecordings);

      // Mark this type as recorded
      const newRecordedTypes = new Set(recordedTypes);
      newRecordedTypes.add(recordedType);
      setRecordedTypes(newRecordedTypes);

      // Add to local recordings state for display
      dispatch(
        addRecording({
          sentence: currentSentence,
          sentenceId: currentSentenceId,
          audioBlob,
          audioUrl,
          duration: recordingTime,
        })
      );

      setIsPlaying(false);
      resetRecording();

      // Kiểm tra đã đủ 2 bản chưa
      if (newRecordedTypes.size === 2) {
        // Đủ 2 bản → Upload cả 2 lên server
        setUploading(true);
        try {
          // Upload both recordings sequentially
          for (const pending of newPendingRecordings) {
            await uploadRecording(
              pending.audioBlob,
              userInfo.userId,
              pending.sentenceId,
              pending.type
            );
          }
          
          message.success('Đã ghi âm đủ 2 bản và lưu thành công!');

          // Fetch next sentences
          const updatedSentences = await dispatch(fetchAvailableSentences('')).unwrap();
          const justRecordedSentenceIds = Array.from(
            new Set(newPendingRecordings.map((pending) => pending.sentenceId))
          );
          const nextSentence = pickNextSentence(updatedSentences, justRecordedSentenceIds);

          if (nextSentence) {
            const nextContentText = getContentText(nextSentence);
            const nextPlainText = getPlainText(nextSentence);
            dispatch(setCurrentSentence(nextContentText));
            dispatch(setCurrentSentenceId(nextSentence.SentenceID));
            dispatch(setCurrentRecordingIndex(recordings.length + 2));
            setCurrentContentText(nextContentText);
            setCurrentPlainText(nextPlainText);
            setActiveRecordType('content');
            setRecordedTypes(new Set());
            setPendingRecordings([]);
          } else {
            message.info('Đã ghi âm đủ cả 2 bản. Không còn câu nào cần ghi âm.');
            setActiveRecordType('content');
            setRecordedTypes(new Set());
            setPendingRecordings([]);
          }
        } catch (error) {
          console.error('Error uploading recordings:', error);
          message.error('Có lỗi khi lưu ghi âm. Vui lòng thử lại.');
        } finally {
          setUploading(false);
        }
      } else {
        // Chưa đủ 2 bản → chuyển sang loại còn lại
        const nextType = recordedType === 'plaintext' ? 'content' : 'plaintext';
        const nextSentenceText = nextType === 'plaintext' ? currentPlainText : currentContentText;
        setActiveRecordType(nextType);
        dispatch(setCurrentSentence(nextSentenceText));
      }
    } else {
      // For new mode, just save locally (no API call for custom sentences)
      const duration = recordingTime;
      dispatch(
        addRecording({
          sentence: currentSentence,
          audioBlob,
          audioUrl,
          duration,
        })
      );

      await new Promise(resolve => setTimeout(resolve, 100));
      dispatch(setCurrentSentence(customSentence.trim()));
      setIsPlaying(false);
      resetRecording();
    }
  };

  const handleRetry = () => {
    setIsPlaying(false);
    resetRecording();
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleCloseGuide = () => {
    setIsGuideOpen(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(RECORDING_GUIDE_STORAGE_KEY, 'true');
    }
  };

  const handleOpenGuide = () => {
    setIsGuideOpen(true);
  };

  const handleExit = () => {
    // Reset user state and navigate back to home page
    dispatch(resetUserState());
    clearPersistedUserData();
    setCurrentContentText('');
    setCurrentPlainText('');
    setRecordedTypes(new Set());
    setPendingRecordings([]);
    navigate('/');
  };

  const handleSubmitCustomSentence = async () => {
    if (!customSentence.trim()) {
      message.warning('Vui lòng nhập câu trước khi gửi');
      return;
    }

    if (!userInfo?.email) {
      message.error('Không tìm thấy email người dùng');
      return;
    }

    setSubmittingSentence(true);
    try {
      const response = await createUserSentence({
        email: userInfo.email,
        content: customSentence.trim(),
      });

      if (response.message) {
        message.success('Câu đã được gửi thành công!');
        // Reset form
        setCustomSentence('');
        dispatch(setCurrentSentence(''));
        // Stay on recording page, don't navigate away
      }
    } catch (error: unknown) {
      const errAny = error as any;
      // Log only the backend message to avoid dumping large objects into the console
      console.error('Error submitting sentence:', errAny?.message ?? errAny);
      if (errAny && typeof errAny === 'object') {
        if (Array.isArray(errAny.duplicates) && errAny.duplicates.length > 0) {
          Modal.error({
            title: 'Câu bị trùng lặp',
            content: (
              <div>
                <p><strong>Tìm thấy {errAny.duplicates.length} câu trùng:</strong></p>
                <ul style={{ marginLeft: '20px', marginTop: '10px' }}>
                  {errAny.duplicates.map((dup: any, index: number) => (
                    <li key={index} style={{ marginBottom: '8px' }}>
                      {dup.content}
                    </li>
                  ))}
                </ul>
              </div>
            ),
            okText: 'OK',
          });
        } else if (errAny.message) {
          // If backend provided a message, show it directly
          message.error(errAny.message);
        } else {
          message.error('Không thể gửi câu. Vui lòng thử lại.');
        }
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Không thể gửi câu. Vui lòng thử lại.';
        message.error(errorMessage);
      }
    } finally {
      setSubmittingSentence(false);
    }
  };

  const handleSubmit = async () => {
    if (recordings.length === 0) {
      message.warning('Vui lòng ghi âm ít nhất một câu trước khi hoàn thành');
      return;
    }
    // Wait a bit to ensure all state updates are complete
    await new Promise(resolve => setTimeout(resolve, 200));
    navigate('/thank-you');
  };

  if (!userInfo) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white py-3 px-4 md:px-8">
      <div className="max-w-4xl mx-auto space-y-3">
        <Modal
          open={isGuideOpen}
          onCancel={handleCloseGuide}
          onOk={handleCloseGuide}
          okText="Bắt đầu ghi âm"
          cancelText="Đóng"
          centered
          width={720}
          title={<span className="text-lg font-semibold text-blue-700">Hướng dẫn ghi âm cho người mới</span>}
        >
          <div className="space-y-3 py-2">
            <Alert
              type="info"
              showIcon
              message="Chỉ cần làm lần lượt theo các bước bên dưới là có thể bắt đầu ghi âm ngay."
            />
            <div className="space-y-3">
              {RECORDING_GUIDE_STEPS.map((step, index) => (
                <div
                  key={step.title}
                  className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{step.title}</div>
                    <div className="text-sm leading-6 text-gray-600">{step.description}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Mẹo: nên ghi âm ở nơi yên tĩnh, đưa micro lại gần miệng và tránh tiếng ồn xung quanh để bản ghi rõ hơn.
            </div>
          </div>
        </Modal>
        {/* Header */}
        <div className="space-y-2 py-2">
          {/* Exit Button */}
          <div className="flex justify-between items-center mb-1 gap-3">
            <Button
              type="default"
              icon={<QuestionCircleOutlined />}
              onClick={handleOpenGuide}
              className="h-9 rounded-xl border-blue-200 text-blue-600 hover:!border-blue-400 hover:!text-blue-700 font-medium shadow-sm"
            >
              Hướng dẫn
            </Button>
            <button
              onClick={handleExit}
              className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 border border-gray-200 hover:border-red-300 text-sm font-medium"
              title="Thoát và nhập tên lại"
            >
              <LogoutOutlined />
              <span>Thoát</span>
            </button>
          </div>

          <div className="text-center space-y-1">
            <Title
              level={1}
              className="!mb-0 !text-3xl md:!text-4xl !font-bold !text-blue-600"
              style={{ letterSpacing: '-0.02em' }}
            >
              Ghi Âm
            </Title>
            <Text className="text-base md:text-lg text-gray-600 font-medium">
              Xin chào, <span className="text-blue-600 font-semibold">{userInfo.email}</span>
            </Text>
          </div>
        </div>

        {/* Mode Selection */}
        <div className="flex justify-center gap-2 md:gap-3">
          <button
            onClick={() => {
              setMode('existing');
              setCurrentContentText('');
              setCurrentPlainText('');
              setRecordedTypes(new Set());
              setPendingRecordings([]);
            }}
            className={cn(
              "px-4 md:px-5 py-2 md:py-2.5 rounded-xl font-medium transition-all duration-300",
              "flex items-center gap-2 text-sm md:text-base",
              mode === 'existing'
                ? "bg-blue-600 text-white shadow-lg shadow-blue-200 scale-[1.02]"
                : "bg-white text-gray-600 border-2 border-gray-200 hover:border-blue-300 hover:shadow-md"
            )}
          >
            <BookOutlined className="text-base" />
            <span>Đọc câu có sẵn</span>
          </button>
          <button
            onClick={() => setMode('new')}
            className={cn(
              "px-4 md:px-5 py-2 md:py-2.5 rounded-xl font-medium transition-all duration-300",
              "flex items-center gap-2 text-sm md:text-base",
              mode === 'new'
                ? "bg-blue-600 text-white shadow-lg shadow-blue-200 scale-[1.02]"
                : "bg-white text-gray-600 border-2 border-gray-200 hover:border-blue-300 hover:shadow-md"
            )}
          >
            <PlusOutlined className="text-base" />
            <span>Tạo câu mới</span>
          </button>
        </div>

        {/* Suggested / Custom Sentence Card */}
        {mode === 'existing' && (
          <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl p-[1px] shadow-md">
            <div className="bg-white rounded-[1rem] p-4 md:p-5 flex flex-col gap-4">
              {loadingSentences ? (
                <div className="flex justify-center items-center py-4">
                  <Spin size="large" />
                </div>
              ) : !availableSentences || availableSentences.length === 0 ? (
                <div className="text-center py-4">
                  <Text className="text-gray-500 text-base">
                    Không còn câu nào cần ghi âm. Cảm ơn bạn!
                  </Text>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <BookOutlined className="text-blue-600 text-sm" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-semibold tracking-[0.15em] text-blue-500 uppercase">
                          Câu gợi ý
                        </span>
                        <span className="text-xs text-gray-500">
                          Mỗi dòng có một nút ghi âm riêng
                        </span>
                      </div>
                    </div>
                    <Tag
                      color="blue"
                      className="px-2 py-0.5 text-xs font-semibold rounded-full border-0 bg-blue-50 text-blue-600"
                    >
                      Câu {currentRecordingIndex + 1}
                    </Tag>
                  </div>

                  <div className="space-y-3">
                    {([
                      {
                        type: 'plaintext' as const,
                        label: 'PlainText',
                        text: currentPlainText,
                        color: 'blue',
                        activeClasses: 'border-blue-500 bg-blue-50 shadow-md',
                        idleClasses: 'border-gray-200 bg-white hover:border-blue-300',
                        iconClasses: 'bg-blue-600 hover:bg-blue-700',
                        statusTextClasses: 'text-blue-700',
                      },
                      {
                        type: 'content' as const,
                        label: 'Content',
                        text: currentContentText,
                        color: 'purple',
                        activeClasses: 'border-purple-500 bg-purple-50 shadow-md',
                        idleClasses: 'border-gray-200 bg-white hover:border-purple-300',
                        iconClasses: 'bg-purple-600 hover:bg-purple-700',
                        statusTextClasses: 'text-purple-700',
                      },
                    ]).map((item) => {
                      if (!item.text) return null;

                      const isRecorded = recordedTypes.has(item.type);
                      const isActive = activeRecordType === item.type;
                      const isThisRecording = isRecording && isActive;

                      return (
                        <div
                          key={item.type}
                          className={cn(
                            'rounded-2xl border-2 px-4 py-4 transition-all duration-200',
                            isActive || isRecorded ? item.activeClasses : item.idleClasses
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={cn(
                                  'text-[11px] font-semibold uppercase tracking-wide',
                                  item.type === 'plaintext' ? 'text-blue-600' : 'text-purple-600'
                                )}>
                                  {item.label}
                                </span>
                                {isRecorded && <CheckOutlined className="text-green-500 text-sm" />}
                                {isThisRecording && <span className="text-[11px] text-red-500 font-semibold">Đang ghi...</span>}
                              </div>
                              <p className={cn(
                                'mb-0 text-base md:text-lg leading-relaxed break-words',
                                isActive ? item.statusTextClasses : 'text-gray-700'
                              )}>
                                {item.text}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                if (isThisRecording) {
                                  handleStopRecording();
                                  return;
                                }
                                void handleStartRecordingForType(item.type);
                              }}
                              disabled={uploading || (isRecording && !isActive) || isRecorded || !item.text}
                              className={cn(
                                'h-14 w-14 md:h-16 md:w-16 rounded-full flex items-center justify-center text-white shadow-lg transition-all duration-200 shrink-0',
                                'disabled:opacity-50 disabled:cursor-not-allowed',
                                isThisRecording ? 'bg-red-500 hover:bg-red-600' : item.iconClasses
                              )}
                              title={isThisRecording ? 'Dừng ghi âm' : `Ghi âm ${item.label}`}
                            >
                              {isThisRecording ? (
                                <PauseOutlined style={{ fontSize: '22px' }} />
                              ) : (
                                <AudioOutlined style={{ fontSize: '22px' }} />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-center py-1">
                    <Text className="text-xs text-gray-500">
                      Đã ghi âm: {recordedTypes.size}/2 bản
                      {recordedTypes.size === 2 && <span className="text-green-600 font-medium ml-1">(Hoàn thành)</span>}
                    </Text>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {mode === 'new' && (
          <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl p-[1px] shadow-md">
            <div className="bg-white rounded-[1rem] p-4 md:p-5 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                    <PlusOutlined className="text-blue-600 text-xs" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-semibold tracking-[0.15em] text-blue-500 uppercase">
                      Tạo câu mới
                    </span>
                    <span className="text-[10px] text-gray-500">
                      Nhập câu bạn muốn tạo và gửi
                    </span>
                  </div>
                </div>
              </div>
              <Input.TextArea
                rows={3}
                placeholder="Nhập câu mà bạn muốn tạo..."
                value={customSentence}
                onChange={(e) => {
                  const value = e.target.value;
                  setCustomSentence(value);
                }}
                className="rounded-xl border-gray-300 hover:border-blue-400 focus:border-blue-500 focus:shadow-sm transition-all text-base"
                disabled={submittingSentence}
              />
              <Button
                type="primary"
                size="large"
                onClick={handleSubmitCustomSentence}
                loading={submittingSentence}
                disabled={submittingSentence || !customSentence.trim()}
                className="h-10 md:h-11 rounded-xl bg-blue-600 border-none hover:bg-blue-700 shadow-md hover:shadow-lg font-semibold transition-all"
                block
              >
                {submittingSentence ? 'Đang gửi...' : 'Gửi câu'}
              </Button>
              {recordings.length > 0 && (
                <div className="flex justify-center pt-1">
                  <Button
                    type="primary"
                    size="large"
                    icon={<CheckOutlined />}
                    onClick={handleSubmit}
                    className="h-10 md:h-11 px-6 md:px-8 rounded-xl bg-green-600 border-none hover:bg-green-700 shadow-md hover:shadow-lg font-semibold transition-all text-sm md:text-base"
                  >
                    Hoàn thành ({recordings.length} câu)
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recording / Review Section for active sentence */}
        {mode === 'existing' && (isRecording || audioUrl || lastError) && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 md:p-5">
            {lastError && (
              <div className="mb-3">
                <Alert
                  type="error"
                  showIcon
                  message="Lỗi ghi âm"
                  description={lastError}
                />
              </div>
            )}

            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Tag color={activeRecordType === 'plaintext' ? 'blue' : 'purple'} className="rounded-full px-3 py-1 text-sm font-semibold">
                {activeRecordType === 'plaintext' ? 'PlainText' : 'Content'}
              </Tag>
              <Text className="text-sm text-gray-500">
                {activeRecordType === 'plaintext' ? currentPlainText : currentContentText}
              </Text>
            </div>

            {isRecording && mediaStream ? (
              <div className="space-y-4">
                <RecordingWaveform mediaStream={mediaStream} isRecording={isRecording} />
                <div className="flex flex-col items-center gap-2">
                  <Button
                    danger
                    size="large"
                    icon={<XFilled />}
                    onClick={handleStopRecording}
                    className="h-11 px-6 rounded-xl font-semibold"
                  >
                    Dừng ghi âm
                  </Button>
                  <Text className="text-sm text-red-500 font-medium">
                    Đang ghi âm... Nhấn để dừng
                  </Text>
                </div>
              </div>
            ) : audioUrl ? (
              <div className="space-y-4">
                <div style={{ height: '228px' }}>
                  <AudioWaveform
                    audioUrl={audioUrl}
                    isPlaying={isPlaying}
                    onPlay={handlePlayPause}
                    onPause={handlePlayPause}
                  />
                </div>

                <div className="flex flex-wrap justify-center gap-2 md:gap-3">
                  <Button
                    size="large"
                    icon={<ReloadOutlined />}
                    onClick={handleRetry}
                    className="h-10 md:h-11 px-5 md:px-6 rounded-xl border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-700 font-semibold transition-all shadow-sm hover:shadow-md text-sm md:text-base"
                  >
                    Thử lại
                  </Button>
                  <Button
                    type="primary"
                    size="large"
                    icon={<RightOutlined />}
                    onClick={handleSaveRecording}
                    loading={uploading}
                    disabled={uploading}
                    className="h-10 md:h-11 px-5 md:px-6 rounded-xl bg-blue-600 border-none hover:bg-blue-700 shadow-md hover:shadow-lg font-semibold transition-all text-sm md:text-base"
                  >
                    {uploading ? 'Đang tải lên...' : 'Lưu bản ghi'}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Progress Indicator and Submit Button */}
        {mode === 'existing' && (
          <div className="text-center pt-2">
            {recordings.length > 0 && (
              <div className="flex justify-center">
                <Button
                  type="primary"
                  size="large"
                  icon={<CheckOutlined />}
                  onClick={async () => {
                    // Wait a bit to ensure all state updates are complete
                    await new Promise(resolve => setTimeout(resolve, 200));
                    navigate('/thank-you');
                  }}
                  className="h-10 md:h-11 px-6 md:px-8 rounded-xl bg-green-600 border-none hover:bg-green-700 shadow-md hover:shadow-lg font-semibold transition-all text-sm md:text-base"
                >
                  Kết thúc
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordingPage;
