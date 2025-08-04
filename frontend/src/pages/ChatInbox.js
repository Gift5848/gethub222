import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ChatModal from '../components/ChatModal';
import { io } from 'socket.io-client';
import '../styles/chat-inbox.css';

const SOCKET_URL = 'http://localhost:5000'; // Adjust if backend runs elsewhere

const ChatInbox = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [totalUnread, setTotalUnread] = useState(0);
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    const fetchConversations = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/messages/conversations', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setConversations(res.data);
        // Calculate total unread
        const unread = Array.isArray(res.data) ? res.data.reduce((sum, c) => sum + (c.unreadCount || 0), 0) : 0;
        setTotalUnread(unread);
      } catch {
        setConversations([]);
        setTotalUnread(0);
      }
      setLoading(false);
    };
    fetchConversations();
    // Socket.IO real-time updates
    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socket.on('connect', () => {});
    socket.on('newMessage', (data) => {
      if (data.to === user?._id) {
        fetchConversations();
      }
    });
    return () => socket.disconnect();
  }, [user?._id]);

  const filteredConversations = conversations.filter(conv => {
    const user = conv.user?.username?.toLowerCase() || '';
    const product = conv.product?.name?.toLowerCase() || '';
    return user.includes(search.toLowerCase()) || product.includes(search.toLowerCase());
  });

  return (
    <div className="chat-inbox-container">
      <h2 style={{display:'flex',alignItems:'center',gap:10}}>
        Chat Inbox
        {totalUnread > 0 && (
          <span className="chat-inbox-unread" style={{fontSize:15,padding:'2px 12px',fontWeight:800}}>{totalUnread} unread</span>
        )}
      </h2>
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by user or product..."
        className="chat-inbox-search"
      />
      {loading ? <div>Loading...</div> : filteredConversations.length === 0 ? <div>No conversations found.</div> : (
        <ul className="chat-inbox-list">
          {filteredConversations.map((conv, idx) => (
            <li
              key={idx}
              className={`chat-inbox-item${conv.unreadCount > 0 ? ' unread' : ''}`}
              style={conv.unreadCount > 0 ? {fontWeight: 'bold', background: '#fffbe6', color: '#222c36', borderLeft: '4px solid #e74c3c'} : {fontWeight: 'normal'}}
              onClick={() => setSelected(conv)}
            >
              <div className="chat-inbox-username" style={conv.unreadCount > 0 ? {fontWeight: 'bold', color: '#e74c3c'} : {}}>
                {conv.user?.username || 'User'}
                {conv.unreadCount > 0 && (
                  <span className="chat-inbox-unread">{conv.unreadCount} new</span>
                )}
              </div>
              <div className="chat-inbox-product">Product: {conv.product?.name || 'N/A'}</div>
              <div className="chat-inbox-message" style={conv.unreadCount > 0 ? {fontWeight: 'bold', color: '#222c36'} : {}}>{conv.lastMessage?.text || '[File]'}</div>
              <div className="chat-inbox-date">{conv.updatedAt ? new Date(conv.updatedAt).toLocaleString() : ''}</div>
            </li>
          ))}
        </ul>
      )}
      {selected && (
        <ChatModal 
          open={!!selected}
          onClose={()=>setSelected(null)}
          userId={user?._id}
          peerId={selected.user?._id}
          productId={selected.product?._id}
        />
      )}
    </div>
  );
};

export default ChatInbox;
