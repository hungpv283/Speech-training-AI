import React, { useState } from 'react';
import { Button, Input, Typography, message } from 'antd';
import { UserOutlined, LockOutlined, LoginOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { loginAdminWithPassword } from '@/services/features/autSlice';

const { Title, Text } = Typography;

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      message.warning('Vui lòng nhập đầy đủ thông tin đăng nhập');
      return;
    }

    setLoading(true);
    
    try {
      const response = await loginAdminWithPassword(username, password);
      
      if (response.token) {
        message.success(response.message || 'Đăng nhập thành công!');
        
        // Store token and user info
        localStorage.setItem('adminToken', response.token);
        localStorage.setItem('userUsername', username);
        localStorage.setItem('userRole', response.role || 'User');
        
        // Navigate based on role
        setTimeout(() => {
          if (response.role === 'Manager') {
            navigate('/manager/dashboard');
          } else {
            navigate('/admin/dashboard');
          }
        }, 500);
      } else {
        message.error(response.message || 'Đăng nhập thất bại');
        setLoading(false);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      message.error(error.message || 'Tên đăng nhập hoặc mật khẩu không chính xác');
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
            Đăng Nhập
          </Title>
          <Text className="text-lg md:text-xl text-gray-600 font-medium">
            Chào mừng bạn quay trở lại
          </Text>
        </div>

        {/* Login Form Card */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl p-[1px] shadow-md">
          <div className="bg-white rounded-[1rem] p-6 md:p-8 space-y-6">
            {/* Username Input */}
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
                placeholder="Nhập email"
                prefix={<UserOutlined className="text-gray-400" />}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={handleKeyPress}
                className="rounded-xl border-gray-300 hover:border-blue-400 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <LockOutlined className="text-blue-600" />
                </div>
                <span className="text-xs font-semibold tracking-[0.18em] text-blue-500 uppercase">
                  Mật khẩu
                </span>
              </div>
              <Input.Password
                size="large"
                placeholder="Nhập mật khẩu"
                prefix={<LockOutlined className="text-gray-400" />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              Đăng nhập
            </Button>
          </div>
        </div>

  
      </div>
    </div>
  );
};

export default LoginPage;