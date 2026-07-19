'use client';

import React from 'react';
import Link from 'next/link';
import { mainSidebarItems, bottomSidebarItems, MainSidebarItem } from './NavigationConfig';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Cpu, Video, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface MainSidebarProps {
  activeTab: string;
  setActiveTab: (tabId: string) => void;
  onUpgradeClick: () => void;
  onInviteClick: () => void;
  isSecondaryCollapsed?: boolean;
  setIsSecondaryCollapsed?: (collapsed: boolean) => void;
}

export function MainSidebar({ 
  activeTab, 
  setActiveTab, 
  onUpgradeClick, 
  onInviteClick,
  isSecondaryCollapsed = false,
  setIsSecondaryCollapsed
}: MainSidebarProps) {
  const handleItemClick = (item: MainSidebarItem) => {
    if (item.id === 'upgrade') {
      onUpgradeClick();
    } else if (item.id === 'invite') {
      onInviteClick();
    } else {
      setActiveTab(item.id);
    }
  };

  const itemRoutes: Record<string, string> = {
    home: '/workspace',
    teams: '/workspace/teamops?tab=dashboard',
    conversations: '/workspace/conversations',
    calendar: '/workspace/planner',
  };

  const activeMainIconTab = ['rules', 'meeting', 'more'].includes(activeTab) ? 'more' : activeTab;

  // Custom ClickUp active glow gradient style
  const activeGlowStyle = {
    background: 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(236,72,153,0.85) 30%, rgba(59,130,246,0.7) 60%, rgba(0,0,0,0) 100%)',
  };

  return (
    <div className="w-[54px] shrink-0 h-[calc(100vh-62px)] mt-0.5 mb-2 ml-2 rounded-[8px] bg-[#000000] dark:bg-[#0c0c0e] flex flex-col items-center py-3 justify-between select-none overflow-hidden shadow-xl z-40 relative">
      {/* Top Section */}
      <div className="flex flex-col items-center gap-2.5 w-full">
        
        {/* Toggle Collapse Chevron Trigger */}
        {setIsSecondaryCollapsed && (
          <div className="w-full flex flex-col items-center">
            <button
              onClick={() => setIsSecondaryCollapsed(!isSecondaryCollapsed)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-all outline-none"
              title={isSecondaryCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isSecondaryCollapsed ? (
                <ChevronsRight size={14} />
              ) : (
                <ChevronsLeft size={14} />
              )}
            </button>
            <div className="w-8 h-[1px] bg-[#1f1f24] dark:bg-white/10 my-1.5" />
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex flex-col items-center gap-1.5 w-full px-0.5">
          {mainSidebarItems.map((item) => {
            const isActive = activeMainIconTab === item.id;

            if (item.id === 'more') {
              return (
                <DropdownMenu key={item.id}>
                  <DropdownMenuTrigger asChild>
                    <button className="group relative flex flex-col items-center justify-center w-full py-0.5 outline-none">
                      <div 
                        className={`w-9 h-9 rounded-full flex items-center justify-center relative transition-all duration-300 ${
                          isActive ? '' : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                        style={isActive ? activeGlowStyle : undefined}
                      >
                        <item.icon size={16} className={isActive ? "text-white scale-110 drop-shadow-[0_2px_8px_rgba(255,255,255,0.4)]" : "transition-colors"} />
                      </div>
                      <span className={`text-[8px] mt-0.5 font-bold transition-colors ${
                        isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'
                      }`}>
                        {item.name}
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" side="right" className="w-48 bg-[#18181c] dark:bg-[#151518] text-slate-200 rounded-xl border border-white/10 p-1.5 ml-2 z-50 shadow-xl">
                    <DropdownMenuItem 
                      onClick={() => setActiveTab('rules')}
                      className={`cursor-pointer rounded-lg px-2.5 py-2 text-xs font-semibold flex items-center gap-2 hover:bg-white/5 focus:bg-white/5 ${
                        activeTab === 'rules' ? 'text-violet-400 font-bold bg-white/5' : 'text-slate-300'
                      }`}
                    >
                      <Cpu size={14} className="shrink-0" />
                      <span>Automation Rules</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setActiveTab('meeting')}
                      className={`cursor-pointer rounded-lg px-2.5 py-2 text-xs font-semibold flex items-center gap-2 hover:bg-white/5 focus:bg-white/5 ${
                        activeTab === 'meeting' ? 'text-violet-400 font-bold bg-white/5' : 'text-slate-300'
                      }`}
                    >
                      <Video size={14} className="shrink-0" />
                      <span>Collaboration Space</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            }

            const buttonEl = (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className="group relative flex flex-col items-center justify-center w-full py-0.5 outline-none"
              >
                {/* Glowing Rounded Icon Container */}
                <div 
                  className={`w-9 h-9 rounded-full flex items-center justify-center relative transition-all duration-300 ${
                    isActive ? '' : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                  style={isActive ? activeGlowStyle : undefined}
                >
                  <item.icon size={16} className={isActive ? "text-white scale-110 drop-shadow-[0_2px_8px_rgba(255,255,255,0.4)]" : "transition-colors"} />
                </div>

                {/* Text Label */}
                <span className={`text-[8px] mt-0.5 font-bold transition-colors ${
                  isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'
                }`}>
                  {item.name}
                </span>
              </button>
            );

            if (itemRoutes[item.id]) {
              return (
                <Link key={item.id} href={itemRoutes[item.id]} prefetch={true} tabIndex={-1} className="w-full">
                  {buttonEl}
                </Link>
              );
            }

            return buttonEl;
          })}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="flex flex-col items-center gap-1.5 w-full px-0.5">
        {bottomSidebarItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleItemClick(item)}
            className="group relative flex flex-col items-center justify-center w-full py-0.5 outline-none"
          >
            {/* Rounded Icon Container */}
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-300`}>
              <item.icon size={16} className="shrink-0" />
            </div>

            {/* Text Label */}
            <span className="text-[8px] mt-0.5 font-bold text-slate-500 group-hover:text-slate-300">
              {item.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
