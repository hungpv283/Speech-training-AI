import React, { useState } from 'react';
import { Button, Input, Typography, message } from 'antd';
import { UserOutlined, LoginOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { loginAdmin, fetchUserData } from '@/services/features/autSlice';

const { Title } = Typography;

const LoginUser: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim()) {
      message.warning('Vui lòng nhập email');
      return;
    }

    setLoading(true);

    try {
      const loginResponse = await loginAdmin(email);

      if (loginResponse.token) {
        // Store token
        localStorage.setItem('userToken', loginResponse.token);
        localStorage.setItem('userEmail', email);

        // Decode JWT to get userId
        const tokenParts = loginResponse.token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          const userId = payload.userId || payload.userid;

          if (userId) {
            localStorage.setItem('userID', userId);

            // Fetch user data
            const userData = await fetchUserData(userId);
            localStorage.setItem('userName', userData.Name || email);
            localStorage.setItem('userRole', userData.Role || 'User');
          }
        }

        message.success('Đăng nhập thành công!');

        // Navigate to recording page
        setTimeout(() => {
          navigate('/user/profile');
        }, 500);
      } else {
        message.error(loginResponse.message || 'Đăng nhập thất bại');
        setLoading(false);
      }
    } catch (error: unknown) {
      console.error('Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Email không tồn tại hoặc không hợp lệ';
      message.error(errorMessage);
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen bg-white py-8 px-4 md:px-8 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-3 py-4">
          <Title
            level={1}
            className="!mb-0 !text-4xl md:!text-5xl !font-bold !text-blue-600"
            style={{ letterSpacing: '-0.02em' }}
          >
            Chào mừng bạn quay trở lại
          </Title>
        </div>

        {/* Login Form Card */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl p-[1px] shadow-md">
          <div className="bg-white rounded-[1rem] p-6 md:p-8 space-y-6">
            {/* Email Input */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <UserOutlined className="text-blue-600" />
                </div>
                <span className="text-xs font-semibold tracking-[0.18em] text-blue-500 uppercase">
                  Email
                </span>
              </div>
              <Input
                size="large"
                type="email"
                placeholder="Nhập Email"
                prefix={<UserOutlined className="text-gray-400" />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={handleKeyPress}
                className="rounded-xl border-gray-300 hover:border-blue-400 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Login Button */}
            <Button
              type="primary"
              size="large"
              icon={<LoginOutlined />}
              onClick={handleLogin}
              loading={loading}
              className="w-full h-12 rounded-xl bg-blue-600 border-none hover:bg-blue-700 shadow-md hover:shadow-lg font-medium transition-all text-base"
            >
              Xem Lại Lịch Sử Ghi Âm
            </Button>
          </div>
        </div>


      </div>
    </div>
  );
};

export default LoginUser;