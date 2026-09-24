import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  Printer,
  CheckCircle2,
  XCircle,
  Eye,
  Users,
  Clock,
  Baby,
  UserCheck,
  FileSpreadsheet,
  Search,
  Filter,
  AlertCircle
} from 'lucide-react';
import { Invitation, CondoEvent } from '../types';
import { formatDateBR, formatDateTimeBR, formatPhone } from '../lib/utils';

interface Props {
  event: CondoEvent;
  invitations: Invitation[];
}

export const ReportsView: React.FC<Props> = ({ event, invitations }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'confirmed' | 'pending' | 'viewed' | 'not_viewed' | 'declined' | 'checked_in'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Core metrics calculation
  const totalInvitations = invitations.length;

  const confirmedList = invitations.filter(
    (i) => i.status === 'confirmed' || i.status === 'checked_in'
  );
  const confirmedCount = confirmedList.length;

  const declinedList = invitations.filter((i) => i.status === 'declined');
  const declinedCount = declinedList.length;

  const checkedInList = invitations.filter((i) => i.status === 'checked_in');
  const checkedInCount = checkedInList.length;

  const notViewedList = invitations.filter(
    (i) => i.status === 'not_viewed' || (i.viewCount === 0 && i.status !== 'confirmed' && i.status !== 'declined')
  );
  const notViewedCount = notViewedList.length;

  const viewedList = invitations.filter((i) => i.status === 'viewed');
  const viewedCount = viewedList.length;

  const pendingList = invitations.filter(
    (i) => i.status === 'pending' || (i.status === 'viewed' && !i.confirmedAt && !i.declinedAt)
  );
  const pendingCount = pendingList.length;

  // Occupancy based on total individuals: adults + children
  const totalAdults = confirmedList.reduce(
    (acc, curr) => acc + (curr.adultsCount !== undefined ? curr.adultsCount : curr.participantCount || 1),
    0
  );
  const totalChildren = confirmedList.reduce((acc, curr) => acc + (curr.childrenCount || 0), 0);
  const occupiedSpots = totalAdults + totalChildren;

  const maxCapacity = event.maxParticipants || 150;
  const occupancyPercentage = Math.min(100, Math.round((occupiedSpots / maxCapacity) * 100));
  const remainingSpots = Math.max(0, maxCapacity - occupiedSpots);

  // Group confirmations by date
  const confirmationsByDate = useMemo(() => {
    const map: Record<string, number> = {};
    invitations.forEach((inv) => {
      if (inv.confirmedAt) {
        const dateKey = inv.confirmedAt.split('T')[0];
        const people =
          (inv.adultsCount !== undefined ? inv.adultsCount : inv.participantCount || 1) +
          (inv.childrenCount || 0);
        map[dateKey] = (map[dateKey] || 0) + people;
      }
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [invitations]);

  // Filtered list for table exploration
  const filteredList = useMemo(() => {
    return invitations.filter((inv) => {
      if (activeTab === 'confirmed' && inv.status !== 'confirmed' && inv.status !== 'checked_in') return false;
      if (activeTab === 'checked_in' && inv.status !== 'checked_in') return false;
      if (activeTab === 'declined' && inv.status !== 'declined') return false;
      if (activeTab === 'not_viewed' && inv.status !== 'not_viewed' && inv.viewCount > 0) return false;
      if (activeTab === 'viewed' && inv.status !== 'viewed') return false;
      if (activeTab === 'pending' && inv.status !== 'pending' && !(inv.status === 'viewed' && !inv.confirmedAt && !inv.declinedAt)) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (inv.responsibleName && inv.responsibleName.toLowerCase().includes(q)) ||
        (inv.managerName && inv.managerName.toLowerCase().includes(q)) ||
        (inv.familyOrGroup && inv.familyOrGroup.toLowerCase().includes(q)) ||
        (inv.condoName && inv.condoName.toLowerCase().includes(q)) ||
        (inv.guestsNames && inv.guestsNames.toLowerCase().includes(q)) ||
        inv.whatsapp.includes(q) ||
        inv.code.toLowerCase().includes(q)
      );
    });
  }, [invitations, activeTab, searchQuery]);

  // Export to CSV
  const handleExportCsv = (onlyConfirmed: boolean = false) => {
    const targetData = onlyConfirmed ? confirmedList : filteredList;
    const headers = [
      'Código',
      'Responsável',
      'Família/Grupo',
      'WhatsApp',
      'Convidados/Acompanhantes',
      'Adultos',
      'Crianças',
      'Total de Pessoas',
      'Estado do Convite',
      'Data de Confirmação',
      'Data de Check-in',
      'Visualizações',
      'Necessidades Especiais/Obs'
    ];

    const rows = targetData.map((inv) => {
      const adults = inv.adultsCount !== undefined ? inv.adultsCount : inv.participantCount || 1;
      const children = inv.childrenCount || 0;
      const totalPeople = adults + children;

      return [
        inv.code,
        `"${(inv.responsibleName || inv.managerName || '').replace(/"/g, '""')}"`,
        `"${(inv.familyOrGroup || inv.condoName || '').replace(/"/g, '""')}"`,
        inv.whatsapp,
        `"${(inv.guestsNames || inv.janitorName || '').replace(/"/g, '""')}"`,
        adults,
        children,
        totalPeople,
        inv.status,
        inv.confirmedAt ? formatDateTimeBR(inv.confirmedAt) : '',
        inv.checkedInAt ? formatDateTimeBR(inv.checkedInAt) : '',
        inv.viewCount,
        `"${(inv.specialNeeds || inv.internalNotes || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const filename = onlyConfirmed
      ? `Presencas_Confirmadas_${event.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
      : `Relatorio_Convites_${event.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="text-pink-600" size={22} />
            Relatórios e Lista de Presença
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Estatísticas atualizadas em tempo real, capacidade da festa e confirmações de presença.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleExportCsv(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
            title="Exportar apenas quem já confirmou presença"
          >
            <CheckCircle2 size={15} />
            <span>Exportar Presenças</span>
          </button>

          <button
            onClick={() => handleExportCsv(false)}
            className="px-3.5 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-md shadow-pink-600/20 cursor-pointer"
            title="Exportar convites com o filtro atual"
          >
            <FileSpreadsheet size={15} />
            <span>Exportar Geral (CSV)</span>
          </button>

          <button
            onClick={handlePrintPdf}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Printer size={15} />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* Capacity & Occupancy Bar Hero Card */}
      <div className="bg-white border border-pink-100 rounded-3xl p-5 sm:p-6 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-pink-50 text-pink-600">
                <Users size={20} />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Ocupação da Festa: {occupiedSpots} de {maxCapacity} pessoas confirmadas
                </h3>
                <p className="text-xs text-slate-500">
                  Calculado pela soma total de todas as pessoas confirmadas (adultos + crianças)
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-pink-50 px-3 py-1.5 rounded-xl border border-pink-200 text-center">
              <span className="text-[10px] uppercase font-bold text-pink-600 block">Adultos</span>
              <span className="text-lg font-black text-pink-700">{totalAdults}</span>
            </div>
            <div className="bg-sky-50 px-3 py-1.5 rounded-xl border border-sky-200 text-center">
              <span className="text-[10px] uppercase font-bold text-sky-600 block">Crianças</span>
              <span className="text-lg font-black text-sky-700">{totalChildren}</span>
            </div>
            <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Restantes</span>
              <span className="text-lg font-black text-slate-800">{remainingSpots}</span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden p-0.5 border border-slate-200">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              occupancyPercentage >= 100
                ? 'bg-rose-500'
                : occupancyPercentage >= 85
                ? 'bg-amber-500'
                : 'bg-gradient-to-r from-pink-500 to-rose-400'
            }`}
            style={{ width: `${occupancyPercentage}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-[11px] text-slate-500 mt-2 font-medium">
          <span>0 pessoas</span>
          <span className="font-bold text-pink-600">{occupancyPercentage}% de ocupação</span>
          <span>Capacidade máxima: {maxCapacity} pessoas</span>
        </div>
      </div>

      {/* KPI Cards: Total, Não visualizados, Visualizados, Aguardando, Confirmados, Recusados */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Convites */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Total Convites
          </span>
          <div className="text-2xl font-black text-slate-900">{totalInvitations}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Cadastrados</div>
        </div>

        {/* Não visualizados */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Não Vistos
          </span>
          <div className="text-2xl font-black text-slate-600">{notViewedCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Ainda não abriram</div>
        </div>

        {/* Visualizados */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-sky-700 uppercase tracking-wider block mb-1">
            Visualizados
          </span>
          <div className="text-2xl font-black text-sky-600">{viewedCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Abriram o convite</div>
        </div>

        {/* Aguardando resposta */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block mb-1">
            Aguardando
          </span>
          <div className="text-2xl font-black text-amber-600">{pendingCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Sem resposta ainda</div>
        </div>

        {/* Confirmados */}
        <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-xs bg-emerald-50/20">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block mb-1">
            Confirmados
          </span>
          <div className="text-2xl font-black text-emerald-600">{confirmedCount}</div>
          <div className="text-[11px] text-emerald-700 mt-0.5 font-medium">
            {occupiedSpots} pessoas
          </div>
        </div>

        {/* Recusados */}
        <div className="bg-white border border-rose-200 rounded-2xl p-4 shadow-xs bg-rose-50/20">
          <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block mb-1">
            Recusados
          </span>
          <div className="text-2xl font-black text-rose-600">{declinedCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Não comparecerão</div>
        </div>
      </div>

      {/* Evolution timeline & Check-in metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timeline Evolution Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
            <TrendingUp size={16} className="text-pink-600" />
            Evolução de Confirmações por Data
          </h3>

          {confirmationsByDate.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-slate-400 text-xs italic">
              Nenhuma confirmação registrada com data até o momento.
            </div>
          ) : (
            <div className="space-y-2.5">
              {confirmationsByDate.map(([date, count]) => (
                <div key={date} className="flex items-center gap-3 text-xs">
                  <span className="w-24 text-slate-600 font-mono font-bold">{formatDateBR(date)}</span>
                  <div className="flex-1 bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200">
                    <div
                      className="bg-pink-600 h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (count / (occupiedSpots || 1)) * 100)}%`
                      }}
                    />
                  </div>
                  <span className="font-bold text-slate-900 w-20 text-right">
                    +{count} {count === 1 ? 'pessoa' : 'pessoas'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Check-in Summary Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
            <UserCheck size={16} className="text-purple-600" />
            Status de Check-in na Festa
          </h3>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-purple-50 p-3 rounded-xl border border-purple-200">
              <span className="text-[10px] font-bold text-purple-700 uppercase block">Check-ins Feitos</span>
              <div className="text-2xl font-black text-purple-800">{checkedInCount}</div>
              <span className="text-[10px] text-purple-600">famílias / grupos</span>
            </div>
            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
              <span className="text-[10px] font-bold text-emerald-700 uppercase block">Total Esperado</span>
              <div className="text-2xl font-black text-emerald-800">{occupiedSpots}</div>
              <span className="text-[10px] text-emerald-600">pessoas confirmadas</span>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            No dia do aniversário da Lorena, use a aba <strong>Check-in</strong> no menu superior para registrar a entrada dos convidados buscando por nome, WhatsApp ou escaneando o QR code do convite.
          </p>
        </div>
      </div>

      {/* Interactive Consultation Table by State */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Consulta de Confirmações por Estado
            </h3>
            <p className="text-xs text-slate-500">
              Filtre e analise a lista detalhada de convidados
            </p>
          </div>

          {/* Search box */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome ou WhatsApp..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
        </div>

        {/* State tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'all'
                ? 'bg-pink-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({totalInvitations})
          </button>
          <button
            onClick={() => setActiveTab('confirmed')}
            className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'confirmed'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Confirmados ({confirmedCount})
          </button>
          <button
            onClick={() => setActiveTab('checked_in')}
            className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'checked_in'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Check-in ({checkedInCount})
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Aguardando ({pendingCount})
          </button>
          <button
            onClick={() => setActiveTab('viewed')}
            className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'viewed'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Visualizados ({viewedCount})
          </button>
          <button
            onClick={() => setActiveTab('not_viewed')}
            className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'not_viewed'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Não Vistos ({notViewedCount})
          </button>
          <button
            onClick={() => setActiveTab('declined')}
            className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'declined'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Recusados ({declinedCount})
          </button>
        </div>

        {/* Table of results */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Responsável</th>
                  <th className="py-3 px-4">Contacto</th>
                  <th className="py-3 px-4">Convidados</th>
                  <th className="py-3 px-4">Adultos</th>
                  <th className="py-3 px-4">Crianças</th>
                  <th className="py-3 px-4">Total Pessoas</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Confirmação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                      Nenhum convidado encontrado para este filtro.
                    </td>
                  </tr>
                ) : (
                  filteredList.map((inv) => {
                    const adults = inv.adultsCount !== undefined ? inv.adultsCount : inv.participantCount || 1;
                    const children = inv.childrenCount || 0;
                    const totalPeople = adults + children;

                    return (
                      <tr key={inv.id} className="hover:bg-pink-50/20 transition">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          <div>{inv.responsibleName || inv.managerName}</div>
                          {(inv.familyOrGroup || inv.condoName) && (
                            <div className="text-[10px] text-pink-600 font-normal">
                              {inv.familyOrGroup || inv.condoName}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700">
                          {formatPhone(inv.whatsapp)}
                        </td>
                        <td className="py-3 px-4 text-slate-600 truncate max-w-[150px]">
                          {inv.guestsNames || inv.janitorName || '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-semibold">{adults}</td>
                        <td className="py-3 px-4 text-slate-700 font-semibold">{children}</td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-pink-700 bg-pink-50 px-2 py-0.5 rounded border border-pink-200">
                            {totalPeople}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {inv.status === 'checked_in' ? (
                            <span className="text-purple-700 font-bold">Check-in</span>
                          ) : inv.status === 'confirmed' ? (
                            <span className="text-emerald-700 font-bold">Confirmado</span>
                          ) : inv.status === 'declined' ? (
                            <span className="text-rose-700 font-bold">Recusado</span>
                          ) : inv.status === 'viewed' ? (
                            <span className="text-sky-700 font-bold">Visualizado</span>
                          ) : inv.status === 'pending' ? (
                            <span className="text-amber-700 font-bold">Aguardando</span>
                          ) : (
                            <span className="text-slate-500">Não visualizado</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-[11px]">
                          {inv.confirmedAt ? (
                            <span className="text-emerald-700 font-medium">
                              {formatDateTimeBR(inv.confirmedAt)}
                            </span>
                          ) : inv.declinedAt ? (
                            <span className="text-rose-700">
                              {formatDateTimeBR(inv.declinedAt)}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
