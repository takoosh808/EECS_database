"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "../../components/DashboardShell";

type UserType = "Owner" | "Admin" | "User";

type User = {
  id: string;
  name: string;
  email: string;
  type: UserType;
};

type ApiUser = Omit<User, "type"> & {
  type: "user" | "admin" | "owner";
};

type SearchField = "all" | "name" | "email" | "id";

type UsersResponse = {
  error?: string;
  user?: ApiUser;
  temporaryPassword?: string;
};

function formatUser(user: ApiUser): User {
  return {
    ...user,
    type: user.type === "owner" ? "Owner" : user.type === "admin" ? "Admin" : "User",
  };
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchField, setSearchField] = useState<SearchField>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | UserType>("all");
  const [userRole, setUserRole] = useState<"admin" | "owner" | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState<UserType>("User");
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editType, setEditType] = useState<UserType>("User");
  const [editPassword, setEditPassword] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role !== "admin" && role !== "owner") {
      router.push("/home");
      return;
    }
    setUserRole(role);

    async function loadUsers() {
      try {
        const response = await fetch("/api/users");
        const payload = (await response.json()) as ApiUser[] | UsersResponse;
        if (!response.ok) {
          throw new Error((payload as UsersResponse).error ?? "Failed to load users.");
        }
        if (!Array.isArray(payload)) {
          throw new Error("Invalid users response.");
        }
        setUsers(payload.map(formatUser));
      } catch (err) {
        setLoadError((err as Error).message || "Failed to load users.");
      } finally {
        setLoading(false);
      }
    }

    loadUsers();
  }, [router]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return users.filter((user) => {
      if (typeFilter !== "all" && user.type !== typeFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const values: Record<SearchField, string> = {
        all: `${user.name} ${user.email} ${user.id}`,
        name: user.name,
        email: user.email,
        id: user.id,
      };

      return values[searchField].toLowerCase().includes(normalizedSearch);
    });
  }, [search, searchField, typeFilter, users]);

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(null);
    setCreating(true);

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role: type === "Owner" ? "owner" : type === "Admin" ? "admin" : "user",
        }),
      });
      const payload = (await response.json()) as UsersResponse;
      if (!response.ok || !payload.user || !payload.temporaryPassword) {
        throw new Error(payload.error ?? "Failed to create user.");
      }

      const createdUser = payload.user;
      const generatedPassword = payload.temporaryPassword;
      setUsers((currentUsers) => [formatUser(createdUser), ...currentUsers]);
      setTemporaryPassword(generatedPassword);
      setName("");
      setEmail("");
      setType("User");
    } catch (err) {
      setCreateError((err as Error).message || "Failed to create user.");
    } finally {
      setCreating(false);
    }
  }

  function closeCreateForm() {
    setShowCreateForm(false);
    setTemporaryPassword(null);
    setName("");
    setEmail("");
    setType("User");
    setCreateError(null);
  }

  function openEditForm(user: User) {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditType(user.type);
    setEditPassword("");
    setEditError(null);
  }

  async function saveEditedUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingUser) return;

    const response = await fetch(`/api/users/${editingUser.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName.trim(),
        email: editEmail.trim().toLowerCase(),
        role: editType === "Owner" ? "owner" : editType === "Admin" ? "admin" : "user",
        password: editPassword || undefined,
      }),
    });
    const payload = (await response.json()) as ApiUser | UsersResponse;
    if (!response.ok || !("id" in payload)) {
      setEditError((payload as UsersResponse).error ?? "Failed to update user.");
      return;
    }

    setUsers((currentUsers) => currentUsers.map((user) => (user.id === editingUser.id ? formatUser(payload) : user)));
    setEditPassword("");
    setEditingUser(null);
  }

  async function removeUser(user: User) {
    const response = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
    if (!response.ok) {
      const payload = (await response.json()) as UsersResponse;
      setEditError(payload.error ?? "Failed to remove user.");
      return;
    }
    setUsers((currentUsers) => currentUsers.filter((currentUser) => currentUser.id !== user.id));
  }

  return (
    <DashboardShell>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 py-2">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-crimson-600">Administration</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">Users</h1>
            <p className="mt-2 text-sm text-zinc-600">Manage inventory system accounts and access types.</p>
          </div>
          {userRole === "owner" && (
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="rounded-md bg-crimson-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-crimson-700"
            >
              Create New User
            </button>
          )}
        </header>

        <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_160px]">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search users"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-crimson-500"
            />
            <select
              value={searchField}
              onChange={(event) => setSearchField(event.target.value as SearchField)}
              aria-label="Search field"
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-crimson-500"
            >
              <option value="all">All fields</option>
              <option value="name">Name</option>
              <option value="email">Email</option>
              <option value="id">ID</option>
            </select>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as "all" | UserType)}
              aria-label="Filter by user type"
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-crimson-500"
            >
              <option value="all">All user types</option>
              <option value="Owner">Owner</option>
              <option value="Admin">Admin</option>
              <option value="User">User</option>
            </select>
          </div>
        </section>

        <section className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">ID</th>
                <th className="px-4 py-3 font-semibold">User Type</th>
                {userRole === "owner" && <th className="px-4 py-3 font-semibold">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td className="px-4 py-8 text-center text-zinc-500" colSpan={4}>
                    Loading users...
                  </td>
                </tr>
              )}
              {loadError && !loading && (
                <tr>
                  <td className="px-4 py-8 text-center text-red-600" colSpan={4}>
                    {loadError}
                  </td>
                </tr>
              )}
              {!loading && !loadError && filteredUsers.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-zinc-500" colSpan={4}>
                    No users match the current filters.
                  </td>
                </tr>
              )}
              {!loading && !loadError && filteredUsers.map((user) => (
                <tr key={user.id} className="border-t border-zinc-200">
                  <td className="px-4 py-3 font-medium text-zinc-900">{user.name}</td>
                  <td className="px-4 py-3 text-zinc-700">{user.email}</td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">{user.id}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        user.type === "Owner"
                          ? "bg-amber-100 text-amber-800"
                          : user.type === "Admin"
                          ? "bg-crimson-100 text-crimson-800"
                          : "bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      {user.type}
                    </span>
                  </td>
                  {userRole === "owner" && (
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEditForm(user)}
                          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => removeUser(user)}
                          className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      {showCreateForm && (
        <div
          className="fixed inset-0 z-1000 flex items-center justify-center bg-black/50 p-4"
          onClick={closeCreateForm}
        >
          <div
            className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-xl font-semibold text-zinc-900">Create New User</h2>
            <p className="mt-1 text-sm text-zinc-600">A temporary password will be generated for this account.</p>

            {!temporaryPassword ? (
              <form onSubmit={handleCreateUser} className="mt-5 flex flex-col gap-4">
                <div>
                  <label htmlFor="new-user-name" className="mb-1 block text-sm font-medium text-zinc-700">
                    Name
                  </label>
                  <input
                    id="new-user-name"
                    required
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-crimson-500"
                  />
                </div>

                <div>
                  <label htmlFor="new-user-email" className="mb-1 block text-sm font-medium text-zinc-700">
                    Email
                  </label>
                  <input
                    id="new-user-email"
                    required
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-crimson-500"
                  />
                </div>

                <div>
                  <label htmlFor="new-user-type" className="mb-1 block text-sm font-medium text-zinc-700">
                    User Type
                  </label>
                  <select
                    id="new-user-type"
                    value={type}
                    onChange={(event) => setType(event.target.value as UserType)}
                    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-crimson-500"
                  >
                    <option value="Owner">Owner</option>
                    <option value="User">User</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>

                <div className="mt-2 flex gap-2">
                  <button
                    type="submit"
                    disabled={creating}
                    className="rounded-md bg-crimson-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-crimson-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {creating ? "Creating..." : "Create User"}
                  {userRole === "owner" && (
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(true)}
                      className="rounded-md bg-crimson-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-crimson-700"
                    >
                      Create New User
                    </button>
                  )}
                  </button>
                </div>
                {createError && <p className="text-sm text-red-600">{createError}</p>}
              </form>
            ) : (
              <div className="mt-5">
                <div className="rounded-md border border-crimson-200 bg-crimson-50 p-4">
                  <p className="text-sm font-medium text-crimson-900">Temporary password</p>
                  <p className="mt-2 break-all font-mono text-lg font-semibold tracking-wide text-crimson-800">
                    {temporaryPassword}
                  </p>
                  <p className="mt-3 text-xs text-crimson-800">
                    Give this password to the user securely. They should change it after signing in.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeCreateForm}
                  className="mt-4 rounded-md bg-crimson-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-crimson-700"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {editingUser && (
        <div
          className="fixed inset-0 z-1000 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setEditingUser(null)}
        >
          <form
            className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
            onSubmit={saveEditedUser}
          >
            <h2 className="text-xl font-semibold text-zinc-900">Edit User</h2>
            <div className="mt-5 flex flex-col gap-4">
              <div>
                <label htmlFor="edit-user-name" className="mb-1 block text-sm font-medium text-zinc-700">Name</label>
                <input
                  id="edit-user-name"
                  required
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-crimson-500"
                />
              </div>
              <div>
                <label htmlFor="edit-user-email" className="mb-1 block text-sm font-medium text-zinc-700">Email</label>
                <input
                  id="edit-user-email"
                  required
                  type="email"
                  value={editEmail}
                  onChange={(event) => setEditEmail(event.target.value)}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-crimson-500"
                />
              </div>
              <div>
                <label htmlFor="edit-user-type" className="mb-1 block text-sm font-medium text-zinc-700">User Type</label>
                <select
                  id="edit-user-type"
                  value={editType}
                  onChange={(event) => setEditType(event.target.value as UserType)}
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-crimson-500"
                >
                  <option value="Owner">Owner</option>
                  <option value="Admin">Admin</option>
                  <option value="User">User</option>
                </select>
              </div>
              <div>
                <label htmlFor="edit-user-password" className="mb-1 block text-sm font-medium text-zinc-700">New Password</label>
                <input
                  id="edit-user-password"
                  type="password"
                  value={editPassword}
                  onChange={(event) => setEditPassword(event.target.value)}
                  placeholder="Leave blank to keep current password"
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-crimson-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="rounded-md bg-crimson-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-crimson-700"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
                >
                  Cancel
                </button>
              </div>
              {editError && <p className="text-sm text-red-600">{editError}</p>}
            </div>
          </form>
        </div>
      )}
    </DashboardShell>
  );
}
