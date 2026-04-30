import React from 'react';
import { motion } from 'motion/react';
import { 
  ClipboardList, 
  Package, 
  Link as LinkIcon, 
  MessageCircle, 
  Facebook, 
  LogOut,
  ChevronRight,
  TrendingDown,
  Search
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { LINKS } from '../../constants';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const { logout, role } = useAuth();

  const navItems = [
    { id: 'pr', label: 'Purchase Request', icon: ClipboardList, roles: ['GUEST', 'ADMIN', 'ROOT'] },
    { id: 'ris', label: 'RIS Request', icon: TrendingDown, roles: ['GUEST', 'ADMIN', 'WAREHOUSE', 'ROOT'] },
    { id: 'status', label: 'Track Request', icon: Search, roles: ['GUEST', 'ADMIN', 'WAREHOUSE', 'ROOT'] },
    { id: 'inventory', label: 'Inventory Peak', icon: Package, roles: ['GUEST', 'ADMIN', 'WAREHOUSE', 'ROOT'] },
  ];

  const filteredItems = navItems.filter(item => item.roles.includes(role || ''));

  return (
    <aside className="w-72 bg-slate-900 h-screen sticky top-0 flex flex-col text-white shadow-2xl">
      <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
        <img src={LINKS.GSO_LOGO} alt="GSO Logo" className="w-10 h-10 rounded-full" />
        <div>
          <h2 className="font-bold text-sm tracking-tight text-blue-400">GSO SYSTEM</h2>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">{role}</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Main Menu</p>
        {filteredItems.map((item) => (
          <button
            key={`nav-item-${item.id}`}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all group ${
              activeTab === item.id 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-3">
              <item.icon size={20} className={activeTab === item.id ? 'text-white' : 'group-hover:text-blue-400'} />
              <span className="font-medium text-sm">{item.label}</span>
            </div>
            {activeTab === item.id && <ChevronRight size={16} />}
          </button>
        ))}

        <div className="pt-8">
          <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Internal Links</p>
          <a
            href={LINKS.GSO_PRICELIST}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-3 px-4 py-3 text-slate-400 hover:text-amber-400 decoration-transparent transition-colors text-sm"
          >
            <LinkIcon size={18} />
            <span>GSO Pricelist</span>
          </a>
          
          <a
            href="mailto:gsopagbilao@gmail.com"
            className="flex items-center space-x-3 px-4 py-3 text-slate-400 hover:text-blue-400 decoration-transparent transition-colors text-sm"
          >
            <MessageCircle size={18} />
            <span>Notify Progress (GMail)</span>
          </a>

          <a
            href={LINKS.FB_PAGE}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-3 px-4 py-3 text-slate-400 hover:text-blue-500 decoration-transparent transition-colors text-sm"
          >
            <Facebook size={18} />
            <span>Chat with LGU Pagbilao GSO</span>
          </a>
        </div>
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button
          onClick={logout}
          className="w-full flex items-center space-x-3 px-4 py-3 text-slate-400 hover:text-red-400 transition-colors text-sm font-semibold"
        >
          <LogOut size={18} />
          <span>Exit Session</span>
        </button>
      </div>
    </aside>
  );
}
