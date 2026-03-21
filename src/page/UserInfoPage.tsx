import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@/services/store/store';
import UserInfoModal from '@/components/UserInfoModal';
import { AudioOutlined } from '@ant-design/icons';
import { Button } from 'antd';

const UserInfoPage: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();
  const { userInfo } = useAppSelector((state) => state.user);

  useEffect(() => {
    // Nếu đã có thông tin người dùng, chuyển sang trang recording
    if (userInfo) {
      navigate('/recording');
    } else {
      // Tự động mở modal khi vào trang
      setModalOpen(true);
    }
  }, [userInfo, navigate]);

  const handleModalSuccess = () => {
    navigate('/recording');
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Login Button - Top Right */}
    <div className="fixed top-6 right-6 z-50">
        <Button
          type="primary"
          size="large"
          onClick={() => navigate('/login-user')}
          className="bg-blue-600 border-none hover:bg-blue-700 shadow-md hover:shadow-lg font-medium transition-all"
        >
          Xem Lại Bản Ghi
        </Button>
      </div>

      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center space-y-8 max-w-2xl mx-auto">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-32 h-32 bg-white/20 backdrop-blur-lg rounded-3xl flex items-center justify-center shadow-2xl transform hover:scale-110 transition-transform duration-300">
            <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center shadow-lg">
              <AudioOutlined className="text-5xl text-blue-600" />
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-4">
          <h1 className="text-5xl md:text-6xl font-bold text-white drop-shadow-lg">
            Ghi Âm
          </h1>
          <p className="text-xl md:text-2xl text-white/90 font-light">
            Hệ thống thu thập câu nói
          </p>
        </div>

        {/* Description */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-white/20 shadow-xl">
          <p className="text-white/90 text-lg leading-relaxed">
            Chào mừng bạn đến với hệ thống của chúng tôi.
            <br />
            Vui lòng cung cấp thông tin để bắt đầu.
          </p>
        </div>

        {/* CTA Button */}
        <button
          onClick={() => setModalOpen(true)}
          className="px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold text-lg shadow-2xl transform hover:scale-105 hover:shadow-3xl transition-all duration-300 hover:bg-blue-50"
        >
          Bắt đầu ngay
        </button>
      </div>

      {/* User Info Modal */}
      <UserInfoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
};

export default UserInfoPage;
