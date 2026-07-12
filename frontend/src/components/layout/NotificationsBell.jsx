import { useState, useEffect, useRef } from 'react';
import apiClient from '../../api/client';
import { Bell, Truck, Wrench, Fuel, BarChart2, ShieldAlert } from 'lucide-react';

const iconMap = {
  TRIP: Truck,
  MAINTENANCE: Wrench,
  FUEL: Fuel,
  EXPENSE: BarChart2,
};

const colorMap = {
  TRIP: '#3b82f6',
  MAINTENANCE: '#f59e0b',
  FUEL: '#10b981',
  EXPENSE: '#8b5cf6',
};

export default function NotificationsBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [activities, setActivities] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  const fetchActivities = async () => {
    try {
      const res = await apiClient.get('/analytics/activity?limit=5');
      const list = res.data.data.activities || [];
      setActivities(list);

      // Calculate unread count based on last viewed timestamp in localStorage
      const lastViewed = localStorage.getItem('transitops_last_notifications_viewed');
      if (lastViewed) {
        const lastDate = new Date(lastViewed);
        const unread = list.filter(act => new Date(act.timestamp) > lastDate).length;
        setUnreadCount(unread);
      } else {
        setUnreadCount(list.length);
      }
    } catch (e) {
      console.error('Failed to load notifications:', e);
    }
  };

  useEffect(() => {
    fetchActivities();
    // Poll for new notifications every 5 seconds (real-time updates)
    const interval = setInterval(fetchActivities, 5000);

    // Instant real-time listener for current user actions
    window.addEventListener('activity-updated', fetchActivities);

    return () => {
      clearInterval(interval);
      window.removeEventListener('activity-updated', fetchActivities);
    };
  }, []);

  // Handle clicking outside to close the dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!isOpen) {
      // Mark as read
      localStorage.setItem('transitops_last_notifications_viewed', new Date().toISOString());
      setUnreadCount(0);
    }
    setIsOpen(!isOpen);
  };

  const handleMarkAllRead = () => {
    localStorage.setItem('transitops_last_notifications_viewed', new Date().toISOString());
    setUnreadCount(0);
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Bell Trigger Button */}
      <div
        onClick={handleToggle}
        style={{
          position: 'relative',
          cursor: 'pointer',
          padding: 8,
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 10,
          border: '1px solid var(--surface-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
          e.currentTarget.style.borderColor = 'var(--surface-border)';
        }}
      >
        <Bell size={16} color="#94a3b8" />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 5,
              right: 5,
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: '#ef4444',
              color: '#fff',
              fontSize: 9,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 0 2px var(--surface-bg)',
              animation: 'pulse 2s infinite',
            }}
          >
            {unreadCount}
          </span>
        )}
      </div>

      {/* Dropdown Container */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 320,
            background: '#131926',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 12,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
            zIndex: 1000,
            overflow: 'hidden',
          }}
        >
          {/* Dropdown Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>Notifications</span>
            <button
              onClick={handleMarkAllRead}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                fontSize: 11,
                cursor: 'pointer',
                fontWeight: 600,
                padding: 0,
              }}
              onMouseEnter={e => e.target.style.textDecoration = 'underline'}
              onMouseLeave={e => e.target.style.textDecoration = 'none'}
            >
              Mark all as read
            </button>
          </div>

          {/* Dropdown Content */}
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {activities.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: '#64748b', fontSize: 12 }}>
                <ShieldAlert size={24} style={{ marginBottom: 6, opacity: 0.5 }} />
                <div>No recent notifications</div>
              </div>
            ) : (
              activities.map((act, index) => {
                const Icon = iconMap[act.type] || Truck;
                const iconColor = colorMap[act.type] || '#64748b';
                return (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      gap: 12,
                      padding: '12px 16px',
                      borderBottom: index < activities.length - 1 ? '1px solid rgba(255, 255, 255, 0.04)' : 'none',
                      transition: 'background 0.2s ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Icon Column */}
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: `${iconColor}12`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={14} color={iconColor} />
                    </div>

                    {/* Text Column */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9', marginBottom: 2 }}>
                        {act.message}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: '#94a3b8',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          marginBottom: 4,
                        }}
                      >
                        {act.detail}
                      </div>
                      <div style={{ fontSize: 9, color: '#64748b', fontWeight: 500 }}>
                        {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(act.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
