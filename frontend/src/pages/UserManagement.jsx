import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '@store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@components/shared/Card';
import Button from '@components/shared/Button';
import Badge from '@components/shared/Badge';
import Modal, { ModalFooter } from '@components/shared/Modal';
import Spinner from '@components/shared/Spinner';
import Alert, { AlertDescription } from '@components/shared/Alert';
import { getAllUsers, createUser, changeUserRole, deactivateUser } from '@services/adminService';
import { formatDate } from '@utils/formatters';
import { ArrowLeft, UserPlus, Shield, ShieldCheck, UserX, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const UserManagement = () => {
  const navigate = useNavigate();
  const { admin } = useAuthStore();

  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Add user modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'STAFF' });
  const [isCreating, setIsCreating] = useState(false);

  // Deactivate confirmation
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Role change confirmation
  const [roleChangeTarget, setRoleChangeTarget] = useState(null);
  const [isChangingRole, setIsChangingRole] = useState(false);

  // Redirect if not ADMIN role
  useEffect(() => {
    if (admin && admin.role !== 'ADMIN') {
      navigate('/admin');
    }
  }, [admin, navigate]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await getAllUsers({ limit: 100 });
      setUsers(result?.admins || []);
    } catch (error) {
      setLoadError(error.message || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password) {
      toast.error('All fields are required');
      return;
    }
    setIsCreating(true);
    try {
      await createUser(newUser);
      toast.success('User created successfully');
      setIsAddModalOpen(false);
      setNewUser({ name: '', email: '', password: '', role: 'STAFF' });
      fetchUsers();
    } catch (error) {
      toast.error(error.message || 'Failed to create user');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRoleChange = async () => {
    if (!roleChangeTarget) return;
    const newRole = roleChangeTarget.role === 'ADMIN' ? 'STAFF' : 'ADMIN';
    setIsChangingRole(true);
    try {
      await changeUserRole(roleChangeTarget.id, newRole);
      toast.success(`Role changed to ${newRole}`);
      setRoleChangeTarget(null);
      fetchUsers();
    } catch (error) {
      toast.error(error.message || 'Failed to change role');
    } finally {
      setIsChangingRole(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    setIsDeactivating(true);
    try {
      await deactivateUser(deactivateTarget.id);
      toast.success('User deactivated');
      setDeactivateTarget(null);
      fetchUsers();
    } catch (error) {
      toast.error(error.message || 'Failed to deactivate user');
    } finally {
      setIsDeactivating(false);
    }
  };

  if (admin && admin.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                User Management
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage admin and staff accounts
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={fetchUsers} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => setIsAddModalOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </div>
        </div>

        {/* Error */}
        {loadError && (
          <Alert variant="destructive">
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              All Users ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : users.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No users found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">Name</th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">Email</th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">Role</th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">Status</th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">Last Login</th>
                      <th className="pb-3 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => {
                      const isSelf = user.id === admin?.id;
                      return (
                        <tr key={user.id} className="border-b last:border-0">
                          <td className="py-3 pr-4 font-medium text-foreground">
                            {user.name}
                            {isSelf && (
                              <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                            )}
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground">{user.email}</td>
                          <td className="py-3 pr-4">
                            <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                              {user.role === 'ADMIN' ? (
                                <span className="flex items-center gap-1">
                                  <ShieldCheck className="h-3 w-3" />
                                  Admin
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <Shield className="h-3 w-3" />
                                  Staff
                                </span>
                              )}
                            </Badge>
                          </td>
                          <td className="py-3 pr-4">
                            <Badge variant={user.isActive ? 'success' : 'error'}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground">
                            {user.lastLoginAt
                              ? formatDate(user.lastLoginAt, 'MMM dd, yyyy hh:mm a')
                              : 'Never'}
                          </td>
                          <td className="py-3">
                            {!isSelf && user.isActive && (
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setRoleChangeTarget(user)}
                                  title={`Change to ${user.role === 'ADMIN' ? 'Staff' : 'Admin'}`}
                                >
                                  <Shield className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeactivateTarget(user)}
                                  className="text-destructive hover:text-destructive"
                                  title="Deactivate user"
                                >
                                  <UserX className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add User Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add User"
        description="Create a new admin or staff account"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="add-name" className="text-sm font-medium text-foreground">
              Name *
            </label>
            <input
              id="add-name"
              type="text"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              placeholder="John Doe"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={isCreating}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="add-email" className="text-sm font-medium text-foreground">
              Email *
            </label>
            <input
              id="add-email"
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              placeholder="user@example.com"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={isCreating}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="add-password" className="text-sm font-medium text-foreground">
              Password *
            </label>
            <input
              id="add-password"
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              placeholder="Min 8 chars, upper, lower, number, special"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={isCreating}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="add-role" className="text-sm font-medium text-foreground">
              Role *
            </label>
            <select
              id="add-role"
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={isCreating}
            >
              <option value="STAFF">Staff</option>
              <option value="ADMIN">Admin</option>
            </select>
            <p className="text-xs text-muted-foreground">
              Admins can manage users and templates. Staff can manage students and reminders.
            </p>
          </div>

          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create User'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Role Change Confirmation */}
      <Modal
        isOpen={!!roleChangeTarget}
        onClose={() => setRoleChangeTarget(null)}
        title="Change User Role"
        size="sm"
      >
        {roleChangeTarget && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Change <strong>{roleChangeTarget.name}</strong>'s role from{' '}
              <Badge variant={roleChangeTarget.role === 'ADMIN' ? 'default' : 'secondary'}>
                {roleChangeTarget.role}
              </Badge>{' '}
              to{' '}
              <Badge variant={roleChangeTarget.role === 'ADMIN' ? 'secondary' : 'default'}>
                {roleChangeTarget.role === 'ADMIN' ? 'STAFF' : 'ADMIN'}
              </Badge>
              ?
            </p>
            {roleChangeTarget.role === 'ADMIN' && (
              <p className="text-sm text-yellow-700 bg-yellow-50 rounded-md p-3">
                Downgrading to Staff will remove their ability to manage users and templates.
              </p>
            )}
            <ModalFooter>
              <Button variant="outline" onClick={() => setRoleChangeTarget(null)} disabled={isChangingRole}>
                Cancel
              </Button>
              <Button onClick={handleRoleChange} disabled={isChangingRole}>
                {isChangingRole ? 'Changing...' : 'Confirm Change'}
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>

      {/* Deactivate Confirmation */}
      <Modal
        isOpen={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        title="Deactivate User"
        size="sm"
      >
        {deactivateTarget && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to deactivate <strong>{deactivateTarget.name}</strong> ({deactivateTarget.email})?
            </p>
            <p className="text-sm text-red-700 bg-red-50 rounded-md p-3">
              This user will no longer be able to log in. Their data will be preserved.
            </p>
            <ModalFooter>
              <Button variant="outline" onClick={() => setDeactivateTarget(null)} disabled={isDeactivating}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeactivate} disabled={isDeactivating}>
                {isDeactivating ? 'Deactivating...' : 'Deactivate'}
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default UserManagement;
