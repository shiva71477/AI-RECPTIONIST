import type { FastifyReply, FastifyRequest } from 'fastify';

import { getSupabaseClient } from '../database/client';
import { getConversationService } from '../services/conversation.service';
import { logger } from '../utils/logger';

// ── Dashboard HTML Template (Sleek Dark Glassmorphism) ─────────────────────────

const dashboardHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Receptionist — Admin Console</title>
  <!-- Google Fonts Inter -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  
  <style>
    :root {
      --bg-dark: #090a0f;
      --card-bg: rgba(17, 19, 28, 0.7);
      --card-border: rgba(255, 255, 255, 0.08);
      --accent-color: #3b82f6; /* Premium Blue */
      --accent-glow: rgba(59, 130, 246, 0.15);
      --glow-green: rgba(34, 197, 94, 0.2);
      --glow-red: rgba(239, 68, 68, 0.2);
      --glow-yellow: rgba(245, 158, 11, 0.2);
      --text-main: #f3f4f6;
      --text-muted: #9ca3af;
      --border-radius: 16px;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', sans-serif;
      background: var(--bg-dark);
      background-image: 
        radial-gradient(at 0% 0%, rgba(59, 130, 246, 0.08) 0px, transparent 50%),
        radial-gradient(at 100% 100%, rgba(139, 92, 246, 0.06) 0px, transparent 50%);
      background-attachment: fixed;
      color: var(--text-main);
      min-height: 100vh;
      overflow-x: hidden;
    }

    /* Scrollbar Styling */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    ::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.02);
    }
    ::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    header {
      padding: 24px 40px;
      border-bottom: 1px solid var(--card-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(9, 10, 15, 0.8);
      backdrop-filter: blur(12px);
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .logo-container {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo-glow {
      width: 14px;
      height: 14px;
      background: var(--accent-color);
      border-radius: 50%;
      box-shadow: 0 0 16px var(--accent-color);
      animation: pulse 2s infinite alternate;
    }

    h1 {
      font-family: 'Outfit', sans-serif;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .badge {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 4px 10px;
      border-radius: 20px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .badge-active {
      background: rgba(34, 197, 94, 0.1);
      color: #4ade80;
      border: 1px solid rgba(34, 197, 94, 0.2);
    }

    .badge-outcome-booked {
      background: rgba(34, 197, 94, 0.1);
      color: #4ade80;
      border: 1px solid rgba(34, 197, 94, 0.2);
    }

    .badge-outcome-inquiry {
      background: rgba(59, 130, 246, 0.1);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.2);
    }

    .badge-outcome-missed {
      background: rgba(239, 68, 68, 0.1);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.2);
    }

    .badge-outcome-cancelled {
      background: rgba(245, 158, 11, 0.1);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.2);
    }

    main {
      padding: 40px;
      max-width: 1600px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 32px;
    }

    /* Grid Layouts */
    .stats-grid {
      display: grid;
      grid-template-cols: repeat(auto-fit, minmax(280px, 1fr));
      gap: 24px;
    }

    .glass-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: var(--border-radius);
      padding: 24px;
      backdrop-filter: blur(16px);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .glass-card:hover {
      border-color: rgba(255, 255, 255, 0.15);
      transform: translateY(-2px);
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
    }

    .stat-label {
      font-size: 13px;
      color: var(--text-muted);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }

    .stat-value {
      font-family: 'Outfit', sans-serif;
      font-size: 36px;
      font-weight: 800;
      letter-spacing: -0.03em;
      margin-bottom: 4px;
    }

    .stat-subtext {
      font-size: 12px;
      color: var(--text-muted);
    }

    /* Controls Panel */
    .controls-panel {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      align-items: center;
      justify-content: space-between;
    }

    .search-input-group {
      display: flex;
      align-items: center;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 8px 16px;
      width: 100%;
      max-width: 400px;
      transition: border-color 0.2s;
    }

    .search-input-group:focus-within {
      border-color: var(--accent-color);
      box-shadow: 0 0 10px var(--accent-glow);
    }

    .search-input-group input {
      background: transparent;
      border: none;
      color: var(--text-main);
      font-size: 14px;
      outline: none;
      width: 100%;
      margin-left: 8px;
    }

    .filters-group {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    select, input[type="date"] {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      color: var(--text-main);
      font-size: 14px;
      padding: 8px 16px;
      outline: none;
      cursor: pointer;
      transition: border-color 0.2s;
    }

    select:focus, input[type="date"]:focus {
      border-color: var(--accent-color);
    }

    /* Calls Listing */
    .table-container {
      overflow-x: auto;
      border-radius: 12px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 14px;
    }

    th {
      background: rgba(255, 255, 255, 0.02);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      padding: 16px 24px;
      font-weight: 600;
      border-bottom: 1px solid var(--card-border);
    }

    td {
      padding: 18px 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      color: var(--text-main);
      max-width: 320px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    tr {
      cursor: pointer;
      transition: background 0.2s;
    }

    tr:hover {
      background: rgba(255, 255, 255, 0.02);
    }

    .phone-cell {
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
    }

    .summary-cell {
      color: var(--text-muted);
    }

    /* Modal dialog */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(8px);
      z-index: 1000;
      display: flex;
      justify-content: center;
      align-items: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s;
    }

    .modal-overlay.active {
      opacity: 1;
      pointer-events: all;
    }

    .modal-card {
      width: 100%;
      max-width: 800px;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      background: #0f111a;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: var(--border-radius);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
      transform: scale(0.95);
      transition: transform 0.3s;
      overflow: hidden;
    }

    .modal-overlay.active .modal-card {
      transform: scale(1);
    }

    .modal-header {
      padding: 24px 32px;
      border-bottom: 1px solid var(--card-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .modal-title-desc {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 4px;
    }

    .close-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 24px;
      cursor: pointer;
      line-height: 1;
    }

    .close-btn:hover {
      color: var(--text-main);
    }

    .modal-body {
      padding: 32px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .call-summary-block {
      background: rgba(59, 130, 246, 0.05);
      border-left: 4px solid var(--accent-color);
      padding: 16px 20px;
      border-radius: 0 8px 8px 0;
    }

    .call-summary-block h4 {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--accent-color);
      margin-bottom: 6px;
    }

    .call-summary-block p {
      font-size: 14px;
      line-height: 1.5;
    }

    .transcript-block h4 {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 16px;
    }

    .transcript-turns {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .turn {
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-width: 80%;
    }

    .turn-caller {
      align-self: flex-start;
    }

    .turn-ai {
      align-self: flex-end;
    }

    .turn-bubble {
      padding: 12px 18px;
      border-radius: 12px;
      font-size: 14px;
      line-height: 1.5;
    }

    .turn-caller .turn-bubble {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: var(--text-main);
      border-bottom-left-radius: 2px;
    }

    .turn-ai .turn-bubble {
      background: var(--accent-color);
      color: #ffffff;
      border-bottom-right-radius: 2px;
    }

    .turn-meta {
      font-size: 10px;
      color: var(--text-muted);
    }

    .turn-ai .turn-meta {
      text-align: right;
    }

    @keyframes pulse {
      0% { opacity: 0.6; box-shadow: 0 0 10px var(--accent-color); }
      100% { opacity: 1; box-shadow: 0 0 20px var(--accent-color); }
    }
  </style>
</head>
<body>

  <header>
    <div class="logo-container">
      <div class="logo-glow"></div>
      <h1>Sparkle Dental Admin</h1>
    </div>
    <div>
      <div class="badge badge-active">
        <span style="display:inline-block; width:6px; height:6px; background:#4ade80; border-radius:50%"></span>
        Live Connection
      </div>
    </div>
  </header>

  <main>
    <!-- Stats Row -->
    <div class="stats-grid">
      <div class="glass-card">
        <div class="stat-label">Active Calls</div>
        <div class="stat-value" id="statActiveCalls">0</div>
        <div class="stat-subtext">Conversations right now</div>
      </div>
      <div class="glass-card">
        <div class="stat-label">Total Logs</div>
        <div class="stat-value" id="statTotalCalls">0</div>
        <div class="stat-subtext">Completed call records</div>
      </div>
      <div class="glass-card">
        <div class="stat-label">Confirmed Bookings</div>
        <div class="stat-value" id="statConfirmed" style="color: #4ade80;">0</div>
        <div class="stat-subtext">Added to Google Calendar</div>
      </div>
      <div class="glass-card">
        <div class="stat-label">Missed Contacts</div>
        <div class="stat-value" id="statMissed" style="color: #f87171;">0</div>
        <div class="stat-subtext">Calls with no appointment</div>
      </div>
    </div>

    <!-- Controls Panel -->
    <div class="glass-card controls-panel">
      <div class="search-input-group">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="var(--text-muted)" viewBox="0 0 24 24">
          <path d="M21.71 20.29l-5.4-5.39A8 8 0 1 0 14.8 16.3l5.4 5.39a1 1 0 0 0 1.41-1.41zM4 10a6 6 0 1 1 6 6 6 6 0 0 1-6-6z"/>
        </svg>
        <input type="text" id="filterSearch" placeholder="Search phone or transcript keywords...">
      </div>

      <div class="filters-group">
        <select id="filterOutcome">
          <option value="">All Outcomes</option>
          <option value="Booked">Booked</option>
          <option value="Inquiry">Inquiry</option>
          <option value="Missed">Missed</option>
          <option value="Cancelled">Cancelled</option>
        </select>

        <input type="date" id="filterDate">
      </div>
    </div>

    <!-- List Table -->
    <div class="glass-card" style="padding: 0; overflow: hidden;">
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Date / Time</th>
              <th>Phone Number</th>
              <th>Outcome</th>
              <th>Duration</th>
              <th>AI-Generated Summary</th>
            </tr>
          </thead>
          <tbody id="callsTableBody">
            <tr>
              <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 40px;">
                Connecting to database...
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </main>

  <!-- Transcript Modal -->
  <div class="modal-overlay" id="modalOverlay">
    <div class="modal-card">
      <div class="modal-header">
        <div>
          <h2 id="modalCallTitle">Call Record</h2>
          <div class="modal-title-desc" id="modalCallMeta">CallSid: N/A</div>
        </div>
        <button class="close-btn" id="modalCloseBtn">&times;</button>
      </div>
      <div class="modal-body">
        <div class="call-summary-block">
          <h4>AI Summary</h4>
          <p id="modalCallSummary">Generating summary...</p>
        </div>

        <div class="transcript-block">
          <h4>Full Call Transcript</h4>
          <div class="transcript-turns" id="modalCallTranscript">
            <!-- Transcript turns injected here -->
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    // Live update variables
    let cachedCalls = [];
    const callsTableBody = document.getElementById('callsTableBody');
    const modalOverlay = document.getElementById('modalOverlay');
    
    // Inputs
    const filterSearch = document.getElementById('filterSearch');
    const filterOutcome = document.getElementById('filterOutcome');
    const filterDate = document.getElementById('filterDate');

    // Stats
    const statActiveCalls = document.getElementById('statActiveCalls');
    const statTotalCalls = document.getElementById('statTotalCalls');
    const statConfirmed = document.getElementById('statConfirmed');
    const statMissed = document.getElementById('statMissed');

    // Fetch and draw
    async function loadDashboardData() {
      try {
        // Build query parameters
        const params = new URLSearchParams();
        if (filterSearch.value) params.append('search', filterSearch.value);
        if (filterOutcome.value) params.append('outcome', filterOutcome.value);
        if (filterDate.value) params.append('date', filterDate.value);

        // 1. Fetch Stats
        const statsRes = await fetch('/api/admin/stats');
        const stats = await statsRes.json();
        if (stats.success) {
          statActiveCalls.innerText = stats.data.activeCalls;
          statTotalCalls.innerText = stats.data.totalCalls;
          statConfirmed.innerText = stats.data.confirmedBookings;
          statMissed.innerText = stats.data.missedCalls;
        }

        // 2. Fetch Call List
        const callsRes = await fetch('/api/admin/calls?' + params.toString());
        const calls = await callsRes.json();
        if (calls.success) {
          cachedCalls = calls.data;
          renderCallsList(calls.data);
        }
      } catch (err) {
        console.error('Error fetching dashboard metrics:', err);
      }
    }

    function renderCallsList(calls) {
      if (calls.length === 0) {
        callsTableBody.innerHTML = \`
          <tr>
            <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 40px;">
              No calls match the selected search filters.
            </td>
          </tr>
        \`;
        return;
      }

      callsTableBody.innerHTML = calls.map(c => {
        const dateStr = new Date(c.created_at).toLocaleString();
        const durationStr = c.duration_seconds > 0 ? c.duration_seconds + 's' : '0s';
        
        let outcomeBadge = '';
        if (c.booking_outcome === 'Booked') {
          outcomeBadge = '<span class="badge badge-outcome-booked">Booked</span>';
        } else if (c.booking_outcome === 'Inquiry') {
          outcomeBadge = '<span class="badge badge-outcome-inquiry">Inquiry</span>';
        } else if (c.booking_outcome === 'Missed') {
          outcomeBadge = '<span class="badge badge-outcome-missed">Missed</span>';
        } else {
          outcomeBadge = '<span class="badge badge-outcome-cancelled">' + c.booking_outcome + '</span>';
        }

        return \`
          <tr onclick="openCallModal('\${c.call_sid}')">
            <td>\${dateStr}</td>
            <td class="phone-cell">\${c.caller_phone}</td>
            <td>\${outcomeBadge}</td>
            <td>\${durationStr}</td>
            <td class="summary-cell">\${c.summary || 'Summary generation processing...'}</td>
          </tr>
        \`;
      }).join('');
    }

    // Modal Control
    function openCallModal(callSid) {
      const call = cachedCalls.find(c => c.call_sid === callSid);
      if (!call) return;

      document.getElementById('modalCallTitle').innerText = 'Call with ' + call.caller_phone;
      document.getElementById('modalCallMeta').innerText = 'CallSid: ' + call.call_sid + ' | ' + new Date(call.created_at).toLocaleString();
      document.getElementById('modalCallSummary').innerText = call.summary || 'No summary generated.';

      // Parse and format transcript turns
      const turnsContainer = document.getElementById('modalCallTranscript');
      if (!call.transcript || !call.transcript.trim()) {
        turnsContainer.innerHTML = '<div style="color: var(--text-muted);">No transcript content logged.</div>';
      } else {
        const lines = call.transcript.split('\\n');
        turnsContainer.innerHTML = lines.map(line => {
          const isAI = line.startsWith('AI:');
          const content = line.substring(3).trim();
          const roleLabel = isAI ? 'AI Receptionist' : 'Caller';

          return \`
            <div class="turn \${isAI ? 'turn-ai' : 'turn-caller'}">
              <div class="turn-bubble">\${content}</div>
              <div class="turn-meta">\${roleLabel}</div>
            </div>
          \`;
        }).join('');
      }

      modalOverlay.classList.add('active');
    }

    // Close Modal
    document.getElementById('modalCloseBtn').onclick = () => {
      modalOverlay.classList.remove('active');
    };
    modalOverlay.onclick = (e) => {
      if (e.target === modalOverlay) {
        modalOverlay.classList.remove('active');
      }
    };

    // Filters event binding
    filterSearch.oninput = loadDashboardData;
    filterOutcome.onchange = loadDashboardData;
    filterDate.onchange = loadDashboardData;

    // Load initial + start poll every 3 seconds for active/real-time updates
    loadDashboardData();
    setInterval(loadDashboardData, 3000);
  </script>
</body>
</html>
`;

// ── Admin Controller Handlers ──────────────────────────────────────────────────

/**
 * GET /api/admin/stats
 * Aggregates calls stats.
 */
export async function getDashboardStatsHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    const conversationService = getConversationService();

    // 1. Get active calls from conversation memory
    const activeSessionIds = await conversationService.getActiveSessionIds();
    const activeCallsCount = activeSessionIds.filter(id => id.startsWith('CA')).length;

    // 2. Query stats from Supabase call logs
    const { count: totalCallsCount } = (await (supabase.from('call_logs') as any)
      .select('*', { count: 'exact', head: true })) as { count: number | null };

    const { count: bookedCount } = (await (supabase.from('call_logs') as any)
      .select('*', { count: 'exact', head: true })
      .eq('booking_outcome', 'Booked')) as { count: number | null };

    const { count: missedCount } = (await (supabase.from('call_logs') as any)
      .select('*', { count: 'exact', head: true })
      .eq('booking_outcome', 'Missed')) as { count: number | null };

    void reply.status(200).send({
      success: true,
      data: {
        activeCalls: activeCallsCount,
        totalCalls: totalCallsCount || 0,
        confirmedBookings: bookedCount || 0,
        missedCalls: missedCount || 0,
      },
    });
  } catch (err: any) {
    logger.error(err, 'Failed to fetch admin stats');
    void reply.status(500).send({ success: false, error: err.message });
  }
}

/**
 * GET /api/admin/calls
 * Query and filter call logs.
 */
export async function getCallsListHandler(
  request: FastifyRequest<{
    Querystring: { search?: string; outcome?: string; date?: string };
  }>,
  reply: FastifyReply,
): Promise<void> {
  const { search, outcome, date } = request.query;

  try {
    const supabase = getSupabaseClient();
    let query = (supabase.from('call_logs') as any)
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by outcome
    if (outcome) {
      query = query.eq('booking_outcome', outcome);
    }

    // Filter by date
    if (date) {
      const startOfDay = `${date}T00:00:00.000Z`;
      const endOfDay = `${date}T23:59:59.999Z`;
      query = query.gte('created_at', startOfDay).lte('created_at', endOfDay);
    }

    // Search phone or transcript
    if (search) {
      query = query.or(`caller_phone.ilike.%${search}%,transcript.ilike.%${search}%`);
    }

    const { data, error } = (await query) as { data: any[] | null; error: any };

    if (error) {
      logger.error({ error }, 'Supabase error fetching call logs');
      void reply.status(500).send({ success: false, error: 'Database query failed' });
      return;
    }

    void reply.status(200).send({
      success: true,
      data: data || [],
    });
  } catch (err: any) {
    logger.error(err, 'Unexpected error fetching call logs');
    void reply.status(500).send({ success: false, error: err.message });
  }
}

/**
 * GET /admin
 * Serves the HTML admin dashboard template.
 */
export async function serveDashboardUiHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  void reply
    .status(200)
    .header('Content-Type', 'text/html')
    .send(dashboardHtml);
}
