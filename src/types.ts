export type InvitationStatus =
  | 'not_viewed'
  | 'viewed'
  | 'pending'
  | 'confirmed'
  | 'declined'
  | 'cancelled'
  | 'checked_in';

export type AttendeeRole = 'none' | 'manager' | 'janitor' | 'both';

export interface HistoryEntry {
  id: string;
  timestamp: string;
  type:
    | 'created'
    | 'sent'
    | 'viewed'
    | 'confirmed'
    | 'declined'
    | 'cancelled'
    | 'checked_in'
    | 'checkin_undone'
    | 'whatsapp_opened'
    | 'note_added'
    | 'status_changed'
    | 'updated';
  description: string;
  details?: string;
}

export interface WhatsAppTemplates {
  confirmed: string;
  viewedNotConfirmed: string;
  notViewed: string;
  reminder: string;
  thankYou: string;
}

export type HotspotActionType =
  | 'confirm_rsvp'
  | 'open_form'
  | 'google_maps'
  | 'whatsapp'
  | 'custom_url'
  | 'register';

export interface CoverHotspot {
  id: string;
  name: string;
  actionType: HotspotActionType;
  targetUrl: string;
  openInNewTab: boolean;
  // Proportional coordinates in percentages (0% to 100%)
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CondoEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  address: string;
  bannerUrl: string;
  videoUrl?: string;
  logoUrl: string;
  presentationText: string;
  shareImageUrl?: string;
  shareTitle?: string;
  shareDescription?: string;
  coverHotspots?: CoverHotspot[];
  requireJanitor: boolean;
  maxParticipants: number;
  confirmationDeadline: string; // ISO or YYYY-MM-DDTHH:mm
  waitingListEnabled: boolean;
  status: 'active' | 'archived' | 'draft';
  whatsappTemplates: WhatsAppTemplates;
  createdAt: string;
  updatedAt: string;
}

export interface GuestPerson {
  id: string;
  name: string;
  age: string;
}

export interface Invitation {
  id: string;
  code: string;
  eventId: string;
  // Birthday Party primary fields
  responsibleName?: string;
  familyOrGroup?: string;
  guestsNames?: string;
  guestsList?: GuestPerson[];
  adultsCount?: number;
  childrenCount?: number;
  specialNeeds?: string;
  checkedInCount?: number;
  // Legacy / Compatibility fields
  condoName: string;
  managerName: string;
  janitorName?: string;
  whatsapp: string;
  attendeeRole: AttendeeRole;
  participantCount: number;
  status: InvitationStatus;
  viewCount: number;
  firstViewedAt: string | null;
  lastViewedAt: string | null;
  confirmedAt: string | null;
  declinedAt: string | null;
  checkedInAt: string | null;
  customShareImageUrl?: string;
  internalNotes?: string;
  history: HistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  eventId: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'confirmed' | 'declined' | 'viewed' | 'check_in' | 'limit_reached' | 'info';
  invitationCode?: string;
  read: boolean;
}

export interface DashboardMetrics {
  totalInvitations: number;
  notViewed: number;
  viewedOnly: number;
  pending: number;
  confirmed: number;
  declined: number;
  totalParticipants: number;
  totalAdults: number;
  totalChildren: number;
  maxCapacity: number;
  occupancyRate: number;
  checkInsCount: number;
  checkedInGuestsCount: number;
  needsFollowUpCount: number;
}
