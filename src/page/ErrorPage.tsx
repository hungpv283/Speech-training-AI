import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Typography } from 'antd';
import {
  HomeOutlined,
  LockOutlined,
  ExclamationCircleOutlined,
  DisconnectOutlined,
  FileSearchOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

type ErrorType = '403' | '404' | '500' | 'network' | 'default';

interface ErrorConfig {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  bgColor: string;
}

const ErrorPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const errorType = (searchParams.get('type') || 'default') as ErrorType;
  const customMessage = searchParams.get('message');

  const errorConfigs: Record<ErrorType, ErrorConfig> = {
    '403': {
      icon: <LockOutlined className="text-8xl" />,
      title: 'Truy Cập Bị Từ Chối',
      description: customMessage || 'Bạn không có quyền truy cập vào trang này. Vui lòng liên hệ quản trị viên nếu bạn cho rằng đây là lỗi.',
      color: 'text-orange-500',
      bgColor: 'bg-orange-50',
    },
    '404': {
      icon: <FileSearchOutlined className="text-8xl" />,
      title: 'Không Tìm Thấy Trang',
      description: customMessage || 'Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.',
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
    },
    '500': {
      icon: <ExclamationCircleOutlined className="text-8xl" />,
      title: 'Lỗi Máy Chủ',
      description: customMessage || 'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại sau.',
      color: 'text-red-500',
      bgColor: 'bg-red-50',
    },
    'network': {
      icon: <DisconnectOutlined className="text-8xl" />,
      title: 'Lỗi Kết Nối',
      description: customMessage || 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng của bạn.',
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
    },
    'default': {
      icon: <ExclamationCircleOutlined className="text-8xl" />,
      title: 'Đã Có Lỗi Xảy Ra',
      description: customMessage || 'Đã xảy ra lỗi không xác định. Vui lòng thử lại sau.',
      color: 'text-gray-500',
      bgColor: 'bg-gray-50',
    },
  };

  const config = errorConfigs[errorType];

  const handleGoHome = () => {
    const token = localStorage.getItem('adminToken');
    const userRole = localStorage.getItem('userRole');

    if (token) {
      // Redirect to dashboard based on role
      if (userRole === 'Manager') {
        navigate('/manager/dashboard');
      } else if (userRole === 'Admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/');
      }
    } else {
      // Not logged in, go to home page
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Error Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Icon Section */}
          <div className={`${config.bgColor} py-16 flex justify-center`}>
            <div className={`${config.color} animate-bounce`}>
              {config.icon}
            </div>
          </div>

          {/* Content Section */}
          <div className="p-8 md:p-12 text-center space-y-6">
            <Title level={2} className="!mb-0 !text-3xl md:!text-4xl !font-bold !text-gray-800">
              {config.title}
            </Title>

            <Text className="text-base md:text-lg text-gray-600 block leading-relaxed">
              {config.description}
            </Text>

            {/* Action Buttons */}
            <div className="pt-6 flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                type="primary"
                size="large"
                icon={<HomeOutlined />}
                onClick={handleGoHome}
                className="h-12 px-8 rounded-xl bg-blue-600 border-none hover:bg-blue-700 shadow-md hover:shadow-lg font-medium transition-all text-base"
              >
                Về Trang Chủ
              </Button>

              <Button
                size="large"
                onClick={() => navigate(-1)}
                className="h-12 px-8 rounded-xl border-2 border-gray-300 hover:border-blue-500 hover:text-blue-600 font-medium transition-all text-base"
              >
                Quay Lại
              </Button>
            </div>

            {/* Additional Info */}
            <div className="pt-8 border-t border-gray-200">
              <Text className="text-sm text-gray-500">
                Nếu vấn đề vẫn tiếp diễn, vui lòng liên hệ với bộ phận hỗ trợ
              </Text>
            </div>
          </div>
        </div>
{/* Additional Info
            <div className="pt-8 border-t border-gray-200">
              <Text className="text-sm text-gray-500">
                Nếu vấn đề vẫn tiếp diễn, vui lòng liên hệ với bộ phận hỗ trợ
              </Text>
            </div>
          </div>
        </div> */}
        {/* Decorative Elements */}
        <div className="mt-8 text-center">
          <Text className="text-sm text-gray-400">
            © 2026 SpeechSwitch. All rights reserved.
          </Text>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;