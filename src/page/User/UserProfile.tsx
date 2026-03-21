import React, { useEffect, useState } from 'react';
import { Layout, Card, Descriptions, Statistic, Row, Col, Table, Tag, Typography, Spin, message } from 'antd';
import {  ClockCircleOutlined, CheckCircleOutlined, FileTextOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axiosInstance from '@/services/constant/axiosInstance';
import SidebarUser from '@/components/SidebarUser';

const { Title } = Typography;
const { Content } = Layout;

interface Sentence {
  SentenceID: string;
  Content: string;
}

interface CreatedSentence {
  SentenceID: string;
  Content: string;
  Status: number;
  CreatedAt: string;
}

interface UserData {
  PersonID: string;
  Email: string;
  Gender: string;
  Role: string;
  CreatedAt: string;
  SentencesDone: Sentence[];
  TotalRecordingDuration: number;
  TotalSentencesDone: number;
  TotalContributedByUser: number;
  CreatedSentences: CreatedSentence[];
}

const UserProfile: React.FC = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const userId = localStorage.getItem('userID') || localStorage.getItem('PersonID');

      if (!userId) {
        message.error('Không tìm thấy ID người dùng');
        return;
      }

      const response = await axiosInstance.get(`/users/${userId}`);
      
      if (response.data?.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
        setUserData(response.data.data[0]);
        message.success('Tải thông tin thành công');
      } else {
        message.error('Không tìm thấy dữ liệu người dùng');
      }
    } catch (error: any) {
      console.error('Error fetching user data:', error);
      message.error('Không thể tải thông tin người dùng');
    } finally {
      setLoading(false);
    }
  };

  const sentencesDoneColumns = [
    {
      title: 'STT',
      key: 'index',
      width: 60,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: 'Nội dung câu',
      dataIndex: 'Content',
      key: 'Content',
    },
    
  ];

  const createdSentencesColumns = [
    {
      title: 'STT',
      key: 'index',
      width: 60,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: 'Nội dung câu',
      dataIndex: 'Content',
      key: 'Content',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'Status',
      key: 'Status',
      width: 120,
      render: (status: number) => {
        const statusMap: { [key: number]: { text: string; color: string } } = {
          0: { text: 'Chờ duyệt', color: 'orange' },
          1: { text: 'Đã duyệt', color: 'green' },
          2: { text: 'Từ chối', color: 'red' },
        };
        const info = statusMap[status] || { text: 'Không rõ', color: 'default' };
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'CreatedAt',
      key: 'CreatedAt',
      width: 180,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    },
  ];

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds === 0) return '0 giây';
    if (seconds < 60) return `${seconds.toFixed(2)} giây`;
    const minutes = Math.floor(seconds / 60);
    const remaining = (seconds % 60).toFixed(0);
    return `${minutes} phút ${remaining} giây`;
  };

  if (loading) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <SidebarUser />
        <Layout>
          <Content style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
            <Spin size="large" tip="Đang tải thông tin..." fullscreen />
          </Content>
        </Layout>
      </Layout>
    );
  }

  if (!userData) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <SidebarUser />
        <Layout>
          <Content style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
            <Title level={4}>Không tìm thấy thông tin người dùng</Title>
          </Content>
        </Layout>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <SidebarUser />
      <Layout style={{ background: '#f5f5f5' }}>
        <Content style={{ padding: '24px' }}>
          <div className="max-w-7xl mx-auto" style={{ marginTop: 0 }}>
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-4 text-white shadow-lg mb-4">
              <Title level={2} className="!text-white !mb-1">
                Thông tin cá nhân
              </Title>
              <p className="text-blue-100 mb-0">
                Quản lý thông tin và hoạt động đóng góp của bạn
              </p>
            </div>

            <Card
              title={
                <div className="flex items-center gap-3">
                  
                  <div>
                    <span className="font-semibold">Thông tin tài khoản</span>
                    
                  </div>
                </div>
              }
              className="shadow-md mb-4 rounded-2xl border border-gray-100"
            >
              <Descriptions column={{ xs: 1, sm: 2, md: 2 }} size="middle">
                <Descriptions.Item label="Email">{userData.Email}</Descriptions.Item>
                <Descriptions.Item label="Giới tính">{userData.Gender === 'Male' ? 'Nam' : 'Nữ'}</Descriptions.Item>
                <Descriptions.Item label="Ngày tạo">
                  {dayjs(userData.CreatedAt).format('DD/MM/YYYY HH:mm')}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Row gutter={[16, 16]} className="mb-4">
              <Col xs={24} sm={8}>
                <Card className="shadow-md hover:shadow-lg transition-shadow">
                  <Statistic
                    title="Tổng thời gian thu âm"
                    value={formatDuration(userData.TotalRecordingDuration || 0)}
                    prefix={<ClockCircleOutlined />}
                    valueStyle={{ color: '#3f8600', fontSize: '1.5rem' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card className="shadow-md hover:shadow-lg transition-shadow">
                  <Statistic
                    title="Tổng câu đã thu"
                    value={userData.TotalSentencesDone || 0}
                    prefix={<CheckCircleOutlined />}
                    valueStyle={{ color: '#1890ff', fontSize: '1.5rem' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card className="shadow-md hover:shadow-lg transition-shadow">
                  <Statistic
                    title="Tổng câu đã đóng góp"
                    value={userData.TotalContributedByUser || 0}
                    prefix={<FileTextOutlined />}
                    valueStyle={{ color: '#cf1322', fontSize: '1.5rem' }}
                  />
                </Card>
              </Col>
            </Row>

            <Card
              title={
                <span>
                  <CheckCircleOutlined className="mr-2" />
                  Danh sách câu đã thu ({userData.SentencesDone?.length || 0})
                </span>
              }
              className="shadow-md mb-4"
            >
              <Table
                columns={sentencesDoneColumns}
                dataSource={userData.SentencesDone || []}
                rowKey="SentenceID"
                pagination={{
                  defaultPageSize: 10,
                  showSizeChanger: true,
                  pageSizeOptions: [10, 20, 30, 50],
                  showTotal: (total) => `Tổng ${total} câu`,
                }}
                scroll={{ x: 800 }}
                locale={{ emptyText: 'Chưa có câu nào được thu' }}
              />
            </Card>

            <Card
              title={
                <span>
                  <FileTextOutlined className="mr-2" />
                  Danh sách câu đã tạo ({userData.CreatedSentences?.length || 0})
                </span>
              }
              className="shadow-md"
            >
              <Table
                columns={createdSentencesColumns}
                dataSource={userData.CreatedSentences || []}
                rowKey="SentenceID"
                pagination={{
                  defaultPageSize: 10,
                  showSizeChanger: true,
                  pageSizeOptions: [10, 20, 30, 50],
                  showTotal: (total) => `Tổng ${total} câu`,
                }}
                scroll={{ x: 800 }}
                locale={{ emptyText: 'Chưa có câu nào được tạo' }}
              />
            </Card>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default UserProfile;
