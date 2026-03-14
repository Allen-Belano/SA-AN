import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Contribute = () => {
  const navigate = useNavigate();
  const [start, setStart] = useState('');
  const [destination, setDestination] = useState('');
  const [steps, setSteps] = useState([{ id: 1, instruction: '', vehicle: '', fare: '' }]);

  const addStep = () => {
    setSteps([...steps, { id: steps.length + 1, instruction: '', vehicle: '', fare: '' }]);
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

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('Route submitted for community review! Thank you for contributing.');
    navigate('/');
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
                    value={step.vehicle} 
                    onChange={(e) => handleStepChange(index, 'vehicle', e.target.value)}
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
                    type="text" 
                    placeholder="Regular Fare" 
                    value={step.fare}
                    onChange={(e) => handleStepChange(index, 'fare', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}

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

          <button type="submit" className="btn btn-secondary">
            Publish Route
          </button>
        </form>
      </div>
    </div>
  );
};

export default Contribute;
