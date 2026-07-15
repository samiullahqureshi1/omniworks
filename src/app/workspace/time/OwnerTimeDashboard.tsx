'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getDailyWorksnapsDataAction } from '@/app/actions/tracking';
import { ChevronLeft, ChevronRight, Plus, Monitor, Clock, Image as ImageIcon } from 'lucide-react';
import AddManualTimeModal from '@/components/modals/AddManualTimeModal';

export default function OwnerTimeDashboard({ timeEntries, allUsers, allProjects, allTasks, userRole, currentUserId }: any) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Start with current user if member, else first user
  const [filterUser, setFilterUser] = useState(() => {
    if (userRole === 'MEMBER') return currentUserId;
    return allUsers.length > 0 ? allUsers[0].id : '';
  });
  const [filterProject, setFilterProject] = useState('all');
  const [filterTask, setFilterTask] = useState('all');

  const [screenshots, setScreenshots] = useState<any[]>([]);
  const [dailyEntries, setDailyEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Month navigation
  const prevMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };
  const nextMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Fetch data when date or user changes
  useEffect(() => {
    if (!filterUser) return;
    
    setIsLoading(true);
    // Format date to YYYY-MM-DD
    const dateStr = selectedDate.toISOString().split('T')[0];
    
    getDailyWorksnapsDataAction(dateStr, filterUser).then(res => {
      if (res.success) {
        setScreenshots(res.screenshots || []);
        setDailyEntries(res.entries || []);
      }
      setIsLoading(false);
    });
  }, [selectedDate, filterUser]);

  // Group screenshots by hour, then 10-minute intervals
  const groupedData = useMemo(() => {
    // Array of 24 hours
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const intervals = [0, 10, 20, 30, 40, 50];

    const result = hours.map(hour => {
      // Find screenshots for this hour
      const hourScreenshots = screenshots.filter(s => {
        const d = new Date(s.capturedAt);
        if (filterProject !== 'all' && s.projectId !== filterProject) return false;
        if (filterTask !== 'all' && s.taskId !== filterTask) return false;
        return d.getHours() === hour;
      });

      // Find the main project worked on in this hour for the banner
      const mainProject = hourScreenshots.length > 0 && hourScreenshots[0].project ? hourScreenshots[0].project.name : null;

      const slots = intervals.map(interval => {
        // Find screenshot in this 10 min window
        const slotScreenshot = hourScreenshots.find(s => {
          const m = new Date(s.capturedAt).getMinutes();
          return m >= interval && m < interval + 10;
        });
        return { interval, screenshot: slotScreenshot };
      });

      return { hour, slots, mainProject, hasData: hourScreenshots.length > 0 };
    });

    return result.filter(r => r.hasData); 
  }, [screenshots, filterProject, filterTask]);

  // Calculate total time from entries
  const totalMinutes = dailyEntries.reduce((acc, e) => acc + (e.duration || 0) * 60, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner & Total Time */}
      <div className="flex justify-between items-center bg-white dark:bg-[#1f1f1f] p-4 shadow-sm border rounded-xl">
        <div className="flex flex-col items-center justify-center bg-blue-50 dark:bg-blue-950/20 border-t-4 border-blue-600 dark:border-blue-500 px-6 py-3 min-w-[150px]">
          <span className="text-3xl font-bold text-blue-700 dark:text-blue-400">{Math.round(totalMinutes)}</span>
          <span className="text-sm font-semibold text-gray-500 dark:text-slate-400">mins</span>
          <span className="text-xs text-blue-500 dark:text-blue-400 mt-1 hover:underline cursor-pointer">Total Time</span>
        </div>
        
        <div className="flex items-center gap-4">
          {userRole !== 'MEMBER' && (
            <Button className="rounded shadow-md hover:shadow-lg transition-all" onClick={() => setIsModalOpen(true)}>
              <Plus size={16} className="mr-2" /> Add Manual Time
            </Button>
          )}
        </div>
      </div>

      {/* Calendar Strip */}
      <div className="bg-white dark:bg-[#1f1f1f] p-4 shadow-sm border rounded-xl space-y-2 overflow-x-auto">
        <div className="flex items-center gap-2 font-semibold text-blue-700 dark:text-blue-400 text-lg mb-2">
          <ChevronLeft className="cursor-pointer hover:text-blue-900 dark:hover:text-blue-300" onClick={prevMonth} />
          {monthName}
          <ChevronRight className="cursor-pointer hover:text-blue-900 dark:hover:text-blue-300" onClick={nextMonth} />
        </div>
        <div className="flex gap-1 min-w-max">
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
            
            const isSelected = selectedDate.getDate() === day && selectedDate.getMonth() === currentDate.getMonth() && selectedDate.getFullYear() === currentDate.getFullYear();
            
            return (
              <div 
                key={day}
                onClick={() => setSelectedDate(d)}
                className={`flex flex-col items-center justify-center w-10 h-12 border cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors
                  ${isSelected ? 'border-red-500 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 font-bold' : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-slate-400'}
                `}
              >
                <span className="text-[10px]">{dayName}</span>
                <span className="text-sm">{day}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-gray-100 dark:bg-white/5 p-3 rounded-lg border flex flex-wrap gap-4 items-center shadow-inner">
        <div className="flex items-center gap-2">
          <span className="bg-gray-400 dark:bg-slate-700 text-white px-2 py-1 text-xs font-bold rounded">USER</span>
          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="border-gray-300 dark:border-white/10 dark:bg-[#1f1f1f] dark:text-white rounded text-sm h-8"
            disabled={userRole === 'MEMBER'}
          >
            {userRole === 'MEMBER' 
              ? <option value={currentUserId}>{allUsers.find((u: any) => u.id === currentUserId)?.name || 'You'}</option>
              : allUsers.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))
            }
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="bg-gray-400 dark:bg-slate-700 text-white px-2 py-1 text-xs font-bold rounded">DATE</span>
          <input
            type="date"
            value={selectedDate.toISOString().split('T')[0]}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            className="border-gray-300 dark:border-white/10 dark:bg-[#1f1f1f] dark:text-white rounded text-sm h-8 px-2"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="bg-gray-400 dark:bg-slate-700 text-white px-2 py-1 text-xs font-bold rounded">PROJECT</span>
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="border-gray-300 dark:border-white/10 dark:bg-[#1f1f1f] dark:text-white rounded text-sm h-8 w-48 truncate"
          >
            <option value="all">--- All Projects ---</option>
            {allProjects.map((p: any) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid Display */}
      {isLoading ? (
        <div className="flex justify-center p-10"><Clock className="animate-spin text-gray-400 dark:text-slate-500" /></div>
      ) : groupedData.length === 0 ? (
        <div className="text-center p-10 text-gray-500 dark:text-slate-400 bg-white dark:bg-[#1f1f1f] border rounded-xl shadow-sm">
          No time tracked for this day.
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1f1f1f] border rounded-xl overflow-hidden shadow-sm">
          {/* Header row for 10 min slots */}
          <div className="grid grid-cols-7 bg-gray-100 dark:bg-white/5 border-b divide-x dark:divide-white/10 font-bold text-gray-600 dark:text-slate-300 text-sm text-center">
            <div className="p-2 flex items-center justify-center">Hour</div>
            <div className="p-2 flex items-center justify-center">:00 to :10</div>
            <div className="p-2 flex items-center justify-center">:10 to :20</div>
            <div className="p-2 flex items-center justify-center">:20 to :30</div>
            <div className="p-2 flex items-center justify-center">:30 to :40</div>
            <div className="p-2 flex items-center justify-center">:40 to :50</div>
            <div className="p-2 flex items-center justify-center">:50 to :60</div>
          </div>

          {/* Hour rows */}
          <div className="divide-y dark:divide-white/10">
            {groupedData.map((hourData, i) => (
              <div key={i} className="flex flex-col">
                {/* Project Banner for the hour (simulating the worksnaps banner) */}
                {hourData.mainProject && (
                  <div className="bg-[#467B92] text-white text-xs font-bold px-2 py-1 w-full truncate">
                    [Project: {hourData.mainProject}] Web Development
                  </div>
                )}
                
                <div className="grid grid-cols-7 divide-x min-h-[120px]">
                  {/* Hour Label */}
                  <div className="p-2 flex flex-col items-start justify-center font-bold text-gray-700 dark:text-slate-300 bg-white dark:bg-[#1f1f1f]">
                    <div className="flex gap-2 items-center">
                      <input type="checkbox" className="rounded" />
                      <span className="text-lg">
                        {hourData.hour === 0 ? '12am' : hourData.hour < 12 ? `${hourData.hour}am` : hourData.hour === 12 ? '12pm' : `${hourData.hour - 12}pm`}
                      </span>
                    </div>
                  </div>

                  {/* Slots */}
                  {hourData.slots.map((slot, j) => (
                    <div key={j} className="p-2 flex flex-col items-center justify-center space-y-2 hover:bg-gray-50 dark:hover:bg-white/5 relative">
                      <div className="absolute top-1 left-1">
                        <input type="checkbox" className="rounded" />
                      </div>
                      
                      {slot.screenshot ? (
                        <div className="w-full flex flex-col items-center border-2 border-green-500 p-0.5 rounded relative group bg-white dark:bg-[#1f1f1f] shadow-sm mt-3">
                          {slot.screenshot.screenshotUrl ? (
                            <img src={slot.screenshot.screenshotUrl} alt="Screenshot" className="w-full h-[60px] object-cover cursor-pointer" />
                          ) : (
                            <div className="w-full h-[60px] bg-gray-800 flex items-center justify-center text-xs text-white">
                               No Image
                            </div>
                          )}
                          <div className="absolute inset-0 bg-blue-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold cursor-pointer">
                            Click for more
                          </div>
                          
                          {/* Activity Bars */}
                          <div className="flex gap-[1px] mt-1 w-full justify-center px-1 pb-1">
                            {Array.from({ length: 10 }).map((_, idx) => {
                               // Map activity level (0-100) to 10 blocks
                               const level = (slot.screenshot.activityLevel || 50) / 10;
                               return (
                                 <div key={idx} className={`h-2 flex-1 ${idx < level ? 'bg-green-600' : 'bg-gray-300 dark:bg-slate-700'}`}></div>
                               )
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isModalOpen && (
        <AddManualTimeModal 
          isOpen={isModalOpen}
          onClose={(refresh) => {
            setIsModalOpen(false);
            if (refresh) {
              const d = selectedDate;
              setSelectedDate(new Date(d.getTime() - 1));
              setTimeout(() => setSelectedDate(d), 10);
            }
          }}
          allProjects={allProjects}
          allTasks={allTasks || []}
          allUsers={allUsers}
          defaultDate={selectedDate.toISOString().split('T')[0]}
          defaultUserId={filterUser}
        />
      )}
    </div>
  );
}
