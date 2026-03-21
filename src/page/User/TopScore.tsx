import React, { useEffect, useState } from 'react';
import { Layout, Card, Table, Typography, Spin, Row, Col, Empty, Avatar } from 'antd';
import { TrophyOutlined, FileTextOutlined, CheckCircleOutlined } from '@ant-design/icons';
import SidebarUser from '@/components/SidebarUser';
import { useAppDispatch } from '@/services/store/store';
import { fetchTopContributorsPaginated } from '@/services/features/userSlice';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Content } = Layout;

interface TopScorer {
  PersonID?: string;
  Email?: string;
  userEmail?: string;
  TotalSentencesDone?: number;
  TotalRecordingDuration?: number;
  TotalContributedByUser?: number;
  totalSentences?: number;
  status1Count?: number;
  status2Count?: number;
  status3Count?: number;
  createdAt?: string | null;
}

const TopScore: React.FC = () => {
  const dispatch = useAppDispatch();
  const [topScores, setTopScores] = useState<TopScorer[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchTopScoresData(page, pageSize);
  }, [page, pageSize]);

  const fetchTopScoresData = async (p = 1, limit = 10) => {
    setLoading(true);
    try {
      const resp = await dispatch(fetchTopContributorsPaginated({ page: p, limit })).unwrap();
      const items = resp.items || [];
      // Giữ nguyên thứ tự do backend sort sẵn theo TotalRecordings
      setTopScores(items as TopScorer[]);
      setTotal(resp.totalCount ?? items.length);
    } catch (error) {
      console.error('Failed to fetch top scores:', error);
    } finally {
      setLoading(false);
    }
  };

  const tableColumns = [
    {
      title: 'Hạng',
      dataIndex: 'rank',
      key: 'rank',
      width: 88,
      align: 'center' as const,
      render: (_rank: number, _record: any, idx: number) => {
        const getRankColor = (i: number) => {
          if (i === 0) return '#f6b93b'; // gold
          if (i === 1) return '#9aa0a6'; // silver/gray
          if (i === 2) return '#ff7a45'; // bronze/orange
          return '#1890ff'; // default blue
        };

        const bg = getRankColor(idx);

        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Avatar
              size={36}
              style={{
                backgroundColor: bg,
                color: '#fff',
                fontWeight: 'bold',
                fontSize: '14px',
                boxShadow: '0 1px 0 rgba(0,0,0,0.04)'
              }}
            >
              {idx + 1}
            </Avatar>
          </div>
        );
      },
    },
    {
      title: 'Người dùng',
      dataIndex: 'Email',
      key: 'user',
      width: 360,
      render: (_email: string, record: any) => (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <div style={{ fontWeight: 600, color: '#111', fontSize: '14px' }}>{record.Email || record.userEmail}</div>
          <div style={{ color: '#999', fontSize: '12px', marginTop: '4px' }}>{record.createdAtDisplay}</div>
        </div>
      ),
    },
    {
      title: 'Số câu ghi âm',
      dataIndex: 'RecordingTotalCount',
      key: 'RecordingTotalCount',
      width: 140,
      align: 'center' as const,
      sorter: (a: any, b: any) => (a.RecordingTotalCount || 0) - (b.RecordingTotalCount || 0),
      render: (count: number) => (
        <div className="flex items-center justify-center gap-2">
          <FileTextOutlined style={{ fontSize: '18px', color: '#13c2c2' }} />
          <span style={{ fontWeight: 'bold', color: '#13c2c2', fontSize: '16px' }}>{count || 0}</span>
        </div>
      ),
    },
    {
      title: 'Số câu đóng góp',
      dataIndex: 'TotalContributedByUser',
      key: 'TotalContributedByUser',
      width: 140,
      align: 'center' as const,
      sorter: (a: any, b: any) => (a.TotalContributedByUser || 0) - (b.TotalContributedByUser || 0),
      render: (count: number) => (
        <div className="flex items-center justify-center gap-2">
          <FileTextOutlined style={{ fontSize: '18px', color: '#52c41a' }} />
          <span style={{ fontWeight: 'bold', color: '#52c41a', fontSize: '16px' }}>{count || 0}</span>
        </div>
      ),
    },
    {
      title: 'Đã duyệt',
      dataIndex: 'status1Count',
      key: 'status1Count',
      width: 120,
      align: 'center' as const,
      sorter: (a: any, b: any) => (a.status1Count || 0) - (b.status1Count || 0),
      render: (count: number) => (
        <div className="flex items-center justify-center gap-2">
          <CheckCircleOutlined style={{ fontSize: '18px', color: '#52c41a' }} />
          <span style={{ fontWeight: 'bold', color: '#52c41a', fontSize: '16px' }}>{count || 0}</span>
        </div>
      ),
    },
    // Removed 'Từ chối' and 'Tổng đóng góp' columns per request
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <SidebarUser />
      <Layout style={{ background: '#f5f5f5' }}>
        <Content style={{ padding: '24px' }}>
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div style={{
              background: 'white',
              borderRadius: '8px',
              padding: '48px 20px',
              marginBottom: '32px',
              textAlign: 'center',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
            }}>
              <div style={{ marginBottom: '12px' }}>
                <TrophyOutlined style={{ fontSize: '48px', color: '#faad14', marginRight: '16px' }} />
              </div>
              <Title level={1} style={{ color: '#1890ff', margin: 0, fontSize: '56px', fontWeight: 'bold' }}>
                Top Người Đóng Góp
              </Title>
            </div>

            <Spin spinning={loading} tip="Đang tải dữ liệu...">
              {topScores.length === 0 ? (
                <Empty description="Chưa có dữ liệu" style={{ marginTop: '50px' }} />
              ) : (
                <Row gutter={[24, 0]} style={{ minHeight: '600px' }}>
                  {/* Right Side - Statistics Table (full width after removing left leaderboard) */}
                  <Col xs={24} md={24}>
                    <Card
                      title={
                        <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '16px' }}>
                          <span>📊 Bảng xếp hạng</span>
                        </div>
                      }
                      style={{
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                        borderRadius: '8px'
                      }}
                    >
                      <Table
                        columns={tableColumns}
                        dataSource={topScores.map((item, index) => ({
                          ...item,
                          key: `${item.userEmail || item.Email}-${index}`,
                          rank: (page - 1) * pageSize + index + 1,
                          createdAtDisplay: item.createdAt ? dayjs(item.createdAt).format('DD/MM/YYYY') : '19/01/2026'
                        }))}
                        pagination={{
                          current: page,
                          pageSize,
                          total,
                          showSizeChanger: true,
                          pageSizeOptions: ['10', '20', '50'],
                          showTotal: (t) => `Tổng ${t} người`,
                          position: ['bottomRight']
                        }}
                        onChange={(pagination) => {
                          if (pagination.current) setPage(pagination.current);
                          if (pagination.pageSize) setPageSize(pagination.pageSize);
                        }}
                        scroll={{ x: 900 }}
                        rowClassName={(_record, index) => {
                          if (index === 0 && page === 1) return 'bg-yellow-50';
                          if (index === 1 && page === 1) return 'bg-gray-50';
                          if (index === 2 && page === 1) return 'bg-orange-50';
                          return '';
                        }}
                        size="middle"
                      />
                    </Card>
                  </Col>
                </Row>
              )}
            </Spin>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default TopScore;

