import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  addCommunityComment,
  createCommunityUpdate,
  getCommunityComments,
  getApiErrorMessage,
  getCommunityUpdates,
  getStoredSession,
  reactToCommunityUpdate,
} from '../api';
import MemojiAvatar from '../components/MemojiAvatar';

const categoryOptions = [
  'Accident',
  'Road Malfunction',
  'Heavy Traffic',
  'Flooding',
  'Transport Delay',
  'Safety Alert',
  'General',
];

const createInitialForm = () => ({
  title: '',
  category: 'Accident',
  location: '',
  message: '',
  photo_url: '',
  severity: 'medium',
  is_urgent: false,
});

const formatPostedAt = (timestamp) => {
  if (!timestamp) {
    return 'Just now';
  }

  const parsedDate = new Date(timestamp);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Just now';
  }

  return parsedDate.toLocaleString();
};

const getInitials = (name) => {
  if (!name) {
    return 'U';
  }

  const pieces = name.trim().split(/\s+/).filter(Boolean);
  if (pieces.length === 1) {
    return pieces[0].slice(0, 2).toUpperCase();
  }

  return `${pieces[0][0]}${pieces[1][0]}`.toUpperCase();
};

const Community = () => {
  const navigate = useNavigate();
  const [updates, setUpdates] = useState([]);
  const [form, setForm] = useState(createInitialForm());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [postError, setPostError] = useState('');
  const [filters, setFilters] = useState({ urgentOnly: false, category: '', location: '' });
  const [expandedComments, setExpandedComments] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});

  const session = useMemo(() => getStoredSession(), []);

  const loadUpdates = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const response = await getCommunityUpdates({
        limit: 50,
        urgent: filters.urgentOnly,
        category: filters.category || undefined,
        location: filters.location || undefined,
      });
      setUpdates(response.updates || []);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to load community feed right now.'));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadUpdates();
  }, [loadUpdates]);

  const handleFormChange = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setPostError('');

    const userId = session?.user?.user_id;

    if (!userId) {
      setPostError('Please sign in with a server account before posting updates.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        user_id: userId,
        title: form.title,
        category: form.category,
        location: form.location,
        message: form.message,
        photo_url: form.photo_url,
        severity: form.severity,
        is_urgent: form.is_urgent,
      };

      const response = await createCommunityUpdate(payload);
      setUpdates((current) => [response.update, ...current]);
      setForm(createInitialForm());
    } catch (error) {
      setPostError(getApiErrorMessage(error, 'Unable to publish your update. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="screen-stack">
      <div className="row-between">
        <button className="btn-icon" onClick={() => navigate(-1)} aria-label="Go back">
          ←
        </button>
        <h1 style={{ margin: 0, flex: 1, marginLeft: '0.5rem' }}>Community Alerts</h1>
      </div>

      <div className="card card-soft glass-card community-compose-card">
        <div className="section-header" style={{ marginTop: 0 }}>
          <h2>Share a Live Update</h2>
          <p>Post road incidents, accidents, delays, and safety advisories for commuters.</p>
        </div>

        <form className="community-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Title</label>
            <input
              type="text"
              placeholder="Example: Accident near MRT North Avenue"
              value={form.title}
              onChange={(event) => handleFormChange('title', event.target.value)}
              required
            />
          </div>

          <div className="community-form-grid">
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label>Category</label>
              <select
                value={form.category}
                onChange={(event) => handleFormChange('category', event.target.value)}
              >
                {categoryOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label>Location</label>
              <input
                type="text"
                placeholder="Example: EDSA Northbound"
                value={form.location}
                onChange={(event) => handleFormChange('location', event.target.value)}
              />
            </div>
          </div>

          <div className="community-form-grid">
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label>Severity</label>
              <select
                value={form.severity}
                onChange={(event) => handleFormChange('severity', event.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="input-group" style={{ marginBottom: 0, display: 'flex', alignItems: 'end' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', marginBottom: 0 }}>
                <input
                  type="checkbox"
                  checked={form.is_urgent}
                  onChange={(event) => handleFormChange('is_urgent', event.target.checked)}
                  style={{ width: 'auto' }}
                />
                Mark as urgent
              </label>
            </div>
          </div>

          <div className="input-group">
            <label>Details</label>
            <textarea
              rows="3"
              placeholder="What happened? Include lane info, expected delay, or alternate route notes."
              value={form.message}
              onChange={(event) => handleFormChange('message', event.target.value)}
              required
            />
          </div>

          <div className="input-group" style={{ marginBottom: 0 }}>
            <label>Photo URL (Optional)</label>
            <input
              type="url"
              placeholder="https://..."
              value={form.photo_url}
              onChange={(event) => handleFormChange('photo_url', event.target.value)}
            />
          </div>

          {postError && (
            <p className="form-message error-message" style={{ marginTop: '0.8rem' }}>
              {postError}
            </p>
          )}

          <button className="btn btn-secondary" type="submit" disabled={submitting} style={{ marginTop: '0.85rem' }}>
            {submitting ? 'Posting update...' : 'Post to Community'}
          </button>
        </form>
      </div>

      <div className="row-between" style={{ marginTop: '0.1rem' }}>
        <h2 style={{ margin: 0 }}>Latest Reports</h2>
        <button type="button" className="link-pill" onClick={loadUpdates}>
          Refresh
        </button>
      </div>

      <div className="card card-soft" style={{ marginBottom: '0.1rem' }}>
        <div className="community-form-grid">
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label>Category Filter</label>
            <select value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}>
              <option value="">All categories</option>
              {categoryOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label>Location Filter</label>
            <input
              value={filters.location}
              onChange={(event) => setFilters((current) => ({ ...current, location: event.target.value }))}
              placeholder="Search area"
            />
          </div>
        </div>

        <label style={{ display: 'inline-flex', gap: '0.45rem', alignItems: 'center', marginTop: '0.6rem', fontSize: '0.83rem' }}>
          <input
            type="checkbox"
            checked={filters.urgentOnly}
            onChange={(event) => setFilters((current) => ({ ...current, urgentOnly: event.target.checked }))}
            style={{ width: 'auto' }}
          />
          Show urgent alerts only
        </label>
      </div>

      {loading ? (
        <div className="card card-soft" style={{ textAlign: 'center' }}>
          Loading community feed...
        </div>
      ) : errorMessage ? (
        <div className="card card-soft">
          <p style={{ marginBottom: '0.85rem' }}>{errorMessage}</p>
          <button className="btn" type="button" onClick={loadUpdates}>Try Again</button>
        </div>
      ) : updates.length === 0 ? (
        <div className="card card-soft" style={{ textAlign: 'center' }}>
          No updates yet. Be the first to post a commuter alert.
        </div>
      ) : (
        <div className="community-feed">
          {updates.map((update) => (
            <article key={update.update_id} className="card card-soft community-post">
              <div className="community-post-header">
                <div className="community-author-avatar" style={{ background: update.avatar_color || '#f0932b' }}>
                  {update.avatar_memoji ? (
                    <MemojiAvatar config={update.avatar_memoji} size={34} />
                  ) : (
                    getInitials(update.author_name)
                  )}
                </div>
                <div>
                  <strong>{update.author_name || 'Commuter'}</strong>
                  <p style={{ margin: 0, fontSize: '0.74rem' }}>{formatPostedAt(update.timestamp)}</p>
                </div>
              </div>

              <div className="community-meta-row">
                <span className="community-category-pill">{update.category || 'General'}</span>
                {update.location && <span className="community-location">{update.location}</span>}
                {update.is_urgent && <span className="community-category-pill" style={{ background: 'rgba(215, 70, 85, 0.2)', color: 'var(--danger)' }}>Urgent</span>}
              </div>

              <h3 style={{ margin: '0.4rem 0 0.35rem' }}>{update.title || 'Community Update'}</h3>
              <p style={{ margin: 0 }}>{update.message}</p>

              {update.photo_url && (
                <img
                  className="community-photo"
                  src={update.photo_url}
                  alt="Community update attachment"
                />
              )}

              <div style={{ display: 'flex', gap: '0.55rem', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  className="btn"
                  style={{ padding: '0.45rem 0.7rem', fontSize: '0.78rem' }}
                  onClick={async () => {
                    if (!session?.user?.user_id) {
                      setPostError('Please sign in before reacting to posts.');
                      return;
                    }

                    try {
                      const response = await reactToCommunityUpdate(update.update_id, {
                        user_id: session.user.user_id,
                        reaction_type: 'helpful',
                      });

                      setUpdates((current) => current.map((item) => (
                        item.update_id === update.update_id
                          ? { ...item, reaction_count: response.reaction_count }
                          : item
                      )));
                    } catch (error) {
                      setPostError(getApiErrorMessage(error, 'Unable to react right now.'));
                    }
                  }}
                >
                  Helpful ({update.reaction_count || 0})
                </button>

                <button
                  type="button"
                  className="btn"
                  style={{ padding: '0.45rem 0.7rem', fontSize: '0.78rem' }}
                  onClick={async () => {
                    const isOpen = Boolean(expandedComments[update.update_id]);
                    if (isOpen) {
                      setExpandedComments((current) => ({ ...current, [update.update_id]: undefined }));
                      return;
                    }

                    try {
                      const response = await getCommunityComments(update.update_id);
                      setExpandedComments((current) => ({ ...current, [update.update_id]: response.comments || [] }));
                    } catch (error) {
                      setPostError(getApiErrorMessage(error, 'Unable to load comments.'));
                    }
                  }}
                >
                  Comments ({update.comment_count || 0})
                </button>
              </div>

              {expandedComments[update.update_id] && (
                <div className="card card-soft" style={{ marginTop: '0.65rem', marginBottom: 0, padding: '0.65rem' }}>
                  {expandedComments[update.update_id].map((comment) => (
                    <p key={comment.comment_id} style={{ margin: '0 0 0.3rem', fontSize: '0.78rem' }}>
                      <strong>{comment.author_name}:</strong> {comment.comment}
                    </p>
                  ))}

                  <div style={{ display: 'flex', gap: '0.45rem', marginTop: '0.55rem' }}>
                    <input
                      value={commentDrafts[update.update_id] || ''}
                      placeholder="Write a comment"
                      onChange={(event) => setCommentDrafts((current) => ({
                        ...current,
                        [update.update_id]: event.target.value,
                      }))}
                    />
                    <button
                      type="button"
                      className="btn"
                      style={{ width: 'auto', padding: '0.45rem 0.75rem' }}
                      onClick={async () => {
                        if (!session?.user?.user_id) {
                          setPostError('Please sign in before commenting.');
                          return;
                        }

                        const draft = (commentDrafts[update.update_id] || '').trim();
                        if (!draft) {
                          return;
                        }

                        try {
                          const response = await addCommunityComment(update.update_id, {
                            user_id: session.user.user_id,
                            comment: draft,
                          });

                          setExpandedComments((current) => ({
                            ...current,
                            [update.update_id]: [...(current[update.update_id] || []), response.comment],
                          }));

                          setUpdates((current) => current.map((item) => (
                            item.update_id === update.update_id
                              ? { ...item, comment_count: (item.comment_count || 0) + 1 }
                              : item
                          )));

                          setCommentDrafts((current) => ({ ...current, [update.update_id]: '' }));
                        } catch (error) {
                          setPostError(getApiErrorMessage(error, 'Unable to post comment.'));
                        }
                      }}
                    >
                      Post
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default Community;
