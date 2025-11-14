import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { get } from '../../services/apiClient';
import styles from './Dashboard.module.css';
import { fetchRecentProjects, createProject, updateProject, deleteProject } from '../../services/firestore';
import Button from '../../components/Button/Button';
import Modal from '../../components/Modal/Modal';

type Stats = {
  totalQuotes: number;
  openWorkOrders: number;
  lowStockItems: number;
  todaysShipments: number;
};

type RecentItem = {
  id: string;
  name?: string;
  status?: string;
  createdAt?: string;
};

function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentItem[]>([]);
  const [lowStock, setLowStock] = useState<RecentItem[]>([]);
  const [projects, setProjects] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<RecentItem | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [quotationModalOpen, setQuotationModalOpen] = useState(false);
  const [selectedProjectForQuotation, setSelectedProjectForQuotation] = useState<RecentItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const apiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
        const apiPromises = apiBase
          ? [
              get<Stats>('/dashboard/stats'),
              get<RecentItem[]>('/orders/recent'),
              get<RecentItem[]>('/inventory/low-stock')
            ]
          : [];

        const [apiResults, projectsRes] = await Promise.all([
          Promise.allSettled(apiPromises),
          fetchRecentProjects(5)
        ]);
        if (cancelled) return;
        if (apiResults.length) {
          const [statsRes, ordersRes, lowStockRes] = apiResults as [
            PromiseSettledResult<Stats>,
            PromiseSettledResult<RecentItem[]>,
            PromiseSettledResult<RecentItem[]>
          ];
          if (statsRes?.status === 'fulfilled') setStats(statsRes.value);
          if (ordersRes?.status === 'fulfilled') setRecentOrders(ordersRes.value);
          if (lowStockRes?.status === 'fulfilled') setLowStock(lowStockRes.value);
          const failures = [statsRes, ordersRes, lowStockRes].filter((r) => r?.status === 'rejected').length;
          if (failures === apiResults.length) {
            // To avoid a scary banner when backend is down, show a subtle message instead
            setError('Network Error');
          }
        }
        setProjects(projectsRes.map((p: any) => ({ id: p.id, name: p.name ?? p.id })));
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message ?? 'Không thể tải dữ liệu');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Tân Hòa Phát</h1>
          <div className={styles.subtitle}>Tổng quan hiệu suất & tồn kho</div>
        </div>
        <div className={styles.actions}>
          <Button 
            variant="primary" 
            onClick={() => {
              if (projects.length === 0) {
                alert('Vui lòng tạo dự án trước khi tạo báo giá!');
                setCreateOpen(true);
              } else if (projects.length === 1) {
                // Nếu chỉ có 1 dự án, trực tiếp đi đến trang báo giá
                navigate(`/projects/${projects[0].id}/quotation`);
              } else {
                // Nếu có nhiều dự án, hiển thị modal để chọn
                setQuotationModalOpen(true);
              }
            }}
          >
            Tạo báo giá
          </Button>
          <Button variant="success">Tạo lệnh SX</Button>
          <Button variant="ghost">Xuất báo cáo</Button>
        </div>
      </div>
      {error && (
        <div className={styles.errorBanner}>
          Lỗi: {error}
        </div>
      )}

      <section className={styles.gridStats}>
        <StatCard label="Báo giá" value={stats?.totalQuotes} isLoading={loading} />
        <StatCard label="Lệnh SX mở" value={stats?.openWorkOrders} isLoading={loading} />
        <StatCard label="Thiếu tồn" value={stats?.lowStockItems} isLoading={loading} />
        <StatCard label="Giao hôm nay" value={stats?.todaysShipments} isLoading={loading} />
      </section>

      <div className={styles.gridPanels}>
        <Panel
          title="Dự án (Firestore)"
          actions={<Button variant="secondary" onClick={() => setCreateOpen(true)}>Tạo dự án</Button>}
        >
          {loading ? (
            <List items={projects} emptyText="Chưa có dữ liệu" isLoading={loading} />
          ) : (
            <ul className={styles.list}>
              {projects.map((p) => (
                <li key={p.id} className={styles.row}>
                  <span 
                    className={styles.rowName}
                    style={{ cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={() => navigate(`/projects/${p.id}/quotation`)}
                    title="Nhấp để tạo báo giá"
                  >
                    {p.name ?? p.id}
                  </span>
                  <span className={styles.rowActions}>
                    <Button
                      className={styles.smallBtn}
                      variant="primary"
                      onClick={() => navigate(`/projects/${p.id}/quotation`)}
                    >
                      Báo giá
                    </Button>
                    <Button
                      className={styles.smallBtn}
                      variant="ghost"
                      onClick={() => { setEditTarget(p); setProjectName(p.name ?? ''); setEditOpen(true); }}
                    >
                      Sửa
                    </Button>
                    <Button
                      className={styles.smallBtn}
                      variant="danger"
                      onClick={() => setDeletingId(p.id)}
                    >
                      Xóa
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Vật tư sắp hết hàng">
          <List items={lowStock} emptyText="Không có vật tư thiếu" isLoading={loading} />
        </Panel>
      </div>

      <Modal
        open={createOpen}
        title="Tạo dự án mới"
        onClose={() => {
          if (!creating) {
            setCreateOpen(false);
            setProjectName('');
          }
        }}
        footer={
          <>
            <Button variant="ghost" onClick={() => { if (!creating) { setCreateOpen(false); setProjectName(''); } }}>Hủy</Button>
            <Button
              variant="primary"
              loading={creating}
              onClick={async () => {
                if (!projectName.trim()) return;
                try {
                  setCreating(true);
                  await createProject(projectName.trim());
                  const updated = await fetchRecentProjects(5);
                  setProjects(updated.map((p: any) => ({ id: p.id, name: p.name ?? p.id })));
                  setCreateOpen(false);
                  setProjectName('');
                } finally {
                  setCreating(false);
                }
              }}
            >
              Tạo
            </Button>
          </>
        }
      >
        <div className={styles.formRow}>
          <label>Tên dự án</label>
          <input
            className={styles.input}
            placeholder="Nhập tên dự án"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
          />
        </div>
      </Modal>

      <Modal
        open={editOpen}
        title="Sửa dự án"
        onClose={() => { if (!savingEdit) { setEditOpen(false); setProjectName(''); setEditTarget(null); } }}
        footer={
          <>
            <Button variant="ghost" onClick={() => { if (!savingEdit) { setEditOpen(false); setProjectName(''); setEditTarget(null); } }}>Hủy</Button>
            <Button
              variant="primary"
              loading={savingEdit}
              onClick={async () => {
                if (!editTarget) return;
                if (!projectName.trim()) return;
                try {
                  setSavingEdit(true);
                  await updateProject(editTarget.id, { name: projectName.trim() });
                  const updated = await fetchRecentProjects(5);
                  setProjects(updated.map((p: any) => ({ id: p.id, name: p.name ?? p.id })));
                  setEditOpen(false);
                  setProjectName('');
                  setEditTarget(null);
                } finally {
                  setSavingEdit(false);
                }
              }}
            >
              Lưu
            </Button>
          </>
        }
      >
        <div className={styles.formRow}>
          {editTarget && (
            <div className={styles.muted}>
              ID:&nbsp;<span className={`${styles.badge} ${styles.mono}`}>{editTarget.id}</span>
            </div>
          )}
          <label>Tên dự án</label>
          <input
            className={styles.input}
            placeholder="Nhập tên dự án"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
          />
        </div>
      </Modal>

      <Modal
        open={Boolean(deletingId)}
        title="Xóa dự án"
        onClose={() => setDeletingId(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeletingId(null)}>Hủy</Button>
            <Button
              variant="danger"
              onClick={async () => {
                if (!deletingId) return;
                await deleteProject(deletingId);
                const updated = await fetchRecentProjects(5);
                setProjects(updated.map((p: any) => ({ id: p.id, name: p.name ?? p.id })));
                setDeletingId(null);
              }}
            >
              Xóa
            </Button>
          </>
        }
      >
        <div>Bạn có chắc muốn xóa dự án này?</div>
      </Modal>

      {/* Modal chọn dự án để tạo báo giá */}
      <Modal
        open={quotationModalOpen}
        title="Chọn dự án để tạo báo giá"
        onClose={() => {
          setQuotationModalOpen(false);
          setSelectedProjectForQuotation(null);
        }}
        footer={
          <>
            <Button variant="ghost" onClick={() => {
              setQuotationModalOpen(false);
              setSelectedProjectForQuotation(null);
            }}>
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (selectedProjectForQuotation) {
                  navigate(`/projects/${selectedProjectForQuotation.id}/quotation`);
                  setQuotationModalOpen(false);
                  setSelectedProjectForQuotation(null);
                }
              }}
              disabled={!selectedProjectForQuotation}
            >
              Tạo báo giá
            </Button>
          </>
        }
      >
        <div>
          <p style={{ marginBottom: '16px', color: '#666' }}>
            Vui lòng chọn dự án để tạo báo giá:
          </p>
          <ul className={styles.list}>
            {projects.map((p) => (
              <li
                key={p.id}
                className={styles.listItem}
                style={{
                  cursor: 'pointer',
                  backgroundColor: selectedProjectForQuotation?.id === p.id ? '#e3f2fd' : 'transparent',
                  padding: '12px',
                  borderRadius: '4px',
                  marginBottom: '8px',
                }}
                onClick={() => setSelectedProjectForQuotation(p)}
              >
                <span>{p.name ?? p.id}</span>
                {selectedProjectForQuotation?.id === p.id && (
                  <span style={{ color: '#0066cc', marginLeft: '8px' }}>✓</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </Modal>
    </div>
  );
}

function StatCard({ label, value, isLoading }: { label: string; value?: number; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className={styles.statCard}>
        <div className={styles.skeletonBarSmall} />
        <div className={styles.skeletonBarLarge} />
      </div>
    );
  }
  return (
    <div className={styles.statCard}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{value ?? 0}</div>
    </div>
  );
}

function Panel({ title, actions, children }: { title: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>{title}</div>
        {actions ? <div className={styles.panelActions}>{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

function List({ items, emptyText, isLoading }: { items: unknown; emptyText: string; isLoading: boolean }) {
  if (isLoading) {
    return (
      <ul className={styles.list}>
        {Array.from({ length: 5 }).map((_, idx) => (
          <li key={idx} className={styles.listItem}>
            <div className={styles.skeletonLine} />
          </li>
        ))}
      </ul>
    );
  }

  const safeItems: RecentItem[] = Array.isArray(items) ? (items as RecentItem[]) : [];
  if (safeItems.length === 0) {
    return <div style={{ color: '#6b7280' }}>{emptyText}</div>;
  }
  return (
    <ul className={styles.list}>
      {safeItems.map((i) => (
        <li key={i.id} className={styles.listItem}>
          <span>{i.name}</span>
          {i.status && <span className={styles.listItemMeta}>{i.status}</span>}
        </li>
      ))}
    </ul>
  );
}

export default DashboardPage;


