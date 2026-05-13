import React, { useState } from 'react';
import { createUser, fetchUsers } from '../../api/reelsApi';
import { showError, showSuccess } from '../../utils/toastUtils';

const UsersManagement = ({ users, setUsers }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createUser(formData);
      showSuccess('User created successfully');
      setFormData({ username: '', email: '', password: '', role: 'user' });
      const refreshed = await fetchUsers();
      setUsers(refreshed);
    } catch (error) {
      showError(error.message || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="main-card shadow-sm border-0 p-3">
      <h5 className="mb-3">Users Management</h5>
      <form className="row g-2 mb-4" onSubmit={handleCreateUser}>
        <div className="col-md-3">
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
        <div className="col-md-3">
          <input
            type="email"
            className="form-control"
            placeholder="Email"
            name="email"
            value={formData.email}
            onChange={onChange}
            required
          />
        </div>
        <div className="col-md-3">
          <input
            type="password"
            className="form-control"
            placeholder="Password"
            name="password"
            value={formData.password}
            onChange={onChange}
            required
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
        <div className="col-md-1">
          <button className="btn btn-primary w-100" type="submit" disabled={isSubmitting}>
            Add
          </button>
        </div>
      </form>

      <div className="table-responsive">
        <table className="table table-striped">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.username}</td>
                <td>{user.email}</td>
                <td className="text-capitalize">{user.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UsersManagement;
