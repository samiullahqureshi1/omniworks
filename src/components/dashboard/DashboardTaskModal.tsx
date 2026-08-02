'use client';

import React, { useEffect, useState } from 'react';
import TaskFormModal from '@/app/workspace/tasks/TaskFormModal';
import { getProjectsAction } from '@/app/actions/projects';
import { getTaskStatusesAction, getTaskByIdAction } from '@/app/actions/tasks';
import { getUsersAction } from '@/app/actions/users';
import { getCurrentUser } from '@/app/actions/auth';
import { useRouter } from 'next/navigation';

interface DashboardTaskModalProps {
  task: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function DashboardTaskModal({
  task,
  isOpen,
  onClose,
  onSuccess,
}: DashboardTaskModalProps) {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>({ userId: '', role: 'MEMBER' });
  const [fullTask, setFullTask] = useState<any>(task);

  useEffect(() => {
    setFullTask(task);
  }, [task]);

  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      try {
        const [projRes, statusRes, userRes, userObj] = await Promise.all([
          getProjectsAction(),
          getTaskStatusesAction(),
          getUsersAction(),
          getCurrentUser(),
        ]);

        if (projRes.success && projRes.projects) setProjects(projRes.projects);
        if (statusRes.success && statusRes.statuses) setStatuses(statusRes.statuses);
        if (userRes.success && userRes.users) setUsers(userRes.users);
        if (userObj) setCurrentUser(userObj);

        if (task?.id) {
          const taskRes = await getTaskByIdAction(task.id);
          if (taskRes.success && taskRes.task) {
            setFullTask(taskRes.task);
          }
        }
      } catch (err) {
        console.error('Error fetching dashboard modal options:', err);
      }
    };

    loadData();
  }, [isOpen, task?.id]);

  if (!isOpen || !task) return null;

  return (
    <TaskFormModal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      task={fullTask || task}
      projects={projects}
      taskStatuses={statuses}
      users={users}
      currentUser={currentUser}
      onSuccess={() => {
        if (onSuccess) onSuccess();
        router.refresh();
        onClose();
      }}
    />
  );
}
