import DerivAPIBasic from 'https://cdn.skypack.dev/@deriv/deriv-api/dist/DerivAPIBasic';

const app_id = 1089; // Replace with your app_id or leave as 1089 for testing.
const connection = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${app_id}`);
const api = new DerivAPIBasic({ connection });

const statusEl = document.querySelector('#status');
const ticksDisplayEl = document.querySelector('#ticks-display');
const subscribeTicskButton = document.querySelector('#ticks');
const unsubscribeTicskButton = document.querySelector('#ticks-unsubscribe');
const ticksHistoryButton = document.querySelector('#ticks-history');

const ticks_history_request = {
  ticks_history: 'R_50',
  adjust_start_time: 1,
  count: 10,
  end: 'latest',
  start: 1,
  style: 'ticks',
};

const ticks_request = {
  ...ticks_history_request,
  subscribe: 1,
};

// Utility function to update status
const updateStatus = (message, isError = false) => {
  statusEl.textContent = message;
  statusEl.style.color = isError ? 'red' : 'black';
};

// Utility function to display ticks
const displayTick = (tick, type) => {
  const tickEl = document.createElement('div');
  tickEl.classList.add('tick-item');
  
  if (type === 'history') {
    tickEl.innerHTML = `History Tick: ${JSON.stringify(tick)}`;
  } else {
    tickEl.innerHTML = `Live Tick: ${JSON.stringify(tick)}`;
  }
  
  ticksDisplayEl.prepend(tickEl);
  
  // Limit display to last 50 ticks
  if (ticksDisplayEl.children.length > 50) {
    ticksDisplayEl.removeChild(ticksDisplayEl.lastChild);
  }
};

const tickSubscriber = () => api.subscribe(ticks_request);

const ticksHistoryResponse = async (res) => {
  try {
    const data = JSON.parse(res.data);
    if (data.error !== undefined) {
      updateStatus(`Error: ${data.error.message}`, true);
      connection.removeEventListener('message', ticksHistoryResponse, false);
      await api.disconnect();
      return;
    }
    
    if (data.msg_type === 'history') {
      updateStatus('Ticks history retrieved successfully');
      data.history.prices.forEach(tick => displayTick(tick, 'history'));
    }
    
    connection.removeEventListener('message', ticksHistoryResponse, false);
  } catch (error) {
    updateStatus(`Processing error: ${error.message}`, true);
  }
};

const ticksResponse = async (res) => {
  try {
    const data = JSON.parse(res.data);
    
    if (data.error !== undefined) {
      updateStatus(`Error: ${data.error.message}`, true);
      connection.removeEventListener('message', ticksResponse, false);
      await api.disconnect();
      return;
    }
    
    if (data.msg_type === 'tick') {
      updateStatus('Receiving live ticks');
      displayTick(data.tick);
    }
  } catch (error) {
    updateStatus(`Processing error: ${error.message}`, true);
  }
};

const subscribeTicks = async () => {
  try {
    updateStatus('Subscribing to ticks...');
    connection.addEventListener('message', ticksResponse);
    await tickSubscriber();
    
    subscribeTicskButton.disabled = true;
    unsubscribeTicskButton.disabled = false;
  } catch (error) {
    updateStatus(`Subscription error: ${error.message}`, true);
  }
};

const unsubscribeTicks = async () => {
  try {
    updateStatus('Unsubscribing from ticks...');
    connection.removeEventListener('message', ticksResponse, false);
    await tickSubscriber().unsubscribe();
    
    subscribeTicskButton.disabled = false;
    unsubscribeTicskButton.disabled = true;
    
    updateStatus('Unsubscribed successfully');
  } catch (error) {
    updateStatus(`Unsubscription error: ${error.message}`, true);
  }
};

const getTicksHistory = async () => {
  try {
    updateStatus('Fetching ticks history...');
    connection.addEventListener('message', ticksHistoryResponse);
    await api.ticksHistory(ticks_history_request);
  } catch (error) {
    updateStatus(`History fetch error: ${error.message}`, true);
  }
};

// Event Listeners
subscribeTicskButton.addEventListener('click', subscribeTicks);
unsubscribeTicskButton.addEventListener('click', unsubscribeTicks);
ticksHistoryButton.addEventListener('click', getTicksHistory);

// Connection status tracking
connection.onopen = () => {
  updateStatus('Connected to Deriv WebSocket');
};

connection.onerror = (error) => {
  updateStatus(`Connection error: ${error}`, true);
};

connection.onclose = () => {
  updateStatus('Disconnected from Deriv WebSocket', true);
};