import React, { useState, useEffect } from 'react';
import { Typography, Row, Col, Card, Spin } from 'antd';
import { AudioOutlined, CheckCircleOutlined, ClockCircleOutlined, FileTextOutlined, TeamOutlined } from '@ant-design/icons';
import { getRecordingsWithMeta, getSentencesWithMeta, Recording, Sentence } from '@/services/features/recordingSlice';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUsers } from '@/services/features/userSlice';
import { AppDispatch, RootState } from '@/services/store/store';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, PieLabelRenderProps } from 'recharts';
import SidebarManager from '@/components/SidebarManager';

const { Title, Text } = Typography;

const Dashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [loading, setLoading] = useState(true);
  const [contributedSentences] = useState(0);
  const [totalSentencesCount, setTotalSentencesCount] = useState(0);
  const [totalRecordingsCount, setTotalRecordingsCount] = useState(0);
  const [approvedCountFromApi, setApprovedCountFromApi] = useState<number | null>(null);
  const [approvedDurationSecondsFromApi, setApprovedDurationSecondsFromApi] = useState<number | null>(null);
  const [approvedDurationHoursFromApi, setApprovedDurationHoursFromApi] = useState<number | null>(null);
  const usersTotalContributedSentences = useSelector(
    (state: RootState) => state.user.usersTotalContributedSentences
  );

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [recordingsRes, sentencesRes] = await Promise.all([
          getRecordingsWithMeta({ page: 1, limit: 20 }),
          getSentencesWithMeta({ page: 1, limit: 20 })
        ]);
        setRecordings(recordingsRes.data);
        setSentences(sentencesRes.data);
        setTotalSentencesCount(sentencesRes.totalCount ?? sentencesRes.data.length);
        setTotalRecordingsCount(recordingsRes.totalCount ?? recordingsRes.data.length);
        if (typeof (recordingsRes as any).approvedCount === 'number') {
          setApprovedCountFromApi((recordingsRes as any).approvedCount);
        }
        if (typeof (recordingsRes as any).approvedDurationSeconds === 'number') {
          setApprovedDurationSecondsFromApi((recordingsRes as any).approvedDurationSeconds);
        }
        if (typeof (recordingsRes as any).approvedDurationHours === 'number') {
          setApprovedDurationHoursFromApi((recordingsRes as any).approvedDurationHours);
        }

        // contributedSentences sẽ được lấy từ usersTotalContributedSentences (Redux)
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    dispatch(fetchUsers());
  }, [dispatch]);

  // Tính toán các thống kê
  const totalSentences = totalSentencesCount || sentences.length; // Tổng số câu (text)
  const totalRecorded = totalRecordingsCount || recordings.length; // Tổng số bản ghi âm
  const totalNotRecorded = totalSentences - totalRecorded; // Tổng số câu chưa ghi âm
  const totalApproved =
    approvedCountFromApi !== null
      ? approvedCountFromApi
      : recordings.filter((r) => r.IsApproved === 1 || r.IsApproved === true).length; // Đã duyệt

  // Tổng thời lượng (giây) và giờ của các câu đã duyệt
  const totalDurationSeconds =
    approvedDurationSecondsFromApi !== null
      ? approvedDurationSecondsFromApi
      : recordings.reduce(
          (
            sum: number,
            r: Recording & {
              duration?: number;
              Duration?: number;
              TotalRecordingDuration?: number;
              totalDurationSeconds?: number;
            }
          ) => {
            return sum + (r.duration || r.Duration || r.TotalRecordingDuration || r.totalDurationSeconds || 0);
          },
          0
        );

  const totalDurationHours =
    approvedDurationHoursFromApi !== null
      ? approvedDurationHoursFromApi
      : totalDurationSeconds / 3600;

  const totalContributedSentences =
    usersTotalContributedSentences || contributedSentences;

  // Dữ liệu cho biểu đồ cột
  const barChartData = [
    {
      name: 'Đã ghi âm',
      value: totalRecorded,
      fill: '#10b981'
    },
    {
      name: 'Chưa ghi âm',
      value: totalNotRecorded,
      fill: '#f59e0b'
    },
    {
      name: 'Đã duyệt',
      value: totalApproved,
      fill: '#8b5cf6'
    },
    {
      name: 'Đóng góp',
      value: contributedSentences,
      fill: '#ec4899'
    }
  ];

  // Dữ liệu cho biểu đồ tròn
  const pieChartData = [
    { name: 'Đã ghi âm', value: totalRecorded, color: '#10b981' },
    { name: 'Chưa ghi âm', value: totalNotRecorded, color: '#f59e0b' },
    { name: 'Đã duyệt', value: totalApproved, color: '#8b5cf6' }
  ];

  const COLORS = ['#10b981', '#f59e0b', '#8b5cf6'];

  const renderCustomLabel = (props: PieLabelRenderProps) => {
    const { cx, cy, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0 } = props;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = (cx || 0) + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = (cy || 0) + radius * Math.sin(-midAngle * Math.PI / 180);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="font-bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="flex">
      <SidebarManager />
      <div className="flex-1 min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 md:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <Title
              level={1}
              className="!mb-0 !text-3xl md:!text-4xl !font-bold !text-blue-600"
              style={{ letterSpacing: '-0.02em' }}
            >
              Dashboard
            </Title>
            <Text className="text-gray-500">Quản lý và theo dõi tiến độ thu thập dữ liệu</Text>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Spin size="large" />
            </div>
          ) : (
            <>
              {/* Statistics Grid - 5 cột gọn gàng */}
              <Row gutter={[12, 12]} className="mb-4">
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
                        <Text className="text-xs text-gray-500 font-medium block mb-1">Đã ghi âm</Text>
                        <Text className="text-2xl font-bold text-green-600">{totalRecorded}</Text>
                      </div>
                      <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                        <AudioOutlined className="text-xl text-green-600" />
                      </div>
                    </div>
                  </div>
                </Col>

                <Col xs={12} sm={12} md={4} lg={4}>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-amber-100 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <Text className="text-xs text-gray-500 font-medium block mb-1">Chưa ghi âm</Text>
                        <Text className="text-2xl font-bold text-amber-600">{totalNotRecorded}</Text>
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
                        <Text className="text-xs text-gray-500 font-medium block mb-1">Đã duyệt</Text>
                        <Text className="text-2xl font-bold text-purple-600">{totalApproved}</Text>
                      </div>
                      <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                        <CheckCircleOutlined className="text-xl text-purple-600" />
                      </div>
                    </div>
                  </div>
                </Col>

                <Col xs={12} sm={12} md={4} lg={4}>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-pink-100 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <Text className="text-xs text-gray-500 font-medium block mb-1">Câu đóng góp</Text>
                        <Text className="text-2xl font-bold text-pink-600">{totalContributedSentences}</Text>
                      </div>
                      <div className="w-12 h-12 rounded-lg bg-pink-100 flex items-center justify-center">
                        <TeamOutlined className="text-xl text-pink-600" />
                      </div>
                    </div>
                  </div>
                </Col>
                <Col xs={12} sm={12} md={4} lg={4}>
                  <div className="space-y-3">
                    <div className="bg-white rounded-xl p-3 shadow-sm border border-indigo-100 hover:shadow-md transition-shadow flex items-center justify-between">
                      <div>
                        <Text className="text-xs text-gray-500 font-medium block mb-1">Tổng thời gian (s)</Text>
                        <Text className="text-xl font-bold text-indigo-700">{totalDurationSeconds.toFixed ? totalDurationSeconds.toFixed(0) : totalDurationSeconds}s</Text>
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                        <ClockCircleOutlined className="text-lg text-indigo-600" />
                      </div>
                    </div>

                    <div className="bg-white rounded-xl p-3 shadow-sm border border-indigo-50 hover:shadow-md transition-shadow flex items-center justify-between">
                      <div>
                        <Text className="text-xs text-gray-500 font-medium block mb-1">Tổng thời gian (h)</Text>
                        <Text className="text-xl font-bold text-gray-800">{totalDurationHours.toFixed(2)}h</Text>
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
                        <ClockCircleOutlined className="text-lg text-gray-700" />
                      </div>
                    </div>
                  </div>
                </Col>
              </Row>

              {/* Charts Section */}
              <Row gutter={[16, 16]}>
                {/* Bar Chart */}
                <Col xs={24} lg={12}>
                  <Card
                    title={
                      <div className="flex items-center gap-2">
                        <FileTextOutlined className="text-blue-600" />
                        <span className="font-semibold">Biểu đồ cột</span>
                      </div>
                    }
                    className="shadow-sm rounded-xl border-gray-100"
                    bodyStyle={{ padding: '12px' }}
                  >
                    <ResponsiveContainer width="100%" height={380}>
                      <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="value" name="Số lượng" radius={[8, 8, 0, 0]}>
                          {barChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </Col>

                {/* Pie Chart */}
                <Col xs={24} lg={12}>
                  <Card
                    title={
                      <div className="flex items-center gap-2">
                        <AudioOutlined className="text-green-600" />
                        <span className="font-semibold">Biểu đồ phân bổ</span>
                      </div>
                    }
                    className="shadow-sm rounded-xl border-gray-100"
                    bodyStyle={{ padding: '12px' }}
                  >
                    <ResponsiveContainer width="100%" height={380}>
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={renderCustomLabel}
                          outerRadius={110}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieChartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </Card>
                </Col>
              </Row>

              {/* Summary Card */}
              <Card className="shadow-sm rounded-xl border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                <Row gutter={[24, 24]}>
                  <Col xs={24} md={12}>
                    <div>
                      <Title level={4} className="!text-blue-600 !mb-2">📊 Hệ thống quản lý dữ liệu giọng nói</Title>
                      <Text className="text-gray-600 text-sm block mb-4">
                        Theo dõi toàn bộ quy trình thu thập, xử lý và duyệt dữ liệu giọng nói từ cộng đồng
                      </Text>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Câu cần ghi âm:</span>
                          <span className="font-semibold text-gray-900">{totalNotRecorded} ({totalNotRecorded > 0 ? ((totalNotRecorded / totalSentences) * 100).toFixed(1) : 0}%)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Tỉ lệ hoàn thành:</span>
                          <span className="font-semibold text-green-600">{totalSentences > 0 ? ((totalRecorded / totalSentences) * 100).toFixed(1) : 0}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Tỉ lệ duyệt:</span>
                          <span className="font-semibold text-blue-600">{totalRecorded > 0 ? ((totalApproved / totalRecorded) * 100).toFixed(1) : 0}%</span>
                        </div>
                      </div>
                    </div>
                  </Col>

                  <Col xs={24} md={12}>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-white rounded-lg border border-blue-200">
                        <div className="text-xs text-gray-500 mb-1">Tổng câu</div>
                        <div className="text-xl font-bold text-blue-600">{totalSentences}</div>
                      </div>
                      <div className="p-3 bg-white rounded-lg border border-green-200">
                        <div className="text-xs text-gray-500 mb-1">Đã ghi âm</div>
                        <div className="text-xl font-bold text-green-600">{totalRecorded}</div>
                      </div>
                      <div className="p-3 bg-white rounded-lg border border-amber-200">
                        <div className="text-xs text-gray-500 mb-1">Chưa ghi âm</div>
                        <div className="text-xl font-bold text-amber-600">{totalNotRecorded}</div>
                      </div>
                      <div className="p-3 bg-white rounded-lg border border-purple-200">
                        <div className="text-xs text-gray-500 mb-1">Đã duyệt</div>
                        <div className="text-xl font-bold text-purple-600">{totalApproved}</div>
                      </div>
                    </div>
                  </Col>
                </Row>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;