import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const IMAGE_FIELDS = [
  { key: "userImage", label: "Profile photo", icon: "👤", url: "userImageUrl" },
  { key: "cardImage", label: "ID card", icon: "🪪", url: "cardImageUrl" },
  { key: "iqamaImage", label: "Iqama", icon: "📄", url: "iqamaImageUrl" },
  { key: "qrCode1", label: "QR code 1", icon: "▦", url: "qrCode1Url" },
  { key: "drivingLicenseImage", label: "Driving licence", icon: "🚘", url: "drivingLicenseImageUrl" },
  { key: "qrCode2", label: "QR code 2", icon: "▦", url: "qrCode2Url" },
];

const EMPTY_FORM = {
  name: "",
  idNo: "",
  phone: "",
  password: "",
};

async function api(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }

  return data;
}

export default function App() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [files, setFiles] = useState({});
  const [previews, setPreviews] = useState({});
  const [removedImages, setRemovedImages] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState(
    () => localStorage.getItem("people_theme") || "light"
  );
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [login, setLogin] = useState({
    username: "",
    password: "",
  });
  const [loginLoading, setLoginLoading] = useState(false);

  const inputRefs = useRef({});
  const toastTimer = useRef(null);

  const notify = (type, message) => {
    setToast({ type, message });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3500);
  };

  const loadItems = async () => {
    const data = await api("/items");
    setItems(Array.isArray(data.items) ? data.items : []);
  };

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("people_theme", theme);
  }, [theme]);

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        await api("/auth/me");
        if (!active) return;
        setAuthenticated(true);
        await loadItems();
      } catch {
        if (active) setAuthenticated(false);
      } finally {
        if (active) setInitialLoading(false);
      }
    }

    initialize();

    return () => {
      active = false;
      window.clearTimeout(toastTimer.current);
    };
  }, []);

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoginLoading(true);

    try {
      await api("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(login),
      });

      setAuthenticated(true);
      setLogin({ username: "", password: "" });
      await loadItems();
      notify("success", "Welcome back!");
    } catch (error) {
      notify("error", error.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const resetForm = () => {
    Object.values(previews).forEach((url) => {
      if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
    });

    setForm(EMPTY_FORM);
    setFiles({});
    setPreviews({});
    setRemovedImages([]);
    setEditingId(null);
    setShowPassword(false);

    Object.values(inputRefs.current).forEach((element) => {
      if (element) element.value = "";
    });
  };

  const handleLogout = async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      // The session may already have expired.
    }

    resetForm();
    setAuthenticated(false);
    setItems([]);
  };

  const handleImage = (key, file) => {
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      notify("error", "Choose a JPG, PNG or WEBP image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      notify("error", "Each image must be 5 MB or smaller.");
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    setPreviews((old) => {
      const previousUrl = old[key];

      if (previousUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previousUrl);
      }

      return { ...old, [key]: previewUrl };
    });

    setFiles((old) => ({
      ...old,
      [key]: file,
    }));

    setRemovedImages((old) => old.filter((name) => name !== key));
  };

  const removeImage = (field) => {
    const key = field.key;

    setFiles((old) => {
      const next = { ...old };
      delete next[key];
      return next;
    });

    setPreviews((old) => {
      if (old[key]?.startsWith("blob:")) {
        URL.revokeObjectURL(old[key]);
      }

      const next = { ...old };
      delete next[key];
      return next;
    });

    if (editingId) {
      setRemovedImages((old) =>
        old.includes(key) ? old : [...old, key]
      );
    }

    if (inputRefs.current[key]) {
      inputRefs.current[key].value = "";
    }
  };

  const startEdit = (item) => {
    resetForm();

    setEditingId(item._id);
    setForm({
      name: item.name || "",
      idNo: item.idNo || "",
      phone: item.phone || "",
      password: "",
    });

    const existingImages = {};

    IMAGE_FIELDS.forEach((field) => {
      if (item[field.url]) {
        existingImages[field.key] = item[field.url];
      }
    });

    setPreviews(existingImages);

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading) return;

    if (!form.name.trim() || !form.idNo.trim() || !form.phone.trim()) {
      notify("error", "Name, ID number and phone are required.");
      return;
    }

    if (!editingId && form.password.length < 12) {
      notify("error", "Use a password with at least 12 characters.");
      return;
    }

    if (editingId && form.password && form.password.length < 12) {
      notify("error", "New password must have at least 12 characters.");
      return;
    }

    setLoading(true);

    try {
      const body = new FormData();

      body.append("name", form.name.trim());
      body.append("idNo", form.idNo.trim());
      body.append("phone", form.phone.trim());

      if (form.password) {
        body.append("password", form.password);
      }

      body.append("removedImages", JSON.stringify(removedImages));

      IMAGE_FIELDS.forEach(({ key }) => {
        if (files[key]) body.append(key, files[key]);
      });

      const data = await api(
        editingId ? `/items/${editingId}` : "/items",
        {
          method: editingId ? "PUT" : "POST",
          body,
        }
      );

      if (editingId) {
        setItems((old) =>
          old.map((item) =>
            item._id === editingId ? data.item : item
          )
        );
      } else {
        setItems((old) => [data.item, ...old]);
      }

      notify(
        "success",
        editingId ? "Record updated successfully." : "Record saved successfully."
      );

      resetForm();
    } catch (error) {
      notify("error", error.message || "Could not save record.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (item) => {
    if (
      !window.confirm(
        `Delete the record for "${item.name}"? This cannot be undone.`
      )
    ) {
      return;
    }

    setLoading(true);

    try {
      await api(`/items/${item._id}`, { method: "DELETE" });

      setItems((old) => old.filter((entry) => entry._id !== item._id));

      if (editingId === item._id) resetForm();

      notify("success", "Record deleted.");
    } catch (error) {
      notify("error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    const term = query.trim().toLowerCase();

    if (!term) return items;

    return items.filter((item) =>
      [item.name, item.idNo, item.phone].some((value) =>
        String(value || "").toLowerCase().includes(term)
      )
    );
  }, [items, query]);

  if (initialLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Loading PeopleHub…</p>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <main className="login-page">
        <form className="login-card" onSubmit={handleLogin}>
          <div className="brand-mark">PH</div>
          <p className="eyebrow">PRIVATE ADMIN WORKSPACE</p>
          <h1>Welcome to PeopleHub</h1>
          <p className="muted">
            Sign in to securely manage people records.
          </p>

          <label>
            Username
            <input
              autoComplete="username"
              value={login.username}
              onChange={(event) =>
                setLogin({ ...login, username: event.target.value })
              }
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={login.password}
              onChange={(event) =>
                setLogin({ ...login, password: event.target.value })
              }
              required
            />
          </label>

          <button className="primary-btn full" disabled={loginLoading}>
            {loginLoading ? "Signing in…" : "Sign in securely →"}
          </button>

          <p className="tiny-note">
            Access is restricted to authorized administrators.
          </p>
        </form>

        {toast && <Toast toast={toast} />}
      </main>
    );
  }

  const totalPhotos = items.filter((item) =>
    IMAGE_FIELDS.some((field) => item[field.url])
  ).length;

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top">
          <div className="brand-mark">PH</div>
          <div>
            <strong>PeopleHub</strong>
            <span>Private people directory</span>
          </div>
        </a>

        <div className="top-actions">
          <label className="search-box">
            <span>⌕</span>
            <input
              aria-label="Search records"
              placeholder="Search name, ID or phone…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <button
            className="icon-btn"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            aria-label="Toggle theme"
          >
            {theme === "light" ? "☾" : "☀"}
          </button>

          <button
            className="icon-btn"
            onClick={handleLogout}
            title="Sign out"
          >
            ↗
          </button>
        </div>
      </header>

      <main className="container" id="top">
        <section className="hero">
          <div className="hero-copy">
            <span className="hero-tag">
              <i /> PRIVATE DIRECTORY
            </span>

            <h1>
              Every record.
              <br />
              <em>One secure place.</em>
            </h1>

            <p>
              Organize people details and documents with a clear,
              simple workspace.
            </p>

            <a className="hero-link" href="#records">
              Explore records <span>↓</span>
            </a>
          </div>

          <div className="hero-art" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="art-card art-card-back">
              ▦ <span>DOCUMENTS</span>
            </div>
            <div className="art-card art-card-front">
              <div className="art-avatar">✦</div>
              <div className="art-lines">
                <b />
                <b />
                <b />
              </div>
              <span className="art-status">● PRIVATE</span>
            </div>
            <div className="art-dot dot-one" />
            <div className="art-dot dot-two" />
          </div>

          <div className="hero-bottom">
            <span>YOUR WORKSPACE</span>
            <span>SECURITY-FIRST RECORDS ↗</span>
          </div>
        </section>

        <section className="stats-grid">
          <Stat icon="▤" label="Total records" value={items.length} />
          <Stat icon="▧" label="Records with images" value={totalPhotos} />
          <Stat icon="⌕" label="Search results" value={filteredItems.length} />
        </section>

        <section className="form-card" id="form">
          <div className="section-heading">
            <div>
              <span className="eyebrow">
                {editingId ? "UPDATE EXISTING ENTRY" : "ADD TO DIRECTORY"}
              </span>
              <h2>{editingId ? "Edit person record" : "Create a new record"}</h2>
              <p>Fill in the details and attach relevant documents.</p>
            </div>

            {editingId && (
              <button
                className="secondary-btn"
                type="button"
                onClick={resetForm}
              >
                Cancel edit ×
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <Field label="Full name *">
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder="Enter full name"
                  required
                  maxLength={120}
                />
              </Field>

              <Field label="ID number *">
                <input
                  value={form.idNo}
                  onChange={(event) =>
                    setForm({ ...form, idNo: event.target.value })
                  }
                  placeholder="Enter identification number"
                  required
                  maxLength={80}
                />
              </Field>

              <Field label="Phone number *">
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(event) =>
                    setForm({ ...form, phone: event.target.value })
                  }
                  placeholder="Enter phone number"
                  required
                  maxLength={30}
                />
              </Field>

              <Field label={editingId ? "New password (optional)" : "Account password *"}>
                <div className="password-wrap">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(event) =>
                      setForm({ ...form, password: event.target.value })
                    }
                    placeholder={
                      editingId
                        ? "Leave blank to keep current password"
                        : "At least 12 characters"
                    }
                    required={!editingId}
                    minLength={12}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <small className="field-help">
                  Passwords must be hashed by the backend.
                </small>
              </Field>
            </div>

            <div className="upload-heading">
              <div>
                <span className="eyebrow">DOCUMENT LIBRARY</span>
                <h3>Photos & documents</h3>
              </div>
              <span className="file-limit">JPG, PNG, WEBP · Max 5 MB each</span>
            </div>

            <div className="upload-grid">
              {IMAGE_FIELDS.map((field) => (
                <div className="upload-field" key={field.key}>
                  <div className="upload-label">
                    <span>{field.icon}</span>
                    <b>{field.label}</b>
                  </div>

                  {previews[field.key] ? (
                    <div className="preview-card">
                      <img
                        src={previews[field.key]}
                        alt={`${field.label} preview`}
                      />

                      <div className="preview-overlay">
                        <span>
                          {files[field.key] ? "New upload" : "Saved image"}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeImage(field)}
                          aria-label={`Remove ${field.label}`}
                        >
                          ×
                        </button>
                      </div>

                      <label className="replace-link">
                        Replace image
                        <input
                          ref={(element) => {
                            inputRefs.current[field.key] = element;
                          }}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(event) =>
                            handleImage(field.key, event.target.files?.[0])
                          }
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="upload-drop">
                      <input
                        ref={(element) => {
                          inputRefs.current[field.key] = element;
                        }}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(event) =>
                          handleImage(field.key, event.target.files?.[0])
                        }
                      />
                      <span className="upload-plus">＋</span>
                      <b>Upload {field.label.toLowerCase()}</b>
                      <small>Choose a file from your device</small>
                    </label>
                  )}
                </div>
              ))}
            </div>

            <div className="form-footer">
              <span className="required-note">* Required fields</span>
              <div className="footer-actions">
                {editingId && (
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={resetForm}
                  >
                    Discard
                  </button>
                )}
                <button className="primary-btn" disabled={loading}>
                  {loading
                    ? "Saving…"
                    : editingId
                      ? "Save changes →"
                      : "Save record →"}
                </button>
              </div>
            </div>
          </form>
        </section>

        <section className="records-section" id="records">
          <div className="section-heading records-heading">
            <div>
              <span className="eyebrow">YOUR DIRECTORY</span>
              <h2>
                People records <span className="count-pill">{filteredItems.length}</span>
              </h2>
              <p>Manage details and attached documents in one place.</p>
            </div>

            <button
              className="secondary-btn"
              onClick={() => {
                resetForm();
                document.getElementById("form")?.scrollIntoView({
                  behavior: "smooth",
                });
              }}
            >
              ＋ Add record
            </button>
          </div>

          {filteredItems.length === 0 ? (
            <div className="empty-state">
              <div>⌕</div>
              <h3>{query ? "No matching records" : "Your directory is ready"}</h3>
              <p>
                {query
                  ? "Try another name, ID number or phone number."
                  : "Add your first record using the form above."}
              </p>
            </div>
          ) : (
            <div className="records-grid">
              {filteredItems.map((item) => (
                <article className="person-card" key={item._id}>
                  <div className="person-card-head">
                    <div className="person-avatar">
                      {item.userImageUrl ? (
                        <img src={item.userImageUrl} alt="" />
                      ) : (
                        <span>{(item.name || "?").trim().charAt(0).toUpperCase()}</span>
                      )}
                    </div>

                    <div className="person-title">
                      <h3>{item.name}</h3>
                      <span className="record-id">ID · {item.idNo || "—"}</span>
                    </div>

                    <span className="secure-chip">● Private</span>
                  </div>

                  <div className="person-meta">
                    <div>
                      <span>PHONE</span>
                      <b>{item.phone || "—"}</b>
                    </div>
                    <div>
                      <span>DOCUMENTS</span>
                      <b>
                        {IMAGE_FIELDS.filter((field) => item[field.url]).length} attached
                      </b>
                    </div>
                  </div>

                  <div className="document-strip">
                    {IMAGE_FIELDS.map((field) => (
                      <div className="document-thumb" key={field.key} title={field.label}>
                        {item[field.url] ? (
                          <img src={item[field.url]} alt={field.label} />
                        ) : (
                          <span>{field.icon}</span>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="person-actions">
                    <button className="edit-action" onClick={() => startEdit(item)}>
                      ✎ Edit record
                    </button>
                    <button
                      className="delete-action"
                      onClick={() => handleDelete(item)}
                      disabled={loading}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="page-footer">
          <span>PEOPLEHUB · PRIVATE DIRECTORY</span>
          <span>Only store documents you are authorized to manage.</span>
        </footer>
      </main>

      {toast && <Toast toast={toast} />}
    </div>
  );
}

function Stat({ icon, label, value }) {
  return (
    <article className="stat-card">
      <span className="stat-icon">{icon}</span>
      <div>
        <p>{label}</p>
        <strong>{value.toLocaleString()}</strong>
      </div>
    </article>
  );
}

function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Toast({ toast }) {
  return (
    <div className={`toast ${toast.type}`} role="status">
      <span>{toast.type === "success" ? "✓" : "!"}</span>
      {toast.message}
    </div>
  );
}
