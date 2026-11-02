import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Users,
  Files,
  HardDrive,
  Activity,
  Search,
  LogOut,
  RefreshCw,
  Ban,
  CheckCircle2,
  Clock3,
  KeyRound,
  Trash2,
  Server,
  AlertCircle,
  Copy,
  Check,
  X,
  Database,
  Cloud,
  Eye,
  Shield,
  UserCheck,
  SlidersHorizontal,
  Mail,
  Send,
  Megaphone,
  Radio,
  FileSpreadsheet,
  FileCode,
  Sparkles,
  CheckCheck,
  Zap,
} from "lucide-react";
import { API_BASE_URL } from "../config/api";
import "../styles/admin.css";

const formatBytes = (bytes = 0) => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
};

export default function AdminDashboard({ currentUser, onAdminLoaded }) {
  const navigate = useNavigate();

  // Primary Data States
  const [overview, setOverview] = useState(null);
  const [systemStatus, setSystemStatus] = useState(null);
  const [users, setUsers] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [logs, setLogs] = useState([]);
  const [currentAdmin, setCurrentAdmin] = useState(currentUser || null);

  // Email & Broadcast States
  const [emailStatus, setEmailStatus] = useState({ configured: false });
  const [emailRecipientType, setEmailRecipientType] = useState("all"); // "all" | "active" | "suspended" | "selected"
  const [emailSelectedUserId, setEmailSelectedUserId] = useState("");
  const [emailCategory, setEmailCategory] = useState("announcement"); // "announcement" | "security" | "maintenance" | "urgent"
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [emailResult, setEmailResult] = useState(null);

  // Grok AI Assistant States
  const [grokPrompt, setGrokPrompt] = useState("");
  const [grokTone, setGrokTone] = useState("announcement");
  const [isGeneratingWithGrok, setIsGeneratingWithGrok] = useState(false);

  // Platform Live Announcement Banner States
  const [announcement, setAnnouncement] = useState({ active: false, message: "", type: "info" });
  const [isSavingAnnouncement, setIsSavingAnnouncement] = useState(false);

  // Live Ping Diagnostics States
  const [pingResult, setPingResult] = useState(null);
  const [isPinging, setIsPinging] = useState(false);

  // UI Control States
  const [tab, setTab] = useState("overview"); // "overview" | "users" | "documents" | "logs" | "health" | "email"
  const [loading, setLoading] = useState(true);
  const [purging, setPurging] = useState(false);
  const [banner, setBanner] = useState(null); // { type: 'success' | 'error', message: string }

  // Filter & Search States
  const [userSearch, setUserSearch] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState("all");
  const [userRoleFilter, setUserRoleFilter] = useState("all");

  const [docSearch, setDocSearch] = useState("");
  const [docModeFilter, setDocModeFilter] = useState("all");

  const [logSearch, setLogSearch] = useState("");

  // Modals
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [resetPasswordModal, setResetPasswordModal] = useState(null); // { user, tempPassword, copied }
  const [confirmDialog, setConfirmDialog] = useState(null); // { title, message, onConfirm, danger }

  const showBanner = (type, message) => {
    setBanner({ type, message });
    setTimeout(() => {
      setBanner((prev) => (prev?.message === message ? null : prev));
    }, 6000);
  };

  const adminFetch = useCallback(
    async (path, options = {}) => {
      const token =
        sessionStorage.getItem("sv_admin_token") ||
        sessionStorage.getItem("sv_token") ||
        localStorage.getItem("sv_token");
      if (!token) {
        navigate("/login", { replace: true });
        throw new Error("Admin session required. Please sign in.");
      }

      let response;
      try {
        response = await fetch(`${API_BASE_URL}/admin${path}`, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...(options.headers || {}),
          },
        });
      } catch (netErr) {
        throw new Error(
          `Cannot connect to backend server at ${API_BASE_URL}. Please start your backend server (node backend/server.js).`
        );
      }

      const data = await response.json().catch(() => ({}));

      if (response.status === 401 || response.status === 403) {
        sessionStorage.removeItem("sv_admin_token");
        navigate("/login", { replace: true });
        throw new Error("Session expired or unauthorized. Please sign in again.");
      }

      if (!response.ok) {
        throw new Error(data.error || "Admin request failed.");
      }

      return data;
    },
    [navigate]
  );

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [summary, userData, docData, logData, healthData, meData, emailCfg, activeAnnounce] = await Promise.all([
        adminFetch("/overview").catch(() => null),
        adminFetch("/users?limit=100").catch(() => ({ users: [] })),
        adminFetch("/documents?limit=100").catch(() => ({ documents: [] })),
        adminFetch("/audit-logs?limit=50").catch(() => ({ logs: [] })),
        adminFetch("/system-status").catch(() => null),
        adminFetch("/me").catch(() => null),
        adminFetch("/email/status").catch(() => ({ configured: false })),
        adminFetch("/announcement").catch(() => ({ active: false, message: "", type: "info" })),
      ]);

      if (summary) setOverview(summary);
      if (userData?.users) setUsers(userData.users);
      if (docData?.documents) setDocuments(docData.documents);
      if (logData?.logs) setLogs(logData.logs);
      if (healthData) setSystemStatus(healthData);
      if (emailCfg) setEmailStatus(emailCfg);
      if (activeAnnounce) {
        const ann = activeAnnounce.announcement || activeAnnounce;
        setAnnouncement({
          active: Boolean(ann.active),
          message: typeof ann.message === "string" ? ann.message : "",
          type: typeof ann.type === "string" ? ann.type : "info",
        });
      }
      if (meData?.user) {
        setCurrentAdmin(meData.user);
        if (typeof onAdminLoaded === "function") {
          onAdminLoaded(meData.user);
        }
      }
    } catch (err) {
      showBanner("error", err.message);
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // -------------------------------------------------------------------------
  // USER ACTIONS
  // -------------------------------------------------------------------------

  const handleToggleStatus = (user) => {
    const nextStatus = user.status === "active" ? "suspended" : "active";
    const actionLabel = nextStatus === "suspended" ? "Suspend Account" : "Activate Account";

    setConfirmDialog({
      title: `${actionLabel}?`,
      message: `Are you sure you want to ${nextStatus === "suspended" ? "suspend" : "reactivate"} user ${user.email}? ${
        nextStatus === "suspended"
          ? "The user will be immediately blocked from signing in and accessing vault files."
          : "The user will regain full access to their account."
      }`,
      danger: nextStatus === "suspended",
      onConfirm: async () => {
        try {
          const res = await adminFetch(`/users/${user.id}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status: nextStatus }),
          });
          showBanner("success", res.message || `Account for ${user.email} updated.`);
          await loadAll();
        } catch (err) {
          showBanner("error", err.message);
        }
      },
    });
  };

  const handleToggleRole = (user) => {
    const nextRole = user.role === "admin" ? "user" : "admin";
    const actionLabel = nextRole === "admin" ? "Promote to Admin" : "Demote to Standard User";

    setConfirmDialog({
      title: `${actionLabel}?`,
      message: `Are you sure you want to grant ${nextRole === "admin" ? "full administrator access" : "standard user permissions"} to ${user.email}?`,
      danger: nextRole === "admin",
      onConfirm: async () => {
        try {
          const res = await adminFetch(`/users/${user.id}/role`, {
            method: "PATCH",
            body: JSON.stringify({ role: nextRole }),
          });
          showBanner("success", res.message || `Role updated for ${user.email}.`);
          await loadAll();
        } catch (err) {
          showBanner("error", err.message);
        }
      },
    });
  };

  const handleVerifyEmail = async (user) => {
    try {
      const res = await adminFetch(`/users/${user.id}/verify`, { method: "PATCH" });
      showBanner("success", res.message || `Email verified for ${user.email}.`);
      await loadAll();
    } catch (err) {
      showBanner("error", err.message);
    }
  };

  const handleResetPassword = (user) => {
    setConfirmDialog({
      title: `Reset Password for ${user.email}?`,
      message: "This will generate a new secure temporary password for this user immediately.",
      danger: false,
      onConfirm: async () => {
        try {
          const res = await adminFetch(`/users/${user.id}/reset-password`, {
            method: "POST",
            body: JSON.stringify({}),
          });
          setResetPasswordModal({
            user,
            tempPassword: res.tempPassword,
            copied: false,
          });
          showBanner("success", `Password reset successfully for ${user.email}.`);
          await loadAll();
        } catch (err) {
          showBanner("error", err.message);
        }
      },
    });
  };

  const handleDeleteUser = (user) => {
    setConfirmDialog({
      title: `Delete Account: ${user.email}?`,
      message:
        "CRITICAL ACTION: This permanently removes this user account, cleans up their stored documents, and invalidates all active sharing links. This action cannot be undone.",
      danger: true,
      onConfirm: async () => {
        try {
          const res = await adminFetch(`/users/${user.id}`, { method: "DELETE" });
          showBanner("success", res.message || `User ${user.email} removed.`);
          await loadAll();
        } catch (err) {
          showBanner("error", err.message);
        }
      },
    });
  };

  // -------------------------------------------------------------------------
  // EMAIL BROADCAST & TARGETED COMMUNICATION ACTIONS
  // -------------------------------------------------------------------------

  const handleComposeToUser = (user) => {
    setEmailRecipientType("selected");
    setEmailSelectedUserId(String(user.id));
    setEmailCategory("announcement");
    setEmailSubject(`Notice regarding your DocQevrilo account (${user.email})`);
    setEmailMessage(
      `Hello,\n\nWe are contacting you regarding your DocQevrilo account (${user.email}).\n\n\n\nBest regards,\nDocQevrilo Security & Operations Team`
    );
    setTab("email");
  };

  const applyEmailTemplate = (preset) => {
    if (preset === "maintenance") {
      setEmailCategory("maintenance");
      setEmailSubject("Scheduled System Maintenance Notice - DocQevrilo");
      setEmailMessage(
        "Hello,\n\nPlease be advised that DocQevrilo will be undergoing routine infrastructure maintenance to optimize encryption speed, storage caching, and database performance.\n\nMaintenance Details:\n- Expected Duration: 15-30 minutes\n- Impact: Temporary pause for new uploads. Existing encrypted retrieval links remain fully accessible.\n\nThank you for choosing DocQevrilo.\n\nDocQevrilo Infrastructure Operations"
      );
    } else if (preset === "security") {
      setEmailCategory("security");
      setEmailSubject("Important Security Advisory: Best Practices for Account Safety");
      setEmailMessage(
        "Hello,\n\nAt DocQevrilo, security and cryptographic privacy are our top priorities. Here is a brief reminder of our safety protocols:\n\n1. Never share your 6-digit document unlock codes in public channels.\n2. DocQevrilo engineers will never request your private password or encryption keys.\n3. If you ever suspect suspicious activity, reset your account credentials immediately.\n\nStay secure,\nDocQevrilo Cryptographic Security Team"
      );
    } else if (preset === "announcement") {
      setEmailCategory("announcement");
      setEmailSubject("New Platform Features Now Available on DocQevrilo");
      setEmailMessage(
        "Hello,\n\nWe are excited to share new features and performance enhancements across DocQevrilo:\n\nWhat's New:\n- Streamlined mobile interface optimized for all smartphones and tablets\n- Faster zero-knowledge encryption pipelines\n- Real-time link tracking and instant download fulfillment analytics\n\nLog in today to explore your updated vault.\n\nBest regards,\nThe DocQevrilo Team"
      );
    } else if (preset === "urgent") {
      setEmailCategory("urgent");
      setEmailSubject("URGENT: Required Account Action - DocQevrilo");
      setEmailMessage(
        "Attention,\n\nOur system detected an urgent security or account status update requiring your prompt review. Please sign in to your dashboard at your earliest convenience to verify your configuration.\n\nIf you have any questions or require administrative assistance, please contact support.\n\nDocQevrilo Administration"
      );
    }
  };

  const handleSendTestEmail = async () => {
    if (!emailSubject.trim() || !emailMessage.trim()) {
      showBanner("error", "Please enter a subject and message before sending a test.");
      return;
    }
    setIsSendingTestEmail(true);
    try {
      const res = await adminFetch("/email/test", {
        method: "POST",
        body: JSON.stringify({
          subject: emailSubject,
          message: emailMessage,
          category: emailCategory,
        }),
      });
      showBanner("success", res.message || "Test email sent to your admin inbox.");
    } catch (err) {
      showBanner("error", err.message);
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  const handleSendEmail = async (e) => {
    if (e) e.preventDefault();
    if (!emailSubject.trim() || !emailMessage.trim()) {
      showBanner("error", "Subject and message are required.");
      return;
    }
    if (emailRecipientType === "selected" && !emailSelectedUserId) {
      showBanner("error", "Please select a specific recipient user.");
      return;
    }

    const recipientLabel =
      emailRecipientType === "all"
        ? `all registered users (${users.length})`
        : emailRecipientType === "active"
        ? `active users (${users.filter((u) => u.status === "active").length})`
        : emailRecipientType === "suspended"
        ? `suspended users (${users.filter((u) => u.status === "suspended").length})`
        : `user #${emailSelectedUserId}`;

    setConfirmDialog({
      title: `Send Broadcast Email?`,
      message: `You are about to dispatch this ${emailCategory.toUpperCase()} email to ${recipientLabel}. Are you sure you want to proceed?`,
      danger: emailCategory === "urgent",
      onConfirm: async () => {
        setIsSendingEmail(true);
        try {
          const res = await adminFetch("/email/send", {
            method: "POST",
            body: JSON.stringify({
              recipientType: emailRecipientType,
              selectedUserId: emailSelectedUserId,
              userIds: emailSelectedUserId ? [emailSelectedUserId] : [],
              subject: emailSubject,
              message: emailMessage,
              category: emailCategory,
            }),
          });
          setEmailResult(res);
          showBanner("success", res.message || `Dispatched to ${res.count || 0} user(s).`);
          await loadAll();
        } catch (err) {
          showBanner("error", err.message);
        } finally {
          setIsSendingEmail(false);
        }
      },
    });
  };

  const handleGenerateWithGrok = async () => {
    if (!grokPrompt.trim()) {
      showBanner("error", "Please write a short prompt or brief for Grok AI first.");
      return;
    }

    setIsGeneratingWithGrok(true);
    try {
      const res = await adminFetch("/email/generate-ai", {
        method: "POST",
        body: JSON.stringify({
          prompt: grokPrompt.trim(),
          tone: grokTone,
          targetAudience:
            emailRecipientType === "all"
              ? "All registered users"
              : emailRecipientType === "active"
              ? "Active users"
              : emailRecipientType === "suspended"
              ? "Suspended users"
              : "Specific user",
        }),
      });

      if (res?.subject) setEmailSubject(res.subject);
      if (res?.message) setEmailMessage(res.message);
      if (res?.category) setEmailCategory(res.category);

      showBanner(
        "success",
        `✨ Grok AI drafted your email! Subject & message populated with ${res.category.toUpperCase()} styling.`
      );
    } catch (err) {
      showBanner("error", err.message || "Failed to generate email with Grok AI.");
    } finally {
      setIsGeneratingWithGrok(false);
    }
  };

  // -------------------------------------------------------------------------
  // ANNOUNCEMENT BANNER & SYSTEM DIAGNOSTICS ACTIONS
  // -------------------------------------------------------------------------

  const handleSaveAnnouncement = async () => {
    setIsSavingAnnouncement(true);
    try {
      const res = await adminFetch("/announcement", {
        method: "POST",
        body: JSON.stringify({
          active: Boolean(announcement.active),
          message: String(announcement.message || "").trim(),
          type: announcement.type || "info",
        }),
      });
      if (res?.announcement) {
        setAnnouncement({
          active: Boolean(res.announcement.active),
          message: res.announcement.message || "",
          type: res.announcement.type || "info",
        });
      }
      showBanner("success", res.message || "Announcement banner updated.");
    } catch (err) {
      showBanner("error", err.message);
    } finally {
      setIsSavingAnnouncement(false);
    }
  };

  const handleRunPing = async () => {
    setIsPinging(true);
    try {
      const res = await adminFetch("/diagnostics/ping");
      setPingResult(res);
      showBanner("success", "Diagnostics ping test completed.");
    } catch (err) {
      showBanner("error", err.message);
    } finally {
      setIsPinging(false);
    }
  };

  const handleExportLogs = async (format = "csv") => {
    try {
      const token =
        sessionStorage.getItem("sv_admin_token") ||
        sessionStorage.getItem("sv_token") ||
        localStorage.getItem("sv_token");
      const res = await fetch(`${API_BASE_URL}/admin/audit-logs/export?format=${format}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to export audit logs");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `docqevrilo-audit-logs-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showBanner("success", `Audit logs exported as ${format.toUpperCase()}`);
    } catch (err) {
      showBanner("error", err.message);
    }
  };

  // -------------------------------------------------------------------------
  // DOCUMENT ACTIONS
  // -------------------------------------------------------------------------

  const handleDeleteDocument = (doc) => {
    setConfirmDialog({
      title: `Delete Vault Document: "${doc.original_name}"?`,
      message:
        "This will permanently delete this document from the database and remove the physical file from cloud object storage. All shared access links will immediately stop working.",
      danger: true,
      onConfirm: async () => {
        try {
          const res = await adminFetch(`/documents/${doc.id}`, { method: "DELETE" });
          showBanner("success", res.message || `Document "${doc.original_name}" deleted.`);
          if (selectedDoc?.id === doc.id) setSelectedDoc(null);
          await loadAll();
        } catch (err) {
          showBanner("error", err.message);
        }
      },
    });
  };

  const handlePurgeExpired = async () => {
    setPurging(true);
    try {
      const res = await adminFetch("/documents/purge-expired", { method: "POST" });
      showBanner(
        "success",
        res.message || `Purge completed: ${res.purgedCount || 0} expired files cleaned.`
      );
      await loadAll();
    } catch (err) {
      showBanner("error", err.message);
    } finally {
      setPurging(false);
    }
  };

  // -------------------------------------------------------------------------
  // AUDIT LOG ACTIONS
  // -------------------------------------------------------------------------

  const handleClearAuditLogs = () => {
    setConfirmDialog({
      title: "Clear All Audit Logs?",
      message: "Are you sure you want to clear the security audit log history?",
      danger: true,
      onConfirm: async () => {
        try {
          const res = await adminFetch("/audit-logs", { method: "DELETE" });
          showBanner("success", res.message || "Audit logs cleared.");
          await loadAll();
        } catch (err) {
          showBanner("error", err.message);
        }
      },
    });
  };

  const handleLogout = () => {
    sessionStorage.removeItem("sv_admin_token");
    sessionStorage.removeItem("sv_token");
    localStorage.removeItem("sv_token");
    navigate("/login", { replace: true });
  };

  // Filtered Collections
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      `${u.full_name || ""} ${u.email || ""}`.toLowerCase().includes(userSearch.toLowerCase());
    const matchesStatus = userStatusFilter === "all" || u.status === userStatusFilter;
    const matchesRole = userRoleFilter === "all" || u.role === userRoleFilter;
    return matchesSearch && matchesStatus && matchesRole;
  });

  const filteredDocs = documents.filter((d) => {
    const matchesSearch =
      `${d.original_name || ""} ${d.owner_email || ""}`.toLowerCase().includes(docSearch.toLowerCase());
    const matchesMode = docModeFilter === "all" || d.storage_mode === docModeFilter;
    return matchesSearch && matchesMode;
  });

  const filteredLogs = logs.filter((l) => {
    return (
      `${l.action || ""} ${l.admin_email || ""} ${l.ip_address || ""}`
        .toLowerCase()
        .includes(logSearch.toLowerCase())
    );
  });

  return (
    <main className="admin-shell" data-tab={tab}>
      {/* ---------------- SIDEBAR NAVIGATION ---------------- */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header-row">
          <div className="admin-sidebar-brand">
            <span>
              <ShieldCheck size={22} />
            </span>
            <div>
              <b>DocQevrilo</b>
              <small>CONTROL CENTER</small>
            </div>
          </div>

          <div className="admin-sidebar-mobile-user">
            <div className="admin-session-info">
              <span className="admin-status-dot" />
              <span className="admin-session-text">Admin</span>
            </div>
            <button onClick={handleLogout} className="admin-signout-btn" title="Sign out of admin session">
              <LogOut size={15} />
              <span>Sign out</span>
            </button>
          </div>
        </div>

        <div className="admin-side-label">WORKSPACE</div>

        <nav className="admin-nav-tabs">
          <button
            className={`admin-nav-item ${tab === "overview" ? "selected active" : ""}`}
            onClick={() => setTab("overview")}
          >
            <Activity size={17} /> <span>Overview</span>
          </button>

          <button
            className={`admin-nav-item ${tab === "users" ? "selected active" : ""}`}
            onClick={() => setTab("users")}
          >
            <Users size={17} /> <span>Users</span> <span className="admin-nav-count">({users.length})</span>
          </button>

          <button
            className={`admin-nav-item ${tab === "documents" ? "selected active" : ""}`}
            onClick={() => setTab("documents")}
          >
            <Files size={17} /> <span>Documents</span> <span className="admin-nav-count">({documents.length})</span>
          </button>

          <button
            className={`admin-nav-item ${tab === "logs" ? "selected active" : ""}`}
            onClick={() => setTab("logs")}
          >
            <ShieldCheck size={17} /> <span>Audit Logs</span> <span className="admin-nav-count">({logs.length})</span>
          </button>

          <button
            className={`admin-nav-item ${tab === "health" ? "selected active" : ""}`}
            onClick={() => setTab("health")}
          >
            <Server size={17} /> <span>System Health</span>
          </button>

          <button
            className={`admin-nav-item ${tab === "email" ? "selected active" : ""}`}
            onClick={() => setTab("email")}
          >
            <Mail size={17} /> <span>Email Broadcast</span>
          </button>
        </nav>

        <div className="admin-sidebar-bottom">
          <div className="admin-session-info">
            <span className="admin-status-dot" />
            <span>Admin Active</span>
          </div>
          <button onClick={handleLogout} className="admin-signout-btn">
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>

      {/* ---------------- MAIN VIEWPORT ---------------- */}
      <section className="admin-main">
        {/* Topbar Header */}
        <header className="admin-topbar">
          <div className="admin-topbar-title-wrap">
            <span className="admin-eyebrow">ADMINISTRATION CONTROL PANEL</span>
            <h1>
              {tab === "overview" && "Dashboard Overview"}
              {tab === "users" && "User Directory & Access Control"}
              {tab === "documents" && "Document Vault Monitoring"}
              {tab === "logs" && "Security Audit Trail"}
              {tab === "health" && "System Infrastructure & Diagnostics"}
              {tab === "email" && "Email Broadcast & User Communication"}
            </h1>
          </div>
          <div className="admin-topbar-actions">
            <button
              className="admin-purge-top-btn"
              onClick={handlePurgeExpired}
              disabled={purging}
              title="Clean expired files immediately"
            >
              <Clock3 size={15} className={purging ? "admin-spin-icon" : ""} />
              <span>{purging ? "Purging..." : "Purge Expired"}</span>
            </button>
            <button className="admin-refresh" onClick={loadAll} disabled={loading}>
              <RefreshCw size={15} className={loading ? "admin-spin-icon" : ""} />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        {/* Global Feedback Banner */}
        {banner && (
          <div
            className={`admin-alert-banner ${banner.type === "error" ? "error" : "success"}`}
            role="alert"
          >
            <div className="admin-alert-content">
              {banner.type === "error" ? <AlertCircle size={17} /> : <CheckCircle2 size={17} />}
              <span>{banner.message}</span>
            </div>
            <button
              className="admin-alert-close"
              onClick={() => setBanner(null)}
              aria-label="Dismiss alert"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* KPI Stat Cards (Always Visible) */}
        <div className="admin-stat-grid">
          <article
            className={`admin-stat-card ${tab === "users" ? "stat-active" : ""}`}
            onClick={() => setTab("users")}
          >
            <span>
              <Users size={18} />
            </span>
            <small>Total Users</small>
            <strong>{overview?.users?.total ?? users.length}</strong>
            <em>
              {overview?.users?.active ?? users.filter((u) => u.status === "active").length} active ·{" "}
              {overview?.users?.suspended ?? users.filter((u) => u.status === "suspended").length} suspended
            </em>
          </article>

          <article
            className={`admin-stat-card ${tab === "documents" ? "stat-active" : ""}`}
            onClick={() => setTab("documents")}
          >
            <span>
              <Files size={18} />
            </span>
            <small>Vault Documents</small>
            <strong>{overview?.documents?.total ?? documents.length}</strong>
            <em>Total files stored in vault</em>
          </article>

          <article className="admin-stat-card">
            <span>
              <HardDrive size={18} />
            </span>
            <small>Storage Tracked</small>
            <strong>{formatBytes(overview?.documents?.storageBytes)}</strong>
            <em>
              {overview?.documents?.totalDownloads ?? 0} downloads · {overview?.documents?.totalViews ?? 0} views
            </em>
          </article>

          <article
            className={`admin-stat-card ${tab === "health" ? "stat-active" : ""}`}
            onClick={() => setTab("health")}
          >
            <span>
              <Activity size={18} />
            </span>
            <small>Engine Status</small>
            <strong style={{ fontSize: "16px", textTransform: "uppercase" }}>
              {overview?.system?.databaseMode === "tidb_cloud" ? "TiDB Cloud" : "Local Dev"}
            </strong>
            <em>
              Storage: {overview?.system?.isB2Configured ? "Backblaze B2" : "Local Files"}
            </em>
          </article>
        </div>

        {/* ---------------- TAB 1: OVERVIEW ---------------- */}
        {tab === "overview" && (
          <div className="admin-overview-grid">
            {/* Quick Actions Panel */}
            <section className="admin-card-section">
              <div className="admin-card-header">
                <h2>Administrative Quick Actions</h2>
                <p>Run immediate administrative operations across the cluster.</p>
              </div>
              <div className="admin-actions-bar">
                <button
                  className="admin-quick-action-btn purge"
                  onClick={handlePurgeExpired}
                  disabled={purging}
                >
                  <Clock3 size={18} />
                  <div>
                    <b>Purge Expired Documents</b>
                    <small>Remove all temporary files past their expiration date</small>
                  </div>
                </button>

                <button className="admin-quick-action-btn" onClick={() => setTab("users")}>
                  <Users size={18} />
                  <div>
                    <b>Manage User Directory</b>
                    <small>Suspend, activate, or reset credentials for {users.length} accounts</small>
                  </div>
                </button>

                <button className="admin-quick-action-btn" onClick={() => setTab("documents")}>
                  <Files size={18} />
                  <div>
                    <b>Audit Vault Files</b>
                    <small>Inspect document metadata and manage individual uploads</small>
                  </div>
                </button>

                <button className="admin-quick-action-btn" onClick={() => setTab("logs")}>
                  <ShieldCheck size={18} />
                  <div>
                    <b>Review Security Logs</b>
                    <small>Inspect the recorded administrator actions</small>
                  </div>
                </button>
              </div>
            </section>

            {/* System Status Summary */}
            <section className="admin-card-section">
              <div className="admin-card-header">
                <h2>Service Architecture & Health</h2>
                <p>Current backend service configuration.</p>
              </div>
              <div className="admin-service-list">
                <div className="admin-service-row">
                  <div className="admin-service-title">
                    <Database size={16} />
                    <span>Database Engine</span>
                  </div>
                  <span className={`admin-health-badge ${overview?.system?.isTiDBConnected ? "online" : "fallback"}`}>
                    {overview?.system?.isTiDBConnected ? "TiDB Cloud (Production)" : "Local JSON Fallback"}
                  </span>
                </div>

                <div className="admin-service-row">
                  <div className="admin-service-title">
                    <Cloud size={16} />
                    <span>Object Storage</span>
                  </div>
                  <span className={`admin-health-badge ${overview?.system?.isB2Configured ? "online" : "fallback"}`}>
                    {overview?.system?.isB2Configured ? "Backblaze B2 S3 API" : "Local Disk Storage"}
                  </span>
                </div>

                <div className="admin-service-row">
                  <div className="admin-service-title">
                    <Shield size={16} />
                    <span>Active Administrator</span>
                  </div>
                  <span className="admin-val-code">{currentAdmin?.email || "Admin Session"}</span>
                </div>

                <div className="admin-service-row">
                  <div className="admin-service-title">
                    <Server size={16} />
                    <span>Server Uptime</span>
                  </div>
                  <span className="admin-val-code">{overview?.system?.serverUptime ?? 0} seconds</span>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ---------------- TAB 2: USER MANAGEMENT ---------------- */}
        {tab === "users" && (
          <section className="admin-panel">
            <div className="admin-panel-head">
              <div>
                <h2>User Management ({filteredUsers.length})</h2>
                <p>Manage accounts, role assignments, verification state, and credentials.</p>
              </div>

              <div className="admin-filters-wrap">
                {/* Search Box */}
                <div className="admin-search">
                  <Search size={15} />
                  <input
                    value={userSearch || ""}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search by name or email..."
                  />
                  {userSearch && (
                    <button className="admin-search-clear" onClick={() => setUserSearch("")}>
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Status Filter */}
                <select
                  className="admin-select"
                  value={userStatusFilter}
                  onChange={(e) => setUserStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Accounts</option>
                  <option value="suspended">Suspended Accounts</option>
                </select>

                {/* Role Filter */}
                <select
                  className="admin-select"
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                >
                  <option value="all">All Roles</option>
                  <option value="user">Users</option>
                  <option value="admin">Administrators</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="admin-loading">
                <span /> Loading user data...
              </div>
            ) : (
              <>
                {/* Desktop View Table */}
                <div className="admin-table-wrap admin-desktop-table">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>User Account</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Verification</th>
                        <th>Joined</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => {
                        const isSelf = Boolean(
                          currentAdmin &&
                            (Number(user.id) === Number(currentAdmin.id) ||
                              user.email.toLowerCase() === currentAdmin.email.toLowerCase())
                        );
                        return (
                          <tr key={user.id}>
                            <td>
                              <div className="admin-user-cell">
                                <span>{(user.full_name || user.email || "U").slice(0, 1).toUpperCase()}</span>
                                <div>
                                  <b>{user.full_name || "Unnamed Account"}</b>
                                  <small>{user.email}</small>
                                </div>
                              </div>
                            </td>

                            <td>
                              <span className={`admin-role-badge ${user.role}`}>
                                {user.role === "admin" ? <Shield size={11} /> : <Users size={11} />}
                                {user.role}
                              </span>
                            </td>

                            <td>
                              <span className={`admin-state ${user.status}`}>{user.status}</span>
                            </td>

                            <td>
                              {user.email_verified ? (
                                <span className="admin-verified-badge">
                                  <Check size={12} /> Verified
                                </span>
                              ) : (
                                <button
                                  className="admin-verify-btn"
                                  onClick={() => handleVerifyEmail(user)}
                                  title="Click to manually verify this user"
                                >
                                  <UserCheck size={12} /> Mark Verified
                                </button>
                              )}
                            </td>

                            <td>{new Date(user.created_at).toLocaleDateString()}</td>

                            <td>
                              <div className="admin-action-btn-group">
                                {/* Suspend / Activate */}
                                {!isSelf && (
                                  <button
                                    className={`admin-action-btn ${user.status === "active" ? "suspend" : "activate"}`}
                                    onClick={() => handleToggleStatus(user)}
                                    title={user.status === "active" ? "Suspend user" : "Activate user"}
                                  >
                                    {user.status === "active" ? <Ban size={13} /> : <CheckCircle2 size={13} />}
                                    <span>{user.status === "active" ? "Suspend" : "Activate"}</span>
                                  </button>
                                )}

                                {/* Toggle Role */}
                                {!isSelf && (
                                  <button
                                    className="admin-action-btn role"
                                    onClick={() => handleToggleRole(user)}
                                    title={user.role === "admin" ? "Demote to User" : "Make Admin"}
                                  >
                                    <Shield size={13} />
                                    <span>{user.role === "admin" ? "Demote" : "Make Admin"}</span>
                                  </button>
                                )}

                                {/* Email User */}
                                <button
                                  className="admin-action-btn email"
                                  onClick={() => handleComposeToUser(user)}
                                  title="Send targeted email to this user"
                                >
                                  <Mail size={13} />
                                  <span>Email</span>
                                </button>

                                {/* Reset Password */}
                                <button
                                  className="admin-action-btn reset"
                                  onClick={() => handleResetPassword(user)}
                                  title="Reset user password"
                                >
                                  <KeyRound size={13} />
                                  <span>Reset PW</span>
                                </button>

                                {/* Delete Account */}
                                {!isSelf && (
                                  <button
                                    className="admin-action-btn delete"
                                    onClick={() => handleDeleteUser(user)}
                                    title="Permanently delete user"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {!filteredUsers.length && (
                        <tr>
                          <td colSpan="6" className="admin-empty">
                            No users found matching current filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View Cards */}
                <div className="admin-mobile-card-list">
                  {filteredUsers.map((user) => {
                    const isSelf = Boolean(
                      currentAdmin &&
                        (Number(user.id) === Number(currentAdmin.id) ||
                          user.email.toLowerCase() === currentAdmin.email.toLowerCase())
                    );
                    return (
                      <div className="admin-m-card" key={`mobile-user-${user.id}`}>
                        <div className="admin-m-card-top">
                          <div className="admin-user-cell">
                            <span>{(user.full_name || user.email || "U").slice(0, 1).toUpperCase()}</span>
                            <div>
                              <b>{user.full_name || "Unnamed Account"}</b>
                              <small>{user.email}</small>
                            </div>
                          </div>
                          <span className={`admin-state ${user.status}`}>{user.status}</span>
                        </div>

                        <div className="admin-m-meta-grid">
                          <div className="admin-m-meta-item">
                            <span className="admin-m-label">Role</span>
                            <span className={`admin-role-badge ${user.role}`}>
                              {user.role === "admin" ? <Shield size={11} /> : <Users size={11} />}
                              {user.role}
                            </span>
                          </div>

                          <div className="admin-m-meta-item">
                            <span className="admin-m-label">Verification</span>
                            {user.email_verified ? (
                              <span className="admin-verified-badge">
                                <Check size={12} /> Verified
                              </span>
                            ) : (
                              <button
                                className="admin-verify-btn"
                                onClick={() => handleVerifyEmail(user)}
                                title="Click to manually verify this user"
                              >
                                <UserCheck size={12} /> Mark Verified
                              </button>
                            )}
                          </div>

                          <div className="admin-m-meta-item full-width">
                            <span className="admin-m-label">Joined</span>
                            <span className="admin-m-val">{new Date(user.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="admin-m-actions">
                          {!isSelf && (
                            <button
                              className={`admin-action-btn ${user.status === "active" ? "suspend" : "activate"}`}
                              onClick={() => handleToggleStatus(user)}
                            >
                              {user.status === "active" ? <Ban size={13} /> : <CheckCircle2 size={13} />}
                              <span>{user.status === "active" ? "Suspend" : "Activate"}</span>
                            </button>
                          )}

                          {!isSelf && (
                            <button
                              className="admin-action-btn role"
                              onClick={() => handleToggleRole(user)}
                            >
                              <Shield size={13} />
                              <span>{user.role === "admin" ? "Demote" : "Make Admin"}</span>
                            </button>
                          )}

                          <button
                            className="admin-action-btn email"
                            onClick={() => handleComposeToUser(user)}
                            title="Email user"
                          >
                            <Mail size={13} />
                            <span>Email</span>
                          </button>

                          <button
                            className="admin-action-btn reset"
                            onClick={() => handleResetPassword(user)}
                          >
                            <KeyRound size={13} />
                            <span>Reset PW</span>
                          </button>

                          {!isSelf && (
                            <button
                              className="admin-action-btn delete"
                              onClick={() => handleDeleteUser(user)}
                              title="Delete user"
                            >
                              <Trash2 size={13} />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {!filteredUsers.length && (
                    <div className="admin-empty">No users found matching current filters.</div>
                  )}
                </div>
              </>
            )}
          </section>
        )}

        {/* ---------------- TAB 3: DOCUMENTS ---------------- */}
        {tab === "documents" && (
          <section className="admin-panel">
            <div className="admin-panel-head">
              <div>
                <h2>Document Vault Monitoring ({filteredDocs.length})</h2>
                <p>Monitor storage mode, download reservations, expiration dates, and enforce deletions.</p>
              </div>

              <div className="admin-filters-wrap">
                {/* Search Box */}
                <div className="admin-search">
                  <Search size={15} />
                  <input
                    value={docSearch || ""}
                    onChange={(e) => setDocSearch(e.target.value)}
                    placeholder="Search filename or owner..."
                  />
                  {docSearch && (
                    <button className="admin-search-clear" onClick={() => setDocSearch("")}>
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Storage Mode Filter */}
                <select
                  className="admin-select"
                  value={docModeFilter}
                  onChange={(e) => setDocModeFilter(e.target.value)}
                >
                  <option value="all">All Storage Modes</option>
                  <option value="online">Online Cloud Storage</option>
                  <option value="temporary">Temporary Ephemeral</option>
                </select>

                <button
                  className="admin-purge-btn"
                  onClick={handlePurgeExpired}
                  disabled={purging}
                >
                  <Clock3 size={14} className={purging ? "admin-spin-icon" : ""} />
                  {purging ? "Purging..." : "Purge Expired Now"}
                </button>
              </div>
            </div>

            {loading ? (
              <div className="admin-loading">
                <span /> Loading document records...
              </div>
            ) : (
              <>
                {/* Desktop View Table */}
                <div className="admin-table-wrap admin-desktop-table">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Document</th>
                        <th>Owner</th>
                        <th>Storage Mode</th>
                        <th>Size</th>
                        <th>Views / Downloads</th>
                        <th>Expires</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDocs.map((doc) => (
                        <tr key={doc.id}>
                          <td>
                            <b>{doc.original_name}</b>
                            <small className="admin-doc-type">{doc.mime_type || "File"}</small>
                          </td>

                          <td>{doc.owner_email || "Anonymous / Legacy"}</td>

                          <td>
                            <span className={`admin-mode-pill ${doc.storage_mode || "online"}`}>
                              {doc.storage_mode === "temporary" ? "Temporary" : "Online"}
                            </span>
                          </td>

                          <td>{formatBytes(Number(doc.file_size || 0))}</td>

                          <td>
                            <span className="admin-metrics-pill">
                              {doc.view_count || 0} views · {doc.download_count || 0}
                              {doc.max_downloads ? `/${doc.max_downloads}` : ""} DL
                            </span>
                          </td>

                          <td>
                            {doc.expires_at ? (
                              <span className="admin-expiry-text">
                                {new Date(doc.expires_at).toLocaleString()}
                              </span>
                            ) : (
                              <span className="admin-no-expiry">Never</span>
                            )}
                          </td>

                          <td>
                            <div className="admin-action-btn-group">
                              <button
                                className="admin-action-btn inspect"
                                onClick={() => setSelectedDoc(doc)}
                                title="Inspect document metadata"
                              >
                                <Eye size={13} />
                                <span>Details</span>
                              </button>

                              <button
                                className="admin-action-btn delete"
                                onClick={() => handleDeleteDocument(doc)}
                                title="Force delete document"
                              >
                                <Trash2 size={13} />
                                <span>Delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {!filteredDocs.length && (
                        <tr>
                          <td colSpan="7" className="admin-empty">
                            No documents found matching current filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View Cards */}
                <div className="admin-mobile-card-list">
                  {filteredDocs.map((doc) => (
                    <div className="admin-m-card" key={`mobile-doc-${doc.id}`}>
                      <div className="admin-m-card-top">
                        <div className="admin-m-doc-title">
                          <b>{doc.original_name}</b>
                          <small className="admin-doc-type">{doc.mime_type || "File"}</small>
                        </div>
                        <span className={`admin-mode-pill ${doc.storage_mode || "online"}`}>
                          {doc.storage_mode === "temporary" ? "Temporary" : "Online"}
                        </span>
                      </div>

                      <div className="admin-m-meta-grid">
                        <div className="admin-m-meta-item full-width">
                          <span className="admin-m-label">Owner</span>
                          <span className="admin-m-val">{doc.owner_email || "Anonymous / Legacy"}</span>
                        </div>
                        <div className="admin-m-meta-item">
                          <span className="admin-m-label">Size</span>
                          <span className="admin-m-val">{formatBytes(Number(doc.file_size || 0))}</span>
                        </div>
                        <div className="admin-m-meta-item">
                          <span className="admin-m-label">Activity</span>
                          <span className="admin-metrics-pill">
                            {doc.view_count || 0} views · {doc.download_count || 0}
                            {doc.max_downloads ? `/${doc.max_downloads}` : ""} DL
                          </span>
                        </div>
                        <div className="admin-m-meta-item full-width">
                          <span className="admin-m-label">Expires</span>
                          {doc.expires_at ? (
                            <span className="admin-expiry-text">
                              {new Date(doc.expires_at).toLocaleString()}
                            </span>
                          ) : (
                            <span className="admin-no-expiry">Never</span>
                          )}
                        </div>
                      </div>

                      <div className="admin-m-actions">
                        <button
                          className="admin-action-btn inspect"
                          onClick={() => setSelectedDoc(doc)}
                        >
                          <Eye size={13} />
                          <span>Details</span>
                        </button>

                        <button
                          className="admin-action-btn delete"
                          onClick={() => handleDeleteDocument(doc)}
                        >
                          <Trash2 size={13} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}

                  {!filteredDocs.length && (
                    <div className="admin-empty">No documents found matching current filter.</div>
                  )}
                </div>
              </>
            )}
          </section>
        )}

        {/* ---------------- TAB 4: AUDIT LOGS ---------------- */}
        {tab === "logs" && (
          <section className="admin-panel">
            <div className="admin-panel-head">
              <div>
                <h2>Security Audit Trail ({filteredLogs.length})</h2>
                <p>Immutable record of all administrator interventions and security changes.</p>
              </div>

              <div className="admin-filters-wrap">
                <div className="admin-search">
                  <Search size={15} />
                  <input
                    value={logSearch || ""}
                    onChange={(e) => setLogSearch(e.target.value)}
                    placeholder="Search actions or IP..."
                  />
                  {logSearch && (
                    <button className="admin-search-clear" onClick={() => setLogSearch("")}>
                      <X size={13} />
                    </button>
                  )}
                </div>

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    className="admin-secondary-btn"
                    onClick={() => handleExportLogs("csv")}
                    disabled={!logs.length}
                    title="Export all audit logs as CSV spreadsheet"
                  >
                    <FileSpreadsheet size={13} />
                    <span>Export CSV</span>
                  </button>

                  <button
                    className="admin-secondary-btn"
                    onClick={() => handleExportLogs("json")}
                    disabled={!logs.length}
                    title="Export all audit logs as JSON file"
                  >
                    <FileCode size={13} />
                    <span>Export JSON</span>
                  </button>

                  <button
                    className="admin-clear-logs-btn"
                    onClick={handleClearAuditLogs}
                    disabled={!logs.length}
                  >
                    <Trash2 size={14} /> Clear History
                  </button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="admin-loading">
                <span /> Loading audit records...
              </div>
            ) : (
              <>
                {/* Desktop View Table */}
                <div className="admin-table-wrap admin-desktop-table">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Action</th>
                        <th>Admin Actor</th>
                        <th>Target ID</th>
                        <th>IP Address</th>
                        <th>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.map((log) => (
                        <tr key={log.id}>
                          <td>
                            <span className="admin-audit-action">
                              <code>{log.action}</code>
                            </span>
                          </td>
                          <td>{log.admin_email}</td>
                          <td>{log.target_user_id || "—"}</td>
                          <td>
                            <span className="admin-ip-pill">{log.ip_address || "127.0.0.1"}</span>
                          </td>
                          <td>{new Date(log.created_at).toLocaleString()}</td>
                        </tr>
                      ))}

                      {!filteredLogs.length && (
                        <tr>
                          <td colSpan="5" className="admin-empty">
                            No audit events recorded yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View Cards */}
                <div className="admin-mobile-card-list">
                  {filteredLogs.map((log) => (
                    <div className="admin-m-card" key={`mobile-log-${log.id}`}>
                      <div className="admin-m-card-top">
                        <span className="admin-audit-action">
                          <code>{log.action}</code>
                        </span>
                        <span className="admin-m-time">{new Date(log.created_at).toLocaleString()}</span>
                      </div>

                      <div className="admin-m-meta-grid">
                        <div className="admin-m-meta-item full-width">
                          <span className="admin-m-label">Admin Actor</span>
                          <span className="admin-m-val">{log.admin_email}</span>
                        </div>
                        <div className="admin-m-meta-item">
                          <span className="admin-m-label">Target ID</span>
                          <span className="admin-m-val">{log.target_user_id || "—"}</span>
                        </div>
                        <div className="admin-m-meta-item">
                          <span className="admin-m-label">IP Address</span>
                          <span className="admin-ip-pill">{log.ip_address || "127.0.0.1"}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {!filteredLogs.length && (
                    <div className="admin-empty">No audit events recorded yet.</div>
                  )}
                </div>
              </>
            )}
          </section>
        )}

        {/* ---------------- TAB 5: SYSTEM HEALTH ---------------- */}
        {tab === "health" && (
          <section className="admin-panel">
            <div className="admin-panel-head">
              <div>
                <h2>Infrastructure & System Health</h2>
                <p>Live diagnostics for cloud database, Backblaze B2 storage, and runtime environment.</p>
              </div>
            </div>

            <div className="admin-health-grid">
              <article className="admin-health-card">
                <div className="admin-health-header">
                  <Database size={20} />
                  <h3>TiDB Cloud Database</h3>
                </div>
                <div className="admin-health-body">
                  <div className="admin-health-row">
                    <span>Status:</span>
                    <strong className={systemStatus?.database?.isTiDBConnected ? "text-green" : "text-amber"}>
                      {systemStatus?.database?.isTiDBConnected ? "Connected (Cloud)" : "Local JSON Fallback"}
                    </strong>
                  </div>
                  <div className="admin-health-row">
                    <span>Database Mode:</span>
                    <code>{systemStatus?.database?.dbMode || "local_dev"}</code>
                  </div>
                  <div className="admin-health-row">
                    <span>Target Database:</span>
                    <code>{systemStatus?.database?.database || "test"}</code>
                  </div>
                </div>
              </article>

              <article className="admin-health-card">
                <div className="admin-health-header">
                  <Cloud size={20} />
                  <h3>Backblaze B2 Storage</h3>
                </div>
                <div className="admin-health-body">
                  <div className="admin-health-row">
                    <span>Status:</span>
                    <strong className={systemStatus?.storage?.connected ? "text-green" : "text-amber"}>
                      {systemStatus?.storage?.connected ? "Connected & Verified" : "Local Storage Mode"}
                    </strong>
                  </div>
                  <div className="admin-health-row">
                    <span>Bucket:</span>
                    <code>{systemStatus?.storage?.bucket || "secure-vault-files"}</code>
                  </div>
                  <div className="admin-health-row">
                    <span>Region:</span>
                    <code>{systemStatus?.storage?.region || "us-east-005"}</code>
                  </div>
                </div>
              </article>

              <article className="admin-health-card">
                <div className="admin-health-header">
                  <Server size={20} />
                  <h3>Node.js Server Runtime</h3>
                </div>
                <div className="admin-health-body">
                  <div className="admin-health-row">
                    <span>Server Uptime:</span>
                    <strong>{systemStatus?.uptimeSeconds ?? 0}s</strong>
                  </div>
                  <div className="admin-health-row">
                    <span>Node Version:</span>
                    <code>{systemStatus?.nodeVersion || process.version}</code>
                  </div>
                  <div className="admin-health-row">
                    <span>Memory (RSS / Heap):</span>
                    <code>
                      {systemStatus?.memory?.rssMb ?? 0} MB / {systemStatus?.memory?.heapUsedMb ?? 0} MB
                    </code>
                  </div>
                </div>
              </article>

              <article className="admin-health-card">
                <div className="admin-health-header">
                  <Mail size={20} />
                  <h3>Brevo Transactional Email</h3>
                </div>
                <div className="admin-health-body">
                  <div className="admin-health-row">
                    <span>Status:</span>
                    <strong className={emailStatus?.configured ? "text-green" : "text-amber"}>
                      {emailStatus?.configured ? "Configured & Active" : "Missing API Key"}
                    </strong>
                  </div>
                  <div className="admin-health-row">
                    <span>Sender Address:</span>
                    <code>{emailStatus?.senderEmail || "noreply@docqevrilo.com"}</code>
                  </div>
                  <div className="admin-health-row">
                    <span>Delivery Mode:</span>
                    <code>v3 Transactional API</code>
                  </div>
                </div>
              </article>
            </div>

            {/* Live Diagnostics & Cluster Latency Ping */}
            <div className="admin-diag-card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginBottom: "14px" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "15px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Zap size={16} className="text-crimson" />
                    <span>Real-Time Cluster Latency Diagnostics</span>
                  </h3>
                  <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#8a8a96" }}>
                    Measure round-trip ping latency directly between this server, TiDB Cloud, Backblaze B2, and Brevo.
                  </p>
                </div>
                <button
                  type="button"
                  className="admin-diag-ping-btn"
                  onClick={handleRunPing}
                  disabled={isPinging}
                >
                  <RefreshCw size={13} className={isPinging ? "admin-spin-icon" : ""} />
                  <span>{isPinging ? "Measuring Latency..." : "Run Live Ping Test"}</span>
                </button>
              </div>

              {pingResult && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px" }}>
                  <div style={{ background: "#17171d", padding: "12px", borderRadius: "10px", border: "1px solid #282834" }}>
                    <span style={{ fontSize: "11px", color: "#8a8a96", display: "block" }}>TiDB Cloud Latency</span>
                    <strong style={{ fontSize: "18px", color: pingResult.database?.status === "connected" ? "#10b981" : "#ef4444" }}>
                      {pingResult.database?.latencyMs ?? "N/A"} ms
                    </strong>
                    <small style={{ display: "block", color: "#71717a", fontSize: "10px", marginTop: "2px" }}>
                      Status: {pingResult.database?.status || "unknown"}
                    </small>
                  </div>

                  <div style={{ background: "#17171d", padding: "12px", borderRadius: "10px", border: "1px solid #282834" }}>
                    <span style={{ fontSize: "11px", color: "#8a8a96", display: "block" }}>Backblaze B2 Latency</span>
                    <strong style={{ fontSize: "18px", color: pingResult.storage?.status === "connected" ? "#10b981" : "#ef4444" }}>
                      {pingResult.storage?.latencyMs ?? "N/A"} ms
                    </strong>
                    <small style={{ display: "block", color: "#71717a", fontSize: "10px", marginTop: "2px" }}>
                      Bucket: {pingResult.storage?.bucket || "b2"}
                    </small>
                  </div>

                  <div style={{ background: "#17171d", padding: "12px", borderRadius: "10px", border: "1px solid #282834" }}>
                    <span style={{ fontSize: "11px", color: "#8a8a96", display: "block" }}>Brevo Email API</span>
                    <strong style={{ fontSize: "18px", color: pingResult.brevo?.status === "configured" ? "#10b981" : "#f59e0b" }}>
                      {pingResult.brevo?.status === "configured" ? "Active" : "Unconfigured"}
                    </strong>
                    <small style={{ display: "block", color: "#71717a", fontSize: "10px", marginTop: "2px" }}>
                      Sender: {pingResult.brevo?.sender || "Brevo"}
                    </small>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ---------------- TAB 6: EMAIL BROADCAST ---------------- */}
        {tab === "email" && (
          <div className="admin-email-tab-wrap" style={{ marginTop: "14px" }}>
            <div className="admin-email-grid">
              {/* Left Column: Email Composer */}
              <div className="admin-email-form">
                <div className="admin-card-header" style={{ marginBottom: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                    <div>
                      <h2 style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
                        <Mail size={18} style={{ color: "#e50936" }} />
                        <span>Broadcast & Targeted Email Center</span>
                      </h2>
                      <p style={{ margin: "4px 0 0", color: "#8a8a96", fontSize: "12px" }}>
                        Dispatch transactional, maintenance, and security emails directly to users via Brevo.
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "4px 10px",
                          borderRadius: "20px",
                          background: emailStatus?.grokConfigured ? "rgba(229, 9, 54, 0.15)" : "rgba(113, 113, 122, 0.15)",
                          color: emailStatus?.grokConfigured ? "#ff365c" : "#a1a1aa",
                          border: `1px solid ${emailStatus?.grokConfigured ? "rgba(229, 9, 54, 0.35)" : "rgba(113, 113, 122, 0.3)"}`,
                        }}
                      >
                        {emailStatus?.grokConfigured ? "xAI Grok Ready" : "Grok Key Setup"}
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "4px 10px",
                          borderRadius: "20px",
                          background: emailStatus?.configured ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                          color: emailStatus?.configured ? "#10b981" : "#f59e0b",
                          border: `1px solid ${emailStatus?.configured ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
                        }}
                      >
                        {emailStatus?.configured ? "Brevo Ready" : "Brevo Not Configured"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Grok AI Email Assistant Card */}
                <div className="admin-grok-card">
                  <div className="admin-grok-header">
                    <div className="admin-grok-title">
                      <Sparkles size={16} style={{ color: "#ff365c" }} />
                      <span>Grok AI Email Generator</span>
                    </div>
                    <span className="admin-grok-badge ready">
                      ✨ Grok AI Active (.env)
                    </span>
                  </div>

                  <div className="admin-grok-input-wrap">
                    <textarea
                      className="admin-grok-textarea"
                      value={grokPrompt || ""}
                      onChange={(e) => setGrokPrompt(e.target.value)}
                      placeholder="Ask Grok AI: What do you want to communicate? (e.g. Announce end-to-end encrypted link sharing, or Notify users of scheduled maintenance tonight at 02:00 UTC)"
                      rows={2}
                    />

                    <div className="admin-grok-actions">
                      <div className="admin-grok-tone-chips">
                        <span style={{ fontSize: "10.5px", color: "#71717a", marginRight: "2px" }}>Tone:</span>
                        {[
                          { id: "announcement", label: "Announcement" },
                          { id: "security", label: "Security" },
                          { id: "maintenance", label: "Maintenance" },
                          { id: "urgent", label: "Urgent" },
                        ].map((t) => (
                          <button
                            type="button"
                            key={t.id}
                            className={`admin-grok-tone-chip ${grokTone === t.id ? "active" : ""}`}
                            onClick={() => setGrokTone(t.id)}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        className="admin-grok-btn"
                        onClick={handleGenerateWithGrok}
                        disabled={isGeneratingWithGrok || !grokPrompt.trim()}
                      >
                        {isGeneratingWithGrok ? (
                          <>
                            <RefreshCw size={13} className="admin-spin-icon" />
                            <span>Grok Drafting...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={13} />
                            <span>Generate with Grok AI</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick Template Presets */}
                <div className="admin-template-pills">
                  <span style={{ fontSize: "11px", color: "#8a8a96", fontWeight: 600 }}>Quick Templates:</span>
                  <button
                    type="button"
                    className="admin-template-btn"
                    onClick={() => applyEmailTemplate("announcement")}
                  >
                    <Sparkles size={12} /> New Features
                  </button>
                  <button
                    type="button"
                    className="admin-template-btn"
                    onClick={() => applyEmailTemplate("maintenance")}
                  >
                    <Clock3 size={12} /> Maintenance
                  </button>
                  <button
                    type="button"
                    className="admin-template-btn"
                    onClick={() => applyEmailTemplate("security")}
                  >
                    <ShieldCheck size={12} /> Security Notice
                  </button>
                  <button
                    type="button"
                    className="admin-template-btn"
                    onClick={() => applyEmailTemplate("urgent")}
                  >
                    <AlertCircle size={12} /> Urgent Alert
                  </button>
                </div>

                {/* Recipient Selector */}
                <div className="admin-form-group">
                  <label>Target Audience / Recipients</label>
                  <div className="admin-radio-group">
                    <label className="admin-radio-label">
                      <input
                        type="radio"
                        name="recipientType"
                        value="all"
                        checked={emailRecipientType === "all"}
                        onChange={(e) => setEmailRecipientType(e.target.value)}
                      />
                      <span>All Users ({users.length})</span>
                    </label>
                    <label className="admin-radio-label">
                      <input
                        type="radio"
                        name="recipientType"
                        value="active"
                        checked={emailRecipientType === "active"}
                        onChange={(e) => setEmailRecipientType(e.target.value)}
                      />
                      <span>Active Only ({users.filter((u) => u.status === "active").length})</span>
                    </label>
                    <label className="admin-radio-label">
                      <input
                        type="radio"
                        name="recipientType"
                        value="suspended"
                        checked={emailRecipientType === "suspended"}
                        onChange={(e) => setEmailRecipientType(e.target.value)}
                      />
                      <span>Suspended Only ({users.filter((u) => u.status === "suspended").length})</span>
                    </label>
                    <label className="admin-radio-label">
                      <input
                        type="radio"
                        name="recipientType"
                        value="selected"
                        checked={emailRecipientType === "selected"}
                        onChange={(e) => setEmailRecipientType(e.target.value)}
                      />
                      <span>Single Specific User</span>
                    </label>
                  </div>
                </div>

                {/* Specific User Dropdown if "selected" */}
                {emailRecipientType === "selected" && (
                  <div className="admin-form-group">
                    <label>Choose Specific User</label>
                    <select
                      value={emailSelectedUserId || ""}
                      onChange={(e) => setEmailSelectedUserId(e.target.value)}
                    >
                      <option value="">-- Select a User --</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.email} ({u.role}, {u.status})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Category Selector */}
                <div className="admin-form-group">
                  <label>Email Category & Styling</label>
                  <div className="admin-category-selector">
                    {[
                      { id: "announcement", label: "Announcement" },
                      { id: "security", label: "Security Notice" },
                      { id: "maintenance", label: "Maintenance" },
                      { id: "urgent", label: "Urgent Alert" },
                    ].map((cat) => (
                      <button
                        type="button"
                        key={cat.id}
                        className={`admin-cat-btn ${emailCategory === cat.id ? "active " + cat.id : ""}`}
                        onClick={() => setEmailCategory(cat.id)}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subject */}
                <div className="admin-form-group">
                  <label>Email Subject Line</label>
                  <input
                    type="text"
                    value={emailSubject || ""}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="e.g. Scheduled Maintenance: DocQevrilo Cluster Update"
                    maxLength={180}
                  />
                </div>

                {/* Message Body */}
                <div className="admin-form-group">
                  <label>Email Message Content</label>
                  <textarea
                    rows={7}
                    value={emailMessage || ""}
                    onChange={(e) => setEmailMessage(e.target.value)}
                    placeholder="Type your message content here..."
                  />
                </div>

                {/* Action Buttons */}
                <div className="admin-email-actions">
                  <button
                    type="button"
                    className="admin-secondary-btn"
                    onClick={handleSendTestEmail}
                    disabled={isSendingTestEmail || isSendingEmail || !emailSubject || !emailMessage}
                    title="Send a sample of this email to your administrator email"
                  >
                    {isSendingTestEmail ? <RefreshCw size={14} className="admin-spin-icon" /> : <Send size={14} />}
                    <span>Send Test to Me</span>
                  </button>

                  <button
                    type="button"
                    className="admin-primary-btn"
                    style={{ marginTop: 0 }}
                    onClick={handleSendEmail}
                    disabled={
                      isSendingEmail ||
                      isSendingTestEmail ||
                      !emailSubject ||
                      !emailMessage ||
                      (emailRecipientType === "selected" && !emailSelectedUserId)
                    }
                  >
                    {isSendingEmail ? <RefreshCw size={15} className="admin-spin-icon" /> : <Mail size={15} />}
                    <span>
                      {emailRecipientType === "all"
                        ? `Broadcast to All Users (${users.length})`
                        : emailRecipientType === "selected"
                        ? "Send to Selected User"
                        : `Send to ${emailRecipientType} Users`}
                    </span>
                  </button>
                </div>

                {emailResult && (
                  <div
                    style={{
                      marginTop: "14px",
                      padding: "10px 14px",
                      background: emailResult.success ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
                      border: `1px solid ${emailResult.success ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: emailResult.success ? "#10b981" : "#ef4444",
                    }}
                  >
                    {emailResult.message}
                  </div>
                )}

                {/* Platform Announcement Banner Settings */}
                <div className="admin-announcement-card" style={{ marginTop: "24px" }}>
                  <div className="admin-card-header" style={{ marginBottom: "12px" }}>
                    <h2 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "15px", margin: 0 }}>
                      <Megaphone size={16} style={{ color: "#f59e0b" }} />
                      <span>Platform Live Announcement Banner</span>
                    </h2>
                    <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#8a8a96" }}>
                      Broadcast a real-time banner visible to all visitors and users across DocQevrilo.
                    </p>
                  </div>

                  <div className="admin-form-group">
                    <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={Boolean(announcement?.active)}
                        onChange={(e) => setAnnouncement((prev) => ({ ...prev, active: e.target.checked }))}
                        style={{ width: "16px", height: "16px", accentColor: "#e50936" }}
                      />
                      <span style={{ fontWeight: 600 }}>Enable Live Banner Globally</span>
                    </label>
                  </div>

                  {Boolean(announcement?.active) && (
                    <>
                      <div className="admin-form-group">
                        <label>Banner Type</label>
                        <div className="admin-radio-group">
                          <label className="admin-radio-label">
                            <input
                              type="radio"
                              name="bannerType"
                              value="info"
                              checked={(announcement?.type || "info") === "info"}
                              onChange={(e) => setAnnouncement((prev) => ({ ...prev, type: e.target.value }))}
                            />
                            <span>Info (Blue)</span>
                          </label>
                          <label className="admin-radio-label">
                            <input
                              type="radio"
                              name="bannerType"
                              value="warning"
                              checked={announcement?.type === "warning"}
                              onChange={(e) => setAnnouncement((prev) => ({ ...prev, type: e.target.value }))}
                            />
                            <span>Warning (Amber)</span>
                          </label>
                          <label className="admin-radio-label">
                            <input
                              type="radio"
                              name="bannerType"
                              value="critical"
                              checked={announcement?.type === "critical"}
                              onChange={(e) => setAnnouncement((prev) => ({ ...prev, type: e.target.value }))}
                            />
                            <span>Critical Alert (Red)</span>
                          </label>
                        </div>
                      </div>

                      <div className="admin-form-group">
                        <label>Banner Text</label>
                        <input
                          type="text"
                          value={announcement?.message || ""}
                          onChange={(e) => setAnnouncement((prev) => ({ ...prev, message: e.target.value }))}
                          placeholder="e.g. DocQevrilo will undergo scheduled maintenance tonight at 02:00 UTC."
                          maxLength={200}
                        />
                      </div>
                    </>
                  )}

                  <div style={{ marginTop: "12px", display: "flex", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className="admin-secondary-btn"
                      onClick={handleSaveAnnouncement}
                      disabled={isSavingAnnouncement}
                    >
                      {isSavingAnnouncement ? <RefreshCw size={14} className="admin-spin-icon" /> : <CheckCheck size={14} />}
                      <span>Save Announcement</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Email Preview */}
              <div className="admin-email-preview-pane">
                <div className="admin-card-header" style={{ marginBottom: "14px" }}>
                  <h2 style={{ fontSize: "16px", margin: 0 }}>Live Email Preview</h2>
                  <p style={{ margin: "4px 0 0", color: "#8a8a96", fontSize: "12px" }}>
                    This is exactly how recipients will see the email in their inbox.
                  </p>
                </div>

                <div className="admin-email-preview-card">
                  <div className="admin-preview-topbar">
                    <span className="admin-preview-dot red"></span>
                    <span className="admin-preview-dot yellow"></span>
                    <span className="admin-preview-dot green"></span>
                    <span className="admin-preview-title">
                      {emailSubject || "New Email Subject"}
                    </span>
                  </div>

                  <div className="admin-preview-body">
                    <div className="admin-preview-brand">
                      <Shield size={20} style={{ color: "#e50936" }} />
                      <span style={{ fontWeight: 800, fontSize: "16px", color: "#ffffff" }}>
                        Doc<span style={{ color: "#e50936" }}>Qevrilo</span>
                      </span>
                    </div>

                    <div className={`admin-preview-pill ${emailCategory}`}>
                      {emailCategory.toUpperCase()}
                    </div>

                    <h3 className="admin-preview-subject">
                      {emailSubject || "Your Subject Line Appears Here"}
                    </h3>

                    <div className="admin-preview-text">
                      {emailMessage ? (
                        emailMessage.split("\n").map((paragraph, idx) => (
                          <p key={idx} style={{ marginBottom: "8px" }}>
                            {paragraph || "\u00A0"}
                          </p>
                        ))
                      ) : (
                        <p style={{ color: "#71717a", fontStyle: "italic" }}>
                          Write your message in the composer to preview it in real-time...
                        </p>
                      )}
                    </div>

                    <div className="admin-preview-footer">
                      <p>Sent by DocQevrilo Administration Control</p>
                      <small>Zero-Knowledge End-to-End Encrypted Vault</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="admin-footer">
          <Clock3 size={14} />
          <span>
            DocQevrilo Control Center — All administrator actions are logged for security compliance. Document
            cryptographic keys and plain-text passwords are never stored or displayed here.
          </span>
        </footer>
      </section>

      {/* ---------------- DOCUMENT DETAILS MODAL ---------------- */}
      {selectedDoc && (
        <div className="admin-modal-backdrop" onClick={() => setSelectedDoc(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Document Inspection</h3>
              <button className="admin-modal-close" onClick={() => setSelectedDoc(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-modal-field">
                <label>Filename:</label>
                <b>{selectedDoc.original_name}</b>
              </div>
              <div className="admin-modal-field">
                <label>Document ID:</label>
                <code>{selectedDoc.id}</code>
              </div>
              <div className="admin-modal-field">
                <label>MIME Type:</label>
                <code>{selectedDoc.mime_type}</code>
              </div>
              <div className="admin-modal-field">
                <label>File Size:</label>
                <span>{formatBytes(Number(selectedDoc.file_size || 0))}</span>
              </div>
              <div className="admin-modal-field">
                <label>Owner Account:</label>
                <span>{selectedDoc.owner_email || "Anonymous"}</span>
              </div>
              <div className="admin-modal-field">
                <label>Storage Mode:</label>
                <span className={`admin-mode-pill ${selectedDoc.storage_mode}`}>
                  {selectedDoc.storage_mode || "online"}
                </span>
              </div>
              <div className="admin-modal-field">
                <label>Storage Object Key:</label>
                <code className="admin-code-wrap">{selectedDoc.storage_key || "None"}</code>
              </div>
              <div className="admin-modal-field">
                <label>Total Views / Downloads:</label>
                <span>
                  {selectedDoc.view_count || 0} views / {selectedDoc.download_count || 0} downloads
                </span>
              </div>
              <div className="admin-modal-field">
                <label>Expiration Date:</label>
                <span>{selectedDoc.expires_at ? new Date(selectedDoc.expires_at).toLocaleString() : "Permanent"}</span>
              </div>
            </div>
            <div className="admin-modal-footer">
              <button
                className="admin-modal-danger-btn"
                onClick={() => handleDeleteDocument(selectedDoc)}
              >
                <Trash2 size={14} /> Force Delete Document
              </button>
              <button className="admin-modal-cancel-btn" onClick={() => setSelectedDoc(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- PASSWORD RESET RESULT MODAL ---------------- */}
      {resetPasswordModal && (
        <div className="admin-modal-backdrop" onClick={() => setResetPasswordModal(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Temporary Password Generated</h3>
              <button className="admin-modal-close" onClick={() => setResetPasswordModal(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="admin-modal-body">
              <p>
                A temporary password has been set for <b>{resetPasswordModal.user.email}</b>. Provide this password to the
                user so they can sign in and update their password.
              </p>
              <div className="admin-temp-pass-box">
                <code>{resetPasswordModal.tempPassword}</code>
                <button
                  className="admin-copy-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(resetPasswordModal.tempPassword);
                    setResetPasswordModal((prev) => ({ ...prev, copied: true }));
                    setTimeout(() => {
                      setResetPasswordModal((prev) => (prev ? { ...prev, copied: false } : null));
                    }, 2000);
                  }}
                >
                  {resetPasswordModal.copied ? <Check size={16} /> : <Copy size={16} />}
                  <span>{resetPasswordModal.copied ? "Copied!" : "Copy"}</span>
                </button>
              </div>
            </div>
            <div className="admin-modal-footer">
              <button className="admin-primary-btn" onClick={() => setResetPasswordModal(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- CONFIRMATION ACTION DIALOG ---------------- */}
      {confirmDialog && (
        <div className="admin-modal-backdrop" onClick={() => setConfirmDialog(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{confirmDialog.title}</h3>
              <button className="admin-modal-close" onClick={() => setConfirmDialog(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="admin-modal-body">
              <p>{confirmDialog.message}</p>
            </div>
            <div className="admin-modal-footer">
              <button
                className={confirmDialog.danger ? "admin-modal-danger-btn" : "admin-modal-confirm-btn"}
                onClick={() => {
                  const cb = confirmDialog.onConfirm;
                  setConfirmDialog(null);
                  if (cb) cb();
                }}
              >
                Confirm Action
              </button>
              <button className="admin-modal-cancel-btn" onClick={() => setConfirmDialog(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
