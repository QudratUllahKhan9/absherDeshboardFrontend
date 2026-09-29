import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const API_URL = "http://192.168.0.101:5000/api/items";


const EMPTY_FORM = {
  name: "",
  idNo: "",
  phone: "",
  password: "",
};

export default function App() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  
  // States for 2 separate images
  const [userFile, setUserFile] = useState(null);
  const [userPreview, setUserPreview] = useState(null);
  
  const [cardFile, setCardFile] = useState(null);
  const [cardPreview, setCardPreview] = useState(null);
  
  const [editingId, setEditingId] = useState(null);
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState(localStorage.getItem("people_theme") || "light");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // Refs for file inputs
  const userFileInputRef = useRef(null);
  const cardFileInputRef = useRef(null);

  useEffect(() => {
    const loadPeople = async () => {
      try {
        setLoading(true);
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error("Failed to load records");
        const data = await response.json();
        setItems(data.items || []);
      } catch (error) {
        console.error("Load error:", error);
        showToast("error", "MongoDB se records load nahi ho rahe");
      } finally {
        setLoading(false);
      }
    };
    loadPeople();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("people_theme", theme);
  }, [theme]);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleInput = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const pickFile = (selectedFile, type) => {
    const isUser = type === 'user';
    const setFile = isUser ? setUserFile : setCardFile;
    const setPreview = isUser ? setUserPreview : setCardPreview;
    const inputRef = isUser ? userFileInputRef : cardFileInputRef;

    if (!selectedFile) {
      setFile(null);
      setPreview(null);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    if (!selectedFile.type.startsWith("image/")) {
      showToast("error", "Sirf image file select karein");
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      showToast("error", "Image maximum 5MB honi chahiye");
      return;
    }

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setUserFile(null);
    setUserPreview(null);
    setCardFile(null);
    setCardPreview(null);
    setEditingId(null);
    setShowPassword(false);
    if (userFileInputRef.current) userFileInputRef.current.value = "";
    if (cardFileInputRef.current) cardFileInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!form.name.trim()) return showToast("error", "Name zaroori hai");
    if (!form.idNo.trim()) return showToast("error", "ID No zaroori hai");
    if (!form.phone.trim()) return showToast("error", "Phone Number zaroori hai");
    if (!form.password.trim()) return showToast("error", "Password zaroori hai");

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("name", form.name.trim());
      formData.append("idNo", form.idNo.trim());
      formData.append("phone", form.phone.trim());
      formData.append("password", form.password.trim());
      
      if (userFile) formData.append("userImage", userFile);
      if (cardFile) formData.append("cardImage", cardFile);

      if (editingId) {
        const response = await fetch(`${API_URL}/${editingId}`, {
          method: "PUT",
          body: formData,
        });

        if (!response.ok) throw new Error("Update failed");

        const data = await response.json();
        setItems((prev) => prev.map((item) => (item._id === editingId ? data.item : item)));
        showToast("success", "Record successfully updated");
      } else {
        const response = await fetch(API_URL, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("Create failed");

        const data = await response.json();
        setItems((prev) => [data.item, ...prev]);
        showToast("success", "New record MongoDB mein save ho gaya");
      }

      resetForm();
    } catch (error) {
      console.error("Submit error:", error);
      showToast("error", "Server par data save nahi ho saka");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item._id);
    setForm({
      name: item.name || "",
      idNo: item.idNo || "",
      phone: item.phone || "",
      password: item.password || "",
    });
    setUserPreview(item.userImageUrl || null);
    setCardPreview(item.cardImageUrl || null);
    setUserFile(null);
    setCardFile(null);
    setShowPassword(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    const item = items.find((x) => x._id === id);
    if (!item) return;

    if (!window.confirm(`Kya "${item.name}" ka record delete karna hai?`)) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Delete failed");

      setItems((prev) => prev.filter((x) => x._id !== id));
      if (editingId === id) resetForm();
      showToast("success", "Record successfully delete ho gaya");
    } catch (error) {
      console.error("Delete error:", error);
      showToast("error", "Record delete nahi ho saka");
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    const search = query.trim().toLowerCase();
    const currentItems = Array.isArray(items) ? items : items.items || [];
    if (!search) return currentItems;
    
    return currentItems.filter((item) =>
      item.name?.toLowerCase().includes(search) ||
      item.idNo?.toLowerCase().includes(search) ||
      item.phone?.toLowerCase().includes(search)
    );
  }, [items, query]);

  const totalRecords = Array.isArray(items) ? items.length : 0;
  const totalPhotos = (Array.isArray(items) ? items : items.items || []).filter(
    (item) => item.userImageUrl || item.cardImageUrl
  ).length;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">👥</div>
          <div>
            <h1>PeopleHub</h1>
            <span>People Directory</span>
          </div>
        </div>
        <div className="top-actions">
          <div className="search-box">
            <span>🔍</span>
            <input type="text" placeholder="Search name, ID or phone..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <button className="theme-btn" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
            {theme === "light" ? "🌙" : "☀️"}
          </button>
        </div>
      </header>

      <main className="container">
        <section className="hero">
          <div>
            <p className="eyebrow">MONGODB DIRECTORY</p>
            <h2>Manage your people<br />records easily.</h2>
            <p className="hero-text">Add, edit, search and manage your records from one place.</p>
          </div>
          <div className="stats">
            <div className="stat-card">
              <strong>{totalRecords}</strong>
              <span>Total Records</span>
            </div>
            <div className="stat-card">
              <strong>{totalPhotos}</strong>
              <span>Photos Uploaded</span>
            </div>
          </div>
        </section>

        <section className="form-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{editingId ? "EDIT RECORD" : "NEW RECORD"}</p>
              <h3>{editingId ? "Update Person" : "Add New Person"}</h3>
            </div>
            {editingId && (
              <button type="button" className="cancel-btn" onClick={resetForm}>Cancel</button>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="field">
                <label>Name</label>
                <input type="text" name="name" value={form.name} onChange={handleInput} placeholder="Enter full name" />
              </div>

              <div className="field">
                <label>ID Number</label>
                <input type="text" name="idNo" value={form.idNo} onChange={handleInput} placeholder="Enter ID number" />
              </div>

              <div className="field">
                <label>Phone Number</label>
                <input type="tel" name="phone" value={form.phone} onChange={handleInput} placeholder="Enter phone number" />
              </div>

          <div className="field">
  <label>Password</label>
  <div className="password-input-group">
    <input 
      type={showPassword ? "text" : "password"} 
      name="password" 
      value={form.password} 
      onChange={handleInput} 
      placeholder="Enter password"
    />
    <button 
      type="button" 
      className="password-toggle-btn"
      onClick={() => setShowPassword(!showPassword)}
      title={showPassword ? "Hide Password" : "Show Password"}
    >
      {showPassword ? "👁️" : "🙈"}
    </button>
  </div>
</div>

              <div className="field">
                <label>User Profile Image</label>
                <div className="image-upload">
                  {userPreview ? (
                    <div className="image-preview">
                      <img src={userPreview} alt="User Preview" />
                      <button type="button" onClick={() => pickFile(null, 'user')}>×</button>
                    </div>
                  ) : (
                    <label className="upload-box">
                      <input ref={userFileInputRef} type="file" accept="image/*" onChange={(e) => pickFile(e.target.files?.[0], 'user')} />
                      <span className="upload-icon">👤</span>
                      <span>Choose User Image</span>
                      <small>JPG, PNG up to 5MB</small>
                    </label>
                  )}
                </div>
              </div>

              <div className="field">
                <label>ID Card Image</label>
                <div className="image-upload">
                  {cardPreview ? (
                    <div className="image-preview">
                      <img src={cardPreview} alt="Card Preview" />
                      <button type="button" onClick={() => pickFile(null, 'card')}>×</button>
                    </div>
                  ) : (
                    <label className="upload-box">
                      <input ref={cardFileInputRef} type="file" accept="image/*" onChange={(e) => pickFile(e.target.files?.[0], 'card')} />
                      <span className="upload-icon">🪪</span>
                      <span>Choose Card Image</span>
                      <small>JPG, PNG up to 5MB</small>
                    </label>
                  )}
                </div>
              </div>
            </div>

            <div className="form-footer">
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? "Saving..." : editingId ? "Update Record" : "Add Record"}
              </button>
            </div>
          </form>
        </section>

        <section className="records-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">DIRECTORY</p>
              <h3>People Records</h3>
            </div>
            <span className="record-count">{filteredItems.length} records</span>
          </div>

          {loading && items.length === 0 ? (
            <div className="empty-state">
              <div>⏳</div>
              <h4>Loading records...</h4>
              <p>MongoDB se data load ho raha hai.</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="empty-state">
              <div>👤</div>
              <h4>No records found</h4>
              <p>Abhi koi person record available nahi hai.</p>
            </div>
          ) : (
            <div className="records-grid">
              {filteredItems.map((item) => (
                <article className="person-card" key={item._id}>
                  
                  <div className="person-images-container" style={{ display: 'flex', gap: '10px', height: '120px' }}>
                    <div className="person-image" style={{ flex: 1, height: '100%' }}>
                      {item.userImageUrl ? (
                        <img src={item.userImageUrl} alt="User Profile" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                      ) : (
                        <div className="no-image" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👤</div>
                      )}
                    </div>
                    
                    <div className="person-image" style={{ flex: 1, height: '100%' }}>
                      {item.cardImageUrl ? (
                        <img src={item.cardImageUrl} alt="ID Card" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                      ) : (
                        <div className="no-image" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🪪</div>
                      )}
                    </div>
                  </div>

                  <div className="person-info">
                    <h4>{item.name}</h4>
                    <div className="person-detail">
                      <span>🪪</span>
                      <span>{item.idNo}</span>
                    </div>
                    <div className="person-detail">
                      <span>📱</span>
                      <span>{item.phone}</span>
                    </div>
                    <div className="person-detail">
                      <span>🔑</span>
                      <span>{item.password ? '••••••••' : 'N/A'}</span>
                    </div>
                  </div>
                  <div className="card-actions">
                    <button type="button" className="edit-vtn" onClick={() => handleEdit(item)}>✏️ Edit</button>
                    <button type="button" className="delete-btn" onClick={() => handleDelete(item._id)}>🗑️ Delete</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {toast && (
        <div className={`toast ${toast.type}`}>
          <span>{toast.type === "success" ? "✓" : "⚠"}</span>
          <p>{toast.message}</p>
        </div>
      )}
    </div>
  );
}