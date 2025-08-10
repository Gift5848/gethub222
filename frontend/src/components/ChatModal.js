import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_API_URL; // Adjust if backend runs elsewhere

const ChatModal = ({ open, onClose, userId, peerId, productId }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [reactionPicker, setReactionPicker] = useState({ idx: null, open: false });
  const [messageReactions, setMessageReactions] = useState({}); // {msgId: [emoji,...]}
  const [unreadIds, setUnreadIds] = useState([]);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimeout = useRef(null);

  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL, { transports: ['websocket'] });
    }
    const socket = socketRef.current;
    // Join the user's room for private events
    if (userId) {
      socket.emit('join', userId);
    }
    if (open && userId && peerId && productId) {
      fetchMessages();
      // Listen for typing events
      socket.on('typing', (data) => {
        if (data.from === peerId && data.to === userId && data.productId === productId) {
          setIsTyping(true);
          if (typingTimeout.current) clearTimeout(typingTimeout.current);
          typingTimeout.current = setTimeout(() => setIsTyping(false), 2000);
        }
      });
      // Listen for newMessage events
      socket.on('newMessage', (data) => {
        if (data.to === userId && data.from === peerId && data.productId === productId) {
          fetchMessages();
          // Emit delivery receipt
          if (socketRef.current) {
            socketRef.current.emit('messageDelivered', {
              from: peerId,
              to: userId,
              productId,
              messageId: data.message?._id || data.messageId
            });
          }
        }
      });
      // Listen for messagesRead events
      socket.on('messagesRead', (data) => {
        if (data && data.from === userId && data.to === peerId && data.productId === productId) {
          fetchMessages();
        }
      });
      // Listen for messageDelivered events
      socket.on('messageDelivered', (data) => {
        if (data && data.from === userId && data.to === peerId && data.productId === productId) {
          fetchMessages();
        }
      });
    }
    return () => {
      if (socket) {
        socket.off('typing');
        socket.off('newMessage');
        socket.off('messagesRead');
        socket.off('messageDelivered');
      }
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
    };
  }, [open, userId, peerId, productId]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      // Fetch messages without marking as read
      const res = await axios.get('/api/messages/conversation-raw', {
        params: { productId, otherUserId: peerId },
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(res.data);
      // DEBUG: log unread detection
      console.log('DEBUG: userId', userId, 'messages:', res.data.map(m => ({_id: m._id, to: m.to, read: m.read})));
      const unread = res.data.filter(m => String(m.to) === String(userId) && m.read === false).map(m => m._id);
      console.log('DEBUG: unreadIds', unread);
      setUnreadIds(unread);
      // After a short delay, mark as read
      if (unread.length > 0) {
        setTimeout(() => {
          if (socketRef.current && userId && peerId && productId) {
            socketRef.current.emit('messagesRead', {
              from: peerId, // sender
              to: userId,   // recipient (current user)
              productId
            });
          }
        }, 1000);
      }
    } catch {
      setMessages([]);
      setUnreadIds([]);
    }
    setLoading(false);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() && !file) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (file) {
        // Debug: show what is being sent
        alert(`Uploading file: productId=${productId}, toUserId=${peerId}, file=${file ? file.name : 'none'}`);
        const formData = new FormData();
        formData.append('productId', productId);
        formData.append('text', input);
        formData.append('file', file);
        formData.append('toUserId', peerId);
        await axios.post('/api/messages/upload', formData, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
        });
        setFile(null);
      } else {
        const msg = { productId, text: input, toUserId: peerId };
        await axios.post('/api/messages/send', msg, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setInput('');
      await fetchMessages();
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleInputChange = (e) => {
    setInput(e.target.value);
    // Emit typing event
    if (socketRef.current && peerId && productId) {
      socketRef.current.emit('typing', {
        from: userId,
        to: peerId,
        productId
      });
    }
  };

  // Add reaction to a message
  const handleAddReaction = (msgId, emoji) => {
    setMessageReactions(prev => ({
      ...prev,
      [msgId]: prev[msgId] ? [...prev[msgId], emoji] : [emoji]
    }));
    setReactionPicker({ idx: null, open: false });
  };

  // Filtered messages for search
  const filteredMessages = searchTerm.trim()
    ? messages.filter(m => (m.text || '').toLowerCase().includes(searchTerm.toLowerCase()))
    : messages;

  if (!open) return null;

  return (
    <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(0,0,0,0.18)',zIndex:2200,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'#fff',borderRadius:12,padding:24,minWidth:340,maxWidth:400,width:'100%',boxShadow:'0 2px 16px #bbb',position:'relative'}}>
        <button onClick={onClose} style={{position:'absolute',top:12,right:12,fontSize:22,background:'none',border:'none',color:'#888',cursor:'pointer'}}>&times;</button>
        <h3 style={{marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
          Chat
          <button onClick={()=>setShowSearch(s=>!s)} style={{background:'none',border:'none',cursor:'pointer',fontSize:18}} title="Search messages">🔍</button>
        </h3>
        {showSearch && (
          <input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Search messages..." style={{width:'100%',marginBottom:8,padding:6,borderRadius:6,border:'1px solid #ccc'}} />
        )}
        <div style={{height:260,overflowY:'auto',background:'#f8f8f8',borderRadius:8,padding:12,marginBottom:12}}>
          {loading ? (
            <div>Loading...</div>
          ) : filteredMessages.length === 0 ? (
            <div style={{color:'#aaa'}}>No messages found.</div>
          ) : (
            <>
              {filteredMessages.map((msg, idx) => (
                <div key={idx} style={{marginBottom:8,textAlign:msg.from===userId?'right':'left',position:'relative'}}>
                  <span style={{
                    display:'inline-block',
                    background:msg.from===userId?'#e74c3c':'#eee',
                    color:msg.from===userId?'#fff':'#222',
                    borderRadius:8,
                    padding:'6px 12px',
                    maxWidth:220,
                    wordBreak:'break-word',
                    position:'relative',
                    fontWeight: unreadIds.includes(msg._id) ? 'bold' : 'normal',
                    borderLeft: unreadIds.includes(msg._id) ? '4px solid #e74c3c' : undefined,
                    backgroundColor: unreadIds.includes(msg._id) ? '#fffbe6' : (msg.from===userId?'#e74c3c':'#eee'),
                  }}>
                    {msg.text}
                    {unreadIds.includes(msg._id) && (
                      <span style={{marginLeft:8, color:'#e74c3c', fontWeight:'bold', fontSize:12}}>UNREAD</span>
                    )}
                    {msg.file && msg.file.url && (
                      <div style={{marginTop:4}}>
                        {msg.file.url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                          <img src={`${process.env.REACT_APP_API_URL}${msg.file.url}`} alt="file" style={{maxWidth:120, borderRadius:8}} />
                        ) : (
                          <a href={`${process.env.REACT_APP_API_URL}${msg.file.url}`} target="_blank" rel="noopener noreferrer">Download File</a>
                        )}
                      </div>
                    )}
                    {/* Reaction picker */}
                    <button onClick={()=>setReactionPicker({idx:idx,open:true})} style={{background:'none',border:'none',fontSize:16,marginLeft:6,cursor:'pointer'}} title="Add reaction">😊</button>
                    {reactionPicker.open && reactionPicker.idx === idx && (
                      <div style={{position:'absolute',top:-36,right:0,background:'#fff',border:'1px solid #eee',borderRadius:8,padding:4,display:'flex',gap:4,zIndex:10}}>
                        {["👍","😂","❤️","😮","😢","👏"].map(e=>(
                          <span key={e} style={{fontSize:18,cursor:'pointer'}} onClick={()=>handleAddReaction(msg._id||idx,e)}>{e}</span>
                        ))}
                      </div>
                    )}
                  </span>
                  {/* Show reactions */}
                  {messageReactions[msg._id||idx] && (
                    <div style={{marginTop:2,display:'flex',gap:4,justifyContent:msg.from===userId?'flex-end':'flex-start'}}>
                      {messageReactions[msg._id||idx].map((e,i)=>(<span key={i} style={{fontSize:15}}>{e}</span>))}
                    </div>
                  )}
                  <div style={{fontSize:10,color:'#bbb'}}>
                    {new Date(msg.createdAt).toLocaleTimeString()}
                    {msg.from === userId && msg.read && (
                      <span style={{marginLeft:6, color:'#27ae60', fontWeight:600}}>&#10003;&#10003; Read</span>
                    )}
                    {msg.from === userId && !msg.read && msg.delivered && (
                      <span style={{marginLeft:6, color:'#2980ef', fontWeight:600}}>&#10003; Delivered</span>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
        <form onSubmit={sendMessage} style={{display:'flex',gap:8,alignItems:'center',marginTop:8}}>
          <input type="file" onChange={e => setFile(e.target.files[0])} style={{flex:1}} />
          <input value={input} onChange={handleInputChange} style={{flex:2,padding:8,borderRadius:6,border:'1px solid #ccc'}} placeholder="Type a message..." />
          <button type="submit" style={{background:'#3a6cf6',color:'#fff',border:'none',borderRadius:6,padding:'8px 16px',fontWeight:700}} disabled={loading || (!input.trim() && !file)}>Send</button>
        </form>
        {isTyping && (
          <div style={{marginTop:6, color:'#888', fontSize:13}}>{peerId ? 'User is typing...' : ''}</div>
        )}
      </div>
    </div>
  );
};

export default ChatModal;
