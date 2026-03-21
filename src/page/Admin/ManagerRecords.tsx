import React, { useState, useEffect } from 'react';
import { Typography, Table, Button, Space, Spin, Empty, Row, Col, Tag, Select, Input, message, Popconfirm, Modal, Form } from 'antd';
import { AudioOutlined, CheckCircleOutlined, PlayCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, DownloadOutlined, SearchOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import Sidebar from '@/components/Sidebar';
import { getRecordingsWithMeta, approveRecording, rejectRecording, deleteRecording, updateSentence, downloadSentences, Recording } from '@/services/features/recordingSlice';
import axiosInstance from '@/services/constant/axiosInstance';

const { Title, Text } = Typography;
const { TextArea } = Input;

const ManagerRecords: React.FC = () => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loadingRecordings, setLoadingRecordings] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [recordingStatusFilter, setRecordingStatusFilter] = useState<number | null>(null);
  const [emailSearch, setEmailSearch] = useState<string>('');
  const [downloading, setDownloading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecordingsCount, setTotalRecordingsCount] = useState(0);
  const [approvedCountFromApi, setApprovedCountFromApi] = useState<number | null>(null);
  const [pendingCountFromApi, setPendingCountFromApi] = useState<number | null>(null);
  const [rejectedCountFromApi, setRejectedCountFromApi] = useState<number | null>(null);

  // Approve all loading state
  const [approvingAll, setApprovingAll] = useState(false);
  
  // Refresh key for force re-render
  const [refreshKey, setRefreshKey] = useState(0);

  // Edit sentence modal state
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingSentenceId, setEditingSentenceId] = useState<string | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    setPage(1); // Reset về trang 1 khi filter thay đổi
  }, [recordingStatusFilter, emailSearch]);

  useEffect(() => {
    fetchRecordings(page, pageSize, recordingStatusFilter, emailSearch);
  }, [page, pageSize, recordingStatusFilter, emailSearch]);

  const fetchRecordings = async (pageParam: number, limitParam: number, status?: number | null, email?: string) => {
    setLoadingRecordings(true);
    try {
      const res = await getRecordingsWithMeta({
        page: pageParam,
        limit: limitParam,
        isApproved: status !== null && status !== undefined ? status : undefined,
        email: email && email.trim() !== '' ? email.trim() : undefined
      });
      setRecordings(res.data);
      setTotalRecordingsCount(res.totalCount ?? res.data.length);

      // Lấy meta từ API response
      const resAny = res as { approvedCount?: number; pendingCount?: number; rejectedCount?: number };
      if (typeof resAny.approvedCount === 'number') {
        setApprovedCountFromApi(resAny.approvedCount);
      }
      if (typeof resAny.pendingCount === 'number') {
        setPendingCountFromApi(resAny.pendingCount);
      }
      if (typeof resAny.rejectedCount === 'number') {
        setRejectedCountFromApi(resAny.rejectedCount);
      }
    } catch (error) {
      console.error('Failed to fetch recordings:', error);
    } finally {
      setLoadingRecordings(false);
    }
  };

  const handlePlay = (audioUrl: string | null, id: string) => {
    if (!audioUrl) return;

    if (playingId === id) {
      setPlayingId(null);
    } else {
      setPlayingId(id);
      const audio = new Audio(audioUrl);
      audio.onended = () => setPlayingId(null);
      audio.play();
    }
  };

  const handleApproveRecording = async (recordingId: string) => {
    try {
      await approveRecording(recordingId);
      fetchRecordings(page, pageSize, recordingStatusFilter, emailSearch);
    } catch (error) {
      console.error('Failed to approve recording:', error);
    }
  };

  const handleRejectRecording = async (recordingId: string) => {
    try {
      await rejectRecording(recordingId);
      fetchRecordings(page, pageSize, recordingStatusFilter, emailSearch);
    } catch (error) {
      console.error('Failed to reject recording:', error);
    }
  };

  const handleDeleteRecording = async (recordingId: string) => {
    try {
      await deleteRecording(recordingId);
      message.success('Recording và sentence đã được xóa thành công');
      fetchRecordings(page, pageSize, recordingStatusFilter, emailSearch);
    } catch (error) {
      console.error('Failed to delete recording:', error);
      message.error('Xóa recording thất bại');
    }
  };

  // Edit sentence handlers
  const handleOpenEditSentence = (sentenceId: string, currentContent: string | null | undefined) => {
    setEditingSentenceId(sentenceId);
    form.setFieldsValue({ content: currentContent || '' });
    setIsEditModalVisible(true);
  };

  const handleSaveEditSentence = async () => {
    try {
      const values = await form.validateFields();
      if (editingSentenceId) {
        await updateSentence(editingSentenceId, values.content);
        message.success('Cập nhật câu thành công');
        setIsEditModalVisible(false);
        form.resetFields();
        fetchRecordings(page, pageSize, recordingStatusFilter, emailSearch);
      }
    } catch (error) {
      console.error('Failed to update sentence:', error);
      message.error('Cập nhật câu thất bại');
    }
  };

  const handleCancelEditSentence = () => {
    setIsEditModalVisible(false);
    form.resetFields();
    setEditingSentenceId(null);
  };

  const handleApproveAll = async () => {
    if (!emailSearch || emailSearch.trim() === '') {
      message.warning('Vui lòng nhập email để duyệt');
      return;
    }
    setApprovingAll(true);
    try {
      const response = await axiosInstance.post('users/approve-recordings', { email: emailSearch });
      const data = response.data;

      // Hiển thị thông tin chi tiết từ API response
      message.success({
        content: data.message || `Đã duyệt ${data.modifiedCount} bản ghi thành công`,
        duration: 4,
      });

      fetchRecordings(page, pageSize, recordingStatusFilter, emailSearch);
    } catch (error) {
      console.error('Failed to approve all recordings:', error);
      message.error('Không thể duyệt tất cả bản ghi');
    } finally {
      setApprovingAll(false);
    }
  };

  const handleDownloadAll = async () => {
    setDownloading(true);
    try {
      const blob = await downloadSentences({ mode: 'all' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `all-audio-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download all audio:', error);
    } finally {
      setDownloading(false);
    }
  };

  const recordingColumns = [
    {
      title: 'Email',
      dataIndex: 'Email',
      key: 'Email',
      width: 150,
      ellipsis: true,
      render: (email: string | null | undefined) => {
        return <span className="font-medium text-gray-900">{email || 'Ẩn danh'}</span>;
      },
    },
    {
      title: 'Nội dung câu',
      dataIndex: 'Content',
      key: 'Content',
      width: 400,
      ellipsis: true,
      render: (content: string | null | undefined) => {
        return <span className="text-gray-900">{content || 'Unknown'}</span>;
      },
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 350,
      fixed: 'right' as const,
      align: 'center' as const,
      render: (_: unknown, record: Recording) => (
        <Space size={2} wrap>
          <Button
            type={playingId === record.RecordingID ? 'primary' : 'default'}
            icon={<PlayCircleOutlined />}
            size="small"
            onClick={() => handlePlay(record.AudioUrl, record.RecordingID)}
            className={`rounded-full ${playingId === record.RecordingID ? 'bg-blue-500 hover:bg-blue-600 border-blue-500' : 'hover:border-blue-400'}`}
          >
            {playingId === record.RecordingID ? 'Đang phát' : 'Phát'}
          </Button>
          {(record.IsApproved === 0 || record.IsApproved === false || record.IsApproved === null) && (
            <>
              <Button
                icon={<CheckCircleOutlined />}
                size="small"
                onClick={() => handleApproveRecording(record.RecordingID)}
                className="rounded-full bg-blue-500 hover:bg-blue-600 border-blue-500 text-white"
                style={{ backgroundColor: '#3b82f6', borderColor: '#3b82f6' }}
              >
                Duyệt
              </Button>
              <Button
                danger
                icon={<CloseCircleOutlined />}
                size="small"
                onClick={() => handleRejectRecording(record.RecordingID)}
                className="rounded-full"
              >
                Từ chối
              </Button>
            </>
          )}
          {(record.IsApproved === 0 || record.IsApproved === 1) && (
            <Button
              icon={<EditOutlined />}
              size="small"
              onClick={() => handleOpenEditSentence(record.SentenceID, record.Content)}
              className="rounded-full bg-orange-500 hover:bg-orange-600 border-orange-500 text-white"
              style={{ backgroundColor: '#f97316', borderColor: '#f97316' }}
            >
              Sửa
            </Button>
          )}
          <Popconfirm
            title="Xóa recording này?"
            description="Bạn có chắc chắn muốn xóa recording và sentence này không?"
            onConfirm={() => handleDeleteRecording(record.RecordingID)}
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
        </Space>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'IsApproved',
      key: 'IsApproved',
      width: 100,
      render: (isApproved: number | boolean | null) => {
        const statusConfig: { [key: number]: { color: string; label: string } } = {
          0: { color: 'gold', label: 'Chờ duyệt' },
          1: { color: 'green', label: 'Đã duyệt' },
          2: { color: 'red', label: 'Bị từ chối' },
          3: { color: 'orange', label: 'Trùng lặp' },
        };
        const status = typeof isApproved === 'number' ? isApproved : (isApproved ? 1 : 0);
        const config = statusConfig[status] || { color: 'default', label: 'Unknown' };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
  ];

  // Thống kê từ API meta (ưu tiên) hoặc tính từ mảng recordings (fallback)
  const totalRecorded = totalRecordingsCount || recordings.length;
  const approvedCount =
    approvedCountFromApi !== null
      ? approvedCountFromApi
      : recordings.filter((r) => r.IsApproved === 1 || r.IsApproved === true).length;
  const pendingRecordings =
    pendingCountFromApi !== null
      ? pendingCountFromApi
      : recordings.filter((r) => r.IsApproved === 0 || r.IsApproved === false || r.IsApproved === null).length;
  const rejectedCount =
    rejectedCountFromApi !== null
      ? rejectedCountFromApi
      : recordings.filter((r) => r.IsApproved === 2).length;

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 min-h-screen bg-gray-50 py-8 px-4 md:px-8">
        <div className="max-w-7xl mx-auto space-y-8">{/* Header */}
          <div className="text-center space-y-3 py-4">
            <Title
              level={1}
              className="!mb-0 !text-4xl md:!text-5xl !font-bold !text-blue-600"
              style={{ letterSpacing: '-0.02em' }}
            >
              Quản Lý Ghi Âm
            </Title>
          </div>

          {/* Statistics Grid (match Dashboard) */}
          <Row gutter={[12, 12]} className="mb-2">
            <Col xs={12} sm={12} md={4} lg={4}>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <Text className="text-xs text-gray-500 font-medium block mb-1">Tổng bản ghi</Text>
                    <Text className="text-2xl font-bold text-blue-600">{totalRecorded}</Text>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                    <AudioOutlined className="text-xl text-blue-600" />
                  </div>
                </div>

              </div>
            </Col>

            <Col xs={12} sm={12} md={4} lg={4}>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-green-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <Text className="text-xs text-gray-500 font-medium block mb-1">Đã duyệt</Text>
                    <Text className="text-2xl font-bold text-green-600">{approvedCount}</Text>
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
                    <Text className="text-2xl font-bold text-amber-600">{pendingRecordings}</Text>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                    <ClockCircleOutlined className="text-xl text-amber-600" />
                  </div>
                </div>
              </div>
            </Col>

            <Col xs={12} sm={12} md={4} lg={4}>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-purple-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <Text className="text-xs text-gray-500 font-medium block mb-1">Bị từ chối</Text>
                    <Text className="text-2xl font-bold text-purple-600">{rejectedCount}</Text>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                    <CloseCircleOutlined className="text-xl text-purple-600" />
                  </div>
                </div>
              </div>
            </Col>


          </Row>

          {/* Table */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="space-y-4">
              <div className="flex justify-between items-center flex-wrap gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-medium text-gray-700">Lọc theo trạng thái:</span>
                  <Select
                    placeholder="Chọn trạng thái"
                    style={{ width: 200 }}
                    allowClear
                    value={recordingStatusFilter}
                    onChange={setRecordingStatusFilter}
                    options={[
                      { label: 'Tất cả', value: null },
                      { label: 'Chờ duyệt', value: 0 },
                      { label: 'Đã duyệt', value: 1 },
                      { label: 'Bị từ chối', value: 2 },

                    ]}
                  />
                  <Input
                    placeholder="Tìm kiếm theo email"
                    prefix={<SearchOutlined />}
                    value={emailSearch}
                    onChange={(e) => setEmailSearch(e.target.value)}
                    allowClear
                    style={{ width: 250 }}
                    onPressEnter={() => {
                      setPage(1);
                      fetchRecordings(1, pageSize, recordingStatusFilter, emailSearch);
                    }}
                  />
                </div>
                <Space size="small">
                  <Button
                    type="default"
                    icon={<CheckCircleOutlined />}
                    onClick={handleApproveAll}
                    loading={approvingAll}
                    className="bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-600"
                    disabled={!emailSearch || emailSearch.trim() === ''}
                  >
                    Duyệt recording theo user filter
                  </Button>
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={handleDownloadAll}
                    loading={downloading}
                    className="bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-600"
                  >
                    Tải toàn bộ Audio
                  </Button>
                </Space>
              </div>

              {loadingRecordings ? (
                <div className="flex justify-center py-12">
                  <Spin size="large" />
                </div>
              ) : recordings.length > 0 ? (
                <Table
                  key={`table-${refreshKey}-${pageSize}`}
                  size="small"
                  columns={recordingColumns}
                  dataSource={recordings}
                  rowKey={(record, index) => `${record.RecordingID}-${index}-${refreshKey}`}
                  pagination={{
                    current: page,
                    pageSize: pageSize,
                    total: totalRecordingsCount,
                    pageSizeOptions: [10, 20, 50, 100],
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} bản ghi`,
                    responsive: true,
                    onChange: (p, size) => {
                      setPage(p);
                      setPageSize(size);
                      setRefreshKey(prev => prev + 1);
                    },
                  }}
                  scroll={{ x: 1300 }}
                />
              ) : (
                <Empty description="Chưa có bản ghi âm nào" style={{ marginTop: 50 }} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal for editing sentence */}
      <Modal
        title="Sửa câu sentence"
        open={isEditModalVisible}
        onOk={handleSaveEditSentence}
        onCancel={handleCancelEditSentence}
        okText="Lưu"
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

export default ManagerRecords;
