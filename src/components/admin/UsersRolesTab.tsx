import React, { useState, useEffect } from 'react';
import {
  Users, UserPlus, Shield, ShieldCheck, Lock, Edit2, Trash2,
  Search, Clock, CheckCircle2, AlertCircle, RefreshCw, Key
} from 'lucide-react';
import { toast } from 'sonner';

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'seo' | 'sales';
  status: 'active' | 'suspended';
  lastActive: string;
}

interface ActivityLog {
  id: string;
  user: string;
  action: string;
  timestamp: string;
  type: 'info' | 'warning' | 'success' | 'ai';
}

const DEFAULT_USERS: UserItem[] = [
  { id: '1', name: 'Nguyễn Văn Bảo', email: 'bao.nv@ursport.vn', role: 'admin', status: 'active', lastActive: 'Vừa xong' },
  { id: '2', name: 'Trần Thị Lan', email: 'lan.tt@ursport.vn', role: 'sales', status: 'active', lastActive: '10 phút trước' },
  { id: '3', name: 'Lê Minh Tuấn', email: 'tuan.lm@ursport.vn', role: 'seo', status: 'active', lastActive: '2 giờ trước' },
  { id: '4', name: 'AI Agent (URSport OS)', email: 'ai-copilot@ursport.vn', role: 'editor', status: 'active', lastActive: '15 phút trước' }
];

const DEFAULT_LOGS: ActivityLog[] = [
  { id: '1', user: 'Nguyễn Văn Bảo', action: 'Đã lưu cấu hình SEO toàn trang và Schema', timestamp: '3 phút trước', type: 'success' },
  { id: '2', user: 'AI Agent (URSport OS)', action: 'Tự động tạo mô tả sản phẩm "Áo polo nam Premium Cotton"', timestamp: '15 phút trước', type: 'ai' },
  { id: '3', user: 'Trần Thị Lan', action: 'Cập nhật trạng thái đơn hàng #ORD-827361 sang Đang giao', timestamp: '1 giờ trước', type: 'info' },
  { id: '4', user: 'Lê Minh Tuấn', action: 'Phân tích từ khóa SEO đối thủ và đề xuất Landing page mới', timestamp: '2 giờ trước', type: 'info' },
  { id: '5', user: 'Hệ thống', action: 'Sao lưu dữ liệu tự động lên Firebase Cloud thành công', timestamp: '12 giờ trước', type: 'success' }
];

const ROLE_PERMISSIONS = {
  admin: { name: 'Administrator (Toàn quyền)', desc: 'Toàn quyền truy cập và cài đặt hệ thống', perm: ['orders', 'products', 'content', 'ai', 'seo', 'settings', 'hr'] },
  editor: { name: 'Content Manager (Biên tập viên)', desc: 'Quản lý sản phẩm, viết bài blog, quản lý media', perm: ['products', 'content', 'ai'] },
  seo: { name: 'SEO & AI Specialist', desc: 'Tối ưu SEO danh mục, chạy AI Center, báo cáo SEO', perm: ['products', 'content', 'ai', 'seo'] },
  sales: { name: 'Sales Agent (Nhân viên bán hàng)', desc: 'Xử lý đơn hàng, chăm sóc khách hàng', perm: ['orders', 'customers'] }
};

export const UsersRolesTab: React.FC = () => {
  const [users, setUsers] = useState<UserItem[]>(() => {
    const cached = localStorage.getItem('ursport_admin_users');
    return cached ? JSON.parse(cached) : DEFAULT_USERS;
  });

  const [logs, setLogs] = useState<ActivityLog[]>(() => {
    const cached = localStorage.getItem('ursport_admin_logs');
    return cached ? JSON.parse(cached) : DEFAULT_LOGS;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'editor' | 'seo' | 'sales'>('admin');
  
  // Modals/Forms State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'editor' | 'seo' | 'sales'>('sales');

  useEffect(() => {
    localStorage.setItem('ursport_admin_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('ursport_admin_logs', JSON.stringify(logs));
  }, [logs]);

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) {
      toast.error('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    const newUser: UserItem = {
      id: Date.now().toString(),
      name: newUserName,
      email: newUserEmail,
      role: newUserRole,
      status: 'active',
      lastActive: 'Chưa hoạt động'
    };

    setUsers([newUser, ...users]);
    
    // Add log
    const newLog: ActivityLog = {
      id: Date.now().toString(),
      user: 'Nguyễn Văn Bảo', // Giả sử người thêm là admin hiện tại
      action: `Thêm nhân sự mới: ${newUserName} (${ROLE_PERMISSIONS[newUserRole].name})`,
      timestamp: 'Vừa xong',
      type: 'success'
    };
    setLogs([newLog, ...logs]);

    // Reset
    setNewUserName('');
    setNewUserEmail('');
    setNewUserRole('sales');
    setIsAddModalOpen(false);
    toast.success('Đã thêm nhân sự thành công!');
  };

  const handleDeleteUser = (id: string, name: string) => {
    if (id === '1') {
      toast.error('Không thể xóa tài khoản Admin chính');
      return;
    }
    if (!window.confirm(`Bạn có chắc muốn xóa nhân sự "${name}"?`)) return;

    setUsers(users.filter(u => u.id !== id));
    
    const newLog: ActivityLog = {
      id: Date.now().toString(),
      user: 'Nguyễn Văn Bảo',
      action: `Đã xóa nhân sự: ${name}`,
      timestamp: 'Vừa xong',
      type: 'warning'
    };
    setLogs([newLog, ...logs]);
    toast.success(`Đã xóa nhân sự ${name}`);
  };

  const handleToggleStatus = (id: string, name: string, currentStatus: string) => {
    if (id === '1') {
      toast.error('Không thể khóa tài khoản Admin chính');
      return;
    }
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    setUsers(users.map(u => u.id === id ? { ...u, status: nextStatus } : u));
    
    const newLog: ActivityLog = {
      id: Date.now().toString(),
      user: 'Nguyễn Văn Bảo',
      action: `Đã ${nextStatus === 'suspended' ? 'đình chỉ' : 'kích hoạt lại'} tài khoản: ${name}`,
      timestamp: 'Vừa xong',
      type: nextStatus === 'suspended' ? 'warning' : 'success'
    };
    setLogs([newLog, ...logs]);
    toast.success(`Đã cập nhật trạng thái của ${name}`);
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#13161f] border border-white/5 rounded-2xl p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-1">Tổng nhân sự</p>
            <p className="text-white font-black text-2xl leading-none">{users.length} nhân viên</p>
          </div>
        </div>

        <div className="bg-[#13161f] border border-white/5 rounded-2xl p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-1">Vai trò cấu hình</p>
            <p className="text-white font-black text-2xl leading-none">4 Vai trò chính</p>
          </div>
        </div>

        <div className="bg-[#13161f] border border-white/5 rounded-2xl p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-1">Hoạt động trong ngày</p>
            <p className="text-white font-black text-2xl leading-none">{logs.length} thao tác</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left column: Users List */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-[#13161f] border border-white/5 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h2 className="text-white font-black text-base uppercase tracking-wider">Danh sách Nhân sự</h2>
                <p className="text-white/40 text-xs mt-1">Quản lý và cấp quyền nhân sự quản trị hệ thống</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 bg-[#1e4b64] hover:bg-[#255d7c] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" /> Thêm Nhân Sự
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative mb-6">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <input
                type="text"
                placeholder="Tìm nhân sự theo tên hoặc email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-11 bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 text-white text-sm outline-none focus:border-[#1e4b64] transition-all"
              />
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-white/30">
                    <th className="pb-4 pl-4">Họ và tên</th>
                    <th className="pb-4">Vai trò</th>
                    <th className="pb-4">Trạng thái</th>
                    <th className="pb-4">Hoạt động cuối</th>
                    <th className="pb-4 pr-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-white/30 text-sm font-bold">
                        Không tìm thấy nhân sự phù hợp
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-white/[0.01] transition-all group">
                        <td className="py-4 pl-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-white font-bold text-sm flex items-center justify-center">
                              {u.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-white text-sm font-bold">{u.name}</p>
                              <p className="text-white/30 text-xs">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                            u.role === 'admin' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                            u.role === 'editor' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                            u.role === 'seo' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                            'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}>
                            {u.role === 'admin' ? 'Admin' :
                             u.role === 'editor' ? 'Biên tập viên' :
                             u.role === 'seo' ? 'SEO & AI' : 'Bán hàng'}
                          </span>
                        </td>
                        <td className="py-4">
                          <button
                            onClick={() => handleToggleStatus(u.id, u.name, u.status)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all ${
                              u.status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                                : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                            }`}
                          >
                            {u.status === 'active' ? 'Đang hoạt động' : 'Tạm khóa'}
                          </button>
                        </td>
                        <td className="py-4">
                          <span className="text-white/40 text-xs font-bold">{u.lastActive}</span>
                        </td>
                        <td className="py-4 pr-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setSelectedRole(u.role);
                                toast.info(`Xem cấu hình quyền của vai trò ${ROLE_PERMISSIONS[u.role].name}`);
                              }}
                              title="Xem phân quyền"
                              className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-all"
                            >
                              <Lock className="h-3.5 w-3.5" />
                            </button>
                            {u.id !== '1' && (
                              <button
                                onClick={() => handleDeleteUser(u.id, u.name)}
                                title="Xóa nhân sự"
                                className="h-8 w-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-all"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Activity Log Section */}
          <div className="bg-[#13161f] border border-white/5 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-white font-black text-base uppercase tracking-wider">Nhật ký Hoạt động</h2>
                <p className="text-white/40 text-xs mt-1">Lưu trữ 100 thao tác gần nhất của hệ thống và nhân viên</p>
              </div>
              <button
                onClick={() => {
                  setLogs(DEFAULT_LOGS);
                  toast.success('Đã tải lại nhật ký hệ thống!');
                }}
                className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-all"
                title="Tải lại logs"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              {logs.map(log => (
                <div key={log.id} className="flex gap-4 p-3 bg-white/[0.01] border border-white/5 rounded-xl hover:border-white/10 transition-all">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                    log.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' :
                    log.type === 'warning' ? 'bg-red-500/10 text-red-400' :
                    log.type === 'ai' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'
                  }`}>
                    {log.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> :
                     log.type === 'warning' ? <AlertCircle className="h-4 w-4" /> :
                     log.type === 'ai' ? <Key className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-bold leading-normal">
                      <span className="text-blue-400 font-extrabold mr-1.5">{log.user}</span>
                      {log.action}
                    </p>
                    <span className="text-[10px] font-bold text-white/20 mt-1 block uppercase tracking-widest">{log.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: Permissions matrix */}
        <div className="space-y-6">
          <div className="bg-[#13161f] border border-white/5 rounded-2xl p-6">
            <h2 className="text-white font-black text-base uppercase tracking-wider mb-6">Ma trận Phân quyền</h2>
            
            {/* Roles tabs */}
            <div className="grid grid-cols-2 gap-2 mb-6">
              {(Object.keys(ROLE_PERMISSIONS) as Array<keyof typeof ROLE_PERMISSIONS>).map(roleKey => (
                <button
                  key={roleKey}
                  onClick={() => setSelectedRole(roleKey)}
                  className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${
                    selectedRole === roleKey
                      ? 'bg-[#1e4b64] text-white border-[#1e4b64]/50 shadow-md'
                      : 'bg-white/5 text-white/50 border-white/5 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {roleKey === 'admin' ? 'Admin' :
                   roleKey === 'editor' ? 'Content' :
                   roleKey === 'seo' ? 'SEO & AI' : 'Sales'}
                </button>
              ))}
            </div>

            {/* Role detail */}
            <div className="p-4 bg-white/5 border border-white/5 rounded-xl mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-blue-400" />
                <h3 className="text-white font-bold text-sm">{ROLE_PERMISSIONS[selectedRole].name}</h3>
              </div>
              <p className="text-white/40 text-xs font-medium leading-relaxed">{ROLE_PERMISSIONS[selectedRole].desc}</p>
            </div>

            {/* Permissions list */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-3">Quyền truy cập Module</h4>
              {[
                { key: 'orders', name: 'Đơn hàng (Orders)', desc: 'Xem danh sách, cập nhật trạng thái đơn, in hóa đơn' },
                { key: 'products', name: 'Sản phẩm (Products)', desc: 'Thêm, sửa, xóa sản phẩm, cấu hình thuộc tính' },
                { key: 'content', name: 'Nội dung (Blog & Media)', desc: 'Viết bài blog, quản lý danh mục, upload thư viện ảnh' },
                { key: 'ai', name: 'AI Center Tools', desc: 'Sử dụng các AI Assistant tạo mô tả, blog, FAQ' },
                { key: 'seo', name: 'SEO & Marketing', desc: 'SEO danh mục, sơ đồ liên kết, mã giảm giá, email' },
                { key: 'settings', name: 'Cấu hình hệ thống', desc: 'Thay đổi thông tin cửa hàng, cổng thanh toán, API' },
                { key: 'hr', name: 'Quản lý nhân sự', desc: 'Thêm, sửa, xóa tài khoản quản trị hệ thống' },
              ].map(module => {
                const hasPermission = ROLE_PERMISSIONS[selectedRole].perm.includes(module.key);
                return (
                  <div key={module.key} className="flex items-start gap-3 p-3 bg-white/[0.01] border border-white/5 rounded-xl">
                    <input
                      type="checkbox"
                      checked={hasPermission}
                      readOnly
                      className="mt-0.5 rounded border-white/10 bg-white/5 text-[#1e4b64] focus:ring-0 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className={`text-xs font-bold ${hasPermission ? 'text-white' : 'text-white/30 line-through'}`}>{module.name}</p>
                      <p className="text-[10px] text-white/30 mt-0.5 font-medium leading-normal">{module.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => toast.success('Phân quyền là cấu hình tĩnh theo vai trò của hệ thống!')}
              className="w-full mt-6 py-2.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all border border-white/5"
            >
              Lưu thay đổi ma trận
            </button>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#13161f] border border-white/5 rounded-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center">
              <h3 className="text-white font-black text-sm uppercase tracking-wider">Thêm Nhân Sự Mới</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-white/40 hover:text-white text-xs">Đóng</button>
            </div>
            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Họ và tên</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Nguyễn Văn A"
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-xl h-11 px-4 text-white text-sm outline-none focus:border-[#1e4b64]"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Email</label>
                <input
                  type="email"
                  required
                  placeholder="VD: nv.a@ursport.vn"
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-xl h-11 px-4 text-white text-sm outline-none focus:border-[#1e4b64]"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-white/30 mb-1 block">Vai trò quản trị</label>
                <select
                  value={newUserRole}
                  onChange={e => setNewUserRole(e.target.value as any)}
                  className="w-full bg-[#1c1f26] border border-white/5 rounded-xl h-11 px-4 text-white text-sm outline-none focus:border-[#1e4b64]"
                >
                  <option value="sales">Sales Agent (Nhân viên bán hàng)</option>
                  <option value="seo">SEO & AI Specialist</option>
                  <option value="editor">Content Manager (Biên tập viên)</option>
                  <option value="admin">Administrator (Toàn quyền)</option>
                </select>
              </div>

              <div className="pt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#1e4b64] hover:bg-[#255d7c] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all"
                >
                  Thêm mới
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
