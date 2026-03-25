import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getConversations,
  getConversationMessages,
  getMessagingEligiblePeers,
  openConversation,
  sendConversationMessage,
  type ConversationSummary,
  type MessagingPeer,
  type ThreadMessage,
} from '../api/client';
import styles from './Messages.module.css';
import dashStyles from './Dashboard.module.css';

export default function MessagesPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [peers, setPeers] = useState<MessagingPeer[]>([]);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [peerPick, setPeerPick] = useState('');

  const loadLists = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, c] = await Promise.all([getMessagingEligiblePeers(), getConversations()]);
      setPeers(p.peers);
      setConversations(c.conversations);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role !== 'Student' && user?.role !== 'Mentor') return;
    loadLists();
  }, [user?.role, loadLists]);

  /** Open thread from notification link: /messages?conversationId=... */
  useEffect(() => {
    if (user?.role !== 'Student' && user?.role !== 'Mentor') return;
    const cid = searchParams.get('conversationId');
    if (cid) setSelectedId(cid);
  }, [searchParams, user?.role]);

  const loadThread = useCallback(async (conversationId: string) => {
    setError(null);
    try {
      const { messages: m } = await getConversationMessages(conversationId);
      setMessages(m);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load conversation');
      setMessages([]);
    }
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    loadThread(selectedId);
  }, [selectedId, loadThread]);

  const handleStartChat = async () => {
    if (!peerPick) return;
    setError(null);
    try {
      const { conversationId } = await openConversation(peerPick);
      await loadLists();
      setSelectedId(conversationId);
      setPeerPick('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open conversation');
    }
  };

  const handleSend = async () => {
    const text = draft.trim();
    if (!selectedId || !text) return;
    setSending(true);
    setError(null);
    try {
      await sendConversationMessage(selectedId, text);
      setDraft('');
      await loadThread(selectedId);
      await loadLists();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Send failed');
    } finally {
      setSending(false);
    }
  };

  if (user?.role !== 'Student' && user?.role !== 'Mentor') {
    return (
      <div>
        <h1 className={dashStyles.pageTitle}>Messages</h1>
        <p className={dashStyles.pageSubtitle}>Only students and mentors can use secure messaging.</p>
      </div>
    );
  }

  const selectedConv = useMemo(
    () => conversations.find((c) => c.id === selectedId),
    [conversations, selectedId]
  );
  const selectedPeerName = selectedConv
    ? `${selectedConv.peer.firstName} ${selectedConv.peer.lastName}`.trim()
    : null;

  return (
    <div className={styles.wrap}>
      <h1 className={dashStyles.pageTitle}>Messages</h1>
      <p className={dashStyles.pageSubtitle}>
        Chat with your mentor or mentee when you have an <strong>active</strong> mentorship. Messages are encrypted on the server.
      </p>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.toolbar}>
        <label className={dashStyles.label} htmlFor="peer-select" style={{ margin: 0 }}>
          Start or open chat
        </label>
        <select
          id="peer-select"
          className={styles.select}
          value={peerPick}
          onChange={(e) => setPeerPick(e.target.value)}
          disabled={loading || peers.length === 0}
        >
          <option value="">{peers.length === 0 ? 'No active mentorships yet' : 'Choose a person…'}</option>
          {peers.map((p) => (
            <option key={`${p.assignmentId}-${p.userId}`} value={p.userId}>
              {p.firstName} {p.lastName} — {p.projectTitle}
            </option>
          ))}
        </select>
        <button type="button" className={dashStyles.button} onClick={handleStartChat} disabled={!peerPick || loading}>
          Open
        </button>
      </div>

      <div className={styles.panels}>
        <div className={styles.convList}>
          <div className={styles.convListHeader}>Conversations</div>
          <div className={styles.convScroll}>
            {loading && <div className={styles.empty}>Loading…</div>}
            {!loading && conversations.length === 0 && (
              <div className={styles.empty}>No conversations yet. Select an active mentorship above.</div>
            )}
            {!loading &&
              conversations.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`${styles.convItem} ${selectedId === c.id ? styles.convItemActive : ''}`}
                  onClick={() => setSelectedId(c.id)}
                >
                  <span className={styles.peerName}>
                    {c.peer.firstName} {c.peer.lastName}
                    {c.unreadCount > 0 && <span className={styles.badge}>{c.unreadCount}</span>}
                  </span>
                  {c.lastMessagePreview && <div className={styles.preview}>{c.lastMessagePreview}</div>}
                </button>
              ))}
          </div>
        </div>

        <div className={styles.thread}>
          {!selectedId && <div className={styles.empty}>Select a conversation or start a new one.</div>}
          {selectedId && (
            <>
              <div className={styles.threadHeader}>{selectedPeerName ?? 'Conversation'}</div>
              <div className={styles.threadBody}>
                {messages.map((m) => {
                  const mine = m.senderId === user?.userId;
                  return (
                    <div key={m.id} className={`${styles.bubble} ${mine ? styles.bubbleMine : styles.bubbleTheirs}`}>
                      <div>{m.body}</div>
                      <div className={styles.meta}>
                        {mine ? 'You' : m.senderName} · {new Date(m.createdAt).toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className={styles.composer}>
                <textarea
                  className={styles.textarea}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Type a message…"
                  maxLength={10000}
                />
                <div className={styles.sendRow}>
                  <button type="button" className={styles.sendBtn} onClick={handleSend} disabled={sending || !draft.trim()}>
                    {sending ? 'Sending…' : 'Send'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
