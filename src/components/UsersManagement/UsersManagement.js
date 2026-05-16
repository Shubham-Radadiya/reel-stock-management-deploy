import React, { useState } from 'react';
import { Shield } from 'lucide-react';
import { createUser, fetchUsers, updateUserAccess } from '../../api/reelsApi';
import { formatAccessSummary, defaultAccess } from '../../utils/userAccessUtils';
import { showError, showSuccess } from '../../utils/toastUtils';
import UserAccessModal from './UserAccessModal';
import './UsersManagement.css';

const UsersManagement = ({ users, setUsers }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'user'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accessUser, setAccessUser] = useState(null);
  const [isSavingAccess, setIsSavingAccess] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({});

  const onChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const refreshUsers = async () => {
    const refreshed = await fetchUsers();
    setUsers(refreshed);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createUser({
        ...formData,
        access: defaultAccess()
      });
      showSuccess('User created successfully');
      setFormData({ username: '', password: '', role: 'user' });
      await refreshUsers();
    } catch (error) {
      showError(error.message || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAccess = async (userId, access) => {
    setIsSavingAccess(true);
    try {
      await updateUserAccess(userId, access);
      showSuccess('Access updated');
      setAccessUser(null);
      await refreshUsers();
    } catch (error) {
      showError(error.message || 'Failed to update access');
    } finally {
      setIsSavingAccess(false);
    }
  };

  const togglePasswordVisible = (userId) => {
    setVisiblePasswords((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  return (
    <div className="main-card shadow-sm border-0 p-3 users-management">
      <h5 className="mb-3">Users Management</h5>
      <form className="row g-2 mb-4 users-create-form" onSubmit={handleCreateUser}>
        <div className="col-md-4">
          <input
            type="text"
            className="form-control"
            placeholder="Username"
            name="username"
            value={formData.username}
            onChange={onChange}
            required
          />
        </div>
        <div className="col-md-4">
          <input
            type="text"
            className="form-control"
            placeholder="Password"
            name="password"
            value={formData.password}
            onChange={onChange}
            required
            autoComplete="new-password"
          />
        </div>
        <div className="col-md-2">
          <select
            className="form-select"
            name="role"
            value={formData.role}
            onChange={onChange}
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="col-md-2">
          <button className="btn btn-primary w-100" type="submit" disabled={isSubmitting}>
            Add
          </button>
        </div>
      </form>
      <p className="users-create-note text-muted small mb-3">
        New users start with Reel Stock Management only. Use the access icon to grant report sections.
      </p>

      <div className="table-responsive">
        <table className="table table-striped users-table align-middle">
          <thead>
            <tr>
              <th>Username</th>
              <th>Password</th>
              <th>Role</th>
              <th>Access</th>
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isAdmin = user.role === 'admin';
              const showPwd = visiblePasswords[user.id];
              return (
                <tr key={user.id}>
                  <td className="fw-semibold">{user.username}</td>
                  <td>
                    <code className="users-password-cell">
                      {showPwd ? user.plainPassword || '—' : '••••••••'}
                    </code>
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0 ms-2 users-show-pwd"
                      onClick={() => togglePasswordVisible(user.id)}
                    >
                      {showPwd ? 'Hide' : 'Show'}
                    </button>
                  </td>
                  <td className="text-capitalize">{user.role}</td>
                  <td>
                    <span className="users-access-summary">
                      {formatAccessSummary(user.access)}
                    </span>
                  </td>
                  <td className="text-end">
                    {!isAdmin ? (
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm users-access-btn"
                        title="Set report access"
                        onClick={() => setAccessUser(user)}
                      >
                        <Shield size={14} />
                        <span className="ms-1">Access</span>
                      </button>
                    ) : (
                      <span className="text-muted small">Full access</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <UserAccessModal
        user={accessUser}
        isOpen={Boolean(accessUser)}
        onClose={() => setAccessUser(null)}
        onSave={handleSaveAccess}
        isSaving={isSavingAccess}
      />
    </div>
  );
};

export default UsersManagement;
