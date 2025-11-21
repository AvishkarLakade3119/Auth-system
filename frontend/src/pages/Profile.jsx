import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import styles from './Profile.module.css';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    bio: '',
    dateOfBirth: '',
    gender: '',
    occupation: '',
    company: '',
    website: '',
    socialLinks: {
      twitter: '',
      linkedin: '',
      github: '',
    },
  });

  // Removed password and delete account state as these features are moved to account settings

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        address: user.address || '',
        city: user.location?.city || '',
        country: user.location?.country || '',
        bio: user.bio || '',
        dateOfBirth: user.dateOfBirth ? user.dateOfBirth.split('T')[0] : '',
        gender: user.gender || '',
        occupation: user.occupation || '',
        company: user.company || '',
        website: user.socialLinks?.website || '',
        socialLinks: {
          twitter: user.socialLinks?.twitter || '',
          linkedin: user.socialLinks?.linkedin || '',
          github: user.socialLinks?.github || '',
        },
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('social.')) {
      const socialField = name.split('.')[1];
      setFormData({
        ...formData,
        socialLinks: {
          ...formData.socialLinks,
          [socialField]: value,
        },
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  // Password change functionality moved to account settings

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Transform the data to match backend expectations
      const profileData = {
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        bio: formData.bio,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        occupation: formData.occupation,
        company: formData.company,
        location: {
          city: formData.city,
          country: formData.country
        },
        socialLinks: {
          ...formData.socialLinks,
          website: formData.website
        }
      };
      
      const response = await updateProfile(profileData);
      if (response.success) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        setIsEditing(false);
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update profile' });
    } finally {
      setLoading(false);
    }
  };

  // Password change functionality moved to account settings

  // Delete account functionality moved to account settings danger zone

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>My Profile</h1>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className={styles.editBtn}
          >
            Edit Profile
          </button>
        )}
      </div>

      {message.text && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      <div className={styles.profileContent}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Basic Information</h2>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="name" className={styles.label}>Full Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="email" className={styles.label}>Email</label>
                <input
                  type="email"
                  id="email"
                  value={user?.user?.email || user?.email || ''}
                  disabled
                  className={`${styles.input} ${styles.disabled}`}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="phone" className={styles.label}>Phone</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="dateOfBirth" className={styles.label}>Date of Birth</label>
                <input
                  type="date"
                  id="dateOfBirth"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="gender" className={styles.label}>Gender</label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className={styles.input}
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Address Information</h2>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="address" className={styles.label}>Address</label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="city" className={styles.label}>City</label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="country" className={styles.label}>Country</label>
                <input
                  type="text"
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className={styles.input}
                />
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Professional Information</h2>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="occupation" className={styles.label}>Occupation</label>
                <input
                  type="text"
                  id="occupation"
                  name="occupation"
                  value={formData.occupation}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="company" className={styles.label}>Company</label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="website" className={styles.label}>Website</label>
                <input
                  type="url"
                  id="website"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className={styles.input}
                  placeholder="https://example.com"
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="bio" className={styles.label}>Bio</label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                disabled={!isEditing}
                className={styles.textarea}
                rows="4"
                placeholder="Tell us about yourself..."
              />
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Social Links</h2>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="twitter" className={styles.label}>Twitter</label>
                <input
                  type="text"
                  id="twitter"
                  name="social.twitter"
                  value={formData.socialLinks.twitter}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className={styles.input}
                  placeholder="@username"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="linkedin" className={styles.label}>LinkedIn</label>
                <input
                  type="text"
                  id="linkedin"
                  name="social.linkedin"
                  value={formData.socialLinks.linkedin}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className={styles.input}
                  placeholder="linkedin.com/in/username"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="github" className={styles.label}>GitHub</label>
                <input
                  type="text"
                  id="github"
                  name="social.github"
                  value={formData.socialLinks.github}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className={styles.input}
                  placeholder="github.com/username"
                />
              </div>
            </div>
          </div>

          {isEditing && (
            <div className={styles.formActions}>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className={styles.cancelBtn}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={styles.saveBtn}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </form>

        {/* Account settings section removed - features moved to dedicated Account Settings page */}
      </div>
    </div>
  );
};

export default Profile;