import { useEffect, useMemo, useState } from "react";
import "./App.css";

const STORAGE_KEY = "peoplehub_records_v1";
const THEME_KEY = "peoplehub_theme";

const IMAGE_FIELDS = [
  { key: "userImage", label: "Profile Photo", icon: "👤" },
  { key: "cardImage", label: "ID Card", icon: "🪪" },
  { key: "iqamaImage", label: "Iqama", icon: "📄" },
  { key: "qrCode1", label: "QR Code 1", icon: "▦" },
  { key: "drivingLicenseImage", label: "Driving Licence", icon: "🚘" },
  { key: "qrCode2", label: "QR Code 2", icon: "▦" },
];

const EMPTY_FORM = {
  name: "",
  idNo: "",
  phone: "",
};

function readRecords() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function App() {
  const [items, setItems] = useState(readRecords);
  const [form, setForm] = useState(EMPTY_FORM);
  const [images, setImages] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState(
    () => localStorage.getItem(THEME_KEY) || "light"
  );
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      notify("Storage is full. Remove some large images and try again.");
    }
  }, [items]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  function notify(message) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3000);
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setImages({});
    setEditingId(null);

    const formElement = document.getElementById("record-form");
    formElement?.reset();
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function handleImage(event, key) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      notify("Please select an image file.");
      event.target.value = "";
      return;
    }

    if (file.size > 1.5 * 1024 * 1024) {
      notify("Please choose an image smaller than 1.5 MB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setImages((previous) => ({
        ...previous,
        [key]: reader.result,
      }));
    };

    reader.onerror = () => notify("Could not read this image.");
    reader.readAsDataURL(file);
  }

  function removeImage(key) {
    setImages((previous) => {
      const next = { ...previous };
      delete next[key];
      return next;
    });

    const input = document.getElementById(`image-${key}`);
    if (input) input.value = "";
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!form.name.trim() || !form.idNo.trim() || !form.phone.trim()) {
      notify("Please complete all required fields.");
      return;
    }

    setSaving(true);

    const previousRecord = items.find((item) => item.id === editingId);

    const record = {
      id: editingId || createId(),
      name: form.name.trim(),
      idNo: form.idNo.trim(),
      phone: form.phone.trim(),
      images: {
        ...(previousRecord?.images || {}),
        ...images,
      },
      updatedAt: new Date().toISOString(),
    };

    if (editingId) {
      setItems((previous) =>
        previous.map((item) => (item.id === editingId ? record : item))
      );
      notify("Record updated successfully.");
    } else {
      setItems((previous) => [record, ...previous]);
      notify("Record added successfully.");
    }

    resetForm();
    setSaving(false);
  }

  function startEdit(item) {
    setEditingId(item.id);
    setForm({
      name: item.name || "",
      idNo: item.idNo || "",
      phone: item.phone || "",
    });
    setImages(item.images || {});

    document.getElementById("form-section")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function deleteRecord(item) {
    const confirmed = window.confirm(
      `Delete the record for "${item.name}"?`
    );

    if (!confirmed) return;

    setItems((previous) => previous.filter((record) => record.id !== item.id));

    if (editingId === item.id) resetForm();

    notify("Record deleted.");
  }

  const filteredItems = useMemo(() => {
    const term = query.trim().toLowerCase();

    if (!term) return items;

    return items.filter((item) =>
      [item.name, item.idNo, item.phone].some((value) =>
        String(value || "").toLowerCase().includes(term)
      )
    );
  }, [items, query]);

  const recordsWithImages = items.filter((item) =>
    IMAGE_FIELDS.some((field) => item.images?.[field.key])
  ).length;

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top">
          <div className="brand-mark">PH</div>
          <div className="brand-copy">
            <strong>PeopleHub</strong>
            <span>People directory</span>
          </div>
        </a>

        <div className="top-actions">
          <label className="search-box">
            <span className="search-icon">⌕</span>
            <input
              type="search"
              aria-label="Search records"
              placeholder="Search name, ID or phone..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <button
            className="icon-btn"
            type="button"
            onClick={() =>
              setTheme((current) =>
                current === "light" ? "dark" : "light"
              )
            }
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            {theme === "light" ? "☾" : "☀"}
          </button>
        </div>
      </header>

      <main className="container" id="top">
        <section className="hero">
          <div className="hero-copy">
            <span className="hero-tag">
              <i />
              YOUR PERSONAL DIRECTORY
            </span>

            <h1>
              Every record.
              <br />
              <em>One simple place.</em>
            </h1>

            <p>
              Manage people details, photos and documents in one organized
              workspace.
            </p>

            <a className="hero-link" href="#records">
              Explore records <span>↓</span>
            </a>
          </div>

          <div className="hero-art" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />

            <div className="art-card art-card-back">
              <span className="art-document">▦</span>
              <span>DOCUMENTS</span>
            </div>

            <div className="art-card art-card-front">
              <div className="art-avatar">✦</div>
              <div className="art-lines">
                <b />
                <b />
                <b />
              </div>
              <span className="art-status">● YOUR DIRECTORY</span>
            </div>

            <div className="art-dot dot-one" />
            <div className="art-dot dot-two" />
          </div>

          <div className="hero-bottom">
            <span>PEOPLEHUB WORKSPACE</span>
            <span>FRONTEND ONLY · NO LOGIN</span>
          </div>
        </section>

        <section className="stats-grid">
          <article className="stat-card">
            <span className="stat-icon purple">▤</span>
            <div>
              <p>Total records</p>
              <strong>{items.length}</strong>
            </div>
            <small>All saved records</small>
          </article>

          <article className="stat-card">
            <span className="stat-icon mint">▧</span>
            <div>
              <p>With images</p>
              <strong>{recordsWithImages}</strong>
            </div>
            <small>Records with photos</small>
          </article>

          <article className="stat-card">
            <span className="stat-icon amber">⌕</span>
            <div>
              <p>Search results</p>
              <strong>{filteredItems.length}</strong>
            </div>
            <small>Matching records</small>
          </article>
        </section>

        <section className="form-card" id="form-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">
                {editingId ? "UPDATE RECORD" : "ADD TO DIRECTORY"}
              </span>
              <h2>
                {editingId ? "Edit person record" : "Create a new record"}
              </h2>
              <p>Enter the details and select any relevant images.</p>
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

          <form id="record-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <label className="field">
                <span>
                  Full name <b>*</b>
                </span>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter full name"
                  autoComplete="off"
                  maxLength={120}
                  required
                />
              </label>

              <label className="field">
                <span>
                  ID number <b>*</b>
                </span>
                <input
                  name="idNo"
                  value={form.idNo}
                  onChange={handleChange}
                  placeholder="Enter ID number"
                  autoComplete="off"
                  maxLength={80}
                  required
                />
              </label>

              <label className="field">
                <span>
                  Phone number <b>*</b>
                </span>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                  autoComplete="off"
                  maxLength={30}
                  required
                />
              </label>
            </div>

            <div className="upload-heading">
              <div>
                <span className="eyebrow">IMAGE LIBRARY</span>
                <h3>Photos & documents</h3>
              </div>
              <span className="file-limit">JPG, PNG, WEBP · Max 1.5 MB each</span>
            </div>

            <div className="upload-grid">
              {IMAGE_FIELDS.map((field) => (
                <div className="upload-field" key={field.key}>
                  <div className="upload-label">
                    <span>{field.icon}</span>
                    <b>{field.label}</b>
                  </div>

                  {images[field.key] ? (
                    <div className="preview-card">
                      <img
                        src={images[field.key]}
                        alt={`${field.label} preview`}
                      />

                      <button
                        className="remove-image"
                        type="button"
                        onClick={() => removeImage(field.key)}
                        aria-label={`Remove ${field.label}`}
                      >
                        ×
                      </button>

                      <label
                        className="replace-link"
                        htmlFor={`image-${field.key}`}
                      >
                        Replace image
                      </label>
                      <input
                        className="hidden-file-input"
                        id={`image-${field.key}`}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(event) => handleImage(event, field.key)}
                      />
                    </div>
                  ) : (
                    <label className="upload-drop">
                      <input
                        id={`image-${field.key}`}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(event) => handleImage(event, field.key)}
                      />
                      <span className="upload-plus">＋</span>
                      <b>Upload {field.label.toLowerCase()}</b>
                      <small>Choose an image from your device</small>
                    </label>
                  )}
                </div>
              ))}
            </div>

            <div className="form-footer">
              <span className="required-note">
                <b>*</b> Required fields
              </span>

              <div className="footer-actions">
                {editingId && (
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={resetForm}
                  >
                    Discard changes
                  </button>
                )}

                <button className="primary-btn" type="submit" disabled={saving}>
                  {saving
                    ? "Saving..."
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
                People records{" "}
                <span className="count-pill">{filteredItems.length}</span>
              </h2>
              <p>View, edit or remove your saved records.</p>
            </div>

            <button
              className="secondary-btn"
              type="button"
              onClick={() => {
                resetForm();
                document.getElementById("form-section")?.scrollIntoView({
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
              {filteredItems.map((item) => {
                const attachedCount = IMAGE_FIELDS.filter(
                  (field) => item.images?.[field.key]
                ).length;

                return (
                  <article className="person-card" key={item.id}>
                    <div className="person-card-head">
                      <div className="person-avatar">
                        {item.images?.userImage ? (
                          <img src={item.images.userImage} alt={item.name} />
                        ) : (
                          <span>
                            {(item.name || "?").trim().charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="person-title">
                        <h3>{item.name}</h3>
                        <span className="record-id">ID · {item.idNo}</span>
                      </div>

                      <span className="local-chip">● Local</span>
                    </div>

                    <div className="person-meta">
                      <div>
                        <span>PHONE</span>
                        <b>{item.phone || "—"}</b>
                      </div>
                      <div>
                        <span>IMAGES</span>
                        <b>{attachedCount} attached</b>
                      </div>
                    </div>

                    <div className="document-strip">
                      {IMAGE_FIELDS.map((field) => (
                        <div
                          className={`document-thumb ${
                            item.images?.[field.key] ? "has-image" : ""
                          }`}
                          key={field.key}
                          title={field.label}
                        >
                          {item.images?.[field.key] ? (
                            <img
                              src={item.images[field.key]}
                              alt={field.label}
                            />
                          ) : (
                            <span>{field.icon}</span>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="person-actions">
                      <button
                        className="edit-action"
                        type="button"
                        onClick={() => startEdit(item)}
                      >
                        ✎ Edit record
                      </button>

                      <button
                        className="delete-action"
                        type="button"
                        onClick={() => deleteRecord(item)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <footer className="page-footer">
          <span>PEOPLEHUB · FRONTEND EDITION</span>
          <span>Records are saved in this browser only.</span>
        </footer>
      </main>

      {toast && (
        <div className="toast" role="status">
          <span>✓</span>
          {toast}
        </div>
      )}
    </div>
  );
}
