import React, { useState, useEffect } from 'react';
import { Button, Typography, Tag, Input, message, Spin, Modal, Alert } from 'antd';
import { BookOutlined, PlusOutlined, AudioOutlined, ReloadOutlined, RightOutlined, LogoutOutlined, CheckOutlined, XFilled, EditOutlined } from '@ant-design/icons';
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
  getSentenceDisplayText,
} from '@/services/features/userSlice';
import { uploadRecording, createUserSentence, updateSentence } from '@/services/features/recordingSlice';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import AudioWaveform from '@/components/AudioWaveform';
import RecordingWaveform from '@/components/RecordingWaveform';
import { cn } from '@/lib/utils';
import { clearPersistedUserData } from '@/lib/storageUtils';

const { Title, Text } = Typography;

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submittingSentence, setSubmittingSentence] = useState(false);
  const [isEditSentenceModalOpen, setIsEditSentenceModalOpen] = useState(false);
  const [editingSentenceValue, setEditingSentenceValue] = useState<string>('');
  const [savingSentenceEdit, setSavingSentenceEdit] = useState(false);

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
      // Call the API endpoint (personId is not needed for the new endpoint)
      dispatch(fetchAvailableSentences(''));
    }
  }, [userInfo, dispatch, navigate, mode]);

  // Update current sentence when availableSentences changes
  useEffect(() => {
    if (availableSentences && availableSentences.length > 0 && mode === 'existing' && !currentSentence) {
      dispatch(setCurrentSentence(getSentenceDisplayText(availableSentences[0])));
      dispatch(setCurrentSentenceId(availableSentences[0].SentenceID));
    }
  }, [availableSentences, mode, currentSentence, dispatch]);

  useEffect(() => {
    dispatch(setIsRecording(isRecording));
    dispatch(setRecordingTime(recordingTime));
  }, [isRecording, recordingTime, dispatch]);

  const handleStartRecording = async () => {
    try {
      await startRecording();
    } catch (error) {
      console.error('Failed to start recording:', error);
      const errMsg = error instanceof Error ? error.message : 'Không thể truy cập micro. Vui lòng cho phép quyền và thử lại.';
      message.error(errMsg);
    }
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

    setUploading(true);
    try {
      if (mode === 'existing' && currentSentenceId) {
        // Upload recording for existing sentence
        const response = await uploadRecording(
          audioBlob,
          userInfo.userId,
          currentSentenceId
        );

        if (response.success) {
          message.success('Ghi âm đã được lưu thành công!');

          const duration = recordingTime;
          // Calculate new recording index before adding
          const newRecordingIndex = recordings.length;

          // Add recording to state immediately
          dispatch(
            addRecording({
              sentence: currentSentence,
              sentenceId: currentSentenceId,
              audioBlob,
              audioUrl,
              duration,
            })
          );

          // Wait for state to update by using a small delay
          await new Promise(resolve => setTimeout(resolve, 100));

          // Refresh available sentences to get updated list and move to next sentence
          const updatedSentences = await dispatch(fetchAvailableSentences('')).unwrap();

          if (updatedSentences.length > 0) {
            // Move to next available sentence
            const nextSentence = updatedSentences[0];
            dispatch(setCurrentSentence(getSentenceDisplayText(nextSentence)));
            dispatch(setCurrentSentenceId(nextSentence.SentenceID));
            dispatch(setCurrentRecordingIndex(newRecordingIndex + 1));
          } else {
            // No more sentences available
            message.info('Đã hết câu gợi ý. Bạn có thể tiếp tục ghi âm hoặc nhấn Submit để hoàn thành.');
          }
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

        // Wait for state to update
        await new Promise(resolve => setTimeout(resolve, 100));

        // Keep the same custom sentence for next recording
        dispatch(setCurrentSentence(customSentence.trim()));
      }

      setIsPlaying(false);
      resetRecording();
    } catch (error: unknown) {
      console.error('Error uploading recording:', error);
      const errorMessage = error instanceof Error ? error.message : 'Không thể tải lên ghi âm. Vui lòng thử lại.';
      message.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleRetry = () => {
    setIsPlaying(false);
    resetRecording();
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const openEditSentenceModal = () => {
    if (mode !== 'existing') return;
    if (!currentSentenceId) {
      message.error('Không tìm thấy ID câu');
      return;
    }
    if (audioUrl) {
      message.info('Vui lòng nhấn "Thử lại" để reset bản ghi trước khi sửa câu.');
      return;
    }
    setEditingSentenceValue(currentSentence || '');
    setIsEditSentenceModalOpen(true);
  };

  const handleSaveEditedSentence = async () => {
    if (!currentSentenceId) {
      message.error('Không tìm thấy ID câu');
      return;
    }
    const nextValue = editingSentenceValue.trim();
    if (!nextValue) {
      message.warning('Vui lòng nhập nội dung câu');
      return;
    }
    if (nextValue === (currentSentence || '').trim()) {
      setIsEditSentenceModalOpen(false);
      return;
    }

    setSavingSentenceEdit(true);
    try {
      const res = await updateSentence(currentSentenceId, nextValue);
      const resAny = res as { PlainText?: string | null; Content?: string; content?: string };
      const updatedContent =
        (typeof resAny.PlainText === 'string' && resAny.PlainText.trim()) ||
        (resAny.Content ?? resAny.content ?? nextValue);
      dispatch(setCurrentSentence(updatedContent));
      message.success('Đã cập nhật câu thành công');
      setIsEditSentenceModalOpen(false);
    } catch (error: unknown) {
      const errAny = error as any;
      message.error(errAny?.message ?? 'Không thể cập nhật câu. Vui lòng thử lại.');
    } finally {
      setSavingSentenceEdit(false);
    }
  };

  const handleExit = () => {
    // Reset user state and navigate back to home page
    dispatch(resetUserState());
    clearPersistedUserData();
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
        {/* Header */}
        <div className="space-y-2 py-2">
          {/* Exit Button */}
          <div className="flex justify-end mb-1">
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
            onClick={() => setMode('existing')}
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
            <div className="bg-white rounded-[1rem] p-4 md:p-5 flex flex-col gap-2">
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
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                        <BookOutlined className="text-blue-600 text-xs" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-semibold tracking-[0.15em] text-blue-500 uppercase">
                          Câu gợi ý
                        </span>
                        <span className="text-[10px] text-gray-500">
                          Đọc to và rõ ràng theo đúng câu bên dưới
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={openEditSentenceModal}
                        disabled={!currentSentenceId || isRecording || uploading || !!audioUrl}
                        className="rounded-lg border border-gray-200 text-gray-700 hover:border-blue-300 hover:text-blue-600"
                        title={
                          audioUrl
                            ? 'Hãy nhấn "Thử lại" để reset bản ghi trước khi sửa câu'
                            : 'Sửa câu (cập nhật qua API)'
                        }
                      >
                        Sửa câu
                      </Button>
                      <Tag
                        color="blue"
                        className="px-2 py-0.5 text-xs font-semibold rounded-full border-0 bg-blue-50 text-blue-600"
                      >
                        Câu {currentRecordingIndex + 1}
                      </Tag>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                    <Text className="text-lg md:text-xl text-gray-900 font-semibold leading-relaxed">
                      {currentSentence || 'Đang tải...'}
                    </Text>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <Modal
          title="Sửa câu"
          open={isEditSentenceModalOpen}
          onCancel={() => {
            if (!savingSentenceEdit) setIsEditSentenceModalOpen(false);
          }}
          onOk={handleSaveEditedSentence}
          okText={savingSentenceEdit ? 'Đang lưu...' : 'Lưu'}
          cancelText="Hủy"
          confirmLoading={savingSentenceEdit}
          okButtonProps={{ disabled: savingSentenceEdit }}
          cancelButtonProps={{ disabled: savingSentenceEdit }}
          destroyOnClose
        >
          <Input.TextArea
            rows={4}
            value={editingSentenceValue}
            onChange={(e) => setEditingSentenceValue(e.target.value)}
            placeholder="Nhập nội dung câu bạn muốn chỉnh sửa..."
            disabled={savingSentenceEdit}
            className="rounded-xl border-gray-300 hover:border-blue-400 focus:border-blue-500 focus:shadow-sm transition-all text-base"
          />
          <div className="mt-2">
            <Text className="text-xs text-gray-500">
              Lưu ý: Việc sửa câu sẽ cập nhật nội dung câu trên hệ thống.
            </Text>
          </div>
        </Modal>

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

        {/* Recording Section - Fixed layout to prevent button movement (only for existing mode) */}
        {mode === 'existing' && !audioUrl && (
          <div className="flex flex-col" style={{ minHeight: '300px' }}>
            {/* Error alert for recording issues (e.g., permissions / unsupported) */}
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
            {/* Recording Waveform Container - Fixed height matching AudioWaveform */}
            <div style={{ height: '228px', overflow: 'hidden', marginBottom: '8px' }}>
              {isRecording && mediaStream ? (
                <RecordingWaveform mediaStream={mediaStream} isRecording={isRecording} />
              ) : (
                <div style={{ height: '100%' }} />
              )}
            </div>

            {/* Recording Button Container - Fixed position, always same location, moved down slightly */}
            <div className="flex flex-col items-center justify-center flex-1" style={{ minHeight: '140px', marginTop: '16px' }}>
              {/* Button - Fixed size, always in same position (same size for both states) */}
              <button
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                className={cn(
                  "rounded-full flex items-center justify-center text-white",
                  "transition-all duration-200",
                  "shadow-xl hover:shadow-2xl active:scale-95",
                  "focus:outline-none focus:ring-4 focus:ring-offset-2",
                  isRecording
                    ? "bg-red-500 hover:bg-red-600 ring-4 ring-red-200 focus:ring-red-300"
                    : "bg-blue-600 hover:bg-blue-700 ring-4 ring-blue-200 focus:ring-blue-300"
                )}
                style={{
                  width: '96px',
                  height: '96px',
                  minWidth: '96px',
                  minHeight: '96px',
                  maxWidth: '96px',
                  maxHeight: '96px',
                  flexShrink: 0
                }}
              >
                {isRecording ? (
                  <XFilled style={{ fontSize: '32px' }} />
                ) : (
                  <AudioOutlined style={{ fontSize: '32px' }} />
                )}
              </button>
              {/* Text below button - Fixed height to prevent layout shift */}
              <div className="h-6 mt-3 flex items-center justify-center px-4" style={{ minHeight: '24px' }}>
                <Text className={cn(
                  "text-xs md:text-sm font-medium transition-all duration-200 text-center",
                  isRecording ? "text-red-600" : "text-gray-500"
                )}>
                  {isRecording ? "Đang ghi âm... Nhấn để dừng" : "Nhấn để bắt đầu ghi âm"}
                </Text>
              </div>
            </div>
          </div>
        )}

        {/* Audio Waveform and Control Buttons Section (only for existing mode) */}
        {mode === 'existing' && audioUrl && !isRecording && (
          <div className="flex flex-col" style={{ minHeight: '300px' }}>
            {/* Audio Waveform Container - Fixed height matching RecordingWaveform */}
            <div style={{ height: '228px', marginBottom: '8px' }}>
              <AudioWaveform
                audioUrl={audioUrl}
                isPlaying={isPlaying}
                onPlay={handlePlayPause}
                onPause={handlePlayPause}
              />
            </div>

            {/* Control Buttons Container - Same position as recording button */}
            <div className="flex flex-col items-center justify-center flex-1" style={{ minHeight: '140px', marginTop: '16px' }}>
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
                  {uploading ? 'Đang tải lên...' : 'Tiếp tục →'}
                </Button>
              </div>
            </div>
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
