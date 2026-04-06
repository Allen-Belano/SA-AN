import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  checkDuplicateRoute,
  createRoute,
  getApiErrorMessage,
  getStoredSession,
  uploadRouteStepMedia,
} from '../api';

const DRAFT_STORAGE_KEY = 'saan-route-draft';

const createEmptyStep = (id) => ({
  id,
  instruction: '',
  vehicle_type: '',
  fare_regular: '',
  fare_discount: '',
  stop_location: '',
  photo_url: '',
  video_url: '',
  isUploading: false,
});

const Contribute = () => {
  const navigate = useNavigate();
  const [start, setStart] = useState('');
  const [destination, setDestination] = useState('');
  const [steps, setSteps] = useState([createEmptyStep(1)]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  React.useEffect(() => {
    try {
      const savedDraft = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!savedDraft) {
        return;
      }

      const parsed = JSON.parse(savedDraft);
      if (parsed?.start || parsed?.destination || parsed?.steps?.length) {
        setStart(parsed.start || '');
        setDestination(parsed.destination || '');
        setSteps(parsed.steps?.length ? parsed.steps : [createEmptyStep(1)]);
      }
    } catch {
      // Ignore broken local drafts.
    }
  }, []);

  const addStep = () => {
    setSteps((current) => [...current, createEmptyStep(current.length + 1)]);
  };

  const removeStep = (index) => {
    const newSteps = [...steps];
    newSteps.splice(index, 1);
    setSteps(newSteps);
  };

  const handleStepChange = (index, field, value) => {
    const newSteps = [...steps];
    newSteps[index][field] = value;
    setSteps(newSteps);
  };

  const handleStepMediaUpload = async (index, file) => {
    if (!file) {
      return;
    }

    setErrorMessage('');

    setSteps((current) => current.map((step, currentIndex) => {
      if (currentIndex !== index) {
        return step;
      }

      return {
        ...step,
        isUploading: true,
      };
    }));

    try {
      const response = await uploadRouteStepMedia(file);

      setSteps((current) => current.map((step, currentIndex) => {
        if (currentIndex !== index) {
          return step;
        }

        const isVideo = response.media_type === 'video';

        return {
          ...step,
          isUploading: false,
          photo_url: isVideo ? '' : response.media_url,
          video_url: isVideo ? response.media_url : '',
        };
      }));
    } catch (error) {
      setSteps((current) => current.map((step, currentIndex) => {
        if (currentIndex !== index) {
          return step;
        }

        return {
          ...step,
          isUploading: false,
        };
      }));

      setErrorMessage(getApiErrorMessage(error, 'Unable to upload media. Please try again.'));
    }
  };

  const mapFare = (value) => {
    if (!value) {
      return null;
    }

    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const session = getStoredSession();

    if (!session?.user?.user_id) {
      setErrorMessage('Please sign in before submitting a route.');
      navigate('/login');
      return;
    }

    if (steps.some((step) => step.isUploading)) {
      setErrorMessage('Please wait for all media uploads to finish.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        start_location: start.trim(),
        destination: destination.trim(),
        created_by: session.user.user_id,
        steps: steps.map((step) => ({
          instruction: step.instruction.trim(),
          vehicle_type: step.vehicle_type || null,
          fare_regular: mapFare(step.fare_regular),
          fare_discount: mapFare(step.fare_discount),
          stop_location: step.stop_location.trim() || null,
          photo_url: step.photo_url || null,
          video_url: step.video_url || null,
        })),
      };

      const duplicateResult = await checkDuplicateRoute(payload);
      if (duplicateResult.probable_duplicate) {
        setDuplicateWarning(duplicateResult);

        const confirmed = window.confirm('Possible duplicate route found. Do you still want to publish this route?');
        if (!confirmed) {
          setIsSubmitting(false);
          return;
        }
      }

      const result = await createRoute(payload);
      alert('Route submitted successfully! Thank you for helping fellow commuters.');
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      navigate(`/route/${result.route_id}`);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to publish route. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    const session = getStoredSession();

    const localDraft = { start, destination, steps };
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(localDraft));

    if (!session?.user?.user_id) {
      setErrorMessage('Draft saved locally. Sign in to sync draft to server.');
      return;
    }

    try {
      await createRoute({
        start_location: start.trim(),
        destination: destination.trim(),
        created_by: session.user.user_id,
        is_draft: true,
        steps: steps.map((step) => ({
          instruction: step.instruction.trim() || 'Draft instruction',
          vehicle_type: step.vehicle_type || null,
          fare_regular: mapFare(step.fare_regular),
          fare_discount: mapFare(step.fare_discount),
          stop_location: step.stop_location.trim() || null,
          photo_url: step.photo_url || null,
          video_url: step.video_url || null,
        })),
      });

      setErrorMessage('Draft saved locally and synced to server.');
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Draft saved locally but server sync failed.'));
    }
  };

  return (
    <div className="screen-stack">
      <div className="row-between">
        <button className="btn-icon" onClick={() => navigate(-1)} aria-label="Go back">
          ←
        </button>
        <h1 style={{ margin: 0, flex: 1, marginLeft: '0.5rem' }}>Add a Route</h1>
      </div>

      <div className="card card-soft glass-card">
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Start Location</label>
            <input 
              type="text" 
              placeholder="e.g. Trinoma" 
              value={start}
              onChange={(e) => setStart(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label>Destination</label>
            <input 
              type="text" 
              placeholder="e.g. UP Diliman" 
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              required
            />
          </div>

          <h3 style={{ margin: '1rem 0 0.9rem', fontSize: '1.03rem' }}>Steps</h3>
          
          {steps.map((step, index) => (
            <div key={index} className="step-editor">
              <div className="row-between" style={{ marginBottom: '0.5rem' }}>
                <strong style={{ fontSize: '0.9rem' }}>Step {index + 1}</strong>
                {steps.length > 1 && (
                  <button type="button" onClick={() => removeStep(index)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '1.1rem' }}>
                    ✕
                  </button>
                )}
              </div>
              <div className="input-group" style={{ marginBottom: '0.5rem' }}>
                <textarea 
                  placeholder="E.g. Ride the UP-SM North Jeep terminal located besides..." 
                  rows="2"
                  value={step.instruction}
                  onChange={(e) => handleStepChange(index, 'instruction', e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                  <select 
                    value={step.vehicle_type} 
                    onChange={(e) => handleStepChange(index, 'vehicle_type', e.target.value)}
                    required
                  >
                    <option value="">Vehicle Type</option>
                    <option value="Jeepney">Jeepney</option>
                    <option value="Bus">Bus</option>
                    <option value="Train (MRT/LRT)">Train (MRT/LRT)</option>
                    <option value="Tricycle">Tricycle</option>
                    <option value="UV Express">UV Express</option>
                    <option value="Walk">Walk</option>
                  </select>
                </div>
                <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                  <input 
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Regular Fare" 
                    value={step.fare_regular}
                    onChange={(e) => handleStepChange(index, 'fare_regular', e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                  <input 
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Discounted Fare" 
                    value={step.fare_discount}
                    onChange={(e) => handleStepChange(index, 'fare_discount', e.target.value)}
                  />
                </div>
                <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                  <input 
                    type="text"
                    placeholder="Stop / Landmark"
                    value={step.stop_location}
                    onChange={(e) => handleStepChange(index, 'stop_location', e.target.value)}
                  />
                </div>
              </div>

              <div className="input-group" style={{ marginTop: '0.6rem', marginBottom: 0 }}>
                <label style={{ marginBottom: '0.45rem' }}>Step Visual (Photo or Short Video)</label>

                <div className="step-media-picker">
                  <input
                    id={`step-media-${index}`}
                    className="step-media-input"
                    type="file"
                    accept="image/*,video/*"
                    onChange={(e) => {
                      const [file] = e.target.files || [];
                      handleStepMediaUpload(index, file);
                      e.target.value = '';
                    }}
                  />

                  <label htmlFor={`step-media-${index}`} className="step-media-button">
                    <span aria-hidden="true">⬆</span>
                    <span>{step.photo_url || step.video_url ? 'Replace Photo/Video' : 'Add Photo or Short Video'}</span>
                  </label>

                  {step.photo_url && (
                    <span className="step-media-chip">Photo selected</span>
                  )}

                  {step.video_url && (
                    <span className="step-media-chip">Video selected</span>
                  )}

                  {(step.photo_url || step.video_url) && (
                    <button
                      type="button"
                      className="step-media-clear"
                      onClick={() => {
                        handleStepChange(index, 'photo_url', '');
                        handleStepChange(index, 'video_url', '');
                      }}
                    >
                      Remove media
                    </button>
                  )}
                </div>

                <p style={{ marginTop: '0.35rem', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  Supported: images and short videos (max 25MB).
                </p>
              </div>

              {step.isUploading && (
                <p style={{ marginTop: '0.45rem', fontSize: '0.8rem', color: 'var(--secondary-color)' }}>
                  Uploading media...
                </p>
              )}

              {step.photo_url && (
                <img
                  src={step.photo_url}
                  alt={`Step ${index + 1} visual`}
                  style={{ width: '100%', borderRadius: '12px', marginTop: '0.55rem', maxHeight: '170px', objectFit: 'cover' }}
                />
              )}

              {step.video_url && (
                <video
                  controls
                  src={step.video_url}
                  style={{ width: '100%', borderRadius: '12px', marginTop: '0.55rem', maxHeight: '210px', background: '#000' }}
                />
              )}
            </div>
          ))}

          {errorMessage && (
            <p className="form-message error-message" style={{ marginBottom: '0.9rem' }}>
              {errorMessage}
            </p>
          )}

          {duplicateWarning?.candidates?.length > 0 && (
            <div className="card card-soft" style={{ marginBottom: '0.9rem' }}>
              <strong style={{ fontSize: '0.84rem' }}>Potential duplicates found</strong>
              <p style={{ margin: '0.35rem 0 0.4rem', fontSize: '0.78rem' }}>
                Similar routes already exist. Review these before publishing:
              </p>
              {duplicateWarning.candidates.map((candidate) => (
                <p key={candidate.route_id} style={{ margin: 0, fontSize: '0.76rem' }}>
                  {candidate.start_location} to {candidate.destination} by {candidate.creator_name}
                </p>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem' }}>
            <button type="button" className="btn" onClick={() => setShowPreview((current) => !current)}>
              {showPreview ? 'Hide Preview' : 'Preview Route'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleSaveDraft}>
              Save Draft
            </button>
          </div>

          {showPreview && (
            <div className="card card-soft" style={{ marginBottom: '1rem' }}>
              <strong style={{ display: 'block', marginBottom: '0.45rem' }}>Preview</strong>
              <p style={{ margin: '0 0 0.45rem' }}>{start || 'Start'} to {destination || 'Destination'}</p>
              {steps.map((step, index) => (
                <p key={`preview-${index}`} style={{ margin: '0 0 0.25rem', fontSize: '0.78rem' }}>
                  {index + 1}. {step.instruction || 'No instruction yet'}
                </p>
              ))}
            </div>
          )}

          <button 
            type="button" 
            onClick={addStep} 
            className="btn" 
            style={{ width: '100%', marginBottom: '1.1rem', border: '1px dashed var(--primary-color)', color: 'var(--primary-color)', background: 'rgba(255, 255, 255, 0.38)' }}
          >
            + Add Another Step
          </button>

          <div className="notice-box" style={{ marginBottom: '1.1rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🛡️</span>
            <div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Your route will be reviewed by the community. Accurate contributions earn you <strong>Reputation Points</strong> and the <em>Local Guide</em> badge!
              </p>
            </div>
          </div>

          <button type="submit" className="btn btn-secondary" disabled={isSubmitting}>
            {isSubmitting ? 'Publishing...' : 'Publish Route'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Contribute;
