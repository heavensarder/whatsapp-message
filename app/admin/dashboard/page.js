'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import io from 'socket.io-client';
import QRModal from '@/components/QRModal';

// ─── Icons ────────────────────────────────────────────────────────────────────
const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
);

const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
  </svg>
);

const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const ChatIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="56" height="56">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

const EmojiIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
    <circle cx="12" cy="12" r="10"/><path d="M8 13s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
  </svg>
);

const AttachIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
  </svg>
);

const MoreIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
    <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
  </svg>
);

const ComposeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(typeof ts === 'number' && ts < 1e12 ? ts * 1000 : ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(typeof ts === 'number' && ts < 1e12 ? ts * 1000 : ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

function getInitials(name) {
  if (!name) return '?';
  return name.trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function getAvatarColor(name) {
  const colors = ['#128C7E','#075E54','#25D366','#00a884','#667781','#1d7eaa','#b35900'];
  let hash = 0;
  for (let c of (name || '')) hash = c.charCodeAt(0) + hash * 31;
  return colors[Math.abs(hash) % colors.length];
}

// ─── ChatAvatar ───────────────────────────────────────────────────────────────
function ChatAvatar({ name, size = 50, isGroup }) {
  const bg = getAvatarColor(name);
  return (
    <div className="chat-avatar" style={{ width: size, height: size, background: bg, fontSize: size * 0.38 }}>
      {isGroup ? (
        <svg viewBox="0 0 24 24" fill="white" width={size * 0.5} height={size * 0.5}>
          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
        </svg>
      ) : getInitials(name)}
    </div>
  );
}

// ─── ChatListItem ─────────────────────────────────────────────────────────────
function ChatListItem({ chat, active, onClick }) {
  const ts = chat.last_message_time || chat.updated_at;
  return (
    <div className={`chat-item ${active ? 'active' : ''}`} onClick={onClick}>
      <ChatAvatar name={chat.name || chat.push_name || chat.wa_id} isGroup={chat.is_group} />
      <div className="chat-info">
        <div className="chat-info-top">
          <span className="chat-name">{chat.name || chat.push_name || chat.phone || chat.wa_id}</span>
          <span className={`chat-time ${chat.unread_count > 0 ? 'unread' : ''}`}>{formatTime(ts)}</span>
        </div>
        <div className="chat-preview-row">
          <span className="chat-preview">{chat.last_message || 'No messages yet'}</span>
          {chat.unread_count > 0 && (
            <span className="unread-badge">{chat.unread_count > 99 ? '99+' : chat.unread_count}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MessageBubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg }) {
  const dir = msg.direction || (msg.fromMe ? 'outbound' : 'inbound');
  return (
    <div className={`message-bubble-wrap ${dir}`}>
      <div className={`message-bubble ${dir}`}>
        <div className="message-body">{msg.body}</div>
        <div className="message-meta">
          <span className="message-time">{formatTime(msg.timestamp || msg.created_at)}</span>
          {dir === 'outbound' && (
            <span className="message-tick">
              <svg viewBox="0 0 24 24" fill="var(--wa-teal)" width="16" height="16">
                <path d="M17 7L7.5 16.5 3 12"/>
                <path d="M21 7l-10.5 9.5" opacity="0.6"/>
              </svg>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard Page ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const [waStatus, setWaStatus] = useState('disconnected');
  const [connectedPhone, setConnectedPhone] = useState('');
  const [connectedName, setConnectedName] = useState('');
  const [currentQR, setCurrentQR] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);

  const [chats, setChats] = useState([]);
  const [filteredChats, setFilteredChats] = useState([]);
  const [searchQ, setSearchQ] = useState('');
  const [activeChat, setActiveChat] = useState(null);

  const [messages, setMessages] = useState([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);

  // ── New Chat state
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState('');
  const [newChatName, setNewChatName] = useState('');
  const [newChatLoading, setNewChatLoading] = useState(false);
  const [newChatError, setNewChatError] = useState('');

  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const textareaRef = useRef(null);

  // ── Socket.io ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = io(window.location.origin, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('wa:status', ({ status, phone, name }) => {
      setWaStatus(status);
      if (phone) setConnectedPhone(phone);
      if (name) setConnectedName(name);
      if (status === 'connected') {
        setShowQRModal(false);
        setCurrentQR(null);
        loadChats();
      }
    });

    socket.on('wa:qr', ({ qr }) => {
      setCurrentQR(qr);
      setWaStatus('qr_pending');
      setShowQRModal(true);
    });

    socket.on('wa:message', (msg) => {
      // Update chat list
      setChats(prev => {
        const idx = prev.findIndex(c => c.wa_id === msg.from);
        if (idx === -1) {
          // New contact - reload chats
          loadChats();
          return prev;
        }
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          last_message: msg.body,
          last_message_time: msg.timestamp,
          unread_count: (updated[idx].unread_count || 0) + 1,
        };
        // Move to top
        const [item] = updated.splice(idx, 1);
        return [item, ...updated];
      });

      // Add to active chat if open
      setActiveChat(active => {
        if (active?.wa_id === msg.from) {
          setMessages(prev => [...prev, {
            id: msg.id, body: msg.body, timestamp: msg.timestamp, direction: 'inbound',
          }]);
        }
        return active;
      });
    });

    return () => socket.disconnect();
  }, []);

  // ── Scroll to bottom ────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Load status from DB on mount ───────────────────────────────────────────
  useEffect(() => {
    fetch('/api/wa/status')
      .then(r => r.json())
      .then(d => {
        setWaStatus(d.status);
        if (d.phone) setConnectedPhone(d.phone);
        if (d.name) setConnectedName(d.name);
      });
    loadChats();
  }, []);

  // ── Search filter ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!searchQ.trim()) {
      setFilteredChats(chats);
    } else {
      const q = searchQ.toLowerCase();
      setFilteredChats(chats.filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.push_name || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(q) ||
        (c.wa_id || '').includes(q)
      ));
    }
  }, [searchQ, chats]);

  async function loadChats() {
    try {
      const res = await fetch('/api/wa/chats');
      const data = await res.json();
      setChats(data.chats || []);
    } catch {}
  }

  async function openChat(chat) {
    setActiveChat(chat);
    setMessages([]);
    setMsgLoading(true);

    // Reset unread
    setChats(prev => prev.map(c => c.wa_id === chat.wa_id ? { ...c, unread_count: 0 } : c));

    try {
      const res = await fetch(`/api/wa/messages/${encodeURIComponent(chat.wa_id)}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch {
      setMessages([]);
    } finally {
      setMsgLoading(false);
    }
  }

  async function sendMessage() {
    if (!messageText.trim() || !activeChat || sending) return;
    const text = messageText.trim();
    setMessageText('');
    setSending(true);

    // Optimistic UI
    const tempId = `temp_${Date.now()}`;
    const tempMsg = {
      id: tempId, body: text, timestamp: Math.floor(Date.now() / 1000), direction: 'outbound',
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      const res = await fetch(`/api/wa/messages/${encodeURIComponent(activeChat.wa_id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        const d = await res.json();
        alert('Send failed: ' + (d.error || 'Unknown error'));
        setMessages(prev => prev.filter(m => m.id !== tempId));
        setMessageText(text);
      } else {
        // Update last message in chat list
        setChats(prev => prev.map(c =>
          c.wa_id === activeChat.wa_id
            ? { ...c, last_message: text, last_message_time: Math.floor(Date.now() / 1000) }
            : c
        ));
      }
    } catch (err) {
      alert('Send error: ' + err.message);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setMessageText(text);
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
  }

  async function startNewChat(e) {
    e.preventDefault();
    setNewChatError('');
    setNewChatLoading(true);
    try {
      const res = await fetch('/api/wa/new-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: newChatPhone, name: newChatName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNewChatError(data.error || 'Failed to add contact');
        return;
      }
      // Add contact to chat list and open it
      const contact = data.contact;
      setChats(prev => {
        const exists = prev.find(c => c.wa_id === contact.wa_id);
        if (exists) return prev;
        return [contact, ...prev];
      });
      setShowNewChat(false);
      setNewChatPhone('');
      setNewChatName('');
      openChat(contact);
    } catch (err) {
      setNewChatError(err.message);
    } finally {
      setNewChatLoading(false);
    }
  }

  // ── Group messages by date ──────────────────────────────────────────────────
  function getGroupedMessages() {
    const groups = [];
    let lastDate = null;
    for (const msg of messages) {
      const ts = msg.timestamp;
      const date = formatDate(ts);
      if (date !== lastDate) {
        groups.push({ type: 'separator', date, key: `sep_${date}` });
        lastDate = date;
      }
      groups.push({ type: 'message', msg, key: msg.id || msg.message_id });
    }
    return groups;
  }

  const statusLabel = {
    connected: 'Connected',
    qr_pending: 'Scan QR Code',
    disconnected: 'Disconnected',
  }[waStatus] || 'Unknown';

  return (
    <div className="messenger">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <div className="sidebar">
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <div className="sidebar-header-left">
            <img
              src="https://mediasoftbd.com/wp-content/uploads/2025/06/mediasoft-logo.png"
              alt="Mediasoft"
              className="sidebar-logo"
              onError={e => { e.target.style.display = 'none'; }}
            />
          </div>
          <div className="sidebar-actions">
            {waStatus !== 'connected' && (
              <button
                className="icon-btn"
                title="Connect WhatsApp"
                onClick={() => setShowQRModal(true)}
                style={{ color: waStatus === 'qr_pending' ? '#ffc107' : 'var(--wa-icon)' }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </button>
            )}
            <button
              className="icon-btn"
              title="New Chat"
              onClick={() => { setShowNewChat(true); setNewChatError(''); }}
              style={{ color: 'var(--wa-teal)' }}
            >
              <ComposeIcon />
            </button>
            <button className="icon-btn" title="Logout" onClick={handleLogout}>
              <LogoutIcon />
            </button>
          </div>
        </div>

        {/* WA Status Bar */}
        <div className="wa-status-bar">
          <span className={`status-dot ${waStatus}`} />
          <span style={{ color: 'var(--wa-text-secondary)', flex: 1 }}>
            {statusLabel}
            {waStatus === 'connected' && connectedPhone && (
              <span style={{ marginLeft: 8, fontWeight: 400 }}>· {connectedName || connectedPhone}</span>
            )}
          </span>
          {waStatus === 'connected' && (
            <button
              style={{ fontSize: '11px', color: 'var(--wa-text-secondary)', textDecoration: 'underline' }}
              onClick={() => setShowQRModal(true)}
            >
              details
            </button>
          )}
        </div>

        {/* Search */}
        <div className="search-wrap">
          <div className="search-box">
            <SearchIcon />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="chat-list">
          {filteredChats.length === 0 ? (
            <div className="chat-list-empty">
              {waStatus === 'connected' ? (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                  <p>No chats yet. Messages will appear as they arrive.</p>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <p>Connect WhatsApp to see your chats.</p>
                  <button
                    className="btn-primary"
                    style={{ marginTop: '16px', padding: '10px 20px', width: 'auto', fontSize: '13px' }}
                    onClick={() => setShowQRModal(true)}
                  >
                    Connect Now
                  </button>
                </>
              )}
            </div>
          ) : (
            filteredChats.map(chat => (
              <ChatListItem
                key={chat.wa_id}
                chat={chat}
                active={activeChat?.wa_id === chat.wa_id}
                onClick={() => openChat(chat)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Chat Window ──────────────────────────────────────────────── */}
      {!activeChat ? (
        <div className="chat-window-empty">
          <div className="chat-window-empty-icon">
            <ChatIcon />
          </div>
          <h2>WhatsApp Messenger</h2>
          <p>Select a chat to start messaging</p>
          {waStatus !== 'connected' && (
            <button
              className="btn-primary"
              style={{ marginTop: '20px', padding: '12px 28px', width: 'auto' }}
              onClick={() => setShowQRModal(true)}
            >
              Connect WhatsApp
            </button>
          )}
        </div>
      ) : (
        <div className="chat-window">
          {/* Chat Header */}
          <div className="chat-header">
            <ChatAvatar name={activeChat.name || activeChat.push_name || activeChat.wa_id} size={42} isGroup={activeChat.is_group} />
            <div className="chat-header-info">
              <div className="chat-header-name">
                {activeChat.name || activeChat.push_name || activeChat.phone || activeChat.wa_id}
              </div>
              <div className="chat-header-status">
                {activeChat.phone || activeChat.wa_id?.replace('@c.us', '')}
              </div>
            </div>
            <div className="sidebar-actions">
              <button className="icon-btn" title="More options"><MoreIcon /></button>
            </div>
          </div>

          {/* Messages */}
          <div className="messages-container">
            {msgLoading ? (
              <div className="page-loader">
                <div className="spinner" />
              </div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--wa-text-secondary)', marginTop: '60px', fontSize: 14 }}>
                No messages yet. Say hello! 👋
              </div>
            ) : (
              getGroupedMessages().map(item =>
                item.type === 'separator' ? (
                  <div className="date-separator" key={item.key}>
                    <span>{item.date}</span>
                  </div>
                ) : (
                  <MessageBubble key={item.key} msg={item.msg} />
                )
              )
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="message-input-wrap">
            <button className="icon-btn" title="Emoji"><EmojiIcon /></button>
            <button className="icon-btn" title="Attach"><AttachIcon /></button>
            <div className="message-input-box">
              <textarea
                ref={textareaRef}
                className="message-input"
                placeholder="Type a message"
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                disabled={waStatus !== 'connected' || sending}
                style={{ opacity: waStatus !== 'connected' ? 0.5 : 1 }}
              />
            </div>
            <button
              className="send-btn"
              onClick={sendMessage}
              disabled={!messageText.trim() || waStatus !== 'connected' || sending}
              style={{ opacity: (!messageText.trim() || waStatus !== 'connected') ? 0.5 : 1 }}
            >
              {sending ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2, borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.3)' }} /> : <SendIcon />}
            </button>
          </div>
        </div>
      )}

      {/* ── QR Modal ────────────────────────────────────────────────── */}
      {showQRModal && (
        <QRModal
          qr={currentQR}
          status={waStatus}
          connectedPhone={connectedPhone}
          connectedName={connectedName}
          onClose={() => setShowQRModal(false)}
        />
      )}

      {/* ── New Chat Modal ───────────────────────────────────────────── */}
      {showNewChat && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowNewChat(false); }}>
          <div className="modal-card" style={{ textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 className="modal-title" style={{ margin: 0 }}>New Chat</h2>
              <button className="icon-btn" onClick={() => setShowNewChat(false)} style={{ color: 'var(--wa-icon)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <p style={{ color: 'var(--wa-text-secondary)', fontSize: 13, marginBottom: 24 }}>
              Enter a WhatsApp phone number to start a new conversation.
            </p>
            <form onSubmit={startNewChat}>
              <div className="form-group">
                <label className="form-label">Phone Number *</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="e.g. 8801712345678"
                  value={newChatPhone}
                  onChange={e => setNewChatPhone(e.target.value)}
                  required
                  autoFocus
                />
                <div style={{ fontSize: 11, color: 'var(--wa-text-secondary)', marginTop: 6 }}>
                  Include country code without + (e.g. 880 for Bangladesh, 1 for USA)
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Contact Name (optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter a display name"
                  value={newChatName}
                  onChange={e => setNewChatName(e.target.value)}
                />
              </div>
              {newChatError && (
                <div className="form-error" style={{ marginBottom: 16 }}>
                  <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                  {newChatError}
                </div>
              )}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" className="btn-outline" onClick={() => setShowNewChat(false)}>Cancel</button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: 'auto', padding: '12px 28px', marginTop: 0 }}
                  disabled={newChatLoading || !newChatPhone.trim()}
                >
                  {newChatLoading ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.3)' }} />
                      Checking...
                    </span>
                  ) : 'Start Chat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
