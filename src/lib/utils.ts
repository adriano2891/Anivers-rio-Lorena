import { Invitation, CondoEvent } from '../types';

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';

  // If starts with 55 (Brazil)
  if (digits.startsWith('55') && digits.length >= 12) {
    const ddd = digits.substring(2, 4);
    const rest = digits.substring(4);
    if (rest.length === 9) {
      return `+55 (${ddd}) ${rest.substring(0, 5)}-${rest.substring(5)}`;
    }
    if (rest.length === 8) {
      return `+55 (${ddd}) ${rest.substring(0, 4)}-${rest.substring(4)}`;
    }
  }

  // standard 11 digits BR
  if (digits.length === 11) {
    return `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.substring(0, 2)}) ${digits.substring(2, 6)}-${digits.substring(6)}`;
  }

  return phone;
}

export function cleanPhoneForWa(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if (!digits) return '';

  // If 10 or 11 digits without country code, prepend 55
  if (digits.length === 10 || digits.length === 11) {
    digits = '55' + digits;
  }
  return digits;
}

export function formatDateBR(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    // If dateStr is in YYYY-MM-DD or YYYY-MM-DDTHH:mm format, parse date parts directly to avoid UTC timezone shifts
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      const datePart = dateStr.split('T')[0];
      const parts = datePart.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

export function formatDateTimeBR(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
}

export function formatRelativeTimeBR(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `Há ${diffMins} min`;
    if (diffHours < 24) return `Há ${diffHours} h`;
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `Há ${diffDays} dias`;

    return formatDateBR(dateStr);
  } catch {
    return dateStr;
  }
}

export function buildInvitationUrl(code: string): string {
  const origin = window.location.origin;
  return `${origin}/convite/${code}`;
}

export function getWhatsAppMessage(
  type: 'confirmed' | 'viewedNotConfirmed' | 'notViewed' | 'reminder' | 'thankYou',
  invitation: Invitation,
  event: CondoEvent
): string {
  let template = event.whatsappTemplates[type] || '';

  const link = buildInvitationUrl(invitation.code);
  const formattedDate = formatDateBR(event.date);

  const responsibleName = invitation.responsibleName || invitation.managerName || invitation.condoName;
  const familyOrGroup = invitation.familyOrGroup || invitation.condoName || responsibleName;
  const adults = invitation.adultsCount ?? (invitation.participantCount || 1);
  const children = invitation.childrenCount ?? 0;
  const totalPeople = (invitation.adultsCount !== undefined && invitation.childrenCount !== undefined)
    ? (invitation.adultsCount + invitation.childrenCount)
    : (invitation.participantCount || 1);

  const replacements: Record<string, string> = {
    '{Nome}': responsibleName,
    '{Responsavel}': responsibleName,
    '{Familia}': familyOrGroup,
    '{TotalPessoas}': String(totalPeople),
    '{Adultos}': String(adults),
    '{Criancas}': String(children),
    '{Convidados}': invitation.guestsNames || responsibleName,
    '{Condominio}': invitation.condoName,
    '{Sindico}': invitation.managerName,
    '{Zelador}': invitation.janitorName || 'Convidado',
    '{Evento}': event.title,
    '{Data}': formattedDate,
    '{Horario}': event.time,
    '{Local}': event.location,
    '{Endereco}': event.address,
    '{Link}': link,
    '{Codigo}': invitation.code
  };

  for (const [key, value] of Object.entries(replacements)) {
    template = template.replaceAll(key, value || '');
  }

  return template;
}

export function openWhatsApp(phone: string, text: string) {
  const cleanPhone = cleanPhoneForWa(phone);
  const encodedText = encodeURIComponent(text);
  const url = `https://wa.me/${cleanPhone}?text=${encodedText}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function downloadCalendarFile(event: CondoEvent) {
  const startDateStr = `${event.date.replace(/-/g, '')}T${event.time.replace(':', '')}00`;
  const endDateStr = `${event.date.replace(/-/g, '')}T230000`;

  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Convite & Presenca Condominial//PT-BR
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
SUMMARY:${event.title}
DESCRIPTION:${event.presentationText.replace(/\n/g, '\\n')}
LOCATION:${event.location} - ${event.address}
DTSTART:${startDateStr}
DTEND:${endDateStr}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${event.title.substring(0, 30)}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
