import React, { useState, useEffect } from 'react';
import { Typography, Table, Button, Space, Spin, Empty, Modal, Form, Input, message, Popconfirm, Row, Col, Tag, Select } from 'antd';
import { FileTextOutlined, CheckCircleOutlined, EditOutlined, DeleteOutlined, CloseCircleOutlined } from '@ant-design/icons';
import SidebarManager from '@/components/SidebarManager';
import { getSentencesWithMeta, createSentence, updateSentence, deleteSentence, approveSentence, rejectSentence, Sentence } from '@/services/features/recordingSlice';

const { Title, Text } = Typography;
const { TextArea } = Input;

const ManagerSentences: React.FC = () => {
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [loadingSentences, setLoadingSentences] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingSentence, setEditingSentence] = useState<Sentence | null>(null);
  const [statusFilter, setStatusFilter] = useState<number | null>(null);
  const [form] = Form.useForm();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalSentencesCount, setTotalSentencesCount] = useState(0);
  const [approvedCountFromApi, setApprovedCountFromApi] = useState<number | null>(null);
  const [pendingCountFromApi, setPendingCountFromApi] = useState<number | null>(null);
  const [recordedCountFromApi, setRecordedCountFromApi] = useState<number | null>(null);
  const [rejectedCountFromApi, setRejectedCountFromApi] = useState<number | null>(null);

  useEffect(() => {
    setPage(1); // Reset về trang 1 khi filter thay đổi
  }, [statusFilter]);

  useEffect(() => {
    fetchSentences(page, pageSize, statusFilter);
  }, [page, pageSize, statusFilter]);

  const fetchSentences = async (pageParam: number, limitParam: number, status?: number | null) => {
    setLoadingSentences(true);
    try {
      const res = await getSentencesWithMeta({ 
        page: pageParam, 
        limit: limitParam,
        status: status !== null && status !== undefined ? status : undefined
      });
      setSentences(res.data);
      setTotalSentencesCount(res.totalCount ?? res.data.length);

      // Lấy meta từ API response
      const resAny = res as { approvedCount?: number; pendingCount?: number; recordedCount?: number; rejectedCount?: number };
      if (typeof resAny.approvedCount === 'number') {
        setApprovedCountFromApi(resAny.approvedCount);
      }
      if (typeof resAny.pendingCount === 'number') {
        setPendingCountFromApi(resAny.pendingCount);
      }
      if (typeof resAny.recordedCount === 'number') {
        setRecordedCountFromApi(resAny.recordedCount);
      }
      if (typeof resAny.rejectedCount === 'number') {
        setRejectedCountFromApi(resAny.rejectedCount);
      }
    } catch (error) {
      console.error('Failed to fetch sentences:', error);
      message.error('Không thể tải danh sách câu');
    } finally {
      setLoadingSentences(false);
    }
  };

  const handleEditSentence = (sentence: Sentence) => {
    setEditingSentence(sentence);
    form.setFieldsValue({ content: sentence.Content });
    setIsModalVisible(true);
  };

  const handleDeleteSentence = async (sentenceId: string) => {
    try {
      await deleteSentence(sentenceId);
      message.success('Xóa câu thành công');
      fetchSentences(page, pageSize, statusFilter);
    } catch (error) {
      console.error('Failed to delete sentence:', error);
      message.error('Xóa câu thất bại');
    }
  };

  const handleApproveSentence = async (sentenceId: string) => {
    try {
      await approveSentence(sentenceId);
      message.success('Duyệt câu thành công');
      fetchSentences(page, pageSize, statusFilter);
    } catch (error) {
      console.error('Failed to approve sentence:', error);
      message.error('Duyệt câu thất bại');
    }
  };

  const handleRejectSentence = async (sentenceId: string) => {
    try {
      await rejectSentence(sentenceId);
      message.success('Từ chối câu thành công');
      fetchSentences(page, pageSize, statusFilter);
    } catch (error) {
      console.error('Failed to reject sentence:', error);
      message.error('Từ chối câu thất bại');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingSentence) {
        await updateSentence(editingSentence.SentenceID, values.content);
        message.success('Cập nhật câu thành công');
      } else {
        await createSentence(values.content);
        message.success('Tạo câu mới thành công');
      }
      setIsModalVisible(false);
      form.resetFields();
      fetchSentences(page, pageSize, statusFilter);
    } catch (error: unknown) {
      console.error('Full error object:', error);
      
      // Error từ backend là object được throw ra trực tiếp
      const errorObj = error as { duplicates?: Array<{ content: string }>; message?: string };
      const duplicates = errorObj?.duplicates || [];
      const errorMessage = errorObj?.message || '';
      
      console.log('Duplicates:', duplicates);
      console.log('Message:', errorMessage);
      
      if (duplicates && duplicates.length > 0) {
        Modal.error({
          title: 'Câu bị trùng lặp',
          content: (
            <div>
              <p><strong>Tìm thấy {duplicates.length} câu trùng:</strong></p>
              <ul style={{ marginLeft: '20px', marginTop: '10px' }}>
                {duplicates.map((dup, index: number) => (
                  <li key={index} style={{ marginBottom: '8px' }}>
                    {dup.content}
                  </li>
                ))}
              </ul>
            </div>
          ),
          okText: 'OK',
        });
      } else {
        message.error('Lưu câu thất bại');
      }
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
    setEditingSentence(null);
  };

  const sentenceColumns = [
    {
      title: 'Nội dung',
      dataIndex: 'Content',
      key: 'Content',
      render: (text: string) => <span className="text-gray-900">{text}</span>,
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 250,
      render: (_: unknown, record: Sentence) => (
        <Space size="small">
          {record.Status === 0 ? (
            <>
              <Button
                icon={<CheckCircleOutlined />}
                size="small"
                onClick={() => handleApproveSentence(record.SentenceID)}
                className="rounded-full bg-green-500 hover:bg-green-600 border-green-500 text-white"
                style={{ backgroundColor: '#22c55e', borderColor: '#22c55e' }}
              >
                Duyệt
              </Button>
              <Button
                danger
                icon={<CloseCircleOutlined />}
                size="small"
                onClick={() => handleRejectSentence(record.SentenceID)}
                className="rounded-full"
              >
                Từ chối
              </Button>
            </>
          ) : (
            <>
              <Button
                icon={<EditOutlined />}
                size="small"
                onClick={() => handleEditSentence(record)}
                className="rounded-full bg-blue-500 hover:bg-blue-600 border-blue-500 text-white"
                style={{ backgroundColor: '#3b82f6', borderColor: '#3b82f6' }}
              >
                Sửa
              </Button>
              <Popconfirm
                title="Xóa câu này?"
                description="Bạn có chắc chắn muốn xóa câu này không?"
                onConfirm={() => handleDeleteSentence(record.SentenceID)}
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
              >
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  size="small"
                  className="rounded-full"
                >
                  Xóa
                </Button>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'Status',
      key: 'Status',
      width: 150,
      render: (status: number) => {
        const statusConfig: { [key: number]: { color: string; label: string } } = {
          0: { color: 'default', label: 'Chờ duyệt' },
          1: { color: 'green', label: 'Đã duyệt' },
          2: { color: 'blue', label: 'Đã thu âm' },
          3: { color: 'red', label: 'Bị từ chối' },
        };
        const config = statusConfig[status] || { color: 'default', label: 'Unknown' };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'CreatedAt',
      key: 'CreatedAt',
      width: 180,
      render: (date: string) => {
        if (!date) return '-';
        return new Date(date).toLocaleString('vi-VN');
      },
    },
  ];

  // Thống kê từ API meta (ưu tiên) hoặc tính từ mảng sentences (fallback)
  const totalSentences = totalSentencesCount || sentences.length;
  const approvedSentences =
    approvedCountFromApi !== null
      ? approvedCountFromApi
      : sentences.filter((s) => s.Status === 1).length;
  const pendingSentences =
    pendingCountFromApi !== null
      ? pendingCountFromApi
      : sentences.filter((s) => s.Status === 0).length;
  const recordedSentences =
    recordedCountFromApi !== null
      ? recordedCountFromApi
      : sentences.filter((s) => s.Status === 2).length;
  const rejectedSentences =
    rejectedCountFromApi !== null
      ? rejectedCountFromApi
      : sentences.filter((s) => s.Status === 3).length;

  return (
    <div className="flex">
      <SidebarManager />
      <div className="flex-1 min-h-screen bg-gray-50 py-8 px-4 md:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-3 py-4">
            <Title
              level={1}
              className="!mb-0 !text-4xl md:!text-5xl !font-bold !text-blue-600"
              style={{ letterSpacing: '-0.02em' }}
            >
              Quản Lý Câu
            </Title>
          </div>

          {/* Statistics Grid (match Dashboard) */}
          <Row gutter={[12, 12]} className="mb-2">
            <Col xs={12} sm={12} md={4} lg={4}>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <Text className="text-xs text-gray-500 font-medium block mb-1">Tổng câu</Text>
                    <Text className="text-2xl font-bold text-blue-600">{totalSentences}</Text>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                    <FileTextOutlined className="text-xl text-blue-600" />
                  </div>
                </div>
              </div>
            </Col>

            <Col xs={12} sm={12} md={4} lg={4}>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-green-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <Text className="text-xs text-gray-500 font-medium block mb-1">Đã duyệt</Text>
                    <Text className="text-2xl font-bold text-green-600">{approvedSentences}</Text>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                    <CheckCircleOutlined className="text-xl text-green-600" />
                  </div>
                </div>
              </div>
            </Col>

            <Col xs={12} sm={12} md={4} lg={4}>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-amber-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <Text className="text-xs text-gray-500 font-medium block mb-1">Chờ duyệt</Text>
                    <Text className="text-2xl font-bold text-amber-600">{pendingSentences}</Text>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                    <CloseCircleOutlined className="text-xl text-amber-600" />
                  </div>
                </div>
              </div>
            </Col>

            <Col xs={12} sm={12} md={4} lg={4}>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-purple-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <Text className="text-xs text-gray-500 font-medium block mb-1">Đã thu âm</Text>
                    <Text className="text-2xl font-bold text-purple-600">{recordedSentences}</Text>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                    <FileTextOutlined className="text-xl text-purple-600" />
                  </div>
                </div>
              </div>
            </Col>

            <Col xs={12} sm={12} md={4} lg={4}>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-pink-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <Text className="text-xs text-gray-500 font-medium block mb-1">Bị từ chối</Text>
                    <Text className="text-2xl font-bold text-pink-600">{rejectedSentences}</Text>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-pink-100 flex items-center justify-center">
                    <CloseCircleOutlined className="text-xl text-pink-600" />
                  </div>
                </div>
              </div>
            </Col>
          </Row>

          {/* Table */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700">Lọc theo trạng thái:</span>
                    <Select
                      placeholder="Chọn trạng thái"
                      style={{ width: 200 }}
                      allowClear
                      value={statusFilter}
                      onChange={setStatusFilter}
                      options={[
                        { label: 'Tất cả', value: null },
                        { label: 'Chờ duyệt', value: 0 },
                        { label: 'Đã duyệt', value: 1 },
                        { label: 'Đã thu âm', value: 2 },
                        { label: 'Bị từ chối', value: 3 },
                      ]}
                    />
                  </div>
                </div>
               
              
              </div>
              {loadingSentences ? (
                <div className="flex justify-center py-12">
                  <Spin size="large" />
                </div>
              ) : sentences.length > 0 ? (
                <Table
                  columns={sentenceColumns}
                  dataSource={sentences}
                  rowKey="SentenceID"
                  pagination={{
                    current: page,
                    pageSize,
                    total: totalSentencesCount,
                    pageSizeOptions: [10, 20, 50, 100],
                    showSizeChanger: true,
                    responsive: true,
                    onChange: (p, size) => {
                      setPage(p);
                      setPageSize(size);
                    },
                  }}
                  scroll={{ x: 800 }}
                />
              ) : (
                <Empty description="Chưa có câu nào" style={{ marginTop: 50 }} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal for Create/Edit Sentence */}
      <Modal
        title={editingSentence ? 'Chỉnh sửa câu' : 'Tạo câu mới'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        okText={editingSentence ? 'Cập nhật' : 'Tạo'}
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="content"
            label="Nội dung câu"
            rules={[{ required: true, message: 'Vui lòng nhập nội dung câu' }]}
          >
            <TextArea rows={4} placeholder="Nhập nội dung câu..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ManagerSentences;
