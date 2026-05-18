export const explorerHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Log Whisperer Explorer</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f6f7f9;
        --panel: #ffffff;
        --border: #d8dee8;
        --text: #172033;
        --muted: #667085;
        --blue: #2563eb;
        --teal: #0f766e;
        --amber: #b45309;
        --red: #b42318;
        --green: #15803d;
      }

      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: var(--bg);
        color: var(--text);
        font-size: 13px;
      }

      button, input, select {
        font: inherit;
      }

      .app {
        display: grid;
        grid-template-rows: 48px minmax(0, 1fr) 30px;
        height: 100vh;
      }

      .topbar {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 0 16px;
        background: var(--panel);
        border-bottom: 1px solid var(--border);
      }

      .brand {
        font-weight: 700;
        font-size: 15px;
        min-width: 132px;
      }

      .topbar-spacer {
        flex: 1;
      }

      .environment-control {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-left: auto;
      }

      .environment-control label {
        margin: 0;
        color: var(--muted);
        font-size: 12px;
        font-weight: 650;
      }

      .environment-control select {
        width: auto;
        min-width: 148px;
        height: 30px;
      }

      .pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border: 1px solid var(--border);
        border-radius: 999px;
        padding: 3px 8px;
        color: var(--muted);
        background: #fff;
        white-space: nowrap;
      }

      .status-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--green);
      }

      .layout {
        min-height: 0;
        display: grid;
        grid-template-columns: 280px minmax(620px, 1fr) 340px;
      }

      .layout.discovery-collapsed {
        grid-template-columns: 44px minmax(620px, 1fr) 340px;
      }

      .layout.discovery-collapsed aside {
        padding: 10px 8px;
        overflow: hidden;
      }

      .layout.discovery-collapsed .discovery-content {
        display: none;
      }

      .discovery-rail {
        display: none;
      }

      .layout.discovery-collapsed .discovery-rail {
        display: flex;
        height: 100%;
        align-items: center;
        justify-content: flex-start;
        flex-direction: column;
        gap: 12px;
      }

      .discovery-rail-label {
        writing-mode: vertical-rl;
        transform: rotate(180deg);
        color: var(--muted);
        font-size: 12px;
        font-weight: 750;
        letter-spacing: 0;
      }

      aside, main, .inspector {
        min-height: 0;
      }

      aside {
        padding: 14px;
        background: #fbfcfe;
        border-right: 1px solid var(--border);
        overflow: auto;
      }

      main {
        display: grid;
        grid-template-rows: 34% 66%;
        gap: 10px;
        padding: 12px;
        overflow: hidden;
      }

      main.candidates-collapsed {
        grid-template-rows: 38px minmax(0, 1fr);
      }

      .inspector {
        padding: 14px;
        background: #fbfcfe;
        border-left: 1px solid var(--border);
        overflow: auto;
      }

      .section {
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: 8px;
        overflow: hidden;
      }

      .section.collapsed .table-wrap {
        display: none;
      }

      .section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-height: 38px;
        padding: 8px 10px;
        border-bottom: 1px solid var(--border);
        font-weight: 650;
      }

      .section-body {
        padding: 10px;
      }

      label {
        display: block;
        margin: 10px 0 4px;
        color: var(--muted);
        font-size: 12px;
        font-weight: 600;
      }

      input, select {
        width: 100%;
        height: 32px;
        border: 1px solid var(--border);
        border-radius: 6px;
        padding: 0 8px;
        background: #fff;
        color: var(--text);
      }

      button {
        height: 32px;
        border: 1px solid #1d4ed8;
        border-radius: 6px;
        padding: 0 10px;
        color: #fff;
        background: var(--blue);
        cursor: pointer;
        font-weight: 650;
      }

      button.secondary {
        color: var(--text);
        background: #fff;
        border-color: var(--border);
      }

      button.icon-button {
        width: 28px;
        height: 24px;
        padding: 0;
        color: var(--text);
        background: #fff;
        border-color: var(--border);
      }

      .checkbox-list {
        display: grid;
        gap: 6px;
        margin-top: 8px;
      }

      .checkbox-list label {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0;
        color: var(--text);
        font-weight: 500;
      }

      .checkbox-list input {
        width: 14px;
        height: 14px;
      }

      .table-wrap {
        height: calc(100% - 39px);
        overflow: auto;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }

      th, td {
        border-bottom: 1px solid #edf0f5;
        padding: 7px 8px;
        text-align: left;
        vertical-align: top;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      th {
        position: sticky;
        top: 0;
        z-index: 1;
        color: var(--muted);
        background: #f9fafb;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0;
      }

      tr.selected {
        background: #eff6ff;
      }

      .badge {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        padding: 2px 7px;
        background: #eef2ff;
        color: #3730a3;
        font-size: 11px;
        font-weight: 650;
      }

      .level-error { color: var(--red); background: #fee4e2; }
      .level-warn { color: var(--amber); background: #fef3c7; }
      .level-info { color: var(--blue); background: #dbeafe; }
      .level-success { color: var(--green); background: #dcfce7; }

      .trace-pane {
        min-height: 0;
      }

      .operation-workspace {
        display: grid;
        grid-template-columns: 250px minmax(0, 1fr);
        gap: 10px;
        height: 100%;
        min-height: 0;
      }

      .timeline-panel {
        display: grid;
        grid-template-rows: 39px minmax(0, 1fr);
        min-height: 0;
      }

      .timeline {
        position: relative;
        height: auto;
        margin: 0;
        padding: 10px 10px 14px 24px;
        background: #fff;
        overflow: auto;
      }

      .timeline-line {
        position: absolute;
        left: 13px;
        top: 20px;
        bottom: 20px;
        width: 2px;
        background: #d8dee8;
      }

      .timeline-list {
        position: relative;
        display: grid;
        gap: 12px;
      }

      .timeline-item {
        position: relative;
        min-width: 0;
      }

      .timeline-dot {
        position: absolute;
        left: -16px;
        top: 4px;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        border: 2px solid #fff;
        background: var(--teal);
        box-shadow: 0 0 0 1px rgba(0,0,0,.14);
      }

      .timeline-item.root .timeline-dot {
        background: var(--blue);
      }

      .timeline-item.return .timeline-dot {
        background: var(--amber);
      }

      .timeline-time {
        color: var(--muted);
        font-size: 11px;
        margin-bottom: 2px;
      }

      .timeline-call {
        display: block;
        width: 100%;
        height: auto;
        border: 0;
        border-radius: 6px;
        padding: 0;
        background: transparent;
        color: var(--text);
        text-align: left;
        font-weight: 650;
        line-height: 1.25;
        cursor: default;
      }

      .timeline-call.linked {
        cursor: pointer;
      }

      .timeline-call.linked:hover {
        color: var(--teal);
        text-decoration: underline;
        text-underline-offset: 2px;
      }

      .timeline-call.return {
        color: #92400e;
      }

      .timeline-meta {
        margin-top: 3px;
        color: var(--muted);
        font-size: 11px;
        line-height: 1.35;
        overflow-wrap: anywhere;
      }

      .log-section {
        min-height: 0;
        display: grid;
        grid-template-rows: 39px 38px minmax(0, 1fr);
      }

      .log-section .table-wrap {
        height: auto;
        overflow: auto;
      }

      .log-tabs {
        display: flex;
        align-items: center;
        gap: 2px;
        padding: 6px 8px 0;
        border-bottom: 1px solid var(--border);
        overflow-x: auto;
        background: #f8fafc;
      }

      .log-tab {
        height: 32px;
        border: 1px solid var(--border);
        border-bottom: 0;
        border-radius: 7px 7px 0 0;
        padding: 0 12px;
        color: var(--text);
        background: #eef2f7;
        white-space: nowrap;
        font-weight: 650;
      }

      .log-tab.active {
        color: var(--text);
        border-color: var(--border);
        background: #fff;
        margin-bottom: -1px;
      }

      .follow-button {
        width: 24px;
        height: 22px;
        margin-left: 5px;
        padding: 0;
        color: var(--teal);
        background: #ecfdf5;
        border-color: #99f6e4;
        vertical-align: middle;
      }

      .log-section table {
        table-layout: auto;
        min-width: 1460px;
      }

      .log-section th,
      .log-section td {
        overflow: visible;
      }

      .log-section td.message-cell {
        white-space: nowrap;
        overflow: visible;
        text-overflow: clip;
      }

      .kv {
        display: grid;
        grid-template-columns: 104px minmax(0, 1fr);
        gap: 7px 10px;
        margin: 8px 0 14px;
      }

      .kv div:nth-child(odd) {
        color: var(--muted);
        font-weight: 600;
      }

      .detail-stack {
        display: grid;
        gap: 12px;
      }

      .detail-message {
        padding: 10px;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: #f8fafc;
        line-height: 1.45;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }

      .mini-heading {
        margin: 0 0 6px;
        color: var(--muted);
        font-size: 11px;
        font-weight: 750;
        text-transform: uppercase;
        letter-spacing: 0;
      }

      .field-grid {
        display: grid;
        gap: 6px;
      }

      .field-row {
        display: grid;
        grid-template-columns: 104px minmax(0, 1fr);
        gap: 10px;
        align-items: start;
      }

      .field-key {
        color: var(--muted);
        font-weight: 650;
      }

      .field-value {
        overflow-wrap: anywhere;
      }

      details.raw-details {
        border: 1px solid var(--border);
        border-radius: 8px;
        background: #fff;
      }

      details.raw-details summary {
        cursor: pointer;
        padding: 9px 10px;
        color: var(--muted);
        font-weight: 650;
      }

      details.raw-details pre {
        border: 0;
        border-top: 1px solid var(--border);
        border-radius: 0 0 8px 8px;
      }

      .raw-editor {
        height: 320px;
        border-top: 1px solid var(--border);
      }

      pre {
        max-height: 260px;
        overflow: auto;
        margin: 0;
        padding: 10px;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: #0f172a;
        color: #e5e7eb;
        font-size: 11px;
      }

      .bottom {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 0 12px;
        border-top: 1px solid var(--border);
        background: var(--panel);
        color: var(--muted);
        font-size: 12px;
      }

      .muted { color: var(--muted); }
      .error-text { color: var(--red); }

      .skeleton-row td {
        padding: 9px 8px;
      }

      .skeleton {
        display: block;
        height: 12px;
        border-radius: 999px;
        background: linear-gradient(90deg, #eef2f7 0%, #f8fafc 45%, #eef2f7 90%);
        background-size: 220% 100%;
        animation: shimmer 1.2s infinite linear;
      }

      @keyframes shimmer {
        from { background-position: 120% 0; }
        to { background-position: -120% 0; }
      }
    </style>
  </head>
  <body>
    <div class="app">
      <header class="topbar">
        <div class="brand">Log Whisperer</div>
        <button class="icon-button" id="toggleDiscovery" title="Collapse Discovery" type="button">☰</button>
        <span class="pill"><span class="status-dot"></span><span id="providerStatus">Loading</span></span>
        <span class="pill" id="timeRangeLabel">No search yet</span>
        <div class="topbar-spacer"></div>
        <div class="environment-control">
          <label for="environmentSelect">Environment</label>
          <select id="environmentSelect"></select>
        </div>
      </header>

      <div class="layout" id="layout">
        <aside>
          <div class="discovery-rail">
            <button class="icon-button" id="expandDiscoveryRail" title="Expand Discovery" type="button">☰</button>
            <div class="discovery-rail-label">Discovery</div>
          </div>
          <div class="discovery-content">
          <div class="section">
            <div class="section-header">
              <span>Discovery</span>
              <button class="icon-button" id="collapseDiscoveryPanel" title="Collapse Discovery" type="button">☰</button>
            </div>
            <div class="section-body">
              <label for="serviceSelect">Service</label>
              <select id="serviceSelect"></select>
              <div id="seedDetectorGroup" hidden>
                <label for="seedDetector">Seed event</label>
                <select id="seedDetector"></select>
              </div>
              <label for="fromInput">From</label>
              <input id="fromInput" type="datetime-local" />
              <label for="toInput">To</label>
              <input id="toInput" type="datetime-local" />
              <div id="dynamicFilters"></div>
              <div style="height: 12px"></div>
              <button id="findButton">Find Transactions</button>
            </div>
          </div>

          <div style="height: 12px"></div>
          <div class="section">
            <div class="section-header">Expansion</div>
            <div class="section-body">
              <label for="depthInput">Depth</label>
              <input id="depthInput" type="number" min="1" max="12" value="5" />
              <label for="contextInput">Context window seconds</label>
              <input id="contextInput" type="number" min="10" value="90" />
              <div class="checkbox-list">
                <label><input type="checkbox" checked /> Follow external calls</label>
                <label><input type="checkbox" checked /> Follow Azure operation id</label>
                <label><input type="checkbox" checked /> Include dependencies</label>
                <label><input type="checkbox" checked /> Include database calls</label>
                <label><input type="checkbox" checked /> Include warnings</label>
              </div>
            </div>
          </div>
          </div>
        </aside>

        <main id="mainPane">
          <section class="section" id="candidateSection">
            <div class="section-header">
              <span>Candidate Transactions</span>
              <span style="display:flex;align-items:center;gap:8px">
                <span class="muted" id="candidateCount">0 candidates</span>
                <button class="icon-button" id="toggleCandidates" title="Collapse candidate transactions" type="button">⌃</button>
              </span>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style="width: 150px">Time</th>
                    <th style="width: 112px">Service</th>
                    <th style="width: 74px">Method</th>
                    <th>Path</th>
                    <th style="width: 90px">Tenant</th>
                    <th style="width: 180px">User</th>
                    <th style="width: 150px">Operation</th>
                  </tr>
                </thead>
                <tbody id="candidateRows"></tbody>
              </table>
            </div>
          </section>

          <section class="trace-pane">
            <div class="operation-workspace">
              <div class="section timeline-panel">
                <div class="section-header">
                  <span>Timeline</span>
                </div>
                <div class="timeline" id="timeline"></div>
              </div>

              <div class="section log-section">
                <div class="section-header">
                  <span>Operation Log Stream</span>
                  <span class="muted" id="logCount">0 rows</span>
                </div>
                <div class="log-tabs" id="logTabs"></div>
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th style="width: 118px">Time</th>
                        <th style="width: 126px">Event</th>
                        <th style="min-width: 1100px">Message</th>
                      </tr>
                    </thead>
                    <tbody id="logRows"></tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        </main>

        <section class="inspector">
          <div class="section">
            <div class="section-header">Selected Detail</div>
            <div class="section-body">
              <div id="detail" class="muted">Select a candidate or log row.</div>
            </div>
          </div>
        </section>
      </div>

      <footer class="bottom">
        <span id="diagnostics">Ready</span>
      </footer>
    </div>

    <script src="/monaco/vs/loader.js"></script>
    <script>
      const state = {
        config: null,
        candidates: [],
        selectedCandidateId: null,
        operation: null,
        selectedLogId: null,
        candidatesCollapsed: false,
        discoveryCollapsed: false,
        searchingCandidates: false,
        loadingOperation: false,
        rawDetails: {},
        rawEditors: {},
        monacoPromise: null,
        rawDetailSequence: 0,
        environmentId: null
      };

      const el = (id) => document.getElementById(id);
      const fmt = (value) => value ? new Date(value).toLocaleString() : '';
      const short = (value, length = 14) => value && value.length > length ? value.slice(0, length) + '...' : (value || '');
      const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
      const redactValue = (key, value) => {
        const text = String(value ?? '');
        const lowerKey = String(key || '').toLowerCase();
        if (lowerKey.includes('authorization') || lowerKey.includes('application-key') || lowerKey.includes('apikey') || lowerKey.includes('api-key') || lowerKey.includes('token')) return '***REDACTED***';
        if (/Bearer\s+[A-Za-z0-9_.-]+/i.test(text)) return text.replace(/Bearer\s+[A-Za-z0-9_.-]+/gi, 'Bearer ***REDACTED***');
        if (/eyJ[A-Za-z0-9_-]+\\.eyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+/.test(text)) return text.replace(/eyJ[A-Za-z0-9_-]+\\.eyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+/g, '***JWT_REDACTED***');
        return text;
      };

      function localDateTime(date) {
        const pad = (num) => String(num).padStart(2, '0');
        return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + 'T' + pad(date.getHours()) + ':' + pad(date.getMinutes());
      }

      function seedTimes() {
        const to = new Date();
        const from = new Date(to.getTime() - 45 * 60 * 1000);
        el('fromInput').value = localDateTime(from);
        el('toInput').value = localDateTime(to);
      }

      function selectedSeedDetector() {
        return (state.config?.detectors || []).find((detector) => detector.id === el('seedDetector').value);
      }

      function filterLabel(name) {
        const labels = {
          requestId: 'Request id',
          method: 'Method',
          path: 'Path contains',
          tenant: 'Tenant',
          user: 'User contains',
          upn: 'UPN contains',
          email: 'Email contains',
          fullName: 'Full name contains',
          identityId: 'Identity id'
        };
        if (labels[name]) return labels[name];
        return String(name)
          .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
          .replace(/[_-]+/g, ' ')
          .replace(/^./, (char) => char.toUpperCase());
      }

      function filterPlaceholder(name) {
        const placeholders = {
          requestId: 'optional',
          method: 'Any method',
          path: 'path or query',
          tenant: 'tenant',
          user: 'user@example.com',
          upn: 'user@example.com',
          email: 'user@example.com',
          fullName: 'Full name',
          identityId: 'optional'
        };
        return placeholders[name] || 'contains...';
      }

      function renderDiscoveryFilters() {
        const detector = selectedSeedDetector();
        const sensitive = new Set(detector?.sensitiveFields || []);
        const fieldNames = [];
        for (const extractor of detector?.fieldExtractors || []) {
          if (extractor?.name === 'origin') continue;
          if (!extractor?.name || sensitive.has(extractor.name) || fieldNames.includes(extractor.name)) continue;
          fieldNames.push(extractor.name);
        }

        if (!fieldNames.length) {
          el('dynamicFilters').innerHTML = '<div class="muted">No searchable fields configured for this seed event.</div>';
          return;
        }

        el('dynamicFilters').innerHTML = fieldNames.map((name) => {
          const inputId = 'filter_' + name.replace(/[^A-Za-z0-9_-]/g, '_');
          if (name === 'method') {
            return '<label for="' + escapeHtml(inputId) + '">' + escapeHtml(filterLabel(name)) + '</label>' +
              '<select id="' + escapeHtml(inputId) + '" class="discovery-filter" data-filter-field="' + escapeHtml(name) + '">' +
                '<option value="">Any method</option>' +
                '<option value="GET">GET</option>' +
                '<option value="POST">POST</option>' +
                '<option value="PATCH">PATCH</option>' +
                '<option value="DELETE">DELETE</option>' +
              '</select>';
          }
          return '<label for="' + escapeHtml(inputId) + '">' + escapeHtml(filterLabel(name)) + '</label>' +
            '<input id="' + escapeHtml(inputId) + '" class="discovery-filter" data-filter-field="' + escapeHtml(name) + '" placeholder="' + escapeHtml(filterPlaceholder(name)) + '" />';
        }).join('');
      }

      async function loadConfig(environmentId, options = {}) {
        const query = environmentId ? '?environmentId=' + encodeURIComponent(environmentId) : '';
        const previousFrom = el('fromInput').value;
        const previousTo = el('toInput').value;
        const response = await fetch('/api/config' + query);
        const config = await response.json();
        if (!response.ok) throw new Error(config.error || 'Failed to load config');
        state.config = config;
        state.environmentId = config.environment || environmentId || null;
        el('providerStatus').textContent = config.providerStatus;

        const environments = config.environments?.length ? config.environments : [{ id: config.environment || 'local' }];
        el('environmentSelect').innerHTML = environments.map((environment) => '<option value="' + escapeHtml(environment.id) + '">' + escapeHtml(environment.id) + '</option>').join('');
        el('environmentSelect').value = config.environment || environments[0]?.id || 'local';
        el('serviceSelect').innerHTML = config.services.map((service) => '<option value="' + escapeHtml(service.id) + '">' + escapeHtml(service.name) + '</option>').join('');
        const seedDetectors = config.detectors.filter((detector) => detector.type === 'api-start');
        el('seedDetector').innerHTML = seedDetectors.map((detector) => '<option value="' + escapeHtml(detector.id) + '">' + escapeHtml(detector.id) + '</option>').join('');
        renderDiscoveryFilters();
        if (options.preserveTimeRange) {
          el('fromInput').value = previousFrom;
          el('toInput').value = previousTo;
        } else {
          seedTimes();
        }
      }

      async function switchEnvironment() {
        const environmentId = el('environmentSelect').value;
        state.candidates = [];
        state.selectedCandidateId = null;
        state.operation = null;
        state.selectedLogId = null;
        resetRawEditors();
        renderCandidates();
        renderTimeline();
        renderTabs();
        renderLogs();
        el('detail').innerHTML = '<div class="muted">Select a candidate or log row.</div>';
        el('diagnostics').textContent = 'Switched environment to ' + environmentId;
        await loadConfig(environmentId, { preserveTimeRange: true });
      }

      function filters() {
        const result = {};
        document.querySelectorAll('.discovery-filter').forEach((input) => {
          const field = input.dataset.filterField;
          if (field && input.value.trim().length > 0) {
            result[field] = input.value.trim();
          }
        });
        return result;
      }

      async function findTransactions() {
        setCandidateLoading(true);
        el('diagnostics').textContent = 'Searching candidate API starts...';
        try {
          const body = {
            environmentId: state.environmentId,
            serviceId: el('serviceSelect').value,
            seedDetectorId: el('seedDetector').value,
            from: el('fromInput').value,
            to: el('toInput').value,
            filters: filters()
          };
          const response = await fetch('/api/transactions/search', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body)
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || 'Search failed');
          state.candidates = result.candidates;
          state.selectedCandidateId = null;
          renderCandidates();
          if (result.candidates.length > 0) {
            setDiscoveryCollapsed(true);
          }
          const diagnostics = result.diagnostics || { queries: 1, rows: 0, detectedEvents: 0, warnings: [] };
          const warningText = diagnostics.warnings && diagnostics.warnings.length ? ' - ' + diagnostics.warnings.join(' ') : '';
          el('diagnostics').textContent =
            'candidate search: ' +
            diagnostics.queries +
            ' query, ' +
            diagnostics.rows +
            ' Azure rows, ' +
            diagnostics.detectedEvents +
            ' api-start matches, ' +
            result.candidates.length +
            ' candidates' +
            warningText;
          el('timeRangeLabel').textContent = el('fromInput').value + ' - ' + el('toInput').value;
        } finally {
          setCandidateLoading(false);
        }
      }

      function setCandidateLoading(isLoading) {
        state.searchingCandidates = isLoading;
        const button = el('findButton');
        button.disabled = isLoading;
        button.textContent = isLoading ? 'Searching...' : 'Find Transactions';
      }

      function renderCandidates() {
        el('candidateCount').textContent = state.candidates.length + ' candidates';
        el('candidateRows').innerHTML = state.candidates.map((candidate) => {
          const selected = candidate.id === state.selectedCandidateId ? ' class="selected"' : '';
          return '<tr' + selected + ' data-candidate="' + escapeHtml(candidate.id) + '">' +
            '<td>' + escapeHtml(fmt(candidate.timeGenerated)) + '</td>' +
            '<td>' + escapeHtml(candidate.serviceName) + '</td>' +
            '<td>' + escapeHtml(candidate.method || '') + '</td>' +
            '<td title="' + escapeHtml(candidate.path || '') + '">' + escapeHtml(candidate.path || '') + '</td>' +
            '<td>' + escapeHtml(candidate.tenant || '') + '</td>' +
            '<td title="' + escapeHtml(candidate.user || '') + '">' + escapeHtml(candidate.user || '') + '</td>' +
            '<td title="' + escapeHtml(candidate.operationId || '') + '">' + escapeHtml(short(candidate.operationId || 'missing')) + '</td>' +
          '</tr>';
        }).join('');
      }

      function toggleCandidates() {
        setCandidatesCollapsed(!state.candidatesCollapsed);
      }

      function setCandidatesCollapsed(isCollapsed) {
        state.candidatesCollapsed = isCollapsed;
        el('candidateSection').classList.toggle('collapsed', state.candidatesCollapsed);
        el('mainPane').classList.toggle('candidates-collapsed', state.candidatesCollapsed);
        const button = el('toggleCandidates');
        button.textContent = state.candidatesCollapsed ? '⌄' : '⌃';
        button.title = state.candidatesCollapsed ? 'Expand candidate transactions' : 'Collapse candidate transactions';
      }

      function toggleDiscovery() {
        setDiscoveryCollapsed(!state.discoveryCollapsed);
      }

      function setDiscoveryCollapsed(isCollapsed) {
        state.discoveryCollapsed = isCollapsed;
        el('layout').classList.toggle('discovery-collapsed', state.discoveryCollapsed);
        const button = el('toggleDiscovery');
        button.textContent = state.discoveryCollapsed ? '☰' : '☰';
        button.title = state.discoveryCollapsed ? 'Expand Discovery' : 'Collapse Discovery';
      }

      async function selectCandidate(id) {
        const candidate = state.candidates.find((item) => item.id === id);
        if (!candidate) return;
        state.selectedCandidateId = id;
        renderCandidates();
        setCandidatesCollapsed(true);
        renderCandidateDetail(candidate);
        if (!candidate.operationId) {
          el('diagnostics').textContent = 'Selected candidate has no Azure operation_Id.';
          return;
        }
        await loadOperation(candidate);
      }

      async function loadOperation(candidate) {
        setOperationLoading(true);
        el('diagnostics').textContent = 'Loading operation logs by Azure operation_Id...';
        try {
          const response = await fetch('/api/operations/' + encodeURIComponent(candidate.operationId) + '/logs', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              environmentId: state.environmentId,
              serviceId: candidate.serviceId,
              from: el('fromInput').value,
              to: el('toInput').value
            })
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || 'Operation load failed');
          state.operation = {
            ...result,
            tabs: [
              {
                id: candidate.serviceId,
                serviceId: candidate.serviceId,
                name: candidate.serviceName,
                events: result.events,
                detectedEvents: result.detectedEvents,
                loading: false
              }
            ],
            activeTabId: candidate.serviceId
          };
          renderTimeline();
          renderTabs();
          renderLogs();
          el('diagnostics').textContent = 'operation logs: ' + result.diagnostics.queries + ' query, ' + result.diagnostics.rows + ' rows, redaction on';
        } finally {
          setOperationLoading(false);
        }
      }

      function setOperationLoading(isLoading) {
        state.loadingOperation = isLoading;
        if (isLoading) {
          el('logTabs').innerHTML = '';
          el('logCount').textContent = 'Loading...';
          el('logRows').innerHTML = Array.from({ length: 12 }).map(() =>
            '<tr class="skeleton-row">' +
              '<td><span class="skeleton" style="width:74px"></span></td>' +
              '<td><span class="skeleton" style="width:94px"></span></td>' +
              '<td><span class="skeleton" style="width:96%"></span></td>' +
            '</tr>'
          ).join('');
        }
      }

      function eventKindFor(log) {
        const detected = (state.operation?.detectedEvents || []).find((item) => item.rawEventId === log.id);
        if (detected) return detected.kind;
        if (log.source === 'request') return log.success === false ? 'api-end' : 'api';
        if (log.source === 'dependency') return 'external-service-call';
        if (log.source === 'exception') return 'error';
        return 'log';
      }

      function levelClass(log) {
        const text = String(log.level || log.severityLevel || '').toLowerCase();
        if (log.success === false || log.source === 'exception' || text.includes('error')) return 'level-error';
        if (text.includes('warn')) return 'level-warn';
        if (log.success === true) return 'level-success';
        return 'level-info';
      }

      function activeTab() {
        const tabs = state.operation?.tabs || [];
        return tabs.find((tab) => tab.id === state.operation?.activeTabId) || tabs[0];
      }

      function detectionsForLog(logId) {
        return (state.operation?.detectedEvents || []).filter((item) => item.rawEventId === logId);
      }

      function renderTabs() {
        const tabs = state.operation?.tabs || [];
        if (!tabs.length) {
          el('logTabs').innerHTML = '';
          return;
        }
        el('logTabs').innerHTML = tabs.map((tab) =>
          '<button type="button" class="log-tab' + (tab.id === state.operation.activeTabId ? ' active' : '') + '" data-log-tab="' + escapeHtml(tab.id) + '">' +
            escapeHtml(tab.name) +
            (tab.loading ? ' · loading' : ' · ' + tab.events.length) +
          '</button>'
        ).join('');
      }

      function renderLogs() {
        const tab = activeTab();
        if (tab?.loading) {
          el('logCount').textContent = 'Loading ' + tab.name + '...';
          el('logRows').innerHTML = Array.from({ length: 12 }).map(() =>
            '<tr class="skeleton-row">' +
              '<td><span class="skeleton" style="width:74px"></span></td>' +
              '<td><span class="skeleton" style="width:94px"></span></td>' +
              '<td><span class="skeleton" style="width:96%"></span></td>' +
            '</tr>'
          ).join('');
          return;
        }
        const events = tab?.events || [];
        el('logCount').textContent = (tab?.name ? tab.name + ': ' : '') + events.length + ' rows';
        el('logRows').innerHTML = events.map((log) => {
          const selected = log.id === state.selectedLogId ? ' class="selected"' : '';
          const kind = eventKindFor(log);
          const externalDetection = detectionsForLog(log.id).find((item) => item.kind === 'external-service-call' && item.phase === 'start');
          const targetService = externalDetection ? inferTargetService(externalDetection) : null;
          const followButton = targetService
            ? '<button class="follow-button" type="button" title="Follow to ' + escapeHtml(targetService.name) + '" data-load-target="' + escapeHtml(targetService.id) + '" data-call="' + escapeHtml(externalDetection.id) + '">↗</button>'
            : '';
          return '<tr' + selected + ' data-log="' + escapeHtml(log.id) + '">' +
            '<td>' + escapeHtml(new Date(log.timeGenerated).toLocaleTimeString()) + '</td>' +
            '<td><span class="badge ' + levelClass(log) + '">' + escapeHtml(kind) + '</span>' + followButton + '</td>' +
            '<td class="message-cell">' + escapeHtml(log.message || log.name || log.operationName || '') + '</td>' +
          '</tr>';
        }).join('');
      }

      function externalCallDetections() {
        return (state.operation?.detectedEvents || []).filter((item) => item.kind === 'external-service-call');
      }

      function hostFromDetection(detection) {
        if (detection.fields?.targetHost) return detection.fields.targetHost;
        if (!detection.fields?.url) return '';
        try {
          return new URL(detection.fields.url).host;
        } catch {
          return '';
        }
      }

      function normalizeHost(value) {
        const text = String(value || '').trim();
        if (!text) return '';
        try {
          return new URL(text.includes('://') ? text : 'https://' + text).host.toLowerCase();
        } catch {
          return text.replace(/^https?:\\/\\//i, '').split('/')[0].toLowerCase();
        }
      }

      function pathSegment(value) {
        return String(value || '').toLowerCase().replace(/^\\/+|\\/+$/g, '');
      }

      function firstPathSegment(value) {
        return pathSegment(value).split('/')[0] || '';
      }

      function servicePathNames(service) {
        const id = pathSegment(service.id);
        const idParts = id.split('-').filter(Boolean);
        return [...new Set([
          pathSegment(service.name),
          id,
          idParts[idParts.length - 1] || ''
        ].filter(Boolean))];
      }

      function inferTargetService(detection) {
        if (detection.targetServiceId) {
          return (state.config?.services || []).find((service) => service.id === detection.targetServiceId);
        }
        const host = normalizeHost(hostFromDetection(detection));
        if (!host) return null;

        const urlPath = (() => {
          if (!detection.fields?.url) return '';
          try {
            return new URL(detection.fields.url).pathname.toLowerCase();
          } catch {
            return '';
          }
        })();

        return (state.config?.services || []).find((service) => {
          const serviceHost = normalizeHost(service.host || state.config?.host || '');
          if (serviceHost && serviceHost !== host) return false;
          for (const candidate of servicePathNames(service)) {
            const servicePath = '/' + candidate;
            if (urlPath === servicePath || urlPath.startsWith(servicePath + '/')) return true;
          }
          return false;
        }) || null;
      }

      function serviceNameForId(serviceId) {
        const service = (state.config?.services || []).find((item) => item.id === serviceId);
        return service?.name || serviceId;
      }

      function callTargetName(call) {
        const service = inferTargetService(call);
        if (service?.name) return service.name;
        if (call.fields?.targetPath) {
          const first = firstPathSegment(call.fields.targetPath);
          if (first) return first;
        }
        if (call.fields?.url) {
          try {
            const first = firstPathSegment(new URL(call.fields.url).pathname);
            if (first) return first;
          } catch {}
        }
        return hostFromDetection(call) || call.fields?.url || 'External service';
      }

      function callPairKey(call) {
        const target = callTargetName(call).toLowerCase();
        const method = call.fields?.method || '';
        const identity =
          call.fields?.parentSpanId ||
          call.fields?.traceparent ||
          call.fields?.requestId ||
          call.fields?.traceId ||
          call.correlationValue ||
          call.fields?.targetPath ||
          call.fields?.url ||
          '';
        return [call.serviceId, target, method, identity].join('|').toLowerCase();
      }

      function pairedExternalCalls() {
        const calls = externalCallDetections()
          .map((call, index) => ({ call, index }))
          .sort((a, b) => {
            const timeDelta = new Date(a.call.timeGenerated).getTime() - new Date(b.call.timeGenerated).getTime();
            return timeDelta || a.index - b.index;
          });
        const starts = new Map();
        const pairs = [];

        for (const { call } of calls) {
          const key = callPairKey(call);
          if (call.phase === 'start') {
            const queue = starts.get(key) || [];
            queue.push(call);
            starts.set(key, queue);
            continue;
          }

          if (call.phase === 'end') {
            const queue = starts.get(key) || [];
            const start = queue.shift();
            if (queue.length === 0) {
              starts.delete(key);
            }
            if (start) {
              pairs.push({ start, end: call });
            } else {
              pairs.push({ start: call, end: call, returnOnly: true });
            }
          }
        }

        for (const queue of starts.values()) {
          for (const start of queue) {
            pairs.push({ start, end: undefined });
          }
        }

        return pairs;
      }

      function renderTimeline() {
        const events = state.operation?.events || [];
        const timeline = el('timeline');
        const tabs = state.operation?.tabs || [];
        if (!events.length && !tabs.length) {
          timeline.innerHTML = '<div class="muted">Select a candidate.</div>';
          return;
        }
        const pairs = pairedExternalCalls();
        const firstTab = tabs[0];
        const rootTime = events[0]?.timeGenerated || firstTab?.events?.[0]?.timeGenerated;
        const root = firstTab
          ? '<div class="timeline-item root">' +
              '<span class="timeline-dot"></span>' +
              '<div class="timeline-time">' + escapeHtml(rootTime ? new Date(rootTime).toLocaleTimeString() : '') + '</div>' +
              '<div class="timeline-call">' + escapeHtml(firstTab.name) + '</div>' +
              '<div class="timeline-meta">' + escapeHtml(firstTab.events.length + ' rows loaded') + '</div>' +
            '</div>'
          : '';

        const calls = pairs.flatMap((pair) => {
          const outbound = pair.returnOnly ? undefined : pair.start;
          const inbound = pair.end;
          const rows = [];

          if (outbound) {
            const call = outbound;
            const targetService = inferTargetService(call);
            const source = serviceNameForId(call.serviceId);
            const target = targetService?.name || callTargetName(call);
            const label = source + ' -> ' + target;
            const duration = call.fields?.executionTime || '';
            const method = call.fields?.method || '';
            const loaded = targetService && tabs.some((tab) => tab.serviceId === targetService.id && !tab.loading && tab.events.length > 0);
            const linkAttrs = targetService
              ? ' data-load-target="' + escapeHtml(targetService.id) + '" data-call="' + escapeHtml(call.id) + '"'
              : '';
            const linkClass = targetService ? ' linked' : '';
            const title = targetService ? 'Click to load linked logs: ' + (call.fields?.url || label) : (call.fields?.url || label);
            rows.push({
              time: new Date(call.timeGenerated).getTime(),
              html: '<div class="timeline-item">' +
                '<span class="timeline-dot"></span>' +
                '<div class="timeline-time">' + escapeHtml(new Date(call.timeGenerated).toLocaleTimeString()) + '</div>' +
                '<button type="button" class="timeline-call' + linkClass + '"' + linkAttrs + ' title="' + escapeHtml(title) + '">' + escapeHtml(label) + '</button>' +
                '<div class="timeline-meta">' + escapeHtml([method, duration, loaded ? 'loaded' : targetService ? 'click to follow' : 'external'].filter(Boolean).join(' · ')) + '</div>' +
              '</div>'
            });
          }

          if (inbound) {
            const call = inbound;
            const source = serviceNameForId(call.serviceId);
            const target = callTargetName(call);
            const label = source + ' <- ' + target;
            const status = call.fields?.status ? 'status ' + call.fields.status : '';
            const duration = call.fields?.executionTime || '';
            const method = call.fields?.method || '';
            rows.push({
              time: new Date(call.timeGenerated).getTime(),
              html: '<div class="timeline-item return">' +
                '<span class="timeline-dot"></span>' +
                '<div class="timeline-time">' + escapeHtml(new Date(call.timeGenerated).toLocaleTimeString()) + '</div>' +
                '<div class="timeline-call return">' + escapeHtml(label) + '</div>' +
                '<div class="timeline-meta">' + escapeHtml([method, duration, status, 'return'].filter(Boolean).join(' · ')) + '</div>' +
              '</div>'
            });
          }

          return rows;
        })
          .sort((a, b) => a.time - b.time)
          .map((row) => row.html)
          .join('');

        timeline.innerHTML = '<div class="timeline-line"></div><div class="timeline-list">' + root + (calls || '<div class="muted">No external calls detected yet.</div>') + '</div>';
      }

      function renderCandidateDetail(candidate) {
        resetRawEditors();
        el('detail').innerHTML = '<div class="detail-stack">' +
          '<div><div class="mini-heading">Message</div><div class="detail-message">' + escapeHtml(candidate.messagePreview || 'API start candidate') + '</div></div>' +
          renderFieldSection('Candidate', {
            detector: candidate.detectorId,
            service: candidate.serviceName,
            operationId: candidate.operationId || 'missing',
            requestId: candidate.requestId || '',
            method: candidate.method || '',
            path: candidate.path || '',
            tenant: candidate.tenant || '',
            user: candidate.user || '',
            origin: candidate.origin || ''
          }) +
          renderRawDetails({ fields: candidate.fields }) +
        '</div>';
        bindRawDetails();
      }

      function selectLog(id) {
        const log = (state.operation?.events || []).find((item) => item.id === id);
        if (!log) return;
        state.selectedLogId = id;
        renderLogs();
        resetRawEditors();
        const detections = (state.operation?.detectedEvents || []).filter((item) => item.rawEventId === log.id);
        const primaryDetection = detections[0];
        el('detail').innerHTML = '<div class="detail-stack">' +
          '<div><div class="mini-heading">Message</div><div class="detail-message">' + escapeHtml(log.message || log.name || log.operationName || '') + '</div></div>' +
          renderFieldSection('Event', {
            time: fmt(log.timeGenerated),
            service: log.serviceName,
            event: eventKindFor(log),
            source: log.source,
            detector: primaryDetection?.detectorId || '',
            confidence: primaryDetection?.confidence || '',
            status: log.resultCode || '',
            success: log.success === undefined || log.success === null ? '' : String(log.success),
            duration: log.durationMs ? Math.round(log.durationMs) + 'ms' : ''
          }) +
          renderFieldSection('Extracted fields', primaryDetection?.fields || {}) +
          renderFieldSection('Correlation', {
            operationId: log.operationId || '',
            telemetryId: log.telemetryId || '',
            parentId: log.parentId || '',
            targetService: primaryDetection?.targetServiceId || '',
            target: primaryDetection?.targetLabel || primaryDetection?.fields?.targetHost || primaryDetection?.fields?.url || ''
          }) +
          renderRawDetails({ detections, raw: log.raw }) +
        '</div>';
        bindRawDetails();
      }

      function detectionById(id) {
        return (state.operation?.detectedEvents || []).find((item) => item.id === id);
      }

      async function loadTargetLogs(serviceId, callId) {
        if (!state.operation?.operationId) return;
        const serviceName = serviceNameForId(serviceId);
        const call = detectionById(callId);
        const correlationValue = call?.fields?.traceId || call?.correlationValue;
        if (!correlationValue) {
          throw new Error('Cannot follow this service call because no traceId was extracted from traceparent.');
        }
        const existingTab = (state.operation.tabs || []).find((tab) => tab.serviceId === serviceId);
        if (existingTab && !existingTab.loading) {
          state.operation.activeTabId = existingTab.id;
          renderTabs();
          renderLogs();
          return;
        }

        if (!existingTab) {
          state.operation.tabs = [
            ...(state.operation.tabs || []),
            {
              id: serviceId,
              serviceId,
              name: serviceName,
              events: [],
              detectedEvents: [],
              loading: true,
            },
          ];
        } else {
          existingTab.loading = true;
        }
        state.operation.activeTabId = serviceId;
        renderTabs();
        renderLogs();
        el('diagnostics').textContent = 'Loading linked logs for ' + serviceName + '...';

        try {
          const response = await fetch('/api/services/' + encodeURIComponent(serviceId) + '/linked-logs', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              environmentId: state.environmentId,
              correlationValue,
              from: el('fromInput').value,
              to: el('toInput').value
            })
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || 'Linked log load failed');
          const existingIds = new Set((state.operation.events || []).map((item) => item.id));
          const existingDetectionIds = new Set((state.operation.detectedEvents || []).map((item) => item.id));
          state.operation.events = [
            ...(state.operation.events || []),
            ...result.events.filter((item) => !existingIds.has(item.id))
          ].sort((a, b) => new Date(a.timeGenerated).getTime() - new Date(b.timeGenerated).getTime());
          state.operation.detectedEvents = [
            ...(state.operation.detectedEvents || []),
            ...result.detectedEvents.filter((item) => !existingDetectionIds.has(item.id))
          ];
          const tab = (state.operation.tabs || []).find((item) => item.serviceId === serviceId);
          if (tab) {
            tab.events = result.events;
            tab.detectedEvents = result.detectedEvents;
            tab.loading = false;
          }
          renderTimeline();
          renderTabs();
          renderLogs();
          const warningText = result.diagnostics.warnings?.length ? ' - ' + result.diagnostics.warnings.join(' ') : '';
          el('diagnostics').textContent = 'linked logs: ' + result.diagnostics.rows + ' rows loaded for ' + serviceName + ' using ' + correlationValue + warningText;
        } catch (error) {
          const tab = (state.operation.tabs || []).find((item) => item.serviceId === serviceId);
          if (tab) tab.loading = false;
          renderTabs();
          renderLogs();
          throw error;
        }
      }

      function renderFieldSection(title, fields) {
        const rows = Object.entries(fields || {}).filter(([, value]) => value !== undefined && value !== null && String(value).length > 0);
        if (!rows.length) return '';
        return '<div><div class="mini-heading">' + escapeHtml(title) + '</div><div class="field-grid">' +
          rows.map(([key, value]) =>
            '<div class="field-row"><div class="field-key">' + escapeHtml(key) + '</div><div class="field-value">' + escapeHtml(redactValue(key, value)) + '</div></div>'
          ).join('') +
        '</div></div>';
      }

      function renderRawDetails(value) {
        const id = 'rawEditor_' + (++state.rawDetailSequence);
        state.rawDetails[id] = JSON.stringify(value, null, 2);
        return '<details class="raw-details" data-raw-details="' + escapeHtml(id) + '"><summary>Raw JSON</summary><div id="' + escapeHtml(id) + '" class="raw-editor"></div></details>';
      }

      function resetRawEditors() {
        Object.values(state.rawEditors).forEach((editor) => editor.dispose());
        state.rawEditors = {};
        state.rawDetails = {};
      }

      function loadMonaco() {
        if (state.monacoPromise) return state.monacoPromise;
        state.monacoPromise = new Promise((resolve, reject) => {
          if (!window.require) {
            reject(new Error('Monaco loader is unavailable.'));
            return;
          }
          window.require.config({ paths: { vs: '/monaco/vs' } });
          window.require(['vs/editor/editor.main'], () => resolve(window.monaco), reject);
        });
        return state.monacoPromise;
      }

      async function ensureRawEditor(id) {
        if (state.rawEditors[id]) {
          state.rawEditors[id].layout();
          return;
        }
        const target = el(id);
        if (!target) return;
        const monaco = await loadMonaco();
        state.rawEditors[id] = monaco.editor.create(target, {
          value: state.rawDetails[id] || '',
          language: 'json',
          readOnly: true,
          automaticLayout: true,
          wordWrap: 'on',
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 11,
          lineNumbersMinChars: 3,
          renderLineHighlight: 'none',
          contextmenu: true,
          overviewRulerLanes: 0,
        });
      }

      function bindRawDetails() {
        document.querySelectorAll('[data-raw-details]').forEach((details) => {
          details.addEventListener('toggle', async () => {
            if (!details.open || details.dataset.editorReady === 'true') return;
            try {
              await ensureRawEditor(details.dataset.rawDetails);
              details.dataset.editorReady = 'true';
            } catch (error) {
              const target = el(details.dataset.rawDetails);
              if (target) {
                target.innerHTML = '<pre>' + escapeHtml(state.rawDetails[details.dataset.rawDetails] || '') + '</pre>';
              }
              el('diagnostics').innerHTML = '<span class="error-text">' + escapeHtml(error.message) + '</span>';
            }
          });
        });
      }

      document.addEventListener('click', async (event) => {
        const candidateRow = event.target.closest('[data-candidate]');
        const logRow = event.target.closest('[data-log]');
        const loadTargetButton = event.target.closest('[data-load-target]');
        const logTabButton = event.target.closest('[data-log-tab]');
        try {
          if (logTabButton) {
            state.operation.activeTabId = logTabButton.dataset.logTab;
            renderTabs();
            renderLogs();
            return;
          }
          if (loadTargetButton) {
            await loadTargetLogs(loadTargetButton.dataset.loadTarget, loadTargetButton.dataset.call);
            return;
          }
          if (candidateRow) await selectCandidate(candidateRow.dataset.candidate);
          if (logRow) selectLog(logRow.dataset.log);
        } catch (error) {
          el('diagnostics').innerHTML = '<span class="error-text">' + escapeHtml(error.message) + '</span>';
        }
      });

      el('findButton').addEventListener('click', async () => {
        try {
          await findTransactions();
        } catch (error) {
          el('diagnostics').innerHTML = '<span class="error-text">' + escapeHtml(error.message) + '</span>';
        }
      });

      document.querySelector('aside').addEventListener('keydown', async (event) => {
        if (event.key !== 'Enter') return;
        if (!event.target.matches('input, select')) return;
        event.preventDefault();
        try {
          await findTransactions();
        } catch (error) {
          el('diagnostics').innerHTML = '<span class="error-text">' + escapeHtml(error.message) + '</span>';
        }
      });

      el('toggleCandidates').addEventListener('click', toggleCandidates);
      el('toggleDiscovery').addEventListener('click', toggleDiscovery);
      el('collapseDiscoveryPanel').addEventListener('click', () => setDiscoveryCollapsed(true));
      el('expandDiscoveryRail').addEventListener('click', () => setDiscoveryCollapsed(false));
      el('seedDetector').addEventListener('change', renderDiscoveryFilters);
      el('environmentSelect').addEventListener('change', () => {
        switchEnvironment().catch((error) => {
          el('providerStatus').textContent = 'Config error';
          el('diagnostics').innerHTML = '<span class="error-text">' + escapeHtml(error.message) + '</span>';
        });
      });

      loadConfig().catch((error) => {
        el('providerStatus').textContent = 'Config error';
        el('diagnostics').innerHTML = '<span class="error-text">' + escapeHtml(error.message) + '</span>';
      });
    </script>
  </body>
</html>`;
