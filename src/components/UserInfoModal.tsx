import React, { useState } from 'react';
import { Modal, Input, Button, Typography, message } from 'antd';
import { UserOutlined, ManOutlined, WomanOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '@/services/store/store';
import { setUserInfo, createUser } from '@/services/features/userSlice';
import { cn } from '@/lib/utils';

const { Title, Text } = Typography;

interface UserInfoModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const UserInfoModal: React.FC<UserInfoModalProps> = ({ open, onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [emailError, setEmailError] = useState<string>('');
  const dispatch = useAppDispatch();
  const { creatingUser } = useAppSelector((state) => state.user);

  // Validate email format
  const validateEmail = (emailValue: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailValue);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    
    // Clear error when user starts typing
    if (emailError) {
      setEmailError('');
    }
  };

  const handleContinue = async () => {
    const trimmedEmail = email.trim();
    
    // Validate email format
    if (!trimmedEmail) {
      setEmailError('Vui lòng nhập email');
      return;
    }
    
    if (!validateEmail(trimmedEmail)) {
      setEmailError('Email không hợp lệ. Vui lòng nhập đúng định dạng email');
      return;
    }
    
    if (!gender) {
      return;
    }

    try {
      // Call API to create user and get userId
      const result = await dispatch(createUser({ email: trimmedEmail, gender })).unwrap();

      // Set user info with userId from API response
      dispatch(setUserInfo({ email: trimmedEmail, gender, userId: result.userId }));

      setEmail('');
      setGender(null);
      setEmailError('');
      onSuccess();
      onClose();
    } catch (error) {
      message.error('Không thể tạo người dùng. Vui lòng thử lại.');
      console.error('Error creating user:', error);
    }
  };

  const handleCancel = () => {
    setEmail('');
    setGender(null);
    setEmailError('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={handleCancel}
      footer={null}
      closable={true}
      maskClosable={false}
      width={600}
      className="user-info-modal"
      styles={{
        content: {
          borderRadius: '24px',
          overflow: 'hidden',
          padding: 0,
        },
        body: {
          padding: '48px 40px',
        },
      }}
    >
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <Title
            level={2}
            className="!mb-0 !text-3xl !font-bold !text-blue-600"
            style={{ letterSpacing: '-0.02em' }}
          >
            Xin chào!
          </Title>
          <Text className="text-gray-600 text-base">
            Bạn có thể cho chúng tôi biết thông tin của bạn
          </Text>
        </div>

        {/* Email Input */}
        <div className="space-y-2">
          <Text strong className="text-base block text-gray-700 font-semibold">
            Email của bạn <span className="text-red-500">*</span>
          </Text>
          <Input
            type="email"
            size="large"
            placeholder="Nhập email của bạn (ví dụ: example@gmail.com)"
            prefix={<UserOutlined className="text-gray-400" />}
            value={email}
            onChange={handleEmailChange}
            status={emailError ? 'error' : ''}
            className={cn(
              "h-12 rounded-xl border-gray-300 hover:border-blue-400 focus:border-blue-500 transition-colors",
              emailError && "border-red-500"
            )}
            onPressEnter={handleContinue}
            onBlur={() => {
              if (email.trim() && !validateEmail(email.trim())) {
                setEmailError('Email không hợp lệ. Vui lòng nhập đúng định dạng email');
              }
            }}
          />
          {emailError && (
            <Text type="danger" className="text-sm">
              {emailError}
            </Text>
          )}
        </div>

        {/* Gender Selection */}
        <div className="space-y-3">
          <Text strong className="text-base block text-gray-700 font-semibold">
            Giới tính
          </Text>
          <div className="grid grid-cols-2 gap-4">
            {/* Male Option */}
            <button
              onClick={() => setGender('male')}
              className={cn(
                "relative p-6 rounded-xl border-2 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg",
                "flex flex-col items-center gap-3 bg-white",
                gender === 'male'
                  ? "border-blue-500 bg-blue-50 shadow-md"
                  : "border-gray-200 hover:border-blue-300"
              )}
            >
              <div className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center transition-colors",
                gender === 'male' ? "bg-blue-100" : "bg-gray-100"
              )}>
                <ManOutlined className={cn(
                  "text-3xl transition-colors",
                  gender === 'male' ? "text-blue-600" : "text-gray-400"
                )} />
              </div>
              <Text strong className={cn(
                "text-base transition-colors font-semibold",
                gender === 'male' ? "text-blue-600" : "text-gray-600"
              )}>
                Nam
              </Text>
              {gender === 'male' && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
              )}
            </button>

            {/* Female Option */}
            <button
              onClick={() => setGender('female')}
              className={cn(
                "relative p-6 rounded-xl border-2 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg",
                "flex flex-col items-center gap-3 bg-white",
                gender === 'female'
                  ? "border-pink-500 bg-pink-50 shadow-md"
                  : "border-gray-200 hover:border-pink-300"
              )}
            >
              <div className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center transition-colors",
                gender === 'female' ? "bg-pink-100" : "bg-gray-100"
              )}>
                <WomanOutlined className={cn(
                  "text-3xl transition-colors",
                  gender === 'female' ? "text-pink-600" : "text-gray-400"
                )} />
              </div>
              <Text strong className={cn(
                "text-base transition-colors font-semibold",
                gender === 'female' ? "text-pink-600" : "text-gray-600"
              )}>
                Nữ
              </Text>
              {gender === 'female' && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-pink-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Continue Button */}
        <Button
          type="primary"
          size="large"
          block
          onClick={handleContinue}
          disabled={!email.trim() || !validateEmail(email.trim()) || !gender || creatingUser}
          loading={creatingUser}
          className={cn(
            "h-12 rounded-xl text-base font-semibold transition-all duration-300",
            "bg-blue-600 border-none hover:bg-blue-700",
            "hover:shadow-lg hover:scale-[1.01]",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          )}
        >
          {creatingUser ? 'Đang xử lý...' : 'Tiếp tục'}
        </Button>
      </div>
    </Modal>
  );
};

export default UserInfoModal;
