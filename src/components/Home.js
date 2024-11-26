import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../firebase/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import '../styles/Home.css';

const Home = () => {
  const [user, setUser] = useState(null);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [profileVisible, setProfileVisible] = useState(false);
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        setName(user.displayName || '');
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setDropdownVisible(false);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const toggleDropdown = () => {
    setDropdownVisible(!dropdownVisible);
  };

  const handlePuzzleClick = () => {
    if (user) {
      navigate('/puzzles');
    } else {
      navigate('/login');
    }
  };

  const handlePlayClick = () => {
    if (user) {
      navigate('/game');
    } else {
      navigate('/login');
    }
  };

  const handleDiscordClick = () => {
    window.open('https://discord.gg/CnNaPXFh9n', '_blank');
  };

  const handleProfileClick = () => {
    setProfileVisible(true);
  };

  const handleSaveProfile = () => {
    setProfileVisible(false);
  };

  return (
    <div className="home">
      <div className="overlay"></div>
      <div className="logo-text">Chess Battle</div>
      {user ? (
        <div className="user-info" onClick={toggleDropdown}>
          {user.email}
        </div>
      ) : (
        <Link to="/login" className="login-button">Login</Link>
      )}
      {dropdownVisible && (
        <div className="dropdown">
          <button className="dropdown-button" onClick={handleProfileClick}>Profile</button>
          <button className="dropdown-button" onClick={handleLogout}>Logout</button>
        </div>
      )}
      <div className="content">
        <h2>SEASON 2</h2>
        <h1>SOLO WARS</h1>
        <ul>
          <li>Explore unique gameplay - Learn by playing with yourself</li>
          <li>Clash in Puzzle Wars and battle with computer</li>
          <li>Free play, easy sign-up - no hassle, just fun</li>
        </ul>
        <div className="button-container">
          <button className="styled-button" onClick={handlePlayClick}>Play Now</button>
          <button className="styled-button" onClick={handlePuzzleClick}>Puzzles</button>
          <button className="styled-button" onClick={handleDiscordClick}>Join Discord</button>
        </div>
      </div>
      {profileVisible && (
        <div className="profile-modal">
          <div className="profile-content">
            <h1>Edit Profile</h1>
            <label>
              Name:
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              Date of Birth:
              <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            </label>
            <button onClick={handleSaveProfile}>Save</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;

export const ProfilePopup = ({ onClose }) => {
  // ... existing ProfilePopup code ...
};