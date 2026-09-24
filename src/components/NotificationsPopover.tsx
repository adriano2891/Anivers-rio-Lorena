import React from 'react';
import {
  Bell,
  CheckCircle2,
  XCircle,
  Eye,
  CalendarCheck,
  CheckCheck,
  Trash2,
  X
} from 'lucide-react';
import { NotificationItem } from '../types';
import { formatRelativeTimeBR } from '../lib/utils';
import { markNotificationRead, markAllNotificationsRead, clearAllNotifications } from '../lib/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onSelectInvitationCode?: (code: string) => void;
  onUpdateNotifications: (notifs: NotificationItem[]) => void;
}

export const NotificationsPopover: React.FC<Props> = ({
  isOpen,
  onClose,
  notifications,
  onSelectInvitationCode,
  onUpdateNotifications
}) => {
  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    onUpdateNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const handleClearAll = async () => {
    await clearAllNotifications();
    onUpdateNotifications([]);
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.read) {
      await markNotificationRead(notif.id);
      onUpdateNotifications(
        notifications.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      );
    }
    if (notif.invitationCode && onSelectInvitationCode) {
      onSelectInvitationCode(notif.invitationCode);
      onClose();
    }
  };

  return (
    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden text-slate-800 flex flex-col max-h-[480px]">
      {/* Popover Header */}
      <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/90">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-teal-700" />
          <span className="font-bold text-xs text-slate-900 uppercase tracking-wider">
            Notificações em Tempo Real
          </span>
          {unreadCount > 0 && (
            <span className="bg-teal-700 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full shadow-2xs">
              {unreadCount} novas
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="p-1 text-slate-500 hover:text-teal-700 rounded-md hover:bg-slate-200/60 transition text-[11px]"
              title="Marcar todas como lidas"
            >
              <CheckCheck size={15} />
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={handleClearAll}
              className="p-1 text-slate-500 hover:text-rose-600 rounded-md hover:bg-slate-200/60 transition text-[11px]"
              title="Limpar notificações"
            >
              <Trash2 size={14} />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 text-slate-500 hover:text-slate-800 rounded-md hover:bg-slate-200/60 transition"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs italic">
            Nenhuma notificação registrada ainda.
          </div>
        ) : (
          notifications.map((notif) => {
            let Icon = Bell;
            let iconColor = 'text-teal-700 bg-teal-50 border border-teal-200/60';

            if (notif.type === 'confirmed') {
              Icon = CheckCircle2;
              iconColor = 'text-emerald-700 bg-emerald-50 border border-emerald-200';
            } else if (notif.type === 'declined') {
              Icon = XCircle;
              iconColor = 'text-rose-700 bg-rose-50 border border-rose-200';
            } else if (notif.type === 'viewed') {
              Icon = Eye;
              iconColor = 'text-sky-700 bg-sky-50 border border-sky-200';
            } else if (notif.type === 'check_in') {
              Icon = CalendarCheck;
              iconColor = 'text-teal-800 bg-teal-100/60 border border-teal-300';
            }

            return (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-3 text-xs transition cursor-pointer flex items-start gap-3 ${
                  notif.read ? 'opacity-70 hover:bg-slate-50' : 'bg-teal-50/30 hover:bg-teal-50/70 font-medium'
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 ${iconColor}`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-bold text-slate-900 text-xs truncate">{notif.title}</span>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {formatRelativeTimeBR(notif.timestamp)}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-tight line-clamp-2">
                    {notif.message}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
