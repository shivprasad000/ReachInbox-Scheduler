import { Me } from "../types";
import { api } from "../api/client";
import { useNavigate } from "react-router-dom";

export default function Header({ user }: { user: Me }) {
  const navigate = useNavigate();

  async function handleLogout() {
    await api.post("/auth/logout");
    navigate("/login");
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-brand-500" />
          <span className="font-semibold">ReachInbox Scheduler</span>
        </div>
        <div className="flex items-center gap-3">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium">
              {user.name?.[0]?.toUpperCase()}
            </div>
          )}
          <div className="text-sm leading-tight">
            <div className="font-medium">{user.name}</div>
            <div className="text-slate-500">{user.email}</div>
          </div>
          <button
            onClick={handleLogout}
            className="ml-3 text-sm text-slate-500 hover:text-slate-800 border border-slate-200 rounded-md px-3 py-1.5"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
