import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import '../App.css';

interface HighScore {
  user_id: number;
  value: number;
  updated_at: string | null;
}

interface Stats {
  user_id: number;
  total_scores: number;
  average: number;
  updated_at: string | null;
}

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [score, setScore] = useState('');
  const [highScore, setHighScore] = useState<HighScore | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 2000); // Refresh every 2 seconds
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [highScoreRes, statsRes] = await Promise.all([
        api.get('/me/high-score'),
        api.get('/me/stats'),
      ]);
      setHighScore(highScoreRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const generateIdempotencyKey = () => {
    return `${user?.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const scoreValue = parseInt(score);
    if (isNaN(scoreValue) || scoreValue < 0 || scoreValue > 100) {
      setMessage({ type: 'error', text: 'Score must be between 0 and 100' });
      setLoading(false);
      return;
    }

    try {
      const idempotencyKey = generateIdempotencyKey();
      await api.post('/scores', {
        value: scoreValue,
        idempotency_key: idempotencyKey,
      });
      setMessage({ type: 'success', text: 'Score submitted successfully!' });
      setScore('');
      // Refresh data after a short delay to allow async processing
      setTimeout(loadData, 500);
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to submit score',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="header">
        <h1>Scoreboard Dashboard</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: '#666' }}>{user?.email}</span>
          <button className="btn btn-secondary" onClick={logout}>
            Logout
          </button>
        </div>
      </div>

      <div className="container">
        <div className="card">
          <h2>Submit Score</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="score">Score (0-100)</label>
              <input
                type="number"
                id="score"
                min="0"
                max="100"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            {message && (
              <div className={message.type === 'success' ? 'success' : 'error'}>
                {message.text}
              </div>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%' }}
            >
              {loading ? 'Submitting...' : 'Submit Score'}
            </button>
          </form>
        </div>

        <div className="card">
          <h2>Your Statistics</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <h3>{highScore?.value ?? 0}</h3>
              <p>High Score</p>
            </div>
            <div className="stat-card">
              <h3>{stats?.total_scores ?? 0}</h3>
              <p>Total Submissions</p>
            </div>
            <div className="stat-card">
              <h3>{stats?.average ? stats.average.toFixed(2) : '0.00'}</h3>
              <p>Average Score</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

