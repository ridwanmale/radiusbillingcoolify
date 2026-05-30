import React, { useState, useEffect } from 'react';

const ReplyMessages = () => {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingKey, setEditingKey] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [notification, setNotification] = useState(null);


    useEffect(() => {
        fetchMessages();
    }, []);

    const fetchMessages = async () => {
        try {
            const response = await fetch('/api/reply-messages');
            const data = await response.json();
            if (Array.isArray(data)) {
                setMessages(data);
            } else {
                setMessages([]);
            }
            setLoading(false);
        } catch (error) {
            console.error('Error fetching messages:', error);
            setLoading(false);
            setMessages([]);
        }
    };

    const handleUpdate = async (key) => {
        try {
            const response = await fetch(`/api/reply-messages/${key}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: editValue })
            });
            if (response.ok) {
                setNotification({ type: 'success', text: 'Message updated successfully' });
                setEditingKey(null);
                fetchMessages();
            } else {
                throw new Error('Failed to update');
            }
            setTimeout(() => setNotification(null), 3000);
        } catch (error) {
            setNotification({ type: 'error', text: 'Failed to update message' });
        }
    };

    if (loading) return <div className="loading">Loading...</div>;

    return (
        <div className="container animate-fade-in">
            <header style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: '800', background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Custom Reply Messages
                </h1>
                <p style={{ opacity: 0.6 }}>Customize the messages sent to MikroTik for various scenarios.</p>
            </header>

            {notification && (
                <div className={`notification ${notification.type}`} style={{ 
                    padding: '1rem', 
                    borderRadius: '12px', 
                    marginBottom: '1rem',
                    background: notification.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: notification.type === 'success' ? '#10b981' : '#ef4444',
                    border: `1px solid ${notification.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                }}>
                    {notification.text}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                {messages.map((m) => (
                    <div key={m.id} className="glass-card animate-slide-up" style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.1rem', color: '#8b5cf6', marginBottom: '0.2rem' }}>{m.msg_key.replace(/_/g, ' ').toUpperCase()}</h3>
                                <p style={{ fontSize: '0.85rem', opacity: 0.6 }}>{m.description}</p>
                            </div>
                            {editingKey !== m.msg_key ? (
                                <button onClick={() => { setEditingKey(m.msg_key); setEditValue(m.message); }} className="btn btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>
                                    Edit Message
                                </button>
                            ) : (
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button onClick={() => handleUpdate(m.msg_key)} className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>
                                        Save
                                    </button>
                                    <button onClick={() => setEditingKey(null)} className="btn btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>
                                        Cancel
                                    </button>
                                </div>
                            )}
                        </div>

                        {editingKey === m.msg_key ? (
                            <textarea 
                                className="form-input" 
                                style={{ width: '100%', minHeight: '80px', fontFamily: 'inherit', fontSize: '0.95rem' }}
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                            />
                        ) : (
                            <div style={{ 
                                padding: '1rem', 
                                background: 'rgba(0,0,0,0.2)', 
                                borderRadius: '12px', 
                                border: '1px solid rgba(255,255,255,0.05)',
                                color: '#fff',
                                fontSize: '1rem',
                                lineHeight: '1.5'
                            }}>
                                {m.message}
                            </div>
                        )}
                        
                        <div style={{ marginTop: '0.8rem', fontSize: '0.75rem', opacity: 0.4 }}>
                           Variables allowed: <code>%&#123;control:Tmp-String-2&#125;</code> (Registered MAC), <code>%&#123;control:Simultaneous-Use&#125;</code> (Limit)
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ReplyMessages;
