import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search } from 'lucide-react';
import { SEOHelmet } from '../../components/common/SEOHelmet';
import { Badge } from '../../components/ui/Badge';
import { api } from '../../api/client';
import { formatDate } from '../../lib/utils';

export const AdminAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api
      .get('/admin/audit-logs?limit=100')
      .then((res) => setLogs(res.data.data))
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = logs.filter(
    (l) =>
      l.action?.toLowerCase().includes(search.toLowerCase()) ||
      l.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
      l.resource?.toLowerCase().includes(search.toLowerCase())
  );

  const getActionBadge = (action: string) => {
    if (action?.includes('DELETE') || action?.includes('CANCEL')) return <Badge variant="danger">{action}</Badge>;
    if (action?.includes('CREATE') || action?.includes('REGISTER')) return <Badge variant="success">{action}</Badge>;
    if (action?.includes('UPDATE') || action?.includes('PATCH')) return <Badge variant="info">{action}</Badge>;
    return <Badge variant="secondary">{action}</Badge>;
  };

  return (
    <div className="space-y-6 text-left">
      <SEOHelmet title="Nhật Ký Kiểm Toán | TechStore Admin" />

      <div>
        <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          <span>Nhật Ký Kiểm Toán Hệ Thống (Audit Logs)</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Ghi nhận toàn bộ hoạt động quản trị và thay đổi dữ liệu trên hệ thống
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo hành động, email, tài nguyên..."
          className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
        />
      </div>

      {/* Logs Table */}
      <div className="rounded-2xl overflow-hidden glass-panel border border-slate-200/80 dark:border-slate-800/80">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-400">Thời gian</th>
                <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-400">Người dùng</th>
                <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-400">Hành động</th>
                <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-400">Tài nguyên</th>
                <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-400">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-4 py-2">
                      <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Không có nhật ký nào
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-2.5 text-slate-400 font-mono whitespace-nowrap">{formatDate(log.createdAt)}</td>
                    <td className="px-4 py-2.5">
                      <p className="font-bold text-slate-800 dark:text-slate-200">{log.user?.fullName || 'System'}</p>
                      <p className="text-[10px] text-slate-400">{log.user?.email}</p>
                    </td>
                    <td className="px-4 py-2.5">{getActionBadge(log.action)}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-500">{log.resource}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-400">{log.ipAddress || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
