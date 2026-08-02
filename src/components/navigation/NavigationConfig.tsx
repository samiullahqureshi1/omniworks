import {
  Home,
  Cpu,
  Users as UsersIcon,
  Calendar,
  CalendarDays,
  Video,
  Bot,
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  MessageSquare,
  Timer,
  Briefcase,
  BarChart3,
  Settings,
  Workflow,
  Sparkles,
  Zap,
  Boxes,
  HelpCircle,
  Bell,
  FileText,
  UserPlus,
  ArrowUpCircle,
  Layers,
  Activity,
  UserCheck,
  Shield,
  LayoutGrid,
  Lock,
  Building2
} from 'lucide-react';

export interface MainSidebarItem {
  id: string;
  name: string;
  icon: any;
  badge?: string;
  isBottom?: boolean;
}

export interface SecondaryNavItem {
  name: string;
  href?: string;
  icon?: any;
  exact?: boolean;
  roles?: string[];
  comingSoon?: boolean;
  /**
   * Granular permission that also unlocks this item, in addition to `roles`.
   * Lets a MEMBER with e.g. USER_VIEW reach the Users screen without being an OWNER.
   */
  permission?: {
    resource: 'project' | 'task' | 'user' | 'client' | 'calendar' | 'meeting' | 'event' | 'reminder' | 'contact' | 'availability';
    action: 'view';
  };
}

export interface SecondarySection {
  title: string;
  items: SecondaryNavItem[];
}

export const mainSidebarItems: MainSidebarItem[] = [
  { id: 'home', name: 'Home', icon: Home },
  { id: 'planner', name: 'Planner', icon: CalendarDays },
  { id: 'calendar', name: 'Calendar', icon: Calendar },
  { id: 'conversations', name: 'Chat', icon: MessageSquare },
  { id: 'more', name: 'More', icon: LayoutGrid },
];

export const bottomSidebarItems: MainSidebarItem[] = [
  { id: 'invite', name: 'Invite', icon: UserPlus, isBottom: true },
  { id: 'upgrade', name: 'Upgrade', icon: ArrowUpCircle, isBottom: true },
];

export const secondaryNavigation: Record<string, SecondarySection[]> = {
  home: [
    {
      title: 'Modules',
      items: [
        { name: 'Dashboard', href: '/workspace', icon: LayoutDashboard, exact: true, roles: ['OWNER', 'PM', 'MEMBER', 'CLIENT'] },
        { name: 'Projects', href: '/workspace/projects', icon: FolderKanban, exact: false, roles: ['OWNER', 'PM', 'MEMBER', 'CLIENT'] },
        { name: 'Tasks', href: '/workspace/tasks', icon: CheckSquare, exact: false, roles: ['OWNER', 'PM', 'MEMBER', 'CLIENT'] },
        { name: 'Timesheet & Reports', href: '/workspace/time', icon: Timer, exact: false, roles: ['OWNER', 'PM', 'MEMBER'] },
        { name: 'Users', href: '/workspace/users', icon: UsersIcon, exact: false, roles: ['OWNER'], permission: { resource: 'user', action: 'view' } },
        { name: 'Clients', href: '/workspace/clients', icon: Briefcase, exact: false, roles: ['OWNER'], permission: { resource: 'client', action: 'view' } },
      ],
    },
  ],
  settings: [
    {
      title: 'Settings Categories',
      items: [
        { name: 'Project Statuses', href: '/workspace/settings?tab=project', icon: FolderKanban, exact: true, roles: ['OWNER'] },
        { name: 'Task Statuses', href: '/workspace/settings?tab=task', icon: CheckSquare, exact: true, roles: ['OWNER'] },
        { name: 'Security Profile', href: '/workspace/settings?tab=security', icon: Lock, exact: true, roles: ['OWNER', 'PM', 'MEMBER'] },
        { name: 'Delegate Access', href: '/workspace/settings?tab=delegate', icon: Building2, exact: true, roles: ['OWNER'] },
        { name: 'Notifications', href: '/workspace/settings?tab=notifications', icon: Bell, exact: true, roles: ['OWNER', 'PM', 'MEMBER'] },
        { name: 'Permissions', href: '/workspace/settings?tab=permissions', icon: Shield, exact: true, roles: ['OWNER'] },
        { name: 'Upgrade', href: '/workspace/settings?tab=upgrade', icon: ArrowUpCircle, exact: true, roles: ['OWNER'] },
      ],
    },
  ],
  rules: [
    {
      title: 'Automation Rules',
      items: [
        { name: 'Automation Rules', href: '/workspace/rules', icon: Cpu, exact: false, roles: ['OWNER'] },
        { name: 'Workflows', icon: Workflow, comingSoon: true },
        { name: 'Conditions', icon: Layers, comingSoon: true },
        { name: 'Actions', icon: Zap, comingSoon: true },
      ],
    },
  ],
  teams: [
    {
      title: 'Team Ops Hub',
      items: [
        { name: 'Team Overview', href: '/workspace/teamops?tab=dashboard', icon: LayoutDashboard, exact: true, roles: ['OWNER', 'PM', 'MEMBER'] },
        { name: 'All Internal Projects', href: '/workspace/teamops?tab=projects', icon: FolderKanban, exact: true, roles: ['OWNER', 'PM', 'MEMBER'] },
        { name: 'Templates', href: '/workspace/teamops?tab=templates', icon: FileText, exact: true, roles: ['OWNER', 'PM', 'MEMBER'] },
        { name: 'Members', href: '/workspace/users', icon: UsersIcon, exact: false, roles: ['OWNER'], permission: { resource: 'user', action: 'view' } },
      ],
    },
  ],
  planner: [
    {
      title: 'Planner',
      items: [
        { name: 'My Calendar', href: '/workspace/planner/calendar', icon: Calendar, exact: true, roles: ['OWNER', 'PM', 'MEMBER'], permission: { resource: 'calendar', action: 'view' } },
        { name: 'Meetings', href: '/workspace/planner/meetings', icon: Video, exact: true, roles: ['OWNER', 'PM', 'MEMBER', 'CLIENT'], permission: { resource: 'meeting', action: 'view' } },
        { name: 'Events', href: '/workspace/planner/events', icon: Sparkles, exact: true, roles: ['OWNER', 'PM', 'MEMBER', 'CLIENT'], permission: { resource: 'event', action: 'view' } },
        { name: 'Reminders', href: '/workspace/planner/reminders', icon: Timer, exact: true, roles: ['OWNER', 'PM', 'MEMBER'], permission: { resource: 'reminder', action: 'view' } },
        { name: 'Contacts', href: '/workspace/planner/contacts', icon: UsersIcon, exact: true, roles: ['OWNER', 'PM'], permission: { resource: 'contact', action: 'view' } },
      ],
    },
    {
      title: 'Configuration',
      items: [
        { name: 'Booking Availability', href: '/workspace/planner/settings', icon: Settings, exact: true, roles: ['OWNER'], permission: { resource: 'availability', action: 'view' } },
      ],
    },
  ],
  calendar: [
    {
      title: 'Planner',
      items: [
        { name: 'My Calendar', href: '/workspace/planner/calendar', icon: Calendar, exact: true, roles: ['OWNER', 'PM', 'MEMBER'], permission: { resource: 'calendar', action: 'view' } },
        { name: 'Meetings', href: '/workspace/planner/meetings', icon: Video, exact: true, roles: ['OWNER', 'PM', 'MEMBER', 'CLIENT'], permission: { resource: 'meeting', action: 'view' } },
        { name: 'Events', href: '/workspace/planner/events', icon: Sparkles, exact: true, roles: ['OWNER', 'PM', 'MEMBER', 'CLIENT'], permission: { resource: 'event', action: 'view' } },
        { name: 'Reminders', href: '/workspace/planner/reminders', icon: Timer, exact: true, roles: ['OWNER', 'PM', 'MEMBER'], permission: { resource: 'reminder', action: 'view' } },
        { name: 'Contacts', href: '/workspace/planner/contacts', icon: UsersIcon, exact: true, roles: ['OWNER', 'PM'], permission: { resource: 'contact', action: 'view' } },
      ],
    },
    {
      title: 'Configuration',
      items: [
        { name: 'Booking Availability', href: '/workspace/planner/settings', icon: Settings, exact: true, roles: ['OWNER'], permission: { resource: 'availability', action: 'view' } },
      ],
    },
  ],
  meeting: [
    {
      title: 'Meetings',
      items: [
        { name: 'Upcoming Meetings', icon: Video, comingSoon: true },
        { name: 'Past Meetings', icon: Video, comingSoon: true },
        { name: 'Meeting Notes', icon: FileText, comingSoon: true },
        { name: 'Recordings', icon: BarChart3, comingSoon: true },
      ],
    },
  ],
  agents: [
    {
      title: 'Agents Section',
      items: [
        { name: 'Agent Hub', icon: Bot, comingSoon: true },
        { name: 'Custom Agents', icon: Sparkles, comingSoon: true },
        { name: 'System Integrations', icon: Cpu, comingSoon: true },
      ],
    },
  ],
};
