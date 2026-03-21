import React, { useEffect, useState } from 'react';
import { Button } from 'antd';
import { AudioOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/services/store/store';
import { resetUserState } from '@/services/features/userSlice';
import { store } from '@/services/store/store';

const ThankYouPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { userInfo, recordings } = useAppSelector((state) => state.user);
  const [recordingCount, setRecordingCount] = useState(() => {
    // Get initial count directly from store to ensure accuracy
    const state = store.getState();
    return state.user.recordings.length;
  });

  // Ensure we get the latest recording count - check multiple times to catch state updates
  useEffect(() => {
    // Get count directly from store for maximum accuracy
    const updateCount = () => {
      const state = store.getState();
      const count = state.user.recordings.length;
      setRecordingCount(count);
    };

    // Set initial value
    updateCount();

    // Check again after short delays to catch any late state updates
    const timeout1 = setTimeout(updateCount, 50);
    const timeout2 = setTimeout(updateCount, 200);
    const timeout3 = setTimeout(updateCount, 500);

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
    };
  }, [recordings.length]);

  const handleBackHome = () => {
    // Reset toàn bộ trạng thái user để có thể nhập lại từ đầu
    dispatch(resetUserState());
    navigate('/');
  };

  if (!userInfo) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-2xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 md:p-12 border border-white/20 shadow-2xl text-center space-y-8">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-32 h-32 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center shadow-xl transform hover:scale-110 transition-transform duration-300">
                <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                  <AudioOutlined className="text-5xl text-blue-600" />
                </div>
              </div>
              {/* Success Checkmark Animation */}
              <div className="absolute -top-2 -right-2 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>



          {/* Message */}
          <h1 className="text-3xl md:text-4xl text-white/90 font-light">
            Cảm ơn <span className="font-semibold text-blue-600">{userInfo.email}</span> đã hoàn thành
          </h1>

          {/* Recording Count */}
          <div className="space-y-2">
            <div className="text-7xl md:text-8xl font-bold text-white drop-shadow-lg">
              {recordingCount || recordings.length}
            </div>
            <p className="text-2xl md:text-3xl text-white/90 font-light">
              câu ghi âm
            </p>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">

            <Button
              size="large"
              onClick={handleBackHome}
              className="h-14 px-8 rounded-xl border-2 border-white/80 text-white text-lg font-semibold bg-transparent hover:bg-white/10 hover:border-white shadow-2xl transition-all duration-300"
            >
              Về trang bắt đầu
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThankYouPage;
